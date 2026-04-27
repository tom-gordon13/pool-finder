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
      bg: '#1D9E75',  // 7-8 lanes - dark green
      text: '#eef0f3',
      glow: '#1D9E75',
    },
    statusModerate: {
      bg: '#5DCAA5',  // 5-6 lanes - light green
      text: '#0c1015',
      glow: '#5DCAA5',
    },
    statusLimited: {
      bg: '#EF9F27',  // 3-4 lanes - yellow
      text: '#0c1015',
      glow: '#EF9F27',
    },
    statusScarce: {
      bg: '#D85A30',  // 1-2 lanes - orange-red
      text: '#eef0f3',
      glow: '#D85A30',
    },
    statusFull: {
      bg: '#D85A30',  // For pool list - same as scarce
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
