-- Tail Match データベース初期化スクリプト
-- 実行順序: 01-create-tables.sql

-- 地域区分テーブル（都道府県・市町村などの上位区分）
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    code CHAR(2) NOT NULL UNIQUE,
    type VARCHAR(20) DEFAULT 'prefecture',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 自治体テーブル（実際のスクレイピング対象）
CREATE TABLE IF NOT EXISTS municipalities (
    id SERIAL PRIMARY KEY,
    region_id INTEGER REFERENCES regions(id),
    name VARCHAR(100) NOT NULL,
    municipality_type VARCHAR(20), -- city, town, village, special_ward
    website_url VARCHAR(500),
    contact_info JSONB, -- 連絡先情報（電話番号、住所など）
    scraping_config JSONB, -- スクレイピング設定（セレクタ、頻度など）
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 動物情報テーブル（メインデータ）
CREATE TABLE IF NOT EXISTS tails (
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER REFERENCES municipalities(id),
    external_id VARCHAR(100), -- 自治体サイト内でのID
    animal_type VARCHAR(20) DEFAULT 'cat', -- cat, dog, rabbit, etc.
    name VARCHAR(100),
    breed VARCHAR(100), -- 猫種、犬種
    age_estimate VARCHAR(50), -- 推定年齢（子猫、成猫、シニア猫など）
    gender VARCHAR(10), -- male, female, unknown
    color VARCHAR(100), -- 毛色の説明
    size VARCHAR(20), -- small, medium, large
    health_status TEXT, -- 健康状態の説明
    personality TEXT, -- 性格の説明
    special_needs TEXT, -- 特別なケアが必要な場合
    images JSONB, -- 画像URLの配列
    protection_date DATE, -- 保護された日
    deadline_date DATE, -- 期限日（重要！）
    status VARCHAR(20) DEFAULT 'available', -- available, adopted, removed
    transfer_decided BOOLEAN DEFAULT false, -- 譲渡が決まったかどうか
    source_url VARCHAR(500), -- 元の掲載ページURL
    last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(municipality_id, external_id)
);

-- スクレイピング履歴テーブル
CREATE TABLE IF NOT EXISTS scraping_logs (
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER REFERENCES municipalities(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20), -- success, error, timeout
    tails_found INTEGER DEFAULT 0,
    tails_added INTEGER DEFAULT 0,
    tails_updated INTEGER DEFAULT 0,
    tails_removed INTEGER DEFAULT 0,
    error_message TEXT,
    execution_time_ms INTEGER
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_tails_deadline ON tails(deadline_date) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_tails_municipality ON tails(municipality_id);
CREATE INDEX IF NOT EXISTS idx_tails_animal_type ON tails(animal_type);
CREATE INDEX IF NOT EXISTS idx_tails_status ON tails(status);
CREATE INDEX IF NOT EXISTS idx_municipalities_region ON municipalities(region_id);
CREATE INDEX IF NOT EXISTS idx_municipalities_active ON municipalities(is_active);

-- トリガー関数（updated_at自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
CREATE TRIGGER update_municipalities_updated_at 
    BEFORE UPDATE ON municipalities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tails_updated_at 
    BEFORE UPDATE ON tails 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();