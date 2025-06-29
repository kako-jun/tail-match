import TailGrid from '@/components/TailGrid'
import { Search } from 'lucide-react'

export default function TailsPage() {
  return (
    <div className="container py-8">
      {/* ページヘッダー */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-calico-brown mb-4">
          🐾 尻尾ちゃん一覧
        </h1>
        <p className="text-lg text-calico-black">
          家族を待っている尻尾ちゃんたちです
        </p>
      </div>

      {/* 検索・フィルタセクション（Phase 3で実装予定） */}
      <section className="mb-8">
        <div className="card">
          <div className="flex items-center mb-4">
            <Search className="mr-2 text-denim" size={24} />
            <h2 className="text-xl font-bold text-calico-brown">検索・フィルタ</h2>
          </div>
          <div className="text-center py-8 bg-calico-cream rounded-lg">
            <p className="text-calico-black">
              🚧 検索・フィルタ機能は Phase 3 で実装予定です
            </p>
            <p className="text-sm text-calico-black mt-2">
              現在は全ての尻尾ちゃんを期限日順で表示しています
            </p>
          </div>
        </div>
      </section>

      {/* 尻尾ちゃん一覧 */}
      <section>
        <TailGrid 
          searchParams={{
            sort_by: 'deadline_date',
            sort_order: 'asc',
            limit: 20
          }}
        />
      </section>
    </div>
  )
}