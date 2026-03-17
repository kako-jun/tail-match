import { createTheme } from '@mui/material/styles'

// Instagram-inspired palette — light, airy, minimal
const igColors = {
  white: '#FFFFFF',
  offWhite: '#FAFAFA',       // Instagram background
  border: '#DBDBDB',         // Instagram border
  borderLight: '#EFEFEF',    // lighter dividers
  textPrimary: '#262626',    // Instagram near-black
  textSecondary: '#8E8E8E',  // Instagram muted gray
  coral: '#FF7A7A',          // soft coral for hearts/favorites
  coralLight: '#FFEDED',     // coral tint background
  coralDark: '#E85555',      // hover state
  urgentRed: '#ED4956',      // Instagram-like alert red
  warmGray: '#F5F5F5',       // subtle section backgrounds
}

const theme = createTheme({
  palette: {
    primary: {
      main: igColors.textPrimary,
      dark: '#000000',
      light: igColors.textSecondary,
    },
    secondary: {
      main: igColors.coral,
      dark: igColors.coralDark,
      light: igColors.coralLight,
    },
    background: {
      default: igColors.offWhite,
      paper: igColors.white,
    },
    text: {
      primary: igColors.textPrimary,
      secondary: igColors.textSecondary,
    },
    divider: igColors.border,
    error: {
      main: igColors.urgentRed,
    },
    warning: {
      main: '#FFBA33',
    },
    success: {
      main: '#4CAF50',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'Hiragino Kaku Gothic ProN',
      'Hiragino Sans',
      'Yu Gothic Medium',
      'Meiryo',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 300,
      fontSize: '2rem',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 300,
      fontSize: '1.75rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 400,
      fontSize: '1.375rem',
    },
    h4: {
      fontWeight: 400,
      fontSize: '1.125rem',
    },
    h5: {
      fontWeight: 400,
      fontSize: '1rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.875rem',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      color: igColors.textSecondary,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: igColors.offWhite,
          color: igColors.textPrimary,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: `1px solid ${igColors.border}`,
          borderRadius: 8,
          backgroundColor: igColors.white,
          transition: 'opacity 0.15s ease',
          '&:hover': {
            boxShadow: 'none',
            opacity: 0.9,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: `1px solid ${igColors.border}`,
        },
        elevation2: {
          boxShadow: 'none',
          border: `1px solid ${igColors.border}`,
        },
        elevation3: {
          boxShadow: 'none',
          border: `1px solid ${igColors.border}`,
        },
        elevation4: {
          boxShadow: 'none',
          border: `1px solid ${igColors.border}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          backgroundColor: igColors.textPrimary,
          color: igColors.white,
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#000000',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: igColors.border,
          color: igColors.textPrimary,
          '&:hover': {
            borderColor: igColors.textPrimary,
            backgroundColor: 'transparent',
          },
        },
        text: {
          color: igColors.textPrimary,
          '&:hover': {
            backgroundColor: igColors.warmGray,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: igColors.white,
            '& fieldset': {
              borderColor: igColors.border,
            },
            '&:hover fieldset': {
              borderColor: igColors.textSecondary,
            },
            '&.Mui-focused fieldset': {
              borderColor: igColors.textPrimary,
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: igColors.border,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: igColors.textSecondary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: igColors.textPrimary,
            borderWidth: 1,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontSize: '0.75rem',
          fontWeight: 500,
          height: 24,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: igColors.white,
          borderBottom: `1px solid ${igColors.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: igColors.border,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: igColors.warmGray,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: igColors.border,
          color: igColors.textSecondary,
          '&.Mui-selected': {
            backgroundColor: igColors.textPrimary,
            color: igColors.white,
            '&:hover': {
              backgroundColor: '#000000',
            },
          },
          '&:hover': {
            backgroundColor: igColors.warmGray,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid`,
        },
      },
    },
  },
})

export default theme
