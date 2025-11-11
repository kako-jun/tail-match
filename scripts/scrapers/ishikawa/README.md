# 石川県動物愛護センター スクレイパー

**対象サイト**: https://aigo-ishikawa.jp/petadoption_list/

## 実行方法

### 1. HTML収集

```bash
node scripts/scrapers/ishikawa/scrape.js
```

出力: `data/html/ishikawa/archive/{timestamp}_tail.html`

### 2. YAML抽出

```bash
node scripts/scrapers/ishikawa/html-to-yaml.js
```

出力: `data/yaml/ishikawa/{timestamp}_tail.yaml`

### 3. DB投入

```bash
# DRY-RUNで確認
node scripts/yaml-to-db.js --dry-run

# 実際に投入
node scripts/yaml-to-db.js
```

## 実績データ（2025-11-11）

- **抽出成功率**: 100% (18/18匹)
- **confidence_score**: 0.8
- **confidence_level**: MEDIUM
- **実名抽出**: 100% ("紅蘭（クラン）", "AURA(オーラ）" など)
- **犬種精度**: 高 ("トイプードル" など)

## 特記事項

- **JS実行待機時間**: 5秒（`waitTime: 5000`）
- **raw_text優先抽出**: セレクタよりも正規表現の方が精度が高い
- **クロスチェック**: 年齢表記36個 vs 抽出18匹（要確認フラグ、許容範囲）
