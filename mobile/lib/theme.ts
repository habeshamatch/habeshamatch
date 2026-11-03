// Design tokens. "Kaba": light and friendly, a light blue-grey page with white cards and a muted
// denim blue (our own shade, in the spirit of early social networks), gold for the brand label,
// Premium highlights and the tibeb diamond ornament (after the embroidered borders on a habesha
// kemis, shared by Eritreans and Ethiopians; never flag colours). Raspberry only for love moments.
// Every colour, font and spacing value used in the app comes from here. Never inline colours.
// Contrast on the background: text, textMuted, accent, goldText and rose pass WCAG AA (4.5:1 on
// white cards; 3.9+ on the page); white (onAccent) passes on accent, love and rose fills.
// textFaint is for placeholders and disabled items only.

export const colors = {
  background: '#E9EEF6', // light blue-grey page
  bar: '#FFFFFF', // tab bar
  surface: '#FFFFFF', // cards, sheets
  surfaceRaised: '#DCE3EF', // inputs, chips, segment track, placeholders
  action: '#D3DBE8', // secondary buttons (dark text)
  accent: '#3D5A98', // denim blue: main buttons, selected states, titles, links, icons
  accentSoft: '#DCE4F3', // light blue tint
  goldText: '#9A6F1E', // gold for small text on light (the KABA label)
  highlight: '#F5B700', // bright gold: Premium highlights, always with dark text
  love: '#D1395F', // raspberry: hearts, likes, matches
  rose: '#C0262D', // errors, delete, unread badges
  text: '#1C2433', // dark navy
  textMuted: '#5A6478',
  textFaint: '#8A93A6', // placeholders and disabled only
  border: '#D3DBE8', // edges on cards and panels
  borderGold: '#C9A04F', // gold ornaments (tibeb divider)
  onAccent: '#FFFFFF', // text and icons on accent, love and rose fills
  onPhoto: '#FFFFFF', // text and icons over photos (on overlay)
  verified: '#1D6FE0', // blue tick
  overlay: 'rgba(15, 22, 38, 0.55)', // dims the screen behind sheets; scrim behind text on photos
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
