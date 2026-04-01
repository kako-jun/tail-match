import './globals.css';
import ThemeRegistry from '@/components/ThemeRegistry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Box } from '@mui/material';

export { metadata } from './metadata';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ThemeRegistry>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <Box component="main" sx={{ flexGrow: 1, backgroundColor: '#FAFAFA' }}>
              {children}
            </Box>
            <Footer />
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
