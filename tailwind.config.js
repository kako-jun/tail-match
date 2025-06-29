/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 三毛猫カラーパレット
        'calico': {
          'brown': '#D2691E',    // 茶トラ色 - メインカラー
          'white': '#FFF8DC',    // 三毛の白 - サブカラー
          'black': '#2F2F2F',    // 三毛の黒 - アクセント
          'cream': '#F5DEB3',    // 三毛のクリーム - ハイライト
          'pink': '#FFB6C1',     // 肉球ピンク - 特別色
        },
        'denim': '#4682B4',      // デニムブルー
        'emergency': '#DC143C',  // 緊急レッド
        
        // 緊急度別カラー
        'urgent': {
          'red': '#DC143C',      // 残り1-3日
          'orange': '#FF8C00',   // 残り4-7日  
          'yellow': '#FFD700',   // 残り8-14日
        }
      },
      fontFamily: {
        sans: ['Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', 'sans-serif'],
      },
      animation: {
        'pulse-urgent': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}