import { createTheme } from '@mui/material/styles'

// 三毛猫カラーパレット
const mikeNekoColors = {
  brown: '#8B4513',      // 茶色 (メイン)
  darkBrown: '#654321',  // 濃い茶色
  black: '#2F2F2F',      // 黒
  cream: '#FFF8DC',      // クリーム色
  white: '#FFFFFF',      // 白
  orange: '#FF8C00',     // オレンジ (アクセント)
  lightOrange: '#FFB347', // 薄いオレンジ
  urgent: '#FF6B6B',     // 緊急色 (柔らかい赤)
  warning: '#FFB347',    // 警告色 (オレンジ)
  success: '#51CF66',    // 成功色 (緑)
}

const theme = createTheme({
  palette: {
    primary: {
      main: mikeNekoColors.brown,
      dark: mikeNekoColors.darkBrown,
      light: '#A0522D',
    },
    secondary: {
      main: mikeNekoColors.orange,
      dark: '#FF7F00',
      light: mikeNekoColors.lightOrange,
    },
    background: {
      default: mikeNekoColors.cream,
      paper: mikeNekoColors.white,
    },
    text: {
      primary: mikeNekoColors.black,
      secondary: '#5D4037',
    },
    error: {
      main: mikeNekoColors.urgent,
    },
    warning: {
      main: mikeNekoColors.warning,
    },
    success: {
      main: mikeNekoColors.success,
    },
  },
  typography: {
    fontFamily: [
      'Hiragino Kaku Gothic ProN',
      'Hiragino Sans',
      'Yu Gothic Medium',
      'Meiryo',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          borderRadius: 16,
          transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 24px',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
})

export default theme