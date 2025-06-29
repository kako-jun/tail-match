-- Tail Match データベース初期データ投入
-- 実行順序: 02-seed-data.sql

-- 地域データ（都道府県）を投入
INSERT INTO regions (name, code, type) VALUES
('北海道', '01', 'prefecture'),
('青森県', '02', 'prefecture'),
('岩手県', '03', 'prefecture'),
('宮城県', '04', 'prefecture'),
('秋田県', '05', 'prefecture'),
('山形県', '06', 'prefecture'),
('福島県', '07', 'prefecture'),
('茨城県', '08', 'prefecture'),
('栃木県', '09', 'prefecture'),
('群馬県', '10', 'prefecture'),
('埼玉県', '11', 'prefecture'),
('千葉県', '12', 'prefecture'),
('東京都', '13', 'prefecture'),
('神奈川県', '14', 'prefecture'),
('新潟県', '15', 'prefecture'),
('富山県', '16', 'prefecture'),
('石川県', '17', 'prefecture'),
('福井県', '18', 'prefecture'),
('山梨県', '19', 'prefecture'),
('長野県', '20', 'prefecture'),
('岐阜県', '21', 'prefecture'),
('静岡県', '22', 'prefecture'),
('愛知県', '23', 'prefecture'),
('三重県', '24', 'prefecture'),
('滋賀県', '25', 'prefecture'),
('京都府', '26', 'prefecture'),
('大阪府', '27', 'prefecture'),
('兵庫県', '28', 'prefecture'),
('奈良県', '29', 'prefecture'),
('和歌山県', '30', 'prefecture'),
('鳥取県', '31', 'prefecture'),
('島根県', '32', 'prefecture'),
('岡山県', '33', 'prefecture'),
('広島県', '34', 'prefecture'),
('山口県', '35', 'prefecture'),
('徳島県', '36', 'prefecture'),
('香川県', '37', 'prefecture'),
('愛媛県', '38', 'prefecture'),
('高知県', '39', 'prefecture'),
('福岡県', '40', 'prefecture'),
('佐賀県', '41', 'prefecture'),
('長崎県', '42', 'prefecture'),
('熊本県', '43', 'prefecture'),
('大分県', '44', 'prefecture'),
('宮崎県', '45', 'prefecture'),
('鹿児島県', '46', 'prefecture'),
('沖縄県', '47', 'prefecture')
ON CONFLICT (code) DO NOTHING;

-- サンプル自治体データ（開発・テスト用）
INSERT INTO municipalities (region_id, name, municipality_type, website_url, contact_info, is_active) VALUES
(
    (SELECT id FROM regions WHERE code = '13'), 
    '東京都動物愛護相談センター', 
    'special_organization',
    'https://www.fukushihoken.metro.tokyo.lg.jp/douso/',
    '{"phone": "03-3302-3507", "address": "東京都世田谷区八幡山2-9-11"}',
    true
),
(
    (SELECT id FROM regions WHERE code = '14'), 
    '神奈川県動物保護センター', 
    'special_organization',
    'https://www.pref.kanagawa.jp/docs/v7d/cnt/f80192/',
    '{"phone": "0463-58-3411", "address": "神奈川県平塚市土屋2586"}',
    true
),
(
    (SELECT id FROM regions WHERE code = '27'), 
    '大阪市動物管理センター', 
    'special_organization',
    'https://www.city.osaka.lg.jp/kenkofukushi/page/0000093135.html',
    '{"phone": "06-6685-3700", "address": "大阪市住之江区柴谷2-5-74"}',
    true
)
ON CONFLICT DO NOTHING;

-- サンプル猫データ（開発・テスト用）
INSERT INTO tails (
    municipality_id, 
    external_id, 
    animal_type, 
    name, 
    breed, 
    age_estimate, 
    gender, 
    color, 
    health_status, 
    personality, 
    images, 
    protection_date, 
    deadline_date, 
    status, 
    source_url
) VALUES
(
    1, 
    'test_001', 
    'cat', 
    'みけちゃん', 
    'ミックス（三毛猫）', 
    '成猫（2-3歳推定）', 
    'female', 
    '三毛（茶・黒・白）', 
    '健康状態良好、避妊手術済み', 
    '人懐っこく、膝の上が大好き', 
    '["https://example.com/cat1.jpg"]', 
    '2024-06-20', 
    '2024-07-05', 
    'available', 
    'https://example.com/cat/test_001'
),
(
    1, 
    'test_002', 
    'cat', 
    'くろすけ', 
    'ミックス（黒猫）', 
    '子猫（生後3ヶ月）', 
    'male', 
    '黒', 
    '健康状態良好、ワクチン接種済み', 
    '元気いっぱい、遊ぶのが大好き', 
    '["https://example.com/cat2.jpg"]', 
    '2024-06-25', 
    '2024-07-01', 
    'available', 
    'https://example.com/cat/test_002'
),
(
    2, 
    'kanagawa_001', 
    'cat', 
    'しろちゃん', 
    'ミックス（白猫）', 
    'シニア猫（8歳推定）', 
    'female', 
    '白', 
    '軽度の腎臓病あり、投薬治療中', 
    '大人しく、静かな環境を好む', 
    '["https://example.com/cat3.jpg"]', 
    '2024-06-15', 
    '2024-06-30', 
    'available', 
    'https://example.com/cat/kanagawa_001'
)
ON CONFLICT (municipality_id, external_id) DO NOTHING;