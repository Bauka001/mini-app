// Anthropic / claude.ai design tokens. Imported by ClaudeModal and any
// modal/component that wants to match the warm cream + terracotta palette.

export const claudeTokens = {
  surface: '#FAF9F5',          // warm cream for the panel itself
  surfaceMuted: '#F0EEE6',     // slightly darker cream for inner cards / tabs
  surfaceSunken: '#E8E5DA',    // tab strip / segmented-control background
  border: '#E5E2D8',           // warm hairline
  borderStrong: '#D6D2C4',
  textPrimary: '#1F1E1D',      // warm near-black for headings
  textBody: '#3A3733',         // warm dark gray for body copy
  textMuted: '#6E6B66',        // secondary text
  accent: '#D97757',           // terracotta — Claude's signature
  accentHover: '#BF5C3C',
  accentSoft: 'rgba(217, 119, 87, 0.12)',
  success: '#5B8A6E',          // muted forest, for confirmation icons
  warning: '#C4972A',          // muted amber
  serifStack:
    '"Tiempos Headline", "Iowan Old Style", Georgia, ui-serif, serif',
} as const;
