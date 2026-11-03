// Design tokens. "Kaba": a friendly blue header band and tab bar (our own shade, in the spirit of
// early social networks; never another brand's exact colours) around a calm off-white page with
// the lightest brown lines. Photo tiles keep deeper blue frames. Gold lives on the blue (titles,
// the KABA label, the active tab); on the page, blue guides. The tibeb diamond ornament comes from
// the embroidered borders on a habesha kemis, shared by Eritreans and Ethiopians; never flag
// colours. Raspberry only for love moments.
// Every colour, font and spacing value used in the app comes from here. Never inline colours.
// Contrast: on the page, text, textMuted, accent and rose pass WCAG AA (4.5:1); on the blue,
// onBrand, onBrandMuted and brandGold pass. textFaint is for placeholders and disabled only.

export const colors = {
  // The page
  background: '#FAF7F2', // calm off-white
  surface: '#FFFFFF', // cards, sheets
  surfaceRaised: '#F2ECE4', // inputs, chips, segment track, placeholders
  action: '#ECE5DB', // secondary buttons (dark text)
  border: '#EADFD2', // the lightest brown: lines and card edges
  accent: '#3F5E9E', // blue on the page: main buttons, selected states, links, icons
  accentSoft: '#DCE4F3',
  highlight: '#F5B700', // bright gold: Premium highlights, always with dark text
  love: '#D1395F', // raspberry: hearts, likes, matches
  rose: '#C0262D', // errors, delete, unread badges
  text: '#1C2433',
  textMuted: '#5A6478',
  textFaint: '#8A93A6', // placeholders and disabled only
  onAccent: '#FFFFFF', // text and icons on accent, love and rose fills
  verified: '#1D6FE0', // blue tick on the page
  // The blue frame: header band, tab bar, photo tiles
  brand: '#3F5E9E', // header band and tab bar
  brandDeep: '#35528F', // photo tile frames
  brandGold: '#FFD27A', // gold on blue: titles, the KABA label, the active tab
  onBrand: '#FFFFFF', // text on blue
  onBrandMuted: '#D9E2F3', // secondary text on blue
  verifiedOnBrand: '#A5D8FF', // blue tick on blue
  borderGold: '#C9A04F', // tibeb ornament on the page
  // Photos
  onPhoto: '#FFFFFF', // text and icons over photos (on overlay)
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
  display: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 48, color: colors.text },
  title: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, color: colors.text },
  subtitle: { fontFamily: fonts.headingMedium, fontSize: 20, lineHeight: 28, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.text },
  bodyMuted: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.textMuted },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  button: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 20 },
  // Small gold capitals above a screen title (the app name).
  eyebrow: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 2, color: colors.brandGold },
} as const;

export const theme = { colors, fonts, spacing, radius, typography } as const;
export type Theme = typeof theme;
