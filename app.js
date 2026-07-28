(() => {
  const STORAGE_KEY = "chosun-media-platform-v1";
  const app = document.querySelector("#app");
  const navRoot = document.querySelector("#nav");
  const viewRoot = document.querySelector("#view");
  const modalRoot = document.querySelector("#modal-root");
  const toastRoot = document.querySelector("#toast-root");
  const searchInput = document.querySelector("#global-search");
  const backupImport = document.querySelector("#backup-import");

  const releaseStatuses = {
    draft: { label: "초안", tone: "neutral" },
    review: { label: "검토중", tone: "info" },
    approved: { label: "승인", tone: "success" },
    scheduled: { label: "예약", tone: "warning" },
    distributed: { label: "배포완료", tone: "teal" },
  };

  const releaseNext = {
    draft: "review",
    review: "approved",
    approved: "scheduled",
    scheduled: "distributed",
  };

  const sentiments = {
    positive: { label: "긍정", tone: "success" },
    neutral: { label: "중립", tone: "neutral" },
    negative: { label: "부정", tone: "danger" },
  };

  const risks = {
    low: { label: "낮음", tone: "success" },
    medium: { label: "주의", tone: "warning" },
    high: { label: "긴급", tone: "danger" },
  };

  const mediaTypes = {
    broadcast: { label: "방송", tone: "danger", defaultInfluence: 95 },
    national: { label: "중앙지", tone: "info", defaultInfluence: 88 },
    local: { label: "지방지", tone: "teal", defaultInfluence: 72 },
    internet: { label: "인터넷언론", tone: "warning", defaultInfluence: 58 },
    other: { label: "기타언론", tone: "neutral", defaultInfluence: 42 },
  };

  const publicationChannels = {
    online: { label: "온라인판", tone: "info" },
    print: { label: "지면", tone: "teal" },
    broadcast: { label: "방송", tone: "danger" },
    both: { label: "지면, 온라인", tone: "success" },
    unknown: { label: "미분류", tone: "neutral" },
  };

  const MATCH_THRESHOLD = 32;
  const OFFICIAL_RELEASE_URL = "https://www3.chosun.ac.kr/chosun/2607/subview.do?enc=Zm5jdDF8QEB8JTJGYmJzJTJGY2hvc3VuJTJGNzIlMkZhcnRjbExpc3QuZG8lM0Y%3D";
  const OFFICIAL_RELEASE_SOURCE_VERSION = "20260714-official-pagination-v7";
  const OFFICIAL_BASELINE_RELEASE_VERSION = "20260714-july9-official-v4";
  const MEDIA_MOVE_SOURCE_VERSION = "20260723-live-news-sources-v1";
  const LOCAL_COLLECTOR_URL = "http://127.0.0.1:4180/api/official-releases";
  const LOCAL_NEWS_MONITOR_URL = "http://127.0.0.1:4180/api/news-monitor";
  const LOCAL_NEWS_KEYWORDS_URL = "http://127.0.0.1:4180/api/news-keywords";
  const LOCAL_NEWS_ARTICLES_URL = "http://127.0.0.1:4180/api/news-articles";
  const LOCAL_NEWS_COLLECT_URL = "http://127.0.0.1:4180/api/news-collect";
  const DEPLOYED_API_BASE =
    ["qjtjt1827.github.io", "chosun-university-media.github.io"].includes(window.location.hostname)
      ? "https://chosun-university-media-2026.aejinh.chatgpt.site"
      : "";
  const OFFICIAL_RELEASE_LABEL = "보도자료 자동 수집";
  const OFFICIAL_SYNC_INTERVAL_MS = 10 * 60 * 1000;
  const MEDIA_MOVE_SYNC_INTERVAL_MS = 30 * 60 * 1000;
  const KPI_YEARS = [2026, 2027, 2028];
  const ACTUAL_USE_START_DATE = "2026-07-09";
  const OPERATIONAL_MODE = "actual";
  const OPERATIONAL_RESET_VERSION = "20260709-live-start-v2";
  const ARTICLE_COLLECTION_START_DATE = ACTUAL_USE_START_DATE;
  const ARTICLE_RESET_VERSION = "20260709-articles-today-v1";
  const EXTERNAL_MONITOR_QUERIES = [
    { category: "교육부", query: "교육부 대학" },
    { category: "타대학", query: "전남대학교 OR 전남대" },
    { category: "타대학", query: "광주대학교 OR 광주대 OR 호남대학교 OR 호남대 OR 광주여자대학교 OR 광주여대" },
  ];
  const MEDIA_MOVE_SEARCH_QUERIES = [
    '"[인사]" ("광주매일신문" OR "KBC 광주방송" OR "남도일보" OR "광주일보" OR "전남일보" OR "전남매일" OR "무등일보")',
    '"[부고]" ("남도일보" OR "광주일보" OR "전남일보" OR "광주전남취재본부" OR "광주방송" OR "광주MBC" OR "목포MBC" OR "여수MBC")',
    'site:yna.co.kr ("[인사]" OR "[부고]") (광주 OR 전남) (언론 OR 신문 OR 방송 OR 기자 OR 편집국)',
    'site:newsis.com ("[인사]" OR "[부고]") (광주 OR 전남) (언론 OR 신문 OR 방송 OR 기자 OR 편집국)',
    'site:news1.kr ("[인사]" OR "[부고]") (광주 OR 전남) (언론 OR 신문 OR 방송 OR 기자 OR 편집국)',
  ];

  const issueStatuses = {
    watching: { label: "관찰", tone: "neutral" },
    response: { label: "대응중", tone: "warning" },
    closed: { label: "종결", tone: "success" },
  };

  const issueNext = {
    watching: "response",
    response: "closed",
  };

  const categories = ["연구", "입시", "학생", "산학협력", "지역사회", "행정", "국제", "기타"];
  const beats = ["교육", "지역", "사회", "방송", "과학", "의료", "온라인", "기타"];

  const navItems = [
    { id: "dashboard", label: "한눈에 보기", icon: "layout" },
    { id: "releases", label: "보도자료 성과", icon: "file" },
    { id: "monitoring", label: "기사 모니터링", icon: "radar" },
    { id: "negative", label: "부정기사 대응", icon: "shield" },
    { id: "mediaMoves", label: "언론사 동정", icon: "news" },
    { id: "reports", label: "성과 리포트", icon: "chart" },
    { id: "settings", label: "설정", icon: "settings" },
  ];

  const ui = {
    view: "dashboard",
    search: "",
    filters: {},
  };

  let state = loadState();

  init();

  function init() {
    renderNav();
    renderView();

    navRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-view]");
      if (!button) return;
      ui.view = button.dataset.view;
      ui.search = "";
      searchInput.value = "";
      renderNav();
      renderView();
      viewRoot.focus({ preventScroll: true });
    });

    searchInput.addEventListener("input", (event) => {
      ui.search = event.target.value.trim();
      renderView();
    });

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("change", handleChange);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });

    backupImport.addEventListener("change", importBackup);
    scheduleOfficialReleaseSync();
    scheduleMediaMoveSync();
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = prepareOperationalState(normalizeState(seedData()));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw);
      const normalized = prepareOperationalState(normalizeState(parsed));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      console.error(error);
      return prepareOperationalState(normalizeState(seedData()));
    }
  }

  function normalizeState(input) {
    const seeded = seedData();
    const releases = (Array.isArray(input.releases) ? input.releases : []).map(normalizeRelease);
    const allArticles = resolvePortalArticleOutlets(dedupeArticles(
      [
        ...(Array.isArray(input.articles) ? input.articles : []),
        ...(Array.isArray(input.affiliatedArticles) ? input.affiliatedArticles : []),
      ].map((article) => normalizeArticle(article, releases))
    ));
    const articles = allArticles.filter((article) => !isAffiliatedOnlyArticle(article, releases));
    const affiliatedArticles = allArticles.filter((article) => isAffiliatedOnlyArticle(article, releases));
    return {
      meta: { ...seeded.meta, ...(input.meta || {}) },
      departments: Array.isArray(input.departments) ? input.departments : seeded.departments,
      distributionGroups: Array.isArray(input.distributionGroups) ? input.distributionGroups : seeded.distributionGroups,
      keywords: Array.isArray(input.keywords) ? input.keywords : seeded.keywords,
      releases,
      articles,
      affiliatedArticles,
      externalArticles: Array.isArray(input.externalArticles) ? input.externalArticles.map(normalizeExternalArticle) : [],
      mediaMoves: Array.isArray(input.mediaMoves) ? input.mediaMoves.map(normalizeMediaMove) : [],
      collectedNewsArticles: Array.isArray(input.collectedNewsArticles) ? input.collectedNewsArticles.map(normalizeCollectedNewsArticle) : [],
      collectedNewsKeywords: Array.isArray(input.collectedNewsKeywords) && input.collectedNewsKeywords.length ? input.collectedNewsKeywords : ["조선대"],
      kpiRecords: normalizeKpiRecords(input.kpiRecords || seeded.kpiRecords),
      issues: Array.isArray(input.issues) ? input.issues : [],
      activity: Array.isArray(input.activity) ? input.activity : [],
    };
  }

  function prepareOperationalState(input) {
    if (
      input.meta?.operationalMode === OPERATIONAL_MODE &&
      input.meta?.actualUseStartDate === ACTUAL_USE_START_DATE &&
      input.meta?.operationalResetVersion === OPERATIONAL_RESET_VERSION
    ) {
      return ensureOfficialBaselineState(prepareMediaMoveSourceState(prepareOfficialReleaseSourceState(prepareArticleCollectionState(scopeOperationalState(input)))));
    }

    const now = new Date().toISOString();
    return ensureOfficialBaselineState({
      ...input,
      releases: [],
      articles: [],
      affiliatedArticles: [],
      externalArticles: [],
      mediaMoves: [],
      collectedNewsArticles: [],
      collectedNewsKeywords: input.collectedNewsKeywords?.length ? input.collectedNewsKeywords : ["조선대"],
      issues: [],
      activity: [
        {
          id: uid("act"),
          at: now,
          actor: "운영 시작",
          message: `${ACTUAL_USE_START_DATE}부터 실제 데이터 수집을 시작하도록 기존 예시 데이터를 비웠습니다.`,
        },
      ],
      meta: {
        ...(input.meta || {}),
        operationalMode: OPERATIONAL_MODE,
        operationalResetVersion: OPERATIONAL_RESET_VERSION,
        articleResetVersion: ARTICLE_RESET_VERSION,
        articleStartDate: ARTICLE_COLLECTION_START_DATE,
        officialReleaseSourceVersion: OFFICIAL_RELEASE_SOURCE_VERSION,
        mediaMoveSourceVersion: MEDIA_MOVE_SOURCE_VERSION,
        actualUseStartDate: ACTUAL_USE_START_DATE,
        sampleDataResetAt: now,
        updatedAt: now,
        aiScanAt: "",
        mediaMovesAt: "",
        homepageScanAt: "",
        homepageScanStatus: "waiting",
        homepageScanMessage: `${ACTUAL_USE_START_DATE}부터 실제 운영 데이터를 수집합니다. 자동 수집 서버 실행 후 새로고침하세요.`,
        homepageScanCount: 0,
      },
    });
  }

  function scopeOperationalState(input) {
    return {
      ...input,
      releases: filterOperationalItems(input.releases, (item) => item.publishAt || item.createdAt),
      articles: filterArticleItems(input.articles),
      affiliatedArticles: filterArticleItems(input.affiliatedArticles),
      externalArticles: filterArticleItems(input.externalArticles),
      collectedNewsArticles: filterCollectedNewsArticles(input.collectedNewsArticles),
      mediaMoves: filterOperationalItems(input.mediaMoves, (item) => item.publishedAt || item.createdAt),
      issues: filterOperationalItems(input.issues, (item) => item.createdAt || item.updatedAt),
    };
  }

  function prepareArticleCollectionState(input) {
    const scoped = {
      ...input,
      articles: filterArticleItems(input.articles),
      affiliatedArticles: filterArticleItems(input.affiliatedArticles),
      externalArticles: filterArticleItems(input.externalArticles),
      collectedNewsArticles: filterCollectedNewsArticles(input.collectedNewsArticles),
    };
    if (scoped.meta?.articleResetVersion === ARTICLE_RESET_VERSION) return scoped;

    const now = new Date().toISOString();
    return {
      ...scoped,
      articles: [],
      affiliatedArticles: [],
      externalArticles: [],
      collectedNewsArticles: [],
      issues: [],
      activity: [
        {
          id: uid("act"),
          at: now,
          actor: "기사 기준 설정",
          message: `${ARTICLE_COLLECTION_START_DATE} 날짜 기사부터 새로 수집하도록 기사 데이터를 비웠습니다.`,
        },
        ...(Array.isArray(scoped.activity) ? scoped.activity : []),
      ].slice(0, 80),
      meta: {
        ...(scoped.meta || {}),
        articleResetVersion: ARTICLE_RESET_VERSION,
        articleStartDate: ARTICLE_COLLECTION_START_DATE,
        aiScanAt: "",
        updatedAt: now,
      },
    };
  }

  function prepareOfficialReleaseSourceState(input) {
    if (input.meta?.officialReleaseSourceVersion === OFFICIAL_RELEASE_SOURCE_VERSION) return input;
    const now = new Date().toISOString();
    const releases = (Array.isArray(input.releases) ? input.releases : [])
      .map((release) => {
        if (release.sourceType !== "official-homepage") return release;
        const officialDate = officialKnownPublishAt(release.sourceUrl);
        return officialDate ? { ...release, publishAt: officialDate } : release;
      })
      .filter((release) => {
        if (release.sourceType !== "official-homepage") return true;
        return isCurrentOfficialReleaseSource(release.sourceUrl) && isLikelyOfficialReleaseTitle(release.title || "") && isOperationalDate(release.publishAt || release.createdAt);
      });
    return {
      ...input,
      releases,
      meta: {
        ...(input.meta || {}),
        officialReleaseSourceVersion: OFFICIAL_RELEASE_SOURCE_VERSION,
        homepageScanAt: "",
        homepageScanStatus: "waiting",
        homepageScanMessage: "조선대학교 보도자료 게시판 기준으로 다시 수집하도록 준비했습니다.",
        updatedAt: now,
      },
    };
  }

  function prepareMediaMoveSourceState(input) {
    if (input.meta?.mediaMoveSourceVersion === MEDIA_MOVE_SOURCE_VERSION) return input;
    return {
      ...input,
      mediaMoves: (Array.isArray(input.mediaMoves) ? input.mediaMoves : []).filter((item) => item.url && !/example\.com\/media-move/i.test(item.url)),
      meta: {
        ...(input.meta || {}),
        mediaMoveSourceVersion: MEDIA_MOVE_SOURCE_VERSION,
        mediaMovesAt: "",
        mediaMovesStatus: "waiting",
        mediaMovesMessage: "광주·전남 언론사 인사·부고 자동 확인을 준비했습니다.",
      },
    };
  }

  function ensureOfficialBaselineState(input) {
    const releases = Array.isArray(input.releases) ? [...input.releases] : [];
    let added = 0;
    let changed = 0;

    officialBaselineReleases().forEach((baselineItem) => {
      const baseline = normalizeRelease(baselineItem);
      const existingIndex = releases.findIndex((release) => isSameOfficialBaselineRelease(release, baseline));
      if (existingIndex >= 0) {
        const existing = normalizeRelease(releases[existingIndex]);
        const merged = normalizeRelease({
          ...baseline,
          ...existing,
          sourceType: "official-homepage",
          sourceName: OFFICIAL_RELEASE_LABEL,
          sourceUrl: isCurrentOfficialReleaseSource(existing.sourceUrl) ? existing.sourceUrl : baseline.sourceUrl,
          sourceId: existing.sourceId || baseline.sourceId,
          publishAt: baseline.publishAt,
          subtitle: existing.subtitle && existing.subtitle !== existing.summary ? existing.subtitle : baseline.subtitle,
          summary: existing.summary && existing.summary !== existing.title ? existing.summary : baseline.summary,
          body: String(existing.body || "").length > String(baseline.body || "").length ? existing.body : baseline.body,
          tags: [...new Set([...(baseline.tags || []), ...(existing.tags || [])])],
          groups: [...new Set([...(baseline.groups || []), ...(existing.groups || [])])],
          syncedAt: existing.syncedAt || baseline.syncedAt,
        });
        if (JSON.stringify(merged) !== JSON.stringify(existing)) changed += 1;
        releases[existingIndex] = merged;
      } else {
        releases.push(baseline);
        added += 1;
      }
    });

    const normalizedReleases = filterOperationalReleases(releases).sort(
      (a, b) => String(b.publishAt || "").localeCompare(String(a.publishAt || "")) || String(b.sourceId || b.id || "").localeCompare(String(a.sourceId || a.id || ""))
    );
    const allArticles = dedupeArticles(
      [
        ...(Array.isArray(input.articles) ? input.articles : []),
        ...(Array.isArray(input.affiliatedArticles) ? input.affiliatedArticles : []),
      ].map((article) => normalizeArticleForBaseline(article, normalizedReleases))
    );
    const articles = allArticles.filter((article) => !isAffiliatedOnlyArticle(article, normalizedReleases));
    const affiliatedArticles = allArticles.filter((article) => isAffiliatedOnlyArticle(article, normalizedReleases));
    const activity = added
      ? [
          {
            id: uid("act"),
            at: new Date().toISOString(),
            actor: "보도자료 기준 설정",
            message: "공식 조선대뉴스 2026년 7월 9일 보도자료를 관리 기준에 반영했습니다.",
          },
          ...(Array.isArray(input.activity) ? input.activity : []),
        ].slice(0, 80)
      : input.activity;

    return {
      ...input,
      releases: normalizedReleases,
      articles,
      affiliatedArticles,
      activity,
      meta: {
        ...(input.meta || {}),
        officialBaselineReleaseVersion: OFFICIAL_BASELINE_RELEASE_VERSION,
        homepageScanMessage: added || changed ? "공식 보도자료 기준 자료를 반영했습니다." : input.meta?.homepageScanMessage,
      },
    };
  }

  function officialBaselineReleases() {
    const now = new Date().toISOString();
    return [
      {
        id: "official-2026-07-09-279688",
        sourceId: "chosun-news-72-279688",
        sourceType: "official-homepage",
        sourceName: OFFICIAL_RELEASE_LABEL,
        sourceUrl: "https://www3.chosun.ac.kr/bbs/chosun/72/279688/artclView.do",
        title: "조선대, 보성교육청과 ‘AI 교육의 날’ AI+X 융합캠프 성료",
        subtitle: "국어 AI 로봇 융합 프로젝트로 중학생 주도형 AI 리터러시 교육 호평",
        summary: "조선대와 보성교육청이 AI 교육의 날 AI+X 융합캠프를 운영해 중학생 주도형 AI 리터러시 교육 성과를 알렸다.",
        body: "조선대학교와 보성교육청은 AI 교육의 날 AI+X 융합캠프를 성료했다. 국어 AI 로봇 융합 프로젝트를 중심으로 중학생 주도형 AI 리터러시 교육을 진행했다.",
        department: "대외협력처",
        owner: "자동 수집",
        category: "지역사회",
        status: "distributed",
        publishAt: "2026-07-09",
        tags: ["AI 교육", "보성교육청", "융합캠프"],
        groups: ["광주·전남 지역 언론", "대학전문·교육매체"],
        attachments: [],
        expectedOutlets: 12,
        createdAt: now,
        updatedAt: now,
        syncedAt: now,
      },
      {
        id: "official-2026-07-09-279687",
        sourceId: "chosun-news-72-279687",
        sourceType: "official-homepage",
        sourceName: OFFICIAL_RELEASE_LABEL,
        sourceUrl: "https://www3.chosun.ac.kr/bbs/chosun/72/279687/artclView.do",
        title: "조선대 약학대학 독성학실 이지현 박사후연구원, 일본독성학회 우수 발표상 수상",
        subtitle: "간섬유증의 새로운 치료 전략 제시",
        summary: "조선대 약학대학 독성학실 이지현 박사후연구원이 일본독성학회에서 간섬유증 치료 전략 연구로 우수 발표상을 수상했다.",
        body: "조선대학교 약학대학 독성학실 이지현 박사후연구원은 일본독성학회 우수 발표상을 수상했다. 연구는 간섬유증의 새…58695 tokens truncated…ction csvRowsForAffiliatedArticles() {
    return csvRowsForArticleItems(state.affiliatedArticles || []);
  }

  function csvRowsForArticleItems(items) {
    return items.map((item) => ({
      title: item.title,
      outlet: item.outlet,
      reporter: item.reporter,
      url: item.url,
      publishedAt: item.publishedAt,
      mediaType: mediaTypes[item.mediaType]?.label || item.mediaType,
      channel: articleChannelLabels(item),
      influenceScore: impactPercent(articleImpactScore(item)),
      matchScore: Math.round(Number(item.matchScore || 0)),
      releaseTitle: state.releases.find((release) => release.id === item.releaseId)?.title || "",
      sentiment: sentiments[item.sentiment]?.label || item.sentiment,
      topic: item.topic,
      risk: risks[item.risk]?.label || item.risk,
      status: articleStatusLabel(item.status),
      keywords: (item.keywords || []).join("; "),
      excerpt: item.excerpt,
      memo: item.memo,
    }));
  }

  function csvRowsForIssues() {
    return state.issues.map((item) => ({
      title: item.title,
      severity: risks[item.severity]?.label || item.severity,
      status: issueStatuses[item.status]?.label || item.status,
      owner: item.owner,
      department: item.department,
      createdAt: item.createdAt,
      officialPosition: item.officialPosition,
      memo: item.memo,
    }));
  }

  function upsert(collection, item) {
    const index = state[collection].findIndex((current) => current.id === item.id);
    if (index >= 0) state[collection][index] = item;
    else state[collection].unshift(item);
    if (collection === "articles") state.articles = dedupeArticles(state.articles);
  }

  function addActivity(actor, message) {
    state.activity.unshift({
      id: uid("act"),
      at: new Date().toISOString(),
      actor,
      message,
    });
    state.activity = state.activity.slice(0, 80);
  }

  function openModal(title, body, footer, options = {}) {
    const className = options.className ? ` ${escapeAttr(options.className)}` : "";
    modalRoot.setAttribute("aria-hidden", "false");
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <section class="modal${className}" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}" data-modal-panel>
          <header class="modal-header">
            <h2>${escapeHtml(title)}</h2>
            <button class="icon-button" type="button" data-action="close-modal" aria-label="닫기">
              ${icon("x")}
            </button>
          </header>
          <div class="modal-body">${body}</div>
          <footer class="modal-footer">${footer}</footer>
        </section>
      </div>
    `;
    const firstInput = modalRoot.querySelector("input, select, textarea, button");
    firstInput?.focus();
  }

  function closeModal() {
    modalRoot.setAttribute("aria-hidden", "true");
    modalRoot.innerHTML = "";
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    toastRoot.appendChild(node);
    setTimeout(() => node.remove(), 2800);
  }

  function metric(label, value, note) {
    return `
      <div class="metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <em>${escapeHtml(note)}</em>
      </div>
    `;
  }

  function reportTile(label, value, note) {
    return `
      <div class="report-tile">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p class="muted">${escapeHtml(note)}</p>
      </div>
    `;
  }

  function alertItem(item) {
    return `
      <article class="list-item">
        <div class="list-item-header">
          <h3>${escapeHtml(item.title)}</h3>
          ${statusChip(risks, item.risk)}
        </div>
        <p>${escapeHtml(item.outlet || "-")} · ${formatDateTime(item.publishedAt) || "-"}</p>
        <p>${escapeHtml(item.memo || item.excerpt || "")}</p>
      </article>
    `;
  }

  function activityItem(item) {
    return `
      <article class="list-item">
        <div class="list-item-header">
          <h3>${escapeHtml(item.actor)}</h3>
          <span class="muted">${formatDateTime(item.at)}</span>
        </div>
        <p>${escapeHtml(item.message)}</p>
      </article>
    `;
  }

  function barList(counts, dictionary = null) {
    const entries = Object.entries(counts || {})
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    if (!entries.length) return empty("집계할 데이터가 없습니다.");
    const max = Math.max(...entries.map(([, value]) => value), 1);
    return `
      <div class="bar-list">
        ${entries
          .map(([key, value]) => {
            const label = dictionary?.[key]?.label || key || "미분류";
            return `
              <div class="bar-row">
                <span>${escapeHtml(label)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(8, (value / max) * 100)}%"></div></div>
                <strong>${value}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function sectionTabs(key, active, tabs) {
    return `
      <div class="subnav" role="tablist" aria-label="중메뉴">
        ${tabs
          .map(
            ([id, label]) => `
              <button class="subnav-item ${active === id ? "active" : ""}" type="button" role="tab" aria-selected="${active === id ? "true" : "false"}" data-action="set-subview" data-subview-key="${escapeAttr(key)}" data-subview="${escapeAttr(id)}">
                ${escapeHtml(label)}
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function timelineChart(items) {
    if (!items?.length) return empty("추이 데이터가 없습니다.");
    const max = Math.max(...items.map((item) => item.count), 1);
    return `
      <div class="timeline-chart">
        ${items
          .map(
            (item) => `
              <div class="timeline-column">
                <em>${item.count}</em>
                <span style="height:${Math.max(6, (item.count / max) * 100)}%" title="${escapeAttr(formatDate(item.date))} ${item.count}건"></span>
                <small>${escapeHtml(item.date.slice(5).replace("-", "."))}</small>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function articleRankList(items) {
    if (!items?.length) return empty("집계할 데이터가 없습니다.");
    return `
      <ol class="rank-list">
        ${items
          .map(
            (item, index) => `
              <li>
                <span class="rank-index">${index + 1}</span>
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>보도량 ${item.articleCount}건 · ${item.outletCount}개 언론사 · 매체 영향력 ${impactPercent(item.avgImpact)}</p>
                  ${outletLinkList(item.articles, 4)}
                </div>
              </li>
            `
          )
          .join("")}
      </ol>
    `;
  }

  function releaseRankList(items) {
    if (!items?.length) return empty("집계할 데이터가 없습니다.");
    return `
      <ol class="rank-list">
        ${items
          .map(
            ({ release, stats }, index) => `
              <li>
                <span class="rank-index">${index + 1}</span>
                <div>
                  <strong>${escapeHtml(release.title)}</strong>
                  <p>${formatDate(release.publishAt) || "-"} · ${escapeHtml(release.department || "-")} · 기사 ${stats.articleCount}건 · 매체 영향력 ${impactPercent(stats.avgImpact)}</p>
                  <div class="summary-detail-row">${releaseCoverageAction(release, stats, "상세보기")}</div>
                </div>
              </li>
            `
          )
          .join("")}
      </ol>
    `;
  }

  function field(label, control, full = false) {
    return `
      <label class="form-field ${full ? "full" : ""}">
        <span>${escapeHtml(label)}</span>
        ${control}
      </label>
    `;
  }

  function option(value, label, selected) {
    return `<option value="${escapeAttr(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function chip(label, tone = "neutral") {
    return `<span class="chip ${tone}">${escapeHtml(label)}</span>`;
  }

  function statusChip(dictionary, value) {
    const item = dictionary[value] || { label: value || "-", tone: "neutral" };
    return chip(item.label, item.tone);
  }

  function empty(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function dateFilterState(scope) {
    const fromKey = `${scope}DateFrom`;
    const toKey = `${scope}DateTo`;
    const from = normalizeDateInput(filterValue(fromKey, ACTUAL_USE_START_DATE)) || ACTUAL_USE_START_DATE;
    const to = normalizeDateInput(filterValue(toKey, todayDate())) || todayDate();
    ui.filters[fromKey] = from;
    ui.filters[toKey] = to;
    return { from, to };
  }

  function dateFilterControls(scope, filter) {
    return `
      <span class="filter-label">기간</span>
      <input type="date" data-filter="${escapeAttr(`${scope}DateFrom`)}" value="${escapeAttr(filter.from)}" aria-label="시작일" />
      <input type="date" data-filter="${escapeAttr(`${scope}DateTo`)}" value="${escapeAttr(filter.to)}" aria-label="종료일" />
    `;
  }

  function dateFilterLabel(filter) {
    return `${formatDate(filter.from)} - ${formatDate(filter.to)}`;
  }

  function matchesDateFilter(value, filter) {
    return isWithinDateRange(value, filter.from, filter.to);
  }

  function normalizeDateInput(value) {
    const text = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function articleStatusLabel(status) {
    return (
      {
        unreviewed: "미확인",
        reviewed: "확인완료",
        escalated: "이슈화",
      }[status] || status || "-"
    );
  }

  function filterValue(key, fallback) {
    if (ui.filters[key] === undefined || ui.filters[key] === null || ui.filters[key] === "") ui.filters[key] = fallback;
    return ui.filters[key];
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function matchesSearch(item, query) {
    if (!query) return true;
    return flatten(item).toLowerCase().includes(query.toLowerCase());
  }

  function flatten(value) {
    if (Array.isArray(value)) return value.map(flatten).join(" ");
    if (value && typeof value === "object") return Object.values(value).map(flatten).join(" ");
    return String(value || "");
  }

  function stableKey(value) {
    return String(value || "item")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function uniqueByKey(items, keyFn) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const key = keyFn(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function countBy(items, key) {
    return items.reduce((acc, item) => {
      const value = item[key] || "미분류";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function sortByUpdated(a, b) {
    return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
  }

  function sortByReleaseDate(a, b) {
    return String(b.publishAt || b.createdAt || "").localeCompare(String(a.publishAt || a.createdAt || "")) || String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  }

  function sortByPublished(a, b) {
    return String(b.publishedAt || b.createdAt || "").localeCompare(String(a.publishedAt || a.createdAt || ""));
  }

  function splitComma(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return map[char];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function uid(prefix) {
    if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function todayDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function previousCalendarDate(value = todayDate()) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function firstDayOfMonth() {
    return `${todayDate().slice(0, 7)}-01`;
  }

  function todayAt(hour) {
    const date = new Date();
    date.setHours(hour, 0, 0, 0);
    return toDateTimeString(date);
  }

  function daysAgo(days, hour = 9) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, 0, 0, 0);
    return toDateTimeString(date);
  }

  function daysFromNow(days, hour = 9) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return toDateTimeString(date);
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

  function toInputDateTime(value) {
    if (!value) return "";
    return String(value).slice(0, 16);
  }

  function toInputDate(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  function formatDate(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  function numberFormat(value) {
    return Number(value || 0).toLocaleString("ko-KR");
  }

  function formatDateTime(value) {
    if (!value) return "";
    const text = String(value);
    if (text.includes("T")) return `${text.slice(0, 10)} ${text.slice(11, 16)}`;
    return text.slice(0, 10);
  }

  function formatTime(date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function download(filename, mime, content) {
    try {
      const blob = new Blob(["\ufeff", content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      return true;
    } catch (error) {
      console.error(error);
      toast("파일 생성 중 오류가 발생했습니다.");
      return false;
    }
  }

  function printHtmlReport(html) {
    try {
      const frame = document.createElement("iframe");
      frame.className = "print-frame";
      frame.setAttribute("aria-hidden", "true");
      document.body.appendChild(frame);
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) throw new Error("인쇄 문서를 만들 수 없습니다.");
      doc.open();
      doc.write(html);
      doc.close();
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1200);
      toast("인쇄 창을 열었습니다.");
    } catch (error) {
      console.error(error);
      toast("인쇄 기능을 실행하지 못했습니다.");
    }
  }

  function toCsv(rows) {
    const headers = Object.keys(rows[0] || {});
    return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
  }

  function csvCell(value) {
    const text = String(value ?? "");
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function normalizeSentiment(value) {
    const text = String(value || "").trim().toLowerCase();
    if (["긍정", "positive", "good"].includes(text)) return "positive";
    if (["부정", "negative", "bad"].includes(text)) return "negative";
    return "neutral";
  }

  function normalizeRisk(value) {
    const text = String(value || "").trim().toLowerCase();
    if (["긴급", "높음", "high"].includes(text)) return "high";
    if (["주의", "보통", "medium"].includes(text)) return "medium";
    return "low";
  }

  function icon(name) {
    const icons = {
      layout:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="8"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="15" width="7" height="6"/></svg>',
      file:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
      users:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      radar:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 4.5 21 12h-9V3"/><circle cx="12" cy="12" r="9"/><path d="M8 12a4 4 0 1 0 4-4"/></svg>',
      shield:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></svg>',
      news:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7H4v12Z"/><path d="M8 7V3h8v4M8 12h8M8 16h5"/></svg>',
      calendar:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
      chart:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/></svg>',
      settings:
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.9l.06.06A1.65 1.65 0 0 0 8.6 4.6a1.65 1.65 0 0 0 1-.6A1.65 1.65 0 0 0 10 2.92V3a2 2 0 1 1 4 0v-.08A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8.6a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1.08.4H21a2 2 0 1 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15Z"/></svg>',
      x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    };
    return icons[name] || icons.file;
  }
})();
