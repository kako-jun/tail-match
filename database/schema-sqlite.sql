-- ========================================
-- Tail Match SQLite スキーマ定義
-- ========================================
--
-- PostgreSQL の schema.sql から SQLite 互換に変換したもの。
-- スクレイパーパイプライン（yaml-to-db.js）で使用。
-- ========================================

-- 地域テーブル (regions)
CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'prefecture',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 自治体テーブル (municipalities)
CREATE TABLE IF NOT EXISTS municipalities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_id INTEGER REFERENCES regions(id),
    name TEXT NOT NULL,
    municipality_type TEXT,
    website_url TEXT,
    contact_info TEXT,
    scraping_config TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(region_id, name)
);

-- 保護動物テーブル (tails)
CREATE TABLE IF NOT EXISTS tails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    municipality_id INTEGER REFERENCES municipalities(id),
    external_id TEXT,
    animal_type TEXT DEFAULT 'cat',
    name TEXT,
    breed TEXT,
    age_estimate TEXT,
    gender TEXT,
    color TEXT,
    size TEXT,
    health_status TEXT,
    personality TEXT,
    special_needs TEXT,
    images TEXT,
    protection_date TEXT,
    deadline_date TEXT,
    status TEXT DEFAULT 'available',
    transfer_decided INTEGER DEFAULT 0,
    listing_type TEXT DEFAULT 'adoption',
    source_url TEXT,
    last_scraped_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(municipality_id, external_id)
);

-- スクレイピング履歴テーブル (scraping_logs)
CREATE TABLE IF NOT EXISTS scraping_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    municipality_id INTEGER REFERENCES municipalities(id),
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    status TEXT,
    tails_found INTEGER DEFAULT 0,
    tails_added INTEGER DEFAULT 0,
    tails_updated INTEGER DEFAULT 0,
    tails_removed INTEGER DEFAULT 0,
    error_message TEXT,
    html_filepath TEXT,
    execution_time_ms INTEGER,
    html_size INTEGER,
    detection_result TEXT
);

-- ========================================
-- インデックス作成
-- ========================================

CREATE INDEX IF NOT EXISTS idx_tails_municipality_id ON tails(municipality_id);
CREATE INDEX IF NOT EXISTS idx_tails_status ON tails(status);
CREATE INDEX IF NOT EXISTS idx_tails_animal_type ON tails(animal_type);
CREATE INDEX IF NOT EXISTS idx_tails_deadline_date ON tails(deadline_date);
CREATE INDEX IF NOT EXISTS idx_tails_last_scraped_at ON tails(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_municipality_id ON scraping_logs(municipality_id);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_started_at ON scraping_logs(started_at);

-- ========================================
-- 初期データ投入
-- ========================================

INSERT OR IGNORE INTO regions (name, code, type) VALUES
    ('石川県', 'ishikawa', 'prefecture'),
    ('富山県', 'toyama', 'prefecture'),
    ('福井県', 'fukui', 'prefecture'),
    ('京都府', 'kyoto', 'prefecture'),
    ('大阪府', 'osaka', 'prefecture'),
    ('兵庫県', 'hyogo', 'prefecture'),
    ('東京都', 'tokyo', 'prefecture'),
    ('神奈川県', 'kanagawa', 'prefecture'),
    ('埼玉県', 'saitama', 'prefecture'),
    ('千葉県', 'chiba', 'prefecture'),
    ('北海道', 'hokkaido', 'prefecture'),
    ('沖縄県', 'okinawa', 'prefecture'),
    ('愛知県', 'aichi', 'prefecture');

-- 自治体の初期データ（個別INSERT）
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, 'いしかわ動物愛護センター', 'https://aigo-ishikawa.jp/petadoption_list/', 1
    FROM regions r WHERE r.code = 'ishikawa';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '金沢市動物愛護管理センター', 'https://www4.city.kanazawa.lg.jp/11050/dobutsu/jyotozenshin.html', 1
    FROM regions r WHERE r.code = 'ishikawa';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '富山県動物愛護センター', 'https://www.pref.toyama.jp/1636/kurashi/datsusyobun/jouto.html', 1
    FROM regions r WHERE r.code = 'toyama';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '福井県動物愛護管理センター', 'https://fukuiloveanimals.com/jyoto.php', 1
    FROM regions r WHERE r.code = 'fukui';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '京都府動物愛護センター', 'http://kyoto-ani-love.com/publics/index/37/', 1
    FROM regions r WHERE r.code = 'kyoto';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '大阪府動物愛護管理センター', 'https://www.pref.osaka.lg.jp/doaigc/zyotoneko/', 1
    FROM regions r WHERE r.code = 'osaka';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '大阪市動物管理センター', 'https://www.city.osaka.lg.jp/kenko/page/0000370055.html', 1
    FROM regions r WHERE r.code = 'osaka';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '堺市動物指導センター', 'https://www.city.sakai.lg.jp/kurashi/gomi/dobutsu/suishin/jyoutokai_neko.html', 1
    FROM regions r WHERE r.code = 'osaka';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '兵庫県動物愛護センター', 'https://web.pref.hyogo.lg.jp/kf10/hw11_000000110.html', 1
    FROM regions r WHERE r.code = 'hyogo';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '東京都動物愛護相談センター', 'https://www.fukushihoken.metro.tokyo.lg.jp/douso/jouto/neko.html', 1
    FROM regions r WHERE r.code = 'tokyo';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '神奈川県動物愛護センター', 'https://www.pref.kanagawa.jp/docs/v7d/cnt/f80192/', 1
    FROM regions r WHERE r.code = 'kanagawa';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '横浜市動物愛護センター', 'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/', 1
    FROM regions r WHERE r.code = 'kanagawa';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '川崎市動物愛護センター', 'https://www.city.kawasaki.jp/350/page/0000046858.html', 1
    FROM regions r WHERE r.code = 'kanagawa';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '相模原市動物愛護センター', 'http://sagamihara-doubutsuaigo-center.jp/', 1
    FROM regions r WHERE r.code = 'kanagawa';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '埼玉県動物指導センター', 'https://www.pref.saitama.lg.jp/b0716/joutoinuneko.html', 1
    FROM regions r WHERE r.code = 'saitama';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, 'さいたま市動物愛護ふれあいセンター', 'https://www.city.saitama.jp/001/011/015/003/006/p094736.html', 1
    FROM regions r WHERE r.code = 'saitama';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '千葉県動物愛護センター', 'https://www.pref.chiba.lg.jp/aigo/jyoutozentaikai/neko/index.html', 1
    FROM regions r WHERE r.code = 'chiba';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '千葉市動物保護指導センター', 'https://www.city.chiba.jp/hokenfukushi/kenkou/seikatsueisei/catadoption.html', 1
    FROM regions r WHERE r.code = 'chiba';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '北海道立動物愛護センター「あいにきた」', 'https://www.pref.hokkaido.lg.jp/ks/awc/inuneko.html', 1
    FROM regions r WHERE r.code = 'hokkaido';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '札幌市動物愛護管理センター「あいまる さっぽろ」', 'https://www.city.sapporo.jp/inuneko/syuuyou_doubutsu/jotoneko.html', 1
    FROM regions r WHERE r.code = 'hokkaido';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '沖縄県動物愛護管理センター', 'https://www.aniwel-pref.okinawa/animals/transfer/cats', 1
    FROM regions r WHERE r.code = 'okinawa';
INSERT OR IGNORE INTO municipalities (region_id, name, website_url, is_active)
    SELECT r.id, '那覇市環境衛生課', 'https://www.city.naha.okinawa.jp/kurasitetuduki/animal/904.html', 1
    FROM regions r WHERE r.code = 'okinawa';
