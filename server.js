const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4180);
const OFFICIAL_RELEASE_URL = "https://www3.chosun.ac.kr/chosun/2607/subview.do?enc=Zm5jdDF8QEB8JTJGYmJzJTJGY2hvc3VuJTJGNzIlMkZhcnRjbExpc3QuZG8lM0Y%3D";
const OFFICIAL_RELEASE_START_DATE = process.env.OFFICIAL_RELEASE_START_DATE || "2026-07-09";
const MAX_OFFICIAL_ITEMS = Number(process.env.OFFICIAL_RELEASE_LIMIT || 100);
const MAX_OFFICIAL_PAGES = Number(process.env.OFFICIAL_RELEASE_PAGE_LIMIT || 20);
const MAX_NEWS_ITEMS = Number(process.env.NEWS_MONITOR_LIMIT || 100);
const FETCH_TIMEOUT_MS = Number(process.env.OFFICIAL_FETCH_TIMEOUT_MS || 15000);
const NEWS_COLLECTOR_SCRIPT = path.join(ROOT, "news_collector.py");
const portalArticleCache = new Map();
const newsSourceByTitle = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "text/plain; charset=utf-8", "");
    return;
  }

  const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (requestUrl.pathname === "/api/official-releases") {
    await collectOfficialReleases(requestUrl, res);
    return;
  }

  if (requestUrl.pathname === "/api/news-monitor") {
    await collectNewsMonitor(requestUrl, res);
    return;
  }

  if (requestUrl.pathname === "/api/news-keywords") {
    await newsKeywords(res);
    return;
  }

  if (requestUrl.pathname === "/api/news-articles") {
    await newsArticles(requestUrl, res);
    return;
  }

  if (requestUrl.pathname === "/api/news-collect") {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    await newsCollect(res);
    return;
  }

  serveStatic(requestUrl.pathname, res);
});

async function newsKeywords(res) {
  try {
    sendJson(res, 200, await runCollector(["keywords"]));
  } catch (error) {
    sendJson(res, 500, { error: error.message, keywords: ["조선대"] });
  }
}

async function newsArticles(requestUrl, res) {
  const keyword = requestUrl.searchParams.get("keyword") || "all";
  const limit = requestUrl.searchParams.get("limit") || "100";
  try {
    sendJson(res, 200, await runCollector(["list", "--keyword", keyword, "--limit", limit]));
  } catch (error) {
    sendJson(res, 500, { error: error.message, items: [], keywords: ["조선대"] });
  }
}

async function newsCollect(res) {
  try {
    const result = await runCollector(["collect"]);
    const list = await runCollector(["list", "--limit", "300"]);
    sendJson(res, 200, { ...result, items: list.items || [], keywords: list.keywords || result.keywords || [] });
  } catch (error) {
    sendJson(res, 500, { error: error.message, items: [], keywords: ["조선대"] });
  }
}

async function runCollector(args) {
  const candidates = pythonCandidates();
  let lastError = null;
  for (const candidate of candidates) {
    try {
      return await runPython(candidate.command, [...candidate.prefixArgs, NEWS_COLLECTOR_SCRIPT, ...args]);
    } catch (error) {
      lastError = error;
      if (!error.spawnFailed) break;
    }
  }
  throw lastError || new Error("Python 실행 환경을 찾지 못했습니다.");
}

function pythonCandidates() {
  const preferred = process.env.PYTHON_EXE ? [{ command: process.env.PYTHON_EXE, prefixArgs: [] }] : [];
  const bundledPython = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe")
    : "";
  return [
    ...preferred,
    ...(bundledPython ? [{ command: bundledPython, prefixArgs: [] }] : []),
    { command: "python", prefixArgs: [] },
    { command: "py", prefixArgs: ["-3"] },
    { command: "python3", prefixArgs: [] },
  ];
}

function runPython(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.on("error", (error) => {
      error.spawnFailed = true;
      reject(error);
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `collector exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout || "{}"));
      } catch (error) {
        reject(new Error(`collector JSON parse failed: ${stdout.slice(0, 300)}`));
      }
    });
  });
}

async function collectNewsMonitor(requestUrl, res) {
  const query = normalizeWhitespace(requestUrl.searchParams.get("query") || "\"조선대학교\" OR \"조선대\"");
  const date = normalizeDate(requestUrl.searchParams.get("date")) || todayDate();
  const scope = normalizeWhitespace(requestUrl.searchParams.get("scope") || "chosun");
  const rssUrl = googleNewsRssUrl(query, date);

  try {
    const rss = await fetchText(rssUrl);
    const parsedItems = parseGoogleNewsRss(rss, date)
      .filter((item) => scope === "external" || isChosunUniversityArticle(item))
      .slice(0, MAX_NEWS_ITEMS);
    const items = await enrichPortalNewsItems(parsedItems);

    sendJson(res, 200, {
      source: rssUrl,
      query,
      scope,
      date,
      scannedAt: new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (error) {
    sendJson(res, 502, {
      source: rssUrl,
      query,
      scope,
      date,
      scannedAt: new Date().toISOString(),
      error: error.message,
      items: [],
    });
  }
}

async function collectOfficialReleases(requestUrl, res) {
  const sourceUrl = officialSourceUrl(requestUrl.searchParams.get("url"));
  const startDate = normalizeDate(requestUrl.searchParams.get("start")) || OFFICIAL_RELEASE_START_DATE;

  try {
    const listHtml = await fetchText(sourceUrl);
    const links = await collectOfficialListLinks(listHtml, sourceUrl, startDate);
    const items = [];

    for (const link of links) {
      try {
        const item = await fetchOfficialDetail(link, sourceUrl);
        if (item) items.push(item);
      } catch (error) {
        const fallback = releaseFromListLink(link);
        if (fallback) items.push(fallback);
      }
    }

    const uniqueItems = uniqueBy(items, (item) => officialArticleNoFromUrl(item.sourceUrl) || item.sourceUrl || `${item.publishAt}-${item.title}`);
    sendJson(res, 200, {
      source: sourceUrl,
      startDate,
      scannedAt: new Date().toISOString(),
      count: uniqueItems.length,
      items: uniqueItems,
    });
  } catch (error) {
    sendJson(res, 502, {
      source: sourceUrl,
      startDate,
      scannedAt: new Date().toISOString(),
      error: error.message,
      items: [],
    });
  }
}

async function collectOfficialListLinks(firstPageHtml, sourceUrl, startDate) {
  const collected = [];
  let pageHtml = firstPageHtml;
  let page = 1;
  const totalPages = officialTotalPages(firstPageHtml);
  const pageLimit = Math.max(1, Math.min(MAX_OFFICIAL_PAGES, totalPages || MAX_OFFICIAL_PAGES));

  while (page <= pageLimit && collected.length < MAX_OFFICIAL_ITEMS) {
    const pageItems = parseOfficialList(pageHtml, sourceUrl);
    if (!pageItems.length) break;
    collected.push(...pageItems);

    const datedItems = pageItems.filter((item) => normalizeDate(item.publishAt));
    const reachedOlderPage = datedItems.length === pageItems.length && datedItems.every((item) => item.publishAt < startDate);
    if (reachedOlderPage || page >= pageLimit) break;

    page += 1;
    const nextPageUrl = officialListPageUrl(sourceUrl, firstPageHtml, page);
    if (!nextPageUrl) break;
    pageHtml = await fetchText(nextPageUrl);
  }

  return uniqueBy(collected, (item) => officialArticleNoFromUrl(item.sourceUrl) || item.sourceUrl || `${item.publishAt}-${item.title}`)
    .filter((item) => !normalizeDate(item.publishAt) || item.publishAt >= startDate)
    .slice(0, MAX_OFFICIAL_ITEMS);
}

function officialListPageUrl(sourceUrl, firstPageHtml, page) {
  const form = String(firstPageHtml || "").match(/<form\b[^>]*name=["']pageForm["'][^>]*action=["']([^"']+)["'][^>]*>[\s\S]*?<\/form>/i);
  if (!form) return "";
  const layoutRaw = form[0].match(/<input\b[^>]*name=["']layout["'][^>]*value=["']([^"']+)["']/i)?.[1] || "";

  try {
    const url = new URL(decodeEntities(form[1]), sourceUrl);
    const layout = safeDecodeURIComponent(decodeEntities(layoutRaw));
    if (layout) url.searchParams.set("layout", layout);
    url.searchParams.set("page", String(page));
    return url.href;
  } catch (error) {
    return "";
  }
}

function officialTotalPages(html) {
  const value = String(html || "").match(/class=["'][^"']*_totPage[^"']*["'][^>]*>\s*(\d+)/i)?.[1];
  return Math.max(1, Number(value || 1));
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch (error) {
    return String(value || "");
  }
}

async function fetchOfficialDetail(link, sourceUrl) {
  const canFetchDetail = link.sourceUrl && /^https?:\/\//i.test(link.sourceUrl);
  const detailHtml = canFetchDetail ? await fetchText(link.sourceUrl) : "";
  const detailTitle = normalizeOfficialTitle(extractDetailTitle(detailHtml));
  const title = officialTitleFromListAndDetail(link.title, detailTitle);
  if (!isLikelyOfficialReleaseTitle(title)) return releaseFromListLink(link);

  const detailText = extractDetailBody(detailHtml, title) || htmlToText(detailHtml);
  const combinedText = normalizeWhitespace(`${link.rowText || ""} ${detailText}`);
  const dateInfo = officialPublishDate(link, detailHtml, detailText, combinedText);
  const publishAt = dateInfo.value;
  const body = cleanBodyText(detailText || link.rowText || title, title);
  const summary = summarizeBody(body, title);
  const keywordText = `${title} ${summary} ${body}`;

  return {
    id: `official-${publishAt}-${stableKey(title)}`,
    sourceId: stableKey(`${publishAt}-${title}`),
    sourceType: "official-homepage",
    sourceName: "보도자료 자동 수집",
    sourceUrl: link.sourceUrl || sourceUrl,
    title,
    subtitle: "",
    summary,
    body: shorten(body, 2200),
    department: inferDepartment(keywordText),
    owner: "자동 수집",
    category: inferCategory(keywordText),
    status: "distributed",
    publishAt,
    tags: extractKeywords(keywordText, 6),
    groups: ["광주·전남 지역 언론", "대학전문·교육매체"],
    attachments: [],
    expectedOutlets: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    dateSource: dateInfo.source,
  };
}

function releaseFromListLink(link) {
  const title = normalizeOfficialTitle(link.title);
  if (!isLikelyOfficialReleaseTitle(title)) return null;
  const knownDate = officialKnownPublishAt(link.sourceUrl);
  const listDate = normalizeDate(link.publishAt || "") || extractOfficialDate(link.rowText || "");
  const publishAt = knownDate || listDate || todayDate();
  const body = cleanBodyText(link.rowText || title, title);
  const summary = summarizeBody(body, title);
  const keywordText = `${title} ${summary} ${body}`;

  return {
    id: `official-${publishAt}-${stableKey(title)}`,
    sourceId: stableKey(`${publishAt}-${title}`),
    sourceType: "official-homepage",
    sourceName: "보도자료 자동 수집",
    sourceUrl: link.sourceUrl || "",
    title,
    subtitle: "",
    summary,
    body,
    department: inferDepartment(keywordText),
    owner: "자동 수집",
    category: inferCategory(keywordText),
    status: "distributed",
    publishAt,
    tags: extractKeywords(keywordText, 6),
    groups: ["광주·전남 지역 언론", "대학전문·교육매체"],
    attachments: [],
    expectedOutlets: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    dateSource: knownDate ? "known" : listDate ? "list" : "fallback",
  };
}

function officialPublishDate(link, detailHtml, detailText, combinedText) {
  const knownDate = officialKnownPublishAt(link.sourceUrl);
  if (knownDate) return { value: knownDate, source: "known" };
  const listDate = normalizeDate(link.publishAt || "");
  if (listDate) return { value: listDate, source: "list" };
  const uploadDate = extractOfficialUploadDate(detailHtml || detailText);
  if (uploadDate) return { value: uploadDate, source: "detail" };
  const textDate = extractOfficialDate(combinedText);
  if (textDate) return { value: textDate, source: "text" };
  return { value: todayDate(), source: "fallback" };
}

function officialTitleFromListAndDetail(listTitle, detailTitle) {
  const list = normalizeOfficialTitle(listTitle || "");
  const detail = normalizeOfficialTitle(detailTitle || "");
  if (isLikelyOfficialReleaseTitle(list)) return list;
  if (isLikelyOfficialReleaseTitle(detail)) return detail;
  return list || detail;
}

function parseOfficialList(html, baseUrl) {
  const newsRows = splitOfficialNewsRows(html);
  const blocks = newsRows.length ? newsRows : [
    ...html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi),
    ...html.matchAll(/<li\b[\s\S]*?<\/li>/gi),
    ...html.matchAll(/<article\b[\s\S]*?<\/article>/gi),
  ].map((match) => match[0]);

  const candidates = [];
  const sourceBlocks = blocks.length ? blocks : [html];
  sourceBlocks.forEach((block) => {
    const rowText = htmlToText(block);
    extractAnchors(block, baseUrl).forEach((anchor) => {
      const title = normalizeOfficialTitle(anchor.title);
      if (!isLikelyOfficialReleaseTitle(title)) return;
      if (!isOfficialReleaseDetailUrl(anchor.sourceUrl, baseUrl)) return;
      candidates.push({
        title,
        sourceUrl: anchor.sourceUrl,
        rowText,
        publishAt: officialKnownPublishAt(anchor.sourceUrl) || extractOfficialListDate(block) || extractOfficialUploadDate(block) || extractOfficialDate(rowText),
      });
    });
  });

  if (!candidates.length) {
    extractAnchors(html, baseUrl).forEach((anchor) => {
      const title = normalizeOfficialTitle(anchor.title);
      if (!isLikelyOfficialReleaseTitle(title)) return;
      if (!isOfficialReleaseDetailUrl(anchor.sourceUrl, baseUrl)) return;
      candidates.push({
        title,
        sourceUrl: anchor.sourceUrl,
        rowText: title,
        publishAt: officialKnownPublishAt(anchor.sourceUrl),
      });
    });
  }

  return uniqueBy(candidates, (item) => officialArticleNoFromUrl(item.sourceUrl) || item.sourceUrl || `${item.publishAt}-${item.title}`).slice(0, 100);
}

function splitOfficialNewsRows(html) {
  const source = String(html || "");
  const starts = [...source.matchAll(/<div\b[^>]*class=["'][^"']*\brow\b[^"']*["'][^>]*>/gi)].map((match) => match.index);
  if (!starts.length) return [];
  const pagingIndex = source.search(/<div\b[^>]*class=["'][^"']*_paging\b/i);
  return starts.map((start, index) => {
    const next = starts[index + 1] ?? (pagingIndex > start ? pagingIndex : source.length);
    return source.slice(start, next);
  });
}

function extractOfficialListDate(block) {
  const dateBlock = String(block || "").match(/<(?:p|span|div|time)\b[^>]*class=["'][^"']*\bdate\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|span|div|time)>/i)?.[1] || "";
  return extractOfficialDate(htmlToText(dateBlock));
}

function googleNewsRssUrl(query, startDate = "") {
  const after = previousDate(startDate || todayDate());
  const search = after ? `${query} after:${after}` : query;
  return `https://news.google.com/rss/search?q=${encodeURIComponent(search)}&hl=ko&gl=KR&ceid=KR:ko`;
}

function parseGoogleNewsRss(xml, startDate) {
  const blocks = String(xml || "").match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const items = blocks.map((block) => newsArticleFromRssItem(block)).filter(Boolean);
  return uniqueBy(items, (item) => item.url || `${item.publishedAt}-${item.title}`)
    .filter((item) => String(item.publishedAt || "").slice(0, 10) >= startDate)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
}

function newsArticleFromRssItem(block) {
  const rawTitle = xmlTagValue(block, "title");
  const url = xmlTagValue(block, "link");
  const outlet = xmlTagValue(block, "source") || outletFromGoogleTitle(rawTitle);
  const published = parseNewsDate(xmlTagValue(block, "pubDate"));
  const title = cleanGoogleNewsTitle(rawTitle, outlet);
  if (!title || !url || !published) return null;

  const text = `${title} ${outlet}`;
  const mediaType = inferMediaType(outlet);
  const sentiment = inferSentiment(text);
  const risk = inferRisk(text, sentiment);

  return {
    id: `news-${published.slice(0, 10)}-${stableKey(outlet)}-${stableKey(title)}`,
    title,
    outlet,
    reporter: "자동 수집",
    url,
    publishedAt: published,
    sentiment,
    topic: inferCategory(text),
    mediaType,
    channel: mediaType === "broadcast" ? "broadcast" : "online",
    influenceScore: inferInfluence(outlet, mediaType),
    releaseId: "",
    matchScore: 0,
    keywords: extractKeywords(text, 6),
    risk,
    status: risk === "high" ? "escalated" : "unreviewed",
    excerpt: `${outlet}에서 보도한 조선대학교 관련 기사입니다.`,
    memo: "뉴스 모니터링 새로고침으로 자동 수집되었습니다.",
    attentionReason: attentionReasonForNews(text, mediaType, sentiment, risk),
    sourceType: "news-monitor",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function enrichPortalNewsItems(items) {
  const remembered = items.map((item) => ({ ...item }));
  remembered
    .filter((item) => !isPortalOutlet(item.outlet))
    .forEach((item) => rememberNewsSource(item));

  const siblingResolved = remembered.map((item) => {
    if (!isPortalOutlet(item.outlet)) return item;
    const source = inferOriginalOutletFromKnownArticles(item, remembered);
    if (!source) return item;
    return applyOriginalOutlet(item, source, "");
  });

  return Promise.all(
    siblingResolved.map(async (item) => {
      if (!isPortalOutlet(item.outlet)) {
        rememberNewsSource(item);
        return item;
      }
      const resolved = await resolvePortalArticle(item);
      if (!isPortalOutlet(resolved.outlet)) rememberNewsSource(resolved);
      return resolved;
    })
  );
}

function isPortalOutlet(value) {
  return /^(?:네이트(?:\s*뉴스)?|nate(?:\s*뉴스)?)$/i.test(normalizeWhitespace(value));
}

function rememberNewsSource(item) {
  const key = normalizedNewsTitle(item.title);
  if (!key || !item.outlet || isPortalOutlet(item.outlet)) return;
  const entries = newsSourceByTitle.get(key) || [];
  entries.push({
    outlet: item.outlet,
    url: item.url || "",
    publishedAt: item.publishedAt || "",
  });
  newsSourceByTitle.set(key, entries.slice(-12));
}

function inferOriginalOutletFromKnownArticles(article, siblings = []) {
  const key = normalizedNewsTitle(article.title);
  if (!key) return "";
  const currentTime = Date.parse(article.publishedAt || "") || 0;
  const localCandidates = siblings
    .filter((item) => item !== article && !isPortalOutlet(item.outlet) && normalizedNewsTitle(item.title) === key)
    .map((item) => ({ outlet: item.outlet, publishedAt: item.publishedAt || "" }));
  const rememberedCandidates = newsSourceByTitle.get(key) || [];
  const candidates = [...localCandidates, ...rememberedCandidates]
    .filter((item) => item.outlet && !isPortalOutlet(item.outlet))
    .map((item) => ({
      ...item,
      distance: currentTime && Date.parse(item.publishedAt || "") ? Math.abs(currentTime - Date.parse(item.publishedAt)) : Number.MAX_SAFE_INTEGER,
    }))
    .filter((item) => item.distance <= 2 * 86400000 || item.distance === Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.distance - b.distance);
  return candidates[0]?.outlet || "";
}

async function resolvePortalArticle(article) {
  const cached = portalArticleCache.get(article.url);
  if (cached) return { ...article, ...cached };

  try {
    const page = await fetchPage(article.url);
    const source = extractOriginalOutlet(page.text, page.url);
    if (!source || isPortalOutlet(source)) return article;
    const originalUrl = extractOriginalArticleUrl(page.text, page.url);
    const resolved = {
      outlet: source,
      portalOutlet: article.outlet,
      portalUrl: article.url,
      url: originalUrl || page.url || article.url,
      sourceType: "news-monitor",
    };
    portalArticleCache.set(article.url, resolved);
    return { ...article, ...resolved };
  } catch (error) {
    return article;
  }
}

function applyOriginalOutlet(article, outlet, originalUrl) {
  return {
    ...article,
    outlet,
    portalOutlet: article.portalOutlet || article.outlet,
    portalUrl: article.portalUrl || article.url,
    url: originalUrl || article.url,
  };
}

function extractOriginalOutlet(html, finalUrl = "") {
  const text = htmlToText(html);
  const patterns = [
    /([가-힣A-Za-z0-9&·._-]{2,30})\s+원문\s+기사전송/i,
    /\[[^\]=]{0,20}=([가-힣A-Za-z0-9&·._-]{2,30})\]/i,
    /\([가-힣A-Za-z\s]{0,24}=([가-힣A-Za-z0-9&·._-]{2,30})\)/i,
    /Copyright\s*(?:©|ⓒ|\(c\))\s*([가-힣A-Za-z0-9&·._-]{2,30})/i,
  ];
  for (const pattern of patterns) {
    const outlet = cleanOriginalOutletName(text.match(pattern)?.[1] || "");
    if (outlet) return outlet;
  }

  const siteName = extractMetaValue(html, ["og:site_name", "application-name"]);
  const cleanedSiteName = cleanOriginalOutletName(siteName);
  if (cleanedSiteName && !isPortalOutlet(cleanedSiteName)) return cleanedSiteName;

  try {
    const hostname = new URL(finalUrl).hostname.toLowerCase();
    if (!/google\.com$|news\.google\.com$|nate\.com$|news\.nate\.com$/.test(hostname)) {
      return hostname.replace(/^www\./, "");
    }
  } catch (error) {
    return "";
  }
  return "";
}

function cleanOriginalOutletName(value) {
  const outlet = normalizeWhitespace(value)
    .replace(/^(?:제공|출처|언론사)\s*[:：]?\s*/i, "")
    .replace(/\s*(?:원문|기사전송|뉴스)\s*$/i, "")
    .trim();
  if (!outlet || outlet.length > 30 || isPortalOutlet(outlet) || /^(?:기사|기자|연합뉴스\s*제공|AI요약)$/i.test(outlet)) return "";
  return outlet;
}

function extractOriginalArticleUrl(html, baseUrl) {
  const anchors = String(html || "").match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
  for (const anchor of anchors) {
    if (!/원문/.test(htmlToText(anchor))) continue;
    const href = attrValue(anchor, "href");
    if (!href || /^javascript:/i.test(href)) continue;
    try {
      const url = new URL(href, baseUrl);
      if (!/nate\.com$|news\.nate\.com$/i.test(url.hostname)) return url.href;
    } catch (error) {
      continue;
    }
  }
  return "";
}

function extractMetaValue(html, keys) {
  const tags = String(html || "").match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = (attrValue(tag, "property") || attrValue(tag, "name")).toLowerCase();
    if (!keys.includes(name)) continue;
    const content = attrValue(tag, "content");
    if (content) return content;
  }
  return "";
}

function normalizedNewsTitle(value) {
  return normalizeWhitespace(value)
    .replace(/\s+-\s+[^-]+$/g, "")
    .replace(/조선대학교/g, "조선대")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "");
}

function xmlTagValue(block, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(block || "").match(pattern);
  if (!match) return "";
  return normalizeWhitespace(decodeEntities(stripCdata(match[1]).replace(/<[^>]+>/g, " ")));
}

function stripCdata(value) {
  return String(value || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function outletFromGoogleTitle(title) {
  const parts = normalizeWhitespace(title).split(" - ");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function cleanGoogleNewsTitle(title, outlet) {
  const text = normalizeWhitespace(title);
  if (!outlet) return text;
  return normalizeWhitespace(text.replace(new RegExp(`\\s+-\\s+${escapeRegExp(outlet)}$`), ""));
}

function parseNewsDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toDateTimeString(date);
}

function isChosunUniversityArticle(item) {
  return /조선대학교|조선대/i.test(`${item.title || ""} ${item.excerpt || ""}`);
}

function inferMediaType(outlet) {
  const text = String(outlet || "").toLowerCase();
  if (/방송|라디오|kbs|mbc|sbs|ytn|kbc|cbs|jtbc|채널a|tv조선|연합뉴스tv/.test(text)) return "broadcast";
  if (/조선일보|중앙일보|동아일보|한겨레|경향신문|한국일보|서울신문|국민일보|세계일보|문화일보|매일경제|한국경제|연합뉴스|뉴스1|뉴시스|전자신문/.test(text)) return "national";
  if (/광주|전남|전북|호남|남도|무등|광남/.test(text)) return "local";
  if (/뉴스|신문|데일리|투데이|저널|타임즈|press|news/.test(text)) return "internet";
  return "other";
}

function inferInfluence(outlet, mediaType) {
  const text = String(outlet || "").toLowerCase();
  if (/연합뉴스|뉴스1|뉴시스/.test(text)) return 90;
  if (/kbs|mbc|sbs|ytn|jtbc|채널a/.test(text)) return 92;
  if (/조선일보|중앙일보|동아일보|한겨레|경향신문|한국일보|매일경제|한국경제/.test(text)) return 88;
  if (/광주|전남|무등|남도|광남|kbc/.test(text)) return 72;
  if (mediaType === "broadcast") return 86;
  if (mediaType === "national") return 84;
  if (mediaType === "local") return 68;
  if (mediaType === "internet") return 58;
  return 42;
}

function inferSentiment(text) {
  if (/논란|비판|부실|사고|수사|고발|감사|징계|피해|갈등|반발|의혹|부정|위반|파업/.test(text)) return "negative";
  if (/선정|수상|협약|개소|성과|기부|장학|취업|봉사|글로벌|연구|유치|최우수/.test(text)) return "positive";
  return "neutral";
}

function inferRisk(text, sentiment) {
  if (/사고|수사|고발|감사|징계|피해|의혹|위반/.test(text)) return "high";
  if (sentiment === "negative") return "medium";
  return "low";
}

function attentionReasonForNews(text, mediaType, sentiment, risk) {
  if (sentiment === "negative" || risk === "high") return "대학 신뢰와 지역 여론에 영향을 줄 수 있어 조기 확인이 필요합니다.";
  if (/입학|수시|정시|모집/.test(text)) return "입시 관심 시기와 맞물려 학부모·수험생 검색 수요가 큽니다.";
  if (/연구|AI|산학|창업|기술/.test(text)) return "지역산업·연구성과 의제와 연결돼 후속 보도 확산 가능성이 있습니다.";
  if (mediaType === "broadcast") return "방송 노출은 현장성과 파급력이 커 오늘 주요 기사로 확인할 필요가 있습니다.";
  return "오늘 조선대학교 관련 보도로 브랜드 노출 흐름 확인이 필요합니다.";
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function officialArticleNoFromUrl(value) {
  try {
    const url = new URL(value || "", OFFICIAL_RELEASE_URL);
    return url.pathname.match(/\/bbs\/chosun\/72\/(\d+)\/artclView\.do/i)?.[1] || url.searchParams.get("articleNo") || "";
  } catch (error) {
    return String(value || "").match(/\/72\/(\d+)\/artclView\.do/i)?.[1] || "";
  }
}

function officialKnownPublishAt(value) {
  return {
    279688: "2026-07-09",
    279687: "2026-07-09",
    279669: "2026-07-08",
  }[officialArticleNoFromUrl(value)] || "";
}

function previousDate(value) {
  const text = normalizeDate(value);
  if (!text) return "";
  const date = new Date(`${text}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateTimeString(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAnchors(html, baseUrl) {
  const anchors = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    const attrs = match[1] || "";
    const inner = match[2] || "";
    const href = attrValue(attrs, "href");
    const onclick = attrValue(attrs, "onclick");
    const dataUrl = attrValue(attrs, "data-url") || attrValue(attrs, "data-href");
    const titleAttr = attrValue(attrs, "title");
    const title = normalizeWhitespace(htmlToText(inner) || titleAttr);
    const sourceUrl = resolveOfficialUrl(href, baseUrl) || resolveOfficialUrl(onclick, baseUrl) || resolveOfficialUrl(dataUrl, baseUrl);
    if (!title || !sourceUrl) continue;
    anchors.push({ title, sourceUrl });
  }
  return anchors;
}

function resolveOfficialUrl(href, baseUrl) {
  const value = decodeEntities(String(href || "")).trim();
  if (!value || value === "#" || /^mailto:|^tel:/i.test(value)) return "";

  const embeddedUrl = value.match(/['"]([^'"]*(?:uv|ud|view|ul)\.do[^'"]*)['"]/i)?.[1] || value.match(/(\/[^\s'")]+(?:uv|ud|view|ul)\.do[^\s'")]*)/i)?.[1];
  if (embeddedUrl && embeddedUrl !== value) return resolveOfficialUrl(embeddedUrl, baseUrl);

  const artclCall = value.match(/jf_viewArtcl\(['"]([^'"]+)['"]\s*,\s*['"]?(\d+)['"]?\s*,\s*['"]?(\d+)['"]?/i);
  if (artclCall) return `https://www3.chosun.ac.kr/bbs/${artclCall[1]}/${artclCall[2]}/${artclCall[3]}/artclView.do`;

  if (/^javascript:/i.test(value) || /\w+\s*\(/.test(value) || /articleNo|artclNo|artclSeq|nttId|nttSn|bbscttNo|boardSeq/i.test(value)) {
    const explicitId = value.match(/(?:articleNo|artclNo|artclSeq|nttId|nttSn|bbscttNo|boardSeq|seq|id|no)['"\s:=,]+(\d{3,})/i)?.[1];
    const numberMatches = [...value.matchAll(/\d{3,}/g)].map((item) => item[0]);
    const articleNo = explicitId || numberMatches[numberMatches.length - 1];
    if (!articleNo) return "";
    const url = new URL(baseUrl);
    url.searchParams.set("mode", "view");
    url.searchParams.set("articleNo", articleNo);
    return url.href;
  }

  try {
    const url = new URL(value, baseUrl);
    if (!url.hostname.endsWith("chosun.ac.kr")) return "";
    return url.href;
  } catch (error) {
    return "";
  }
}

function isOfficialReleaseDetailUrl(value, baseUrl) {
  if (!value) return false;
  try {
    const url = new URL(value, baseUrl);
    const base = new URL(baseUrl);
    if (!url.hostname.endsWith("chosun.ac.kr")) return false;
    if (url.href === base.href) return false;
    const isLegacyEntryPath = url.pathname.includes("/TPSKf81321/");
    const isCurrentDetailPath = /\/bbs\/chosun\/72\/\d+\/artclView\.do/i.test(url.pathname);
    if (!isLegacyEntryPath && !isCurrentDetailPath) return false;

    const target = `${url.pathname} ${url.search}`;
    if (isCurrentDetailPath) return true;
    if (/mode=view|articleNo=|nttId=|seq=|wr_id=|boardNo=|view/i.test(target)) return true;
    if (/\/(?:uv|ud|view)\.do/i.test(url.pathname)) return true;
    return false;
  } catch (error) {
    return false;
  }
}

function extractDetailTitle(html) {
  if (!html) return "";
  const meta = html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:title|title)["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1];
  if (meta) return stripSiteName(meta);

  const heading = html.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1];
  if (heading) return stripSiteName(htmlToText(heading));

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? stripSiteName(htmlToText(title)) : "";
}

function extractDetailBody(html, title) {
  if (!html) return "";
  const candidates = [];
  const blockPattern = /<(article|section|div|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockPattern.exec(html))) {
    const attrs = match[2] || "";
    if (!/(view|content|contents|article|artcl|board|bbs|body|detail|read|post|jwxe_main_content)/i.test(attrs)) continue;
    const text = htmlToText(match[3]);
    if (text.length >= 40) candidates.push(text);
  }

  return candidates
    .filter((text) => !isMostlyNavigationText(text))
    .sort((a, b) => bodyScore(b, title) - bodyScore(a, title))[0] || "";
}

function bodyScore(text, title) {
  const value = normalizeWhitespace(text);
  return value.length + (title && value.includes(title) ? 300 : 0) - navigationPenalty(value);
}

function isMostlyNavigationText(text) {
  const value = normalizeWhitespace(text);
  return navigationPenalty(value) > value.length * 0.3 && !/(보도자료|조선대|조선대학교|밝혔다|선정|개최|협약|수상|모집|기부|연구|사업)/.test(value);
}

function navigationPenalty(text) {
  const matches = String(text || "").match(/바로가기|메뉴|로그인|사이트맵|총장실|대학소개|연구\/산학|대학\/대학원|캠퍼스안내|조선대 소식|본문 바로가기|주메뉴/g);
  return (matches || []).length * 80;
}

function stripSiteName(value) {
  return normalizeWhitespace(value)
    .replace(/\s*[|>-]\s*조선대학교.*$/i, "")
    .replace(/^조선대학교\s*[|>-]\s*/i, "")
    .trim();
}

async function fetchText(url) {
  return (await fetchPage(url)).text;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Chosun-University-Media-Monitor/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`official site ${response.status}`);
    const buffer = await response.arrayBuffer();
    const charset = response.headers.get("content-type")?.match(/charset=([^;]+)/i)?.[1] || "utf-8";
    return {
      text: decodeBuffer(buffer, charset),
      url: response.url || url,
      contentType: response.headers.get("content-type") || "",
    };
  } finally {
    clearTimeout(timer);
  }
}

function decodeBuffer(buffer, charset) {
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch (error) {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function officialSourceUrl(value) {
  try {
    const url = new URL(value || OFFICIAL_RELEASE_URL);
    return url.hostname.endsWith("chosun.ac.kr") ? url.href : OFFICIAL_RELEASE_URL;
  } catch (error) {
    return OFFICIAL_RELEASE_URL;
  }
}

function attrValue(attrs, name) {
  const match = String(attrs || "").match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeEntities(match?.[1] || match?.[2] || match?.[3] || "");
}

function htmlToText(html) {
  return normalizeWhitespace(
    decodeEntities(
      String(html || "")
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    middot: "·",
  };
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (_, name) => named[name.toLowerCase()] || `&${name};`);
}

function cleanBodyText(text, title) {
  const body = normalizeWhitespace(String(text || "").replace(title, " "));
  if (!body || body.length < 20) return title;
  return shorten(body, 2200);
}

function summarizeBody(body, title) {
  const text = normalizeWhitespace(body);
  if (!text || text === title) return title;
  const sentence = text.split(/(?<=[.!?。])\s+|다\.\s*/).find((part) => part.length >= 24) || text;
  return shorten(sentence, 180);
}

function normalizeOfficialTitle(value) {
  return normalizeWhitespace(value)
    .replace(/^(새글|공지|첨부|NEW)\s*/i, "")
    .replace(/\s*\[[^\]]+\]\s*$/g, "")
    .trim();
}

function isLikelyOfficialReleaseTitle(title) {
  if (!title || title.length < 8 || title.length > 140) return false;
  if (/-->|바로가기|주메뉴|모바일메뉴|검색열기|포털시스템/.test(title)) return false;
  if (/^(검색|목록|이전|다음|처음|마지막|로그인|전체|작성자|등록일|조회|첨부|홈페이지)$/i.test(title)) return false;
  if (/개인정보|저작권|사이트맵|콘텐츠 담당|본문 바로가기|SNS|페이스북|트위터/.test(title)) return false;
  if (isNonReleaseNavigationTitle(title)) return false;
  return /조선대|조선대학교|대학|교수|학생|연구|사업|입학|협약|선정|수상|개최|모집|기부|봉사|센터|총장/.test(title);
}

function isNonReleaseNavigationTitle(title) {
  return /대학소개|총장실|역대총장|총장에게 바란다|역사와비전|조선대 소식|언론 속 조선대|소식지|홍보동영상|전경사진|브로슈어|포토뉴스|대학발전|학교법인|캠퍼스안내|연구과제공고|채용공고|입찰공고|일반공지|학사공지|대학원공지|연구\/산학|대학\/대학원|입학\/취업|행정\/지원|커뮤니티|정보공개|민원|증명서|시설물|규정집|전화번호|조직도|캠퍼스맵|연구기관|산학국책사업|사업단 및 센터/.test(
    normalizeWhitespace(title)
  );
}

function extractOfficialDate(text) {
  const value = normalizeWhitespace(text);
  const full = value.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (full) return `${full[1]}-${String(full[2]).padStart(2, "0")}-${String(full[3]).padStart(2, "0")}`;
  const compact = value.match(/(20\d{2})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const short = value.match(/(\d{1,2})[.\-/](\d{1,2})/);
  if (short) return `${todayDate().slice(0, 4)}-${String(short[1]).padStart(2, "0")}-${String(short[2]).padStart(2, "0")}`;
  return "";
}

function extractOfficialUploadDate(htmlOrText) {
  const text = /<[^>]+>/.test(String(htmlOrText || "")) ? htmlToText(htmlOrText) : normalizeWhitespace(htmlOrText);
  const labeled = text.match(/(?:등록일|작성일|게시일|입력일|업로드일|보도일|날짜)\s*[:：]?\s*(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (labeled) return `${labeled[1]}-${String(labeled[2]).padStart(2, "0")}-${String(labeled[3]).padStart(2, "0")}`;
  const compact = text.match(/(?:등록일|작성일|게시일|입력일|업로드일|보도일|날짜)\s*[:：]?\s*(20\d{2})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return "";
}

function inferDepartment(text) {
  if (/입학|수시|정시|모집|전형/.test(text)) return "입학처";
  if (/학생|장학|봉사|동아리|취업/.test(text)) return "학생처";
  if (/연구|산학|AI|기술|특허|사업|센터|창업/.test(text)) return "산학협력단";
  if (/의대|병원|의료|간호|보건/.test(text)) return "의과대학";
  if (/공학|반도체|소프트웨어|전기|기계/.test(text)) return "공과대학";
  return "대외협력처";
}

function inferCategory(text) {
  if (/입학|수시|정시|모집|전형/.test(text)) return "입시";
  if (/학생|장학|동아리|취업/.test(text)) return "학생";
  if (/산학|기업|창업|협약|기술/.test(text)) return "산학협력";
  if (/지역|봉사|기부|나눔/.test(text)) return "지역사회";
  if (/국제|해외|유학생|글로벌/.test(text)) return "국제";
  if (/연구|AI|논문|센터|선정|사업/.test(text)) return "연구";
  return "기타";
}

function extractKeywords(text, limit) {
  const stopwords = new Set(["조선대학교", "조선대", "대학", "교수", "학생", "개최", "선정", "위해", "관련", "사업"]);
  const words = normalizeWhitespace(text).match(/[가-힣A-Za-z0-9]{2,}/g) || [];
  const counts = new Map();
  words.forEach((word) => {
    if (stopwords.has(word) || /^\d+$/.test(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stableKey(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "release";
}

function shorten(value, max) {
  const text = normalizeWhitespace(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function serveStatic(pathname, res) {
  const relative = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const target = path.resolve(ROOT, `.${relative}`);

  if (!target.startsWith(ROOT)) {
    send(res, 403, "text/plain; charset=utf-8", "Forbidden");
    return;
  }

  fs.readFile(target, (error, content) => {
    if (error) {
      send(res, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }
    send(res, 200, mimeTypes[path.extname(target).toLowerCase()] || "application/octet-stream", content);
  });
}

function sendJson(res, status, payload) {
  send(res, status, "application/json; charset=utf-8", JSON.stringify(payload));
}

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`Chosun media platform is already running at http://127.0.0.1:${PORT}/index.html`);
    process.exit(0);
  }
  throw error;
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Chosun media platform running at http://127.0.0.1:${PORT}/index.html`);
});
