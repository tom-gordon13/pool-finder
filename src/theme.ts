export const theme = {
  colors: {
    // Backgrounds
    background: '#060c16',
    backgroundGradientStart: '#060c16',
    backgroundGradientMid: '#0a1222',
    backgroundGradientEnd: '#080e1a',
    
    // UI Elements
    cardBackground: 'rgba(255,255,255,0.02)',
    cardBorder: 'rgba(255,255,255,0.04)',
    
    // Text
    textPrimary: '#c0d8e8',
    textSecondary: '#3a6080',
    textTertiary: '#2e4e65',
    
    // Accents
    primary: '#40a8d0',
    primaryGlow: 'rgba(64,168,208,0.08)',
    primaryBorder: 'rgba(64,168,208,0.15)',
    
    // Status
    statusOpen: {
      bg: 'rgba(55,195,140,0.14)',
      text: '#3cc890',
      glow: 'rgba(55,195,140,0.08)',
    },
    statusLimited: {
      bg: 'rgba(170,185,55,0.10)',
      text: '#a0ac40',
      glow: 'rgba(170,185,55,0.05)',
    },
    statusScarce: {
      bg: 'rgba(210,145,60,0.12)',
      text: '#d09540',
      glow: 'rgba(210,145,60,0.06)',
    },
    statusFull: {
      bg: 'rgba(200,55,75,0.14)',
      text: '#d04a60',
      glow: 'rgba(200,55,75,0.08)',
    },
    statusClosed: {
      bg: 'rgba(25,30,40,0.4)',
      text: '#222e3a',
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
