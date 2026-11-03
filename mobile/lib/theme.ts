// Design tokens. "Kaba": a friendly blue page (our own shade, in the spirit of early social
// networks; never another brand's exact colours) with deeper blue panels, soft gold to guide, and
// the tibeb diamond ornament (after the embroidered borders on a habesha kemis, shared by
// Eritreans and Ethiopians; never flag colours). Pink only for love moments.
// Every colour, font and spacing value used in the app comes from here. Never inline colours.
// Contrast on the background: text, textMuted and accent pass WCAG AA (4.5:1); on the deeper
// panels everything passes comfortably. love and rose are for icons, badges and short text.
// textFaint is for placeholders and disabled items only.

export const colors = {
  background: '#3F5E9E', // friendly blue page
  bar: '#35528F', // tab bar
  surface: '#35528F', // cards, sheets (a deeper blue)
  surfaceRaised: '#2E4980', // inputs, chips, segment track, placeholders
  action: '#5576B5', // secondary buttons, selected segment (a lighter blue)
  accent: '#FFD27A', // soft gold: main buttons, selected states, titles, links, icons
  accentSoft: '#FFE9B8',
  goldText: '#FFD27A', // the KABA label
  highlight: '#FFD27A', // Premium highlights
  love: '#FFB3C6', // pink: hearts, likes, matches
  rose: '#FFC2C2', // errors, delete, unread badges
  text: '#FFFFFF',
  textMuted: '#E3EAF7',
  textFaint: '#AFC0E0', // placeholders and disabled only
  border: '#5672AE', // edges on cards and panels
  borderGold: '#FFD27A', // gold ornaments (tibeb divider)
  onAccent: '#1E2F57', // text and icons on gold, pink and rose fills
  onPhoto: '#FFFFFF', // text and icons over photos (on overlay)
  verified: '#A5D8FF', // blue tick, light so it shows on blue
  overlay: 'rgba(10, 20, 45, 0.6)', // dims the screen behind sheets; scrim behind text on photos
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
  eyebrow: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 2, color: colors.goldText },
} as const;

export const theme = { colors, fonts, spacing, radius, typography } as const;
export type Theme = typeof theme;
