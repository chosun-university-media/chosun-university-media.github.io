import argparse
import json
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent
KEYWORDS_PATH = ROOT / "keywords.json"
DB_PATH = ROOT / "articles.db"
GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=ko&gl=KR&ceid=KR:ko"
DEFAULT_KEYWORDS = ["조선대"]
COLLECTION_START_DATE = "2026-07-09"
UNRESOLVED_SOURCE = "원문 언론사 확인 중"


def ensure_keywords_file():
    if not KEYWORDS_PATH.exists():
        KEYWORDS_PATH.write_text(json.dumps(DEFAULT_KEYWORDS, ensure_ascii=False, indent=2), encoding="utf-8")


def load_keywords():
    ensure_keywords_file()
    try:
        data = json.loads(KEYWORDS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        data = DEFAULT_KEYWORDS

    if isinstance(data, dict):
        data = data.get("keywords", DEFAULT_KEYWORDS)

    keywords = []
    for item in data if isinstance(data, list) else DEFAULT_KEYWORDS:
        text = str(item).strip()
        if text and text not in keywords:
            keywords.append(text)
    for required in ("조선대", "조선대학교"):
        if required not in keywords:
            keywords.append(required)
    return keywords or DEFAULT_KEYWORDS


def connect_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            title TEXT NOT NULL,
            link TEXT NOT NULL UNIQUE,
            source TEXT,
            pubDate TEXT,
            pubTimestamp INTEGER NOT NULL,
            collectedAt INTEGER NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_pubTimestamp ON articles(pubTimestamp DESC)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_articles_keyword ON articles(keyword)")
    conn.commit()
    return conn


def rss_url(keyword):
    query = f"{keyword} after:{search_after_date(COLLECTION_START_DATE)}"
    return GOOGLE_NEWS_RSS.format(query=urllib.parse.quote(query))


def search_after_date(value):
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
        return (parsed - timedelta(days=1)).strftime("%Y-%m-%d")
    except ValueError:
        return value


def fetch_rss(keyword):
    request = urllib.request.Request(
        rss_url(keyword),
        headers={
            "User-Agent": "Chosun-University-Media-Monitor/1.0",
            "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read()


def parse_pub_date(value):
    try:
        parsed = parsedate_to_datetime(value)
        return int(parsed.timestamp())
    except Exception:
        return 0


def start_timestamp():
    try:
        return int(datetime.strptime(COLLECTION_START_DATE, "%Y-%m-%d").timestamp())
    except ValueError:
        return 0


def local_datetime(timestamp):
    if not timestamp:
        return ""
    return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%dT%H:%M")


def parse_rss(xml_bytes):
    root = ET.fromstring(xml_bytes)
    items = []
    for item in root.findall(".//item"):
        title = text_of(item, "title")
        link = text_of(item, "link")
        source = text_of(item, "source")
        pub_date = text_of(item, "pubDate")
        pub_timestamp = parse_pub_date(pub_date)
        if not title or not link:
            continue
        items.append(
            {
                "title": title,
                "link": link,
                "source": source,
                "pubDate": pub_date,
                "pubTimestamp": pub_timestamp,
            }
        )
    return items


def is_portal_source(value):
    source = str(value or "").strip()
    return source == UNRESOLVED_SOURCE or bool(
        re.fullmatch(r"(?:네이트|nate)(?:\s*뉴스)?", source, flags=re.IGNORECASE)
    )


def normalized_news_title(value):
    text = re.sub(r"\s+-\s+[^-]+$", "", str(value or ""))
    text = text.replace("조선대학교", "조선대").lower()
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def clean_news_title(value):
    return re.sub(
        r"\s+-\s+(?:네이트|nate)(?:\s*뉴스)?$",
        "",
        str(value or ""),
        flags=re.IGNORECASE,
    ).strip()


def infer_original_source(article, candidates):
    key = normalized_news_title(article.get("title"))
    if not key:
        return ""
    article_time = int(article.get("pubTimestamp") or 0)
    matches = []
    for candidate in candidates:
        source = str(candidate.get("source") or "").strip()
        if not source or is_portal_source(source) or normalized_news_title(candidate.get("title")) != key:
            continue
        candidate_time = int(candidate.get("pubTimestamp") or 0)
        distance = abs(article_time - candidate_time) if article_time and candidate_time else 2 * 86400
        if distance <= 2 * 86400:
            matches.append((distance, source))
    matches.sort(key=lambda item: item[0])
    return matches[0][1] if matches else ""


def resolve_portal_sources(articles):
    resolved = []
    for article in articles:
        item = dict(article)
        if is_portal_source(item.get("source")):
            item["source"] = infer_original_source(item, articles) or UNRESOLVED_SOURCE
            item["title"] = clean_news_title(item.get("title"))
        resolved.append(item)
    return resolved


def repair_portal_sources(conn):
    rows = [dict(row) for row in conn.execute(
        "SELECT id, title, source, pubDate, pubTimestamp FROM articles ORDER BY pubTimestamp DESC"
    ).fetchall()]
    repaired = 0
    for row in rows:
        if not is_portal_source(row.get("source")):
            continue
        source = infer_original_source(row, rows) or UNRESOLVED_SOURCE
        title = clean_news_title(row.get("title"))
        cursor = conn.execute(
            "UPDATE articles SET source = ?, title = ? WHERE id = ?",
            (source, title, row["id"]),
        )
        repaired += cursor.rowcount
    return repaired


def text_of(node, tag_name):
    found = node.find(tag_name)
    return "".join(found.itertext()).strip() if found is not None else ""


def collect():
    keywords = load_keywords()
    conn = connect_db()
    collected_at = int(time.time())
    summary = {
        "keywords": keywords,
        "inserted": 0,
        "seen": 0,
        "failed": [],
        "db": str(DB_PATH),
    }

    for keyword in keywords:
        try:
            articles = resolve_portal_sources(parse_rss(fetch_rss(keyword)))
        except Exception as error:
            summary["failed"].append({"keyword": keyword, "error": str(error)})
            continue

        start_at = start_timestamp()
        for article in articles:
            if start_at and article["pubTimestamp"] and article["pubTimestamp"] < start_at:
                continue
            summary["seen"] += 1
            cursor = conn.execute(
                """
                INSERT OR IGNORE INTO articles
                (keyword, title, link, source, pubDate, pubTimestamp, collectedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    keyword,
                    article["title"],
                    article["link"],
                    article["source"],
                    article["pubDate"],
                    article["pubTimestamp"],
                    collected_at,
                ),
            )
            summary["inserted"] += cursor.rowcount

    summary["portalSourcesRepaired"] = repair_portal_sources(conn)
    conn.commit()
    conn.close()
    return summary


def list_articles(keyword="all", limit=100):
    conn = connect_db()
    params = []
    where = ""
    if keyword and keyword != "all":
        where = "WHERE keyword = ?"
        params.append(keyword)
    params.append(int(limit))
    rows = conn.execute(
        f"""
        SELECT id, keyword, title, link, source, pubDate, pubTimestamp, collectedAt
        FROM articles
        {where}
        ORDER BY pubTimestamp DESC, id DESC
        LIMIT ?
        """,
        params,
    ).fetchall()
    conn.close()
    return [row_to_article(row) for row in rows]


def row_to_article(row):
    return {
        "id": row["id"],
        "keyword": row["keyword"],
        "title": row["title"],
        "link": row["link"],
        "source": row["source"],
        "pubDate": row["pubDate"],
        "pubTimestamp": row["pubTimestamp"],
        "publishedAt": local_datetime(row["pubTimestamp"]),
        "collectedAt": local_datetime(row["collectedAt"]),
    }


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Google News RSS collector for Chosun media platform")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("collect")
    subparsers.add_parser("keywords")
    list_parser = subparsers.add_parser("list")
    list_parser.add_argument("--keyword", default="all")
    list_parser.add_argument("--limit", type=int, default=300)
    args = parser.parse_args()

    if args.command == "collect":
      emit(collect())
    elif args.command == "keywords":
      emit({"keywords": load_keywords(), "path": str(KEYWORDS_PATH)})
    elif args.command == "list":
      emit({"items": list_articles(args.keyword, args.limit), "keywords": load_keywords(), "db": str(DB_PATH)})


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        emit({"error": str(error)})
        sys.exit(1)
