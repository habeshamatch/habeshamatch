// Design tokens. "Kaba": a cream page with white cards edged in thin gold, deep navy for text,
// main buttons and the tab bar, and gold for the coin logo, rings, icons and the active tab. The
// tibeb diamond ornament comes from the embroidered borders on a habesha kemis, shared by
// Eritreans and Ethiopians; never flag colours. Raspberry only for love moments.
// Every colour, font and spacing value used in the app comes from here. Never inline colours.
// Contrast: navy text, textMuted, goldText, rose and love pass WCAG AA (4.5:1) on the cream and
// white; gold (onAccent) passes on navy. goldIcon is for icons and ornaments only (3:1).
// textFaint is for placeholders and disabled only.

export const colors = {
  background: '#F7F4EE', // cream page
  surface: '#FFFFFF', // cards, sheets
  surfaceRaised: '#F1ECE2', // inputs, chips, segment track, placeholders
  action: '#ECE6DA', // secondary buttons (navy text)
  border: '#EADFC8', // light lines and edges
  borderGold: '#E2C27A', // thin gold card edges, the header line, the tibeb line
  accent: '#13213F', // deep navy: main buttons, selected states, links
  accentSoft: '#E3ECF8', // soft blue chips
  onAccent: '#F2C14E', // gold text and icons on navy
  gold: '#F2C14E', // coin logo, rings, the active tab
  goldIcon: '#B98B2E', // gold icons and ornaments on light
  goldText: '#7A5A12', // gold text on light and on goldSoft
  goldSoft: '#FBEFCF', // soft gold chips
  highlight: '#F2C14E', // Premium highlights, navy text
  love: '#D1395F', // raspberry: hearts, likes, matches
  rose: '#C0262D', // errors, delete, unread badges
  onRose: '#FFFFFF', // text on rose fills
  onNavy: '#FFFFFF', // body text on navy (your chat bubbles)
  text: '#13213F', // deep navy
  textMuted: '#5D6680',
  textFaint: '#9AA1B2', // placeholders and disabled only
  verified: '#1D6FE0', // blue tick
  brand: '#13213F', // the tab bar
  onBrandMuted: '#C9D1E3', // inactive tabs on navy
  onPhoto: '#FFFFFF', // text and icons over photos (on overlay)
  overlay: 'rgba(19, 33, 63, 0.6)', // dims the screen behind sheets; scrim behind text on photos
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
  // Bold navy capitals for section headings ("YOUR PROFILE", "NEW MATCHES").
  section: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18, letterSpacing: 1, color: colors.text },
} as const;

export const theme = { colors, fonts, spacing, radius, typography } as const;
export type Theme = typeof theme;
