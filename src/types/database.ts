// データベースのテーブル型定義

export interface Region {
  id: number
  name: string
  code: string
  type: string
  created_at: Date
}

export interface Municipality {
  id: number
  region_id: number
  name: string
  municipality_type?: string
  website_url?: string
  contact_info?: ContactInfo
  scraping_config?: ScrapingConfig
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Tail {
  id: number
  municipality_id: number
  external_id?: string
  animal_type: 'cat' | 'dog' | 'rabbit' | 'other'
  name?: string
  breed?: string
  age_estimate?: string
  gender?: 'male' | 'female' | 'unknown'
  color?: string
  size?: 'small' | 'medium' | 'large'
  health_status?: string
  personality?: string
  special_needs?: string
  images?: string[]
  protection_date?: Date
  deadline_date?: Date
  status: 'available' | 'adopted' | 'removed'
  transfer_decided: boolean
  source_url?: string
  last_scraped_at: Date
  created_at: Date
  updated_at: Date
}

export interface ScrapingLog {
  id: number
  municipality_id: number
  started_at: Date
  completed_at?: Date
  status: 'success' | 'error' | 'timeout'
  tails_found: number
  tails_added: number
  tails_updated: number
  tails_removed: number
  error_message?: string
  execution_time_ms?: number
}

// 補助型
export interface ContactInfo {
  phone?: string
  address?: string
  email?: string
  hours?: string
}

export interface ScrapingConfig {
  url: string
  selectors?: {
    container?: string
    name?: string
    image?: string
    details?: string
  }
  frequency_hours?: number
  last_scraped?: string
}

// API レスポンス型
export interface TailWithDetails extends Tail {
  municipality: Municipality
  region: Region
  days_remaining?: number
  urgency_level?: 'urgent' | 'warning' | 'caution' | 'normal'
}

// 検索・フィルタ型
export interface TailSearchParams {
  region_id?: number
  municipality_id?: number
  animal_type?: string
  gender?: string
  age_estimate?: string
  urgency_days?: number
  status?: string
  limit?: number
  offset?: number
  sort_by?: 'deadline_date' | 'created_at' | 'updated_at'
  sort_order?: 'asc' | 'desc'
  keyword?: string
  personality_traits?: string[]
}

export interface SearchResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}