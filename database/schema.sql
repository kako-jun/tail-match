-- ========================================
-- Tail Match PostgreSQL スキーマ定義
-- ========================================
--
-- 作成日: 2025-11-11
-- 更新日: 2026-03-18
-- 説明: 全国自治体の保護猫情報管理システム
-- DB: PostgreSQL (runtime uses pg library)
--
-- 参考設計: CLAUDE.md スクレイピングアーキテクチャ仕様
-- ========================================

-- 地域テーブル (regions)
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,               -- 地域名 (例: '石川県', '東京都')
    code TEXT NOT NULL UNIQUE,               -- 地域コード (例: 'ishikawa', 'tokyo')
    type TEXT DEFAULT 'prefecture',          -- 地域タイプ ('prefecture', 'city', 'other')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自治体テーブル (municipalities)
CREATE TABLE IF NOT EXISTS municipalities (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    name TEXT NOT NULL,                      -- 自治体名 (例: 'いしかわ動物愛護センター')
    municipality_type TEXT,                  -- 自治体区分
    website_url TEXT,                        -- 公式サイトURL
    contact_info JSONB,                      -- 連絡先情報 (JSON形式)
    scraping_config JSONB,                   -- スクレイピング設定 (JSON形式)
    is_active BOOLEAN DEFAULT TRUE,          -- アクティブフラグ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 重複防止: 同じ地域内で自治体名が一意
    UNIQUE(region_id, name)
);

-- 保護動物テーブル (tails)
CREATE TABLE IF NOT EXISTS tails (
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER REFERENCES municipalities(id),
    external_id TEXT,                        -- 自治体での管理ID
    animal_type TEXT DEFAULT 'cat',          -- 動物種別 ('cat', 'dog', 'other')
    name TEXT,                               -- 名前
    breed TEXT,                              -- 品種
    age_estimate TEXT,                        -- 推定年齢
    gender TEXT,                             -- 性別 ('male', 'female', 'unknown')
    color TEXT,                              -- 毛色
    size TEXT,                               -- サイズ ('small', 'medium', 'large')
    health_status TEXT,                      -- 健康状態
    personality TEXT,                        -- 性格
    special_needs TEXT,                      -- 特別な配慮事項
    images JSONB,                            -- 画像URL (JSON配列)
    protection_date DATE,                    -- 保護日
    deadline_date DATE,                      -- 期限日
    status TEXT DEFAULT 'available',         -- ステータス ('available', 'adopted', 'removed')
    transfer_decided BOOLEAN DEFAULT FALSE,  -- 譲渡決定フラグ
    listing_type TEXT DEFAULT 'adoption',    -- 掲載タイプ ('adoption': 譲渡猫, 'lost_pet': 迷子猫)
    source_url TEXT,                         -- 元ページURL
    last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 重複防止: 自治体内で外部IDが一意
    UNIQUE(municipality_id, external_id)
);

-- スクレイピング履歴テーブル (scraping_logs)
CREATE TABLE IF NOT EXISTS scraping_logs (
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER REFERENCES municipalities(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,                -- 完了日時
    status TEXT,                             -- ステータス ('success', 'error', 'warning')
    tails_found INTEGER DEFAULT 0,           -- 発見した動物数
    tails_added INTEGER DEFAULT 0,           -- 新規追加数
    tails_updated INTEGER DEFAULT 0,         -- 更新数
    tails_removed INTEGER DEFAULT 0,         -- 削除数
    error_message TEXT,                      -- エラーメッセージ
    html_filepath TEXT,                      -- 保存されたHTMLファイルパス
    execution_time_ms INTEGER,               -- 実行時間（ミリ秒）
    html_size INTEGER,                       -- HTMLファイルサイズ
    detection_result JSONB                   -- JavaScript検出結果 (JSON形式)
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

-- 地域の初期データ
INSERT INTO regions (name, code, type) VALUES
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
    ('愛知県', 'aichi', 'prefecture')
ON CONFLICT (code) DO NOTHING;

-- 自治体の初期データ
INSERT INTO municipalities (region_id, name, website_url, is_active)
SELECT r.id, m.name, m.url, TRUE
FROM regions r,
(VALUES
    ('ishikawa', 'いしかわ動物愛護センター', 'https://aigo-ishikawa.jp/petadoption_list/'),
    ('ishikawa', '金沢市動物愛護管理センター', 'https://www4.city.kanazawa.lg.jp/11050/dobutsu/jyotozenshin.html'),
    ('toyama', '富山県動物愛護センター', 'https://www.pref.toyama.jp/1636/kurashi/datsusyobun/jouto.html'),
    ('fukui', '福井県動物愛護管理センター', 'https://fukuiloveanimals.com/jyoto.php'),
    ('kyoto', '京都府動物愛護センター', 'http://kyoto-ani-love.com/publics/index/37/'),
    ('osaka', '大阪府動物愛護管理センター', 'https://www.pref.osaka.lg.jp/doaigc/zyotoneko/'),
    ('osaka', '大阪市動物管理センター', 'https://www.city.osaka.lg.jp/kenko/page/0000370055.html'),
    ('osaka', '堺市動物指導センター', 'https://www.city.sakai.lg.jp/kurashi/gomi/dobutsu/suishin/jyoutokai_neko.html'),
    ('hyogo', '兵庫県動物愛護センター', 'https://web.pref.hyogo.lg.jp/kf10/hw11_000000110.html'),
    ('tokyo', '東京都動物愛護相談センター', 'https://www.fukushihoken.metro.tokyo.lg.jp/douso/jouto/neko.html'),
    ('kanagawa', '神奈川県動物愛護センター', 'https://www.pref.kanagawa.jp/docs/v7d/cnt/f80192/'),
    ('kanagawa', '横浜市動物愛護センター', 'https://www.city.yokohama.lg.jp/kurashi/sumai-kurashi/pet-dobutsu/aigo/'),
    ('kanagawa', '川崎市動物愛護センター', 'https://www.city.kawasaki.jp/350/page/0000046858.html'),
    ('kanagawa', '相模原市動物愛護センター', 'http://sagamihara-doubutsuaigo-center.jp/'),
    ('saitama', '埼玉県動物指導センター', 'https://www.pref.saitama.lg.jp/b0716/joutoinuneko.html'),
    ('saitama', 'さいたま市動物愛護ふれあいセンター', 'https://www.city.saitama.jp/001/011/015/003/006/p094736.html'),
    ('chiba', '千葉県動物愛護センター', 'https://www.pref.chiba.lg.jp/aigo/jyoutozentaikai/neko/index.html'),
    ('chiba', '千葉市動物保護指導センター', 'https://www.city.chiba.jp/hokenfukushi/kenkou/seikatsueisei/catadoption.html'),
    ('hokkaido', '北海道立動物愛護センター「あいにきた」', 'https://www.pref.hokkaido.lg.jp/ks/awc/inuneko.html'),
    ('hokkaido', '札幌市動物愛護管理センター「あいまる さっぽろ」', 'https://www.city.sapporo.jp/inuneko/syuuyou_doubutsu/jotoneko.html'),
    ('okinawa', '沖縄県動物愛護管理センター', 'https://www.aniwel-pref.okinawa/animals/transfer/cats'),
    ('okinawa', '那覇市環境衛生課', 'https://www.city.naha.okinawa.jp/kurasitetuduki/animal/904.html')
) AS m(region_code, name, url)
WHERE r.code = m.region_code
ON CONFLICT (region_id, name) DO NOTHING;

-- ========================================
-- ビュー作成（便利なクエリ用）
-- ========================================

-- 自治体別の最新スクレイピング状況
CREATE OR REPLACE VIEW latest_scraping_status AS
SELECT
    m.name as municipality_name,
    r.name as region_name,
    sl.started_at as last_scrape_time,
    sl.status as last_scrape_status,
    sl.tails_found as last_tails_found,
    COUNT(t.id) as total_active_tails
FROM municipalities m
LEFT JOIN regions r ON m.region_id = r.id
LEFT JOIN scraping_logs sl ON m.id = sl.municipality_id
LEFT JOIN tails t ON m.id = t.municipality_id AND t.status = 'available'
WHERE sl.id = (
    SELECT MAX(id) FROM scraping_logs
    WHERE municipality_id = m.id
)
GROUP BY m.id, m.name, r.name, sl.started_at, sl.status, sl.tails_found;

-- 動物種別・性別の統計
CREATE OR REPLACE VIEW tail_statistics AS
SELECT
    r.name as region_name,
    m.name as municipality_name,
    t.animal_type,
    t.gender,
    COUNT(*) as count,
    MIN(t.protection_date) as earliest_protection,
    MAX(t.last_scraped_at) as last_updated
FROM tails t
JOIN municipalities m ON t.municipality_id = m.id
JOIN regions r ON m.region_id = r.id
WHERE t.status = 'available'
GROUP BY r.name, m.name, t.animal_type, t.gender;

-- ========================================
-- 完了
-- ========================================

-- 初期化完了の確認
SELECT
    'regions' as table_name, COUNT(*) as record_count FROM regions
UNION ALL
SELECT
    'municipalities', COUNT(*) FROM municipalities
UNION ALL
SELECT
    'tails', COUNT(*) FROM tails
UNION ALL
SELECT
    'scraping_logs', COUNT(*) FROM scraping_logs;
