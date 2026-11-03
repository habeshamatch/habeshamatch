// Design tokens. "Kaba": dusk slate-blue with gold, and a tibeb diamond ornament (from the
// embroidered borders on a habesha kemis, shared by Eritreans and Ethiopians; never flag colours).
// Gold guides (buttons, selected states, titles, icons); raspberry only for love moments
// (hearts, likes, matches). Every colour, font and spacing value used in the app comes from here.
// Never inline colours.
// Contrast on the background: text, textMuted, accent, love, rose and verified all pass WCAG AA
// (4.5:1); onAccent (navy) passes on accent, highlight and rose fills. textFaint is for
// placeholders and disabled items only, never for reading text.

export const colors = {
  background: '#1B2336', // dusk slate-blue
  bar: '#202A3F', // header and tab bar
  surface: '#26304A', // cards, sheets
  surfaceRaised: '#303B56', // inputs, chips, selected tabs, placeholders
  action: '#3D4864', // secondary buttons
  accent: '#DFB15B', // gold: main buttons, selected states, titles, links, icons
  accentSoft: '#FFE89E', // soft gold
  highlight: '#FFD700', // radiant gold: Premium highlights
  love: '#F06A8A', // raspberry: hearts, likes, matches
  rose: '#F87171', // errors, delete, unread badges
  text: '#F8F9FD',
  textMuted: '#A9B2C6',
  textFaint: '#5F6B84', // placeholders and disabled only
  border: '#35415C', // edges on cards and panels
  borderGold: '#8C6D32', // gold edges (outlined buttons, ornaments)
  onAccent: '#1B2336', // text and icons on accent, highlight and rose fills
  onPhoto: '#FFFFFF', // text and icons over photos (on overlay)
  verified: '#60A5FA', // blue tick
  overlay: 'rgba(3, 6, 14, 0.62)', // dims the screen behind sheets; scrim behind text on photos
} as const;

// Font family names, as registered by useFonts in app/_layout.tsx.
export const fonts = {
  heading: 'PlayfairDisplay_700Bold',
  headingMedium: 'PlayfairDisplay_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 48, color: colors.accent },
  title: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, color: colors.accent },
  subtitle: { fontFamily: fonts.headingMedium, fontSize: 20, lineHeight: 28, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  bodyMuted: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 20 },
  // Small gold capitals above a screen title (the app name).
  eyebrow: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 2, color: colors.accent },
} as const;

export const theme = { colors, fonts, spacing, radius, typography } as const;
export type Theme = typeof theme;
