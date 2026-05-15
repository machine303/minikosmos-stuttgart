'use strict';

const express  = require('express');
const session  = require('express-session');
const multer   = require('multer');
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const PORT           = process.env.PORT           || 3002;
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD  || 'minikosmos2026';
const CLIENT_PASSWORD = process.env.CLIENT_PASSWORD || 'minikosmos-client';
const SESSION_SECRET = process.env.SESSION_SECRET || 'mzzo-session-2026-change-me';
const DATA_DIR       = process.env.DATA_DIR       || path.join(__dirname, 'data');
const DB_PATH        = path.join(DATA_DIR, 'content.db');
const UPLOADS_DIR    = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(DATA_DIR,   { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─────────────────────────────────────────────
// DATABASE SETUP
// ─────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT '',
    type  TEXT NOT NULL DEFAULT 'text'
  );

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vol         INTEGER,
    title       TEXT    NOT NULL,
    date        TEXT    NOT NULL DEFAULT '',
    time        TEXT    NOT NULL DEFAULT '',
    location    TEXT    NOT NULL DEFAULT '',
    description TEXT    NOT NULL DEFAULT '',
    tags        TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'upcoming',
    sort_order  INTEGER NOT NULL DEFAULT 99
  );

  CREATE TABLE IF NOT EXISTS partners (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    website    TEXT    NOT NULL DEFAULT '',
    category   TEXT    NOT NULL DEFAULT '',
    active     INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 99
  );
`);

// ── Seed default content if DB is empty ──────
if (db.prepare('SELECT COUNT(*) AS c FROM settings').get().c === 0) {
  const ins = db.prepare(
    'INSERT INTO settings (key, value, label, type) VALUES (?, ?, ?, ?)'
  );
  [
    ['hero_headline',     'BEGEGNUNG NEU DENKEN',                                             'Hero Headline',         'text'],
    ['hero_subline',      'Generationenübergreifender Dialog in Stuttgart',                    'Hero Subline',          'text'],
    ['hero_tagline',      'Seit dem Urknall: 100 Begegnungen, 6 Events, eine Stadt.',         'Hero Tagline',          'text'],
    ['stats_participants','100+',                                                              'Stat: Teilnehmende',    'text'],
    ['stats_events',      '6',                                                                'Stat: Events geplant',  'text'],
    ['stats_free',        'Eintritt frei',                                                    'Stat: Eintritt',        'text'],
    ['mission_title',     'Warum Mini-Kosmos?',                                               'Mission Überschrift',   'text'],
    ['mission_text',      'Wir schreiben das Jahr 2026. Die Welt dreht sich schneller denn je — und trotzdem reden Jung und Alt kaum miteinander.\n\nMini-Kosmos Stuttgart ändert das. Mit echten Begegnungen, echten Gesprächen, echter Gemeinschaft. Mitten in Stuttgart. Für alle.', 'Mission Text', 'textarea'],
    ['team_melli_name',   'Melanie Möck',                                                     'Team: Melli Name',      'text'],
    ['team_melli_role',   'Gründerin',                                                        'Team: Melli Rolle',     'text'],
    ['team_melli_bio',    'Organisatorin, Netzwerkerin, Herzblut-Stuttgarterin. Melli bringt Menschen zusammen — schon seit Jahren. Mini-Kosmos ist ihr Herzensprojekt.', 'Team: Melli Bio', 'textarea'],
    ['team_kathi_name',   'Kathi',                                                            'Team: Kathi Name',      'text'],
    ['team_kathi_role',   'Co-Gründerin',                                                     'Team: Kathi Rolle',     'text'],
    ['team_kathi_bio',    'Kreativkopf und Co-Gründerin. Kathi sorgt für die Atmosphäre, die aus einem Event ein echtes Erlebnis macht.', 'Team: Kathi Bio', 'textarea'],
    ['contact_email',     'minikosmos.stuttgart@gmail.com',                                  'Kontakt: E-Mail',       'text'],
    ['contact_instagram', 'https://www.instagram.com/minikosmos.stuttgart/',                 'Kontakt: Instagram URL','text'],
    ['contact_linktree',  'https://linktr.ee/minikosmos.stuttgart',                          'Kontakt: Linktree URL', 'text'],
    ['image_team_melli',  '',                                                                 'Bild: Melli (URL)',     'image'],
    ['image_team_kathi',  '',                                                                 'Bild: Kathi (URL)',     'image'],
  ].forEach(row => ins.run(...row));
}

// Ensure new keys exist on already-seeded DBs (safe to run repeatedly)
{
  const ek = db.prepare('INSERT OR IGNORE INTO settings (key,value,label,type) VALUES (?,?,?,?)');
  [
    ['stats_events_count',       '3×',                 'Hero: Stat 1 Zahl',        'text'],
    ['stats_events_label',       'Bingo-Events',       'Hero: Stat 1 Bezeichnung', 'text'],
    ['stats_participants_label', 'Teilnehmende',       'Hero: Stat 2 Bezeichnung', 'text'],
    ['stats_partner_count',      '18',                 'Hero: Stat 3 Zahl',        'text'],
    ['stats_partner_label',      'Partner & Förderer', 'Hero: Stat 3 Bezeichnung', 'text'],
    ['team_intro_1', 'Wir sind die Mini-Kosmonautinnen — nach 10 Jahren Freundschaft und unterschiedlichen Lebenswegen führen wir unsere Erfahrungen jetzt im Mini-Kosmos Stuttgart zusammen.', 'Team: Absatz 1', 'textarea'],
    ['team_intro_2', 'Was wir machen? Räume und Events für echte Begegnung schaffen und Transformation in Stuttgart mitgestalten. Ob als Supporter, Event-Host, helfende Hand oder einfach Neugierige — meldet euch. Wir antworten immer. 🚀', 'Team: Absatz 2', 'textarea'],
    ['hero_badge',       '✦ Gemeinnützige Initiative · Stuttgart', 'Hero: Badge-Text',          'text'],
    ['mission_kicker',   'Was wir tun',                            'Mission: Kicker',           'text'],
    ['mission_headline', 'Ein kleines<br>Universum.<br>Mitten in Stuttgart.', 'Mission: Überschrift (HTML erlaubt)', 'text'],
    ['value1_emoji',     '✨',   'Wert 1: Emoji', 'text'],
    ['value1_title',     'Begegnung', 'Wert 1: Titel', 'text'],
    ['value1_text',      'Wir schaffen Räume, in denen echte Verbindungen entstehen — ohne Agenda, ohne Druck. Einfach Mensch zu Mensch.', 'Wert 1: Text', 'textarea'],
    ['value2_emoji',     '🌱',  'Wert 2: Emoji', 'text'],
    ['value2_title',     'Dialog', 'Wert 2: Titel', 'text'],
    ['value2_text',      'Verschiedene Perspektiven, eine Gesprächsrunde. Jung trifft Alt, Erfahrung trifft Neugier — gegenseitiger Respekt als Grundlage.', 'Wert 2: Text', 'textarea'],
    ['value3_emoji',     '🌍',  'Wert 3: Emoji', 'text'],
    ['value3_title',     'Wachstum', 'Wert 3: Titel', 'text'],
    ['value3_text',      'Wer Teil von Mini-Kosmos wird, bringt sich ein — und nimmt etwas mit. Gemeinsam werden wir mehr.', 'Wert 3: Text', 'textarea'],
    ['team_kicker',      'Wer dahinter steckt', 'Team: Kicker',            'text'],
    ['team_headline',    'Hallo, wir sind<br>Melli &amp; Kathi 👋', 'Team: Überschrift (HTML erlaubt)', 'text'],
    ['insta_tile2',      'Mini Kosmos',  'Instagram: Kachel 2', 'text'],
    ['insta_tile3',      'Neue Sterne',  'Instagram: Kachel 3', 'text'],
    ['insta_tile4',      'Danke 💛',     'Instagram: Kachel 4', 'text'],
    ['impressum_name',      'Melanie Möck',                           'Impressum: Name',               'text'],
    ['impressum_street',    '',                                        'Impressum: Straße + Hausnummer', 'text'],
    ['impressum_zip_city',  'Stuttgart',                               'Impressum: PLZ + Ort',          'text'],
    ['impressum_phone',     '',                                        'Impressum: Telefon (optional)',  'text'],
    ['impressum_email',     'minikosmos.stuttgart@gmail.com',          'Impressum: E-Mail',             'text'],
    ['impressum_extra',     '',                                        'Impressum: Zusatzinfo (optional, z.B. Vereinsregister)', 'textarea'],
  ].forEach(row => ek.run(...row));
}

if (db.prepare('SELECT COUNT(*) AS c FROM events').get().c === 0) {
  const ins = db.prepare(
    'INSERT INTO events (vol, title, date, time, location, description, tags, status, sort_order) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  [
    [1,'Bingo Vol. 1','28.03.2026','14:00','StadtPalais Stuttgart','Der Urknall — 100 Teilnehmende beim allerersten Mini-Kosmos Bingo.',           'Bingo,Urknall','past',    1],
    [2,'Bingo Vol. 2','25.04.2026','14:00','StadtPalais Stuttgart','Das zweite Bingo-Nachmittag — noch mehr Begegnungen, noch mehr Freude.',       'Bingo',        'past',    2],
    [3,'Bingo Vol. 3','09.05.2026','14:00','StadtPalais Stuttgart','Mit DJ, geöffnetem Café und freiem Eintritt. Barrierefrei & familienfreundlich.','Bingo,DJ,Café','upcoming',3],
  ].forEach(row => ins.run(...row));
}

if (db.prepare('SELECT COUNT(*) AS c FROM partners').get().c === 0) {
  const ins = db.prepare(
    'INSERT INTO partners (name, website, category, active, sort_order) VALUES (?,?,?,1,?)'
  );
  [
    ['StadtPalais Stuttgart',       'https://stadtpalais-stuttgart.de',  'Veranstaltungsort', 1],
    ['Im Wizemann',                 'https://imwizemann.de',             'Gastronomie',       2],
    ['Landeshauptstadt Stuttgart',  'https://stuttgart.de',              'Öffentliche Hand',  3],
    ['LBBW Bank',                   '',                                  'Finanzinstitut',    4],
    ['WGV Versicherung',            '',                                  'Versicherung',      5],
    ['AIDA Intensivpflege',         'https://aida-pflegedienst.de',      'Pflege',            6],
    ['Pflegedienst Elite Stuttgart','https://stuttgart-pflege-elite.de', 'Pflege',            7],
    ['Preis-Pfiffikus',             'https://preis-pfiffikus.de',        'Preisagentur',      8],
    ['Schneider Schreibgeräte',     'https://schneiderpen.com',          'Schreibwaren',      9],
    ['Schreibwaren Wenzel',         'https://schreibwaren-wenzel.de',    'Schreibwaren',      10],
    ['odds and ends',               'https://instagram.com/oddsandendsatostend','Copyshop',   11],
    ['Digital Copy Studio',         'https://digitalcopystudio.com',     'Copyshop',          12],
    ['Freeride Mountain',           'https://freeride-mountain.com',     'Fahrrad',           13],
    ['VHY! in plants we trust',     'https://vhydowe.care',              'Pflanzen',          14],
    ['Khun-Aleks Photography',      'https://khun-aleks.de',             'Fotografie',        15],
    ['Imkerei Pargolo',             '',                                  'Imkerei',           16],
    ['Gospel im Osten',             '',                                  'Musik/Kultur',      17],
    ['Poolhaus',                    'https://poolhaus.love',             'Sonstiges',         18],
  ].forEach(row => ins.run(...row));
}

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 8 * 60 * 60 * 1000 }, // 8h
}));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'website')));

// ── File upload ───────────────────────────────
const upload = multer({
  dest:    UPLOADS_DIR,
  limits:  { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf');
  },
});

// ── Auth guard ────────────────────────────────
const requireAdmin = (req, res, next) =>
  req.session.isAdmin ? next() : res.redirect('/admin/login');

// ─────────────────────────────────────────────
// AUTO-EXPIRE: mark past events automatically
// ─────────────────────────────────────────────
const MONTHS_DE = {
  'januar':1,'februar':2,'märz':3,'april':4,'mai':5,'juni':6,
  'juli':7,'august':8,'september':9,'oktober':10,'november':11,'dezember':12
};

function parseEventDate(dateStr, timeStr) {
  if (!dateStr) return null;
  let d, m, y;
  // Format: "DD.MM.YYYY"
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dotMatch) {
    [, d, m, y] = dotMatch.map(Number);
  } else {
    // Format: "Samstag, 09. Mai 2026"
    const deMatch = dateStr.match(/(\d{1,2})\.\s*(\w+)\s+(\d{4})/);
    if (deMatch) {
      d = Number(deMatch[1]);
      m = MONTHS_DE[deMatch[2].toLowerCase()];
      y = Number(deMatch[3]);
    }
  }
  if (!d || !m || !y) return null;
  const [hh, mm] = (timeStr || '23:59').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 23, mm || 59);
}

function autoExpireEvents() {
  const now = new Date();
  const upcoming = db.prepare(
    "SELECT id, date, time FROM events WHERE status = 'upcoming'"
  ).all();
  const update = db.prepare("UPDATE events SET status = 'past' WHERE id = ?");
  for (const ev of upcoming) {
    const evDate = parseEventDate(ev.date, ev.time);
    if (evDate && evDate < now) update.run(ev.id);
  }
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────
app.get('/api/content', (_req, res) => {
  autoExpireEvents();
  const rows     = db.prepare('SELECT key, value FROM settings').all();
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const events   = db.prepare(
    'SELECT * FROM events ORDER BY sort_order, id'
  ).all();
  const partners = db.prepare(
    'SELECT * FROM partners WHERE active = 1 ORDER BY sort_order, id'
  ).all();
  res.json({ settings, events, partners });
});

// ─────────────────────────────────────────────
// PUBLIC WEBSITE
// ─────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'website', 'index.html'));
});

// ─────────────────────────────────────────────
// ADMIN — LOGIN
// ─────────────────────────────────────────────
app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.send(loginPage());
});

app.post('/admin/login', (req, res) => {
  const pw = req.body.password;
  if (pw === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    req.session.role    = 'admin';
    req.session.name    = 'Administrator';
    res.redirect('/admin');
  } else if (pw === CLIENT_PASSWORD) {
    req.session.isAdmin = true;
    req.session.role    = 'client';
    req.session.name    = 'Melli & Kathi';
    res.redirect('/admin');
  } else {
    res.send(loginPage('Falsches Passwort — bitte nochmal versuchen.'));
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ─────────────────────────────────────────────
// ADMIN — DASHBOARD
// ─────────────────────────────────────────────
app.get('/admin', requireAdmin, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings ORDER BY label').all();
  const events   = db.prepare('SELECT * FROM events ORDER BY sort_order, id').all();
  const partners = db.prepare('SELECT * FROM partners ORDER BY sort_order, id').all();
  const saved    = req.query.saved === '1';
  const userName = req.session.name || 'Admin';
  res.send(adminPage({ settings, events, partners, saved, userName }));
});

// ─────────────────────────────────────────────
// ADMIN — SETTINGS SAVE
// ─────────────────────────────────────────────
app.post('/admin/settings', requireAdmin, (req, res) => {
  const upd = db.prepare('UPDATE settings SET value = ? WHERE key = ?');
  for (const [key, value] of Object.entries(req.body)) {
    upd.run(value ?? '', key);
  }
  res.redirect('/admin?saved=1');
});

// ─────────────────────────────────────────────
// ADMIN — EVENTS
// ─────────────────────────────────────────────
app.post('/admin/events/new', requireAdmin, (req, res) => {
  const { vol, title, date, time, location, description, tags, status, sort_order } = req.body;
  db.prepare(
    'INSERT INTO events (vol,title,date,time,location,description,tags,status,sort_order) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(vol||null, title, date||'', time||'', location||'', description||'', tags||'', status||'upcoming', sort_order||99);
  res.redirect('/admin?saved=1#events');
});

app.post('/admin/events/:id', requireAdmin, (req, res) => {
  const { vol, title, date, time, location, description, tags, status, sort_order } = req.body;
  db.prepare(
    'UPDATE events SET vol=?,title=?,date=?,time=?,location=?,description=?,tags=?,status=?,sort_order=? WHERE id=?'
  ).run(vol||null, title, date||'', time||'', location||'', description||'', tags||'', status||'upcoming', sort_order||99, req.params.id);
  res.redirect('/admin?saved=1#events');
});

app.post('/admin/events/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.redirect('/admin#events');
});

// ─────────────────────────────────────────────
// ADMIN — PARTNERS
// ─────────────────────────────────────────────
app.post('/admin/partners/new', requireAdmin, (req, res) => {
  const { name, website, category, sort_order } = req.body;
  db.prepare(
    'INSERT INTO partners (name,website,category,active,sort_order) VALUES (?,?,?,1,?)'
  ).run(name, website||'', category||'', sort_order||99);
  res.redirect('/admin?saved=1#partner');
});

app.post('/admin/partners/:id', requireAdmin, (req, res) => {
  const { name, website, category, active, sort_order } = req.body;
  db.prepare(
    'UPDATE partners SET name=?,website=?,category=?,active=?,sort_order=? WHERE id=?'
  ).run(name, website||'', category||'', active==='1'?1:0, sort_order||99, req.params.id);
  res.redirect('/admin?saved=1#partner');
});

app.post('/admin/partners/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM partners WHERE id = ?').run(req.params.id);
  res.redirect('/admin#partner');
});

// ─────────────────────────────────────────────
// ADMIN — IMAGE UPLOAD
// ─────────────────────────────────────────────
app.post('/admin/upload/:slot', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.redirect('/admin?error=1#team');
  const ext      = path.extname(req.file.originalname) || '.jpg';
  const filename = `${req.params.slot}-${Date.now()}${ext}`;
  const destPath = path.join(UPLOADS_DIR, filename);
  fs.renameSync(req.file.path, destPath);

  const keyMap = { 'team-melli': 'image_team_melli', 'team-kathi': 'image_team_kathi', 'flyer': 'image_flyer' };
  const key    = keyMap[req.params.slot];
  if (key) {
    db.prepare('INSERT OR REPLACE INTO settings (key,value,label,type) VALUES (?,?,?,?)')
      .run(key, `/uploads/${filename}`, `Bild: ${req.params.slot}`, 'image');
  }
  const anchor = req.params.slot === 'flyer' ? '#flyer' : '#team';
  res.redirect('/admin?saved=1' + anchor);
});

// ─────────────────────────────────────────────
// ADMIN — IMAGE DELETE
// ─────────────────────────────────────────────
app.post('/admin/upload/:slot/delete', requireAdmin, (req, res) => {
  const keyMap = { 'team-melli': 'image_team_melli', 'team-kathi': 'image_team_kathi', 'flyer': 'image_flyer' };
  const key = keyMap[req.params.slot];
  if (key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (row && row.value) {
      // Strip leading slash and build absolute path
      const rel = row.value.replace(/^\//, '');
      const filePath = path.join(DATA_DIR, rel.replace(/^uploads\//, 'uploads/'));
      try { fs.unlinkSync(filePath); } catch (_) { /* already gone */ }
    }
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run('', key);
  }
  const delAnchor = req.params.slot === 'flyer' ? '#flyer' : '#team';
  res.redirect('/admin?saved=1' + delAnchor);
});

// ─────────────────────────────────────────────
// IMPRESSUM
// ─────────────────────────────────────────────
app.get('/impressum', (_req, res) => { res.send(impressumPage()); });

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✨ Mini-Kosmos CMS läuft auf Port ${PORT}`);
  console.log(`   Admin: http://localhost:${PORT}/admin`);
});

// ═════════════════════════════════════════════
// HTML TEMPLATES
// ═════════════════════════════════════════════

const CSS = `
  :root {
    --grad: linear-gradient(135deg,#8CCDBD 0%,#ADC985 25%,#E3B95B 50%,#E8862A 68%,#D4544A 82%,#7C517F 100%);
    --orange:#E8862A; --coral:#D4544A; --purple:#7C517F; --mint:#8CCDBD;
    --bg:#14060A; --surface:#1f0c12; --surface2:#2b1018; --border:#3a1a22;
    --text:#f5f0ee; --muted:#9a7a82; --success:#6DBF9E;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,sans-serif;font-size:15px;line-height:1.6}
  a{color:var(--orange);text-decoration:none}
  h1{font-size:1.6rem;font-weight:800;letter-spacing:.03em}
  h2{font-size:1.1rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:20px}
  h3{font-size:.95rem;font-weight:700;margin-bottom:12px;color:var(--text)}

  .grad-text{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .grad-bar{height:4px;background:var(--grad)}

  /* Layout */
  .shell{display:flex;min-height:100vh}
  .sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);padding:24px 16px;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto}
  .main{flex:1;padding:32px;max-width:900px}

  .logo{font-size:1.2rem;font-weight:900;letter-spacing:.06em;margin-bottom:4px}
  .logo-sub{font-size:.75rem;color:var(--muted);margin-bottom:28px}

  .nav-link{display:block;padding:9px 12px;border-radius:8px;color:var(--muted);font-size:.875rem;font-weight:500;transition:all .15s;margin-bottom:4px;cursor:pointer}
  .nav-link:hover,.nav-link.active{background:var(--surface2);color:var(--text)}
  .nav-link .icon{margin-right:8px}

  .logout{margin-top:auto;padding-top:20px;border-top:1px solid var(--border);margin-top:24px}

  /* Cards */
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:20px}
  .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}

  /* Forms */
  label{display:block;font-size:.8rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;margin-top:16px}
  label:first-child{margin-top:0}
  input[type=text],input[type=password],input[type=number],select,textarea{
    width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;
    padding:10px 14px;color:var(--text);font-size:.9rem;outline:none;font-family:inherit;transition:border-color .15s}
  input:focus,select:focus,textarea:focus{border-color:var(--orange)}
  textarea{min-height:100px;resize:vertical}
  select option{background:var(--surface)}

  /* Buttons */
  .btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-weight:700;font-size:.875rem;cursor:pointer;border:none;transition:opacity .15s}
  .btn:hover{opacity:.85}
  .btn-primary{background:linear-gradient(135deg,var(--orange),var(--coral));color:#fff}
  .btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
  .btn-danger{background:#5a0e0e;color:#ff8080;border:1px solid #7a1a1a}
  .btn-sm{padding:6px 12px;font-size:.8rem}

  /* Table */
  table{width:100%;border-collapse:collapse;font-size:.875rem}
  th{text-align:left;padding:10px 12px;background:var(--surface2);color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}
  td{padding:10px 12px;border-top:1px solid var(--border);vertical-align:top}
  tr:hover td{background:var(--surface2)}

  /* Toast */
  .toast{position:fixed;top:20px;right:20px;background:var(--success);color:#fff;padding:12px 20px;border-radius:10px;font-weight:700;font-size:.875rem;z-index:100;animation:slideIn .3s ease}
  @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}

  /* Status badge */
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700;text-transform:uppercase}
  .badge-upcoming{background:#1a3a2a;color:var(--success)}
  .badge-past{background:#2a2a1a;color:#aaa}

  /* Section jump — collapsible */
  .section{padding-top:20px}
  .section-divider{height:1px;background:var(--border);margin:32px 0}
  .section-toggle{cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none}
  .section-toggle::after{content:'▾';font-size:1.2rem;color:var(--muted);transition:transform .2s}
  .section.collapsed .section-toggle::after{transform:rotate(-90deg)}
  .section.collapsed .section-body{display:none}

  /* Grid 2-col */
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:600px){.grid2{grid-template-columns:1fr}}

  /* Upload area */
  .upload-zone{border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;color:var(--muted);font-size:.875rem}
  .upload-zone img{max-width:120px;max-height:120px;border-radius:8px;object-fit:cover;margin-bottom:12px;display:block;margin-inline:auto}
`;

function loginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mini-Kosmos Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    ${CSS}
    body{display:flex;align-items:center;justify-content:center;min-height:100vh}
    .login-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:40px;width:100%;max-width:380px}
    .login-logo{font-size:1.5rem;font-weight:900;letter-spacing:.06em;margin-bottom:4px}
    .login-sub{color:var(--muted);font-size:.8rem;margin-bottom:32px}
    .error{color:#E8862A;font-size:.85rem;margin-top:12px;padding:10px 14px;background:#2a1005;border-radius:8px}
  </style>
</head>
<body>
  <div class="login-card">
    <div class="grad-bar" style="border-radius:4px;margin-bottom:24px"></div>
    <div class="login-logo grad-text">✨ MINI-KOSMOS</div>
    <div class="login-sub">Admin-Bereich — Website verwalten</div>
    <form method="post" action="/admin/login">
      <label>Passwort</label>
      <input type="password" name="password" autofocus placeholder="••••••••" required>
      <button type="submit" class="btn btn-primary" style="width:100%;margin-top:20px;justify-content:center">
        Einloggen →
      </button>
      ${error ? `<div class="error">${error}</div>` : ''}
    </form>
  </div>
</body>
</html>`;
}

function adminPage({ settings, events, partners, saved, userName }) {
  const s = Object.fromEntries(settings.map(r => [r.key, r.value]));
  const val = (key, fallback = '') => esc(s[key] ?? fallback);

  const statusOptions = (cur) =>
    ['upcoming','past'].map(v =>
      `<option value="${v}"${cur===v?' selected':''}>${v==='upcoming'?'Kommend':'Vergangen'}</option>`
    ).join('');

  const activeOptions = (cur) =>
    `<option value="1"${cur===1?' selected':''}>Aktiv</option>
     <option value="0"${cur===0?' selected':''}>Versteckt</option>`;

  const eventsRows = events.map(e => `
    <tr>
      <td><strong>${e.title}</strong><br><small style="color:var(--muted)">${e.date} ${e.time}</small></td>
      <td>${e.location}</td>
      <td><span class="badge badge-${e.status}">${e.status==='upcoming'?'Kommend':'Vergangen'}</span></td>
      <td>
        <details style="cursor:pointer">
          <summary class="btn btn-ghost btn-sm">Bearbeiten</summary>
          <div style="padding:16px;background:var(--surface2);border-radius:8px;margin-top:8px">
            <form method="post" action="/admin/events/${e.id}">
              <div class="grid2">
                <div><label>Vol.</label><input type="number" name="vol" value="${e.vol||''}"></div>
                <div><label>Status</label><select name="status">${statusOptions(e.status)}</select></div>
              </div>
              <label>Titel</label><input type="text" name="title" value="${esc(e.title)}" required>
              <div class="grid2">
                <div><label>Datum</label><input type="text" name="date" value="${esc(e.date)}" placeholder="09.05.2026"></div>
                <div><label>Uhrzeit</label><input type="text" name="time" value="${esc(e.time)}" placeholder="14:00"></div>
              </div>
              <label>Ort</label><input type="text" name="location" value="${esc(e.location)}">
              <label>Beschreibung</label><textarea name="description">${esc(e.description)}</textarea>
              <label>Tags (Komma-getrennt)</label><input type="text" name="tags" value="${esc(e.tags)}">
              <label>Reihenfolge</label><input type="number" name="sort_order" value="${e.sort_order}">
              <div style="display:flex;gap:8px;margin-top:16px">
                <button type="submit" class="btn btn-primary btn-sm">Speichern</button>
                <button type="submit" form="del-event-${e.id}" class="btn btn-danger btn-sm" onclick="return confirm('Event löschen?')">Löschen</button>
              </div>
            </form>
            <form id="del-event-${e.id}" method="post" action="/admin/events/${e.id}/delete"></form>
          </div>
        </details>
      </td>
    </tr>`).join('');

  const partnerRows = partners.map(p => `
    <tr>
      <td><strong>${esc(p.name)}</strong><br><small style="color:var(--muted)">${esc(p.category)}</small></td>
      <td><small>${p.website ? `<a href="${esc(p.website)}" target="_blank">${esc(p.website)}</a>` : '—'}</small></td>
      <td><span class="badge" style="background:${p.active?'#1a3a2a':'#2a2a1a'};color:${p.active?'var(--success)':'#aaa'}">${p.active?'Aktiv':'Versteckt'}</span></td>
      <td>
        <details>
          <summary class="btn btn-ghost btn-sm">Bearbeiten</summary>
          <div style="padding:16px;background:var(--surface2);border-radius:8px;margin-top:8px">
            <form method="post" action="/admin/partners/${p.id}">
              <label>Name</label><input type="text" name="name" value="${esc(p.name)}" required>
              <label>Website (optional)</label><input type="text" name="website" value="${esc(p.website)}" placeholder="https://...">
              <label>Kategorie</label><input type="text" name="category" value="${esc(p.category)}">
              <div class="grid2">
                <div><label>Sichtbarkeit</label><select name="active">${activeOptions(p.active)}</select></div>
                <div><label>Reihenfolge</label><input type="number" name="sort_order" value="${p.sort_order}"></div>
              </div>
              <div style="display:flex;gap:8px;margin-top:16px">
                <button type="submit" class="btn btn-primary btn-sm">Speichern</button>
                <button type="submit" form="del-partner-${p.id}" class="btn btn-danger btn-sm" onclick="return confirm('Partner löschen?')">Löschen</button>
              </div>
            </form>
            <form id="del-partner-${p.id}" method="post" action="/admin/partners/${p.id}/delete"></form>
          </div>
        </details>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mini-Kosmos Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
  <style>
    ${CSS}
    .hint{color:var(--muted);font-size:.8rem;margin-bottom:20px;padding:10px 14px;background:var(--surface2);border-radius:8px;border-left:3px solid var(--orange)}
    .stat-grid{display:grid;grid-template-columns:120px 1fr;gap:10px 16px;align-items:end}
    .stat-grid label{margin-top:0}
    .stat-lbl{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--orange);margin-bottom:8px;margin-top:20px}
  </style>
</head>
<body>

${saved ? '<div class="toast">✓ Gespeichert</div>' : ''}

<div class="shell">

  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="logo grad-text">✨ MINI-KOSMOS</div>
    <div class="logo-sub">Admin-Panel</div>
    <nav>
      <a class="nav-link" href="#hero"><span class="icon">🚀</span>Hero</a>
      <a class="nav-link" href="#mission"><span class="icon">💫</span>Mission</a>
      <a class="nav-link" href="#team"><span class="icon">👩‍🚀</span>Team</a>
      <a class="nav-link" href="#events"><span class="icon">📅</span>Events</a>
      <a class="nav-link" href="#flyer"><span class="icon">📄</span>Flyer</a>
      <a class="nav-link" href="#partner"><span class="icon">🌟</span>Partner</a>
      <a class="nav-link" href="#instagram"><span class="icon">📸</span>Instagram</a>
      <a class="nav-link" href="#kontakt"><span class="icon">💌</span>Kontakt</a>
      <a class="nav-link" href="#impressum"><span class="icon">📄</span>Impressum</a>
    </nav>
    <div class="logout">
      <a class="nav-link" href="/" target="_blank"><span class="icon">🌐</span>Website ansehen</a>
      <a id="bughub-trigger" class="nav-link" href="#" style="color:#f59e0b"><span class="icon"><svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='display:inline;vertical-align:-2px'><path d='m8 2 1.88 1.88'/><path d='M14.12 3.88 16 2'/><path d='M9 7.13v-1a3.003 3.003 0 1 1 6 0v1'/><path d='M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6'/><path d='M12 20v-9'/><path d='M6.53 9C4.6 8.8 3 7.1 3 5'/><path d='M6 13H2'/><path d='M3 21c0-2.1 1.7-3.9 3.8-4'/><path d='M20.97 5c0 2.1-1.6 3.8-3.5 4'/><path d='M22 13h-4'/><path d='M17.2 17c2.1.1 3.8 1.9 3.8 4'/></svg></span>Bug melden</a>
      <a class="nav-link" href="/admin/logout"><span class="icon">🚪</span>Ausloggen</a>
      <div style="padding:10px 16px 4px;font-size:0.75rem;color:var(--text);opacity:0.6;border-top:1px solid var(--border);margin-top:8px;">
        👤 ${esc(userName)}
      </div>
    </div>
  </aside>

  <!-- MAIN -->
  <main class="main">
    <div style="margin-bottom:32px">
      <h1>Website verwalten</h1>
      <p style="color:var(--muted);margin-top:6px;font-size:.875rem">Jeder Abschnitt hier entspricht einem Abschnitt auf der Website. Änderungen sind sofort sichtbar.</p>
    </div>

    <!-- ── HERO ──────────────────────────────── -->
    <div id="hero" class="section">
      <h2>🚀 Hero</h2>
      <p class="hint">→ Ändert den <strong>ersten Abschnitt</strong> der Website: große Überschrift, Subtext und die drei Statistiken</p>
      <div class="card">
        <form method="post" action="/admin/settings">
          <label>Badge-Text <span style="font-weight:400;color:var(--muted)">(kleine Zeile über der Überschrift)</span></label>
          <input type="text" name="hero_badge" value="${val('hero_badge','✦ Gemeinnützige Initiative · Stuttgart')}">

          <label style="margin-top:16px">Große Überschrift <span style="font-weight:400;color:var(--muted)">(HTML erlaubt, z.B. Begegnung&lt;br&gt;neu denken.)</span></label>
          <input type="text" name="hero_headline" value="${val('hero_headline','Begegnung<br>neu denken.')}">

          <label>Untertext</label>
          <textarea name="hero_subline" style="min-height:60px">${val('hero_subline')}</textarea>

          <div class="stat-lbl" style="margin-top:24px">Statistiken</div>
          <div style="background:var(--surface2);border-radius:10px;padding:16px">
            <div class="stat-grid">
              <div>
                <label>Stat 1 — Zahl</label>
                <input type="text" name="stats_events_count" value="${val('stats_events_count','3×')}">
              </div>
              <div>
                <label>Stat 1 — Bezeichnung</label>
                <input type="text" name="stats_events_label" value="${val('stats_events_label','Bingo-Events')}">
              </div>
              <div>
                <label>Stat 2 — Zahl</label>
                <input type="text" name="stats_participants" value="${val('stats_participants','100+')}">
              </div>
              <div>
                <label>Stat 2 — Bezeichnung</label>
                <input type="text" name="stats_participants_label" value="${val('stats_participants_label','Teilnehmende')}">
              </div>
              <div>
                <label>Stat 3 — Zahl</label>
                <input type="text" name="stats_partner_count" value="${val('stats_partner_count','18')}">
              </div>
              <div>
                <label>Stat 3 — Bezeichnung</label>
                <input type="text" name="stats_partner_label" value="${val('stats_partner_label','Partner & Förderer')}">
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top:24px">Speichern</button>
        </form>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── MISSION ───────────────────────────── -->
    <div id="mission" class="section">
      <h2>💫 Mission</h2>
      <p class="hint">→ Ändert den Fließtext im Abschnitt <strong>"Was wir tun"</strong> auf der Website</p>
      <div class="card">
        <form method="post" action="/admin/settings">
          <label>Kicker <span style="font-weight:400;color:var(--muted)">(kleine Zeile über der Überschrift)</span></label>
          <input type="text" name="mission_kicker" value="${val('mission_kicker','Was wir tun')}">

          <label style="margin-top:16px">Überschrift <span style="font-weight:400;color:var(--muted)">(HTML erlaubt, z.B. &lt;br&gt; für Umbruch)</span></label>
          <input type="text" name="mission_headline" value="${val('mission_headline','Ein kleines<br>Universum.<br>Mitten in Stuttgart.')}">

          <label style="margin-top:16px">Fließtext <span style="font-weight:400;color:var(--muted)">(Leerzeile = neuer Absatz)</span></label>
          <textarea name="mission_text" style="min-height:180px">${val('mission_text')}</textarea>
          <button type="submit" class="btn btn-primary" style="margin-top:20px">Speichern</button>
        </form>
      </div>

      <div class="card" style="margin-top:16px">
        <h3 style="margin-bottom:16px;color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.05em">Wert-Karten (Begegnung · Dialog · Wachstum)</h3>
        <p class="hint" style="margin-bottom:20px">→ Die drei Karten unterhalb des Fließtexts im Mission-Abschnitt</p>
        <form method="post" action="/admin/settings">
          ${[1,2,3].map(n => `
            <div style="background:var(--surface2);border-radius:10px;padding:16px;margin-bottom:12px">
              <div style="font-size:.75rem;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Karte ${n}</div>
              <div class="grid2">
                <div>
                  <label>Emoji</label>
                  <input type="text" name="value${n}_emoji" value="${val('value'+n+'_emoji')}">
                </div>
                <div>
                  <label>Titel</label>
                  <input type="text" name="value${n}_title" value="${val('value'+n+'_title')}">
                </div>
              </div>
              <label>Text</label>
              <textarea name="value${n}_text" style="min-height:70px">${val('value'+n+'_text')}</textarea>
            </div>
          `).join('')}
          <button type="submit" class="btn btn-primary" style="margin-top:4px">Speichern</button>
        </form>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── TEAM ──────────────────────────────── -->
    <div id="team" class="section">
      <h2>👩‍🚀 Team & Bilder</h2>
      <p class="hint">→ Ändert die Texte im Abschnitt <strong>"Hallo, wir sind Melli & Kathi"</strong> auf der Website</p>
      <div class="card">
        <form method="post" action="/admin/settings">
          <label>Kicker <span style="font-weight:400;color:var(--muted)">(kleine Zeile über der Überschrift)</span></label>
          <input type="text" name="team_kicker" value="${val('team_kicker','Wer dahinter steckt')}">

          <label style="margin-top:16px">Überschrift <span style="font-weight:400;color:var(--muted)">(HTML erlaubt, z.B. &lt;br&gt; für Umbruch)</span></label>
          <input type="text" name="team_headline" value="${val('team_headline')}">

          <label style="margin-top:16px">Absatz 1 <span style="font-weight:400;color:var(--muted)">(Wer ihr seid)</span></label>
          <textarea name="team_intro_1">${val('team_intro_1')}</textarea>

          <label style="margin-top:16px">Absatz 2 <span style="font-weight:400;color:var(--muted)">(Was ihr macht / CTA)</span></label>
          <textarea name="team_intro_2">${val('team_intro_2')}</textarea>

          <button type="submit" class="btn btn-primary" style="margin-top:20px">Speichern</button>
        </form>
      </div>

      <div class="grid2" style="margin-top:16px">
        ${['melli','kathi'].map(name => {
          const slot  = `team-${name}`;
          const key   = `image_team_${name}`;
          const label = name === 'melli' ? 'Melli' : 'Kathi';
          const imgVal = s[key] || '';
          return `
          <div class="card">
            <h3 style="margin-bottom:12px">Foto ${label}</h3>
            <div class="upload-zone">
              ${imgVal
                ? `<img src="${imgVal}" alt="${label}" style="max-width:120px;max-height:120px;border-radius:8px;object-fit:cover;margin-inline:auto">`
                : '<p style="color:var(--muted);font-size:.85rem">📷 Noch kein Foto</p>'}
            </div>
            <form method="post" action="/admin/upload/${slot}" enctype="multipart/form-data" style="margin-top:12px">
              <input type="file" name="image" accept="image/*" style="font-size:.8rem;color:var(--muted);width:100%;margin-bottom:8px">
              <div style="display:flex;gap:8px">
                <button type="submit" class="btn btn-ghost btn-sm" style="flex:1">Hochladen</button>
                ${imgVal ? `<button type="submit" form="del-img-${name}" class="btn btn-danger btn-sm" onclick="return confirm('Foto löschen?')">🗑</button>` : ''}
              </div>
            </form>
            <form id="del-img-${name}" method="post" action="/admin/upload/${slot}/delete"></form>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── EVENTS ─────────────────────────────── -->
    <div id="events" class="section">
      <h2>📅 Events</h2>
      <p class="hint">→ Ändert den Abschnitt <strong>"Das nächste Event"</strong> auf der Website — das erste „Kommend"-Event wird automatisch angezeigt</p>
      <div class="card">
        <div class="card-header">
          <span>${events.length} Events</span>
          <details>
            <summary class="btn btn-primary btn-sm">+ Neues Event</summary>
            <div style="padding:16px;background:var(--surface2);border-radius:8px;margin-top:12px">
              <form method="post" action="/admin/events/new">
                <div class="grid2">
                  <div><label>Vol.</label><input type="number" name="vol" placeholder="4"></div>
                  <div><label>Status</label><select name="status"><option value="upcoming">Kommend</option><option value="past">Vergangen</option></select></div>
                </div>
                <label>Titel *</label><input type="text" name="title" placeholder="Bingo Vol. 4" required>
                <div class="grid2">
                  <div><label>Datum</label><input type="text" name="date" placeholder="14.06.2026"></div>
                  <div><label>Uhrzeit</label><input type="text" name="time" placeholder="14:00"></div>
                </div>
                <label>Ort</label><input type="text" name="location" placeholder="StadtPalais Stuttgart">
                <label>Beschreibung</label><textarea name="description"></textarea>
                <label>Tags (Komma-getrennt)</label><input type="text" name="tags" placeholder="Bingo,DJ,Café">
                <label>Reihenfolge</label><input type="number" name="sort_order" value="4">
                <button type="submit" class="btn btn-primary" style="margin-top:16px">Event anlegen</button>
              </form>
            </div>
          </details>
        </div>
        <table>
          <thead><tr><th>Event</th><th>Ort</th><th>Status</th><th>Aktion</th></tr></thead>
          <tbody>${eventsRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── FLYER ──────────────────────────────── -->
    <div id="flyer" class="section">
      <h2>📄 Flyer</h2>
      <p class="hint">→ Lade einen Flyer hoch (Bild, DIN hoch). Wird auf der Website als kleine Vorschau angezeigt — Klick öffnet die Großansicht mit Teilen-Funktion.</p>
      <div class="card">
        <div class="upload-zone">
          ${s['image_flyer']
            ? '<img src="' + esc(s['image_flyer']) + '" alt="Flyer" style="max-width:180px;max-height:260px;border-radius:8px;object-fit:contain;margin-inline:auto">'
            : '<p style="color:var(--muted);font-size:.85rem">📄 Noch kein Flyer hochgeladen</p>'}
        </div>
        <form method="post" action="/admin/upload/flyer" enctype="multipart/form-data" style="margin-top:12px">
          <input type="file" name="image" accept="image/*" style="font-size:.8rem;color:var(--muted);width:100%;margin-bottom:8px">
          <div style="display:flex;gap:8px">
            <button type="submit" class="btn btn-ghost btn-sm" style="flex:1">Hochladen</button>
            ${s['image_flyer'] ? '<button type="submit" form="del-img-flyer" class="btn btn-danger btn-sm" onclick="return confirm(\'Flyer löschen?\')">🗑</button>' : ''}
          </div>
        </form>
        <form id="del-img-flyer" method="post" action="/admin/upload/flyer/delete"></form>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── PARTNER ─────────────────────────────── -->
    <div id="partner" class="section">
      <h2>🌟 Partner & Sponsoren</h2>
      <p class="hint">→ Ändert den Abschnitt <strong>"Unsere Partner & Förderer"</strong> auf der Website — nur aktive Partner werden angezeigt</p>
      <div class="card">
        <div class="card-header">
          <span>${partners.length} Partner</span>
          <details>
            <summary class="btn btn-primary btn-sm">+ Neuer Partner</summary>
            <div style="padding:16px;background:var(--surface2);border-radius:8px;margin-top:12px">
              <form method="post" action="/admin/partners/new">
                <label>Name *</label><input type="text" name="name" required>
                <label>Website (optional)</label><input type="text" name="website" placeholder="https://...">
                <label>Kategorie</label><input type="text" name="category" placeholder="Pflege, Gastronomie, ...">
                <label>Reihenfolge</label><input type="number" name="sort_order" value="99">
                <button type="submit" class="btn btn-primary" style="margin-top:16px">Partner anlegen</button>
              </form>
            </div>
          </details>
        </div>
        <table>
          <thead><tr><th>Partner</th><th>Website</th><th>Status</th><th>Aktion</th></tr></thead>
          <tbody>${partnerRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── INSTAGRAM ────────────────────────────── -->
    <div id="instagram" class="section">
      <h2>📸 Instagram</h2>
      <p class="hint">→ Ändert die Texte in den vier Bild-Kacheln im Abschnitt <strong>"Folg uns"</strong> — Kachel 1 zeigt automatisch das nächste Event</p>
      <div class="card">
        <form method="post" action="/admin/settings">
          <div style="background:var(--surface2);border-radius:8px;padding:12px;margin-bottom:16px;font-size:.8rem;color:var(--muted)">
            💡 Kachel 1 zeigt automatisch den nächsten Event-Titel aus dem Events-Abschnitt — kein eigenes Feld nötig.
          </div>
          <label>Kachel 2</label>
          <input type="text" name="insta_tile2" value="${val('insta_tile2','Mini Kosmos')}">
          <label style="margin-top:12px">Kachel 3</label>
          <input type="text" name="insta_tile3" value="${val('insta_tile3','Neue Sterne')}">
          <label style="margin-top:12px">Kachel 4</label>
          <input type="text" name="insta_tile4" value="${val('insta_tile4','Danke 💛')}">
          <button type="submit" class="btn btn-primary" style="margin-top:20px">Speichern</button>
        </form>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── KONTAKT ─────────────────────────────── -->
    <div id="kontakt" class="section">
      <h2>💌 Kontakt & Links</h2>
      <p class="hint">→ Ändert die Kontakt-Verlinkungen im Abschnitt <strong>"Werde Teil des Mini-Kosmos"</strong> auf der Website</p>
      <div class="card">
        <form method="post" action="/admin/settings">
          <label>E-Mail Adresse <span style="font-weight:400;color:var(--muted)">(erscheint als anklickbarer E-Mail-Link)</span></label>
          <input type="text" name="contact_email" value="${val('contact_email')}" placeholder="euer@email.de">

          <label style="margin-top:16px">Instagram URL <span style="font-weight:400;color:var(--muted)">(vollständige URL)</span></label>
          <input type="text" name="contact_instagram" value="${val('contact_instagram')}" placeholder="https://www.instagram.com/...">

          <label style="margin-top:16px">Linktree URL <span style="font-weight:400;color:var(--muted)">(alle Links auf einer Seite)</span></label>
          <input type="text" name="contact_linktree" value="${val('contact_linktree')}" placeholder="https://linktr.ee/...">

          <button type="submit" class="btn btn-primary" style="margin-top:20px">Speichern</button>
        </form>
      </div>
    </div>

    <div class="section-divider"></div>

    <!-- ── IMPRESSUM ───────────────────────────── -->
    <div id="impressum" class="section">
      <h2>📄 Impressum</h2>
      <p class="hint">→ Diese Angaben erscheinen auf der <strong>Impressum-Seite</strong> eurer Website (gesetzlich vorgeschrieben nach § 5 TMG)</p>
      <div class="card">
        <form method="post" action="/admin/settings">
          <label>Name (Verantwortliche Person)</label>
          <input type="text" name="impressum_name" value="${val('impressum_name')}" placeholder="Vor- und Nachname">

          <label style="margin-top:16px">Straße + Hausnummer <span style="font-weight:400;color:var(--muted)">(Pflichtangabe)</span></label>
          <input type="text" name="impressum_street" value="${val('impressum_street')}" placeholder="z.B. Musterstraße 12">

          <label style="margin-top:16px">PLZ + Ort</label>
          <input type="text" name="impressum_zip_city" value="${val('impressum_zip_city')}" placeholder="z.B. 70173 Stuttgart">

          <label style="margin-top:16px">Telefon <span style="font-weight:400;color:var(--muted)">(optional)</span></label>
          <input type="text" name="impressum_phone" value="${val('impressum_phone')}" placeholder="z.B. +49 711 000000">

          <label style="margin-top:16px">E-Mail Adresse</label>
          <input type="text" name="impressum_email" value="${val('impressum_email')}" placeholder="euer@email.de">

          <label style="margin-top:16px">Zusatzinfo <span style="font-weight:400;color:var(--muted)">(optional — z.B. Vereinsregisternummer, Steuernummer)</span></label>
          <textarea name="impressum_extra" rows="3" placeholder="z.B. Eingetragen im Vereinsregister Stuttgart, VR 12345">${val('impressum_extra')}</textarea>

          <button type="submit" class="btn btn-primary" style="margin-top:20px">Speichern</button>
        </form>
      </div>
    </div>

    <div style="height:80px"></div>
  </main>
</div>

<script>
  // Auto-hide toast after 3s
  const toast = document.querySelector('.toast');
  if (toast) setTimeout(() => { toast.style.transition='opacity .5s'; toast.style.opacity='0'; }, 3000);

  // ── Collapsible Sections ──
  document.querySelectorAll('.section').forEach(sec => {
    const h2 = sec.querySelector('h2');
    if (!h2) return;
    // Wrap h2 as toggle
    const toggle = document.createElement('div');
    toggle.className = 'section-toggle';
    h2.parentNode.insertBefore(toggle, h2);
    toggle.appendChild(h2);
    // Wrap rest as body
    const body = document.createElement('div');
    body.className = 'section-body';
    while (toggle.nextSibling) body.appendChild(toggle.nextSibling);
    sec.appendChild(body);
    // Start collapsed
    sec.classList.add('collapsed');
    // Toggle on click
    toggle.addEventListener('click', () => sec.classList.toggle('collapsed'));
  });

  // ── Sidebar nav: click opens section ──
  document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const sec = document.getElementById(id);
      if (sec && sec.classList.contains('section')) {
        e.preventDefault();
        // Collapse all others, open this one
        document.querySelectorAll('.section').forEach(s => s.classList.add('collapsed'));
        sec.classList.remove('collapsed');
        // Update active state
        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
        link.classList.add('active');
        // Smooth scroll
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ── Open section from hash (after save redirect) ──
  const hash = location.hash.slice(1);
  if (hash) {
    const sec = document.getElementById(hash);
    if (sec && sec.classList.contains('section')) {
      sec.classList.remove('collapsed');
      const navLink = document.querySelector('.nav-link[href="#' + hash + '"]');
      if (navLink) navLink.classList.add('active');
      setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }

  // Scroll-Position nach Speichern wiederherstellen
  if (location.search.includes('saved=1') && !hash) {
    const savedY = sessionStorage.getItem('adminScrollY');
    if (savedY) {
      setTimeout(() => { window.scrollTo(0, parseInt(savedY)); }, 80);
      sessionStorage.removeItem('adminScrollY');
    }
  }

  // Vor dem Absenden: Scroll-Position speichern
  document.querySelectorAll('form').forEach(f => {
    f.addEventListener('submit', () => {
      sessionStorage.setItem('adminScrollY', window.scrollY);
    });
  });
</script>
<script src="https://bugs.marrazzo.digital/widget.js"
  data-project="minikosmos-admin"
  data-api-key="mk_admin_3e7f2a1b9c8d5e4f3a2b1c0d9e8f7a6b"
  data-position="bottom-right"
  data-color="#f59e0b"
  data-types="bug,ux,wunsch"
  data-trigger-id="bughub-trigger">
</script>
</body>
</html>`;
}

// ═════════════════════════════════════════════
// IMPRESSUM PAGE
// ═════════════════════════════════════════════
function impressumPage() {
  const get = key => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? esc(row.value) : '';
  };
  const name     = get('impressum_name')     || 'Melanie Möck';
  const street   = get('impressum_street');
  const zipCity  = get('impressum_zip_city') || 'Stuttgart';
  const phone    = get('impressum_phone');
  const email    = get('impressum_email')    || 'minikosmos.stuttgart@gmail.com';
  const extra    = get('impressum_extra');

  const addressLines = [name, street, zipCity, 'Deutschland'].filter(Boolean).join('<br>');
  const phoneHtml   = phone ? `Telefon: ${phone}<br>` : '';
  const extraHtml   = extra ? `<div class="imp-section"><h2>Sonstiges</h2><p>${extra.replace(/\n/g,'<br>')}</p></div>` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Impressum — Mini-Kosmos Stuttgart</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <style>
    body { background: #FAFAF5; }
    .imp-wrap { max-width: 680px; margin: 0 auto; padding: 60px 24px 80px; }
    .imp-back { display: inline-flex; align-items: center; gap: 6px; color: #8C7060; font-size: .875rem; margin-bottom: 40px; }
    .imp-back:hover { color: #E8862A; }
    .imp-title { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 2.2rem; text-transform: uppercase; letter-spacing: .04em; color: #2D1208; margin-bottom: 8px; }
    .imp-sub { color: #8C7060; font-size: .875rem; margin-bottom: 40px; }
    .imp-section { margin-bottom: 32px; }
    .imp-section h2 { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #8C7060; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #E8E0D8; }
    .imp-section p { color: #5A3D2B; line-height: 1.7; font-size: .95rem; }
    .imp-section a { color: #E8862A; }
    .imp-divider { height: 1px; background: #E8E0D8; margin: 32px 0; }
  </style>
</head>
<body>
<div class="grad-bar"></div>
<div class="imp-wrap">
  <a href="/" class="imp-back">← Zurück zur Website</a>

  <div class="imp-title">Impressum</div>
  <div class="imp-sub">Angaben gemäß § 5 TMG</div>

  <div class="imp-section">
    <h2>Verantwortlich</h2>
    <p>${addressLines}</p>
  </div>

  <div class="imp-section">
    <h2>Kontakt</h2>
    <p>
      ${phoneHtml}E-Mail: <a href="mailto:${email}">${email}</a>
    </p>
  </div>

  ${extraHtml}

  <div class="imp-divider"></div>

  <div class="imp-section">
    <h2>Inhaltlich verantwortlich</h2>
    <p>${name} (Adresse wie oben)</p>
  </div>

  <div class="imp-section">
    <h2>Haftungsausschluss</h2>
    <p>
      Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt.
      Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
      können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter
      sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
      nach den allgemeinen Gesetzen verantwortlich.
    </p>
  </div>

  <div class="imp-section">
    <h2>Externe Links</h2>
    <p>
      Diese Website enthält Links zu externen Webseiten Dritter, auf deren
      Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten
      Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.
    </p>
  </div>

  <div class="imp-section">
    <h2>Urheberrecht</h2>
    <p>
      Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
      Seiten unterliegen dem deutschen Urheberrecht. © 2026 Mini-Kosmos Stuttgart.
    </p>
  </div>
</div>
</body>
</html>`;
}

// HTML escape helper
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
