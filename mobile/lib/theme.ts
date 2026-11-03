// Design tokens. "Tibeb": light and vibrant, inspired by the embroidered borders on a white
// habesha kemis and netela (shared by Eritreans and Ethiopians; never flag colours). Every colour,
// font and spacing value used in the app comes from here. Never inline colours in components.
// Contrast: text, textMuted, accent, secondary and rose all pass WCAG AA (4.5:1) on background,
// and white (onAccent) passes on accent, secondary and rose.

export const colors = {
  background: '#FFFCF7', // warm white, like woven cotton
  surface: '#FFFFFF', // cards, sheets, the tab bar
  surfaceRaised: '#F3ECE2', // warm sand: inputs, chips, placeholders, borders
  accent: '#CF3F2E', // berbere coral-red: main buttons, likes, badges, links
  accentSoft: '#FBE3DD', // light coral tint
  secondary: '#0F766E', // tibeb teal: selected states
  highlight: '#F5B700', // meskel yellow: Premium highlights only, always with dark text
  rose: '#B42318', // deep red: errors, delete, unread badges
  text: '#1F1A17', // warm near-black
  textMuted: '#6B625B',
  onAccent: '#FFFFFF', // text and icons on accent, secondary and rose fills
  onPhoto: '#FFFFFF', // text and icons over photos (on overlay)
  verified: '#2563EB', // blue tick
  overlay: 'rgba(20, 14, 10, 0.55)', // dims the screen behind sheets; scrim behind text on photos
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
  display: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 48, color: colors.text },
  title: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, color: colors.text },
  subtitle: { fontFamily: fonts.headingMedium, fontSize: 20, lineHeight: 28, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  bodyMuted: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 20 },
} as const;

export const theme = { colors, fonts, spacing, radius, typography } as const;
export type Theme = typeof theme;
