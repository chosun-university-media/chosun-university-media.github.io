(() => {
  const SUPABASE_URL = "https://ozucabnjnnvjezpeffdt.supabase.co";
  const SUPABASE_KEY = "sb_publishable_SAR-hOBRuo8F2EzeN0uPLA_OLmk3_Sw";
  const ACCOUNT_EMAIL_DOMAIN = "account.chosunmedia.kr";
  const APP_SCRIPT_VERSION = "20260814-relevance-v2";
  const authRoot = document.querySelector("#auth-root");
  const authModalRoot = document.querySelector("#auth-modal-root");
  const appRoot = document.querySelector("#app");
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentSession = null;
  let currentProfile = null;
  let appLoaded = false;
  let authBusy = false;

  init();

  async function init() {
    if (!client) {
      renderSystemError("회원 관리 모듈을 불러오지 못했습니다. 잠시 후 다시 접속해 주세요.");
      return;
    }

    bindEvents();
    const { data } = await client.auth.getSession();
    currentSession = data.session;
    await resolveAccess();

    client.auth.onAuthStateChange((event, session) => {
      currentSession = session;
      if (event === "SIGNED_OUT") {
        currentProfile = null;
        showAuth();
        renderLogin();
        return;
      }
      window.setTimeout(resolveAccess, 0);
    });
  }

  function bindEvents() {
    authRoot.addEventListener("submit", handleAuthSubmit);
    authRoot.addEventListener("click", handleAuthClick);
    authModalRoot.addEventListener("click", handleModalClick);
    authModalRoot.addEventListener("submit", handleMemberSubmit);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMemberModal();
    });
  }

  async function resolveAccess() {
    if (!currentSession?.user) {
      showAuth();
      renderLogin();
      return;
    }

    const { data, error } = await client
      .from("profiles")
      .select("id,username,name,department,role,status,created_at,approved_at")
      .eq("id", currentSession.user.id)
      .maybeSingle();

    if (error || !data) {
      showAuth();
      renderSystemError("회원정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
      return;
    }

    currentProfile = data;
    if (data.status === "approved") {
      openPlatform();
      return;
    }

    showAuth();
    renderPending(data.status === "rejected");
  }

  function showAuth() {
    appRoot.hidden = true;
    authRoot.hidden = false;
    closeMemberModal();
  }

  function openPlatform() {
    authRoot.hidden = true;
    appRoot.hidden = false;
    renderAccountMenu();
    if (appLoaded) return;
    appLoaded = true;
    const script = document.createElement("script");
    script.src = `./app.js?v=${APP_SCRIPT_VERSION}`;
    script.onerror = () => renderSystemError("플랫폼 화면을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
    document.body.appendChild(script);
  }

  function renderLogin(mode = "login", message = "", tone = "") {
    const signup = mode === "signup";
    authRoot.innerHTML = `
      <section class="auth-page">
        <div class="auth-panel" aria-labelledby="auth-title">
          ${brandMarkup()}
          <div class="auth-heading">
            <p>AUTHORIZED ACCESS</p>
            <h1 id="auth-title">${signup ? "회원가입" : "로그인"}</h1>
            <span>${signup ? "가입 신청 후 관리자 승인을 거쳐 이용할 수 있습니다." : "승인된 구성원만 플랫폼에 접속할 수 있습니다."}</span>
          </div>
          ${message ? `<p class="auth-message ${tone || "error"}" role="status">${escapeHtml(message)}</p>` : ""}
          <form class="auth-form" data-auth-form="${signup ? "signup" : "login"}">
            ${signup ? `
              <label>이름<input name="name" type="text" autocomplete="name" required /></label>
              <label>소속 부서<input name="department" type="text" autocomplete="organization-title" required /></label>
            ` : ""}
            <label>아이디<input name="username" type="text" autocomplete="username" minlength="4" maxlength="24" pattern="[A-Za-z0-9._-]+" required /></label>
            <label>비밀번호<input name="password" type="password" autocomplete="${signup ? "new-password" : "current-password"}" minlength="8" required /></label>
            ${signup ? `<label>비밀번호 확인<input name="passwordConfirm" type="password" autocomplete="new-password" minlength="8" required /></label>` : ""}
            <button class="auth-primary" type="submit">${signup ? "가입 신청" : "로그인"}</button>
          </form>
          <div class="auth-switch">
            <span>${signup ? "이미 계정이 있나요?" : "처음 이용하시나요?"}</span>
            <button type="button" data-auth-action="${signup ? "show-login" : "show-signup"}">${signup ? "로그인" : "회원가입"}</button>
          </div>
        </div>
      </section>`;
  }

  function renderPending(rejected = false) {
    authRoot.innerHTML = `
      <section class="auth-page">
        <div class="auth-panel status-panel">
          ${brandMarkup("compact")}
          <div class="status-mark ${rejected ? "rejected" : "pending"}" aria-hidden="true">${rejected ? "!" : "…"}</div>
          <h1>${rejected ? "이용 승인이 보류되었습니다" : "관리자 승인 대기 중입니다"}</h1>
          <p>${rejected ? "관리자에게 계정 상태를 문의해 주세요." : "가입 신청이 접수되었습니다. 관리자가 승인하면 모든 기능을 이용할 수 있습니다."}</p>
          <dl class="profile-summary">
            <div><dt>신청자</dt><dd>${escapeHtml(currentProfile?.name || currentProfile?.username)}</dd></div>
            <div><dt>소속</dt><dd>${escapeHtml(currentProfile?.department || "-")}</dd></div>
            <div><dt>아이디</dt><dd>${escapeHtml(currentProfile?.username || "-")}</dd></div>
          </dl>
          <div class="status-actions">
            <button class="auth-primary secondary" type="button" data-auth-action="refresh-status">승인 상태 확인</button>
            <button class="auth-text-button" type="button" data-auth-action="logout">로그아웃</button>
          </div>
        </div>
      </section>`;
  }

  function renderSystemError(message, retry = false) {
    authRoot.hidden = false;
    authRoot.innerHTML = `
      <section class="auth-page">
        <div class="auth-panel status-panel">
          ${brandMarkup("compact")}
          <div class="status-mark rejected" aria-hidden="true">!</div>
          <h1>접속 상태를 확인해 주세요</h1>
          <p>${escapeHtml(message)}</p>
          <div class="status-actions">
            ${retry ? `<button class="auth-primary secondary" type="button" data-auth-action="refresh-status">다시 확인</button>` : ""}
            <button class="auth-text-button" type="button" data-auth-action="logout">로그인 화면</button>
          </div>
        </div>
      </section>`;
  }

  function brandMarkup(extraClass = "") {
    return `
      <div class="auth-brand ${extraClass}">
        <img src="./assets/chosun-symbol-basic.jpg" width="58" height="58" alt="조선대학교 로고" />
        <div><strong>조선대학교</strong><span>언론 관리 플랫폼</span></div>
      </div>`;
  }

  async function handleAuthSubmit(event) {
    const form = event.target.closest("[data-auth-form]");
    if (!form) return;
    event.preventDefault();
    if (authBusy) return;
    authBusy = true;
    setFormBusy(form, true);

    const fieldValue = (name) => form.elements.namedItem(name)?.value || "";
    const values = {
      name: fieldValue("name"),
      department: fieldValue("department"),
      username: fieldValue("username"),
      password: fieldValue("password"),
      passwordConfirm: fieldValue("passwordConfirm"),
    };
    try {
      if (form.dataset.authForm === "signup") await signup(values);
      else await login(values);
    } finally {
      authBusy = false;
      setFormBusy(form, false);
    }
  }

  async function login(values) {
    const username = normalizeUsername(values.username);
    if (!isValidUsername(username)) {
      renderLogin("login", "아이디는 영문, 숫자, 마침표, 밑줄, 하이픈으로 입력해 주세요.");
      return;
    }
    const { error } = await client.auth.signInWithPassword({
      email: usernameToEmail(username),
      password: String(values.password || ""),
    });
    if (error) renderLogin("login", "아이디 또는 비밀번호를 확인해 주세요.");
  }

  async function signup(values) {
    const username = normalizeUsername(values.username);
    if (!isValidUsername(username)) {
      renderLogin("signup", "아이디는 4~24자의 영문, 숫자, 마침표, 밑줄, 하이픈으로 입력해 주세요.");
      return;
    }
    if (String(values.password || "").length < 8) {
      renderLogin("signup", "비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (values.password !== values.passwordConfirm) {
      renderLogin("signup", "비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    const { data, error } = await client.auth.signUp({
      email: usernameToEmail(username),
      password: String(values.password || ""),
      options: {
        data: {
          username,
          name: String(values.name || "").trim(),
          department: String(values.department || "").trim(),
        },
      },
    });

    if (error) {
      renderLogin("signup", "가입 신청을 처리하지 못했습니다. 이미 사용 중인 아이디인지 확인해 주세요.");
      return;
    }
    if (!data.session) {
      renderLogin("login", "가입 신청이 완료되었습니다. 아이디로 로그인해 주세요.", "success");
    }
  }

  async function handleAuthClick(event) {
    const button = event.target.closest("[data-auth-action]");
    if (!button) return;
    const action = button.dataset.authAction;
    if (action === "show-signup") renderLogin("signup");
    if (action === "show-login") renderLogin();
    if (action === "refresh-status") await resolveAccess();
    if (action === "logout") await logoutAndReload();
  }

  function renderAccountMenu() {
    const topbar = document.querySelector(".topbar-actions");
    if (!topbar) return;
    topbar.querySelector(".site-account-menu")?.remove();
    const menu = document.createElement("div");
    menu.className = "site-account-menu";
    menu.innerHTML = `
      <span>${escapeHtml(currentProfile.name || currentProfile.username)}</span>
      ${currentProfile.role === "admin" ? `<button type="button" data-site-account="members">회원 관리</button>` : ""}
      <button type="button" data-site-account="logout">로그아웃</button>`;
    menu.addEventListener("click", async (event) => {
      const action = event.target.closest("[data-site-account]")?.dataset.siteAccount;
      if (action === "members") await openMemberModal();
      if (action === "logout") await logoutAndReload();
    });
    topbar.appendChild(menu);
  }

  async function openMemberModal() {
    authModalRoot.classList.add("is-open");
    authModalRoot.innerHTML = `<div class="auth-admin-modal"><div class="member-dialog"><p class="member-loading">회원 목록을 불러오는 중입니다.</p></div></div>`;
    const { data, error } = await client
      .from("profiles")
      .select("id,username,name,department,role,status,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      authModalRoot.querySelector(".member-dialog").innerHTML = `<p class="auth-message error">회원 목록을 불러오지 못했습니다.</p><button class="member-close-text" type="button" data-member-action="close">닫기</button>`;
      return;
    }
    renderMemberModal(data || []);
  }

  function renderMemberModal(members) {
    const pendingCount = members.filter((member) => member.status === "pending").length;
    authModalRoot.innerHTML = `
      <div class="auth-admin-modal" role="dialog" aria-modal="true" aria-labelledby="member-title">
        <section class="member-dialog">
          <header class="member-dialog-header">
            <div><p>ACCESS MANAGEMENT</p><h2 id="member-title">회원 관리</h2><span>가입 신청을 승인하거나 이용을 차단합니다.</span></div>
            <div class="member-dialog-tools"><strong>${pendingCount}</strong><span>승인 대기</span><button type="button" data-member-action="close" aria-label="닫기">×</button></div>
          </header>
          <div class="member-table-wrap">
            <table class="member-table">
              <thead><tr><th>신청자</th><th>소속</th><th>가입일</th><th>권한</th><th>상태</th><th>관리</th></tr></thead>
              <tbody>
                ${members.map(memberRow).join("") || `<tr><td colspan="6" class="empty-members">가입 신청이 없습니다.</td></tr>`}
              </tbody>
            </table>
          </div>
        </section>
      </div>`;
  }

  function memberRow(member) {
    const statusLabel = { pending: "승인 대기", approved: "승인", rejected: "차단" }[member.status] || member.status;
    const joined = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(member.created_at));
    return `
      <tr>
        <td><strong>${escapeHtml(member.name || "이름 미입력")}</strong><span>${escapeHtml(member.username)}</span></td>
        <td>${escapeHtml(member.department || "-")}</td>
        <td>${escapeHtml(joined)}</td>
        <td>${member.role === "admin" ? "관리자" : "일반 회원"}</td>
        <td><span class="member-status ${escapeHtml(member.status)}">${escapeHtml(statusLabel)}</span></td>
        <td>
          <form class="member-actions" data-member-id="${escapeHtml(member.id)}">
            ${member.status !== "approved" ? `<button name="status" value="approved" type="submit">승인</button>` : ""}
            ${member.role !== "admin" && member.status !== "rejected" ? `<button class="danger" name="status" value="rejected" type="submit">차단</button>` : ""}
            ${member.status === "rejected" ? `<button name="status" value="pending" type="submit">대기로 변경</button>` : ""}
          </form>
        </td>
      </tr>`;
  }

  async function handleMemberSubmit(event) {
    const form = event.target.closest("[data-member-id]");
    if (!form) return;
    event.preventDefault();
    const submitter = event.submitter;
    if (!submitter) return;
    submitter.disabled = true;
    const status = submitter.value;
    const updates = {
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      approved_by: status === "approved" ? currentProfile.id : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from("profiles").update(updates).eq("id", form.dataset.memberId);
    if (error) {
      submitter.disabled = false;
      window.alert("회원 상태를 변경하지 못했습니다.");
      return;
    }
    await openMemberModal();
  }

  function handleModalClick(event) {
    if (event.target.matches(".auth-admin-modal") || event.target.closest("[data-member-action='close']")) closeMemberModal();
  }

  function closeMemberModal() {
    authModalRoot.classList.remove("is-open");
    authModalRoot.innerHTML = "";
  }

  async function logoutAndReload() {
    await client.auth.signOut();
    window.location.reload();
  }

  function setFormBusy(form, busy) {
    form.querySelectorAll("input,button").forEach((control) => {
      control.disabled = busy;
    });
  }

  function normalizeUsername(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidUsername(username) {
    return /^[a-z0-9._-]{4,24}$/.test(username);
  }

  function usernameToEmail(username) {
    return `${username}@${ACCOUNT_EMAIL_DOMAIN}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
