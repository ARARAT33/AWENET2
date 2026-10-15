import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const DB_FILE = path.join(__dirname, 'data', 'awenet-db.json');

app.use(express.json({ limit: '64mb' }));
app.use(express.urlencoded({ extended: true, limit: '64mb' }));

// CORS & cache control
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Secret-Key, X-Auth-Token');
  res.header('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Helpers
const nowUnix = () => Math.floor(Date.now() / 1000);
const ATOMS_PER_COIN = 100000000;

const MNEMONIC_WORDS = [
  'ocean', 'ripple', 'canyon', 'falcon', 'beacon', 'summit',
  'anchor', 'crystal', 'matrix', 'horizon', 'pulse', 'vector',
  'solace', 'quantum', 'cipher', 'stellar', 'zenith', 'vortex',
  'aurora', 'nexus', 'prism', 'radiant', 'timber', 'valiant',
  'forge', 'oasis', 'shield', 'cobalt', 'kinetic', 'celestial'
];

function generate12Words() {
  const words = [];
  for (let i = 0; i < 12; i++) {
    const idx = crypto.randomInt(0, MNEMONIC_WORDS.length);
    words.push(MNEMONIC_WORDS[idx]);
  }
  return words.join(' ');
}

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + '_awenet_salt_v3').digest('hex');
}

// -------------------------------------------------------------
// PERSISTENT DATABASE ENGINE
// -------------------------------------------------------------
let db = {
  users: [],
  sessions: {},
  nodeServers: [],
  sites: [],
  storageFiles: {},
  messages: [],
  communityGroups: [],
  communityChannels: [],
  onecoinOffers: [],
  onecoinTransactions: [],
  onecoinValidators: [],
  governorState: {
    master_controller_name: 'Ararat Avetisyan',
    master_awe_id: '3a79d0124b89e5fc81ab23cd98ef0123456789abcdef0123456789abcdef0123',
    onebank_central_reserve_coins: 2500000,
    onebank_collected_fees_coins: 14820.45,
    global_protocol_fee_bps: 100, // 1.00%
    epoch_emission_rate_coins: 500,
    baseline_floor_price_usd: 1.25,
    circuit_breaker_active: false,
    current_epoch: 152,
    last_epoch_timestamp: nowUnix()
  },
  browserBookmarks: []
};

// Load or Seed DB
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      db = { ...db, ...parsed };
      console.log('AWENET Persistent Database loaded from disk.');
      return;
    }
  } catch (err) {
    console.warn('DB Load Warning:', err.message);
  }
  seedDefaultDatabase();
  saveDatabase();
}

function saveDatabase() {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('DB Save Error:', err.message);
  }
}

function seedDefaultDatabase() {
  // Master user (Ararat Avetisyan)
  const masterAweId = '3a79d0124b89e5fc81ab23cd98ef0123456789abcdef0123456789abcdef0123';
  const masterUid = 'awe-3a79d0124b89';
  const masterSeed = 'ocean ripple canyon falcon beacon summit anchor crystal matrix horizon pulse vector';

  db.users = [
    {
      awe_id: masterAweId,
      uid: masterUid,
      username: 'ararat',
      display_name: 'Ararat Avetisyan',
      email: 'araratavetisyan777999@gmail.com',
      password_hash: hashPassword('admin1234'),
      seed_phrase: masterSeed,
      role: 'MASTER_CONTROLLER',
      status_bio: 'AWENET Master Authority · Network Creator & ONEBANK Governor',
      balance_atoms: 50000000000, // 500 ONECOIN
      created_at: nowUnix() - 86400 * 30,
      devices: [
        { id: 'dev-1', name: 'Workstation Alpha (Primary)', platform: 'windows', ip: '192.168.1.105', last_active: nowUnix(), current: true }
      ]
    }
  ];

  // Seed community node servers contributing to the resource grid
  db.nodeServers = [
    {
      id: 'srv-arm-01',
      name: 'Yerevan Core SuperNode',
      owner_name: 'Ararat Avetisyan (Master)',
      owner_awe_id: masterAweId,
      ip: '185.117.82.42:41000',
      region: 'Yerevan, AM',
      cpu_cores: 64,
      ram_gb: 256,
      storage_tb: 40,
      gpu_units: 4,
      bandwidth_mbps: 2500,
      uptime_pct: 99.98,
      status: 'online',
      verified: true,
      score: 98400,
      pending_reward_coins: 145.8,
      lifetime_earned_coins: 12480.0
    },
    {
      id: 'srv-fra-02',
      name: 'Frankfurt Datacenter Node',
      owner_name: 'Community Contributor #4',
      owner_awe_id: '8c2e77df10aa3a79d0124b89e5fc81ab23cd98ef0123456789abcdef01234567',
      ip: '142.250.180.14:41000',
      region: 'Frankfurt, DE',
      cpu_cores: 128,
      ram_gb: 512,
      storage_tb: 120,
      gpu_units: 8,
      bandwidth_mbps: 10000,
      uptime_pct: 99.99,
      status: 'online',
      verified: true,
      score: 245000,
      pending_reward_coins: 218.4,
      lifetime_earned_coins: 18920.0
    },
    {
      id: 'srv-stk-03',
      name: 'Stockholm Shard Cluster',
      owner_name: 'Nordic Peer Group',
      owner_awe_id: '7b1e44ac88cc3a79d0124b89e5fc81ab23cd98ef0123456789abcdef01234567',
      ip: '193.182.144.8:41000',
      region: 'Stockholm, SE',
      cpu_cores: 32,
      ram_gb: 128,
      storage_tb: 80,
      gpu_units: 2,
      bandwidth_mbps: 1000,
      uptime_pct: 99.85,
      status: 'online',
      verified: true,
      score: 112000,
      pending_reward_coins: 88.2,
      lifetime_earned_coins: 7450.0
    },
    {
      id: 'srv-lon-04',
      name: 'London Edge Relay',
      owner_name: 'UK Mesh Node #9',
      owner_awe_id: '5d3b99ce44bb3a79d0124b89e5fc81ab23cd98ef0123456789abcdef01234567',
      ip: '51.140.120.45:41000',
      region: 'London, UK',
      cpu_cores: 32,
      ram_gb: 64,
      storage_tb: 50,
      gpu_units: 0,
      bandwidth_mbps: 2000,
      uptime_pct: 99.91,
      status: 'online',
      verified: true,
      score: 84000,
      pending_reward_coins: 62.5,
      lifetime_earned_coins: 5210.0
    }
  ];

  // Seed default site
  db.sites = [
    {
      id: 'site-awe-portal',
      name: 'AWENET Sovereign Portal',
      description: 'The official decentralized portal hosted across the AWENET pooled resource grid.',
      owner: masterAweId,
      visibility: 'open',
      version: 3,
      status: 'published',
      object_id: 'obj-4a88bc01ee22',
      views: 1840,
      likes: 312,
      pages: [
        {
          path: '/',
          title: 'Home',
          content: `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>AWENET Sovereign Portal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #0f172a; padding: 40px; margin: 0; }
    .container { max-width: 860px; margin: 0 auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: #059669; color: #ffffff; padding: 5px 14px; border-radius: 20px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    h1 { font-size: 34px; margin: 18px 0 10px; color: #0f172a; font-weight: 800; letter-spacing: -0.5px; }
    p.lead { color: #475569; line-height: 1.6; font-size: 16px; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
    .card h3 { margin: 0 0 8px; font-size: 17px; color: #0284c7; display: flex; align-items: center; gap: 8px; }
    .card p { margin: 0; font-size: 13.5px; color: #64748b; line-height: 1.5; }
    .callout { margin-top: 32px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; display: flex; align-items: center; justify-content: space-between; }
    .callout b { color: #065f46; font-size: 15px; }
    .callout span { color: #047857; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">👑 AWENET · Sovereign Resource Grid</span>
    <h1>AWENET Sovereign Portal</h1>
    <p class="lead">Միասնական բաց ապակենտրոնացված ցանց, որտեղ յուրաքանչյուր մասնակից կարող է տրամադրել սերվեր (CPU, RAM, Storage, Bandwidth) և շահել ONECOIN: Ցանցի Գլխավոր Կառավարիչն է <b>Ararat Avetisyan</b>-ը:</p>
    <div class="grid">
      <div class="card">
        <h3>⚡ Ռեսուրսների Համընդհանուր Ցանց (Cloud Grid)</h3>
        <p>Օգտատերերի միացրած սերվերների պրոցեսորները, հիշողությունը և պահոցները գումարվում են իրար և հավասարապես բաշխվում բոլորին:</p>
      </div>
      <div class="card">
        <h3>💰 Ավտոմատ ONECOIN Վճարումներ</h3>
        <p>Սերվեր ունեցողները ամեն էպոխա ավտոմատ վարձատրվում են ONECOIN-ով՝ իրենց սերվերի աշխատած ժամանակի և տրամադրած ռեսուրսների համար:</p>
      </div>
      <div class="card">
        <h3>🌐 Ապակենտրոնացված Բրաուզեր</h3>
        <p>awe:// պրոտոկոլով կայքերի ուղիղ դիտում առանց կենտրոնացված DNS սերվերների, անկախ և գաղտնի:</p>
      </div>
      <div class="card">
        <h3>🏦 ONEBANK Կենտրոնական Կառավարում</h3>
        <p>1% պրոտոկոլային միջնորդավճար, ինքնիշխան ռեզերվներ և ակնթարթային P2P փոխանցումներ:</p>
      </div>
    </div>
    <div class="callout">
      <div>
        <b>Ցանցի Կարգավիճակը՝ Ակտիվ & Առցանց</b>
        <br><span>Միացված սերվերների հզորություն՝ 540+ TB, 864+ CPU Cores</span>
      </div>
      <span class="badge" style="background:#0284c7;">AWE P2P MESH</span>
    </div>
  </div>
</body>
</html>`
        }
      ],
      created_at: nowUnix() - 86400 * 5,
      updated_at: nowUnix() - 3600
    }
  ];

  db.onecoinValidators = [
    { id: 'val-arm-01', name: 'Yerevan Master Validator', address: masterAweId, stake_coins: 100000, uptime_pct: 100.0, blocks_proposed: 14820 },
    { id: 'val-fra-02', name: 'Frankfurt Quorum Node', address: '8c2e77df10aa3a79d0124b89e5fc81ab23cd98ef0123456789abcdef01234567', stake_coins: 50000, uptime_pct: 99.98, blocks_proposed: 8940 },
    { id: 'val-stk-03', name: 'Stockholm Consensus Guard', address: '7b1e44ac88cc3a79d0124b89e5fc81ab23cd98ef0123456789abcdef01234567', stake_coins: 25000, uptime_pct: 99.95, blocks_proposed: 4210 }
  ];

  db.onecoinTransactions = [
    {
      id: 'tx-genesis-01',
      sender: 'AWENET_GENESIS',
      recipient: masterAweId,
      amount_coins: 500.0,
      amount_atoms: 50000000000,
      fee_atoms: 0,
      memo: 'Genesis allocation to Master Controller (Ararat Avetisyan)',
      timestamp: nowUnix() - 86400 * 30,
      status: 'finalized',
      block: 1
    }
  ];

  db.messages = [
    {
      id: 'msg-01',
      sender: 'awe-system',
      recipient: masterUid,
      text: 'Բարի գալուստ AWENET: Դուք հանդիսանում եք Ցանցի Գլխավոր Կառավարիչը և ONEBANK-ի Ղեկավարը (Ararat Avetisyan): Ցանցի բոլոր ռեսուրսները և սերվերները միացված են:',
      state: 'delivered',
      timestamp: nowUnix() - 3600
    }
  ];

  db.storageFiles = {
    'obj-manifest-core': {
      hash: 'obj-manifest-core',
      name: 'AWENET-Genesis-Manifest.json',
      size: 4280,
      mime: 'application/json',
      owner: masterAweId,
      shards: 12,
      replicas: 4,
      timestamp: nowUnix() - 86400 * 10
    },
    'obj-whitepaper': {
      hash: 'obj-whitepaper',
      name: 'AWENET-Architecture-Charter.pdf',
      size: 148520,
      mime: 'application/pdf',
      owner: masterAweId,
      shards: 32,
      replicas: 5,
      timestamp: nowUnix() - 86400 * 8
    }
  };
}

loadDatabase();

// -------------------------------------------------------------
// CONTINUOUS BACKGROUND PAYOUT ENGINE
// Automatically calculates uptime and rewards for all node servers
// -------------------------------------------------------------
setInterval(() => {
  if (db.governorState.circuit_breaker_active) return;
  let updated = false;

  db.nodeServers.forEach(srv => {
    if (srv.status === 'online') {
      // Calculate reward based on resources provided
      const cores = srv.cpu_cores || 8;
      const ram = srv.ram_gb || 32;
      const storage = srv.storage_tb || 2;
      const bw = srv.bandwidth_mbps || 500;

      // Increment pending reward every 10 seconds
      const rewardIncrement = (cores * 0.005 + (ram / 32) * 0.003 + storage * 0.02 + (bw / 1000) * 0.01);
      srv.pending_reward_coins = Number(((srv.pending_reward_coins || 0) + rewardIncrement).toFixed(4));
      updated = true;
    }
  });

  if (updated && Math.random() < 0.2) {
    saveDatabase();
  }
}, 10000);

// Helper to get active user
function getAuthUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-auth-token'];
  if (token && db.sessions[token]) {
    const aweId = db.sessions[token];
    return db.users.find(u => u.awe_id === aweId || u.uid === aweId);
  }
  return null;
}

// -------------------------------------------------------------
// AUTHENTICATION & IDENTITY APIS
// -------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  const { username, display_name, password, seed_phrase, role, email } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUser = username.trim().toLowerCase();
  const existing = db.users.find(u => u.username === cleanUser);
  if (existing) {
    return res.status(409).json({ error: 'Username is already registered in AWENET sovereign directory' });
  }

  const finalSeed = (seed_phrase && seed_phrase.trim()) || generate12Words();
  const seedHash = crypto.createHash('sha256').update(finalSeed).digest('hex');
  const aweId = crypto.createHash('sha256').update(seedHash + cleanUser).digest('hex');
  const uid = `awe-${aweId.slice(0, 12)}`;
  const token = `awe-sess-${crypto.randomUUID()}`;

  const isMaster = (role === 'MASTER_CONTROLLER' || cleanUser === 'ararat' || (display_name && display_name.toLowerCase().includes('ararat')));

  const newUser = {
    awe_id: aweId,
    uid,
    username: cleanUser,
    display_name: (display_name && display_name.trim()) || cleanUser,
    email: email ? email.trim() : '',
    password_hash: hashPassword(password),
    seed_phrase: finalSeed,
    role: isMaster ? 'MASTER_CONTROLLER' : (role || 'SOVEREIGN_CITIZEN'),
    status_bio: isMaster ? 'AWENET Master Authority · Network Creator & ONEBANK Governor' : 'Decentralized Node Contributor',
    balance_atoms: isMaster ? 50000000000 : 2500000000, // 500 or 25 ONECOIN welcome grant
    created_at: nowUnix(),
    devices: [
      { id: `dev-${Date.now()}`, name: 'Active Workstation', platform: 'windows', ip: '192.168.1.100', last_active: nowUnix(), current: true }
    ]
  };

  db.users.push(newUser);
  db.sessions[token] = aweId;
  saveDatabase();

  res.json({
    status: 'registered',
    token,
    user: {
      awe_id: newUser.awe_id,
      uid: newUser.uid,
      username: newUser.username,
      display_name: newUser.display_name,
      seed_phrase: newUser.seed_phrase,
      balance_coins: newUser.balance_atoms / ATOMS_PER_COIN,
      role: newUser.role
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { login_identifier, password, seed_phrase, quick_master } = req.body || {};
  let user = null;

  if (quick_master) {
    // 1-Click login as Master Controller Ararat Avetisyan
    user = db.users.find(u => u.role === 'MASTER_CONTROLLER') || db.users[0];
  } else if (seed_phrase && seed_phrase.trim()) {
    const cleanSeed = seed_phrase.trim().toLowerCase();
    user = db.users.find(u => u.seed_phrase.toLowerCase() === cleanSeed);
    if (!user) {
      return res.status(401).json({ error: 'Invalid 12-word seed phrase' });
    }
  } else {
    if (!login_identifier || !password) {
      return res.status(400).json({ error: 'Username/AWE-ID and password are required' });
    }
    const cleanId = login_identifier.trim().toLowerCase();
    const hash = hashPassword(password);
    user = db.users.find(u =>
      (u.username === cleanId || u.awe_id.toLowerCase() === cleanId || u.uid.toLowerCase() === cleanId) &&
      u.password_hash === hash
    );
    if (!user) {
      // Also allow admin1234 fallback for default master
      if (cleanId === 'ararat' && password === 'admin1234') {
        user = db.users[0];
      } else {
        return res.status(401).json({ error: 'Invalid username, AWE-ID or password' });
      }
    }
  }

  const token = `awe-sess-${crypto.randomUUID()}`;
  db.sessions[token] = user.awe_id;
  saveDatabase();

  res.json({
    status: 'authenticated',
    token,
    user: {
      awe_id: user.awe_id,
      uid: user.uid,
      username: user.username,
      display_name: user.display_name,
      seed_phrase: user.seed_phrase,
      balance_coins: user.balance_atoms / ATOMS_PER_COIN,
      role: user.role
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: {
      awe_id: user.awe_id,
      uid: user.uid,
      username: user.username,
      display_name: user.display_name,
      seed_phrase: user.seed_phrase,
      balance_coins: user.balance_atoms / ATOMS_PER_COIN,
      balance_atoms: user.balance_atoms,
      role: user.role,
      devices: user.devices || []
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-auth-token'];
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    saveDatabase();
  }
  res.json({ status: 'logged_out' });
});

// -------------------------------------------------------------
// RESOURCE POOL & CLOUD GRID API
// -------------------------------------------------------------
app.get('/api/pool/stats', (req, res) => {
  let totalCpu = 0, totalRam = 0, totalStorage = 0, totalGpu = 0, totalBw = 0;
  db.nodeServers.forEach(s => {
    totalCpu += (s.cpu_cores || 0);
    totalRam += (s.ram_gb || 0);
    totalStorage += (s.storage_tb || 0);
    totalGpu += (s.gpu_units || 0);
    totalBw += (s.bandwidth_mbps || 0);
  });

  const pool = {
    total_servers: db.nodeServers.length,
    total_storage_tb: totalStorage,
    allocated_storage_tb: Math.round(totalStorage * 0.28 * 10) / 10,
    free_storage_tb: Math.round(totalStorage * 0.72 * 10) / 10,
    total_cpu_cores: totalCpu,
    allocated_cpu_cores: Math.round(totalCpu * 0.4),
    total_ram_tb: Math.round((totalRam / 1024) * 100) / 100,
    used_ram_tb: Math.round((totalRam / 1024) * 0.35 * 100) / 100,
    total_gpu_units: totalGpu,
    allocated_gpu_units: Math.round(totalGpu * 0.45),
    bandwidth_capacity_gbps: Math.round((totalBw / 1000) * 10) / 10,
    current_throughput_gbps: Math.round((totalBw / 1000) * 0.26 * 10) / 10,
    active_distributed_workloads: 64,
    hosted_sites_count: db.sites.length
  };

  res.json({ status: 'ok', pool, epoch: db.governorState.current_epoch });
});

app.get('/api/pool/servers', (req, res) => {
  res.json({ status: 'ok', servers: db.nodeServers });
});

app.post('/api/pool/servers/register', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const { name, ip, region, cpu_cores, ram_gb, storage_tb, gpu_units, bandwidth_mbps } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: 'Server name is required' });

  const id = `srv-${crypto.createHash('sha256').update(name + Date.now()).digest('hex').slice(0, 8)}`;
  const newServer = {
    id,
    name: name.trim(),
    owner_name: user.display_name,
    owner_awe_id: user.awe_id,
    ip: ip ? ip.trim() : `192.168.1.${crypto.randomInt(10, 240)}:41000`,
    region: region ? region.trim() : 'Yerevan, AM',
    cpu_cores: Number(cpu_cores) || 16,
    ram_gb: Number(ram_gb) || 64,
    storage_tb: Number(storage_tb) || 4,
    gpu_units: Number(gpu_units) || 1,
    bandwidth_mbps: Number(bandwidth_mbps) || 1000,
    uptime_pct: 100.0,
    status: 'online',
    verified: user.role === 'MASTER_CONTROLLER', // Master controller self-verifies
    score: (Number(storage_tb) || 4) * 2000 + (Number(cpu_cores) || 16) * 400 + (Number(ram_gb) || 64) * 150,
    pending_reward_coins: 10.0, // Welcome registration bonus
    lifetime_earned_coins: 0.0
  };

  db.nodeServers.unshift(newServer);
  saveDatabase();

  res.json({ status: 'registered', server: newServer });
});

app.post('/api/pool/servers/claim-reward', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const { server_id } = req.body || {};
  const server = db.nodeServers.find(s => s.id === server_id);

  if (!server) return res.status(404).json({ error: 'Server not found' });
  const claimAmt = server.pending_reward_coins;
  if (!claimAmt || claimAmt <= 0) {
    return res.status(400).json({ error: 'No pending ONECOIN reward to claim' });
  }

  user.balance_atoms += Math.round(claimAmt * ATOMS_PER_COIN);
  server.lifetime_earned_coins += claimAmt;
  server.pending_reward_coins = 0.0;

  db.onecoinTransactions.unshift({
    id: `tx-claim-${Date.now()}`,
    sender: 'AWENET_EMISSION_POOL',
    recipient: user.awe_id,
    amount_coins: claimAmt,
    amount_atoms: Math.round(claimAmt * ATOMS_PER_COIN),
    fee_atoms: 0,
    memo: `Node Server Reward: ${server.name}`,
    timestamp: nowUnix(),
    status: 'finalized',
    block: 1050 + db.onecoinTransactions.length
  });

  saveDatabase();

  res.json({
    status: 'claimed',
    claimed_coins: claimAmt,
    new_balance_coins: user.balance_atoms / ATOMS_PER_COIN
  });
});

// -------------------------------------------------------------
// AWENET CONTROLLER & ONEBANK GOVERNOR API (Master Authority)
// -------------------------------------------------------------
app.get('/api/governor/status', (req, res) => {
  res.json({
    status: 'ok',
    governor: db.governorState,
    reserve: {
      central_reserve_coins: db.governorState.onebank_central_reserve_coins,
      collected_fees_coins: db.governorState.onebank_collected_fees_coins,
      protocol_fee_pct: (db.governorState.global_protocol_fee_bps / 100).toFixed(2),
      active_validators: db.onecoinValidators.length,
      total_transactions: db.onecoinTransactions.length
    },
    epoch: {
      number: db.governorState.current_epoch,
      emission_rate: db.governorState.epoch_emission_rate_coins,
      circuit_breaker: db.governorState.circuit_breaker_active
    },
    total_users: db.users.length,
    total_servers: db.nodeServers.length
  });
});

app.post('/api/governor/mint-reserve', (req, res) => {
  const { amount_coins, memo } = req.body || {};
  const amt = Number(amount_coins);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Valid amount required' });

  db.governorState.onebank_central_reserve_coins += amt;
  db.onecoinTransactions.unshift({
    id: `tx-mint-${Date.now()}`,
    sender: 'ONEBANK_TREASURY_MINT',
    recipient: db.governorState.master_awe_id,
    amount_coins: amt,
    amount_atoms: Math.round(amt * ATOMS_PER_COIN),
    fee_atoms: 0,
    memo: memo || 'OneBank Central Reserve Minting by Master Controller Ararat Avetisyan',
    timestamp: nowUnix(),
    status: 'finalized',
    block: 2000 + db.onecoinTransactions.length
  });

  saveDatabase();
  res.json({ status: 'minted', reserve: db.governorState.onebank_central_reserve_coins });
});

app.post('/api/governor/update-policy', (req, res) => {
  const { fee_bps, epoch_emission_coins, floor_price_usd } = req.body || {};
  if (fee_bps !== undefined) db.governorState.global_protocol_fee_bps = Number(fee_bps);
  if (epoch_emission_coins !== undefined) db.governorState.epoch_emission_rate_coins = Number(epoch_emission_coins);
  if (floor_price_usd !== undefined) db.governorState.baseline_floor_price_usd = Number(floor_price_usd);
  saveDatabase();
  res.json({ status: 'updated', governor: db.governorState });
});

app.post('/api/governor/circuit-breaker', (req, res) => {
  const { active } = req.body || {};
  db.governorState.circuit_breaker_active = !!active;
  saveDatabase();
  res.json({ status: 'updated', circuit_breaker_active: db.governorState.circuit_breaker_active });
});

app.post('/api/governor/trigger-payout', (req, res) => {
  db.governorState.current_epoch += 1;
  const emissionPool = db.governorState.epoch_emission_rate_coins;
  const activeServers = db.nodeServers.filter(s => s.status === 'online');

  if (activeServers.length > 0) {
    const totalScore = activeServers.reduce((sum, s) => sum + (s.score || 1000), 0);
    activeServers.forEach(s => {
      const share = ((s.score || 1000) / totalScore) * emissionPool;
      s.pending_reward_coins = Number(((s.pending_reward_coins || 0) + share).toFixed(2));
    });
  }

  saveDatabase();

  res.json({
    status: 'epoch_distributed',
    epoch: db.governorState.current_epoch,
    total_coins_paid: emissionPool,
    active_servers_rewarded: activeServers.length
  });
});

app.post('/api/governor/verify-node', (req, res) => {
  const { server_id, verified } = req.body || {};
  const server = db.nodeServers.find(s => s.id === server_id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  server.verified = verified !== false;
  server.pending_reward_coins += 25.0; // Verification bonus
  saveDatabase();
  res.json({ status: 'updated', server });
});

app.post('/api/governor/slash-node', (req, res) => {
  const { server_id } = req.body || {};
  db.nodeServers = db.nodeServers.filter(s => s.id !== server_id);
  saveDatabase();
  res.json({ status: 'slashed', server_id });
});

// -------------------------------------------------------------
// ONEBANK & ONECOIN WALLET API
// -------------------------------------------------------------
app.get('/api/onebank/wallet', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const balanceCoins = (user.balance_atoms || 0) / ATOMS_PER_COIN;

  res.json({
    status: 'ok',
    address: user.awe_id,
    display_name: user.display_name,
    role: user.role,
    balance_coins: balanceCoins,
    balance_atoms: user.balance_atoms,
    currency: '1C (ONECOIN)',
    usd_value: (balanceCoins * db.governorState.baseline_floor_price_usd).toFixed(2),
    central_reserve_coins: db.governorState.onebank_central_reserve_coins,
    collected_fees_coins: db.governorState.onebank_collected_fees_coins,
    protocol_fee_pct: (db.governorState.global_protocol_fee_bps / 100).toFixed(2),
    transactions: db.onecoinTransactions
  });
});

app.post('/api/onebank/transfer', (req, res) => {
  if (db.governorState.circuit_breaker_active) {
    return res.status(403).json({ error: 'Transfers temporarily frozen by Master Controller Circuit Breaker' });
  }

  const user = getAuthUser(req) || db.users[0];
  const { recipient, amount_coins, memo } = req.body || {};
  const amt = Number(amount_coins);

  if (!amt || amt <= 0) return res.status(400).json({ error: 'Valid transfer amount required' });
  if (!recipient || !recipient.trim()) return res.status(400).json({ error: 'Recipient AWE-ID is required' });

  const amtAtoms = Math.round(amt * ATOMS_PER_COIN);
  const feeBps = db.governorState.global_protocol_fee_bps; // e.g. 100 = 1%
  const feeAtoms = Math.round(amtAtoms * (feeBps / 10000));
  const totalDeduct = amtAtoms + feeAtoms;

  if (user.balance_atoms < totalDeduct) {
    return res.status(400).json({
      error: `Insufficient ONECOIN balance. Required: ${(totalDeduct / ATOMS_PER_COIN).toFixed(4)} 1C (including 1% fee)`
    });
  }

  user.balance_atoms -= totalDeduct;

  // Credit OneBank Fee Reserve
  db.governorState.onebank_collected_fees_coins += (feeAtoms / ATOMS_PER_COIN);

  // Credit recipient if local
  const recUser = db.users.find(u => u.awe_id === recipient.trim() || u.username === recipient.trim().toLowerCase());
  if (recUser) {
    recUser.balance_atoms += amtAtoms;
  }

  const tx = {
    id: `tx-${Date.now()}`,
    sender: user.awe_id,
    recipient: recipient.trim(),
    amount_coins: amt,
    amount_atoms: amtAtoms,
    fee_atoms: feeAtoms,
    fee_coins: feeAtoms / ATOMS_PER_COIN,
    memo: memo || 'P2P Sovereign Transfer',
    timestamp: nowUnix(),
    status: 'finalized',
    block: 3000 + db.onecoinTransactions.length
  };

  db.onecoinTransactions.unshift(tx);
  saveDatabase();

  res.json({
    status: 'transferred',
    transaction: tx,
    new_balance_coins: user.balance_atoms / ATOMS_PER_COIN
  });
});

app.post('/api/onebank/faucet', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const grantAtoms = 50 * ATOMS_PER_COIN; // 50 ONECOIN
  user.balance_atoms += grantAtoms;

  db.onecoinTransactions.unshift({
    id: `tx-faucet-${Date.now()}`,
    sender: 'ONEBANK_COMMUNITY_FAUCET',
    recipient: user.awe_id,
    amount_coins: 50.0,
    amount_atoms: grantAtoms,
    fee_atoms: 0,
    memo: 'Community Testnet Faucet Grant',
    timestamp: nowUnix(),
    status: 'finalized',
    block: 4000 + db.onecoinTransactions.length
  });

  saveDatabase();
  res.json({ status: 'granted', new_balance_coins: user.balance_atoms / ATOMS_PER_COIN });
});

// -------------------------------------------------------------
// SITES DASHBOARD & RENDERING
// -------------------------------------------------------------
app.get('/api/sites', (req, res) => res.json({ status: 'ok', sites: db.sites }));

app.get('/api/sites/render/:id', (req, res) => {
  const site = db.sites.find(s => s.id === req.params.id || s.object_id === req.params.id);
  if (!site) return res.status(404).send('<h2>404 · AWE Site Not Found</h2>');
  const targetPage = site.pages[0];
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(targetPage ? targetPage.content : '<h2>Empty Page</h2>');
});

app.post('/api/sites/create', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const { name, description, visibility, html_content } = req.body || {};
  const id = `site-${crypto.createHash('sha256').update((name || 'Site') + Date.now()).digest('hex').slice(0, 10)}`;
  const object_id = `obj-${crypto.createHash('sha256').update(id).digest('hex').slice(0, 12)}`;

  const bodyContent = html_content || `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${name || 'Sovereign Portal'}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #ffffff; color: #0f172a; padding: 40px; margin: 0; }
    .box { max-width: 760px; margin: 0 auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
    h1 { color: #0284c7; margin-top: 0; font-size: 28px; }
    p { color: #475569; line-height: 1.6; }
    .chip { display: inline-block; background: #10b981; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="box">
    <span class="chip">AWENET Pooled Cloud Site</span>
    <h1>${name || 'Sovereign Portal'}</h1>
    <p>${description || 'This decentralized site is served from AWENET pooled community servers without centralized cloud hosts.'}</p>
    <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;">
    <small style="color:#94a3b8;">Published by ${user.display_name} · AWE Object ID: ${object_id}</small>
  </div>
</body>
</html>`;

  const newSite = {
    id,
    name: name ? name.trim() : 'Sovereign Portal',
    description: description ? description.trim() : 'Hosted on AWENET Cloud Grid',
    owner: user.awe_id,
    visibility: visibility || 'open',
    version: 1,
    status: 'published',
    object_id,
    views: 0,
    likes: 0,
    pages: [{ path: '/', title: 'Home', content: bodyContent }],
    created_at: nowUnix(),
    updated_at: nowUnix()
  };

  db.sites.unshift(newSite);
  saveDatabase();
  res.json({ status: 'created', site: newSite });
});

// -------------------------------------------------------------
// DECENTRALIZED BROWSER ENGINE API
// -------------------------------------------------------------
app.get('/api/browser/render', (req, res) => {
  const rawUrl = String(req.query.url || 'awe://welcome').trim();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // Handle internal awe:// protocols
  if (rawUrl === 'awe://welcome' || rawUrl === 'awe://home' || rawUrl === '') {
    const site = db.sites[0];
    return res.send(site ? site.pages[0].content : '<h1>Welcome to AWENET</h1>');
  }

  if (rawUrl === 'awe://nodes' || rawUrl === 'awe://pool') {
    let serversHtml = db.nodeServers.map(s => `
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <b style="font-size:16px;color:#0f172a;">${s.name}</b>
          <span style="background:#ecfdf5;color:#059669;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">${s.region}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px;font-size:12px;color:#64748b;">
          <div>CPU: <b style="color:#0f172a;">${s.cpu_cores} Cores</b></div>
          <div>RAM: <b style="color:#0f172a;">${s.ram_gb} GB</b></div>
          <div>SSD: <b style="color:#0f172a;">${s.storage_tb} TB</b></div>
          <div>Bandwidth: <b style="color:#0f172a;">${s.bandwidth_mbps} Mbps</b></div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
          <span style="color:#059669;font-weight:600;">💰 Pending 1C: ${s.pending_reward_coins.toFixed(2)} ONECOIN</span>
          <span style="color:#64748b;">Uptime: ${s.uptime_pct}%</span>
        </div>
      </div>
    `).join('');

    return res.send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>AWENET Pooled Node Grid</title><style>body{font-family:system-ui;background:#f8fafc;padding:30px;color:#0f172a;margin:0;}.container{max-width:900px;margin:0 auto;}</style></head>
<body>
  <div class="container">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;margin-bottom:20px;">
      <h1 style="margin:0 0 8px;color:#0284c7;font-size:26px;">⚡ AWENET Cloud Resource Grid</h1>
      <p style="margin:0;color:#64748b;font-size:14px;">Active Pooled Servers contributing hardware to the shared mesh. Every node server continuously earns ONECOIN.</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">${serversHtml}</div>
  </div>
</body></html>`);
  }

  if (rawUrl === 'awe://onebank') {
    return res.send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>ONEBANK Monetary Center</title><style>body{font-family:system-ui;background:#f8fafc;padding:30px;color:#0f172a;margin:0;}.box{max-width:850px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:30px;}</style></head>
<body>
  <div class="box">
    <h1 style="margin-top:0;color:#059669;">🏦 ONEBANK Sovereign Central Reserve</h1>
    <p style="color:#64748b;">The central sovereign monetary authority of AWENET managed by Ararat Avetisyan.</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0;">
      <div style="background:#f1f5f9;border-radius:10px;padding:16px;">
        <small style="color:#64748b;">Central Treasury Reserve</small>
        <div style="font-size:22px;font-weight:bold;color:#059669;margin-top:6px;">${db.governorState.onebank_central_reserve_coins.toLocaleString()} 1C</div>
      </div>
      <div style="background:#f1f5f9;border-radius:10px;padding:16px;">
        <small style="color:#64748b;">Collected 1% Protocol Fees</small>
        <div style="font-size:22px;font-weight:bold;color:#0284c7;margin-top:6px;">${db.governorState.onebank_collected_fees_coins.toFixed(2)} 1C</div>
      </div>
      <div style="background:#f1f5f9;border-radius:10px;padding:16px;">
        <small style="color:#64748b;">Baseline Floor Price</small>
        <div style="font-size:22px;font-weight:bold;color:#d97706;margin-top:6px;">$${db.governorState.baseline_floor_price_usd.toFixed(2)} USD</div>
      </div>
    </div>
  </div>
</body></html>`);
  }

  if (rawUrl.startsWith('awe://object/')) {
    const objId = rawUrl.replace('awe://object/', '');
    const site = db.sites.find(s => s.object_id === objId || s.id === objId);
    if (site) return res.send(site.pages[0].content);
    return res.status(404).send(`<h2>404 · AWE Object "${objId}" not found in decentralized pool</h2>`);
  }

  // Handle Search Queries
  if (rawUrl.startsWith('awe://search?') || !rawUrl.includes('://')) {
    const q = rawUrl.replace('awe://search?q=', '').toLowerCase();
    const matchedSites = db.sites.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    const matchedServers = db.nodeServers.filter(s => s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q));

    return res.send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>Search: ${q}</title><style>body{font-family:system-ui;background:#f8fafc;padding:30px;color:#0f172a;margin:0;}.box{max-width:850px;margin:0 auto;}</style></head>
<body>
  <div class="box">
    <h2 style="color:#0284c7;">🔍 AWENET Decentralized Search</h2>
    <p style="color:#64748b;">Results for: <b>${q}</b></p>
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:12px;">
      ${matchedSites.map(s => `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
          <a href="/api/sites/render/${s.id}" style="color:#0284c7;font-size:18px;font-weight:bold;text-decoration:none;">${s.name}</a>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">${s.description}</p>
          <small style="color:#94a3b8;">awe://object/${s.object_id}</small>
        </div>
      `).join('')}
      ${matchedServers.map(s => `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
          <b style="color:#059669;font-size:16px;">⚡ Node Server: ${s.name}</b>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Region: ${s.region} · ${s.cpu_cores} Cores · ${s.ram_gb} GB RAM</p>
        </div>
      `).join('')}
    </div>
  </div>
</body></html>`);
  }

  // External URL proxy fallback
  res.send(`<!doctype html><html><body style="font-family:system-ui;padding:40px;background:#f8fafc;color:#0f172a;"><div style="max-width:700px;margin:0 auto;background:#fff;padding:30px;border-radius:14px;border:1px solid #e2e8f0;"><h2>🌐 External Web View: ${rawUrl}</h2><p>Browsing external link through AWENET sovereign sandbox tunnel.</p><a href="${rawUrl}" target="_blank" style="display:inline-block;padding:10px 18px;background:#0284c7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Open external web page</a></div></body></html>`);
});

// -------------------------------------------------------------
// MESSENGER API
// -------------------------------------------------------------
app.get('/api/messenger', (req, res) => res.json({ status: 'ok', messages: db.messages }));

app.post('/api/messenger/send', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const { recipient, text } = req.body || {};
  const msg = {
    id: `msg-${Date.now()}`,
    sender: user.uid,
    sender_name: user.display_name,
    recipient: recipient ? recipient.trim() : 'awe-general',
    text: text ? text.trim() : '',
    state: 'sent',
    timestamp: nowUnix()
  };
  db.messages.push(msg);
  saveDatabase();
  res.json({ status: 'sent', message: msg });
});

// -------------------------------------------------------------
// DECENTRALIZED STORAGE API
// -------------------------------------------------------------
app.get('/api/storage', (req, res) => {
  res.json({
    status: 'ok',
    files: Object.values(db.storageFiles),
    total_objects: Object.keys(db.storageFiles).length
  });
});

app.post('/api/storage/upload', (req, res) => {
  const user = getAuthUser(req) || db.users[0];
  const { name, size, mime, content_preview } = req.body || {};
  const hash = `obj-${crypto.createHash('sha256').update((name || 'file') + Date.now()).digest('hex').slice(0, 16)}`;

  const newFile = {
    hash,
    name: name ? name.trim() : 'Uploaded-Document',
    size: Number(size) || 10240,
    mime: mime || 'application/octet-stream',
    owner: user.awe_id,
    shards: Math.max(4, Math.round((Number(size) || 10240) / 4096)),
    replicas: 4,
    content_preview: content_preview || '',
    timestamp: nowUnix()
  };

  db.storageFiles[hash] = newFile;
  saveDatabase();

  res.json({ status: 'stored', file: newFile });
});

// Status check endpoint
app.get('/api/status', (req, res) => {
  let totalCpu = 0, totalRam = 0, totalStorage = 0;
  db.nodeServers.forEach(s => {
    totalCpu += (s.cpu_cores || 0);
    totalRam += (s.ram_gb || 0);
    totalStorage += (s.storage_tb || 0);
  });

  res.json({
    product: 'AWENET',
    status: 'online',
    node_id: 'awe-3a79d0124b89',
    node_address: '127.0.0.1:3000',
    transport: 'AWE encrypted TCP (Ed25519/X25519)',
    ui: 'connected',
    peers: db.nodeServers.map(s => ({
      id: s.id,
      address: s.ip,
      region: s.region,
      ping_ms: Math.floor(Math.random() * 40) + 10,
      last_seen: nowUnix(),
      tier: s.verified ? 'VERIFIED POOL NODE' : 'CONTRIBUTOR'
    })),
    discovered_peers: db.nodeServers.length,
    active_connections: db.nodeServers.length,
    pool: {
      total_servers: db.nodeServers.length,
      total_storage_tb: totalStorage,
      allocated_storage_tb: Math.round(totalStorage * 0.28),
      free_storage_tb: Math.round(totalStorage * 0.72),
      total_cpu_cores: totalCpu,
      total_ram_tb: Math.round((totalRam / 1024) * 100) / 100
    },
    rtt_ms: 12
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: nowUnix() }));

// Static Client Serving
const uiPath = path.join(__dirname, 'apps', 'awe-desktop', 'ui');
app.use(express.static(uiPath));
app.get('*', (req, res) => res.sendFile(path.join(uiPath, 'index.html')));

app.listen(PORT, HOST, () => {
  console.log(`AWENET Real Sovereign Server running on http://${HOST}:${PORT}`);
});
