export const theme = {
  colors: {
    // Backgrounds
    background: '#0c1015',
    backgroundGradientStart: '#0c1015',
    backgroundGradientMid: '#0e1218',
    backgroundGradientEnd: '#0d1116',

    // UI Elements
    cardBackground: 'rgba(255,255,255,0.035)',
    cardBorder: 'rgba(255,255,255,0.05)',

    // Text
    textPrimary: '#eef0f3',
    textSecondary: '#8a929e',
    textTertiary: '#6b727c',

    // Accents
    primary: '#5DCAA5',
    primaryGlow: 'rgba(93,202,165,0.1)',
    primaryBorder: 'rgba(93,202,165,0.2)',

    // Status - Firmer, more solid colors from UI concepts
    statusOpen: {
      bg: '#1D9E75',
      text: '#eef0f3',
      glow: '#1D9E75',
    },
    statusLimited: {
      bg: '#5DCAA5',
      text: '#0c1015',
      glow: '#5DCAA5',
    },
    statusScarce: {
      bg: '#EF9F27',
      text: '#0c1015',
      glow: '#EF9F27',
    },
    statusFull: {
      bg: '#D85A30',
      text: '#eef0f3',
      glow: '#D85A30',
    },
    statusClosed: {
      bg: 'rgba(255,255,255,0.07)',
      text: '#6b727c',
      glow: 'transparent',
    },
  },
  spacing: {
    s: 4,
    m: 8,
    l: 16,
    xl: 24,
  },
  typography: {
    fontFamily: 'System', // Fallback to system font for now
  }
};
