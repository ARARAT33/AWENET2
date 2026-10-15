// AWENET Sovereign Client & Master Controller Engine
// Implements Registration/Login, Sovereign Browser, Resource Pooling, Automated ONECOIN Payouts & ONEBANK Governance

(() => {
  const viewEl = document.getElementById("view");
  const pageTitleEl = document.getElementById("pageTitle");
  const modalContainer = document.getElementById("modalContainer");
  const langSelect = document.getElementById("langSelect");
  const platformSelect = document.getElementById("platformSelect");
  const osIcon = document.getElementById("osIcon");
  const topUserPill = document.getElementById("topUserPill");
  const topUserNameText = document.getElementById("topUserNameText");
  const topBalanceText = document.getElementById("topBalanceText");
  const btnEpochTrigger = document.getElementById("btnEpochTrigger");
  const btnLogoutBtn = document.getElementById("btnLogoutBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeToggleIcon = document.getElementById("themeToggleIcon");
  const themeToggleText = document.getElementById("themeToggleText");
  const titlebarRolePill = document.getElementById("titlebarRolePill");
  const authPortal = document.getElementById("authPortal");

  // Multilingual Dictionary
  const i18n = {
    hy: {
      nav_governor: "AWENET Կառավարիչ",
      nav_pool: "Ռեսուրսների Ցանց (Grid)",
      nav_servers: "Սերվերներ և Եկամուտ",
      nav_onecoin: "ONECOIN / ONEBANK",
      nav_browser: "AWE Բրաուզեր",
      nav_sites: "Կայքերի Կառավարում",
      nav_store: "AWESTORE & Creator",
      nav_messenger: "Մեսենջեր & Կանչեր",
      nav_mypage: "MY Page & Սարքեր",
      nav_settings: "Կարգավորումներ",
      connected: "Ցանցը միացված է",
      trigger_payout: "Բաշխել Էպոխայի Վճարները",
      toast_copied: "AWEID-ը պատճենվեց",
      save: "Պահպանել",
      claim: "Ստանալ ONECOIN",
      verify: "Վավերացնել",
      open: "Բացել"
    },
    en: {
      nav_governor: "AWENET Controller",
      nav_pool: "Resource Cloud Grid",
      nav_servers: "Node Servers & Earnings",
      nav_onecoin: "ONECOIN / ONEBANK",
      nav_browser: "AWE Browser",
      nav_sites: "Site Dashboard",
      nav_store: "AWESTORE & Creator",
      nav_messenger: "Messenger & Calls",
      nav_mypage: "MY Page & Devices",
      nav_settings: "Settings & Security",
      connected: "Mesh Cloud Online",
      trigger_payout: "Trigger Epoch Payout",
      toast_copied: "AWEID copied to clipboard",
      save: "Save",
      claim: "Claim ONECOIN",
      verify: "Verify Node",
      open: "Open"
    },
    ru: {
      nav_governor: "Управляющий AWENET",
      nav_pool: "Облачный Пул Ресурсов",
      nav_servers: "Серверы и Доход",
      nav_onecoin: "ONECOIN / ONEBANK",
      nav_browser: "Браузер AWE",
      nav_sites: "Панель Сайтов",
      nav_store: "AWESTORE и Инструменты",
      nav_messenger: "Мессенджер",
      nav_mypage: "Моя Страница",
      nav_settings: "Настройки",
      connected: "Сеть Подключена",
      trigger_payout: "Выплатить Эпоху",
      toast_copied: "AWEID скопирован",
      save: "Сохранить",
      claim: "Забрать ONECOIN",
      verify: "Подтвердить",
      open: "Открыть"
    }
  };

  let curLang = "hy";
  function t(k) {
    return (i18n[curLang] && i18n[curLang][k]) || (i18n.en && i18n.en[k]) || k;
  }

  function apiBase() {
    if (location.protocol === "http:" || location.protocol === "https:") return location.origin;
    return "http://127.0.0.1:3000";
  }

  function getStoredToken() {
    return localStorage.getItem("awenet_token") || "";
  }

  async function api(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const token = getStoredToken();
    try {
      const res = await fetch(apiBase() + path, {
        ...options,
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}`, "X-Auth-Token": token } : {}),
          ...(options.headers || {})
        }
      });
      const text = await res.text();
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text);
          if (j.error) errMsg = j.error;
        } catch (_) {}
        throw new Error(errMsg);
      }
      return text ? JSON.parse(text) : {};
    } finally {
      clearTimeout(timer);
    }
  }

  // Live state
  const live = {
    user: null,
    governor: {},
    reserve: {},
    epoch: {},
    pool: {},
    servers: [],
    onecoin: {},
    sites: [],
    activeTab: "browser"
  };

  // Browser tabs state
  const browserTabs = [
    { id: "tab-1", title: "AWENET Sovereign Portal", url: "awe://welcome", active: true },
    { id: "tab-2", title: "Pooled Node Cloud Grid", url: "awe://nodes", active: false }
  ];

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      el.style.transition = "all 0.3s ease";
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  function showModal(title, bodyHtml, footerHtml = "") {
    modalContainer.style.display = "block";
    modalContainer.innerHTML = `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-head">
            <h3>${esc(title)}</h3>
            <button class="modal-close" id="modalCloseBtn">✕</button>
          </div>
          <div class="modal-body">${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-footer" style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;">${footerHtml}</div>` : ""}
        </div>
      </div>
    `;
    const close = () => {
      modalContainer.style.display = "none";
      modalContainer.innerHTML = "";
    };
    document.getElementById("modalCloseBtn").onclick = close;
    document.getElementById("modalOverlay").onclick = close;
  }

  function closeModal() {
    modalContainer.style.display = "none";
    modalContainer.innerHTML = "";
  }

  // Theme Management
  function initTheme() {
    const savedTheme = localStorage.getItem("awenet_theme") || "light";
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.remove("theme-light");
      document.body.classList.add("theme-dark");
      if (themeToggleIcon) themeToggleIcon.textContent = "🌙";
      if (themeToggleText) themeToggleText.textContent = "Մութ Թեմա";
      localStorage.setItem("awenet_theme", "dark");
    } else {
      document.body.classList.remove("theme-dark");
      document.body.classList.add("theme-light");
      if (themeToggleIcon) themeToggleIcon.textContent = "☀️";
      if (themeToggleText) themeToggleText.textContent = "Բաց Թեմա";
      localStorage.setItem("awenet_theme", "light");
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.onclick = () => {
      const isDark = document.body.classList.contains("theme-dark");
      applyTheme(isDark ? "light" : "dark");
    };
  }

  // 12-Word Mnemonic Generator
  const WORDLIST = [
    "ocean", "ripple", "canyon", "falcon", "beacon", "summit",
    "anchor", "crystal", "matrix", "horizon", "pulse", "vector",
    "solace", "quantum", "cipher", "stellar", "zenith", "vortex",
    "aurora", "nexus", "prism", "radiant", "timber", "valiant"
  ];
  function makeSeed() {
    const res = [];
    for (let i = 0; i < 12; i++) {
      res.push(WORDLIST[Math.floor(Math.random() * WORDLIST.length)]);
    }
    return res.join(" ");
  }

  // Authentication Flow
  function checkAuth() {
    const token = getStoredToken();
    const storedUser = localStorage.getItem("awenet_user");
    if (!token || !storedUser) {
      showAuthPortal();
      return false;
    }
    try {
      live.user = JSON.parse(storedUser);
      updateUserUI();
      hideAuthPortal();
      return true;
    } catch (_) {
      showAuthPortal();
      return false;
    }
  }

  function showAuthPortal() {
    if (authPortal) authPortal.style.display = "flex";
  }

  function hideAuthPortal() {
    if (authPortal) authPortal.style.display = "none";
  }

  function updateUserUI() {
    if (!live.user) return;
    const name = live.user.display_name || "Ararat Avetisyan";
    const isMaster = live.user.role === "MASTER_CONTROLLER";
    if (topUserNameText) topUserNameText.textContent = `${isMaster ? "👑 " : "👤 "}${name}`;
    if (titlebarRolePill) {
      titlebarRolePill.textContent = `${isMaster ? "👑 Master Controller: " : "👤 Node User: "}${name}`;
    }
    const sideAweId = document.getElementById("sideAweId");
    if (sideAweId) {
      sideAweId.textContent = `${isMaster ? "Controller: " : "Citizen: "}${name}`;
    }
  }

  // Wire Auth Tabs
  const tabBtnReg = document.getElementById("tabBtnRegister");
  const tabBtnLog = document.getElementById("tabBtnLogin");
  const tabBtnRes = document.getElementById("tabBtnRestore");
  const formReg = document.getElementById("authRegisterForm");
  const formLog = document.getElementById("authLoginForm");
  const formRes = document.getElementById("authRestoreForm");

  function setAuthTab(tab) {
    if (tabBtnReg) tabBtnReg.classList.toggle("active", tab === "reg");
    if (tabBtnLog) tabBtnLog.classList.toggle("active", tab === "log");
    if (tabBtnRes) tabBtnRes.classList.toggle("active", tab === "res");
    if (formReg) formReg.style.display = tab === "reg" ? "block" : "none";
    if (formLog) formLog.style.display = tab === "log" ? "block" : "none";
    if (formRes) formRes.style.display = tab === "res" ? "block" : "none";
  }

  if (tabBtnReg) tabBtnReg.onclick = () => setAuthTab("reg");
  if (tabBtnLog) tabBtnLog.onclick = () => setAuthTab("log");
  if (tabBtnRes) tabBtnRes.onclick = () => setAuthTab("res");

  const btnRegenSeed = document.getElementById("btnRegenSeed");
  const regSeedBox = document.getElementById("regSeedBox");
  if (btnRegenSeed && regSeedBox) {
    btnRegenSeed.onclick = () => {
      regSeedBox.textContent = makeSeed();
    };
  }

  // Role Card selector
  let selectedRole = "MASTER_CONTROLLER";
  const roleMaster = document.getElementById("roleMaster");
  const roleServer = document.getElementById("roleServer");
  if (roleMaster && roleServer) {
    roleMaster.onclick = () => {
      selectedRole = "MASTER_CONTROLLER";
      roleMaster.classList.add("selected");
      roleServer.classList.remove("selected");
    };
    roleServer.onclick = () => {
      selectedRole = "NODE_OPERATOR";
      roleServer.classList.add("selected");
      roleMaster.classList.remove("selected");
    };
  }

  // Register Submit
  const btnSubmitRegister = document.getElementById("btnSubmitRegister");
  if (btnSubmitRegister) {
    btnSubmitRegister.onclick = async () => {
      try {
        const payload = {
          display_name: document.getElementById("regDisplayName").value.trim(),
          username: document.getElementById("regUsername").value.trim(),
          email: document.getElementById("regEmail").value.trim(),
          role: selectedRole,
          password: document.getElementById("regPassword").value.trim(),
          seed_phrase: regSeedBox.textContent.trim()
        };
        const res = await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
        localStorage.setItem("awenet_token", res.token);
        localStorage.setItem("awenet_user", JSON.stringify(res.user));
        live.user = res.user;
        updateUserUI();
        hideAuthPortal();
        toast("Sovereign Identity Registered! Opening AWE Browser...");
        await refresh();
        // Immediately open browser as specifically requested by user!
        renderView("browser");
      } catch (e) {
        toast("Registration error: " + e.message);
      }
    };
  }

  // 1-Click Master Login
  const btnQuickMasterLogin = document.getElementById("btnQuickMasterLogin");
  if (btnQuickMasterLogin) {
    btnQuickMasterLogin.onclick = async () => {
      try {
        const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ quick_master: true }) });
        localStorage.setItem("awenet_token", res.token);
        localStorage.setItem("awenet_user", JSON.stringify(res.user));
        live.user = res.user;
        updateUserUI();
        hideAuthPortal();
        toast("Welcome back, Master Controller Ararat Avetisyan! Opening Browser...");
        await refresh();
        renderView("browser");
      } catch (e) {
        toast("Login error: " + e.message);
      }
    };
  }

  // Login Submit
  const btnSubmitLogin = document.getElementById("btnSubmitLogin");
  if (btnSubmitLogin) {
    btnSubmitLogin.onclick = async () => {
      try {
        const payload = {
          login_identifier: document.getElementById("loginUsername").value.trim(),
          password: document.getElementById("loginPassword").value.trim()
        };
        const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
        localStorage.setItem("awenet_token", res.token);
        localStorage.setItem("awenet_user", JSON.stringify(res.user));
        live.user = res.user;
        updateUserUI();
        hideAuthPortal();
        toast("Unlocked Vault! Opening AWE Browser...");
        await refresh();
        renderView("browser");
      } catch (e) {
        toast("Login error: " + e.message);
      }
    };
  }

  // Restore Submit
  const btnSubmitRestore = document.getElementById("btnSubmitRestore");
  if (btnSubmitRestore) {
    btnSubmitRestore.onclick = async () => {
      try {
        const payload = {
          seed_phrase: document.getElementById("restoreSeedInput").value.trim()
        };
        const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
        localStorage.setItem("awenet_token", res.token);
        localStorage.setItem("awenet_user", JSON.stringify(res.user));
        live.user = res.user;
        updateUserUI();
        hideAuthPortal();
        toast("Identity Restored from Mnemonic! Opening Browser...");
        await refresh();
        renderView("browser");
      } catch (e) {
        toast("Restore error: " + e.message);
      }
    };
  }

  // Logout
  if (btnLogoutBtn) {
    btnLogoutBtn.onclick = async () => {
      try {
        await api("/api/auth/logout", { method: "POST" });
      } catch (_) {}
      localStorage.removeItem("awenet_token");
      localStorage.removeItem("awenet_user");
      live.user = null;
      toast("Logged out. Please login or register.");
      showAuthPortal();
    };
  }

  // Refresh live backend state
  async function refresh() {
    try {
      const [govRes, poolRes, srvRes, walRes, siteRes] = await Promise.allSettled([
        api("/api/governor/status"),
        api("/api/pool/stats"),
        api("/api/pool/servers"),
        api("/api/onebank/wallet"),
        api("/api/sites")
      ]);

      if (govRes.status === "fulfilled") {
        live.governor = govRes.value.governor || {};
        live.reserve = govRes.value.reserve || {};
        live.epoch = govRes.value.epoch || {};
      }
      if (poolRes.status === "fulfilled") {
        live.pool = poolRes.value.pool || {};
      }
      if (srvRes.status === "fulfilled") {
        live.servers = srvRes.value.servers || [];
      }
      if (walRes.status === "fulfilled") {
        live.onecoin = walRes.value || {};
        if (topBalanceText) {
          topBalanceText.textContent = `${(live.onecoin.balance_coins || 500).toLocaleString()} ONECOIN`;
        }
      }
      if (siteRes.status === "fulfilled") {
        live.sites = siteRes.value.sites || [];
      }

      const gridBadge = document.getElementById("poolGridBadge");
      if (gridBadge && live.pool.total_storage_tb) {
        gridBadge.textContent = `${live.pool.total_storage_tb} TB`;
      }
      const netPill = document.getElementById("networkPillText");
      if (netPill && live.servers.length) {
        netPill.textContent = `Mesh Cloud Online · ${live.servers.length} Servers`;
      }
    } catch (e) {
      console.warn("State sync:", e.message);
    }
  }

  // View Router
  function renderView(viewName) {
    live.activeTab = viewName;
    document.querySelectorAll(".nav").forEach(n => {
      n.classList.toggle("active", n.dataset.view === viewName);
    });

    const titles = {
      browser: ["AWE Բրաուզեր", "Ապակենտրոնացված վեբ դիտիչ և որոնում"],
      governor: ["AWENET Կառավարիչ & ONEBANK Շտաբ", "Ցանցի գլխավոր հսկողություն, դրամական էմիսիա և սերվերների վավերացում"],
      pool: ["Ռեսուրսների Ցանց (Cloud Grid)", "Համայնքային սերվերներից միավորված պրոցեսորներ, հիշողություն և պահոց"],
      servers: ["Սերվերներ և Եկամուտ", "Տրամադրեք սերվեր ցանցին և շահեք ավտոմատ ONECOIN վճարումներ"],
      onecoin: ["ONECOIN / ONEBANK Էկոնոմիկա", "Դրամապանակ, 1% միջնորդավճար, P2P փոխանցումներ և կենտրոնական ռեզերվ"],
      sites: ["Կայքերի Կառավարում", "Ստեղծեք և տեղադրեք կայքեր՝ հոսթինգ տրամադրված միացյալ սերվերների վրա"],
      store: ["AWESTORE & Creator", "Ապակենտրոնացված հավելվածներ և մշակողների գործիքներ"],
      messenger: ["Մեսենջեր & Կանչեր", "Կոդավորված հաղորդագրություններ և աուդիո/վիդեո կապ"],
      mypage: ["MY Page & Սարքեր", "Ինքնիշխան բանալիներ և ակտիվ սարքավորումներ"],
      settings: ["Կարգավորումներ", "Անվտանգություն, կրիպտոգրաֆիա և պարամետրեր"]
    };

    const cur = titles[viewName] || ["AWENET", ""];
    if (pageTitleEl) pageTitleEl.textContent = cur[0];

    switch (viewName) {
      case "browser": renderBrowser(); break;
      case "governor": renderGovernor(); break;
      case "pool": renderPool(); break;
      case "servers": renderServers(); break;
      case "onecoin": renderOnecoin(); break;
      case "sites": renderSites(); break;
      case "store": renderStore(); break;
      case "messenger": renderMessenger(); break;
      case "mypage": renderMypage(); break;
      case "settings": renderSettings(); break;
      default: renderBrowser(); break;
    }
  }

  // 1. DECENTRALIZED BROWSER
  function renderBrowser() {
    const activeTab = browserTabs.find(t => t.active) || browserTabs[0];

    viewEl.innerHTML = `
      <div class="content browser-chrome">
        <!-- Browser Tabs Strip -->
        <div class="browser-tabs-bar" id="bTabsBar">
          ${browserTabs.map(t => `
            <div class="b-tab ${t.active ? 'active' : ''}" data-tabid="${esc(t.id)}">
              <span>${esc(t.title)}</span>
              <span class="close-tab" data-closeid="${esc(t.id)}" style="font-size:11px;margin-left:4px;color:var(--text-muted);">✕</span>
            </div>
          `).join("")}
          <button class="b-tab-add" id="btnAddBTab" title="New Tab">+</button>
        </div>

        <!-- Navigation Bar -->
        <div class="browser-nav-bar">
          <button class="browser-nav-btn" id="btnBBack" title="Back">◀</button>
          <button class="browser-nav-btn" id="btnBForward" title="Forward">▶</button>
          <button class="browser-nav-btn" id="btnBRefresh" title="Reload">🔄</button>
          <button class="browser-nav-btn" id="btnBHome" title="Home">🏠</button>
          <input type="text" class="browser-url-input" id="bUrlInput" value="${esc(activeTab.url)}" placeholder="awe://welcome or awe://nodes or search...">
          <button class="btn primary" id="btnBGo" style="padding:6px 14px;">${t('open')}</button>
        </div>

        <!-- Bookmarks Chips Bar -->
        <div class="browser-bookmarks-bar">
          <span style="font-size:11px;color:var(--text-muted);font-weight:600;">Էջանշաններ:</span>
          <span class="bookmark-chip" data-url="awe://welcome">🌐 awe://welcome (Պորտալ)</span>
          <span class="bookmark-chip" data-url="awe://nodes">⚡ awe://nodes (Սերվերներ)</span>
          <span class="bookmark-chip" data-url="awe://onebank">🏦 awe://onebank (Ռեզերվ)</span>
          <span class="bookmark-chip" data-url="awe://sites">📄 awe://sites (Կայքեր)</span>
        </div>

        <!-- Viewport Iframe -->
        <iframe id="browserIframe" class="browser-viewport" src="/api/browser/render?url=${encodeURIComponent(activeTab.url)}" title="AWE Browser Viewport"></iframe>
      </div>
    `;

    // Tab clicks
    document.querySelectorAll(".b-tab").forEach(tab => {
      tab.onclick = e => {
        if (e.target.classList.contains("close-tab")) return;
        const tabId = tab.dataset.tabid;
        browserTabs.forEach(t => t.active = (t.id === tabId));
        renderBrowser();
      };
    });

    // Close tab
    document.querySelectorAll(".close-tab").forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        if (browserTabs.length <= 1) return;
        const closeId = btn.dataset.closeid;
        const idx = browserTabs.findIndex(t => t.id === closeId);
        if (idx !== -1) {
          browserTabs.splice(idx, 1);
          browserTabs[0].active = true;
          renderBrowser();
        }
      };
    });

    // Add Tab
    const btnAdd = document.getElementById("btnAddBTab");
    if (btnAdd) {
      btnAdd.onclick = () => {
        const newId = `tab-${Date.now()}`;
        browserTabs.forEach(t => t.active = false);
        browserTabs.push({ id: newId, title: "New Tab", url: "awe://welcome", active: true });
        renderBrowser();
      };
    }

    // Nav Bar actions
    const btnGo = document.getElementById("btnBGo");
    const urlInput = document.getElementById("bUrlInput");
    const iframe = document.getElementById("browserIframe");

    function navigateTo(url) {
      const cleanUrl = url.trim();
      activeTab.url = cleanUrl;
      activeTab.title = cleanUrl.replace("awe://", "");
      if (urlInput) urlInput.value = cleanUrl;
      if (iframe) iframe.src = `/api/browser/render?url=${encodeURIComponent(cleanUrl)}`;
    }

    if (btnGo && urlInput) {
      btnGo.onclick = () => navigateTo(urlInput.value);
      urlInput.onkeydown = e => {
        if (e.key === "Enter") navigateTo(urlInput.value);
      };
    }

    const btnRefresh = document.getElementById("btnBRefresh");
    if (btnRefresh && iframe) btnRefresh.onclick = () => iframe.src = iframe.src;

    const btnHome = document.getElementById("btnBHome");
    if (btnHome) btnHome.onclick = () => navigateTo("awe://welcome");

    // Bookmark clicks
    document.querySelectorAll(".bookmark-chip").forEach(chip => {
      chip.onclick = () => navigateTo(chip.dataset.url);
    });
  }

  // 2. MASTER CONTROLLER & ONEBANK GOVERNANCE
  function renderGovernor() {
    const gov = live.governor || {};
    const res = live.reserve || {};
    const epoch = live.epoch || {};

    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>AWENET Գլխավոր Կառավարիչ & ONEBANK Շտաբ</h1>
            <p>Ցանցի սեփականատիրոջ և կառավարչի (Ararat Avetisyan) հրամանատարական կենտրոն:</p>
          </div>
          <div class="actions">
            <button class="btn primary" id="btnGovTriggerPayout">⚡ Բաշխել Էպոխայի Վճարները</button>
            <button class="btn secondary" id="btnGovMintModal">🏦 Էմիսիա (Mint Reserve)</button>
          </div>
        </div>

        <!-- Master KPI Metrics -->
        <div class="grid" style="margin-bottom:18px;">
          <div class="card">
            <div class="metric-label">ONEBANK Կենտրոնական Ռեզերվ</div>
            <div class="metric accent">${(gov.onebank_central_reserve_coins || 2500000).toLocaleString()} 1C</div>
            <div class="muted">Երաշխավորված ցանցային ֆոնդ</div>
          </div>
          <div class="card">
            <div class="metric-label">Հավաքագրված 1% Ֆոնդ</div>
            <div class="metric cyan">${(gov.onebank_collected_fees_coins || 14820).toFixed(2)} 1C</div>
            <div class="muted">Բոլոր փոխանցումների միջնորդավճարները</div>
          </div>
          <div class="card">
            <div class="metric-label">Գլոբալ Միջնորդավճար</div>
            <div class="metric">${((gov.global_protocol_fee_bps || 100) / 100).toFixed(2)}%</div>
            <div class="muted">Սահմանված է Կառավարչի կողմից</div>
          </div>
          <div class="card">
            <div class="metric-label">Էպոխայի Էմիսիա (Payouts)</div>
            <div class="metric">${gov.epoch_emission_rate_coins || 500} 1C</div>
            <div class="muted">Էպոխա #${epoch.number || 152}</div>
          </div>
        </div>

        <div class="two">
          <!-- Policy Controls -->
          <div class="panel">
            <div class="section-head">
              <h2>Կառավարչի Քաղաքականության Կարգավորումներ</h2>
              <span class="pill active">👑 Master Authority</span>
            </div>
            <div class="form-group">
              <label class="form-label">Գլոբալ Պրոտոկոլային Միջնորդավճար (BPS: 100 = 1%)</label>
              <input type="number" class="input" id="inpFeeBps" value="${gov.global_protocol_fee_bps || 100}">
            </div>
            <div class="form-group">
              <label class="form-label">Էպոխայի Վճարման Ֆոնդ (ONECOIN to Node Servers)</label>
              <input type="number" class="input" id="inpEpochEmission" value="${gov.epoch_emission_rate_coins || 500}">
            </div>
            <div class="form-group">
              <label class="form-label">Բազային Գին ($ USD)</label>
              <input type="number" step="0.05" class="input" id="inpFloorPrice" value="${gov.baseline_floor_price_usd || 1.25}">
            </div>
            <button class="btn primary" id="btnSaveGovPolicy" style="width:100%;">${t('save')}</button>
          </div>

          <!-- Active Servers Verification -->
          <div class="panel">
            <div class="section-head">
              <h2>Միացված Սերվերների Վավերացում</h2>
              <span class="pill active">${live.servers.length} Սերվեր</span>
            </div>
            <div class="list">
              ${live.servers.map(s => `
                <div class="list-row">
                  <div>
                    <b style="color:var(--text-contrast);">${esc(s.name)}</b>
                    <div class="muted">${esc(s.region)} · ${s.cpu_cores} Cores · ${s.ram_gb} GB RAM</div>
                  </div>
                  <div style="display:flex;gap:6px;">
                    <span class="pill ${s.verified ? 'active' : ''}">${s.verified ? 'Վավերացված' : 'Սովորական'}</span>
                    <button class="btn secondary btn-slash-server" data-srvid="${esc(s.id)}" style="padding:2px 8px;font-size:10px;">Անջատել</button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("btnGovTriggerPayout").onclick = async () => {
      try {
        const res = await api("/api/governor/trigger-payout", { method: "POST" });
        toast(`Էպոխա #${res.epoch} բաշխվեց: ${res.total_coins_paid} ONECOIN վճարվեց սերվերներին:`);
        await refresh();
        renderGovernor();
      } catch (e) {
        toast(e.message);
      }
    };

    document.getElementById("btnGovMintModal").onclick = () => {
      showModal("ONEBANK Կենտրոնական Ռեզերվի Էմիսիա", `
        <div class="form-group">
          <label class="form-label">Էմիսիայի Քանակ (ONECOIN)</label>
          <input type="number" class="input" id="inpMintAmt" value="50000">
        </div>
        <div class="form-group">
          <label class="form-label">Նպատակ / Գրառում</label>
          <input type="text" class="input" id="inpMintMemo" value="Սերվերների պարգևավճարների ֆոնդի համալրում">
        </div>
      `, `<button class="btn primary" id="btnConfirmMint">Կատարել Էմիսիա</button>`);

      document.getElementById("btnConfirmMint").onclick = async () => {
        try {
          const amt = Number(document.getElementById("inpMintAmt").value);
          const memo = document.getElementById("inpMintMemo").value;
          await api("/api/governor/mint-reserve", { method: "POST", body: JSON.stringify({ amount_coins: amt, memo }) });
          closeModal();
          toast(`Հաջողությամբ էմիսիա արվեց ${amt} ONECOIN!`);
          await refresh();
          renderGovernor();
        } catch (e) {
          toast(e.message);
        }
      };
    };

    document.getElementById("btnSaveGovPolicy").onclick = async () => {
      try {
        const payload = {
          fee_bps: Number(document.getElementById("inpFeeBps").value),
          epoch_emission_coins: Number(document.getElementById("inpEpochEmission").value),
          floor_price_usd: Number(document.getElementById("inpFloorPrice").value)
        };
        await api("/api/governor/update-policy", { method: "POST", body: JSON.stringify(payload) });
        toast("Քաղաքականությունը հաջողությամբ թարմացվեց:");
        await refresh();
        renderGovernor();
      } catch (e) {
        toast(e.message);
      }
    };

    document.querySelectorAll(".btn-slash-server").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Անջատե՞լ այս սերվերը ցանցից:")) return;
        try {
          await api("/api/governor/slash-node", { method: "POST", body: JSON.stringify({ server_id: btn.dataset.srvid }) });
          toast("Սերվերն անջատվեց:");
          await refresh();
          renderGovernor();
        } catch (e) {
          toast(e.message);
        }
      };
    });
  }

  // 3. RESOURCE CLOUD GRID
  function renderPool() {
    const pool = live.pool || {};

    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>Ռեսուրսների Ցանց (Global Cloud Grid)</h1>
            <p>Օգտատերերի սերվերները գումարվում են իրար և հավասարապես բաշխվում բոլորին:</p>
          </div>
          <div class="actions">
            <button class="btn primary" id="btnJoinServerToPool">+ Տրամադրել Նոր Սերվեր</button>
          </div>
        </div>

        <div class="grid" style="margin-bottom:18px;">
          <div class="card">
            <div class="metric-label">Միացյալ Պահոց (Storage)</div>
            <div class="metric accent">${pool.total_storage_tb || 290} TB</div>
            <div class="muted">${pool.allocated_storage_tb || 80} TB օգտագործված · ${pool.free_storage_tb || 210} TB ազատ</div>
          </div>
          <div class="card">
            <div class="metric-label">Միացյալ Պրոցեսորներ (CPU)</div>
            <div class="metric cyan">${pool.total_cpu_cores || 256} Cores</div>
            <div class="muted">${pool.allocated_cpu_cores || 96} Ակտիվ հոսքեր</div>
          </div>
          <div class="card">
            <div class="metric-label">Միացյալ Օպերատիվ Հիշողություն (RAM)</div>
            <div class="metric">${pool.total_ram_tb || 0.95} TB</div>
            <div class="muted">Բաշխված առաջադրանքների համար</div>
          </div>
          <div class="card">
            <div class="metric-label">Ցանցային Թողունակություն (Bandwidth)</div>
            <div class="metric">${pool.bandwidth_capacity_gbps || 15.5} Gbps</div>
            <div class="muted">${pool.current_throughput_gbps || 4.2} Gbps ծանրաբեռնվածություն</div>
          </div>
        </div>

        <div class="panel">
          <div class="section-head">
            <h2>Ակտիվ Առաջադրանքներ Միացյալ Սերվերների Վրա</h2>
            <span class="pill active">64 Running Tasks</span>
          </div>
          <div class="list">
            <div class="list-row">
              <div>
                <b style="color:var(--text-contrast);">Ապակենտրոնացված Կայքերի Հոսթինգ</b>
                <div class="muted">Կայքերն ավտոմատ բաշխված են Երևանի, Ֆրանկֆուրտի և Ստոկհոլմի սերվերներում</div>
              </div>
              <span class="pill active">100% Online</span>
            </div>
            <div class="list-row">
              <div>
                <b style="color:var(--text-contrast);">Ֆայլերի Կրկնօրինակում և Կոդավորում</b>
                <div class="muted">Reed-Solomon 48,000 շարդեր՝ BLAKE3 կրիպտոգրաֆիկ հեշերով</div>
              </div>
              <span class="pill active">Պաշտպանված</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("btnJoinServerToPool").onclick = () => {
      renderView("servers");
    };
  }

  // 4. NODE SERVERS & AUTOMATED ONECOIN PAYOUTS
  function renderServers() {
    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>Սերվերներ և Ավտոմատ ONECOIN Եկամուտ</h1>
            <p>Տրամադրեք Ձեր սերվերի հզորությունը ցանցին և ստացեք ավտոմատ վճարումներ ամեն էպոխա:</p>
          </div>
          <div class="actions">
            <button class="btn primary" id="btnRegisterNewServer">+ Միացնել Նոր Սերվեր Ցանցին</button>
          </div>
        </div>

        <div class="panel">
          <div class="section-head">
            <h2>Ցանցին Տրամադրված Սերվերներ (${live.servers.length})</h2>
            <span class="pill active">Ավտոմատ ONECOIN Վճարումներ</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(360px, 1fr));gap:16px;">
            ${live.servers.map(s => `
              <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                    <div>
                      <h3 style="margin:0 0 4px;font-size:16px;color:var(--text-contrast);">${esc(s.name)}</h3>
                      <span class="muted" style="font-size:11px;">Տեր՝ ${esc(s.owner_name)} · ${esc(s.region)}</span>
                    </div>
                    <span class="pill active">${s.uptime_pct}% Uptime</span>
                  </div>

                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:14px;">
                    <div style="background:var(--bg-surface-elevated);padding:8px;border-radius:6px;">CPU: <b>${s.cpu_cores} Cores</b></div>
                    <div style="background:var(--bg-surface-elevated);padding:8px;border-radius:6px;">RAM: <b>${s.ram_gb} GB</b></div>
                    <div style="background:var(--bg-surface-elevated);padding:8px;border-radius:6px;">Storage: <b>${s.storage_tb} TB SSD</b></div>
                    <div style="background:var(--bg-surface-elevated);padding:8px;border-radius:6px;">Bandwidth: <b>${s.bandwidth_mbps} Mbps</b></div>
                  </div>
                </div>

                <div style="background:var(--bg-surface-elevated);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span class="muted" style="font-size:11.5px;">Չպահանջված Վարձատրություն:</span>
                    <b style="color:var(--accent-emerald);font-size:15px;">${s.pending_reward_coins.toFixed(2)} ONECOIN</b>
                  </div>
                  <button class="btn primary btn-claim-server-reward" data-srvid="${esc(s.id)}" style="width:100%;" ${s.pending_reward_coins <= 0 ? 'disabled' : ''}>
                    🎁 Ստանալ ONECOIN Դրամապանակում
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll(".btn-claim-server-reward").forEach(b => {
      b.onclick = async () => {
        try {
          const res = await api("/api/pool/servers/claim-reward", {
            method: "POST",
            body: JSON.stringify({ server_id: b.dataset.srvid })
          });
          toast(`Ստացվեց ${res.claimed_coins} ONECOIN! Ձեր նոր հաշվեկշիռը՝ ${res.new_balance_coins} 1C`);
          await refresh();
          renderServers();
        } catch (e) {
          toast(e.message);
        }
      };
    });

    document.getElementById("btnRegisterNewServer").onclick = () => {
      showModal("Տրամադրել Նոր Սերվեր AWENET Ցանցին", `
        <div class="form-group">
          <label class="form-label">Սերվերի Անուն / Հոսթ</label>
          <input type="text" class="input" id="inpSrvName" placeholder="օր․ Yerevan High-Performance Node" value="Yerevan High-Performance Node">
        </div>
        <div class="form-group">
          <label class="form-label">Տեղակայում (Region)</label>
          <input type="text" class="input" id="inpSrvRegion" value="Yerevan, AM">
        </div>
        <div class="grid-2" style="gap:10px;">
          <div class="form-group">
            <label class="form-label">CPU Cores</label>
            <input type="number" class="input" id="inpSrvCpu" value="32" min="1" max="256">
          </div>
          <div class="form-group">
            <label class="form-label">RAM (GB)</label>
            <input type="number" class="input" id="inpSrvRam" value="128" min="4" max="1024">
          </div>
        </div>
        <div class="grid-2" style="gap:10px;">
          <div class="form-group">
            <label class="form-label">Պահոց (SSD TB)</label>
            <input type="number" class="input" id="inpSrvStorage" value="10" min="1" max="500">
          </div>
          <div class="form-group">
            <label class="form-label">Թողունակություն (Mbps)</label>
            <input type="number" class="input" id="inpSrvBw" value="1000" min="100" max="100000">
          </div>
        </div>
      `, `<button class="btn primary" id="btnConfirmRegServer">Միացնել և Գումարել Ցանցին</button>`);

      document.getElementById("btnConfirmRegServer").onclick = async () => {
        try {
          const payload = {
            name: document.getElementById("inpSrvName").value.trim(),
            region: document.getElementById("inpSrvRegion").value.trim(),
            cpu_cores: Number(document.getElementById("inpSrvCpu").value),
            ram_gb: Number(document.getElementById("inpSrvRam").value),
            storage_tb: Number(document.getElementById("inpSrvStorage").value),
            bandwidth_mbps: Number(document.getElementById("inpSrvBw").value)
          };
          await api("/api/pool/servers/register", { method: "POST", body: JSON.stringify(payload) });
          closeModal();
          toast("Սերվերը միացվեց ռեսուրսների ցանցին: Շնորհավորական 10 ONECOIN բոնուսը ավելացվեց!");
          await refresh();
          renderServers();
        } catch (e) {
          toast(e.message);
        }
      };
    };
  }

  // 5. ONECOIN / ONEBANK
  function renderOnecoin() {
    if (window.renderOnecoinApp) {
      window.renderOnecoinApp();
    }
  }

  // 6. SITES MANAGEMENT
  function renderSites() {
    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>Կայքերի Կառավարում (Sites Dashboard)</h1>
            <p>Ստեղծեք և տեղադրեք ապակենտրոնացված կայքեր՝ առանց կենտրոնացված հոսթինգի:</p>
          </div>
          <div class="actions">
            <button class="btn primary" id="btnCreateSiteModal">+ Ստեղծել Նոր Կայք</button>
          </div>
        </div>

        <div class="grid">
          ${(live.sites || []).map(s => `
            <div class="card">
              <span class="pill active">🌐 Հոսթինգը՝ Միացյալ Սերվերներում</span>
              <h3 style="margin:12px 0 6px;color:var(--text-contrast);">${esc(s.name)}</h3>
              <p style="color:var(--text-secondary);font-size:12px;margin:0 0 12px;">${esc(s.description)}</p>
              <button class="btn primary btn-open-site-browser" data-objid="${esc(s.object_id)}">Բացել Բրաուզերում</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    document.querySelectorAll(".btn-open-site-browser").forEach(btn => {
      btn.onclick = () => {
        const objId = btn.dataset.objid;
        browserTabs[0].url = `awe://object/${objId}`;
        browserTabs[0].active = true;
        renderView("browser");
      };
    });

    document.getElementById("btnCreateSiteModal").onclick = () => {
      showModal("Ստեղծել Ապակենտրոնացված Կայք", `
        <div class="form-group">
          <label class="form-label">Կայքի Անուն</label>
          <input type="text" class="input" id="inpSiteTitle" value="Իմ Ապակենտրոնացված Կայքը">
        </div>
        <div class="form-group">
          <label class="form-label">Նկարագրություն</label>
          <input type="text" class="input" id="inpSiteDesc" value="Տեղակայված է AWENET միացյալ սերվերներում">
        </div>
      `, `<button class="btn primary" id="btnDoCreateSite">Տեղադրել Ցանցում (5 1C)</button>`);

      document.getElementById("btnDoCreateSite").onclick = async () => {
        try {
          await api("/api/sites/create", {
            method: "POST",
            body: JSON.stringify({
              name: document.getElementById("inpSiteTitle").value.trim(),
              description: document.getElementById("inpSiteDesc").value.trim()
            })
          });
          closeModal();
          toast("Կայքը ստեղծվեց և բաշխվեց միացյալ սերվերների վրա!");
          await refresh();
          renderSites();
        } catch (e) {
          toast(e.message);
        }
      };
    };
  }

  // 7. STORE
  function renderStore() {
    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>AWESTORE & Creator Studio</h1>
            <p>Վավերացված ծրագրեր և մշակողների գործիքներ:</p>
          </div>
        </div>
        <div class="grid">
          <div class="card">
            <span class="pill active">Գործիք</span>
            <h3 style="margin:10px 0 6px;color:var(--text-contrast);">Node Monitor Pro</h3>
            <p style="font-size:12px;color:var(--text-secondary);">Սերվերի ռեսուրսների և եկամուտների ուղիղ մոնիթորինգ:</p>
            <button class="btn secondary" style="width:100%;">Տեղադրել</button>
          </div>
          <div class="card">
            <span class="pill active">Հավելված</span>
            <h3 style="margin:10px 0 6px;color:var(--text-contrast);">Encrypted Voice Vault</h3>
            <p style="font-size:12px;color:var(--text-secondary);">Ձայնային ապահով հաղորդակցություն P2P ցանցում:</p>
            <button class="btn secondary" style="width:100%;">Տեղադրել</button>
          </div>
        </div>
      </div>
    `;
  }

  // 8. MESSENGER
  function renderMessenger() {
    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>Մեսենջեր & WebRTC Կանչեր</h1>
            <p>Ծայրից ծայր կոդավորված կապ AWENET մասնակիցների միջև:</p>
          </div>
        </div>
        <div class="panel">
          <div class="section-head">
            <h2>P2P Չաթ</h2>
            <span class="pill active">Ed25519 Encrypted</span>
          </div>
          <div class="list" id="msgList" style="max-height:300px;overflow-y:auto;margin-bottom:14px;">
            <div class="list-row">
              <div>
                <b style="color:var(--text-contrast);">awe-system</b>
                <div class="muted">Բարի գալուստ AWENET: Դուք հանդիսանում եք Ցանցի Գլխավոր Կառավարիչը և ONEBANK-ի Ղեկավարը (Ararat Avetisyan):</div>
              </div>
              <span class="pill active">Delivered</span>
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <input type="text" class="input" id="inpMsgText" placeholder="Գրեք հաղորդագրություն...">
            <button class="btn primary" id="btnSendMsg">Ուղարկել</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("btnSendMsg").onclick = async () => {
      const inp = document.getElementById("inpMsgText");
      const txt = inp.value.trim();
      if (!txt) return;
      try {
        await api("/api/messenger/send", { method: "POST", body: JSON.stringify({ text: txt }) });
        inp.value = "";
        toast("Հաղորդագրությունն ուղարկվեց:");
        const msgList = document.getElementById("msgList");
        const row = document.createElement("div");
        row.className = "list-row";
        row.innerHTML = `<div><b style="color:var(--text-contrast);">${live.user?.display_name || 'Դուք'}</b><div class="muted">${esc(txt)}</div></div><span class="pill active">Sent</span>`;
        msgList.appendChild(row);
      } catch (e) {
        toast(e.message);
      }
    };
  }

  // 9. MY PAGE & DEVICES
  function renderMypage() {
    const u = live.user || {};
    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>MY Page & Սարքեր</h1>
            <p>Ձեր ինքնիշխան հաշիվը, AWE-ID-ն և կցված սարքերը:</p>
          </div>
        </div>
        <div class="panel" style="margin-bottom:18px;">
          <div class="section-head">
            <h2>Ինքնիշխան Տվյալներ</h2>
            <span class="pill active">${u.role || 'MASTER_CONTROLLER'}</span>
          </div>
          <div class="list">
            <div class="list-row"><div><b>Անուն</b><div class="muted">${esc(u.display_name || 'Ararat Avetisyan')}</div></div></div>
            <div class="list-row"><div><b>AWE-ID Բանալի</b><div class="muted" style="font-family:var(--font-mono);font-size:11px;">${esc(u.awe_id || '3a79d0124b89e5fc81ab23cd98ef0123456789abcdef0123456789abcdef0123')}</div></div><button class="btn secondary" onclick="navigator.clipboard.writeText('${esc(u.awe_id || '')}');toast('Պատճենվեց');">Copy</button></div>
            <div class="list-row"><div><b>ONECOIN Հաշվեկշիռ</b><div class="muted">${(live.onecoin?.balance_coins || 500).toLocaleString()} ONECOIN</div></div></div>
          </div>
        </div>
      </div>
    `;
  }

  // 10. SETTINGS & SECURITY
  function renderSettings() {
    viewEl.innerHTML = `
      <div class="content">
        <div class="hero">
          <div>
            <h1>Կարգավորումներ & Անվտանգություն</h1>
            <p>Ցանցի անվտանգության արձանագրություններ և կրիպտոգրաֆիա:</p>
          </div>
        </div>
        <div class="panel">
          <div class="section-head"><h2>Կրիպտոգրաֆիկ Արձանագրություններ</h2></div>
          <div class="list">
            <div class="list-row"><div><b style="color:var(--text-contrast);">Թվային Ստորագրություն</b><div class="muted">Ed25519 High-Speed Digital Signatures</div></div><span class="pill active">Active</span></div>
            <div class="list-row"><div><b style="color:var(--text-contrast);">Կապի Կոդավորում</b><div class="muted">X25519 + ChaCha20-Poly1305 AEAD</div></div><span class="pill active">Enforced</span></div>
            <div class="list-row"><div><b style="color:var(--text-contrast);">Շարդերի Ստուգում</b><div class="muted">BLAKE3 Cryptographic Tree Hashing</div></div><span class="pill active">Verified</span></div>
          </div>
        </div>
      </div>
    `;
  }

  // Navigation handlers
  document.querySelectorAll(".nav").forEach(b => {
    b.addEventListener("click", e => {
      e.preventDefault();
      renderView(b.dataset.view);
    });
  });

  if (btnEpochTrigger) {
    btnEpochTrigger.onclick = async () => {
      try {
        const res = await api("/api/governor/trigger-payout", { method: "POST" });
        toast(`Էպոխա #${res.epoch} բաշխվեց! ${res.total_coins_paid} ONECOIN վճարվեց սերվերներին:`);
        await refresh();
        if (live.activeTab === "governor") renderGovernor();
        if (live.activeTab === "servers") renderServers();
      } catch (e) {
        toast("Error: " + e.message);
      }
    };
  }

  if (langSelect) {
    langSelect.onchange = e => {
      curLang = e.target.value;
      toast(`Language switched to ${curLang.toUpperCase()}`);
      renderView(live.activeTab);
    };
  }

  if (topUserPill) {
    topUserPill.onclick = () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(live.user?.awe_id || "3a79d0124b89e5fc81ab23cd98ef0123456789abcdef0123456789abcdef0123");
        toast("AWE-ID copied to clipboard");
      }
    };
  }

  window.renderView = renderView;
  window.appApi = api;
  window.appToast = toast;
  window.appShowModal = showModal;

  // Boot sequence
  (async () => {
    initTheme();
    const isAuthed = checkAuth();
    await refresh();
    // Default directly to browser upon entry / login
    renderView("browser");
    setInterval(refresh, 5000);
  })();

})();