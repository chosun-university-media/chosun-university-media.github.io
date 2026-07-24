import {
  collectNewsMonitor,
  collectOfficialReleases,
} from "./monitoring.js";

const KEYWORDS = ["조선대"];
const START_DATE = "2026-07-09";

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
  const result = await collectNewsMonitor(url);
  return {
    items: (result.payload.items || []).map((item) => collectorArticle(item, keyword)),
    error: result.payload.error || "",
  };
}

async function handleApi(request) {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace(/^\/api\//, "");

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (endpoint === "official-releases" && request.method === "GET") {
    const result = await collectOfficialReleases(url);
    return json(result.payload, result.status);
  }

  if (endpoint === "news-monitor" && request.method === "GET") {
    const result = await collectNewsMonitor(url);
    return json(result.payload, result.status);
  }

  if (endpoint === "news-keywords" && request.method === "GET") {
    return json({ keywords: KEYWORDS });
  }

  if (endpoint === "news-articles" && request.method === "GET") {
    const keyword = url.searchParams.get("keyword");
    const activeKeywords = keyword && keyword !== "all" ? [keyword] : KEYWORDS;
    const batches = await Promise.all(activeKeywords.map((value) => collectKeyword(value, request.url)));
    const items = batches.flatMap((batch) => batch.items).sort((a, b) => b.pubTimestamp - a.pubTimestamp);
    const error = batches.map((batch) => batch.error).filter(Boolean).join("; ");
    return json({ keywords: activeKeywords, count: items.length, items, ...(error ? { error } : {}) }, items.length || !error ? 200 : 502);
  }

  if (endpoint === "news-collect" && request.method === "POST") {
    const batches = await Promise.all(KEYWORDS.map((keyword) => collectKeyword(keyword, request.url)));
    const items = batches.flatMap((batch) => batch.items).sort((a, b) => b.pubTimestamp - a.pubTimestamp);
    const warnings = batches.map((batch) => batch.error).filter(Boolean);
    return json(
      {
        keywords: KEYWORDS,
        fetched: items.length,
        inserted: items.length,
        ignored: 0,
        items,
        ...(warnings.length ? { warnings } : {}),
      },
      items.length || !warnings.length ? 200 : 502
    );
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request);

    if (url.pathname === "/") {
      const indexUrl = new URL("/index.html", request.url);
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
