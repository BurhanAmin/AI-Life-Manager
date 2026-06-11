// Paper design system, ported from web (Phases 1-3).
// Playfair Display (serif, headings) + DM Sans (body). Black-only accents, no emoji.
export const colors = {
  bg: '#ffffff',
  surface: '#ffffff',
  ink: '#111111',
  inkSoft: '#444444',
  muted: '#888888',
  line: '#e6e6e6',
  lineStrong: '#111111',
  accent: '#111111',
  accentText: '#ffffff',
  danger: '#7a1f1f',
};

export const font = {
  serif: 'PlayfairDisplay_600SemiBold',
  serifReg: 'PlayfairDisplay_400Regular',
  body: 'DMSans_400Regular',
  bodyMed: 'DMSans_500Medium',
};

export const space = { xs: 6, sm: 12, md: 18, lg: 28, xl: 40 };

export const radius = { sm: 4, md: 8 };

export const type = {
  h1: { fontFamily: font.serif, fontSize: 30, color: colors.ink },
  h2: { fontFamily: font.serif, fontSize: 22, color: colors.ink },
  body: { fontFamily: font.body, fontSize: 16, color: colors.inkSoft, lineHeight: 24 },
  label: { fontFamily: font.bodyMed, fontSize: 13, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  small: { fontFamily: font.body, fontSize: 13, color: colors.muted },
};
