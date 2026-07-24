import monitoring from "../../../lib/monitoring.cjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KEYWORDS = ["조선대"];
const START_DATE = process.env.OFFICIAL_RELEASE_START_DATE || "2026-07-09";

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function collectorArticle(item, keyword) {
  return {
    id: item.id,
    keyword,
    title: item.title,
    link: item.url,
    source: item.outlet,
    pubDate: item.publishedAt,
    publishedAt: item.publishedAt,
    pubTimestamp: Date.parse(item.publishedAt || "") || 0,
    collectedAt: item.createdAt || new Date().toISOString(),
  };
}

async function collectKeyword(keyword, requestUrl) {
  const url = new URL("/api/news-monitor", requestUrl);
  url.searchParams.set("query", keyword);
  url.searchParams.set("date", START_DATE);
  url.searchParams.set("scope", "chosun");
  const result = await monitoring.collectNewsMonitor(url);
  return {
    status: result.status,
    items: (result.payload.items || []).map((item) => collectorArticle(item, keyword)),
    error: result.payload.error || "",
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request, context) {
  const { endpoint } = await context.params;
  const requestUrl = new URL(request.url);

  if (endpoint === "official-releases") {
    const result = await monitoring.collectOfficialReleases(requestUrl);
    return json(result.payload, result.status);
  }

  if (endpoint === "news-monitor") {
    const result = await monitoring.collectNewsMonitor(requestUrl);
    return json(result.payload, result.status);
  }

  if (endpoint === "news-keywords") {
    return json({ keywords: KEYWORDS });
  }

  if (endpoint === "news-articles") {
    const keyword = requestUrl.searchParams.get("keyword");
    const activeKeywords = keyword && keyword !== "all" ? [keyword] : KEYWORDS;
    const batches = await Promise.all(activeKeywords.map((value) => collectKeyword(value, request.url)));
    const items = batches.flatMap((batch) => batch.items).sort((a, b) => b.pubTimestamp - a.pubTimestamp);
    const error = batches.map((batch) => batch.error).filter(Boolean).join("; ");
    return json({ keywords: activeKeywords, count: items.length, items, ...(error ? { error } : {}) }, items.length || !error ? 200 : 502);
  }

  return json({ error: "Not found" }, 404);
}

export async function POST(request, context) {
  const { endpoint } = await context.params;
  if (endpoint !== "news-collect") return json({ error: "Not found" }, 404);

  const batches = await Promise.all(KEYWORDS.map((keyword) => collectKeyword(keyword, request.url)));
  const items = batches.flatMap((batch) => batch.items).sort((a, b) => b.pubTimestamp - a.pubTimestamp);
  const errors = batches.map((batch) => batch.error).filter(Boolean);
  return json(
    {
      keywords: KEYWORDS,
      fetched: items.length,
      inserted: items.length,
      ignored: 0,
      items,
      ...(errors.length ? { warnings: errors } : {}),
    },
    items.length || !errors.length ? 200 : 502
  );
}
