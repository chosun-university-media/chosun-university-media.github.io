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
        body: "조선대학교 약학대학 독성학실 이지현 박사후연구원은 일본독성학회 우수 발표상을 수상했다. 연구는 간섬유증의 새로운 치료 전략을 제시한 성과로 소개됐다.",
        department: "산학협력단",
        owner: "자동 수집",
        category: "연구",
        status: "distributed",
        publishAt: "2026-07-09",
        tags: ["약학대학", "독성학", "우수 발표상"],
        groups: ["광주·전남 지역 언론", "대학전문·교육매체"],
        attachments: [],
        expectedOutlets: 12,
        createdAt: now,
        updatedAt: now,
        syncedAt: now,
      },
    ];
  }

  function isSameOfficialBaselineRelease(release, baseline) {
    if (!release || !baseline) return false;
    const leftUrl = normalizeOfficialSourceUrl(release.sourceUrl);
    const rightUrl = normalizeOfficialSourceUrl(baseline.sourceUrl);
    if (leftUrl && rightUrl && leftUrl === rightUrl) return true;
    const sameDate = String(release.publishAt || "").slice(0, 10) === String(baseline.publishAt || "").slice(0, 10);
    if (!sameDate) return false;
    const leftTitle = normalizeArticleComparableText(release.title || "");
    const rightTitle = normalizeArticleComparableText(baseline.title || "");
    if (stableKey(leftTitle) === stableKey(rightTitle)) return true;
    return articleTokenSimilarity(leftTitle, rightTitle) >= 0.62;
  }

  function normalizeArticleForBaseline(article, releases) {
    const normalized = normalizeArticle({ ...article }, releases);
    const best = findBestReleaseMatch(normalized, releases);
    if (best?.releaseId && best.score >= MATCH_THRESHOLD && (!normalized.releaseId || best.score > Number(normalized.matchScore || 0))) {
      normalized.releaseId = best.releaseId;
      normalized.matchScore = best.score;
      normalized.status = normalized.status === "unreviewed" ? "matched" : normalized.status;
    }
    return normalized;
  }

  function filterOperationalItems(items, dateGetter) {
    return (Array.isArray(items) ? items : []).filter((item) => isOperationalDate(dateGetter(item)));
  }

  function filterArticleItems(items) {
    return (Array.isArray(items) ? items : []).filter((item) => {
      const date = String(item.publishedAt || item.createdAt || "").slice(0, 10);
      return !date || date >= ARTICLE_COLLECTION_START_DATE;
    });
  }

  function filterCollectedNewsArticles(items) {
    return (Array.isArray(items) ? items : []).filter((item) => {
      const date = String(item.publishedAt || item.pubDate || "").slice(0, 10);
      return !date || date >= ARTICLE_COLLECTION_START_DATE;
    });
  }

  function isOperationalDate(value) {
    const date = String(value || "").slice(0, 10);
    return !date || date >= ACTUAL_USE_START_DATE;
  }

  function saveState() {
    state.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderNav();
  }

  function seedData() {
    const relResearch = "rel-ai-center";
    const relAdmission = "rel-admission";
    const relVolunteer = "rel-volunteer";
    const relStartup = "rel-startup";
    const relGlobal = "rel-global";

    return {
      meta: {
        organization: "조선대학교",
        team: "대외협력처 홍보팀",
        updatedAt: new Date().toISOString(),
        aiScanAt: daysAgo(0, 8),
        mediaMovesAt: daysAgo(0, 8),
        officialReleaseUrl: OFFICIAL_RELEASE_URL,
        homepageScanAt: "",
        homepageScanStatus: "waiting",
        homepageScanMessage: "보도자료 자동 확인을 준비 중입니다.",
        homepageScanCount: 0,
      },
      departments: ["대외협력처", "입학처", "산학협력단", "학생처", "교무처", "의과대학", "공과대학", "총무관리처"],
      distributionGroups: ["광주·전남 지역 언론", "중앙 교육·사회부", "방송·라디오", "대학전문·교육매체", "산학협력·과학기술"],
      keywords: [
        { id: "key-1", word: "조선대학교", scope: "전체", alertLevel: "medium" },
        { id: "key-2", word: "조선대", scope: "전체", alertLevel: "medium" },
        { id: "key-3", word: "입학", scope: "입시", alertLevel: "low" },
        { id: "key-4", word: "연구성과", scope: "연구", alertLevel: "low" },
        { id: "key-5", word: "사고", scope: "위기", alertLevel: "high" },
      ],
      kpiRecords: defaultKpiRecords(),
      releases: [
        {
          id: relResearch,
          title: "조선대학교, 지역 전략산업 연계 AI 융합연구센터 개소",
          department: "산학협력단",
          owner: "홍보팀 김민지",
          category: "연구",
          status: "distributed",
          publishAt: daysAgo(8, 9),
          embargo: "",
          summary: "지역 제조·의료 데이터를 활용한 AI 융합 연구와 인재 양성을 추진한다.",
          body: "조선대학교는 지역 전략산업과 연계한 AI 융합연구센터를 개소하고 산학 공동 연구, 현장형 교육, 기술 사업화를 추진한다.",
          tags: ["AI", "지역혁신", "산학협력"],
          groups: ["광주·전남 지역 언론", "산학협력·과학기술"],
          attachments: ["센터 개소식 사진", "연구책임자 프로필", "사업 개요"],
          createdAt: daysAgo(12),
          updatedAt: daysAgo(8),
        },
        {
          id: relAdmission,
          title: "2027학년도 수시모집 학생부종합전형 안내",
          department: "입학처",
          owner: "입학홍보 이서연",
          category: "입시",
          status: "scheduled",
          publishAt: daysFromNow(2, 10),
          embargo: daysFromNow(2, 9),
          summary: "학생부종합전형 주요 변경사항과 지원자 유의사항을 안내한다.",
          body: "조선대학교 입학처는 2027학년도 수시모집 학생부종합전형의 주요 일정, 평가 방식, 지원자 유의사항을 공개한다.",
          tags: ["수시", "입학", "학생부종합"],
          groups: ["광주·전남 지역 언론", "대학전문·교육매체"],
          attachments: ["전형 안내표", "입학처장 사진"],
          createdAt: daysAgo(3),
          updatedAt: daysAgo(1),
        },
        {
          id: relVolunteer,
          title: "조선대학교 학생봉사단, 지역 어르신 여름 건강 돌봄 활동",
          department: "학생처",
          owner: "학생지원 박준호",
          category: "지역사회",
          status: "approved",
          publishAt: daysFromNow(1, 14),
          embargo: "",
          summary: "학생봉사단이 광주 동구 일대에서 건강 상담과 생활 지원 활동을 진행한다.",
          body: "조선대학교 학생봉사단은 지역 어르신을 대상으로 건강 돌봄, 폭염 대비 물품 전달, 생활 상담 활동을 진행한다.",
          tags: ["봉사", "지역사회", "학생"],
          groups: ["광주·전남 지역 언론", "방송·라디오"],
          attachments: ["봉사활동 사진"],
          createdAt: daysAgo(5),
          updatedAt: daysAgo(1),
        },
        {
          id: relStartup,
          title: "캠퍼스 창업기업 3곳, 팁스 운영사 투자 유치",
          department: "창업지원단",
          owner: "산학홍보 정다은",
          category: "산학협력",
          status: "review",
          publishAt: "",
          embargo: "",
          summary: "교원·학생 창업기업의 투자 유치 성과와 후속 지원 계획을 소개한다.",
          body: "조선대학교 창업지원단은 캠퍼스 창업기업 3곳이 팁스 운영사로부터 초기 투자를 유치했다고 밝혔다.",
          tags: ["창업", "투자", "팁스"],
          groups: ["중앙 교육·사회부", "산학협력·과학기술"],
          attachments: ["기업별 소개자료"],
          createdAt: daysAgo(2),
          updatedAt: daysAgo(1),
        },
        {
          id: relGlobal,
          title: "동남아 주요 대학과 글로벌 공동교육 프로그램 추진",
          department: "국제협력팀",
          owner: "국제홍보 최유진",
          category: "국제",
          status: "draft",
          publishAt: "",
          embargo: "",
          summary: "공동 학위, 교환학생, 단기 집중교육 프로그램을 확대한다.",
          body: "조선대학교는 동남아 주요 대학과 글로벌 공동교육 프로그램 추진을 위한 협약 체결을 준비하고 있다.",
          tags: ["국제교류", "공동교육"],
          groups: ["중앙 교육·사회부", "대학전문·교육매체"],
          attachments: [],
          createdAt: daysAgo(1),
          updatedAt: daysAgo(1),
        },
      ],
      articles: [
        {
          id: "art-1",
          title: "조선대, AI 융합연구센터 개소...지역 산업 디지털 전환 지원",
          outlet: "광주일보",
          reporter: "김하늘",
          url: "https://example.com/news/ai-center",
          publishedAt: daysAgo(7, 11),
          sentiment: "positive",
          topic: "연구",
          releaseId: relResearch,
          keywords: ["조선대", "AI", "산학협력"],
          risk: "low",
          status: "reviewed",
          excerpt: "지역 전략산업과 연계한 AI 연구 기반을 조성했다는 내용.",
          memo: "보도자료 핵심 메시지 반영.",
          createdAt: daysAgo(7),
          updatedAt: daysAgo(7),
        },
        {
          id: "art-2",
          title: "지역 대학, 미래차·의료 AI 인재 양성 경쟁",
          outlet: "전자신문",
          reporter: "정민석",
          url: "https://example.com/news/local-ai-talent",
          publishedAt: daysAgo(6, 8),
          sentiment: "neutral",
          topic: "산학협력",
          releaseId: relResearch,
          keywords: ["지역대학", "AI", "인재양성"],
          risk: "low",
          status: "reviewed",
          excerpt: "지역 대학들의 산학협력 동향을 비교 보도.",
          memo: "조선대 언급은 3번째 문단.",
          createdAt: daysAgo(6),
          updatedAt: daysAgo(6),
        },
        {
          id: "art-3",
          title: "조선대 학생봉사단, 폭염 취약계층 돌봄 나선다",
          outlet: "KBC광주방송",
          reporter: "박선우",
          url: "https://example.com/news/volunteer",
          publishedAt: daysAgo(1, 18),
          sentiment: "positive",
          topic: "지역사회",
          releaseId: relVolunteer,
          keywords: ["봉사", "지역사회", "폭염"],
          risk: "low",
          status: "unreviewed",
          excerpt: "학생봉사단 활동 예고 기사.",
          memo: "방송 촬영 요청 가능성 있음.",
          createdAt: daysAgo(1),
          updatedAt: daysAgo(1),
        },
        {
          id: "art-4",
          title: "지역 사립대 등록금·장학금 정보 공개 요구 확산",
          outlet: "남도뉴스",
          reporter: "윤지호",
          url: "https://example.com/news/tuition",
          publishedAt: todayAt(8),
          sentiment: "negative",
          topic: "행정",
          releaseId: "",
          keywords: ["등록금", "장학금", "조선대"],
          risk: "high",
          status: "escalated",
          excerpt: "지역 사립대 재정 관련 시민단체 요구를 다룬 기사.",
          memo: "학생처와 기획처 사실관계 확인 필요.",
          createdAt: todayAt(9),
          updatedAt: todayAt(9),
        },
      ],
      externalArticles: [
        {
          id: "ext-1",
          title: "교육부, 지역혁신중심 대학지원체계 성과 점검",
          source: "교육부",
          outlet: "교육부",
          url: "https://example.com/education/ministry-rise",
          publishedAt: todayAt(7),
          category: "교육부",
          sentiment: "neutral",
          importance: 92,
          memo: "RISE, 글로컬, 재정지원사업 관련 후속 확인 필요.",
        },
        {
          id: "ext-2",
          title: "전남권 대학, 의생명·AI 융합 인재 양성 확대",
          source: "타대학",
          outlet: "지역교육뉴스",
          url: "https://example.com/education/ai-bio",
          publishedAt: daysAgo(1, 10),
          category: "타대학",
          sentiment: "neutral",
          importance: 76,
          memo: "조선대 AI 융합연구센터 메시지와 비교 가능.",
        },
        {
          id: "ext-3",
          title: "광주 주요 대학 수시모집 홍보전 본격화",
          source: "타대학",
          outlet: "광주교육저널",
          url: "https://example.com/education/admission",
          publishedAt: daysAgo(2, 9),
          category: "타대학",
          sentiment: "neutral",
          importance: 68,
          memo: "입학처 수시 보도자료 배포 일정과 함께 관리.",
        },
      ],
      mediaMoves: [
        {
          id: "move-1",
          type: "인사",
          outlet: "광주일보",
          title: "김도윤 씨 광주일보 교육문화부 인사발령",
          person: "김도윤",
          publishedAt: todayAt(8),
          source: "AI 언론 동정 조사",
          url: "https://example.com/media-move/gwangju-personnel",
          importance: 82,
          note: "대학·입시 보도자료 배포 대상 업데이트 필요",
        },
        {
          id: "move-2",
          type: "부고",
          outlet: "무등일보",
          title: "박성호 씨 장모상",
          person: "박성호",
          publishedAt: daysAgo(1, 17),
          source: "AI 언론 동정 조사",
          url: "https://example.com/media-move/obituary",
          importance: 76,
          note: "홍보팀 차원의 조문·관계 관리 확인 필요",
        },
        {
          id: "move-3",
          type: "동정",
          outlet: "KBC광주방송",
          title: "KBC광주방송 교육 현장 취재 확대",
          person: "보도국",
          publishedAt: daysAgo(1, 10),
          source: "AI 언론 동정 조사",
          url: "https://example.com/media-move/kbc-education",
          importance: 69,
          note: "영상 제공형 보도자료 우선 검토",
        },
      ],
      issues: [
        {
          id: "iss-1",
          title: "등록금·장학금 정보 공개 요구 보도",
          severity: "high",
          status: "response",
          owner: "홍보팀장",
          department: "기획처, 학생처",
          createdAt: todayAt(9),
          linkedArticles: ["지역 사립대 등록금·장학금 정보 공개 요구 확산"],
          officialPosition: "관련 자료를 확인해 투명하게 공개 가능한 범위를 정리하고 있다.",
          qna: "Q. 등록금 인상 계획이 있나?\nA. 현재 확정된 사항은 없으며 학생 부담 완화를 우선 검토한다.",
          timeline: "09:00 기사 확인\n09:20 기획처 사실관계 요청\n10:10 학생처 장학금 현황 취합",
          memo: "오후 중 공식 설명자료 준비.",
          updatedAt: todayAt(10),
        },
        {
          id: "iss-2",
          title: "수시모집 문의 증가",
          severity: "medium",
          status: "watching",
          owner: "입학홍보 이서연",
          department: "입학처",
          createdAt: daysAgo(2),
          linkedArticles: [],
          officialPosition: "전형 안내 페이지와 FAQ를 정비한다.",
          qna: "Q. 학생부종합전형 평가 기준은?\nA. 모집요강 공개 이후 세부 기준을 안내한다.",
          timeline: "문의량 증가 확인\nFAQ 업데이트 항목 정리",
          memo: "수시 보도자료 배포 전 콜센터 공유 필요.",
          updatedAt: daysAgo(1),
        },
      ],
      activity: [
        { id: "act-1", at: todayAt(10), actor: "홍보팀", message: "등록금·장학금 이슈 대응방 업데이트" },
        { id: "act-2", at: todayAt(9), actor: "모니터링", message: "긴급 기사 1건을 이슈 대응으로 전환" },
        { id: "act-3", at: daysAgo(1), actor: "학생처", message: "학생봉사단 보도자료 승인 완료" },
        { id: "act-4", at: daysAgo(2), actor: "입학처", message: "수시모집 보도자료 배포 예약" },
      ],
    };
  }

  function renderNav() {
    navRoot.innerHTML = navItems
      .map((item) => {
        const badge = navBadge(item.id);
        return `
          <button class="nav-item ${ui.view === item.id ? "active" : ""}" type="button" data-view="${item.id}" title="${item.label}">
            ${icon(item.icon)}
            <span>${item.label}</span>
            ${badge ? `<span class="nav-badge">${badge}</span>` : ""}
          </button>
        `;
      })
      .join("");
  }

  function navBadge(id) {
    if (id === "releases") return state.releases.filter((item) => item.status === "review").length || "";
    if (id === "mediaMoves") return (state.mediaMoves || []).filter((item) => String(item.publishedAt || "").slice(0, 10) >= lastNDates(2)[0]).length || "";
    return "";
  }

  function renderView() {
    const renderers = {
      dashboard: renderDashboard,
      releases: renderReleases,
      monitoring: renderMonitoring,
      negative: renderNegativeResponse,
      mediaMoves: renderMediaMoves,
      reports: renderReports,
      settings: renderSettings,
    };

    if (!navItems.some((item) => item.id === ui.view) || !renderers[ui.view]) {
      ui.view = "dashboard";
      renderNav();
    }

    renderers[ui.view]();
  }

  function setPage(title, eyebrow = "홍보팀 운영 콘솔") {
    document.querySelector("#page-title").textContent = title;
    document.querySelector("#eyebrow").textContent = eyebrow;
  }

  function renderDashboard() {
    setPage("한눈에 보기", "보도자료 성과·오늘 기사·외부 동향");
    const today = todayDate();
    const thisMonth = today.slice(0, 7);
    const todayArticles = state.articles.filter((item) => item.publishedAt && item.publishedAt.startsWith(today));
    const monthReleases = state.releases.filter((item) => (item.publishAt || item.createdAt || "").startsWith(thisMonth));
    const monthArticles = state.articles.filter((item) => (item.publishedAt || item.createdAt || "").startsWith(thisMonth));
    const targetReleases = monthReleases.length ? monthReleases : state.releases;
    const performance = releasePerformanceOverview(targetReleases, state.articles);
    const briefingDate = previousCalendarDate(today);
    const topArticles = dailyTopArticles(briefingDate);
    const chosunArticles = recentChosunArticles();
    const externalArticles = recentExternalArticles();
    const mediaTypeCounts = countBy(state.articles, "mediaType");
    const outletRows = outletTrendRows();
    const briefingDateLabel = formatKoreanDate(briefingDate);

    viewRoot.innerHTML = `
      <div class="view-grid">
        <section class="metrics-grid" aria-label="핵심 지표">
          ${metric("보도자료 배포율", `${performance.distributionRate}%`, `${performance.coveredReleases}/${performance.releaseCount}건 기사화`)}
          ${metric("매체 영향력", impactPercent(performance.avgImpact), "100% 기준 평균")}
          ${metric("조선대 관련 기사", state.articles.length, `오늘 ${todayArticles.length}건`)}
          ${metric("부정·긴급 기사", negativeArticles().length, `AI 조사 ${formatDateTime(state.meta.aiScanAt) || "대기"}`)}
        </section>

        <section class="content-grid">
          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>1. 보도자료 배포율 + 영향력</h2>
                <p>이번 달 기준, 데이터가 없으면 전체 기준</p>
              </div>
              <div class="toolbar-group">
                <button class="button primary" type="button" data-action="refresh-ai">새로고침</button>
                <button class="button" type="button" data-view-button="releases" data-action="go-view">전체 보기</button>
              </div>
            </div>
            <div class="panel-body">
              ${releasePerformancePanel(targetReleases)}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>3. 오늘의 뉴스 TOP5</h2>
                <p>${briefingDateLabel} 보도 기준 · 보도량 우선, 동률 시 매체 영향력 반영</p>
              </div>
              <button class="button" type="button" data-view-button="monitoring" data-action="go-view">기사 보기</button>
            </div>
            <div class="panel-body">
              ${topArticles.length ? `<div class="list">${topArticles.map(topArticleItem).join("")}</div>` : empty(`${briefingDateLabel}에 보도된 기사가 없습니다.`)}
            </div>
          </div>
        </section>

        <section class="split-grid">
          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>2. 조선대학교 관련 기사 모니터링</h2>
                <p>최근 등록·수집 기사</p>
              </div>
              <button class="button" type="button" data-view-button="monitoring" data-action="go-view">전체 보기</button>
            </div>
            <div class="panel-body">
              ${chosunArticles.length ? `<div class="list compact-list">${chosunArticles.map(articleMonitorItem).join("")}</div>` : empty("조선대학교 관련 기사가 없습니다.")}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>4. 타대학 + 교육부 간단 모니터링</h2>
                <p>교육정책과 경쟁 대학 이슈</p>
              </div>
            </div>
            <div class="panel-body">
              ${externalArticles.length ? `<div class="list compact-list">${externalArticles.map(externalMonitorItem).join("")}</div>` : empty("외부 모니터링 자료가 없습니다.")}
            </div>
          </div>
        </section>

        <section class="split-grid">
          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>우리 기사를 많이 써주는 언론유형</h2>
                <p>방송·중앙지·지방지·인터넷언론 기준</p>
              </div>
            </div>
            <div class="panel-body">
              ${barList(mediaTypeCounts, mediaTypes)}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>언론사별 추이</h2>
                <p>최근 14일 기사량 흐름</p>
              </div>
            </div>
            <div class="panel-body">
              ${outletRows.length ? `<div class="trend-list">${outletRows.map(outletTrendItem).join("")}</div>` : empty("추이를 계산할 기사가 없습니다.")}
            </div>
          </div>
        </section>

        <section class="split-grid">
          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>부정기사 대응 필요</h2>
                <p>부정·긴급 기사와 대응 전략</p>
              </div>
              <button class="button" type="button" data-view-button="negative" data-action="go-view">대응 보기</button>
            </div>
            <div class="panel-body">
              ${negativeArticles().length ? `<div class="list compact-list">${negativeArticles().slice(0, 3).map(negativeMiniItem).join("")}</div>` : empty("현재 부정 대응이 필요한 기사가 없습니다.")}
            </div>
          </div>

          <div class="panel">
            <div class="panel-header">
              <div>
                <h2>홍보팀 성과지표</h2>
                <p>대학브랜드 가치 향상 과제 기준</p>
              </div>
            </div>
            <div class="panel-body">
              ${prKpiPanel("summary")}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function renderReleases() {
    setPage("보도자료 성과", "보도자료 자동 수집 및 성과 관리");
    const status = filterValue("releaseStatus", "all");
    const category = filterValue("releaseCategory", "all");
    const dateFilter = dateFilterState("release");
    const releaseView = filterValue("releaseView", "report");
    const releaseSort = filterValue("releaseSort", "none");
    const filteredReleases = state.releases
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => matchesDateFilter(item.publishAt || item.createdAt, dateFilter))
      .filter((item) => matchesSearch(item, ui.search));
    const releases = sortReleaseItems(filteredReleases, releaseSort);
    const report = releaseReportData(releases);

    viewRoot.innerHTML = `
      <section class="panel report-control-panel">
        <div class="panel-header">
          <div>
            <h2>보도자료 성과</h2>
            <p>${dateFilterLabel(dateFilter)} · 필터 적용 ${releases.length}건</p>
          </div>
          <div class="toolbar-group">
            <button class="button primary" type="button" data-action="refresh-official-releases" title="조선대학교 보도자료 게시판에서 새 게시글을 수집합니다.">보도자료 새로고침</button>
            <button class="button" type="button" data-action="refresh-ai" title="언론 기사 RSS에서 새 기사를 수집하고 보도자료와 자동 매칭합니다.">기사 성과 연결</button>
            <button class="button" type="button" data-action="export-csv" data-export="releases">CSV 내보내기</button>
          </div>
        </div>
        <div class="panel-body">
          ${releaseScanNotice()}
          ${sectionTabs("releaseView", releaseView, [
            ["report", "성과 리포트"],
            ["list", "보도자료 목록"],
          ])}
          <div class="toolbar">
            <div class="toolbar-group">
              <select data-filter="releaseStatus" aria-label="상태 필터">
                ${option("all", "전체 상태", status)}
                ${Object.entries(releaseStatuses).map(([value, item]) => option(value, item.label, status)).join("")}
              </select>
              <select data-filter="releaseCategory" aria-label="분야 필터">
                ${option("all", "전체 분야", category)}
                ${categories.map((item) => option(item, item, category)).join("")}
              </select>
              ${dateFilterControls("release", dateFilter)}
            </div>
          </div>
          ${releaseView === "report" ? `
            <div class="report-summary release-summary">
              ${reportTile("보도자료", `${report.releaseCount}건`, `기사화 ${report.coveredReleases}건`)}
              ${reportTile("배포율", `${report.distributionRate}%`, "기사 연결 보도자료 기준")}
              ${reportTile("관련 기사", `${report.articleCount}건`, `${report.uniqueOutlets}개 언론사`)}
              ${reportTile("매체 영향력", impactPercent(report.avgImpact), "100% 기준 평균")}
            </div>
          ` : ""}
          <div class="${releaseView === "report" ? "subview-help" : "subview-help compact"}">
            ${releaseView === "report" ? "자동 수집된 보도자료별 기사화 정도와 영향력, 어떤 언론 유형에서 확산됐는지 먼저 확인합니다." : "보도자료 원문과 기사화 현황을 함께 확인합니다."}
          </div>
        </div>
      </section>

      ${releaseView === "report" ? `
        <section class="monitor-chart-grid section-gap" aria-label="보도자료 성과 도표">
          <div class="panel chart-panel">
            <div class="panel-header">
              <h2>성과 TOP5</h2>
            </div>
            <div class="panel-body">${releaseRankList(report.topReleases)}</div>
          </div>
          <div class="panel chart-panel">
            <div class="panel-header">
              <h2>매체유형별 확산</h2>
            </div>
            <div class="panel-body">${barList(report.mediaTypeCounts, mediaTypes)}</div>
          </div>
          <div class="panel chart-panel">
            <div class="panel-header">
              <h2>지면·온라인 반영</h2>
            </div>
            <div class="panel-body">${barList(report.channelCounts, publicationChannels)}</div>
          </div>
          <div class="panel chart-panel">
            <div class="panel-header">
              <h2>주관부서별 보도자료</h2>
            </div>
            <div class="panel-body">${barList(report.departmentCounts)}</div>
          </div>
          <div class="panel chart-panel chart-panel-wide">
            <div class="panel-header">
              <h2>최근 7일 배포 추이</h2>
            </div>
            <div class="panel-body">${timelineChart(report.dailyTrend)}</div>
          </div>
          <div class="panel chart-panel">
            <div class="panel-header">
              <h2>상위 보도 언론사</h2>
            </div>
            <div class="panel-body">${barList(report.outletCounts)}</div>
          </div>
        </section>
      ` : `
        <section class="panel section-gap compact-table-panel">
          <div class="panel-header">
            <div>
              <h2>보도자료 목록</h2>
              <p>제목·부서·배포일·기사화 현황을 관리합니다.</p>
            </div>
          </div>
          <div class="table-wrap">
            ${releases.length ? releaseTable(releases, releaseSort) : empty("조건에 맞는 보도자료가 없습니다.")}
          </div>
        </section>
      `}
    `;
  }

  function releaseTable(items, releaseSort = "none") {
    if (!items.length) return empty("보도자료가 없습니다.");
    return `
      <table>
        <thead>
          <tr>
            <th>제목</th>
            <th>언론사</th>
            <th>부서</th>
            <th aria-sort="${releaseSortAria("date", releaseSort)}">${releaseSortButton("date", "배포일", releaseSort)}</th>
            <th aria-sort="${releaseSortAria("volume", releaseSort)}">${releaseSortButton("volume", "보도량", releaseSort)}</th>
            <th aria-sort="${releaseSortAria("impact", releaseSort)}">${releaseSortButton("impact", "영향력", releaseSort)}</th>
            <th>지면/온라인</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(releaseRow).join("")}
        </tbody>
      </table>
    `;
  }

  function releaseSortButton(field, label, releaseSort) {
    const direction = releaseSort === `${field}-desc` ? "desc" : releaseSort === `${field}-asc` ? "asc" : "none";
    const icon = direction === "desc" ? "▼" : direction === "asc" ? "▲" : "↕";
    const currentLabel = direction === "desc" ? "내림차순" : direction === "asc" ? "오름차순" : "기본 배포일순";
    const nextLabel = direction === "desc" ? "오름차순" : direction === "asc" ? "기본 배포일순" : "내림차순";
    return `
      <button class="table-sort-button ${direction}" type="button" data-action="cycle-release-sort" data-sort-field="${escapeAttr(field)}" title="${escapeAttr(`${label} ${nextLabel}으로 정렬`)}" aria-label="${escapeAttr(`${label} 정렬, 현재 ${currentLabel}. 클릭하면 ${nextLabel}`)}">
        <span>${escapeHtml(label)}</span>
        <span class="table-sort-icon" aria-hidden="true">${icon}</span>
      </button>
    `;
  }

  function releaseSortAria(field, releaseSort) {
    if (releaseSort === `${field}-desc`) return "descending";
    if (releaseSort === `${field}-asc`) return "ascending";
    return "none";
  }

  function sortReleaseItems(items, releaseSort = "none") {
    const sorted = [...items];
    if (!/^(date|volume|impact)-(desc|asc)$/.test(releaseSort)) return sorted.sort(sortByReleaseDate);
    const [field, direction] = releaseSort.split("-");
    const multiplier = direction === "desc" ? -1 : 1;
    return sorted.sort((left, right) => {
      if (field === "date") {
        const difference = String(left.publishAt || left.createdAt || "").localeCompare(String(right.publishAt || right.createdAt || "")) * multiplier;
        return difference || String(right.sourceId || right.id || "").localeCompare(String(left.sourceId || left.id || ""));
      }
      const leftStats = releaseArticleStats(left);
      const rightStats = releaseArticleStats(right);
      const leftValue = field === "volume" ? leftStats.articleCount : leftStats.avgImpact;
      const rightValue = field === "volume" ? rightStats.articleCount : rightStats.avgImpact;
      const difference = (leftValue - rightValue) * multiplier;
      return difference || sortByReleaseDate(left, right);
    });
  }

  function releaseRow(item) {
    const stats = releaseArticleStats(item);
    const title = item.sourceUrl
      ? `<a href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title);
    return `
      <tr>
        <td class="title-cell">
          <strong>${title}</strong>
          <span>${escapeHtml(item.subtitle || item.summary || "")}</span>
          <div class="tag-list">${(item.tags || []).slice(0, 4).map((tag) => chip(tag, "neutral")).join("")}</div>
        </td>
        <td>${releaseCoverageCell(item, stats)}</td>
        <td>${escapeHtml(item.department || "-")}</td>
        <td>${formatDate(item.publishAt) || "-"}</td>
        <td>
          <div class="stack">
            <strong>${stats.articleCount}건</strong>
            <span>${stats.uniqueOutlets}개 언론사 · 보도율 ${stats.coverageRate}%</span>
          </div>
        </td>
        <td>
          <div class="stack">
            <strong>${impactPercent(stats.avgImpact)}</strong>
            <span>100% 기준</span>
          </div>
        </td>
        <td>
          <div class="tag-list">
            ${channelSummaryChips(stats.channelCounts)}
          </div>
        </td>
      </tr>
    `;
  }

  function releaseCoverageCell(release, stats) {
    if (!stats.articleCount) return `<span class="muted">보도 기사 없음</span>`;
    const topOutlets = uniqueOutletEntries(stats.articles).slice(0, 2).map((item) => item.outlet).join(", ");
    return `
      <div class="coverage-cell">
        <strong>${stats.articleCount}건 · ${stats.uniqueOutlets}개 언론사</strong>
        <span>${escapeHtml(topOutlets)}${stats.uniqueOutlets > 2 ? ` 외 ${stats.uniqueOutlets - 2}개` : ""}</span>
        ${releaseCoverageAction(release, stats)}
      </div>
    `;
  }

  function releaseCoverageAction(release, stats, label = "상세보기") {
    if (!stats?.articleCount) return `<span class="muted">보도 기사 없음</span>`;
    return `<button class="mini-button" type="button" data-action="open-release-coverage" data-id="${escapeAttr(release.id)}">${escapeHtml(label)}</button>`;
  }

  function releaseScanNotice() {
    const status = state.meta.homepageScanStatus || "waiting";
    const message = state.meta.homepageScanMessage || "조선대학교 조선대뉴스 게시글을 확인합니다.";
    const tone = status === "blocked" ? "danger" : status === "success" ? "success" : status === "checking" ? "info" : "neutral";
    return `
      <div class="scan-notice ${tone}">
        <strong>보도자료 수집 상태</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function renderMonitoring() {
    setPage("언론 모니터링", "언론 기사 수집·영향력 산정 및 현황 관리");
    const sentiment = filterValue("articleSentiment", "all");
    const risk = filterValue("articleRisk", "all");
    const mediaType = filterValue("articleMediaType", "all");
    const channel = filterValue("articleChannel", "all");
    const dateFilter = dateFilterState("monitoring");
    let monitoringView = filterValue("monitoringView", "report");
    if (!["report", "list", "affiliated", "external"].includes(monitoringView)) {
      monitoringView = "report";
      ui.filters.monitoringView = "report";
    }
    const articles = state.articles
      .filter((item) => sentiment === "all" || item.sentiment === sentiment)
      .filter((item) => risk === "all" || item.risk === risk)
      .filter((item) => mediaType === "all" || item.mediaType === mediaType)
      .filter((item) => channel === "all" || articleChannelValues(item).includes(channel))
      .filter((item) => matchesDateFilter(item.publishedAt || item.createdAt, dateFilter))
      .filter((item) => matchesSearch(item, ui.search))
      .sort(sortByPublished);
    const affiliatedItems = (state.affiliatedArticles || [])
      .filter((item) => sentiment === "all" || item.sentiment === sentiment)
      .filter((item) => risk === "all" || item.risk === risk)
      .filter((item) => mediaType === "all" || item.mediaType === mediaType)
      .filter((item) => channel === "all" || articleChannelValues(item).includes(channel))
      .filter((item) => matchesDateFilter(item.publishedAt || item.createdAt, dateFilter))
      .filter((item) => matchesSearch(item, ui.search))
      .sort(sortByPublished);
    const externalItems = (state.externalArticles || [])
      .map(normalizeExternalArticle)
      .filter((item) => matchesDateFilter(item.publishedAt || item.createdAt, dateFilter))
      .filter((item) => matchesSearch(item, ui.search))
      .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
    const report = monitoringReportData(articles);
    const visibleCount = monitoringView === "external" ? externalItems.length : monitoringView === "affiliated" ? affiliatedItems.length : articles.length;
    const exportType = monitoringView === "affiliated" ? "affiliated" : "articles";

    viewRoot.innerHTML = `
      <section class="panel report-control-panel">
        <div class="panel-header">
          <div>
            <h2>기사 모니터링 리포트</h2>
            <p>${dateFilterLabel(dateFilter)} · 필터 적용 ${visibleCount}건</p>
          </div>
          <div class="toolbar-group">
            <button class="button primary" type="button" data-action="refresh-ai">새로고침</button>
            <button class="button" type="button" data-action="export-csv" data-export="${exportType}">CSV 내보내기</button>
          </div>
        </div>
        <div class="panel-body">
          ${articleScanNotice()}
          ${sectionTabs("monitoringView", monitoringView, [
            ["report", "모니터링 리포트"],
            ["list", "기사 목록"],
            ["affiliated", "산하 법인"],
            ["external", "타대학·교육부"],
          ])}
          ${["report", "list", "affiliated"].includes(monitoringView) ? `
          <div class="toolbar">
            <div class="toolbar-group">
              <select data-filter="articleSentiment" aria-label="감성 필터">
                ${option("all", "전체 감성", sentiment)}
                ${Object.entries(sentiments).map(([value, item]) => option(value, item.label, sentiment)).join("")}
              </select>
              <select data-filter="articleRisk" aria-label="위험도 필터">
                ${option("all", "전체 위험도", risk)}
                ${Object.entries(risks).map(([value, item]) => option(value, item.label, risk)).join("")}
              </select>
              <select data-filter="articleMediaType" aria-label="매체유형 필터">
                ${option("all", "전체 매체유형", mediaType)}
                ${Object.entries(mediaTypes).map(([value, item]) => option(value, item.label, mediaType)).join("")}
              </select>
              <select data-filter="articleChannel" aria-label="판형 필터">
                ${option("all", "전체 판형", channel)}
                ${publicationChannelEntries().map(([value, item]) => option(value, item.label, channel)).join("")}
              </select>
              ${dateFilterControls("monitoring", dateFilter)}
            </div>
          </div>
          ` : `
          <div class="toolbar">
            <div class="toolbar-group">
              ${dateFilterControls("monitoring", dateFilter)}
            </div>
          </div>
          `}
          ${monitoringView === "report" ? `
            <div class="report-summary monitor-summary">
            ${reportTile("기사 수", `${report.articleCount}건`, `오늘 ${report.todayCount}건`)}
            ${reportTile("매체 영향력", impactPercent(report.avgImpact), "100% 기준 평균")}
            ${reportTile("평균 매칭률", `${report.avgMatch}%`, "보도자료 연결 정확도")}
            ${reportTile("부정·긴급", `${report.negativeCount + report.highRiskCount}건`, `부정 ${report.negativeCount} · 긴급 ${report.highRiskCount}`)}
            ${reportTile("최다 보도 언론사", report.topOutlet || "-", report.topOutletCount ? `${report.topOutletCount}건 게재` : "집계 없음")}
            </div>
          ` : ""}
          <div class="${monitoringView === "report" ? "subview-help" : "subview-help compact"}">
            ${monitoringView === "report"
              ? "기사 수집 결과를 도표로 먼저 보고, 필요한 경우 목록에서 개별 기사를 확인합니다."
              : monitoringView === "list"
                ? "같은 내용의 기사를 묶어 보도량, 보도 언론사, 영향력 흐름을 확인합니다."
                : monitoringView === "affiliated"
                  ? "조선대학교병원 등 산하 법인 소식을 대학 본체 기사와 분리해 확인합니다."
                  : "타대학과 교육부 정책 이슈를 간단히 모아 봅니다."}
          </div>
        </div>
      </section>

      ${monitoringView === "report" ? `
      <section class="monitor-chart-grid section-gap" aria-label="기사 모니터링 도표">
        <div class="panel chart-panel">
          <div class="panel-header">
            <h2>매체유형 분포</h2>
          </div>
          <div class="panel-body">${barList(report.mediaTypeCounts, mediaTypes)}</div>
        </div>
        <div class="panel chart-panel">
          <div class="panel-header">
            <h2>언론사 TOP</h2>
          </div>
          <div class="panel-body">${barList(report.outletCounts)}</div>
        </div>
        <div class="panel chart-panel">
          <div class="panel-header">
            <h2>지면·온라인 분포</h2>
          </div>
          <div class="panel-body">${barList(report.channelCounts, publicationChannels)}</div>
        </div>
        <div class="panel chart-panel">
          <div class="panel-header">
            <h2>보도량 TOP5</h2>
          </div>
          <div class="panel-body">${articleRankList(report.topArticles)}</div>
        </div>
        <div class="panel chart-panel chart-panel-wide">
          <div class="panel-header">
            <h2>최근 7일 기사량</h2>
          </div>
          <div class="panel-body">${timelineChart(report.dailyTrend)}</div>
        </div>
        <div class="panel chart-panel">
          <div class="panel-header">
            <h2>감성·위험 신호</h2>
          </div>
          <div class="panel-body">
            ${barList(report.sentimentCounts, sentiments)}
            <div class="chart-divider"></div>
            ${barList(report.riskCounts, risks)}
          </div>
        </div>
      </section>
      ` : monitoringView === "affiliated" ? `
      <section class="panel section-gap compact-table-panel">
        <div class="panel-header">
          <div>
            <h2>조선대 산하 법인 관련 기사</h2>
            <p>조선대학교병원 등 산하 법인 기사만 별도로 관리합니다.</p>
          </div>
        </div>
        <div class="panel-body">
          ${affiliatedItems.length ? articleGroupList(affiliatedItems, "affiliated") : empty("조건에 맞는 산하 법인 기사가 없습니다.")}
        </div>
      </section>
      ` : monitoringView === "external" ? `
      <section class="panel section-gap">
        <div class="panel-header">
          <div>
            <h2>타대학·교육부 간단 모니터링</h2>
            <p>교육정책과 경쟁 대학 이슈를 별도로 확인합니다.</p>
          </div>
        </div>
        <div class="panel-body">
          ${externalItems.length ? `<div class="list">${externalItems.map(externalMonitorItem).join("")}</div>` : empty("외부 모니터링 자료가 없습니다.")}
        </div>
      </section>
      ` : `

      <section class="panel section-gap compact-table-panel">
        <div class="panel-header">
          <div>
            <h2>기사 목록</h2>
            <p>같은 보도내용으로 나온 기사량과 보도 언론사를 먼저 확인합니다.</p>
          </div>
        </div>
        <div class="panel-body">
          ${articles.length ? articleGroupList(articles, "articles") : empty("조건에 맞는 기사가 없습니다.")}
        </div>
      </section>
      `}
    `;
  }

  function articleScanNotice() {
    const message = state.meta.articleScanMessage || `${ARTICLE_COLLECTION_START_DATE} 이후 기사부터 모니터링합니다.`;
    const status = state.meta.articleScanStatus || "waiting";
    const tone = status === "blocked" ? "danger" : status === "success" ? "success" : status === "checking" ? "info" : "neutral";
    return `
      <div class="scan-notice ${tone}">
        <strong>기사 수집 상태</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function articleGroupList(items, scope = "articles") {
    const groups = topArticleGroups(items, 0)
      .sort((a, b) => articleDateTimestamp(b.firstAt) - articleDateTimestamp(a.firstAt) || articleDateTimestamp(b.latestAt) - articleDateTimestamp(a.latestAt));
    if (!groups.length) return empty("묶을 기사가 없습니다.");
    return `
      <div class="article-group-list">
        ${groups.map((group) => articleGroupCard(group, scope)).join("")}
      </div>
    `;
  }

  function articleGroupCard(group, scope = "articles") {
    const article = group.topArticle || group.articles[0] || {};
    const negativeCount = group.articles.filter((item) => item.sentiment === "negative").length;
    const highRiskCount = group.articles.filter((item) => item.risk === "high").length;
    const first = formatDateTime(group.firstAt) || "-";
    const latest = formatDateTime(group.latestAt) || "-";
    return `
      <article class="article-group-card">
        <div class="article-group-head">
          <div>
            <h3>${escapeHtml(group.title)}</h3>
            <p>${escapeHtml(articleAttentionReason(article))}</p>
          </div>
          <div class="article-group-actions">
            ${chip(`${group.articleCount}건`, "teal")}
            ${chip(`${group.outletCount}개 언론사`, "info")}
            <button class="mini-button" type="button" data-action="open-article-group" data-id="${escapeAttr(group.key)}" data-scope="${escapeAttr(scope)}">기사 전체 보기</button>
          </div>
        </div>
        <div class="article-group-metrics">
          <div><span>보도량</span><strong>${group.articleCount}건</strong></div>
          <div><span>언론사</span><strong>${group.outletCount}개</strong></div>
          <div><span>매체 영향력</span><strong>${impactPercent(group.avgImpact)}</strong></div>
          <div><span>최초 보도</span><strong>${escapeHtml(first)}</strong></div>
          <div><span>최신 보도</span><strong>${escapeHtml(latest)}</strong></div>
        </div>
        <div class="article-group-foot">
          <div>
            <span class="muted">대표 기사</span>
            <strong>${article.url ? `<a href="${escapeAttr(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title || group.title)}</a>` : escapeHtml(article.title || group.title)}</strong>
            <span>${escapeHtml(article.outlet || "-")} · ${formatDateTime(article.publishedAt) || "-"}</span>
            <div class="tag-list">${statusChip(mediaTypes, article.mediaType || "other")} ${articleChannelChips(article)}</div>
          </div>
          <div class="tag-list">
            ${negativeCount ? chip(`부정 ${negativeCount}`, "danger") : chip("부정 없음", "success")}
            ${highRiskCount ? chip(`긴급 ${highRiskCount}`, "danger") : chip("긴급 없음", "neutral")}
          </div>
        </div>
        ${outletLinkList(group.articles, 6)}
      </article>
    `;
  }

  function articleTable(items) {
    return `
      <table>
        <thead>
          <tr>
            <th>기사</th>
            <th>매체</th>
            <th>유형</th>
            <th>판형</th>
            <th>영향력</th>
            <th>주목 배경</th>
            <th>보도자료</th>
            <th>매칭</th>
            <th class="actions-cell">대응</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => {
              const release = state.releases.find((releaseItem) => releaseItem.id === item.releaseId);
              return `
                <tr>
                  <td class="title-cell">
                    <strong>${item.url ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.excerpt || "")}</span>
                    <div class="tag-list">${(item.keywords || []).slice(0, 5).map((tag) => chip(tag, "neutral")).join("")}</div>
                  </td>
                  <td>
                    <div class="stack">
                      <strong>${escapeHtml(item.outlet || "-")}</strong>
                      <span>${escapeHtml(item.reporter || "")} · ${formatDateTime(item.publishedAt) || "-"}</span>
                    </div>
                  </td>
                  <td>${statusChip(mediaTypes, item.mediaType || "other")}</td>
                  <td>${articleChannelChips(item)}</td>
                  <td>
                    <div class="stack">
                      <strong>${impactPercent(articleImpactScore(item))}</strong>
                      <span>${statusChip(sentiments, item.sentiment)} ${statusChip(risks, item.risk)}</span>
                    </div>
                  </td>
                  <td>${escapeHtml(articleAttentionReason(item))}</td>
                  <td>${release ? escapeHtml(release.title) : "-"}</td>
                  <td>
                    <div class="stack">
                      <strong>${Math.round(Number(item.matchScore || 0))}%</strong>
                      <span>${articleStatusLabel(item.status)}</span>
                    </div>
                  </td>
                  <td class="actions-cell">
                    <div class="action-row">
                      ${item.sentiment === "negative" || item.risk === "high" ? `<button class="mini-button danger" type="button" data-view-button="negative" data-action="go-view">대응</button>` : `<span class="muted">AI 조사</span>`}
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function openReleaseCoverageTab(id) {
    const release = state.releases.find((item) => item.id === id);
    if (!release) return toast("보도자료를 찾지 못했습니다.");
    const stats = releaseArticleStats(release);
    if (!stats.articleCount) return toast("연결된 보도 기사가 없습니다.");
    openModal(
      "보도자료 기사화 상세",
      releaseCoverageReportBody(release, stats),
      `
        <button class="button" type="button" data-action="export-release-coverage-csv" data-id="${escapeAttr(release.id)}">CSV</button>
        <button class="button" type="button" data-action="print-release-coverage" data-id="${escapeAttr(release.id)}">인쇄</button>
        <button class="button primary" type="button" data-action="close-modal">닫기</button>
      `,
      { className: "detail-report-modal" }
    );
  }

  function openArticleGroupTab(key, scope = "articles") {
    const source = scope === "affiliated" ? state.affiliatedArticles || [] : state.articles;
    const group = topArticleGroups(source, 0).find((item) => item.key === key);
    if (!group) return toast("기사 묶음을 찾지 못했습니다.");
    openModal(
      "기사 전체 보기",
      articleGroupDetailBody(group),
      `<button class="button primary" type="button" data-action="close-modal">닫기</button>`,
      { className: "detail-report-modal" }
    );
  }

  function articleGroupDetailBody(group) {
    return `
      <div class="detail-report">
        <div class="detail-report-head">
          <p class="eyebrow">기사 모니터링</p>
          <h3>${escapeHtml(group.title)}</h3>
          <p>보도량 ${group.articleCount}건 · ${group.outletCount}개 언론사 · 매체 영향력 ${impactPercent(group.avgImpact)} · 최초 ${escapeHtml(formatDateTime(group.firstAt) || "-")} · 최신 ${escapeHtml(formatDateTime(group.latestAt) || "-")}</p>
        </div>
        <div class="detail-report-metrics">
          ${reportTile("보도량", `${group.articleCount}건`, "같은 내용 기사 묶음")}
          ${reportTile("언론사", `${group.outletCount}개`, "언론사 기준")}
          ${reportTile("매체 영향력", impactPercent(group.avgImpact), "100% 기준 평균")}
          ${reportTile("최초 보도", formatDateTime(group.firstAt) || "-", "수집 기사 기준")}
          ${reportTile("최신 보도", formatDateTime(group.latestAt) || "-", "수집 기사 기준")}
        </div>
        <div class="table-wrap detail-report-table">
          ${reportArticleRows(group.articles)}
        </div>
      </div>
    `;
  }

  function reportArticleRows(articles) {
    const rows = dedupeArticles(articles).sort((a, b) => articleImpactScore(b) - articleImpactScore(a) || String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
    return `
      <table>
        <thead>
          <tr>
            <th>언론사</th>
            <th>기사 제목</th>
            <th>매체유형</th>
            <th>판형</th>
            <th>보도일</th>
            <th>영향력</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((article) => {
              const mediaType = normalizeMediaType(article.mediaType, article.outlet);
              const channel = normalizeChannel(article.channel, article.url, mediaType);
              return `
                <tr>
                  <td>${article.url ? `<a href="${escapeAttr(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.outlet || "-")}</a>` : escapeHtml(article.outlet || "-")}</td>
                  <td>
                    <strong>${article.url ? `<a href="${escapeAttr(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title || "-")}</a>` : escapeHtml(article.title || "-")}</strong>
                    <span>${escapeHtml(article.excerpt || articleAttentionReason(article))}</span>
                  </td>
                  <td>${escapeHtml(mediaTypes[mediaType]?.label || mediaType)}</td>
                  <td>${escapeHtml(articleChannelLabels(article))}</td>
                  <td>${escapeHtml(formatDateTime(article.publishedAt) || "-")}</td>
                  <td>${impactPercent(articleImpactScore(article))}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  }

  function releaseCoverageReportBody(release, stats) {
    return `
      <div class="detail-report">
        <div class="detail-report-head">
          <p class="eyebrow">보도자료 성과</p>
          <h3>${escapeHtml(release.title)}</h3>
          <p>${escapeHtml(formatDate(release.publishAt) || "-")} · ${escapeHtml(release.department || "-")} · ${stats.articleCount}건 · ${stats.uniqueOutlets}개 언론사 · 매체 영향력 ${impactPercent(stats.avgImpact)}</p>
        </div>
        <div class="detail-report-metrics">
          ${reportTile("보도 기사", `${stats.articleCount}건`, "언론사 기준 중복 정리")}
          ${reportTile("언론사", `${stats.uniqueOutlets}개`, "같은 언론사는 1건 집계")}
          ${reportTile("보도율", `${stats.coverageRate}%`, "예상 배포처 대비")}
          ${reportTile("매체 영향력", impactPercent(stats.avgImpact), "100% 기준 평균")}
        </div>
        <div class="table-wrap detail-report-table">
          ${reportArticleRows(stats.articles)}
        </div>
      </div>
    `;
  }

  function detailReportDocument({ title, eyebrow, heading, summary, body }) {
    return `<!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { margin: 0; background: #f4f7fb; color: #111827; font-family: "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif; }
            main { max-width: 1120px; margin: 0 auto; padding: 34px 28px 48px; }
            header { margin-bottom: 18px; }
            .eyebrow { margin: 0 0 8px; color: #0054a7; font-size: 12px; font-weight: 900; }
            h1 { margin: 0; color: #08284d; font-size: 25px; line-height: 1.35; }
            .summary { margin: 10px 0 0; color: #52657c; font-size: 14px; }
            .panel { overflow: hidden; border: 1px solid #dbe5f0; border-radius: 12px; background: #fff; box-shadow: 0 18px 42px rgba(6, 26, 54, 0.1); }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #e5edf6; padding: 12px 14px; text-align: left; vertical-align: top; font-size: 13px; }
            th { background: #f7fafd; color: #33465c; font-size: 12px; font-weight: 900; white-space: nowrap; }
            td strong { display: block; margin-bottom: 4px; color: #111827; line-height: 1.45; }
            td span { display: block; color: #66758a; line-height: 1.5; }
            a { color: #004f9f; text-decoration: none; font-weight: 800; }
            a:hover { text-decoration: underline; }
            @media (max-width: 760px) { main { padding: 20px 14px 32px; } .panel { overflow-x: auto; } table { min-width: 820px; } h1 { font-size: 21px; } }
          </style>
        </head>
        <body>
          <main>
            <header>
              <p class="eyebrow">${escapeHtml(eyebrow)}</p>
              <h1>${escapeHtml(heading)}</h1>
              <p class="summary">${escapeHtml(summary)}</p>
            </header>
            <section class="panel">${body}</section>
          </main>
        </body>
      </html>`;
  }

  function openHtmlReport(title, html) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank");
    if (!popup) {
      URL.revokeObjectURL(url);
      toast("새탭이 차단되었습니다. 브라우저 팝업 허용을 확인하세요.");
      return;
    }
    try {
      popup.document.title = title;
    } catch (error) {
      console.debug("새탭 제목 설정을 건너뜁니다.", error);
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function renderIssues() {
    setPage("이슈 대응", "상황실·입장문·Q&A");
    const issueSearch = ui.search;
    const columns = Object.keys(issueStatuses);
    const filtered = state.issues.filter((item) => matchesSearch(item, issueSearch));

    viewRoot.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="button primary" type="button" data-action="new-issue">이슈 생성</button>
          <button class="button" type="button" data-action="export-csv" data-export="issues">CSV 내보내기</button>
        </div>
      </div>
      <section class="issue-board" aria-label="이슈 대응 현황">
        ${columns
          .map((status) => {
            const items = filtered.filter((item) => item.status === status).sort(sortByUpdated);
            return `
              <div class="issue-column">
                <h3>${issueStatuses[status].label} <span class="muted">${items.length}건</span></h3>
                ${items.length ? items.map(issueCard).join("") : empty("이슈가 없습니다.")}
              </div>
            `;
          })
          .join("")}
      </section>
    `;
  }

  function issueCard(item) {
    const next = issueNext[item.status];
    return `
      <article class="issue-card">
        ${statusChip(risks, item.severity)}
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.officialPosition || item.memo || "")}</p>
        <p><strong>담당</strong> ${escapeHtml(item.owner || "-")} · ${formatDate(item.createdAt) || "-"}</p>
        <div class="action-row">
          <button class="mini-button" type="button" data-action="edit-issue" data-id="${item.id}">수정</button>
          ${next ? `<button class="mini-button" type="button" data-action="advance-issue" data-id="${item.id}">${issueStatuses[next].label}</button>` : ""}
          <button class="mini-button danger" type="button" data-action="delete-issue" data-id="${item.id}">삭제</button>
        </div>
      </article>
    `;
  }

  function renderNegativeResponse() {
    setPage("부정기사 대응", "위험 기사·원인 분석·대응 전략");
    const dateFilter = dateFilterState("negative");
    const baseItems = negativeArticles()
      .filter((item) => matchesDateFilter(item.publishedAt || item.createdAt, dateFilter))
      .filter((item) => matchesSearch(item, ui.search));
    const keywordNodes = negativeKeywordStats(baseItems);
    let activeKeyword = filterValue("negativeKeyword", "all");
    if (activeKeyword !== "all" && !keywordNodes.some((item) => item.id === activeKeyword)) {
      activeKeyword = "all";
      ui.filters.negativeKeyword = "all";
    }
    const items = activeKeyword === "all" ? baseItems : baseItems.filter((item) => articleMatchesNegativeKeyword(item, activeKeyword));
    const highRisk = items.filter((item) => item.risk === "high").length;
    const avgImpact = items.length ? Math.round(items.reduce((sum, item) => sum + articleImpactScore(item), 0) / items.length) : 0;
    const activeLabel = activeKeyword === "all" ? "전체" : keywordNodes.find((item) => item.id === activeKeyword)?.label || "전체";

    viewRoot.innerHTML = `
      <section class="panel report-control-panel">
        <div class="panel-header">
          <div>
            <h2>부정기사 대응 리포트</h2>
            <p>${dateFilterLabel(dateFilter)} · AI 조사 결과</p>
          </div>
          <div class="toolbar-group">
            <button class="button primary" type="button" data-action="refresh-ai">새로고침</button>
            <button class="button" type="button" data-action="export-csv" data-export="articles">CSV 내보내기</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="report-summary release-summary">
            ${reportTile("대응 필요", `${items.length}건`, "부정·긴급 기사")}
            ${reportTile("긴급", `${highRisk}건`, "즉시 확인 대상")}
            ${reportTile("평균 영향력", avgImpact, "매체·판형 가중")}
            ${reportTile("최근 조사", formatDateTime(state.meta.aiScanAt) || "-", "새로고침 기준")}
          </div>
          <div class="toolbar">
            <div class="toolbar-group">
              ${dateFilterControls("negative", dateFilter)}
            </div>
          </div>
          <div class="subview-help">부정 기사마다 사회적 맥락과 확산 배경을 한 줄로 요약하고, 홍보팀 대응 메시지와 실행 순서를 제안합니다.</div>
        </div>
      </section>

      <section class="panel section-gap negative-keyword-panel">
        <div class="panel-header">
          <div>
            <h2>부정 이슈 키워드 맵</h2>
            <p>${escapeHtml(activeLabel)} 기준 · ${items.length}건 표시</p>
          </div>
        </div>
        <div class="panel-body">
          ${negativeKeywordMap(keywordNodes, activeKeyword, baseItems.length)}
        </div>
      </section>

      <section class="negative-case-list section-gap">
        ${items.length ? items.map(negativeResponseCard).join("") : empty("현재 부정 대응이 필요한 기사가 없습니다.")}
      </section>
    `;
  }

  function negativeResponseCard(article) {
    const strategy = responseStrategy(article);
    const release = state.releases.find((item) => item.id === article.releaseId);
    const isUrgent = article.risk === "high";
    const title = article.url ? `<a href="${escapeAttr(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a>` : escapeHtml(article.title);
    return `
      <article class="negative-case ${isUrgent ? "urgent" : ""}">
        <div class="negative-case-head">
          <div class="negative-priority">
            <span>${isUrgent ? "긴급" : "주의"}</span>
            <strong>${impactPercent(articleImpactScore(article))}</strong>
            <em>매체 영향력</em>
          </div>
          <div class="negative-title-block">
            <div class="negative-meta-row">
              ${statusChip(sentiments, article.sentiment || "negative")}
              ${statusChip(risks, article.risk || "medium")}
              <span>${escapeHtml(article.outlet || "-")}</span>
              <span>${formatDateTime(article.publishedAt) || "-"}</span>
            </div>
            <h2>${title}</h2>
          </div>
        </div>

        <div class="negative-case-grid">
          <section class="negative-brief">
            <span class="negative-section-label">기사 내용 요약</span>
            <p>${escapeHtml(articleSummary(article))}</p>
            <div class="negative-criticism">
              <strong>비판 요지</strong>
              <p>${escapeHtml(articleCriticismPoint(article))}</p>
            </div>
          </section>

          <aside class="negative-context">
            <div>
              <span>인지 사유</span>
              <p>${escapeHtml(articleAwarenessReason(article))}</p>
            </div>
            <div>
              <span>주목 배경</span>
              <p>${escapeHtml(articleAttentionReason(article))}</p>
            </div>
            <div>
              <span>연결 자료</span>
              <p>${release ? escapeHtml(release.title) : "직접 이슈"}</p>
            </div>
          </aside>
        </div>

        <div class="negative-action-plan">
          <div class="negative-action-title">
            <span>대응 기조</span>
            <strong>${escapeHtml(strategy.tone)}</strong>
          </div>
          <ol class="negative-steps">
            <li><span>1</span><p>${escapeHtml(strategy.first)}</p></li>
            <li><span>2</span><p>${escapeHtml(strategy.message)}</p></li>
            <li><span>3</span><p>${escapeHtml(strategy.channel)}</p></li>
          </ol>
        </div>
      </article>
    `;
  }

  function negativeKeywordStats(items) {
    const map = new Map();
    items.forEach((article) => {
      const issue = negativeArticleIssueKeyword(article);
      if (!issue) return;
      const id = stableKey(issue.label);
      if (!id) return;
      const entry = map.get(id) || { id, label: issue.label, count: 0, highRisk: 0, negative: 0, impact: 0, priority: 0 };
      entry.count += 1;
      entry.highRisk += article.risk === "high" ? 1 : 0;
      entry.negative += article.sentiment === "negative" ? 1 : 0;
      entry.impact += articleImpactScore(article);
      entry.priority += issue.weight * articleImpactScore(article);
      map.set(id, entry);
    });
    return [...map.values()]
      .filter((item) => item.count > 0)
      .sort((a, b) => b.impact - a.impact || b.highRisk - a.highRisk || b.count - a.count || a.label.localeCompare(b.label, "ko"))
      .slice(0, 10);
  }

  function negativeArticleIssueKeyword(article) {
    const text = flatten(article);
    const frames = [
      { label: "등록금 정보 공개", pattern: /등록금|장학|장학금|학비|납부|환불|정보 공개/, weight: 1.5 },
      { label: "학사 민원 안내", pattern: /학사|수업|성적|졸업|휴학|복학|민원|안내/, weight: 1.45 },
      { label: "온라인 경험담 확산", pattern: /온라인|커뮤니티|SNS|댓글|경험담|갑론을박|확산/, weight: 1.42 },
      { label: "행정 절차 설명", pattern: /행정|절차|공개|설명|투명|신뢰|부실|책임/, weight: 1.36 },
      { label: "학생 안전 조치", pattern: /안전|사고|폭력|피해|보호|위험|긴급/, weight: 1.34 },
      { label: "입시 공정성", pattern: /입시|수시|정시|전형|공정|합격|모집/, weight: 1.28 },
      { label: "지역 여론 확산", pattern: /지역|광주|전남|시민|학부모|여론/, weight: 1.16 },
      { label: "대학 평판 논란", pattern: /평판|이미지|브랜드|논란|비판|사립대/, weight: 1.12 },
    ];
    const matched = frames
      .filter((frame) => frame.pattern.test(text))
      .sort((a, b) => b.weight - a.weight);
    if (matched.length) return matched[0];
    const fallback = extractKeywords(`${article.title || ""} ${article.excerpt || ""} ${article.memo || ""}`, 3)
      .filter((word) => isNegativeIssueKeyword(word));
    return fallback[0] ? { label: fallback[0], weight: 1 } : null;
  }

  function isNegativeIssueKeyword(word) {
    const value = normalizeWhitespace(word);
    if (!value || value.length < 2 || value.length > 12) return false;
    if (/^(조선대|조선대학교|기사|보도|관련|지역|대학|언론|온라인|주의|긴급|내용|중심|확산|가능성|확인|필요)$/.test(value)) return false;
    return /민원|논란|비판|등록금|장학|학사|안전|사고|공정|행정|신뢰|평판|여론|공개|부실/.test(value);
  }

  function articleMatchesNegativeKeyword(article, keywordId) {
    const issue = negativeArticleIssueKeyword(article);
    return issue ? stableKey(issue.label) === keywordId : false;
  }

  function negativeKeywordMap(nodes, activeKeyword, totalCount) {
    if (!nodes.length) return empty("영향력 있는 이슈 키워드가 아직 없습니다.");
    const maxCount = Math.max(...nodes.map((item) => item.count), 1);
    return `
      <div class="negative-keyword-map" aria-label="부정 이슈 키워드 맵">
        <button class="negative-keyword-core ${activeKeyword === "all" ? "active" : ""}" type="button" data-action="set-negative-keyword" data-id="all">
          <span>전체 이슈</span>
          <strong>${totalCount}건</strong>
          <em>대표 키워드 기준</em>
        </button>
        <div class="negative-keyword-nodes">
          ${nodes
            .map((item) => {
              const size = item.count >= maxCount ? "large" : item.count >= Math.max(2, Math.ceil(maxCount * 0.6)) ? "medium" : "small";
              const urgent = item.highRisk > 0 ? "urgent" : "";
              return `
                <button class="negative-keyword-node ${size} ${urgent} ${activeKeyword === item.id ? "active" : ""}" type="button" data-action="set-negative-keyword" data-id="${escapeAttr(item.id)}">
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${item.count}건</strong>
                  <em>${item.highRisk ? `긴급 ${item.highRisk}건` : "대표 이슈"}</em>
                </button>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderMediaMoves() {
    setPage("광주·전남 언론사 동정", "인사·부고·취재 변화 실시간 확인");
    const moveType = filterValue("mediaMoveType", "all");
    const dateFilter = dateFilterState("mediaMoves");
    const movesChecking = state.meta.mediaMovesStatus === "checking";
    const allItems = [...(state.mediaMoves || [])]
      .map(normalizeMediaMove)
      .filter((item) => matchesDateFilter(item.publishedAt || item.createdAt, dateFilter))
      .filter((item) => matchesSearch(item, ui.search))
      .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
    const items = moveType === "all" ? allItems : allItems.filter((item) => item.type === moveType);
    const typeCounts = countBy(allItems, "type");

    viewRoot.innerHTML = `
      <section class="panel report-control-panel">
        <div class="panel-header">
          <div>
            <h2>광주·전남 언론사 동정</h2>
            <p>${dateFilterLabel(dateFilter)} · ${movesChecking ? "인사·부고 확인 중" : `최근 조사 ${formatDateTime(state.meta.mediaMovesAt) || "-"}`}</p>
          </div>
          <button class="button primary" type="button" data-action="refresh-moves" ${movesChecking ? "disabled" : ""}>${movesChecking ? "확인 중" : "동정 새로고침"}</button>
        </div>
        <div class="panel-body">
          <div class="report-summary release-summary">
            ${reportTile("동정 수", `${allItems.length}건`, "인사·부고·취재 변화")}
            ${reportTile("인사", `${typeCounts["인사"] || 0}건`, "담당 변경 확인")}
            ${reportTile("부고", `${typeCounts["부고"] || 0}건`, "관계 관리 확인")}
            ${reportTile("동정", `${typeCounts["동정"] || 0}건`, "취재·편성 변화")}
          </div>
          <div class="subnav media-move-tabs" role="tablist" aria-label="언론사 동정 유형">
            ${[
              ["all", `전체 ${allItems.length}`],
              ["인사", `인사 ${typeCounts["인사"] || 0}`],
              ["부고", `부고 ${typeCounts["부고"] || 0}`],
              ["동정", `동정 ${typeCounts["동정"] || 0}`],
            ].map(([id, label]) => `
              <button class="subnav-item ${moveType === id ? "active" : ""}" type="button" role="tab" aria-selected="${moveType === id ? "true" : "false"}" data-action="set-subview" data-subview-key="mediaMoveType" data-subview="${escapeAttr(id)}">
                ${escapeHtml(label)}
              </button>
            `).join("")}
          </div>
          <div class="toolbar">
            <div class="toolbar-group">
              ${dateFilterControls("mediaMoves", dateFilter)}
            </div>
          </div>
          <div class="subview-help">광주·전남 언론사의 인사, 부고, 취재 담당 변화는 보도자료 배포 우선순위와 관계 관리에 바로 반영할 수 있도록 정리합니다.</div>
        </div>
      </section>

      <section class="panel section-gap">
        <div class="panel-header">
          <h2>${moveType === "all" ? "전체 동정 목록" : `${moveType} 목록`}</h2>
        </div>
        <div class="panel-body">
          ${items.length ? `<div class="list">${items.map(mediaMoveItem).join("")}</div>` : empty("언론사 동정 자료가 없습니다.")}
        </div>
      </section>
    `;
  }

  function mediaMoveItem(item) {
    const title = item.url
      ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title);
    return `
      <article class="list-item">
        <div class="list-item-header">
          <h3>${title}</h3>
          ${chip(item.type, item.type === "부고" ? "danger" : item.type === "인사" ? "info" : "teal")}
        </div>
        <p>${escapeHtml(item.outlet || "-")} · ${formatDateTime(item.publishedAt) || "-"} · 중요도 ${Number(item.importance || 0)}</p>
        <p>${escapeHtml(item.note || "")}</p>
      </article>
    `;
  }

  function renderReports() {
    setPage("성과 리포트", "성과 집계·공유용 보고");
    const from = filterValue("reportFrom", firstDayOfMonth());
    const to = filterValue("reportTo", todayDate());
    const data = reportData(from, to);

    viewRoot.innerHTML = `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>기간 리포트</h2>
            <p>${formatDate(from)} - ${formatDate(to)}</p>
          </div>
          <div class="toolbar-group">
            <button class="button" type="button" data-action="export-report-json">JSON</button>
            <button class="button" type="button" data-action="export-report-csv">CSV</button>
            <button class="button primary" type="button" data-action="print-report">인쇄</button>
          </div>
        </div>
        <div class="panel-body">
          <div class="toolbar">
            <div class="toolbar-group">
              <input type="date" data-filter="reportFrom" value="${escapeAttr(from)}" aria-label="시작일" />
              <input type="date" data-filter="reportTo" value="${escapeAttr(to)}" aria-label="종료일" />
            </div>
          </div>
          <div class="report-summary">
            ${reportTile("보도자료", data.releaseCount, "기간 내 작성·배포")}
            ${reportTile("모니터링 기사", data.articleCount, "기간 내 기사")}
            ${reportTile("기사화율", `${data.conversionRate}%`, "보도자료 대비 매칭")}
            ${reportTile("매체 영향력", impactPercent(data.avgImpact), "100% 기준 평균")}
          </div>
        </div>
      </section>

      <section class="panel section-gap">
        <div class="panel-header">
          <div>
            <h2>홍보팀 성과지표 참고</h2>
            <p>대학브랜드 가치 향상 추진과제 기준</p>
          </div>
        </div>
        <div class="panel-body">
          ${prKpiPanel()}
        </div>
      </section>

      <section class="split-grid section-gap">
        <div class="panel">
          <div class="panel-header">
            <h2>매체유형 분포</h2>
          </div>
          <div class="panel-body">${barList(data.mediaTypeCounts, mediaTypes)}</div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <h2>지면·온라인 분포</h2>
          </div>
          <div class="panel-body">${barList(data.channelCounts, publicationChannels)}</div>
        </div>
      </section>

      <section class="split-grid section-gap">
        <div class="panel">
          <div class="panel-header">
            <h2>상위 매체</h2>
          </div>
          <div class="panel-body">${barList(data.outletCounts)}</div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <h2>감성 분포</h2>
          </div>
          <div class="panel-body">${barList(data.sentimentCounts, sentiments)}</div>
        </div>
      </section>

      <section class="panel section-gap">
        <div class="panel-header">
          <h2>리포트 상세</h2>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>항목</th>
                <th>값</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              ${data.rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.item)}</td>
                      <td>${escapeHtml(row.value)}</td>
                      <td>${escapeHtml(row.memo)}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderSettings() {
    setPage("설정", "데이터·키워드·백업");
    viewRoot.innerHTML = `
      <section class="settings-grid">
        <div class="panel">
          <div class="panel-header">
            <div>
              <h2>모니터링 키워드</h2>
              <p>${state.keywords.length}개 등록</p>
            </div>
            <button class="button primary" type="button" data-action="new-keyword">키워드 추가</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>범위</th>
                  <th>알림</th>
                  <th class="actions-cell">작업</th>
                </tr>
              </thead>
              <tbody>
                ${state.keywords
                  .map(
                    (item) => `
                      <tr>
                        <td>${escapeHtml(item.word)}</td>
                        <td>${escapeHtml(item.scope || "-")}</td>
                        <td>${statusChip(risks, item.alertLevel || "medium")}</td>
                        <td class="actions-cell">
                          <div class="action-row">
                            <button class="mini-button" type="button" data-action="edit-keyword" data-id="${item.id}">수정</button>
                            <button class="mini-button danger" type="button" data-action="delete-keyword" data-id="${item.id}">삭제</button>
                          </div>
                        </td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h2>운영 데이터</h2>
          </div>
          <div class="panel-body">
            <div class="key-value">
              <div><span>보도자료</span><strong>${state.releases.length}건</strong></div>
              <div><span>모니터링 기사</span><strong>${state.articles.length}건</strong></div>
              <div><span>외부 모니터링</span><strong>${(state.externalArticles || []).length}건</strong></div>
              <div><span>언론사 동정</span><strong>${(state.mediaMoves || []).length}건</strong></div>
              <div><span>이슈 대응방</span><strong>${state.issues.length}건</strong></div>
              <div><span>보도자료 자동 확인</span><strong>${formatDateTime(state.meta.homepageScanAt) || "대기"}</strong></div>
              <div><span>AI 조사 시점</span><strong>${formatDateTime(state.meta.aiScanAt) || "-"}</strong></div>
              <div><span>최종 저장</span><strong>${formatDateTime(state.meta.updatedAt)}</strong></div>
            </div>
            <div class="toolbar toolbar-offset">
              <div class="toolbar-group">
                <button class="button primary" type="button" data-action="export-backup">전체 백업</button>
                <button class="button" type="button" data-action="import-backup">백업 불러오기</button>
                <button class="button danger" type="button" data-action="reset-seed">운영 데이터 비우기</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function handleClick(event) {
    if (event.target.matches("[data-modal-backdrop]")) return closeModal();

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    event.preventDefault();

    const { action, id, export: exportType, viewButton, subviewKey, subview, sortField } = actionTarget.dataset;

    if (action === "go-home") {
      ui.view = "dashboard";
      ui.search = "";
      searchInput.value = "";
      renderNav();
      renderView();
      viewRoot.focus({ preventScroll: true });
      return;
    }

    if (action === "set-negative-keyword") {
      ui.filters.negativeKeyword = id || "all";
      renderView();
      return;
    }

    if (action === "go-view") {
      ui.view = viewButton;
      ui.search = "";
      searchInput.value = "";
      renderNav();
      renderView();
      viewRoot.focus({ preventScroll: true });
      return;
    }

    if (action === "set-subview") {
      ui.filters[subviewKey] = subview;
      renderView();
      return;
    }

    if (action === "cycle-release-sort") {
      const current = filterValue("releaseSort", "none");
      const descending = `${sortField}-desc`;
      const ascending = `${sortField}-asc`;
      ui.filters.releaseSort = current === descending ? ascending : current === ascending ? "none" : descending;
      renderView();
      return;
    }

    if (action === "close-modal") return closeModal();
    if (action === "new-release") return openReleaseModal();
    if (action === "edit-release") return openReleaseModal(id);
    if (action === "advance-release") return advanceRelease(id);
    if (action === "duplicate-release") return duplicateRelease(id);
    if (action === "delete-release") return deleteItem("releases", id, "보도자료를 삭제할까요?");
    if (action === "escalate-article") return escalateArticle(id);
    if (action === "auto-match") return runAutoMatch();
    if (action === "refresh-ai") return refreshMonitoringData();
    if (action === "refresh-official-releases") return refreshOfficialReleases();
    if (action === "refresh-moves") return refreshMediaMoves();
    if (action === "open-release-coverage") return openReleaseCoverageTab(id);
    if (action === "export-release-coverage-csv") return exportReleaseCoverageCsv(id);
    if (action === "print-release-coverage") return printReleaseCoverage(id);
    if (action === "open-article-group") return openArticleGroupTab(id, actionTarget.dataset.scope);
    if (action === "open-kpi-monthly") return openKpiMonthlyModal(id);
    if (action === "save-kpi") return saveKpiRecord(id, actionTarget);
    if (action === "new-issue") return openIssueModal();
    if (action === "edit-issue") return openIssueModal(id);
    if (action === "advance-issue") return advanceIssue(id);
    if (action === "delete-issue") return deleteItem("issues", id, "이슈 대응방을 삭제할까요?");
    if (action === "new-keyword") return openKeywordModal();
    if (action === "edit-keyword") return openKeywordModal(id);
    if (action === "delete-keyword") return deleteItem("keywords", id, "키워드를 삭제할까요?");
    if (action === "export-backup") return exportBackup();
    if (action === "import-backup") return backupImport.click();
    if (action === "reset-seed") return resetSeed();
    if (action === "export-csv") return exportCsv(exportType);
    if (action === "export-report-json") return exportReportJson();
    if (action === "export-report-csv") return exportReportCsv();
    if (action === "print-report") return printReport();
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!form.dataset.form) return;
    event.preventDefault();
    const handlers = {
      release: saveRelease,
      issue: saveIssue,
      keyword: saveKeyword,
      "kpi-monthly": saveKpiMonthlyValues,
    };
    handlers[form.dataset.form](form);
  }

  function handleChange(event) {
    const filter = event.target.dataset.filter;
    if (!filter) return;
    ui.filters[filter] = event.target.value;
    renderView();
  }

  function openReleaseModal(id) {
    const item =
      state.releases.find((release) => release.id === id) || {
        id: "",
        title: "",
        subtitle: "",
        department: state.departments[0] || "",
        owner: "",
        category: "기타",
        status: "distributed",
        publishAt: todayDate(),
        embargo: "",
        summary: "",
        body: "",
        tags: [],
        groups: [],
        attachments: [],
        expectedOutlets: 12,
      };

    openModal(
      id ? "보도자료 수정" : "보도자료 붙여넣기",
      `
        <form id="release-form" data-form="release" class="form-grid">
          <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
          <input type="hidden" name="owner" value="${escapeAttr(item.owner || "")}" />
          <input type="hidden" name="category" value="${escapeAttr(item.category || "기타")}" />
          <input type="hidden" name="status" value="${escapeAttr(item.status || "distributed")}" />
          <input type="hidden" name="embargo" value="${escapeAttr(item.embargo || "")}" />
          <input type="hidden" name="tags" value="${escapeAttr((item.tags || []).join(", "))}" />
          <input type="hidden" name="groups" value="${escapeAttr((item.groups || []).join(", "))}" />
          <input type="hidden" name="attachments" value="${escapeAttr((item.attachments || []).join("\n"))}" />
          ${field("제목", `<input name="title" required value="${escapeAttr(item.title)}" />`, true)}
          ${field("부제목", `<input name="subtitle" value="${escapeAttr(item.subtitle || item.summary || "")}" />`, true)}
          ${field(
            "주관부서",
            `<select name="department">${state.departments.map((value) => option(value, value, item.department)).join("")}</select>`
          )}
          ${field("배포일", `<input type="date" name="publishAt" required value="${escapeAttr(toInputDate(item.publishAt) || todayDate())}" />`)}
          ${field("예상 배포처 수", `<input type="number" min="1" name="expectedOutlets" value="${escapeAttr(item.expectedOutlets || estimateExpectedOutlets(item))}" />`)}
          ${field("본문", `<textarea name="body" required placeholder="보도자료 본문을 그대로 붙여넣으세요.">${escapeHtml(item.body)}</textarea>`, true)}
        </form>
      `,
      `
        <button class="button" type="button" data-action="close-modal">취소</button>
        <button class="button primary" type="submit" form="release-form">저장</button>
      `
    );
  }

  function saveRelease(form) {
    const data = formData(form);
    const existing = state.releases.find((item) => item.id === data.id);
    const item = {
      id: data.id || uid("rel"),
      title: data.title.trim(),
      subtitle: data.subtitle.trim(),
      department: data.department,
      owner: data.owner.trim(),
      category: data.category,
      status: data.status,
      publishAt: normalizeReleaseDate(data.publishAt),
      embargo: data.embargo,
      summary: data.subtitle.trim(),
      body: data.body.trim(),
      tags: splitComma(data.tags).length ? splitComma(data.tags) : extractKeywords(`${data.title} ${data.subtitle} ${data.body}`, 6),
      groups: splitComma(data.groups),
      attachments: splitLines(data.attachments),
      expectedOutlets: Math.max(1, Number(data.expectedOutlets || 12)),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsert("releases", item);
    autoMatchArticlesForRelease(item);
    addActivity("보도자료", `${item.title} 저장`);
    closeModal();
    saveState();
    renderView();
    toast("보도자료가 저장되었습니다.");
  }

  function openIssueModal(id) {
    const item =
      state.issues.find((issue) => issue.id === id) || {
        id: "",
        title: "",
        severity: "medium",
        status: "watching",
        owner: "",
        department: "",
        createdAt: todayDate(),
        linkedArticles: [],
        officialPosition: "",
        qna: "",
        timeline: "",
        memo: "",
      };

    openModal(
      id ? "이슈 대응방 수정" : "이슈 대응방 생성",
      `
        <form id="issue-form" data-form="issue" class="form-grid">
          <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
          ${field("이슈명", `<input name="title" required value="${escapeAttr(item.title)}" />`, true)}
          ${field("위험도", `<select name="severity">${Object.entries(risks).map(([value, status]) => option(value, status.label, item.severity)).join("")}</select>`)}
          ${field(
            "상태",
            `<select name="status">${Object.entries(issueStatuses).map(([value, status]) => option(value, status.label, item.status)).join("")}</select>`
          )}
          ${field("담당자", `<input name="owner" value="${escapeAttr(item.owner)}" />`)}
          ${field("관련 부서", `<input name="department" value="${escapeAttr(item.department)}" />`)}
          ${field("생성일", `<input type="date" name="createdAt" value="${escapeAttr(toInputDate(item.createdAt))}" />`)}
          ${field("연결 기사", `<textarea name="linkedArticles">${escapeHtml((item.linkedArticles || []).join("\n"))}</textarea>`, true)}
          ${field("공식 입장", `<textarea name="officialPosition">${escapeHtml(item.officialPosition)}</textarea>`, true)}
          ${field("Q&A", `<textarea name="qna">${escapeHtml(item.qna)}</textarea>`, true)}
          ${field("타임라인", `<textarea name="timeline">${escapeHtml(item.timeline)}</textarea>`, true)}
          ${field("메모", `<textarea name="memo">${escapeHtml(item.memo)}</textarea>`, true)}
        </form>
      `,
      `
        <button class="button" type="button" data-action="close-modal">취소</button>
        <button class="button primary" type="submit" form="issue-form">저장</button>
      `
    );
  }

  function saveIssue(form) {
    const data = formData(form);
    const existing = state.issues.find((item) => item.id === data.id);
    const item = {
      id: data.id || uid("iss"),
      title: data.title.trim(),
      severity: data.severity,
      status: data.status,
      owner: data.owner.trim(),
      department: data.department.trim(),
      createdAt: data.createdAt,
      linkedArticles: splitLines(data.linkedArticles),
      officialPosition: data.officialPosition.trim(),
      qna: data.qna.trim(),
      timeline: data.timeline.trim(),
      memo: data.memo.trim(),
      createdRawAt: existing?.createdRawAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsert("issues", item);
    addActivity("이슈 대응", `${item.title} 저장`);
    closeModal();
    saveState();
    renderView();
    toast("이슈 대응방이 저장되었습니다.");
  }

  function openKeywordModal(id) {
    const item =
      state.keywords.find((keyword) => keyword.id === id) || {
        id: "",
        word: "",
        scope: "",
        alertLevel: "medium",
      };

    openModal(
      id ? "키워드 수정" : "키워드 추가",
      `
        <form id="keyword-form" data-form="keyword" class="form-grid">
          <input type="hidden" name="id" value="${escapeAttr(item.id)}" />
          ${field("키워드", `<input name="word" required value="${escapeAttr(item.word)}" />`)}
          ${field("범위", `<input name="scope" value="${escapeAttr(item.scope)}" />`)}
          ${field("알림 수준", `<select name="alertLevel">${Object.entries(risks).map(([value, status]) => option(value, status.label, item.alertLevel)).join("")}</select>`)}
        </form>
      `,
      `
        <button class="button" type="button" data-action="close-modal">취소</button>
        <button class="button primary" type="submit" form="keyword-form">저장</button>
      `
    );
  }

  function saveKeyword(form) {
    const data = formData(form);
    const item = {
      id: data.id || uid("key"),
      word: data.word.trim(),
      scope: data.scope.trim(),
      alertLevel: data.alertLevel,
    };
    upsert("keywords", item);
    addActivity("설정", `${item.word} 키워드 저장`);
    closeModal();
    saveState();
    renderView();
    toast("키워드가 저장되었습니다.");
  }

  function advanceRelease(id) {
    const item = state.releases.find((release) => release.id === id);
    if (!item || !releaseNext[item.status]) return;
    item.status = releaseNext[item.status];
    if (item.status === "scheduled" && !item.publishAt) item.publishAt = daysFromNow(1, 9);
    item.updatedAt = new Date().toISOString();
    addActivity("보도자료", `${item.title} 상태: ${releaseStatuses[item.status].label}`);
    saveState();
    renderView();
    toast(`상태가 ${releaseStatuses[item.status].label}(으)로 변경되었습니다.`);
  }

  function duplicateRelease(id) {
    const item = state.releases.find((release) => release.id === id);
    if (!item) return;
    const copy = {
      ...item,
      id: uid("rel"),
      title: `${item.title} 복사본`,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.releases.unshift(copy);
    addActivity("보도자료", `${copy.title} 생성`);
    saveState();
    renderView();
    toast("보도자료를 복제했습니다.");
  }

  function escalateArticle(id) {
    const article = state.articles.find((item) => item.id === id);
    if (!article) return;
    article.status = "escalated";
    article.risk = article.risk === "low" ? "medium" : article.risk;
    article.updatedAt = new Date().toISOString();

    const exists = state.issues.some((issue) => issue.linkedArticles.includes(article.title));
    if (!exists) {
      state.issues.unshift({
        id: uid("iss"),
        title: article.title,
        severity: article.risk,
        status: "response",
        owner: "홍보팀",
        department: "",
        createdAt: todayDate(),
        linkedArticles: [article.title],
        officialPosition: "",
        qna: "",
        timeline: `${formatTime(new Date())} 기사 이슈 전환`,
        memo: article.memo,
        createdRawAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    addActivity("모니터링", `${article.title} 이슈 전환`);
    saveState();
    renderView();
    toast("기사에서 이슈 대응방을 만들었습니다.");
  }

  function advanceIssue(id) {
    const item = state.issues.find((issue) => issue.id === id);
    if (!item || !issueNext[item.status]) return;
    item.status = issueNext[item.status];
    item.updatedAt = new Date().toISOString();
    addActivity("이슈 대응", `${item.title} 상태: ${issueStatuses[item.status].label}`);
    saveState();
    renderView();
    toast(`이슈 상태가 ${issueStatuses[item.status].label}(으)로 변경되었습니다.`);
  }

  function deleteItem(collection, id, message) {
    if (!window.confirm(message)) return;
    const target = state[collection].find((item) => item.id === id);
    state[collection] = state[collection].filter((item) => item.id !== id);
    if (collection === "releases") {
      state.articles = state.articles.map((article) => (article.releaseId === id ? { ...article, releaseId: "" } : article));
    }
    addActivity("삭제", target?.title || target?.name || target?.word || "항목 삭제");
    saveState();
    renderView();
    toast("삭제되었습니다.");
  }

  function exportBackup() {
    download(`chosun-media-platform-backup-${todayDate()}.json`, "application/json", JSON.stringify(state, null, 2));
    toast("백업 파일을 만들었습니다.");
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        state = prepareOperationalState(normalizeState(parsed));
        saveState();
        renderView();
        toast("백업 데이터를 불러왔습니다.");
      } catch (error) {
        console.error(error);
        toast("백업 파일을 읽지 못했습니다.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function resetSeed() {
    if (!window.confirm(`${ACTUAL_USE_START_DATE}부터의 실제 운영 상태로 비울까요?`)) return;
    state = prepareOperationalState({ ...normalizeState(state), meta: { ...(state.meta || {}), operationalMode: "", actualUseStartDate: "" } });
    saveState();
    renderView();
    toast("운영 데이터를 비웠습니다.");
  }

  function exportCsv(type) {
    const map = {
      releases: csvRowsForReleases,
      articles: csvRowsForArticles,
      affiliated: csvRowsForAffiliatedArticles,
      issues: csvRowsForIssues,
    };
    const rows = map[type]?.() || [];
    if (!rows.length) return toast("내보낼 데이터가 없습니다.");
    if (download(`chosun-${type}-${todayDate()}.csv`, "text/csv;charset=utf-8", toCsv(rows))) toast("CSV 파일을 만들었습니다.");
  }

  function exportReportJson() {
    const from = filterValue("reportFrom", firstDayOfMonth());
    const to = filterValue("reportTo", todayDate());
    if (download(`chosun-report-${from}-${to}.json`, "application/json;charset=utf-8", JSON.stringify(reportData(from, to), null, 2))) toast("리포트 JSON을 만들었습니다.");
  }

  function exportReportCsv() {
    const from = filterValue("reportFrom", firstDayOfMonth());
    const to = filterValue("reportTo", todayDate());
    const data = reportData(from, to);
    if (download(`chosun-report-${from}-${to}.csv`, "text/csv;charset=utf-8", toCsv(data.rows))) toast("리포트 CSV를 만들었습니다.");
  }

  function exportReleaseCoverageCsv(id) {
    const payload = releaseCoveragePayload(id);
    if (!payload) return;
    const { release, stats } = payload;
    const rows = releaseCoverageCsvRows(stats.articles);
    if (!rows.length) return toast("내보낼 보도 기사가 없습니다.");
    if (download(`chosun-release-coverage-${stableKey(release.title)}-${todayDate()}.csv`, "text/csv;charset=utf-8", toCsv(rows))) toast("보도자료 상세 CSV를 만들었습니다.");
  }

  function printReleaseCoverage(id) {
    const payload = releaseCoveragePayload(id);
    if (!payload) return;
    const { release, stats } = payload;
    const html = detailReportDocument({
      title: "보도자료 기사화 상세",
      eyebrow: "보도자료 성과",
      heading: release.title,
      summary: `${formatDate(release.publishAt) || "-"} · ${release.department || "-"} · ${stats.articleCount}건 · ${stats.uniqueOutlets}개 언론사 · 매체 영향력 ${impactPercent(stats.avgImpact)}`,
      body: reportArticleRows(stats.articles),
    });
    printHtmlReport(html);
  }

  function printReport() {
    document.body.classList.add("printing-report");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-report"), 800);
  }

  function releaseCoveragePayload(id) {
    const release = state.releases.find((item) => item.id === id);
    if (!release) {
      toast("보도자료를 찾지 못했습니다.");
      return null;
    }
    const stats = releaseArticleStats(release);
    if (!stats.articleCount) {
      toast("연결된 보도 기사가 없습니다.");
      return null;
    }
    return { release, stats };
  }

  function releaseCoverageCsvRows(articles) {
    return dedupeArticles(articles).map((article) => {
      const mediaType = normalizeMediaType(article.mediaType, article.outlet);
      const channel = normalizeChannel(article.channel, article.url, mediaType);
      return {
        outlet: article.outlet || "",
        title: article.title || "",
        url: article.url || "",
        mediaType: mediaTypes[mediaType]?.label || mediaType,
        channel: articleChannelLabels(article),
        publishedAt: formatDateTime(article.publishedAt) || "",
        impact: impactPercent(articleImpactScore(article)),
        summary: article.excerpt || articleAttentionReason(article),
      };
    });
  }

  function reportRowsTable(rows) {
    return `
      <table>
        <thead>
          <tr>
            <th>항목</th>
            <th>값</th>
            <th>메모</th>
          </tr>
        </thead>
        <tbody>
          ${(rows || [])
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(row.item)}</td>
                  <td>${escapeHtml(row.value)}</td>
                  <td>${escapeHtml(row.memo)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  function releasePerformanceOverview(releases, articles) {
    const stats = releases.map((release) => releaseArticleStats(release, articles));
    const coveredReleases = stats.filter((item) => item.articleCount > 0).length;
    const totalImpact = stats.reduce((sum, item) => sum + item.totalImpact, 0);
    const articleCount = stats.reduce((sum, item) => sum + item.articleCount, 0);
    return {
      releaseCount: releases.length,
      coveredReleases,
      distributionRate: releases.length ? Math.round((coveredReleases / releases.length) * 100) : 0,
      totalImpact,
      avgImpact: articleCount ? Math.round(totalImpact / articleCount) : 0,
    };
  }

  function releaseSourceCell(item) {
    return item.sourceUrl ? `<a class="mini-link" href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기</a>` : `<span class="muted">-</span>`;
  }

  function outletLinkList(articles, limit = 7) {
    const unique = uniqueOutletEntries(articles);
    if (!unique.length) return `<span class="muted">보도 언론사 없음</span>`;
    const visible = unique.slice(0, limit);
    const more = Math.max(0, unique.length - visible.length);
    return `
      <div class="outlet-link-list">
        ${visible
          .map((item) =>
            item.url
              ? `<a class="outlet-link" href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer" title="매체 영향력 ${impactPercent(item.impact)}">${escapeHtml(item.outlet)}</a>`
              : `<span class="outlet-link" title="매체 영향력 ${impactPercent(item.impact)}">${escapeHtml(item.outlet)}</span>`
          )
          .join("")}
        ${more ? `<span class="outlet-more">+${more}</span>` : ""}
      </div>
    `;
  }

  function uniqueOutletEntries(articles) {
    const unique = [];
    const seen = new Set();
    [...(articles || [])]
      .sort((a, b) => articleImpactScore(b) - articleImpactScore(a))
      .forEach((article) => {
        const outlet = article.outlet || "미분류";
        if (!isResolvedNewsOutlet(outlet)) return;
        const key = normalizeOutlet(outlet);
        if (seen.has(key)) return;
        seen.add(key);
        unique.push({ outlet, url: article.url || "", impact: articleImpactScore(article), article });
      });
    return unique;
  }

  function releasePerformancePanel(releases) {
    const rows = releases
      .map((release) => ({ release, stats: releaseArticleStats(release) }))
      .sort((a, b) => b.stats.articleCount - a.stats.articleCount || b.stats.totalImpact - a.stats.totalImpact)
      .slice(0, 5);
    if (!rows.length) return empty("보도자료가 없습니다.");
    return `
      <div class="summary-list">
        ${rows
          .map(
            ({ release, stats }) => `
              <article class="summary-row">
                <div>
                  <strong>${escapeHtml(release.title)}</strong>
                  <span>${formatDate(release.publishAt) || "-"} · ${escapeHtml(release.department || "-")}</span>
                  <div class="summary-detail-row">${releaseCoverageAction(release, stats, "언론사 상세보기")}</div>
                </div>
                <div class="summary-kpis">
                  ${chip(`배포율 ${stats.coverageRate}%`, stats.coverageRate >= 70 ? "success" : stats.coverageRate >= 35 ? "warning" : "neutral")}
                  ${chip(`${stats.articleCount}건`, "teal")}
                  ${chip(`매체 영향력 ${impactPercent(stats.avgImpact)}`, "info")}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function releaseReportData(releases) {
    const releaseIds = new Set(releases.map((release) => release.id));
    const articles = state.articles.filter((article) => releaseIds.has(article.releaseId));
    const overview = releasePerformanceOverview(releases, state.articles);
    const topReleases = releases
      .map((release) => ({ release, stats: releaseArticleStats(release) }))
      .sort((a, b) => b.stats.articleCount - a.stats.articleCount || b.stats.totalImpact - a.stats.totalImpact)
      .slice(0, 5);

    return {
      ...overview,
      articleCount: articles.length,
      uniqueOutlets: new Set(articles.map((article) => normalizeOutlet(article.outlet)).filter(Boolean)).size,
      mediaTypeCounts: countBy(articles, "mediaType"),
      channelCounts: countByChannels(articles),
      outletCounts: countBy(articles, "outlet"),
      departmentCounts: countBy(releases, "department"),
      categoryCounts: countBy(releases, "category"),
      statusCounts: countBy(releases, "status"),
      dailyTrend: releaseDailyTrend(releases),
      topReleases,
    };
  }

  function releaseDailyTrend(releases) {
    return lastNDates(7).map((date) => {
      const items = releases.filter((item) => String(item.publishAt || item.createdAt || "").startsWith(date));
      return {
        date,
        count: items.length,
        impact: items.reduce((sum, release) => sum + releaseArticleStats(release).totalImpact, 0),
      };
    });
  }

  function recentChosunArticles() {
    return [...state.articles].sort(sortByPublished).slice(0, 6);
  }

  function recentExternalArticles() {
    return [...(state.externalArticles || [])]
      .map(normalizeExternalArticle)
      .sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0) || String(b.publishedAt).localeCompare(String(a.publishedAt)))
      .slice(0, 5);
  }

  function negativeArticles() {
    return [...state.articles]
      .filter((item) => item.sentiment === "negative" || item.risk === "high")
      .sort((a, b) => articleImpactScore(b) - articleImpactScore(a) || sortByPublished(a, b));
  }

  function articleAttentionReason(article) {
    const text = `${article.title || ""} ${article.excerpt || ""} ${(article.keywords || []).join(" ")} ${article.topic || ""}`;
    if (article.sentiment === "negative" || article.risk === "high") return "대학 신뢰·지역 여론·온라인 경험담이 결합해 확산 가능성이 있습니다.";
    if (/입학|수시|정시|모집|학부모/.test(text)) return "입시 일정과 학부모 관심이 겹쳐 검색·공유 수요가 커졌습니다.";
    if (/AI|디지털|산학|창업|연구|기술/.test(text)) return "AI·지역산업 전환 의제와 맞물려 전문매체와 경제면 관심이 높습니다.";
    if (/봉사|돌봄|폭염|지역사회|취약/.test(text)) return "생활 안전과 지역 공헌 이슈가 결합해 지역 독자의 체감도가 높습니다.";
    if (article.mediaType === "broadcast") return "방송 보도 특성상 현장성과 지역성이 부각되며 관심이 커졌습니다.";
    if (article.mediaType === "national") return "중앙 매체 노출로 대학 브랜드와 고등교육 정책 맥락이 함께 부각됐습니다.";
    return "지역성과 대학 브랜드 성과가 함께 언급되며 후속 보도 가능성이 있습니다.";
  }

  function articleSummary(article) {
    const release = state.releases.find((item) => item.id === article.releaseId);
    const text = `${article.title || ""} ${article.excerpt || ""} ${(article.keywords || []).join(" ")} ${article.topic || ""}`;
    const source = `${article.outlet || "해당 매체"} 보도는`;
    const base = article.excerpt
      ? trimSentence(shortenTitle(article.excerpt, 120))
      : release
        ? `${shortenTitle(release.title, 64)} 관련 내용`
        : `${shortenTitle(article.title, 80)} 사안`;

    if (/등록금|장학|재정|정보 공개/.test(text)) return `${source} ${base} 중심으로, 등록금·장학금 정보 공개와 학생 부담 완화 대책이 충분한지 짚고 있습니다.`;
    if (/민원|학사|행정|안내|응대/.test(text)) return `${source} ${base} 중심으로, 학사 안내와 민원 응대 과정에서 학생 불편이 있었는지 다루고 있습니다.`;
    if (/사고|안전|피해|부실/.test(text)) return `${source} ${base} 중심으로, 대학의 안전 관리와 후속 조치가 적절했는지 확인하는 내용입니다.`;
    if (/입학|수시|정시|모집/.test(text)) return `${source} ${base} 중심으로, 입시 안내와 정보 제공의 투명성을 점검하는 내용입니다.`;
    if (/논란|갈등|비판|반발/.test(text)) return `${source} ${base} 중심으로, 대학의 의사결정과 소통 방식에 대한 문제 제기를 다루고 있습니다.`;
    return `${source} ${base} 중심으로, 대학 입장·사실관계·지역 여론 확산 흐름을 함께 확인해야 하는 기사입니다.`;
  }

  function trimSentence(value) {
    return String(value || "").replace(/[.。]+$/g, "").trim();
  }

  function articleCriticismPoint(article) {
    const text = `${article.title || ""} ${article.excerpt || ""} ${(article.keywords || []).join(" ")} ${article.topic || ""}`;
    if (/등록금|장학|재정|정보 공개/.test(text)) return "등록금·장학금 등 학생 부담과 재정 정보가 충분히 공개됐는지를 비판합니다.";
    if (/민원|학사|행정|안내|응대/.test(text)) return "학사 안내와 민원 응대가 빠르고 명확했는지, 학생 불편을 줄였는지를 문제 삼습니다.";
    if (/사고|안전|피해|부실/.test(text)) return "대학의 안전 관리와 사후 조치가 충분했는지를 따져 묻는 보도입니다.";
    if (/입학|수시|정시|모집/.test(text)) return "입시 안내의 공정성·투명성·정보 접근성을 점검하는 성격의 보도입니다.";
    if (/논란|갈등|비판|반발/.test(text)) return "대학 의사결정이나 소통 방식이 이해관계자 눈높이에 맞았는지를 비판합니다.";
    if (article.sentiment === "negative" || article.risk === "high") return "대학 운영 과정의 설명 부족, 신뢰 저하 가능성, 후속 확산 위험을 지적합니다.";
    return "기사의 핵심 쟁점이 대학 평판이나 지역 여론에 어떤 부담을 주는지 확인이 필요합니다.";
  }

  function articleAwarenessReason(article) {
    const text = `${article.title || ""} ${article.excerpt || ""} ${(article.keywords || []).join(" ")}`;
    if (article.risk === "high") return "긴급 위험 기사로 분류되어 당일 사실확인과 공식 메시지 준비가 필요합니다.";
    if (article.sentiment === "negative" && /온라인|커뮤니티|민원|학사/.test(text)) return "온라인 경험담이 지역 여론으로 번질 수 있어 조기 대응 여부를 판단해야 합니다.";
    if (article.sentiment === "negative") return "부정 프레임이 후속 기사로 재생산될 수 있어 핵심 쟁점을 선제적으로 정리해야 합니다.";
    if (articleImpactScore(article) >= 80) return "영향력 높은 매체 보도라 기관 신뢰와 브랜드 인식에 직접 영향을 줄 수 있습니다.";
    return "사안이 작아 보여도 반복 보도될 경우 대학 이미지 이슈로 커질 수 있습니다.";
  }

  function responseStrategy(article) {
    const text = `${article.title || ""} ${article.excerpt || ""} ${(article.keywords || []).join(" ")}`;
    if (/민원|학사|행정|안내/.test(text)) {
      return {
        tone: "공감·사실확인·개선 약속",
        first: "관련 부서와 사실관계를 1시간 내 확인하고 반복 민원 여부를 분류합니다.",
        message: "불편을 인정하되 절차·개선 일정·문의 창구를 한 문장으로 명확히 제시합니다.",
        channel: "홈페이지 공지, 학생 커뮤니티, 지역 기자 설명자료 순서로 같은 메시지를 배포합니다.",
      };
    }
    if (/등록금|장학|재정/.test(text)) {
      return {
        tone: "투명한 수치 공개",
        first: "등록금·장학금·지원 예산의 최신 수치를 표로 정리합니다.",
        message: "학생 부담 완화 노력과 실제 지원 규모를 수치 중심으로 설명합니다.",
        channel: "Q&A 자료와 총괄 입장을 동시에 배포하고 추가 질의 창구를 지정합니다.",
      };
    }
    return {
      tone: "사실 기반 신속 대응",
      first: "기사 핵심 주장, 사실 여부, 이해관계자를 즉시 분리해 확인합니다.",
      message: "확인된 사실과 조치 계획만 짧게 공개하고 추측성 표현은 피합니다.",
      channel: "담당 부서 확인 후 지역 주요 매체와 온라인 채널에 동일 입장을 공유합니다.",
    };
  }

  function negativeMiniItem(article) {
    return `
      <article class="list-item">
        <div class="list-item-header">
          <h3>${escapeHtml(article.title)}</h3>
          ${statusChip(risks, article.risk || "medium")}
        </div>
        <p>${escapeHtml(article.outlet || "-")} · ${articleAttentionReason(article)}</p>
      </article>
    `;
  }

  function articleMonitorItem(article) {
    const release = state.releases.find((item) => item.id === article.releaseId);
    const title = article.url
      ? `<a href="${escapeAttr(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(article.title)}</a>`
      : escapeHtml(article.title);
    return `
      <article class="list-item">
        <div class="list-item-header">
          <h3>${title}</h3>
          ${chip(`매체 영향력 ${impactPercent(articleImpactScore(article))}`, "teal")}
        </div>
        <p>${escapeHtml(article.outlet || "-")} · ${formatDateTime(article.publishedAt) || "-"} · ${release ? escapeHtml(release.title) : "보도자료 미매칭"}</p>
        <p>${escapeHtml(articleAttentionReason(article))}</p>
        <div class="tag-list">
          ${statusChip(mediaTypes, article.mediaType || "other")}
          ${articleChannelChips(article)}
          ${statusChip(sentiments, article.sentiment || "neutral")}
        </div>
      </article>
    `;
  }

  function externalMonitorItem(item) {
    const title = item.url
      ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : escapeHtml(item.title);
    return `
      <article class="list-item">
        <div class="list-item-header">
          <h3>${title}</h3>
          ${chip(`${Number(item.importance || 0)}점`, Number(item.importance || 0) >= 85 ? "danger" : "neutral")}
        </div>
        <p>${escapeHtml(item.source || item.category || "-")} · ${escapeHtml(item.outlet || "-")} · ${formatDateTime(item.publishedAt) || "-"}</p>
        <p>${escapeHtml(item.memo || "")}</p>
      </article>
    `;
  }

  function prKpiPanel(mode = "editable") {
    const records = kpiRecordsWithAutoActual();
    const selectedYear = selectedKpiYear();
    if (mode === "summary") {
      const latest = records.filter((record) => record.year === selectedYear);
      return `
        <div class="kpi-list">
          ${latest
            .map(
              (record) => `
                <article class="kpi-item">
                  <strong>${escapeHtml(record.metric)}</strong>
                  <span>${record.year}년 달성률 ${kpiAchievement(record)}%</span>
                  <p>${escapeHtml(record.periodLabel)} · 달성값 ${numberFormat(record.actual || 0)}${escapeHtml(record.unit || "")} · ${escapeHtml(record.autoBasis)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      `;
    }
    const selectedRecords = records.filter((record) => record.year === selectedYear);
    const periodLabel = selectedRecords[0]?.periodLabel || academicYearMeta(selectedYear).periodLabel;
    return `
      <div class="kpi-list">
        <div class="kpi-toolbar">
          <label class="kpi-year-select">
            <span>성과 기준 연도</span>
            <select data-filter="kpiYear" aria-label="성과 기준 연도">
              ${KPI_YEARS.map((year) => option(year, `${year}년`, selectedYear)).join("")}
            </select>
          </label>
          <p>${escapeHtml(periodLabel)} 기준으로 달성값과 달성률을 계산합니다.</p>
        </div>
        <div class="table-wrap kpi-table-wrap">
          <table class="kpi-table">
            <thead>
              <tr>
                <th>기간</th>
                <th>성과지표</th>
                <th>추진과제</th>
                <th>목표값</th>
                <th>달성값</th>
                <th>달성률</th>
                <th class="actions-cell">관리</th>
              </tr>
            </thead>
            <tbody>
              ${selectedRecords.map(kpiRecordRow).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function kpiRecordRow(record) {
    const achievement = kpiAchievement(record);
    const isBrandReputation = record.metric === "대학 브랜드평판지수";
    const monthlyStats = isBrandReputation ? brandReputationMonthlyStats(record) : null;
    return `
      <tr data-kpi-row data-id="${escapeAttr(record.id)}">
        <td>
          <div class="stack">
            <strong>${escapeHtml(record.periodLabel)}</strong>
            <span>${escapeHtml(record.autoBasis)}</span>
          </div>
        </td>
        <td class="title-cell">
          <strong>${escapeHtml(record.metric)}</strong>
          <span>${escapeHtml(record.unit || "")}</span>
        </td>
        <td>${escapeHtml(record.task)}</td>
        <td><input class="compact-input kpi-input" type="number" min="0" step="0.01" data-kpi-field="target" value="${escapeAttr(record.target || 0)}" aria-label="${escapeAttr(record.year)} ${escapeAttr(record.metric)} 목표값" /></td>
        <td>
          <div class="stack">
            <strong>${numberFormat(record.actual || 0)}</strong>
            <span>${isBrandReputation ? `${monthlyStats.count}개월 평균` : "자동 집계"}</span>
          </div>
        </td>
        <td>
          <div class="stack">
            <strong>${achievement}%</strong>
            <span>${achievement >= 100 ? "달성" : "진행"}</span>
          </div>
        </td>
        <td class="actions-cell">
          <div class="kpi-row-actions">
            <button class="mini-button" type="button" data-action="save-kpi" data-id="${escapeAttr(record.id)}">목표 저장</button>
            ${
              isBrandReputation
                ? `<button class="mini-button" type="button" data-action="open-kpi-monthly" data-id="${escapeAttr(record.id)}">월별 지수 입력</button>`
                : ""
            }
          </div>
        </td>
      </tr>
    `;
  }

  function openKpiMonthlyModal(id) {
    const record = normalizeKpiRecords(state.kpiRecords).find((item) => item.id === id);
    if (!record || record.metric !== "대학 브랜드평판지수") return;
    const stats = brandReputationMonthlyStats(record);

    openModal(
      `${record.year}년 월별 브랜드평판지수`,
      `
        <form id="kpi-monthly-form" data-form="kpi-monthly">
          <input type="hidden" name="id" value="${escapeAttr(record.id)}" />
          <div class="kpi-modal-summary">
            <strong>현재 평균 ${numberFormat(stats.average)}점</strong>
            <span>입력된 ${stats.count}개월 기준 · 빈 달은 평균에서 제외됩니다.</span>
          </div>
          <div class="kpi-monthly-form-grid">
            ${stats.months
              .map(
                (month) => `
                  <label class="kpi-month-input">
                    <span>${escapeHtml(month.label)}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="${escapeAttr(month.key)}"
                      value="${escapeAttr(month.value)}"
                      placeholder="지수 입력"
                      aria-label="${escapeAttr(month.label)} 대학 브랜드평판지수"
                    />
                  </label>
                `
              )
              .join("")}
          </div>
        </form>
      `,
      `
        <button class="button" type="button" data-action="close-modal">취소</button>
        <button class="button primary" type="submit" form="kpi-monthly-form">저장</button>
      `,
      { className: "kpi-monthly-modal" }
    );
  }

  function saveKpiMonthlyValues(form) {
    const data = formData(form);
    const record = normalizeKpiRecords(state.kpiRecords).find((item) => item.id === data.id);
    if (!record || record.metric !== "대학 브랜드평판지수") return;
    const monthlyValues = Object.fromEntries(
      academicYearMonths(record.year).map(({ key }) => {
        const raw = String(data[key] ?? "").trim();
        return [key, raw === "" ? "" : Math.max(0, Number(raw) || 0)];
      })
    );

    state.kpiRecords = normalizeKpiRecords(state.kpiRecords).map((item) =>
      item.id === record.id
        ? {
            ...item,
            monthlyValues,
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    const stats = brandReputationMonthlyStats({ ...record, monthlyValues });
    addActivity("성과지표", `${record.year}년 대학 브랜드평판지수 월별 값 저장`);
    closeModal();
    saveState();
    renderView();
    toast(`${stats.count}개월 평균 ${numberFormat(stats.average)}점으로 저장했습니다.`);
  }

  function saveKpiRecord(id, button) {
    const row = button.closest("[data-kpi-row]");
    if (!row) return;
    const target = Number(row.querySelector('[data-kpi-field="target"]')?.value || 0);
    state.kpiRecords = normalizeKpiRecords(state.kpiRecords).map((record) =>
      record.id === id
        ? {
            ...record,
            target,
            updatedAt: new Date().toISOString(),
          }
        : record
    );
    addActivity("성과지표", `${id} 저장`);
    saveState();
    renderView();
    toast("성과지표 값을 저장했습니다.");
  }

  function kpiAchievement(record) {
    const target = Number(record.target || 0);
    const actual = Number(record.actual || 0);
    if (!target) return 0;
    return Math.round((actual / target) * 1000) / 10;
  }

  function kpiRecordsWithAutoActual() {
    return normalizeKpiRecords(state.kpiRecords).map((record) => ({
      ...record,
      ...academicYearMeta(record.year),
      actual: autoKpiActual(record),
    }));
  }

  function autoKpiActual(record) {
    if (record.metric === "대학 브랜드평판지수") {
      return brandReputationMonthlyStats(record).average;
    }

    const { from, to } = academicYearRange(record.year);
    const articles = state.articles.filter((item) => isWithinDateRange(item.publishedAt || item.createdAt, from, to));
    if (record.metric === "브랜드 가치증진 활동 실적") {
      return articles.length;
    }
    return 0;
  }

  function academicYearMonths(year) {
    return Array.from({ length: 12 }, (_, index) => {
      const offset = 3 + index;
      const monthYear = Number(year) + Math.floor((offset - 1) / 12);
      const monthNumber = ((offset - 1) % 12) + 1;
      const month = String(monthNumber).padStart(2, "0");
      return {
        key: `${monthYear}-${month}`,
        label: `${monthYear}.${month}`,
      };
    });
  }

  function normalizeKpiMonthlyValues(values, year) {
    const source = values && typeof values === "object" ? values : {};
    return Object.fromEntries(
      academicYearMonths(year).map(({ key }) => {
        const raw = source[key];
        const numeric = Number(raw);
        const value = raw === "" || raw === null || raw === undefined || !Number.isFinite(numeric) ? "" : Math.max(0, numeric);
        return [key, value];
      })
    );
  }

  function brandReputationMonthlyStats(record) {
    const values = normalizeKpiMonthlyValues(record.monthlyValues, record.year);
    const months = academicYearMonths(record.year).map((month) => ({
      ...month,
      value: values[month.key],
    }));
    const entered = months.filter((month) => month.value !== "");
    const average = entered.length
      ? Math.round((entered.reduce((sum, month) => sum + Number(month.value || 0), 0) / entered.length) * 10) / 10
      : 0;
    return {
      months,
      count: entered.length,
      average,
    };
  }

  function currentAcademicYear() {
    const now = new Date();
    return now.getMonth() + 1 >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  }

  function defaultKpiYear() {
    const current = currentAcademicYear();
    if (current <= KPI_YEARS[0]) return KPI_YEARS[0];
    if (current >= KPI_YEARS[KPI_YEARS.length - 1]) return KPI_YEARS[KPI_YEARS.length - 1];
    return current;
  }

  function selectedKpiYear() {
    const fallback = defaultKpiYear();
    const year = Number(filterValue("kpiYear", fallback));
    if (KPI_YEARS.includes(year)) return year;
    ui.filters.kpiYear = String(fallback);
    return fallback;
  }

  function academicYearRange(year) {
    const febLastDay = new Date(year + 1, 2, 0).getDate();
    return {
      from: `${year}-03-01`,
      to: `${year + 1}-02-${String(febLastDay).padStart(2, "0")}`,
    };
  }

  function academicYearMeta(year) {
    const { from, to } = academicYearRange(year);
    return {
      from,
      to,
      periodLabel: `${from.replaceAll("-", ".")} - ${to.replaceAll("-", ".")}`,
    };
  }

  function isWithinDateRange(value, from, to) {
    const date = String(value || "").slice(0, 10);
    return date >= from && date <= to;
  }

  function outletTrendRows() {
    const days = lastNDates(14);
    const byOutlet = {};
    state.articles.forEach((article) => {
      const outlet = article.outlet || "미분류";
      const date = String(article.publishedAt || article.createdAt || "").slice(0, 10);
      if (!days.includes(date)) return;
      if (!byOutlet[outlet]) byOutlet[outlet] = { outlet, total: 0, impact: 0, days: Object.fromEntries(days.map((day) => [day, 0])) };
      byOutlet[outlet].total += 1;
      byOutlet[outlet].impact += articleImpactScore(article);
      byOutlet[outlet].days[date] += 1;
    });
    return Object.values(byOutlet)
      .sort((a, b) => b.total - a.total || b.impact - a.impact)
      .slice(0, 6)
      .map((row) => ({ ...row, series: days.map((day) => row.days[day]) }));
  }

  function outletTrendItem(row) {
    const max = Math.max(1, ...row.series);
    return `
      <article class="trend-row">
        <div class="trend-meta">
          <strong>${escapeHtml(row.outlet)}</strong>
          <span>${row.total}건 · 매체 영향력 ${impactPercent(Math.round(row.impact / Math.max(1, row.total)))}</span>
        </div>
        <div class="sparkline" aria-label="${escapeAttr(row.outlet)} 최근 14일 추이">
          ${row.series.map((value) => `<span style="height:${Math.max(4, Math.round((value / max) * 28))}px" title="${value}건"></span>`).join("")}
        </div>
      </article>
    `;
  }

  function normalizeExternalArticle(item) {
    return {
      id: item.id || uid("ext"),
      title: item.title || "",
      source: item.source || item.category || "외부",
      outlet: item.outlet || "",
      url: item.url || "",
      publishedAt: item.publishedAt || item.createdAt || todayAt(8),
      category: item.category || item.source || "외부",
      sentiment: normalizeSentiment(item.sentiment),
      importance: clamp(Number(item.importance || 50), 1, 100),
      memo: item.memo || "",
    };
  }

  function normalizeCollectedNewsArticle(item) {
    return {
      id: item.id || uid("collected-news"),
      keyword: item.keyword || "조선대",
      title: item.title || "",
      link: item.link || item.url || "",
      source: item.source || item.outlet || "",
      pubDate: item.pubDate || "",
      pubTimestamp: Number(item.pubTimestamp || 0),
      publishedAt: item.publishedAt || "",
      collectedAt: item.collectedAt || "",
    };
  }

  function normalizeMediaMove(item) {
    return {
      id: item.id || uid("move"),
      type: item.type || "동정",
      outlet: item.outlet || "",
      title: normalizeMediaMoveTitle(item),
      person: item.person || "",
      publishedAt: item.publishedAt || item.createdAt || todayAt(8),
      source: item.source || "AI 언론 동정 조사",
      publisher: item.publisher || item.source || "",
      url: item.url || "",
      importance: clamp(Number(item.importance || 50), 1, 100),
      note: item.note || "",
    };
  }

  function normalizeMediaMoveTitle(item) {
    const title = String(item.title || "").trim();
    if (!title) return `${item.outlet || "언론사"} 동정 확인`;
    return title;
  }

  function defaultKpiRecords() {
    const currentYear = Math.max(KPI_YEARS[KPI_YEARS.length - 1], currentAcademicYear());
    const years = Array.from({ length: currentYear - KPI_YEARS[0] + 1 }, (_, index) => KPI_YEARS[0] + index);
    return years.flatMap((year) => [
      {
        id: `brand-reputation-${year}`,
        year,
        metric: "대학 브랜드평판지수",
        task: "대학브랜드 가치 향상을 위한 홍보 역량 강화",
        formula: "한국기업평판연구소 브랜드평판지수",
        autoBasis: "입력한 한국기업평판연구소 월별 지수의 학년도(3월~다음 해 2월) 평균",
        unit: "점",
        target: 1000000,
        actual: 0,
        monthlyValues: Object.fromEntries(academicYearMonths(year).map(({ key }) => [key, ""])),
      },
      {
        id: `brand-exposure-${year}`,
        year,
        metric: "브랜드 가치증진 활동 실적",
        task: "브랜드 가치증진 활동 실적(광고, 홍보물)",
        formula: "광고, 인쇄물, SNS, 방송 등 노출횟수 종합",
        autoBasis: "학년도 기간 내 자동 수집 언론 노출 건수",
        unit: "회",
        target: 1200,
        actual: 0,
      },
    ]);
  }

  function normalizeKpiRecords(records) {
    const byId = new Map((Array.isArray(records) ? records : []).map((record) => [record.id, record]));
    return defaultKpiRecords()
      .map((base) => {
        const saved = byId.get(base.id) || {};
        const isBrandReputation = base.metric === "대학 브랜드평판지수";
        return {
          ...base,
          ...saved,
          year: Number(saved.year || base.year),
          formula: base.formula,
          autoBasis: base.autoBasis,
          target: Number(saved.target ?? base.target ?? 0),
          actual: Number(base.actual ?? 0),
          ...(isBrandReputation
            ? {
                monthlyValues: normalizeKpiMonthlyValues(saved.monthlyValues || base.monthlyValues, saved.year || base.year),
              }
            : {}),
        };
      })
      .sort((a, b) => b.year - a.year || String(a.metric).localeCompare(String(b.metric), "ko"));
  }

  async function refreshMediaMoves(options = {}) {
    const silent = Boolean(options.silent);
    state.meta.mediaMovesStatus = "checking";
    state.meta.mediaMovesMessage = "연합뉴스를 중심으로 광주·전남 언론사 인사·부고를 확인하는 중입니다.";
    if (!silent || ui.view === "mediaMoves") renderView();

    try {
      const payloadItems = await fetchMediaMoveItems();
      const moves = dedupeMediaMoves(payloadItems.map(mediaMoveFromNewsPayload).filter(Boolean));
      const result = mergeMediaMoves(moves);
      state.meta.mediaMovesAt = new Date().toISOString();
      state.meta.mediaMovesStatus = "success";
      state.meta.mediaMovesMessage = moves.length
        ? `언론사 동정 ${moves.length}건을 확인했습니다. 신규 ${result.added}건, 갱신 ${result.updated}건.`
        : "새로운 광주·전남 언론사 인사·부고가 없습니다.";
      if (!silent || result.added || result.updated) addActivity("언론사 동정", `인사·부고 확인: 신규 ${result.added}건, 갱신 ${result.updated}건`);
      saveState();
      if (!silent || ui.view === "mediaMoves") renderView();
      if (!silent) toast(`언론사 동정 새로고침 완료: 신규 ${result.added}건`);
      return result;
    } catch (error) {
      console.error(error);
      state.meta.mediaMovesAt = new Date().toISOString();
      state.meta.mediaMovesStatus = "blocked";
      state.meta.mediaMovesMessage = newsCollectorErrorMessage(error);
      if (!silent) addActivity("언론사 동정", "수집 서버 연결 실패");
      saveState();
      if (!silent || ui.view === "mediaMoves") renderView();
      if (!silent) toast("언론사 동정 새로고침을 완료하지 못했습니다.");
      return { added: 0, updated: 0, total: 0, error };
    }
  }

  function scheduleMediaMoveSync() {
    window.setTimeout(() => {
      if (shouldAutoSyncMediaMoves()) refreshMediaMoves({ silent: true });
    }, 4000);
    window.setInterval(() => {
      if (shouldAutoSyncMediaMoves()) refreshMediaMoves({ silent: true });
    }, MEDIA_MOVE_SYNC_INTERVAL_MS);
  }

  function shouldAutoSyncMediaMoves() {
    if (window.location.protocol === "file:") return false;
    const last = parseDate(state.meta.mediaMovesAt);
    if (!last) return true;
    return Date.now() - last.getTime() > MEDIA_MOVE_SYNC_INTERVAL_MS;
  }

  async function fetchMediaMoveItems() {
    const collected = [];
    let lastError = null;

    for (const query of MEDIA_MOVE_SEARCH_QUERIES) {
      const params = new URLSearchParams({
        query,
        date: ACTUAL_USE_START_DATE,
        scope: "external",
      });
      const apiUrls = [];
      if (window.location.protocol !== "file:") apiUrls.push(`./api/news-monitor?${params.toString()}`);
      apiUrls.push(`${LOCAL_NEWS_MONITOR_URL}?${params.toString()}`);

      let loaded = false;
      for (const apiUrl of apiUrls) {
        try {
          const response = await fetch(apiUrl, {
            method: "GET",
            cache: "no-store",
            credentials: apiUrl.startsWith("http") ? "omit" : "same-origin",
          });
          if (!response.ok) {
            const payload = await readJsonSafely(response);
            throw new Error(payload?.error ? `언론사 동정 검색 실패: ${payload.error}` : `언론사 동정 수집 서버 응답 오류: ${response.status}`);
          }
          const payload = await response.json();
          (Array.isArray(payload.items) ? payload.items : []).forEach((item) => collected.push(item));
          loaded = true;
          break;
        } catch (error) {
          lastError = error;
          console.debug("언론사 동정 수집 API 확인 실패", apiUrl, error);
        }
      }
      if (!loaded) continue;
    }

    if (collected.length) {
      return uniqueByKey(collected, (item) => normalizeArticleUrl(item.url) || `${item.publishedAt}-${item.outlet || item.source}-${item.title}`);
    }
    if (lastError) throw lastError;
    return [];
  }

  function mediaMoveFromNewsPayload(item) {
    if (!item || typeof item !== "object") return null;
    const publisher = normalizeWhitespace(item.outlet || item.source || "");
    const title = cleanCollectedNewsTitle(item.title || "", publisher);
    const type = inferMediaMoveType(title);
    const outlet = inferRegionalMediaOutlet(title);
    const publishedAt = item.publishedAt || item.pubDate || item.createdAt || "";
    if (!type || !outlet || !isOperationalDate(publishedAt)) return null;

    const person = extractMediaMovePerson(title);
    const sourceLabel = publisher || "뉴스 검색";
    return normalizeMediaMove({
      id: `move-${String(publishedAt).slice(0, 10)}-${stableKey(outlet)}-${stableKey(title)}`,
      type,
      outlet,
      title,
      person,
      publishedAt,
      source: sourceLabel,
      publisher: sourceLabel,
      url: item.url || item.link || "",
      importance: mediaMoveImportance(sourceLabel, type),
      note: `${sourceLabel}에서 확인한 ${outlet} ${type}입니다.`,
    });
  }

  function inferMediaMoveType(title) {
    const text = normalizeWhitespace(title);
    if (/^\s*\[?(?:부고|부음)\]?|부친상|모친상|장인상|장모상|빙부상|빙모상|시부상|조부상|조모상|배우자상|별세/.test(text)) return "부고";
    if (/^\s*\[?인사\]?|인사발령|승진|전보|선임|취임|임명|부임/.test(text)) return "인사";
    if (/기자협회|기자상|보도상|편집국장 교체|취재본부장 교체/.test(text)) return "동정";
    return "";
  }

  function inferRegionalMediaOutlet(title) {
    const text = normalizeWhitespace(title).replace(/\s+/g, " ");
    const outlets = [
      ["광주매일신문", /광주매일신문|광주매일/],
      ["KBC 광주방송", /KBC\s*광주방송|KBC광주방송|광주방송/],
      ["광주일보", /광주일보/],
      ["전남일보", /전남일보/],
      ["남도일보", /남도일보/],
      ["무등일보", /무등일보/],
      ["전남매일", /전남매일/],
      ["광남일보", /광남일보/],
      ["광주MBC", /광주\s*MBC|MBC\s*광주/],
      ["목포MBC", /목포\s*MBC|MBC\s*목포/],
      ["여수MBC", /여수\s*MBC|MBC\s*여수/],
      ["KBS광주", /KBS\s*광주|광주\s*KBS/],
      ["KBS목포", /KBS\s*목포|목포\s*KBS/],
      ["광주CBS", /광주\s*CBS|CBS\s*광주/],
      ["전남CBS", /전남\s*CBS|CBS\s*전남/],
      ["광주BBS", /광주\s*BBS|BBS\s*광주/],
      ["CMB광주방송", /CMB\s*광주|광주\s*CMB/],
      ["연합뉴스 광주·전남", /연합뉴스[^)]{0,20}(?:광주|전남)|(?:광주|전남)[^)]{0,20}연합뉴스|광주전남취재본부/],
      ["뉴시스 광주·전남", /뉴시스[^)]{0,20}(?:광주|전남)|(?:광주|전남)[^)]{0,20}뉴시스|광주전남본부/],
      ["뉴스1 광주·전남", /뉴스1[^)]{0,20}(?:광주|전남)|(?:광주|전남)[^)]{0,20}뉴스1/],
      ["광주·전남기자협회", /광주[·\s]?전남(?:사진)?기자(?:협회|회)/],
    ];
    return outlets.find(([, pattern]) => pattern.test(text))?.[0] || "";
  }

  function extractMediaMovePerson(title) {
    const text = normalizeWhitespace(title).replace(/^\s*\[(?:인사|부고|부음)\]\s*/, "");
    return text.match(/^([가-힣]{2,4})(?=\s*씨|\s*\()/)?.[1] || "";
  }

  function mediaMoveImportance(publisher, type) {
    const sourceScore = /연합뉴스/.test(publisher) ? 92 : /뉴시스/.test(publisher) ? 86 : /뉴스1/.test(publisher) ? 84 : 72;
    return clamp(sourceScore + (type === "부고" ? 3 : 0), 1, 100);
  }

  function mediaMoveIdentityKey(item) {
    const date = String(item.publishedAt || item.createdAt || "").slice(0, 10);
    if (item.type === "부고") {
      const person = item.person || extractMediaMovePerson(item.title || "");
      const relation = String(item.title || "").match(/부친상|모친상|장인상|장모상|빙부상|빙모상|시부상|조부상|조모상|배우자상|별세/)?.[0] || "부고";
      if (person) return `부고:${stableKey(person)}:${relation}`;
    }
    if (item.type === "인사" && item.outlet) return `인사:${stableKey(item.outlet)}:${date}`;
    return `${item.type || "동정"}:${stableKey(item.title || "")}:${date}`;
  }

  function mediaMoveSourcePriority(item) {
    const source = `${item.publisher || ""} ${item.source || ""}`;
    if (/연합뉴스/.test(source)) return 100;
    if (/뉴시스/.test(source)) return 90;
    if (/뉴스1/.test(source)) return 85;
    return 70;
  }

  function dedupeMediaMoves(items) {
    const deduped = [];
    items.forEach((raw) => {
      const item = normalizeMediaMove(raw);
      const existingIndex = deduped.findIndex((existing) => isSameMediaMoveEvent(existing, item));
      if (existingIndex < 0) {
        deduped.push(item);
        return;
      }
      if (mediaMoveSourcePriority(item) > mediaMoveSourcePriority(deduped[existingIndex])) deduped[existingIndex] = item;
    });
    return deduped.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  }

  function isSameMediaMoveEvent(left, right) {
    if (!left || !right || left.type !== right.type || stableKey(left.outlet || "") !== stableKey(right.outlet || "")) return false;
    const leftUrl = normalizeArticleUrl(left.url);
    const rightUrl = normalizeArticleUrl(right.url);
    if (leftUrl && rightUrl && leftUrl === rightUrl) return true;
    if (stableKey(String(left.title || "").replace(/\s+/g, "")) === stableKey(String(right.title || "").replace(/\s+/g, ""))) return true;

    if (left.type === "부고") {
      const leftPerson = left.person || extractMediaMovePerson(left.title || "");
      const rightPerson = right.person || extractMediaMovePerson(right.title || "");
      const leftRelation = String(left.title || "").match(/부친상|모친상|장인상|장모상|빙부상|빙모상|시부상|조부상|조모상|배우자상|별세/)?.[0] || "부고";
      const rightRelation = String(right.title || "").match(/부친상|모친상|장인상|장모상|빙부상|빙모상|시부상|조부상|조모상|배우자상|별세/)?.[0] || "부고";
      if (leftPerson && rightPerson && leftPerson === rightPerson && leftRelation === rightRelation) return true;
    }

    const leftDate = parseDate(left.publishedAt || left.createdAt);
    const rightDate = parseDate(right.publishedAt || right.createdAt);
    if (!leftDate || !rightDate) return mediaMoveIdentityKey(left) === mediaMoveIdentityKey(right);
    const dayGap = Math.abs(Math.round((leftDate.getTime() - rightDate.getTime()) / 86400000));
    const titleSimilarity = articleTokenSimilarity(left.title || "", right.title || "");
    return dayGap <= 7 && titleSimilarity >= 0.55;
  }

  function mergeMediaMoves(items) {
    let added = 0;
    let updated = 0;
    state.mediaMoves = Array.isArray(state.mediaMoves) ? state.mediaMoves.map(normalizeMediaMove) : [];

    items.forEach((raw) => {
      const item = normalizeMediaMove(raw);
      const existingIndex = state.mediaMoves.findIndex((existing) => isSameMediaMoveEvent(existing, item));
      if (existingIndex < 0) {
        state.mediaMoves.unshift(item);
        added += 1;
        return;
      }

      const existing = state.mediaMoves[existingIndex];
      if (mediaMoveSourcePriority(item) >= mediaMoveSourcePriority(existing)) {
        const merged = normalizeMediaMove({ ...existing, ...item, id: existing.id || item.id });
        if (JSON.stringify(merged) !== JSON.stringify(existing)) {
          state.mediaMoves[existingIndex] = merged;
          updated += 1;
        }
      }
    });

    state.mediaMoves = filterOperationalItems(dedupeMediaMoves(state.mediaMoves), (item) => item.publishedAt || item.createdAt);
    return { added, updated, total: items.length };
  }

  function lastNDates(count) {
    return Array.from({ length: count }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (count - 1 - index));
      return toDateTimeString(date).slice(0, 10);
    });
  }

  function formatKoreanDate(value) {
    const date = parseDate(value);
    if (!date) return value || "";
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}(${weekdays[date.getDay()]})`;
  }

  function monitoringReportData(articles) {
    articles = dedupeArticles(articles);
    const totalImpact = articles.reduce((sum, item) => sum + articleImpactScore(item), 0);
    const articleCount = articles.length;
    const outletCounts = countBy(articles.filter((item) => isResolvedNewsOutlet(item.outlet)), "outlet");
    const outletEntries = Object.entries(outletCounts).sort((a, b) => b[1] - a[1]);
    const topOutlet = outletEntries[0]?.[0] || "";
    const topOutletCount = outletEntries[0]?.[1] || 0;
    const matchTotal = articles.reduce((sum, item) => sum + Number(item.matchScore || 0), 0);
    const today = todayDate();

    return {
      articleCount,
      todayCount: articles.filter((item) => String(item.publishedAt || item.createdAt || "").startsWith(today)).length,
      totalImpact,
      avgImpact: articleCount ? Math.round(totalImpact / articleCount) : 0,
      avgMatch: articleCount ? Math.round(matchTotal / articleCount) : 0,
      negativeCount: articles.filter((item) => item.sentiment === "negative").length,
      highRiskCount: articles.filter((item) => item.risk === "high").length,
      topOutlet,
      topOutletCount,
      outletCounts,
      mediaTypeCounts: countBy(articles, "mediaType"),
      channelCounts: countByChannels(articles),
      sentimentCounts: countBy(articles, "sentiment"),
      riskCounts: countBy(articles, "risk"),
      dailyTrend: monitoringDailyTrend(articles),
      topArticles: topArticleGroups(articles),
    };
  }

  function monitoringDailyTrend(articles) {
    return lastNDates(7).map((date) => {
      const items = articles.filter((item) => String(item.publishedAt || item.createdAt || "").startsWith(date));
      return {
        date,
        count: items.length,
        impact: items.reduce((sum, item) => sum + articleImpactScore(item), 0),
      };
    });
  }

  function reportData(from, to) {
    const inRange = (value) => {
      const date = String(value || "").slice(0, 10);
      return date >= from && date <= to;
    };
    const releases = state.releases.filter((item) => inRange(item.publishAt || item.createdAt));
    const articles = state.articles.filter((item) => inRange(item.publishedAt || item.createdAt));
    const matchedReleaseIds = new Set(articles.map((item) => item.releaseId).filter(Boolean));
    const conversionRate = releases.length ? Math.round((matchedReleaseIds.size / releases.length) * 100) : 0;
    const sentimentCounts = countBy(articles, "sentiment");
    const outletCounts = countBy(articles.filter((item) => isResolvedNewsOutlet(item.outlet)), "outlet");
    const mediaTypeCounts = countBy(articles, "mediaType");
    const channelCounts = countByChannels(articles);
    const totalImpact = articles.reduce((sum, item) => sum + articleImpactScore(item), 0);
  const topRelease = releases
    .map((release) => ({ release, stats: releaseArticleStats(release, articles) }))
      .sort((a, b) => b.stats.articleCount - a.stats.articleCount || b.stats.totalImpact - a.stats.totalImpact)[0];
    const negative = articles.filter((item) => item.sentiment === "negative").length;
    const highRisk = articles.filter((item) => item.risk === "high").length;

    return {
      from,
      to,
      releaseCount: releases.length,
      articleCount: articles.length,
      conversionRate,
      sentimentCounts,
      outletCounts,
      mediaTypeCounts,
      channelCounts,
      totalImpact,
      avgImpact: articles.length ? Math.round(totalImpact / articles.length) : 0,
      rows: [
        { item: "보도자료", value: String(releases.length), memo: "기간 내 작성·예약·배포 기준" },
        { item: "모니터링 기사", value: String(articles.length), memo: "등록 기사 기준" },
        { item: "기사화 보도자료", value: String(matchedReleaseIds.size), memo: "기사와 연결된 보도자료 수" },
        { item: "기사화율", value: `${conversionRate}%`, memo: "연결 보도자료 / 기간 보도자료" },
        { item: "매체 영향력", value: impactPercent(articles.length ? Math.round(totalImpact / articles.length) : 0), memo: "100% 기준 평균 매체 영향력" },
        {
          item: "최고 성과 보도자료",
          value: topRelease?.release?.title || "-",
          memo: topRelease ? `${topRelease.stats.articleCount}건 · 매체 영향력 ${impactPercent(topRelease.stats.avgImpact)}` : "기간 내 성과 없음",
        },
        { item: "부정 기사", value: String(negative), memo: "감성 분류 기준" },
        { item: "긴급 위험", value: String(highRisk), memo: "위험도 긴급 기준" },
      ],
    };
  }

  function normalizeRelease(item) {
    const knownOfficialDate = item.sourceType === "official-homepage" || isCurrentOfficialReleaseSource(item.sourceUrl)
      ? officialKnownPublishAt(item.sourceUrl)
      : "";
    const normalized = {
      ...item,
      subtitle: item.subtitle || item.summary || "",
      summary: item.summary || item.subtitle || "",
      status: item.status || "distributed",
      category: item.category || "기타",
      publishAt: normalizeReleaseDate(knownOfficialDate || item.publishAt || item.createdAt || todayDate()),
      tags: Array.isArray(item.tags) ? item.tags : splitComma(item.tags),
      groups: Array.isArray(item.groups) ? item.groups : splitComma(item.groups),
      attachments: Array.isArray(item.attachments) ? item.attachments : splitLines(item.attachments),
      sourceType: item.sourceType || "manual",
      sourceName: item.sourceName || (item.sourceType === "official-homepage" ? OFFICIAL_RELEASE_LABEL : "수동 등록"),
      sourceUrl: item.sourceUrl || "",
      sourceId: item.sourceId || "",
      syncedAt: item.syncedAt || "",
    };
    normalized.expectedOutlets = Math.max(1, Number(item.expectedOutlets || estimateExpectedOutlets(normalized)));
    if (!normalized.tags.length) normalized.tags = extractKeywords(`${normalized.title} ${normalized.subtitle} ${normalized.body}`, 6);
    return normalized;
  }

  function normalizeArticle(item, releases = []) {
    item.mediaType = normalizeMediaType(item.mediaType, item.outlet);
    item.channel = normalizeChannel(item.channel, item.url, item.mediaType);
    item.influenceScore = clamp(Number(item.influenceScore || 0) || mediaTypes[item.mediaType]?.defaultInfluence || mediaTypes.other.defaultInfluence, 1, 100);
    item.matchScore = Number(item.matchScore || 0);
    item.keywords = Array.isArray(item.keywords) ? item.keywords : splitComma(item.keywords);
    if (!item.keywords.length) item.keywords = extractKeywords(`${item.title} ${item.excerpt}`, 5);
    if (!item.releaseId && releases.length) autoMatchArticle(item, releases);
    if (item.releaseId && !item.matchScore) {
      const release = releases.find((releaseItem) => releaseItem.id === item.releaseId);
      item.matchScore = release ? matchArticleToRelease(item, release).score : 0;
    }
    item.attentionReason = item.attentionReason || articleAttentionReason(item);
    item.sourceType = item.sourceType || "manual";
    return item;
  }

  function articleOrganizationText(article, releases = []) {
    const excerpt = normalizeWhitespace(article?.excerpt || "");
    const meaningfulExcerpt = /관련 기사입니다|키워드\s*["']?.+["']?\s*로 수집|뉴스 모니터링 새로고침|뉴스 수집기로 저장/.test(excerpt) ? "" : excerpt;
    const release = releases.find((item) => item.id === article?.releaseId);
    return normalizeWhitespace([
      article?.title,
      meaningfulExcerpt,
      article?.summary,
      article?.body,
      article?.description,
      release?.title,
      release?.summary,
      release?.body,
    ].filter(Boolean).join(" "));
  }

  function isAffiliatedOnlyArticle(article, releases = []) {
    const text = articleOrganizationText(article, releases);
    const hospitalPattern = /조선대학교(?:치과|한방)?\s*병원|조선대(?:치과|한방)?\s*병원/i;
    if (!hospitalPattern.test(text)) return false;
    const withoutHospitalName = text
      .replace(/조선대학교(?:치과|한방)?\s*병원/gi, " ")
      .replace(/조선대(?:치과|한방)?\s*병원/gi, " ");
    return !/조선대학교|조선대/i.test(withoutHospitalName);
  }

  function resolvePortalArticleOutlets(articles) {
    const items = Array.isArray(articles) ? articles : [];
    const candidates = items.filter((article) => isResolvedNewsOutlet(article.outlet));
    return items.map((article) => {
      if (!isPortalArticle(article)) return article;
      const articleTime = articleDateTimestamp(article.publishedAt || article.createdAt);
      const articleTitle = normalizedPortalArticleTitle(article.title);
      const matches = candidates
        .map((candidate) => {
          const candidateTime = articleDateTimestamp(candidate.publishedAt || candidate.createdAt);
          const distance = articleTime && candidateTime ? Math.abs(articleTime - candidateTime) : Number.MAX_SAFE_INTEGER;
          const exactTitle = articleTitle && articleTitle === normalizedPortalArticleTitle(candidate.title);
          const similarity = exactTitle ? 1 : articleGroupSimilarity(article, candidate);
          return { candidate, distance, similarity, exactTitle };
        })
        .filter((item) => item.distance <= 2 * 86400000 && (item.exactTitle || item.similarity >= 0.82))
        .sort((a, b) => Number(b.exactTitle) - Number(a.exactTitle) || b.similarity - a.similarity || a.distance - b.distance);
      const matched = matches[0]?.candidate;
      if (!matched) {
        return {
          ...article,
          outlet: "원문 언론사 확인 중",
          portalOutlet: article.portalOutlet || article.outlet || "네이트",
          portalUrl: article.portalUrl || article.url || "",
        };
      }
      const mediaType = normalizeMediaType("", matched.outlet);
      return {
        ...article,
        outlet: matched.outlet,
        portalOutlet: article.portalOutlet || article.outlet || "네이트",
        portalUrl: article.portalUrl || article.url || "",
        url: matched.url || article.url || "",
        mediaType,
        influenceScore: Number(matched.influenceScore || 0) || mediaTypes[mediaType]?.defaultInfluence || mediaTypes.other.defaultInfluence,
      };
    });
  }

  function isPortalArticle(article) {
    return isPortalOutletName(article?.outlet);
  }

  function isPortalOutletName(value) {
    return /^(?:네이트(?:\s*뉴스)?|nate(?:\s*뉴스)?|원문 언론사 확인 중)$/i.test(normalizeWhitespace(value));
  }

  function isResolvedNewsOutlet(value) {
    const outlet = normalizeWhitespace(value);
    return Boolean(outlet) && !isPortalOutletName(outlet);
  }

  function normalizedPortalArticleTitle(value) {
    return normalizeArticleComparableText(value)
      .replace(/\s+-\s+[^-]+$/g, "")
      .replace(/[^0-9a-z가-힣]+/g, "");
  }

  function scheduleOfficialReleaseSync() {
    window.setTimeout(() => {
      if (shouldAutoSyncOfficialReleases()) refreshOfficialReleases({ silent: true });
    }, 700);
    window.setInterval(() => {
      if (shouldAutoSyncOfficialReleases()) refreshOfficialReleases({ silent: true });
    }, OFFICIAL_SYNC_INTERVAL_MS);
  }

  function shouldAutoSyncOfficialReleases() {
    if (window.location.protocol === "file:") return false;
    const last = parseDate(state.meta.homepageScanAt);
    if (!last) return true;
    return Date.now() - last.getTime() > OFFICIAL_SYNC_INTERVAL_MS;
  }

  async function refreshMonitoringData() {
    state.meta.articleScanStatus = "checking";
    state.meta.articleScanMessage = `${ARTICLE_COLLECTION_START_DATE} 이후 중복되지 않은 기사와 외부 동향을 수집하는 중입니다.`;
    renderView();
    await refreshOfficialReleases({ silent: true });
    await collectNewsNow({ fromMonitoring: true });
    await refreshArticleMonitoring({ silent: true });
    await refreshExternalMonitoring({ silent: true });
  }

  async function collectNewsNow(options = {}) {
    const fromMonitoring = Boolean(options.fromMonitoring);
    state.meta.newsCollectorStatus = "checking";
    state.meta.newsCollectorMessage = "keywords.json 키워드로 구글 뉴스 RSS를 수집하는 중입니다.";
    if (!fromMonitoring) renderView();

    try {
      const payload = await requestNewsCollect();
      applyNewsCollectorPayload(payload);
      const result = mergeCollectedArticles(state.collectedNewsArticles.map(articleFromCollectedNews).filter(Boolean));
      const failedCount = Array.isArray(payload.failed) ? payload.failed.length : 0;
      const allFailed = failedCount > 0 && !Number(payload.seen || 0);

      state.meta.newsCollectorStatus = allFailed ? "blocked" : "success";
      state.meta.newsCollectorMessage = allFailed
        ? `구글 뉴스 RSS 접속이 실패했습니다. ${payload.failed?.[0]?.error || ""}`
        : `수집 완료: RSS ${payload.seen || 0}건 확인, 신규 ${payload.inserted || 0}건 저장.`;
      state.meta.articleScanStatus = state.meta.newsCollectorStatus;
      state.meta.articleScanMessage = allFailed
        ? state.meta.newsCollectorMessage
        : `${ARTICLE_COLLECTION_START_DATE} 이후 SQLite 저장 기사 ${state.collectedNewsArticles.length}건을 최신순으로 불러왔습니다.`;
      state.meta.aiScanAt = new Date().toISOString();
      addActivity("뉴스 수집", `RSS 수집 신규 ${payload.inserted || 0}건, 모니터링 반영 ${result.added}건`);
      saveState();
      renderView();
      toast(`뉴스 수집 완료: 신규 ${payload.inserted || 0}건`);
      return payload;
    } catch (error) {
      console.error(error);
      state.meta.newsCollectorStatus = "blocked";
      state.meta.newsCollectorMessage = newsCollectorErrorMessage(error);
      state.meta.articleScanStatus = "blocked";
      state.meta.articleScanMessage = state.meta.newsCollectorMessage;
      saveState();
      renderView();
      toast("뉴스 수집을 완료하지 못했습니다.");
      return null;
    }
  }

  function applyNewsCollectorPayload(payload = {}) {
    const keywords = Array.isArray(payload.keywords) && payload.keywords.length ? payload.keywords : state.collectedNewsKeywords || ["조선대"];
    state.collectedNewsKeywords = keywords;
    state.collectedNewsArticles = (Array.isArray(payload.items) ? payload.items : []).map(normalizeCollectedNewsArticle);
  }

  async function refreshExternalMonitoring(options = {}) {
    const silent = Boolean(options.silent);
    try {
      const items = await fetchExternalMonitorItems();
      const result = mergeExternalArticles(items);
      state.meta.externalScanAt = new Date().toISOString();
      state.meta.externalScanStatus = "success";
      state.meta.externalScanMessage = items.length
        ? `타대학·교육부 기사 ${items.length}건을 확인했습니다. 신규 ${result.added}건, 갱신 ${result.updated}건.`
        : `${ARTICLE_COLLECTION_START_DATE} 이후 타대학·교육부 관련 새 기사를 아직 찾지 못했습니다.`;
      addActivity("외부 모니터링", `타대학·교육부 확인: 신규 ${result.added}건, 갱신 ${result.updated}건`);
      saveState();
      if (!silent || ui.view === "dashboard" || ui.view === "monitoring") renderView();
      return result;
    } catch (error) {
      console.error(error);
      state.meta.externalScanAt = new Date().toISOString();
      state.meta.externalScanStatus = "blocked";
      state.meta.externalScanMessage = "타대학·교육부 모니터링은 자동 수집 서버가 필요합니다. start-platform.cmd로 실행한 뒤 다시 새로고침하세요.";
      saveState();
      if (!silent || ui.view === "dashboard" || ui.view === "monitoring") renderView();
      return { added: 0, updated: 0, total: 0, error };
    }
  }

  async function fetchExternalMonitorItems() {
    const collected = [];
    let lastError = null;
    for (const config of EXTERNAL_MONITOR_QUERIES) {
      const params = new URLSearchParams({
        query: config.query,
        date: ARTICLE_COLLECTION_START_DATE,
        scope: "external",
      });
      const apiUrls = [];
      if (window.location.protocol !== "file:") apiUrls.push(`./api/news-monitor?${params.toString()}`);
      apiUrls.push(`${LOCAL_NEWS_MONITOR_URL}?${params.toString()}`);

      let loaded = false;
      for (const apiUrl of apiUrls) {
        try {
          const response = await fetch(apiUrl, {
            method: "GET",
            cache: "no-store",
            credentials: apiUrl.startsWith("http") ? "omit" : "same-origin",
          });
          if (!response.ok) {
            const payload = await readJsonSafely(response);
            throw new Error(payload?.error || `외부 모니터링 응답 오류: ${response.status}`);
          }
          const payload = await response.json();
          (Array.isArray(payload.items) ? payload.items : []).forEach((item) => {
            const external = externalArticleFromNewsPayload(item, config);
            if (external) collected.push(external);
          });
          loaded = true;
          break;
        } catch (error) {
          lastError = error;
          console.debug("외부 모니터링 API 확인 실패", apiUrl, error);
        }
      }
      if (!loaded) continue;
    }

    if (!collected.length && lastError) throw lastError;
    return uniqueByKey(collected, (item) => normalizeArticleUrl(item.url) || `${item.publishedAt}-${item.outlet}-${item.title}`).slice(0, 80);
  }

  function externalArticleFromNewsPayload(item, config) {
    if (!item || typeof item !== "object") return null;
    const title = normalizeWhitespace(item.title || "");
    const outlet = normalizeWhitespace(item.outlet || item.source || "");
    const rawUrl = normalizeWhitespace(item.url || "");
    const publishedAt = normalizeWhitespace(item.publishedAt || "");
    if (!title || !rawUrl || !publishedAt) return null;
    const text = `${title} ${outlet} ${config.query}`;
    return normalizeExternalArticle({
      id: `ext-${publishedAt.slice(0, 10)}-${stableKey(outlet)}-${stableKey(title)}`,
      title,
      source: config.category,
      outlet,
      url: safeUrl(rawUrl, window.location.href),
      publishedAt,
      category: config.category,
      sentiment: normalizeSentiment(item.sentiment),
      importance: externalMonitorImportance(text, config.category, item.influenceScore),
      memo: externalMonitorMemo(text, config.category),
    });
  }

  function mergeExternalArticles(items) {
    let added = 0;
    let updated = 0;
    items.forEach((item) => {
      const article = normalizeExternalArticle(item);
      const currentIndex = state.externalArticles.findIndex((current) => isSameExternalArticle(current, article));
      if (currentIndex >= 0) {
        state.externalArticles[currentIndex] = normalizeExternalArticle({
          ...state.externalArticles[currentIndex],
          ...article,
        });
        updated += 1;
      } else {
        state.externalArticles.unshift(article);
        added += 1;
      }
    });
    state.externalArticles = filterArticleItems(state.externalArticles)
      .map(normalizeExternalArticle)
      .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
      .slice(0, 80);
    return { added, updated, total: items.length };
  }

  function isSameExternalArticle(left, right) {
    const leftUrl = normalizeArticleUrl(left.url);
    const rightUrl = normalizeArticleUrl(right.url);
    if (leftUrl && rightUrl && leftUrl === rightUrl) return true;
    return (
      normalizeOutlet(left.outlet) === normalizeOutlet(right.outlet) &&
      stableKey(left.title) === stableKey(right.title) &&
      String(left.publishedAt || "").slice(0, 10) === String(right.publishedAt || "").slice(0, 10)
    );
  }

  function externalMonitorImportance(text, category, influenceScore) {
    const base = category === "교육부" ? 86 : 72;
    const score = Number(influenceScore || 0) || base;
    const policyBonus = /교육부|RISE|글로컬|재정지원|대학평가|정원|의대|첨단|등록금|대학혁신/.test(text) ? 8 : 0;
    const regionBonus = /전남대|광주대|호남대|광주여대|광주|전남/.test(text) ? 5 : 0;
    return clamp(Math.round(score + policyBonus + regionBonus), 1, 100);
  }

  function externalMonitorMemo(text, category) {
    if (category === "교육부") return "교육부 정책·재정지원·대학평가 흐름을 조선대 홍보 메시지와 함께 확인할 필요가 있습니다.";
    if (/입학|수시|정시|모집/.test(text)) return "타대학 입시 홍보 흐름과 비교해 조선대 모집 메시지 보강 여부를 검토합니다.";
    if (/AI|첨단|산학|창업|연구|글로컬/.test(text)) return "타대학 연구·산학 성과와 비교해 조선대 강점 보도자료의 후속 확산을 검토합니다.";
    return "지역 주요 대학 이슈로 조선대 보도 전략과 비교해 볼 필요가 있습니다.";
  }

  async function requestNewsCollect() {
    const response = await fetch(newsApiUrl("collect"), {
      method: "POST",
      cache: "no-store",
      credentials: "omit",
    });
    return readCollectorResponse(response);
  }

  async function readCollectorResponse(response) {
    const payload = await readJsonSafely(response);
    if (!response.ok || payload?.error) throw new Error(payload?.error || `뉴스 수집 서버 응답 오류: ${response.status}`);
    return payload || {};
  }

  function newsApiUrl(kind) {
    const local = {
      collect: LOCAL_NEWS_COLLECT_URL,
      articles: LOCAL_NEWS_ARTICLES_URL,
      keywords: LOCAL_NEWS_KEYWORDS_URL,
    }[kind];
    if (window.location.protocol === "file:") return local;
    return {
      collect: "./api/news-collect",
      articles: "./api/news-articles",
      keywords: "./api/news-keywords",
    }[kind] || local;
  }

  function articleFromCollectedNews(item) {
    item = normalizeCollectedNewsArticle(item);
    if (!item.title || !item.link) return null;
    const title = cleanCollectedNewsTitle(item.title, item.source);
    const text = `${title} ${item.source || ""}`;
    return normalizeArticle(
      {
        id: `collector-${item.id || stableKey(item.link)}`,
        title,
        outlet: item.source || "Google 뉴스",
        reporter: "RSS 수집",
        url: item.link,
        publishedAt: item.publishedAt || todayAt(8),
        sentiment: sentimentFromNewsTitle(text),
        topic: inferOfficialCategory(text),
        mediaType: normalizeMediaType("", item.source || ""),
        channel: "online",
        influenceScore: 0,
        releaseId: "",
        matchScore: 0,
        keywords: [...new Set([item.keyword, ...extractKeywords(text, 5)].filter(Boolean))],
        risk: riskFromNewsTitle(text),
        status: "unreviewed",
        excerpt: `${item.source || "해당 매체"} 보도 기사입니다. 키워드 "${item.keyword || "조선대"}"로 수집됐습니다.`,
        memo: "SQLite 뉴스 수집기로 저장된 기사입니다.",
        attentionReason: articleAttentionReason({ title: item.title, outlet: item.source, mediaType: normalizeMediaType("", item.source || ""), sentiment: sentimentFromNewsTitle(text), risk: riskFromNewsTitle(text), keywords: [item.keyword] }),
        sourceType: "sqlite-news-collector",
        createdAt: item.collectedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      state.releases
    );
  }

  function cleanCollectedNewsTitle(title, outlet) {
    const text = normalizeWhitespace(title);
    const source = normalizeWhitespace(outlet || "");
    if (!source) return text;
    return normalizeWhitespace(text.replace(new RegExp(`\\s+-\\s+${escapeRegExp(source)}$`), ""));
  }

  function sentimentFromNewsTitle(text) {
    if (/논란|비판|부실|사고|수사|고발|감사|징계|피해|갈등|반발|의혹|부정|위반/.test(text)) return "negative";
    if (/선정|수상|협약|개소|성과|기부|장학|취업|봉사|글로벌|연구|유치|최우수/.test(text)) return "positive";
    return "neutral";
  }

  function riskFromNewsTitle(text) {
    if (/사고|수사|고발|감사|징계|피해|의혹|위반/.test(text)) return "high";
    if (/논란|비판|갈등|반발|부실/.test(text)) return "medium";
    return "low";
  }

  function newsCollectorErrorMessage(error) {
    const message = String(error?.message || "");
    if (/Failed to fetch|NetworkError|Load failed|연결|fetch/i.test(message)) {
      return "뉴스 수집은 서버 실행이 필요합니다. start-platform.cmd로 실행한 뒤 다시 시도하세요.";
    }
    return `뉴스 수집 실패: ${message}`;
  }

  async function refreshArticleMonitoring(options = {}) {
    const silent = Boolean(options.silent);
    try {
      const items = await fetchNewsMonitorItems();
      const articles = filterArticleItems(items.map(articleFromNewsPayload).filter(Boolean));
      const result = mergeCollectedArticles(articles);

      state.articles = dedupeArticles(filterArticleItems(state.articles));
      state.affiliatedArticles = dedupeArticles(filterArticleItems(state.affiliatedArticles));
      runAutoMatch(false);
      state.meta.aiScanAt = new Date().toISOString();
      state.meta.articleScanStatus = "success";
      state.meta.articleScanMessage = articles.length
        ? `${ARTICLE_COLLECTION_START_DATE} 이후 기사 ${articles.length}건을 확인했습니다. 신규 ${result.added}건, 갱신 ${result.updated}건.`
        : `${ARTICLE_COLLECTION_START_DATE} 이후 조선대학교 관련 새 기사를 아직 찾지 못했습니다.`;
      addActivity("기사 새로고침", `${ARTICLE_COLLECTION_START_DATE} 이후 기사 확인: 신규 ${result.added}건, 갱신 ${result.updated}건`);
      saveState();
      if (!silent || ui.view === "dashboard" || ui.view === "monitoring" || ui.view === "releases") renderView();
      if (!silent) toast(`기사 새로고침 완료: 신규 ${result.added}건`);
      return result;
    } catch (error) {
      console.error(error);
      state.articles = dedupeArticles(filterArticleItems(state.articles));
      state.affiliatedArticles = dedupeArticles(filterArticleItems(state.affiliatedArticles));
      state.meta.aiScanAt = new Date().toISOString();
      state.meta.articleScanStatus = "blocked";
      state.meta.articleScanMessage = articleScanErrorMessage(error);
      addActivity("기사 새로고침", "수집 서버 연결 실패");
      saveState();
      if (!silent || ui.view === "dashboard" || ui.view === "monitoring" || ui.view === "releases") renderView();
      if (!silent) toast("기사 새로고침을 완료하지 못했습니다.");
      return { added: 0, updated: 0, total: 0, error };
    }
  }

  async function fetchNewsMonitorItems() {
    const collected = [];
    let lastError = null;
    for (const query of newsMonitorQueries()) {
      const params = new URLSearchParams({
        query,
        date: ARTICLE_COLLECTION_START_DATE,
      });
      const apiUrls = [];
      if (window.location.protocol !== "file:") apiUrls.push(`./api/news-monitor?${params.toString()}`);
      apiUrls.push(`${LOCAL_NEWS_MONITOR_URL}?${params.toString()}`);

      let loaded = false;
      for (const apiUrl of apiUrls) {
        try {
          const response = await fetch(apiUrl, {
            method: "GET",
            cache: "no-store",
            credentials: apiUrl.startsWith("http") ? "omit" : "same-origin",
          });
          if (!response.ok) {
            const payload = await readJsonSafely(response);
            throw new Error(payload?.error ? `뉴스 검색 응답 실패: ${payload.error}` : `기사 수집 서버 응답 오류: ${response.status}`);
          }
          const payload = await response.json();
          (Array.isArray(payload.items) ? payload.items : []).forEach((item) => collected.push(item));
          loaded = true;
          break;
        } catch (error) {
          lastError = error;
          console.debug("기사 수집 API 확인 실패", apiUrl, error);
        }
      }
      if (!loaded) continue;
    }

    if (collected.length) {
      return uniqueByKey(collected, (item) => normalizeArticleUrl(item.url) || `${item.publishedAt}-${item.outlet || item.source}-${item.title}`);
    }
    throw lastError || new Error("기사 수집 서버에 연결할 수 없습니다.");
  }

  function newsMonitorQueries() {
    const queries = ['"조선대학교" OR "조선대"', "조선대", "조선대학교"];
    state.releases
      .filter((release) => isOperationalDate(release.publishAt || release.createdAt))
      .sort(sortByReleaseDate)
      .slice(0, 40)
      .forEach((release) => {
        releaseNewsSearchQueries(release).forEach((query) => queries.push(query));
      });
    return [...new Set(queries.map(normalizeWhitespace).filter(Boolean))].slice(0, 120);
  }

  function releaseNewsSearchQueries(release) {
    const text = normalizeArticleComparableText(`${release.title || ""} ${release.summary || ""} ${(release.tags || []).join(" ")}`);
    const tokens = tokenizeForMatch(text)
      .filter((token) => !articleGroupStopwords().has(token))
      .filter((token) => token.length >= 2)
      .slice(0, 6);
    const title = normalizeArticleComparableText(release.title || "")
      .replace(/\s+/g, " ")
      .trim();
    return [
      title ? `"${title}"` : "",
      tokens.length ? `조선대 ${tokens.join(" ")}` : "",
      tokens.length >= 3 ? `${tokens.slice(0, 4).join(" ")}` : "",
    ].filter(Boolean);
  }

  function releaseNewsSearchQuery(release) {
    return releaseNewsSearchQueries(release)[1] || releaseNewsSearchQueries(release)[0] || "";
  }

  async function readJsonSafely(response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function articleScanErrorMessage(error) {
    const message = String(error?.message || "");
    if (/뉴스 검색 응답 실패|응답 오류/.test(message)) {
      return `수집 서버는 연결됐지만 외부 뉴스 검색이 실패했습니다. ${message}`;
    }
    return "2026-07-09 이후 기사 수집을 위해 자동 수집 서버가 필요합니다. start-platform.cmd로 실행한 뒤 다시 새로고침하세요.";
  }

  function articleFromNewsPayload(item) {
    if (!item || typeof item !== "object") return null;
    const title = normalizeWhitespace(item.title || "");
    const outlet = normalizeWhitespace(item.outlet || item.source || "");
    const url = safeUrl(item.url || "", window.location.href);
    const publishedAt = normalizeWhitespace(item.publishedAt || "");
    if (!title || !outlet || !url || !publishedAt) return null;

    return normalizeArticle(
      {
        id: item.id || `news-${publishedAt.slice(0, 10)}-${stableKey(outlet)}-${stableKey(title)}`,
        title,
        outlet,
        reporter: item.reporter || "자동 수집",
        url,
        publishedAt,
        sentiment: normalizeSentiment(item.sentiment),
        topic: item.topic || "기타",
        mediaType: item.mediaType || normalizeMediaType("", outlet),
        channel: item.channel || "online",
        influenceScore: Number(item.influenceScore || 0),
        releaseId: item.releaseId || "",
        matchScore: Number(item.matchScore || 0),
        keywords: Array.isArray(item.keywords) ? item.keywords : splitComma(item.keywords),
        risk: normalizeRisk(item.risk),
        status: item.status || "unreviewed",
        excerpt: item.excerpt || `${outlet}에서 보도한 조선대학교 관련 기사입니다.`,
        memo: item.memo || "뉴스 모니터링 새로고침으로 자동 수집되었습니다.",
        attentionReason: item.attentionReason || "",
        portalOutlet: item.portalOutlet || "",
        portalUrl: item.portalUrl || "",
        sourceType: "news-monitor",
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      },
      state.releases
    );
  }

  function mergeCollectedArticles(items) {
    let added = 0;
    let updated = 0;
    state.articles = Array.isArray(state.articles) ? state.articles : [];
    state.affiliatedArticles = Array.isArray(state.affiliatedArticles) ? state.affiliatedArticles : [];
    items.forEach((item) => {
      let article = normalizeArticle(item, state.releases);
      const targetName = isAffiliatedOnlyArticle(article, state.releases) ? "affiliatedArticles" : "articles";
      const otherName = targetName === "articles" ? "affiliatedArticles" : "articles";
      const otherIndex = state[otherName].findIndex((current) => isSameArticle(current, article));
      let movedArticle = null;
      if (otherIndex >= 0) {
        movedArticle = state[otherName].splice(otherIndex, 1)[0];
        article = normalizeArticle({
          ...movedArticle,
          ...article,
          ...preferredArticleOutletFields(movedArticle, article),
          createdAt: movedArticle.createdAt || article.createdAt,
        }, state.releases);
      }
      const currentIndex = state[targetName].findIndex((current) => isSameArticle(current, article));
      if (currentIndex >= 0) {
        const current = state[targetName][currentIndex];
        state[targetName][currentIndex] = normalizeArticle({
          ...current,
          ...article,
          ...preferredArticleOutletFields(current, article),
          createdAt: current.createdAt || article.createdAt,
          updatedAt: new Date().toISOString(),
        }, state.releases);
        updated += 1;
      } else {
        state[targetName].unshift(article);
        if (movedArticle) updated += 1;
        else added += 1;
      }
    });
    const allArticles = resolvePortalArticleOutlets(dedupeArticles(
      [...state.articles, ...state.affiliatedArticles]
        .map((article) => normalizeArticle(article, state.releases))
    ));
    state.articles = filterArticleItems(allArticles.filter((article) => !isAffiliatedOnlyArticle(article, state.releases)));
    state.affiliatedArticles = filterArticleItems(allArticles.filter((article) => isAffiliatedOnlyArticle(article, state.releases)));
    return { added, updated, total: items.length };
  }

  function preferredArticleOutletFields(current, incoming) {
    if (isResolvedNewsOutlet(incoming?.outlet)) {
      return {
        outlet: incoming.outlet,
        url: incoming.url || current?.url || "",
        mediaType: incoming.mediaType,
        influenceScore: incoming.influenceScore,
        portalOutlet: incoming.portalOutlet || current?.portalOutlet || "",
        portalUrl: incoming.portalUrl || current?.portalUrl || "",
      };
    }
    if (isResolvedNewsOutlet(current?.outlet)) {
      return {
        outlet: current.outlet,
        url: current.url || incoming?.url || "",
        mediaType: current.mediaType,
        influenceScore: current.influenceScore,
        portalOutlet: incoming?.portalOutlet || incoming?.outlet || current.portalOutlet || "",
        portalUrl: incoming?.portalUrl || incoming?.url || current.portalUrl || "",
      };
    }
    return {};
  }

  function isSameArticle(left, right) {
    const leftUrl = normalizeArticleUrl(left.url);
    const rightUrl = normalizeArticleUrl(right.url);
    if (leftUrl && rightUrl && leftUrl === rightUrl) return true;
    if (leftUrl && rightUrl && leftUrl !== rightUrl) return false;
    return (
      normalizeOutlet(left.outlet) === normalizeOutlet(right.outlet) &&
      stableKey(left.title) === stableKey(right.title) &&
      String(left.publishedAt || "").slice(0, 10) === String(right.publishedAt || "").slice(0, 10)
    );
  }

  async function refreshOfficialReleases(options = {}) {
    const silent = Boolean(options.silent);
    state.meta.homepageScanStatus = "checking";
    state.meta.homepageScanMessage = "보도자료 수집 서버를 확인하는 중입니다.";
    if (!silent) renderView();

    try {
      const releases = await fetchOfficialReleaseItems();
      if (!releases.length) {
        state.meta.homepageScanAt = new Date().toISOString();
        state.meta.homepageScanStatus = "success";
        state.meta.homepageScanCount = 0;
        state.meta.homepageScanMessage = "새 보도자료가 없습니다.";
        saveState();
        if (!silent || ui.view === "dashboard" || ui.view === "releases") renderView();
        if (!silent) toast("보도자료 새로고침 완료: 신규 0건");
        return { added: 0, updated: 0, total: 0 };
      }

      const result = mergeOfficialReleases(releases);
      state.meta.homepageScanAt = new Date().toISOString();
      state.meta.homepageScanStatus = "success";
      state.meta.homepageScanCount = releases.length;
      state.meta.homepageScanMessage = `보도자료 ${releases.length}건을 수집했습니다. 신규 ${result.added}건, 갱신 ${result.updated}건.`;
      runAutoMatch(false);
      if (!silent || result.added || result.updated) addActivity("보도자료 수집", `보도자료 확인: 신규 ${result.added}건, 갱신 ${result.updated}건`);
      saveState();
      if (!silent || ui.view === "dashboard" || ui.view === "releases") renderView();
      if (!silent) toast(`보도자료 새로고침 완료: 신규 ${result.added}건`);
      return result;
    } catch (error) {
      console.error(error);
      state.meta.homepageScanAt = new Date().toISOString();
      state.meta.homepageScanStatus = "blocked";
      state.meta.homepageScanMessage = error?.message || "수집 서버가 실행되지 않았거나 외부 홈페이지 응답이 지연되었습니다. 자동 수집 서버로 실행하면 목록과 상세 페이지를 순차 수집합니다.";
      saveState();
      if (!silent || ui.view === "dashboard" || ui.view === "releases") renderView();
      if (!silent) toast("보도자료 수집 상태를 확인하세요.");
      return { added: 0, updated: 0, total: 0, error };
    }
  }

  async function fetchOfficialReleaseItems() {
    const apiUrls = [
      `./api/official-releases?url=${encodeURIComponent(OFFICIAL_RELEASE_URL)}&start=${encodeURIComponent(ACTUAL_USE_START_DATE)}`,
      `${LOCAL_COLLECTOR_URL}?url=${encodeURIComponent(OFFICIAL_RELEASE_URL)}&start=${encodeURIComponent(ACTUAL_USE_START_DATE)}`,
    ];
    let invalidSourceMessage = "";

    for (const apiUrl of apiUrls) {
      try {
        const apiResponse = await fetch(apiUrl, {
          method: "GET",
          cache: "no-store",
          credentials: apiUrl.startsWith("http") ? "omit" : "same-origin",
        });
        if (!apiResponse.ok) continue;
        const contentType = apiResponse.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const payload = await apiResponse.json();
          const items = Array.isArray(payload.items) ? payload.items : [];
          const releases = filterOperationalReleases(uniqueOfficialReleases(items.map(officialReleaseFromPayload).filter(Boolean))).slice(0, 100);
          if (items.length && !releases.length) {
            invalidSourceMessage = "수집 서버가 조선대뉴스 게시글이 아닌 메뉴 링크를 읽고 있습니다. 기존 서버창을 닫고 start-platform.cmd를 다시 실행한 뒤 새로고침하세요.";
            continue;
          }
          return releases;
        }
        const html = await apiResponse.text();
        return filterOperationalReleases(parseOfficialReleasePage(html));
      } catch (error) {
        console.debug("보도자료 수집 API 확인 실패", apiUrl, error);
      }
    }

    try {
      const response = await fetch(OFFICIAL_RELEASE_URL, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) throw new Error(`보도자료 원천 응답 오류: ${response.status}`);
      return filterOperationalReleases(parseOfficialReleasePage(await response.text()));
    } catch (error) {
      if (invalidSourceMessage) throw new Error(invalidSourceMessage);
      throw error;
    }
  }

  function officialReleaseFromPayload(item) {
    if (!item || typeof item !== "object") return null;
    const title = normalizeOfficialReleaseTitle(item.title || item.subject || item.name || "");
    if (!isLikelyOfficialReleaseTitle(title)) return null;

    const body = normalizeWhitespace(item.body || item.content || item.rowText || item.summary || "");
    const summary = normalizeWhitespace(item.summary || body.slice(0, 180) || title);
    const sourceUrl = (item.sourceUrl || item.url) ? safeUrl(item.sourceUrl || item.url, OFFICIAL_RELEASE_URL) : "";
    if (!isCurrentOfficialReleaseSource(sourceUrl)) return null;
    const payloadDate = item.dateSource === "fallback" ? "" : normalizeDateInput(item.publishAt || item.date);
    const publishAt =
      officialKnownPublishAt(sourceUrl) ||
      payloadDate ||
      extractOfficialDate(item.rowText || "") ||
      extractOfficialDate(body);
    if (!publishAt) return null;
    const keywordText = `${title} ${summary} ${body}`;

    return normalizeRelease({
      id: item.id || `official-${publishAt}-${stableKey(title)}`,
      sourceId: item.sourceId || stableKey(`${publishAt}-${title}`),
      sourceType: "official-homepage",
      sourceName: OFFICIAL_RELEASE_LABEL,
      sourceUrl,
      title,
      subtitle: normalizeWhitespace(item.subtitle || ""),
      summary,
      body,
      department: item.department || inferOfficialDepartment(keywordText),
      owner: item.owner || "자동 수집",
      category: item.category || inferOfficialCategory(keywordText),
      status: "distributed",
      publishAt,
      tags: Array.isArray(item.tags) && item.tags.length ? item.tags : extractKeywords(keywordText, 6),
      groups: Array.isArray(item.groups) && item.groups.length ? item.groups : ["광주·전남 지역 언론", "대학전문·교육매체"],
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      expectedOutlets: Number(item.expectedOutlets || 12),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      dateSource: item.dateSource || "",
    });
  }

  function parseOfficialReleasePage(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const containers = [
      ...doc.querySelectorAll("tr"),
      ...doc.querySelectorAll("li"),
      ...doc.querySelectorAll(".board-list > *"),
      ...doc.querySelectorAll(".bbsList > *"),
      ...doc.querySelectorAll(".list > *"),
    ];
    const fromContainers = containers.map(officialReleaseFromNode).filter(Boolean);
    const fromAnchors = [...doc.querySelectorAll("a[href]")]
      .map((anchor) => officialReleaseFromAnchor(anchor, anchor.closest("tr, li, .board-list, .bbsList, .list") || anchor.parentElement))
      .filter(Boolean);
    return uniqueOfficialReleases([...fromContainers, ...fromAnchors]).slice(0, 100);
  }

  function officialReleaseFromNode(node) {
    const anchor = node.querySelector?.("a[href]");
    if (!anchor) return null;
    return officialReleaseFromAnchor(anchor, node);
  }

  function officialReleaseFromAnchor(anchor, contextNode) {
    const rawTitle = normalizeWhitespace(anchor.textContent);
    const title = normalizeOfficialReleaseTitle(rawTitle);
    if (!isLikelyOfficialReleaseTitle(title)) return null;

    const rowText = normalizeWhitespace(contextNode?.textContent || rawTitle);
    const sourceUrl = officialAnchorUrl(anchor);
    if (!isCurrentOfficialReleaseSource(sourceUrl) || !isOfficialReleaseDetailUrl(sourceUrl, OFFICIAL_RELEASE_URL)) return null;
    const publishAt = officialKnownPublishAt(sourceUrl) || extractOfficialDate(rowText);
    if (!publishAt) return null;
    const body = rowText.length > title.length ? rowText : "";

    return normalizeRelease({
      id: `official-${publishAt}-${stableKey(title)}`,
      sourceId: stableKey(`${publishAt}-${title}`),
      sourceType: "official-homepage",
      sourceName: OFFICIAL_RELEASE_LABEL,
      sourceUrl,
      title,
      subtitle: "",
      summary: title,
      body,
      department: inferOfficialDepartment(title),
      owner: "자동 확인",
      category: inferOfficialCategory(title),
      status: "distributed",
      publishAt,
      tags: extractKeywords(title, 6),
      groups: ["광주·전남 지역 언론", "대학전문·교육매체"],
      attachments: [],
      expectedOutlets: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedAt: new Date().toISOString(),
      dateSource: "list",
    });
  }

  function mergeOfficialReleases(items) {
    let added = 0;
    let updated = 0;
    filterOperationalReleases(items).forEach((item) => {
      const incomingKey = officialReleaseIdentityKey(item);
      const existingIndex = state.releases.findIndex((release) =>
        officialReleaseIdentityKey(release) === incomingKey
      );
      if (existingIndex >= 0) {
        const existing = state.releases[existingIndex];
        const publishAt = preferredOfficialPublishAt(existing, item);
        const next = {
          ...item,
          publishAt,
        };
        const changed = ["title", "sourceUrl", "publishAt", "summary", "body", "department", "category"].some((key) => String(existing[key] || "") !== String(next[key] || ""));
        state.releases[existingIndex] = normalizeRelease({
          ...existing,
          ...next,
          createdAt: existing.createdAt || item.createdAt,
          updatedAt: changed ? new Date().toISOString() : existing.updatedAt,
          syncedAt: new Date().toISOString(),
        });
        if (changed) updated += 1;
      } else {
        state.releases.unshift(item);
        added += 1;
      }
    });
    return { added, updated, total: filterOperationalReleases(items).length };
  }

  function filterOperationalReleases(items) {
    return (Array.isArray(items) ? items : []).filter((item) => isOperationalDate(item.publishAt || item.createdAt));
  }

  function uniqueOfficialReleases(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = officialReleaseIdentityKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function officialReleaseIdentityKey(item) {
    const articleNo = officialArticleNoFromUrl(item?.sourceUrl);
    if (articleNo) return `article:${articleNo}`;
    const url = normalizeOfficialSourceUrl(item?.sourceUrl);
    if (url) return `url:${url}`;
    if (item?.sourceId) return `source:${item.sourceId}`;
    if (item?.id) return `id:${item.id}`;
    return `fallback:${stableKey(`${item?.publishAt || ""}-${item?.title || ""}`)}`;
  }

  function preferredOfficialPublishAt(existing, item) {
    const knownDate = officialKnownPublishAt(item?.sourceUrl || existing?.sourceUrl);
    if (knownDate) return knownDate;
    const currentDate = normalizeDateInput(existing?.publishAt || "");
    const incomingDate = normalizeDateInput(item?.publishAt || "");
    const incomingIsFallback = item?.dateSource === "fallback" || (incomingDate === todayDate() && currentDate && currentDate !== todayDate());
    if (incomingDate && !incomingIsFallback) return incomingDate;
    if (currentDate) return currentDate;
    return incomingDate || todayDate();
  }

  function normalizeOfficialSourceUrl(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
      const url = new URL(text, OFFICIAL_RELEASE_URL);
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => url.searchParams.delete(key));
      url.hash = "";
      return url.href.replace(/\/$/, "").toLowerCase();
    } catch (error) {
      return text.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
    }
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

  function normalizeOfficialReleaseTitle(value) {
    return normalizeWhitespace(value)
      .replace(/^(새글|공지|첨부|NEW)\s*/i, "")
      .replace(/\s*\[[^\]]+\]\s*$/g, "")
      .trim();
  }

  function isLikelyOfficialReleaseTitle(title) {
    if (!title || title.length < 8 || title.length > 140) return false;
    if (/-->|바로가기|주메뉴|모바일메뉴|검색열기|포털시스템/.test(title)) return false;
    if (/^(검색|목록|이전|다음|처음|마지막|로그인|전체|작성자|등록일|조회|첨부|홈페이지)$/i.test(title)) return false;
    if (/개인정보|저작권|사이트맵|콘텐츠 담당|본문 바로가기/.test(title)) return false;
    if (isNonReleaseNavigationTitle(title)) return false;
    return /조선대|조선대학교|대학|교수|학생|연구|사업|입학|협약|선정|수상|개최|모집|기부|봉사|센터/.test(title);
  }

  function isNonReleaseNavigationTitle(title) {
    return /대학소개|총장실|역대총장|총장에게 바란다|역사와비전|조선대 소식|언론 속 조선대|소식지|홍보동영상|전경사진|브로슈어|포토뉴스|대학발전|학교법인|캠퍼스안내|연구과제공고|채용공고|입찰공고|일반공지|학사공지|대학원공지|연구\/산학|대학\/대학원|입학\/취업|행정\/지원|커뮤니티|정보공개|민원|증명서|시설물|규정집|전화번호|조직도|캠퍼스맵|연구기관|산학국책사업|사업단 및 센터/.test(
      normalizeWhitespace(title)
    );
  }

  function isCurrentOfficialReleaseSource(value) {
    if (!value) return false;
    try {
      const url = new URL(value, OFFICIAL_RELEASE_URL);
      if (!url.hostname.endsWith("chosun.ac.kr")) return false;
      if (url.href.includes("/a7Pb12OxB4/")) return false;
      return isOfficialReleaseDetailUrl(url.href, OFFICIAL_RELEASE_URL);
    } catch (error) {
      return false;
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

  function extractOfficialDate(text) {
    const value = normalizeWhitespace(text);
    const full = value.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
    if (full) return `${full[1]}-${String(full[2]).padStart(2, "0")}-${String(full[3]).padStart(2, "0")}`;
    const short = value.match(/(\d{1,2})[.\-/](\d{1,2})/);
    if (short) return `${todayDate().slice(0, 4)}-${String(short[1]).padStart(2, "0")}-${String(short[2]).padStart(2, "0")}`;
    return "";
  }

  function inferOfficialDepartment(title) {
    if (/입학|수시|정시|모집|전형/.test(title)) return "입학처";
    if (/학생|장학|봉사|동아리|취업/.test(title)) return "학생처";
    if (/연구|산학|AI|기술|특허|사업|센터/.test(title)) return "산학협력단";
    if (/의대|병원|의료|간호|보건/.test(title)) return "의과대학";
    if (/공학|반도체|소프트웨어|전기|기계/.test(title)) return "공과대학";
    return "대외협력처";
  }

  function inferOfficialCategory(title) {
    if (/입학|수시|정시|모집|전형/.test(title)) return "입시";
    if (/학생|장학|동아리|취업/.test(title)) return "학생";
    if (/산학|기업|창업|협약|기술/.test(title)) return "산학협력";
    if (/지역|봉사|기부|나눔/.test(title)) return "지역사회";
    if (/국제|해외|유학생|글로벌/.test(title)) return "국제";
    if (/연구|AI|논문|센터|선정|사업/.test(title)) return "연구";
    return "기타";
  }

  function safeUrl(value, base) {
    try {
      return new URL(value, base).href;
    } catch (error) {
      return base;
    }
  }

  function officialAnchorUrl(anchor) {
    const candidates = [
      anchor.getAttribute("href") || "",
      anchor.getAttribute("onclick") || "",
      anchor.getAttribute("data-url") || "",
      anchor.getAttribute("data-href") || "",
    ];
    for (const candidate of candidates) {
      const url = resolveOfficialAnchorUrl(candidate);
      if (url) return url;
    }
    return "";
  }

  function resolveOfficialAnchorUrl(value) {
    const text = normalizeWhitespace(value);
    if (!text || text === "#" || /^mailto:|^tel:/i.test(text)) return "";
    const embeddedUrl = text.match(/['"]([^'"]*(?:uv|ud|view|ul)\.do[^'"]*)['"]/i)?.[1] || text.match(/(\/[^\s'")]+(?:uv|ud|view|ul)\.do[^\s'")]*)/i)?.[1];
    if (embeddedUrl && embeddedUrl !== text) return resolveOfficialAnchorUrl(embeddedUrl);
    const artclCall = text.match(/jf_viewArtcl\(['"]([^'"]+)['"]\s*,\s*['"]?(\d+)['"]?\s*,\s*['"]?(\d+)['"]?/i);
    if (artclCall) return `https://www3.chosun.ac.kr/bbs/${artclCall[1]}/${artclCall[2]}/${artclCall[3]}/artclView.do`;
    if (/^javascript:/i.test(text) || /\w+\s*\(/.test(text) || /articleNo|artclNo|artclSeq|nttId|nttSn|bbscttNo|boardSeq/i.test(text)) {
      const explicitId = text.match(/(?:articleNo|artclNo|artclSeq|nttId|nttSn|bbscttNo|boardSeq|seq|id|no)['"\s:=,]+(\d{3,})/i)?.[1];
      const numberMatches = [...text.matchAll(/\d{3,}/g)].map((item) => item[0]);
      const articleNo = explicitId || numberMatches[numberMatches.length - 1];
      if (!articleNo) return "";
      const url = new URL(OFFICIAL_RELEASE_URL);
      url.searchParams.set("mode", "view");
      url.searchParams.set("articleNo", articleNo);
      return url.href;
    }
    return safeUrl(text, OFFICIAL_RELEASE_URL);
  }

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function runAiMediaScan() {
    state.articles = dedupeArticles(filterArticleItems(state.articles));
    runAutoMatch(false);
    state.meta.aiScanAt = new Date().toISOString();
    addActivity("새로고침", "실제 기사 수집 연결 대기: 신규 0건");
    saveState();
    renderView();
    toast("새로고침 완료: 신규 0건");
  }

  function runAutoMatch(shouldRender = true) {
    let matched = 0;
    let changed = 0;
    state.articles.forEach((article) => {
      const before = article.releaseId || "";
      const result = autoMatchArticle(article, state.releases, true);
      if (result?.releaseId) matched += 1;
      if ((article.releaseId || "") !== before) changed += 1;
      article.attentionReason = articleAttentionReason(article);
    });
    if (!shouldRender) return;
    addActivity("자동 매칭", `기사 ${matched}건 매칭, ${changed}건 연결 변경`);
    saveState();
    renderView();
    toast(`자동 매칭 완료: ${matched}건 연결`);
  }

  function aiOutletsForRelease(release) {
    const base = [
      { name: "광주일보", mediaType: "local", channel: "print", influence: 74 },
      { name: "무등일보", mediaType: "local", channel: "online", influence: 68 },
      { name: "KBC광주방송", mediaType: "broadcast", channel: "broadcast", influence: 92 },
      { name: "연합뉴스", mediaType: "national", channel: "online", influence: 90 },
      { name: "한국대학신문", mediaType: "internet", channel: "online", influence: 66 },
      { name: "교육플러스", mediaType: "internet", channel: "online", influence: 58 },
    ];
    const text = `${release.title} ${release.body} ${(release.tags || []).join(" ")}`;
    if (/AI|산학|창업|연구|기술/.test(text)) base.unshift({ name: "전자신문", mediaType: "national", channel: "online", influence: 86 });
    if (/입학|수시|정시|모집/.test(text)) base.unshift({ name: "베리타스알파", mediaType: "internet", channel: "online", influence: 62 });
    if (/봉사|지역|돌봄|학생/.test(text)) base.unshift({ name: "광주MBC", mediaType: "broadcast", channel: "broadcast", influence: 90 });
    return base;
  }

  function aiArticleTitle(release, outlet, index) {
    const title = String(release.title || "조선대 보도자료").replace("조선대학교", "조선대");
    const variants = [
      `${outlet.name}, ${title}`,
      `조선대 ${release.category || "교육"} 성과 주목...${shortenTitle(title)}`,
      `${shortenTitle(title)} 지역사회 확산`,
      `조선대, ${release.department || "주관부서"} 중심 ${release.category || "홍보"} 행보`,
    ];
    return variants[index % variants.length];
  }

  function aiArticleExcerpt(release, outlet) {
    const base = release.summary || release.subtitle || release.body || release.title;
    return `${outlet.name} 보도에서 ${shortenTitle(base, 72)} 내용을 중심으로 다뤘습니다.`;
  }

  function inferGeneratedSentiment(release, outlet) {
    const text = `${release.title} ${release.subtitle} ${release.body}`;
    if (/민원|논란|사고|부실|비판|등록금/.test(text)) return "negative";
    if (outlet.mediaType === "broadcast" && /지역|봉사|학생|입학/.test(text)) return "positive";
    return "positive";
  }

  function inferGeneratedRisk(release, outlet) {
    const text = `${release.title} ${release.subtitle} ${release.body}`;
    if (/사고|논란|부실|비판/.test(text)) return "high";
    if (/등록금|민원|입학/.test(text)) return "medium";
    return "low";
  }

  function aiNegativeArticle(release) {
    const id = `ai-${todayDate()}-negative-public-concern`;
    const published = new Date();
    published.setHours(Math.max(7, published.getHours() - 2), 20, 0, 0);
    return {
      id,
      title: "조선대 학사·민원 안내 두고 온라인서 갑론을박",
      outlet: "지역 온라인 커뮤니티",
      reporter: "AI 조사",
      url: `https://example.com/ai-monitor/${id}`,
      publishedAt: toDateTimeString(published),
      sentiment: "negative",
      topic: "행정",
      mediaType: "internet",
      channel: "online",
      influenceScore: 56,
      releaseId: release?.id || "",
      matchScore: release ? 42 : 0,
      keywords: ["조선대", "민원", "학사안내", "온라인여론"],
      risk: "medium",
      status: "reviewed",
      excerpt: "학사 안내와 민원 응대 경험을 두고 온라인상에서 의견이 확산되는 흐름입니다.",
      memo: "부정 여론 조기 대응 후보입니다.",
      attentionReason: "지역 커뮤니티의 경험담이 대학 행정 신뢰 이슈로 확장될 가능성이 있어 주목됩니다.",
      sourceType: "ai-scan",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function shortenTitle(value, max = 34) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  function autoMatchArticlesForRelease(release) {
    state.articles.forEach((article) => {
      if (article.releaseId && article.releaseId !== release.id) return;
      const result = matchArticleToRelease(article, release);
      if (result.score >= MATCH_THRESHOLD && result.score >= Number(article.matchScore || 0)) {
        article.releaseId = release.id;
        article.matchScore = result.score;
        article.matchBasis = result.basis;
      }
    });
  }

  function autoMatchArticle(article, releases = state.releases, force = false) {
    const best = findBestReleaseMatch(article, releases);
    if (!best) return null;
    if (best.score >= MATCH_THRESHOLD && (force || !article.releaseId || best.score >= Number(article.matchScore || 0))) {
      article.releaseId = best.releaseId;
      article.matchScore = best.score;
      article.matchBasis = best.basis;
      return best;
    }
    if (!article.releaseId) {
      article.matchScore = best.score;
      article.matchBasis = best.basis;
    }
    return best;
  }

  function findBestReleaseMatch(article, releases) {
    return releases
      .map((release) => ({ releaseId: release.id, ...matchArticleToRelease(article, release) }))
      .sort((a, b) => b.score - a.score)[0];
  }

  function matchArticleToRelease(article, release) {
    const articleText = `${article.title || ""} ${article.excerpt || ""} ${(article.keywords || []).join(" ")}`;
    const releaseCore = `${release.title || ""} ${release.subtitle || ""}`;
    const releaseText = `${releaseCore} ${release.body || ""} ${(release.tags || []).join(" ")}`;
    const titleOverlap = tokenOverlap(article.title || "", releaseCore);
    const contentOverlap = tokenOverlap(articleText, releaseText);
    const keywordHits = intersectionCount(extractKeywords(releaseText, 14), tokenizeForMatch(articleText));
    const coreHits = intersectionCount(releaseCoreTokens(release), tokenizeForMatch(articleText));
    const dateBonus = releaseDateBonus(article, release);
    const exactTitleScore = exactReleaseTitleScore(article, release, dateBonus);
    const weightedScore = Math.round(titleOverlap * 48 + contentOverlap * 32 + Math.min(16, keywordHits * 4) + Math.min(18, coreHits * 6) + dateBonus);
    const score = clamp(Math.max(weightedScore, exactTitleScore), 0, 100);
    const basis = `제목 ${Math.round(titleOverlap * 100)}%, 내용 ${Math.round(contentOverlap * 100)}%, 핵심어 ${keywordHits + coreHits}개`;
    return { score, basis };
  }

  function exactReleaseTitleScore(article, release, dateBonus = 0) {
    const articleTitle = normalizeArticleComparableText(article?.title || "");
    const releaseTitle = normalizeArticleComparableText(release?.title || "");
    if (!articleTitle || !releaseTitle) return 0;
    if (articleTitle.includes(releaseTitle) || releaseTitle.includes(articleTitle)) return 92 + Math.min(8, dateBonus);
    const releaseTokens = releaseCoreTokens(release);
    const articleTokens = tokenizeForMatch(articleTitle);
    if (!releaseTokens.length || !articleTokens.length) return 0;
    const shared = intersectionCount(releaseTokens, articleTokens);
    const ratio = shared / Math.min(releaseTokens.length, articleTokens.length);
    if (shared >= 3 && ratio >= 0.72) return 72 + Math.min(14, shared * 3) + Math.min(8, dateBonus);
    if (shared >= 2 && ratio >= 0.62) return 58 + Math.min(12, shared * 3) + Math.min(8, dateBonus);
    return 0;
  }

  function releaseCoreTokens(release) {
    return tokenizeForMatch(`${release?.title || ""} ${(release?.tags || []).join(" ")}`)
      .filter((token) => !articleGroupStopwords().has(token))
      .filter((token) => token.length >= 2)
      .slice(0, 12);
  }

  function releaseDateBonus(article, release) {
    const articleDate = parseDate(article.publishedAt);
    const releaseDate = parseDate(release.publishAt || release.createdAt);
    if (!articleDate || !releaseDate) return 0;
    const diff = Math.round((articleDate - releaseDate) / 86400000);
    if (diff >= -1 && diff <= 14) return 10;
    if (diff >= -3 && diff <= 30) return 5;
    return 0;
  }

  function releaseArticleStats(release, sourceArticles = state.articles) {
    const articles = dedupeReleaseCoverageArticles(sourceArticles.filter((article) => article.releaseId === release.id));
    const uniqueOutlets = new Set(articles.filter((article) => isResolvedNewsOutlet(article.outlet)).map((article) => normalizeOutlet(article.outlet)).filter(Boolean)).size;
    const totalImpact = articles.reduce((sum, article) => sum + articleImpactScore(article), 0);
    const expected = Math.max(1, Number(release.expectedOutlets || estimateExpectedOutlets(release)));
    return {
      articleCount: articles.length,
      uniqueOutlets,
      totalImpact,
      avgImpact: articles.length ? Math.round(totalImpact / articles.length) : 0,
      coverageRate: Math.min(100, Math.round((uniqueOutlets / expected) * 100)),
      mediaTypeCounts: countBy(articles, "mediaType"),
      channelCounts: countByChannels(articles),
      articles,
    };
  }

  function articleImpactScore(article) {
    const mediaType = normalizeMediaType(article.mediaType, article.outlet);
    const channel = normalizeChannel(article.channel, article.url, mediaType);
    const base = clamp(Number(article.influenceScore || 0) || mediaTypes[mediaType]?.defaultInfluence || mediaTypes.other.defaultInfluence, 1, 100);
    const channelWeight = { broadcast: 1.08, both: 1.07, print: 1.04, online: 0.96, unknown: 0.9 }[channel] || 1;
    const riskBonus = article.risk === "high" ? 5 : article.risk === "medium" ? 2 : 0;
    return clamp(Math.round(base * channelWeight + riskBonus), 1, 100);
  }

  function dailyTopArticles(briefingDate = previousCalendarDate(todayDate())) {
    return topArticleGroups(articlesForMorningBriefing(briefingDate));
  }

  function topArticleGroups(articles, limit = 5) {
    const groups = new Map();
    dedupeArticles(articles).forEach((article) => {
      const release = state.releases.find((item) => item.id === article.releaseId);
      const currentGroups = [...groups.values()];
      const releaseGroup = release ? currentGroups.find((group) => group.release?.id === release.id) : null;
      const similarGroup = releaseGroup || findSimilarArticleGroup(article, currentGroups, release);
      const key = similarGroup?.key || articleContentGroupKey(article);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          release,
          title: release?.title || articleGroupTitle(article),
          articles: [],
          representative: article,
          firstAt: article.publishedAt || article.createdAt || "",
          latestAt: article.publishedAt || article.createdAt || "",
        });
      }
      const group = groups.get(key);
      if (release && !group.release) {
        group.release = release;
        group.title = release.title || group.title;
      }
      group.articles.push(article);
      if (articleCompletenessScore(article) > articleCompletenessScore(group.representative || {})) group.representative = article;
      const articleAt = article.publishedAt || article.createdAt || "";
      const articleTimestamp = articleDateTimestamp(articleAt);
      if (articleTimestamp && (!group.firstAt || articleTimestamp < articleDateTimestamp(group.firstAt))) group.firstAt = articleAt;
      if (articleTimestamp && (!group.latestAt || articleTimestamp > articleDateTimestamp(group.latestAt))) group.latestAt = articleAt;
    });

    const ranked = [...groups.values()]
      .map((group) => {
        const totalImpact = group.articles.reduce((sum, article) => sum + articleImpactScore(article), 0);
        const outletCount = new Set(group.articles.filter((article) => isResolvedNewsOutlet(article.outlet)).map((article) => normalizeOutlet(article.outlet)).filter(Boolean)).size;
        const chronology = group.articles
          .map((article) => ({
            value: article.publishedAt || article.createdAt || "",
            timestamp: articleDateTimestamp(article.publishedAt || article.createdAt),
          }))
          .filter((item) => item.timestamp > 0)
          .sort((a, b) => a.timestamp - b.timestamp);
        return {
          ...group,
          title: group.release?.title || articleGroupTitle(group.representative || group.articles[0] || {}),
          articleCount: group.articles.length,
          outletCount,
          totalImpact,
          avgImpact: group.articles.length ? Math.round(totalImpact / group.articles.length) : 0,
          firstAt: chronology[0]?.value || group.firstAt || "",
          latestAt: chronology[chronology.length - 1]?.value || group.latestAt || "",
          topArticle: [...group.articles].sort((a, b) => articleImpactScore(b) - articleImpactScore(a))[0],
        };
      })
      .sort((a, b) => b.articleCount - a.articleCount || b.avgImpact - a.avgImpact || b.totalImpact - a.totalImpact || b.outletCount - a.outletCount || articleDateTimestamp(b.latestAt) - articleDateTimestamp(a.latestAt));
    return limit ? ranked.slice(0, limit) : ranked;
  }

  function articleContentGroupKey(article) {
    if (article.releaseId) return `release-${article.releaseId}`;
    const tokens = articleIssueTokens(article).slice(0, 8).sort();
    return `topic-${stableKey(tokens.join("-") || article.topic || article.title || article.outlet)}`;
  }

  function findSimilarArticleGroup(article, groups, release = null) {
    const articleTime = articleDateTimestamp(article.publishedAt || article.createdAt);
    const candidates = groups.filter((group) => {
      const groupTime = articleDateTimestamp(group.latestAt || group.firstAt);
      if (articleTime && groupTime && Math.abs(articleTime - groupTime) > 45 * 86400000) return false;
      return true;
    });
    let best = null;
    candidates.forEach((group) => {
      const comparisons = [group.representative, ...(group.articles || []).slice(0, 5)].filter(Boolean);
      const score = Math.max(...comparisons.map((current) => articleGroupSimilarity(article, current)));
      const differentReleases = Boolean(release?.id && group.release?.id && release.id !== group.release.id);
      const threshold = differentReleases ? 0.72 : 0.5;
      if (score >= threshold && (!best || score > best.score)) best = { group, score };
    });
    return best?.group || null;
  }

  function articleGroupSimilarity(left, right) {
    const leftTokens = articleIssueTokens(left);
    const rightTokens = articleIssueTokens(right);
    if (!leftTokens.length || !rightTokens.length) return 0;
    const shared = fuzzyIntersectionCount(leftTokens, rightTokens);
    const contained = shared / Math.min(leftTokens.length, rightTokens.length);
    const jaccard = shared / Math.max(1, leftTokens.length + rightTokens.length - shared);
    const titleScore = Math.max(
      articleTokenSimilarity(normalizeArticleComparableText(left.title || ""), normalizeArticleComparableText(right.title || "")),
      articleTokenSimilarity(articleComparableText(left), articleComparableText(right))
    );
    const phraseScore = articlePhraseSimilarity(left.title || "", right.title || "");
    if (shared < 2 && phraseScore < 0.62) return 0;
    const anchorScore = shared >= 4 ? 0.74 : shared >= 3 ? 0.62 : shared >= 2 && contained >= 0.4 ? 0.52 : 0;
    return Math.max(contained, jaccard * 1.25, titleScore, phraseScore, anchorScore);
  }

  function articleTokenSimilarity(left, right) {
    const leftTokens = tokenizeForMatch(left);
    const rightTokens = tokenizeForMatch(right);
    if (!leftTokens.length || !rightTokens.length) return 0;
    const shared = fuzzyIntersectionCount(leftTokens, rightTokens);
    return Math.max(shared / leftTokens.length, shared / rightTokens.length);
  }

  function fuzzyIntersectionCount(left, right) {
    const used = new Set();
    let count = 0;
    left.forEach((leftToken) => {
      const index = right.findIndex((rightToken, currentIndex) => !used.has(currentIndex) && articleTokensMatch(leftToken, rightToken));
      if (index < 0) return;
      used.add(index);
      count += 1;
    });
    return count;
  }

  function articleTokensMatch(left, right) {
    if (left === right) return true;
    if (Math.min(left.length, right.length) < 3) return false;
    return left.includes(right) || right.includes(left);
  }

  function articlePhraseSimilarity(left, right) {
    const leftText = normalizeArticleComparableText(left).replace(/조선대|\s+/g, "");
    const rightText = normalizeArticleComparableText(right).replace(/조선대|\s+/g, "");
    if (Math.min(leftText.length, rightText.length) < 6) return 0;
    const leftPairs = characterPairs(leftText);
    const rightPairs = characterPairs(rightText);
    const shared = intersectionCount(leftPairs, rightPairs);
    return (2 * shared) / Math.max(1, leftPairs.length + rightPairs.length);
  }

  function characterPairs(value) {
    const pairs = [];
    for (let index = 0; index < value.length - 1; index += 1) pairs.push(value.slice(index, index + 2));
    return [...new Set(pairs)];
  }

  function articleIssueTokens(article) {
    return tokenizeForMatch(articleComparableText(article))
      .filter((token) => !articleGroupStopwords().has(token))
      .slice(0, 12);
  }

  function articleComparableText(article) {
    const excerpt = normalizeWhitespace(article?.excerpt || "");
    const meaningfulExcerpt = /관련 기사입니다|보도 기사입니다.*키워드|뉴스 모니터링 새로고침|뉴스 수집기로 저장/.test(excerpt) ? "" : excerpt;
    const keywords = (article?.keywords || []).filter((keyword) => !["조선대", "조선대학교"].includes(normalizeWhitespace(keyword)));
    return normalizeArticleComparableText(`${article?.title || ""} ${meaningfulExcerpt} ${keywords.join(" ")}`);
  }

  function normalizeArticleComparableText(value) {
    return normalizeWhitespace(value)
      .toLowerCase()
      .replace(/\s+-\s+[^-]+$/g, "")
      .replace(/^[\[【][^\]】]+[\]】]\s*/g, "")
      .replace(/^단독\s*/g, "")
      .replace(/^종합\s*/g, "")
      .replace(/ai\s*\+\s*x/gi, "ai x")
      .replace(/aix/gi, "ai x")
      .replace(/조선대학교/g, "조선대")
      .replace(/[‘’“”"']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function articleGroupStopwords() {
    return new Set(["조선대", "조선대학교", "기사", "보도", "관련", "지역", "대학", "언론", "주요", "확산", "주목", "성료", "선정", "수상", "개최"]);
  }

  function articleGroupTitle(article) {
    const release = state.releases.find((item) => item.id === article.releaseId);
    if (release?.title) return release.title;
    const title = normalizeArticleGroupTitle(article.title || "");
    if (title) return title;
    return article.topic && article.topic !== "기타" ? `${article.topic} 이슈` : "제목 없음";
  }

  function normalizeArticleGroupTitle(value) {
    return shortenTitle(
      normalizeWhitespace(value)
        .replace(/\s+-\s+[^-]+$/g, "")
        .replace(/^[\[【][^\]】]+[\]】]\s*/g, "")
        .replace(/^단독\s*/g, "")
        .replace(/^종합\s*/g, "")
        .replace(/^조선대학교\s*,?\s*/g, "조선대 ")
        .replace(/^조선대\s*[,，]\s*/g, "조선대 "),
      86
    );
  }

  function articlesForMorningBriefing(briefingDate = previousCalendarDate(todayDate())) {
    return state.articles.filter((article) => String(article.publishedAt || "").slice(0, 10) === briefingDate);
  }

  function topArticleItem(item) {
    const article = item.topArticle || item.articles[0] || {};
    const title = item.release?.sourceUrl
      ? `<a href="${escapeAttr(item.release.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
      : article.url
        ? `<a href="${escapeAttr(article.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`
        : escapeHtml(item.title);
    return `
      <article class="list-item">
        <div class="list-item-header">
          <h3>${title}</h3>
          ${chip(`${item.articleCount}건`, "teal")}
        </div>
        <p>${item.outletCount}개 언론사 · 매체 영향력 ${impactPercent(item.avgImpact)} · 최근 ${formatDateTime(item.latestAt) || "-"}</p>
        <p>${escapeHtml(articleAttentionReason(article))}</p>
        ${outletLinkList(item.articles, 5)}
        <div class="tag-list">
          ${chip(`보도량 ${item.articleCount}`, "teal")}
          ${chip(`언론사 ${item.outletCount}`, "info")}
          ${chip(`매체 영향력 ${impactPercent(item.avgImpact)}`, "neutral")}
        </div>
      </article>
    `;
  }

  function channelSummaryChips(counts) {
    const entries = Object.entries(counts || {}).filter(([, value]) => value > 0);
    if (!entries.length) return chip("기사 없음", "neutral");
    return entries.map(([key, value]) => chip(`${publicationChannels[key]?.label || key} ${value}`, publicationChannels[key]?.tone || "neutral")).join("");
  }

  function publicationChannelEntries() {
    return Object.entries(publicationChannels).filter(([key]) => key !== "both");
  }

  function articleChannelValues(article) {
    const mediaType = normalizeMediaType(article?.mediaType, article?.outlet);
    const channel = normalizeChannel(article?.channel, article?.url, mediaType);
    if (channel === "both") return ["print", "online"];
    return [channel || "unknown"];
  }

  function articleChannelLabels(article) {
    return articleChannelValues(article)
      .map((key) => publicationChannels[key]?.label || key)
      .join(", ");
  }

  function articleChannelChips(article) {
    return articleChannelValues(article).map((key) => statusChip(publicationChannels, key)).join(" ");
  }

  function countByChannels(articles) {
    const counts = {};
    (articles || []).forEach((article) => {
      articleChannelValues(article).forEach((key) => {
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return counts;
  }

  function impactPercent(value) {
    return `${clamp(Math.round(Number(value || 0)), 0, 100)}%`;
  }

  function normalizeMediaType(value, outlet = "") {
    const text = `${value || ""} ${outlet || ""}`.toLowerCase();
    if (/방송|라디오|kbs|mbc|sbs|ytn|kbc|cbs|tbn|obs|jtbc|채널a|tv조선|연합뉴스tv/.test(text)) return "broadcast";
    if (/중앙지|전국지|조선일보|중앙일보|동아일보|한겨레|경향신문|한국일보|서울신문|국민일보|세계일보|문화일보|매일경제|한국경제|연합뉴스|뉴스1|뉴시스|전자신문/.test(text)) return "national";
    if (/지방지|지역지|광주|전남|전북|호남|남도|무등|광남|대구|부산|대전|충청|강원|제주/.test(text)) return "local";
    if (/인터넷|온라인|닷컴|데일리|투데이|뉴스|신문|저널|타임즈|press|news/.test(text)) return "internet";
    return "other";
  }

  function normalizeChannel(value, url = "", mediaType = "") {
    const text = String(value || "").toLowerCase();
    if (/지면\+온라인|지면온라인|both|print\+online/.test(text)) return "both";
    if (/지면|신문|print|paper/.test(text)) return "print";
    if (/방송|broadcast|tv|radio/.test(text)) return "broadcast";
    if (/온라인|인터넷|online|web|url/.test(text)) return "online";
    if (mediaType === "broadcast") return "broadcast";
    if (url) return "online";
    return "unknown";
  }

  function inferMediaType(outlet) {
    return normalizeMediaType("", outlet);
  }

  function inferPublicationChannel(article) {
    return normalizeChannel(article.channel, article.url, article.mediaType);
  }

  function normalizeReleaseDate(value) {
    const text = String(value || "").trim();
    if (!text) return todayDate();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    return toDateTimeString(text) || text;
  }

  function estimateExpectedOutlets(release) {
    const groupCount = Array.isArray(release.groups) ? release.groups.length : splitComma(release.groups).length;
    return Math.max(12, groupCount ? groupCount * 6 : 12);
  }

  function extractKeywords(text, limit = 8) {
    const counts = {};
    tokenizeForMatch(text).forEach((token) => {
      counts[token] = (counts[token] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
      .slice(0, limit)
      .map(([token]) => token);
  }

  function tokenizeForMatch(text) {
    const stopwords = new Set([
      "조선대학교",
      "조선대",
      "chosun",
      "university",
      "보도자료",
      "기사",
      "관련",
      "위해",
      "통해",
      "대한",
      "밝혔다",
      "진행",
      "추진",
      "이번",
      "있는",
      "한다",
      "했다",
    ]);
    return Array.from(
      new Set(
        String(text || "")
          .toLowerCase()
          .replace(/[^\w가-힣]+/g, " ")
          .split(/\s+/)
          .map((token) => normalizeMatchToken(token))
          .filter((token) => token.length >= 2 && !stopwords.has(token))
      )
    );
  }

  function normalizeMatchToken(token) {
    let value = String(token || "").trim().toLowerCase();
    if (/^[가-힣]{3,}$/.test(value)) {
      value = value.replace(/(으로써|으로서|에서는|에게는|과는|와는|부터|까지|에서|에게|으로|로서|로써|과|와|은|는|이|가|을|를|의|도|만)$/u, "");
    }
    if (value === "aix") return "ai";
    return value;
  }

  function tokenOverlap(left, right) {
    const leftTokens = tokenizeForMatch(left);
    const rightTokens = tokenizeForMatch(right);
    if (!leftTokens.length || !rightTokens.length) return 0;
    return intersectionCount(leftTokens, rightTokens) / leftTokens.length;
  }

  function intersectionCount(left, right) {
    const rightSet = new Set(right);
    return left.filter((item) => rightSet.has(item)).length;
  }

  function normalizeOutlet(outlet) {
    return String(outlet || "").replace(/\s+/g, "").toLowerCase();
  }

  function dedupeArticles(articles) {
    const unique = new Map();
    (articles || []).forEach((article) => {
      const key = articleIdentityKey(article);
      const existing = unique.get(key);
      if (!existing || articleCompletenessScore(article) >= articleCompletenessScore(existing)) {
        unique.set(key, article);
      }
    });
    return [...unique.values()];
  }

  function dedupeReleaseCoverageArticles(articles) {
    const unique = new Map();
    dedupeArticles(articles).forEach((article) => {
      const outlet = normalizeOutlet(article?.outlet);
      const key = article?.releaseId && outlet ? `release:${article.releaseId}|outlet:${outlet}` : articleIdentityKey(article);
      const existing = unique.get(key);
      unique.set(key, existing ? mergeCoverageArticle(existing, article) : article);
    });
    return [...unique.values()];
  }

  function mergeCoverageArticle(left, right) {
    const primary = articleCompletenessScore(right) >= articleCompletenessScore(left) ? right : left;
    const secondary = primary === right ? left : right;
    return {
      ...secondary,
      ...primary,
      url: primary.url || secondary.url || "",
      publishedAt: latestDateValue(primary.publishedAt || primary.createdAt, secondary.publishedAt || secondary.createdAt),
      channel: mergePublicationChannel(
        normalizeChannel(primary.channel, primary.url, primary.mediaType),
        normalizeChannel(secondary.channel, secondary.url, secondary.mediaType)
      ),
      influenceScore: Math.max(Number(primary.influenceScore || 0), Number(secondary.influenceScore || 0)),
      keywords: [...new Set([...(secondary.keywords || []), ...(primary.keywords || [])])],
      duplicateCount: Number(primary.duplicateCount || 1) + Number(secondary.duplicateCount || 1),
    };
  }

  function mergePublicationChannel(left, right) {
    const values = new Set([left, right].filter(Boolean));
    if (values.has("both") || (values.has("print") && values.has("online"))) return "both";
    if (values.has("broadcast")) return "broadcast";
    if (values.has("print")) return "print";
    if (values.has("online")) return "online";
    return "unknown";
  }

  function latestDateValue(left, right) {
    const leftTime = parseDate(left)?.getTime() || 0;
    const rightTime = parseDate(right)?.getTime() || 0;
    return rightTime > leftTime ? right : left || right || "";
  }

  function articleDateTimestamp(value) {
    return parseDate(value)?.getTime() || 0;
  }

  function articleIdentityKey(article) {
    const outlet = normalizeOutlet(article?.outlet);
    const title = normalizeArticleComparableText(article?.title || article?.excerpt).replace(/\s+/g, " ").trim();
    const date = String(article?.publishedAt || article?.createdAt || "").slice(0, 10);
    if (outlet && title && date) return `meta:${outlet}|${title}|${date}`;
    const url = normalizeArticleUrl(article?.url);
    if (url) return `url:${url}`;
    if (article?.id) return `id:${article.id}`;
    return `fallback:${outlet}|${title}`;
  }

  function normalizeArticleUrl(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    try {
      const url = new URL(text, window.location.href);
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => url.searchParams.delete(key));
      url.hash = "";
      return url.href.replace(/\/$/, "").toLowerCase();
    } catch (error) {
      return text.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
    }
  }

  function articleCompletenessScore(article) {
    return (
      (article?.releaseId ? 8 : 0) +
      (article?.url ? 6 : 0) +
      (article?.excerpt ? 4 : 0) +
      (article?.publishedAt ? 3 : 0) +
      (article?.matchScore ? 2 : 0) +
      articleImpactScore(article || {}) / 100
    );
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function csvRowsForReleases() {
    return state.releases.map((item) => ({
      title: item.title,
      subtitle: item.subtitle,
      department: item.department,
      owner: item.owner,
      category: item.category,
      status: releaseStatuses[item.status]?.label || item.status,
      publishAt: item.publishAt,
      expectedOutlets: item.expectedOutlets || "",
      articleCount: releaseArticleStats(item).articleCount,
      uniqueOutlets: releaseArticleStats(item).uniqueOutlets,
      coverageRate: `${releaseArticleStats(item).coverageRate}%`,
      totalImpact: releaseArticleStats(item).totalImpact,
      embargo: item.embargo,
      summary: item.summary,
      tags: (item.tags || []).join("; "),
      groups: (item.groups || []).join("; "),
      sourceName: item.sourceName || "",
      sourceUrl: item.sourceUrl || "",
      sourceType: item.sourceType || "",
      syncedAt: item.syncedAt || "",
    }));
  }

  function csvRowsForArticles() {
    return csvRowsForArticleItems(state.articles);
  }

  function csvRowsForAffiliatedArticles() {
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
