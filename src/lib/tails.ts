import { query } from './database';
import { TailWithDetails, TailSearchParams, SearchResult } from '@/types/database';

/**
 * 保護動物を検索して取得
 */
export async function getTails(params: TailSearchParams): Promise<SearchResult<TailWithDetails>> {
  // WHERE句とパラメータを構築
  const conditions: string[] = [];
  const values: any[] = [];

  // 動物種別フィルター
  if (params.animal_type) {
    conditions.push(`t.animal_type = ?`);
    values.push(params.animal_type);
  }

  // ステータスフィルター
  if (params.status) {
    conditions.push(`t.status = ?`);
    values.push(params.status);
  }

  // 地域フィルター
  if (params.region_id) {
    conditions.push(`r.id = ?`);
    values.push(params.region_id);
  }

  // 自治体フィルター
  if (params.municipality_id) {
    conditions.push(`m.id = ?`);
    values.push(params.municipality_id);
  }

  // 性別フィルター
  if (params.gender) {
    conditions.push(`t.gender = ?`);
    values.push(params.gender);
  }

  // 年齢フィルター
  if (params.age_estimate) {
    conditions.push(`t.age_estimate = ?`);
    values.push(params.age_estimate);
  }

  // 緊急度フィルター（期限日ベース）
  if (params.urgency_days !== undefined) {
    conditions.push(`t.deadline_date <= date('now', '+' || ? || ' days')`);
    values.push(params.urgency_days);
  }

  // キーワード検索 - 名前、品種、性格、毛色を検索
  if (params.keyword) {
    const keyword = `%${params.keyword}%`;
    conditions.push(`(
      t.name LIKE ? OR
      t.breed LIKE ? OR
      t.personality LIKE ? OR
      t.color LIKE ?
    )`);
    values.push(keyword, keyword, keyword, keyword);
  }

  // 性格フィルター - 複数の性格特徴をOR検索
  if (params.personality_traits && params.personality_traits.length > 0) {
    const personalityConditions = params.personality_traits.map(() => {
      return `t.personality LIKE ?`;
    });
    conditions.push(`(${personalityConditions.join(' OR ')})`);
    params.personality_traits.forEach((trait) => {
      values.push(`%${trait}%`);
    });
  }

  // WHERE句を構築
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ソート順を構築（allowlistで注入を防ぐ）
  const allowedSortColumns = ['deadline_date', 'created_at', 'updated_at'] as const;
  const allowedSortOrders = ['asc', 'desc'] as const;
  const sortBy = allowedSortColumns.includes(params.sort_by as any)
    ? params.sort_by!
    : 'deadline_date';
  const sortOrder = allowedSortOrders.includes(params.sort_order as any)
    ? params.sort_order!
    : 'asc';
  const orderClause = `ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}`;

  // ページネーション
  const limit = params.limit || 20;
  const offset = params.offset || 0;

  // 総件数を取得
  const countQuery = `
    SELECT COUNT(*) as total
    FROM tails t
    LEFT JOIN municipalities m ON t.municipality_id = m.id
    LEFT JOIN regions r ON m.region_id = r.id
    ${whereClause}
  `;

  const countResult = await query(countQuery, values);
  const total = parseInt(countResult.rows[0].total);

  // データを取得
  const dataQuery = `
    SELECT
      t.*,
      m.id as municipality_id,
      m.name as municipality_name,
      m.website_url as municipality_website_url,
      m.contact_info as municipality_contact_info,
      r.id as region_id,
      r.name as region_name,
      r.code as region_code,
      CASE
        WHEN t.deadline_date IS NULL THEN NULL
        ELSE MAX(0, CAST(julianday(t.deadline_date) - julianday('now') AS INTEGER))
      END as days_remaining,
      CASE
        WHEN t.deadline_date IS NULL THEN 'normal'
        WHEN t.deadline_date <= date('now', '+3 days') THEN 'urgent'
        WHEN t.deadline_date <= date('now', '+7 days') THEN 'warning'
        WHEN t.deadline_date <= date('now', '+14 days') THEN 'caution'
        ELSE 'normal'
      END as urgency_level
    FROM tails t
    LEFT JOIN municipalities m ON t.municipality_id = m.id
    LEFT JOIN regions r ON m.region_id = r.id
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const dataValues = [...values, limit, offset];
  const dataResult = await query(dataQuery, dataValues);

  // 結果を整形
  const data: TailWithDetails[] = dataResult.rows.map((row: any) => ({
    id: row.id,
    municipality_id: row.municipality_id,
    external_id: row.external_id,
    animal_type: row.animal_type,
    name: row.name,
    breed: row.breed,
    age_estimate: row.age_estimate,
    gender: row.gender,
    color: row.color,
    size: row.size,
    health_status: row.health_status,
    personality: row.personality,
    special_needs: row.special_needs,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [],
    protection_date: row.protection_date,
    deadline_date: row.deadline_date,
    status: row.status,
    transfer_decided: row.transfer_decided,
    source_url: row.source_url,
    last_scraped_at: row.last_scraped_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    municipality: {
      id: row.municipality_id,
      region_id: row.region_id,
      name: row.municipality_name,
      website_url: row.municipality_website_url,
      contact_info:
        typeof row.municipality_contact_info === 'string'
          ? JSON.parse(row.municipality_contact_info)
          : row.municipality_contact_info,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    region: {
      id: row.region_id,
      name: row.region_name,
      code: row.region_code,
      type: 'prefecture',
      created_at: new Date(),
    },
    days_remaining: row.days_remaining,
    urgency_level: row.urgency_level,
  }));

  return {
    data,
    total,
    limit,
    offset,
    has_more: offset + limit < total,
  };
}

/**
 * IDで保護動物を1件取得
 */
export async function getTailById(id: number): Promise<TailWithDetails | null> {
  const result = await query(
    `
    SELECT
      t.*,
      m.id as municipality_id,
      m.name as municipality_name,
      m.website_url as municipality_website_url,
      m.contact_info as municipality_contact_info,
      r.id as region_id,
      r.name as region_name,
      r.code as region_code,
      CASE
        WHEN t.deadline_date IS NULL THEN NULL
        ELSE MAX(0, CAST(julianday(t.deadline_date) - julianday('now') AS INTEGER))
      END as days_remaining,
      CASE
        WHEN t.deadline_date IS NULL THEN 'normal'
        WHEN t.deadline_date <= date('now', '+3 days') THEN 'urgent'
        WHEN t.deadline_date <= date('now', '+7 days') THEN 'warning'
        WHEN t.deadline_date <= date('now', '+14 days') THEN 'caution'
        ELSE 'normal'
      END as urgency_level
    FROM tails t
    LEFT JOIN municipalities m ON t.municipality_id = m.id
    LEFT JOIN regions r ON m.region_id = r.id
    WHERE t.id = ?
    `,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    municipality_id: row.municipality_id,
    external_id: row.external_id,
    animal_type: row.animal_type,
    name: row.name,
    breed: row.breed,
    age_estimate: row.age_estimate,
    gender: row.gender,
    color: row.color,
    size: row.size,
    health_status: row.health_status,
    personality: row.personality,
    special_needs: row.special_needs,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [],
    protection_date: row.protection_date,
    deadline_date: row.deadline_date,
    status: row.status,
    transfer_decided: row.transfer_decided,
    source_url: row.source_url,
    last_scraped_at: row.last_scraped_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    municipality: {
      id: row.municipality_id,
      region_id: row.region_id,
      name: row.municipality_name,
      website_url: row.municipality_website_url,
      contact_info:
        typeof row.municipality_contact_info === 'string'
          ? JSON.parse(row.municipality_contact_info)
          : row.municipality_contact_info,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    region: {
      id: row.region_id,
      name: row.region_name,
      code: row.region_code,
      type: 'prefecture',
      created_at: new Date(),
    },
    days_remaining: row.days_remaining,
    urgency_level: row.urgency_level,
  };
}

/**
 * 期限が近い保護動物を取得（緊急度順）
 */
export async function getUrgentTails(limit: number = 10): Promise<TailWithDetails[]> {
  const result = await query(
    `
    SELECT
      t.*,
      m.id as municipality_id,
      m.name as municipality_name,
      m.website_url as municipality_website_url,
      m.contact_info as municipality_contact_info,
      r.id as region_id,
      r.name as region_name,
      r.code as region_code,
      MAX(0, CAST(julianday(t.deadline_date) - julianday('now') AS INTEGER)) as days_remaining,
      CASE
        WHEN t.deadline_date <= date('now', '+3 days') THEN 'urgent'
        WHEN t.deadline_date <= date('now', '+7 days') THEN 'warning'
        WHEN t.deadline_date <= date('now', '+14 days') THEN 'caution'
        ELSE 'normal'
      END as urgency_level
    FROM tails t
    LEFT JOIN municipalities m ON t.municipality_id = m.id
    LEFT JOIN regions r ON m.region_id = r.id
    WHERE t.status = 'available'
      AND t.deadline_date IS NOT NULL
      AND t.deadline_date >= date('now')
    ORDER BY t.deadline_date ASC
    LIMIT ?
    `,
    [limit]
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    municipality_id: row.municipality_id,
    external_id: row.external_id,
    animal_type: row.animal_type,
    name: row.name,
    breed: row.breed,
    age_estimate: row.age_estimate,
    gender: row.gender,
    color: row.color,
    size: row.size,
    health_status: row.health_status,
    personality: row.personality,
    special_needs: row.special_needs,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images || [],
    protection_date: row.protection_date,
    deadline_date: row.deadline_date,
    status: row.status,
    transfer_decided: row.transfer_decided,
    source_url: row.source_url,
    last_scraped_at: row.last_scraped_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    municipality: {
      id: row.municipality_id,
      region_id: row.region_id,
      name: row.municipality_name,
      website_url: row.municipality_website_url,
      contact_info:
        typeof row.municipality_contact_info === 'string'
          ? JSON.parse(row.municipality_contact_info)
          : row.municipality_contact_info,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    region: {
      id: row.region_id,
      name: row.region_name,
      code: row.region_code,
      type: 'prefecture',
      created_at: new Date(),
    },
    days_remaining: row.days_remaining,
    urgency_level: row.urgency_level,
  }));
}

/**
 * 保護動物の統計情報を取得
 */
export async function getTailsStats() {
  const statsQuery = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN animal_type = 'cat' THEN 1 ELSE 0 END) as cats,
      SUM(CASE WHEN animal_type = 'dog' THEN 1 ELSE 0 END) as dogs,
      SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN status = 'adopted' THEN 1 ELSE 0 END) as adopted,
      SUM(CASE WHEN transfer_decided = 1 THEN 1 ELSE 0 END) as transfer_decided,
      SUM(CASE WHEN deadline_date IS NOT NULL
        AND deadline_date <= date('now', '+3 days')
        AND status = 'available' THEN 1 ELSE 0 END) as urgent,
      SUM(CASE WHEN deadline_date IS NOT NULL
        AND deadline_date <= date('now', '+7 days')
        AND status = 'available' THEN 1 ELSE 0 END) as warning
    FROM tails
  `;

  const result = await query(statsQuery);
  const stats = result.rows[0];

  return {
    total: parseInt(stats.total) || 0,
    cats: parseInt(stats.cats) || 0,
    dogs: parseInt(stats.dogs) || 0,
    available: parseInt(stats.available) || 0,
    adopted: parseInt(stats.adopted) || 0,
    transfer_decided: parseInt(stats.transfer_decided) || 0,
    urgent: parseInt(stats.urgent) || 0,
    warning: parseInt(stats.warning) || 0,
  };
}
