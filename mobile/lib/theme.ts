// Design tokens for HabeshaMatch. Inspired by the Habesha coffee ceremony:
// warm, cultural, premium. Every colour, font and spacing value used in the
// app comes from here. Never inline colours in components.

export const colors = {
  background: '#1C1917', // deep stone
  surface: '#292524',
  surfaceRaised: '#3A3330',
  accent: '#D4A24C', // amber / gold
  accentSoft: '#E8C77E',
  rose: '#C97B84',
  text: '#FAF7F2',
  textMuted: '#A8A29E',
  verified: '#3B82F6', // blue tick
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
