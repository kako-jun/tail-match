import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
export { metadata } from './metadata';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ThemeRegistry>
          <a
            href="#main-content"
            style={{
              position: 'absolute',
              left: '-9999px',
              top: 'auto',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
            }}
          >
            メインコンテンツへスキップ
          </a>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main id="main-content" style={{ flexGrow: 1, backgroundColor: '#FAFAFA' }}>
              {children}
            </main>
            <Footer />
          </div>
        </ThemeRegistry>
      </body>
    </html>
  );
}
