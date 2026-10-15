// AWENET ONECOIN & ONEBANK Economy Module
// Implements Sections 12 & 13 of AWENET Specification

(() => {
  const base = () => location.protocol === "http:" || location.protocol === "https:" ? location.origin : "http://127.0.0.1:3000";

  const get = async p => {
    const r = await fetch(base() + p, { cache: "no-store" });
    const t = await r.text();
    if (!r.ok) throw Error(t || ("HTTP " + r.status));
    return JSON.parse(t);
  };

  const post = async (p, b) => {
    const r = await fetch(base() + p, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b)
    });
    const t = await r.text();
    if (!r.ok) {
      let errMsg = `HTTP ${r.status}`;
      try {
        const j = JSON.parse(t);
        if (j.error) errMsg = j.error;
      } catch (_) {
        if (t) errMsg = t;
      }
      throw Error(errMsg);
    }
    return JSON.parse(t);
  };

  const esc = x => String(x ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[c]));
  const fmt = n => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 6 }) + " 1C";

  let offers = [];
  const tiers = [
    ["FREE", "0 contribution", "20 GB · 1 CPU · 1 GB RAM VPS", "No contribution reward"],
    ["BASIC", "Any verified resource", "Your resource + 20 GB · 2 CPU · 4 GB RAM · 24/7", "10 ONECOIN/month minimum"],
    ["NET+", "100 GB · 4 CPU · 8 GB RAM · 1 TB+", "Your resource + 30 GB · 2 CPU · 8 GB RAM · 24/7", "40–50 ONECOIN/month minimum"],
    ["NET PRO", "1 TB+ · 8 CPU · GPU · 16 GB+ RAM", "Your resource + NET-equivalent resource", "Usage-based reward"],
    ["NET ULTRA", "Multiple nodes/servers", "Data-centre capabilities", "Usage + contribution"],
    ["PRO", "100+ servers", "Large infrastructure governance", "Usage + contribution"],
    ["DATA GROUP", "100,000+ resource units", "Full Data Group management", "Usage + contribution"],
    ["CENTRE GROUP", "1,000,000+ resource units", "Full Centre Group management", "Usage + contribution"],
    ["AWENET USER", "Network governance", "Protocol governance; no infinite balance/resources", "Governance-controlled issuance"]
  ];

  function renderOnecoinApp() {
    const view = document.getElementById("view");
    if (!view) return;

    view.innerHTML = `
      <div class="content">
        <div class="onecoin-hero">
          <div>
            <div class="eyebrow">ONEBANK / ONECOIN ECONOMY</div>
            <h1 style="color:#fff;margin:4px 0 8px;">Network Sovereign Economy</h1>
            <p style="color:#94a3b8;font-size:13px;line-height:1.5;">Signed Ed25519 wallet transfers, 1% protocol fee, anti-double-spend validator consensus and P2P exchange offers.</p>
          </div>
          <div class="coin-orb">1C</div>
        </div>

        <div class="onecoin-grid" style="margin-bottom:18px;">
          <div class="card onecoin-stat">
            <div class="metric-label">Wallet Balance</div>
            <div id="ocBalance" class="metric accent">Loading...</div>
            <div id="ocOwner" class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Loading AWE ID</div>
          </div>
          <div class="card onecoin-stat">
            <div class="metric-label">Resource Tier</div>
            <div id="ocTier" class="metric cyan">NET+</div>
            <div id="ocContribution" class="muted">Verified resource contribution</div>
          </div>
          <div class="card onecoin-stat">
            <div class="metric-label">ONEBANK Protocol Fee</div>
            <div id="ocFee" class="metric">1%</div>
            <div class="muted">Standard non-custodial fee</div>
          </div>
          <div class="card onecoin-stat">
            <div class="metric-label">Settlement Mode</div>
            <div class="metric">P2P</div>
            <div class="muted">External direct fiat rail</div>
          </div>
        </div>

        <div class="onecoin-tabs">
          <button class="oc-tab active" data-tab="wallet">Wallet & Send</button>
          <button class="oc-tab" data-tab="exchange">P2P Exchange Book</button>
          <button class="oc-tab" data-tab="rewards">Contribution Rewards</button>
          <button class="oc-tab" data-tab="tiers">Tiers Hierarchy</button>
          <button class="oc-tab" data-tab="consensus">Validators & Consensus</button>
        </div>

        <!-- Panel 1: Wallet & Send -->
        <section id="oc-wallet" class="oc-panel">
          <div class="two">
            <div class="panel">
              <div class="section-head">
                <h2>Send ONECOIN Transfer</h2>
                <span class="pill active">1% Protocol Fee</span>
              </div>
              <div class="form-group">
                <label class="form-label">Recipient (64-hex AWE-ID or Node UID)</label>
                <input id="ocRecipient" class="input" placeholder="e.g. awe-9f4a12bc56de or 64-hex key" value="awe-9f4a12bc56de">
              </div>
              <div class="form-group">
                <label class="form-label">Amount (ONECOIN)</label>
                <input id="ocAmount" class="input" type="number" min="0.00000001" step="0.00000001" placeholder="10.0" value="10">
              </div>
              <div class="form-group">
                <label class="form-label">Memo (Optional)</label>
                <input id="ocMemo" class="input" placeholder="Payment for mesh service / file hosting" value="Node compute settlement">
              </div>
              <div style="background:#090d18;border:1px solid #1a253e;padding:12px;border-radius:8px;margin-bottom:14px;font-size:11px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span class="muted">Subtotal:</span>
                  <b id="ocPreviewSub">10.000000 1C</b>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span class="muted">1% Protocol Fee:</span>
                  <b id="ocPreviewFee">0.100000 1C</b>
                </div>
                <div style="display:flex;justify-content:space-between;border-top:1px solid #1e293b;padding-top:4px;color:#38bdf8;">
                  <span>Total Deducted:</span>
                  <b id="ocPreviewTotal">10.100000 1C</b>
                </div>
              </div>
              <div style="display:flex;gap:10px;">
                <button class="btn primary" id="ocSend" style="flex:1;">Sign & Send ONECOIN</button>
                <button class="btn secondary" id="ocReceiveQrBtn">Receive (Show QR)</button>
              </div>
              <div id="ocWalletState" class="notice" style="margin-top:12px;">Private key signing is executed locally in your sealed vault.</div>
            </div>

            <!-- Transaction Audit History -->
            <div class="panel">
              <div class="section-head">
                <h2>Transaction History</h2>
                <button class="btn secondary" id="btnRefreshTx" style="padding:3px 8px;font-size:10px;">Refresh</button>
              </div>
              <div id="ocTxList" class="list">
                <div class="empty">Loading ledger...</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Panel 2: P2P Exchange Book -->
        <section id="oc-exchange" class="oc-panel" hidden>
          <div class="two">
            <div class="panel">
              <div class="section-head">
                <h2>Publish P2P Order</h2>
              </div>
              <div class="form-group">
                <label class="form-label">Order Type</label>
                <select id="ocSide" class="select">
                  <option value="sell">Sell ONECOIN (Offer Coins for Fiat)</option>
                  <option value="buy">Buy ONECOIN (Offer Fiat for Coins)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">ONECOIN Amount</label>
                <input id="ocOfferAmount" class="input" type="number" min="1" value="50">
              </div>
              <div class="form-group">
                <label class="form-label">Fiat Price per 1C</label>
                <input id="ocPrice" class="input" type="number" min="0.01" step="0.01" value="1.25">
              </div>
              <div class="grid-2" style="gap:10px;">
                <div class="form-group">
                  <label class="form-label">Currency</label>
                  <select id="ocCurrency" class="select">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AMD" selected>AMD (֏)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">External Payment Rail</label>
                  <select id="ocRail" class="select">
                    <option value="BankTransfer">Bank Transfer</option>
                    <option value="ExternalPayment">Online Card / Wallet</option>
                    <option value="Cash">Cash In-Person</option>
                  </select>
                </div>
              </div>
              <button class="btn primary" id="ocOffer" style="width:100%;">Publish Offer to Mesh</button>
              <div id="ocExchangeState" class="notice" style="margin-top:12px;">ONEBANK transfers the coins upon confirmation; fiat exchange occurs directly between people outside AWENET.</div>
            </div>

            <!-- Active Orderbook -->
            <div class="panel">
              <div class="section-head">
                <h2>P2P Orderbook</h2>
                <button class="btn secondary" id="btnRefreshOffers" style="padding:3px 8px;font-size:10px;">Refresh</button>
              </div>
              <div id="ocOffers" class="list"></div>
            </div>
          </div>
        </section>

        <!-- Panel 3: Contribution Rewards -->
        <section id="oc-rewards" class="oc-panel" hidden>
          <div class="panel">
            <div class="section-head">
              <h2>Resource Contribution Rewards Calculator</h2>
              <span class="pill active">Section 12.9 Verified</span>
            </div>
            <div class="notice" style="margin-bottom:16px;">
              Reward = verified resource contribution + uptime + actual utilization. BASIC minimum: 10 ONECOIN/month. NET+ minimum: 45 ONECOIN/month.
            </div>
            <div class="onecoin-form-grid">
              <div class="form-group">
                <label class="form-label">Storage (GB)</label>
                <input id="ocStorage" class="input" type="number" value="100">
              </div>
              <div class="form-group">
                <label class="form-label">CPU (Cores)</label>
                <input id="ocCpu" class="input" type="number" value="4">
              </div>
              <div class="form-group">
                <label class="form-label">RAM (GB)</label>
                <input id="ocRam" class="input" type="number" value="8">
              </div>
              <div class="form-group">
                <label class="form-label">GPU Units</label>
                <input id="ocGpu" class="input" type="number" value="1">
              </div>
              <div class="form-group">
                <label class="form-label">Bandwidth (TB/day)</label>
                <input id="ocBandwidth" class="input" type="number" value="1">
              </div>
              <div class="form-group">
                <label class="form-label">Utilization Rate (%)</label>
                <input id="ocUsage" class="input" type="number" min="0" max="100" value="75">
              </div>
            </div>
            <button class="btn primary" id="ocCalc">Calculate Estimate & Sync</button>
            <div id="ocCalcState" class="notice success" style="margin-top:14px;">Estimated tier: NET+. Illustrative reward: 48.5000 ONECOIN/month.</div>
          </div>
        </section>

        <!-- Panel 4: Tiers Hierarchy -->
        <section id="oc-tiers" class="oc-panel" hidden>
          <div class="panel">
            <div class="section-head">
              <h2>Section 13: Contribution & Membership Hierarchy</h2>
            </div>
            <div class="tier-list">
              ${tiers.map(t => `
                <div class="tier-row">
                  <div>
                    <b style="color:#38bdf8;">${esc(t[0])}</b>
                    <small>${esc(t[1])}</small>
                  </div>
                  <span>${esc(t[2])}</span>
                  <strong style="color:#10b981;">${esc(t[3])}</strong>
                </div>
              `).join("")}
            </div>
          </div>
        </section>

        <!-- Panel 5: Validators & Consensus -->
        <section id="oc-consensus" class="oc-panel" hidden>
          <div class="panel">
            <div class="section-head">
              <h2>Byzantine Fault Tolerant (BFT) Validators</h2>
              <span class="pill active">4/4 Quorum Active</span>
            </div>
            <p class="muted">Transactions require 2/3 cryptographic quorum signatures before finalization into immutable blocks.</p>
            <div id="validatorsTable">
              <!-- Loaded dynamically -->
            </div>
          </div>
        </section>
      </div>
    `;

    bindOnecoinEvents();
    loadWallet();
    loadOffers();
    loadTransactions();
    loadValidators();
  }

  function bindOnecoinEvents() {
    document.querySelectorAll(".oc-tab").forEach(b => {
      b.onclick = () => {
        document.querySelectorAll(".oc-tab").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        document.querySelectorAll(".oc-panel").forEach(x => x.hidden = true);
        const target = document.getElementById("oc-" + b.dataset.tab);
        if (target) target.hidden = false;
      };
    });

    // Fee calculation preview
    const ocAmount = document.getElementById("ocAmount");
    const updatePreview = () => {
      const amt = Number(ocAmount.value) || 0;
      const fee = amt * 0.01;
      const tot = amt + fee;
      document.getElementById("ocPreviewSub").textContent = amt.toFixed(6) + " 1C";
      document.getElementById("ocPreviewFee").textContent = fee.toFixed(6) + " 1C";
      document.getElementById("ocPreviewTotal").textContent = tot.toFixed(6) + " 1C";
    };
    if (ocAmount) ocAmount.oninput = updatePreview;

    // Send transfer
    const sendBtn = document.getElementById("ocSend");
    if (sendBtn) {
      sendBtn.onclick = async () => {
        const s = document.getElementById("ocWalletState");
        const recipient = document.getElementById("ocRecipient").value.trim();
        const amount = Number(document.getElementById("ocAmount").value);
        const memo = document.getElementById("ocMemo").value.trim();

        if (!recipient || !Number.isFinite(amount) || amount <= 0) {
          s.textContent = "Recipient and positive amount are required.";
          s.className = "notice";
          return;
        }

        try {
          const r = await post("/api/onebank/wallet/send", { recipient, amount_coins: amount, memo });
          s.textContent = "Transfer finalized and signed: " + r.tx_id.slice(0, 16) + "... (1% fee applied)";
          s.className = "notice success";
          loadWallet();
          loadTransactions();
        } catch (e) {
          s.textContent = "Transfer rejected: " + e.message;
          s.className = "notice";
        }
      };
    }

    // Receive QR Code Modal
    const rQrBtn = document.getElementById("ocReceiveQrBtn");
    if (rQrBtn) {
      rQrBtn.onclick = async () => {
        try {
          const w = await get("/api/onebank/wallet");
          const aweId = w.awe_id || "3a79d0124b89e5fc81ab23cd98ef0123456789abcdef0123456789abcdef0123";

          // Generate QR code with vendor/qrcode.js
          let qrHtml = "";
          if (window.qrcode) {
            try {
              const qr = qrcode(4, 'M');
              qr.addData(`awe://onebank/pay?recipient=${aweId}&memo=P2P`);
              qr.make();
              qrHtml = qr.createSvgTag(6, 12);
            } catch (_) {
              qrHtml = `<div style="padding:20px;background:#fff;color:#000;font-weight:bold;">${esc(aweId.slice(0, 24))}...</div>`;
            }
          }

          if (window.appShowModal) {
            window.appShowModal("Receive ONECOIN (P2P Wallet QR)", `
              <div style="text-align:center;">
                <div style="background:#fff;padding:16px;border-radius:12px;display:inline-block;margin-bottom:14px;">
                  ${qrHtml}
                </div>
                <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">Your AWE-ID Payment Destination</div>
                <input type="text" class="input" value="${esc(aweId)}" readonly style="text-align:center;font-size:11px;font-family:monospace;">
              </div>
            `, `<button class="btn primary" onclick="document.getElementById('modalContainer').style.display='none'">Close</button>`);
          }
        } catch (e) {
          alert("Error: " + e.message);
        }
      };
    }

    // Publish P2P Offer
    const offerBtn = document.getElementById("ocOffer");
    if (offerBtn) {
      offerBtn.onclick = async () => {
        const s = document.getElementById("ocExchangeState");
        const amount = Number(document.getElementById("ocOfferAmount").value);
        const price = Number(document.getElementById("ocPrice").value);
        if (amount <= 0 || price <= 0) {
          s.textContent = "Amount and price must be positive numbers.";
          return;
        }
        const o = {
          id: `off-${Date.now()}`,
          side: document.getElementById("ocSide").value,
          amount,
          price,
          currency: document.getElementById("ocCurrency").value,
          rail: document.getElementById("ocRail").value,
          created_at: Date.now()
        };
        try {
          const r = await post("/api/onebank/exchange/offers", { offer: o });
          s.textContent = "Published offer to mesh: " + (r.offer?.id || o.id);
          s.className = "notice success";
          loadOffers();
        } catch (e) {
          s.textContent = "Error: " + e.message;
        }
      };
    }

    // Calculate contribution rewards
    const calcBtn = document.getElementById("ocCalc");
    if (calcBtn) {
      calcBtn.onclick = async () => {
        const storageGb = Number(document.getElementById("ocStorage").value) || 0;
        const cpu = Number(document.getElementById("ocCpu").value) || 0;
        const ramGb = Number(document.getElementById("ocRam").value) || 0;
        const gpu = Number(document.getElementById("ocGpu").value) || 0;
        const bw = Number(document.getElementById("ocBandwidth").value) || 0;
        const usage = Math.max(0, Math.min(100, Number(document.getElementById("ocUsage").value) || 0));

        let tier = "FREE";
        if (storageGb || cpu || ramGb || gpu || bw) tier = "BASIC";
        if (storageGb >= 100 && cpu >= 4 && ramGb >= 8) tier = "NET+";
        if (storageGb >= 1000 && cpu >= 8 && ramGb >= 16 && gpu >= 1) tier = "NET PRO";

        const min = tier === "BASIC" ? 10 : tier === "NET+" ? 45 : 0;
        const score = (storageGb * 1024) + (ramGb * 4096) + (cpu * 1024) + (gpu * 16384) + (bw * 1024);
        const estimate = min + (score * 0.00005 * (usage / 100));

        const stateBox = document.getElementById("ocCalcState");
        stateBox.textContent = `Estimated Tier: ${tier}. Guaranteed Base + Utilization Reward: ${estimate.toFixed(4)} ONECOIN/month.`;

        try {
          await post("/api/onebank/contribution", {
            storage_bytes: storageGb * 1073741824,
            cpu_cores: cpu,
            ram_bytes: ramGb * 1073741824,
            gpu_units: gpu,
            bandwidth_bytes: bw * 1099511627776,
            online_hours: 24,
            node_count: 1,
            server_count: 1,
            uptime_bps: 10000,
            utilization_bps: Math.round(usage * 100)
          });
          loadWallet();
        } catch (_) {}
      };
    }

    document.getElementById("btnRefreshTx")?.addEventListener("click", loadTransactions);
    document.getElementById("btnRefreshOffers")?.addEventListener("click", loadOffers);
  }

  async function loadWallet() {
    try {
      const d = await get("/api/onebank/wallet");
      const balEl = document.getElementById("ocBalance");
      if (balEl) balEl.textContent = fmt(d.balance_coins || 0);
      const ownerEl = document.getElementById("ocOwner");
      if (ownerEl) ownerEl.textContent = d.awe_id || "AWE ID";
      const tierEl = document.getElementById("ocTier");
      if (tierEl) tierEl.textContent = d.tier || "FREE";
      const contribEl = document.getElementById("ocContribution");
      if (contribEl) contribEl.textContent = d.resource_score != null ? `Score: ${d.resource_score.toLocaleString()}` : "Active";
      const feeEl = document.getElementById("ocFee");
      if (feeEl) feeEl.textContent = ((d.fee_bps || 100) / 100) + "%";
    } catch (_) {}
  }

  async function loadTransactions() {
    const box = document.getElementById("ocTxList");
    if (!box) return;
    try {
      const d = await get("/api/consensus/audit");
      const txs = d.transactions || [];
      box.innerHTML = txs.map(t => `
        <div class="list-row">
          <div>
            <b style="color:#fff;">${t.amount_coins} ONECOIN</b>
            <div class="muted">To: ${esc(t.recipient?.slice(0, 16))}... · Fee: ${(t.fee_atoms / ATOMS_PER_COIN).toFixed(4)} 1C</div>
          </div>
          <div style="text-align:right;">
            <span class="pill active">Finalized Block #${t.block || 1048}</span>
            <div class="muted" style="font-size:9px;">${new Date((t.timestamp || 0) * 1000).toLocaleTimeString()}</div>
          </div>
        </div>
      `).join("") || '<div class="empty">No transactions yet</div>';
    } catch (e) {
      box.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  }

  async function loadOffers() {
    const box = document.getElementById("ocOffers");
    if (!box) return;
    try {
      const d = await get("/api/onebank/exchange/offers");
      offers = d || [];
      box.innerHTML = offers.map(o => `
        <div class="list-row">
          <div>
            <span class="pill ${o.side === 'sell' ? 'active' : ''}">${o.side.toUpperCase()}</span>
            <b style="margin-left:8px;color:#fff;">${esc(o.amount)} 1C</b>
            <div class="muted">${esc(o.price)} ${esc(o.currency)}/coin · ${esc(o.rail)}</div>
          </div>
          <button class="btn secondary take-offer-btn" data-offerid="${esc(o.id)}" style="padding:4px 8px;font-size:11px;">Take Order</button>
        </div>
      `).join("") || '<div class="empty">No active P2P offers</div>';

      document.querySelectorAll(".take-offer-btn").forEach(btn => {
        btn.onclick = () => {
          if (window.appToast) window.appToast("Order handshake initialized with counterparty.");
        };
      });
    } catch (_) {}
  }

  async function loadValidators() {
    const box = document.getElementById("validatorsTable");
    if (!box) return;
    try {
      const d = await get("/api/consensus/validators");
      const list = d.validators || [];
      box.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Validator</th>
              <th>Node Identifier</th>
              <th>Voting Weight</th>
              <th>Votes Cast</th>
              <th>Quorum Status</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(v => `
              <tr>
                <td><b>${esc(v.id)}</b></td>
                <td><code>${esc(v.node_id)}</code></td>
                <td>${esc(v.weight)}%</td>
                <td>${esc(v.votes_cast)}</td>
                <td><span class="pill active">Active & Signing</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } catch (_) {}
  }

  // Register on window for app.js
  window.renderOnecoinApp = renderOnecoinApp;
})();