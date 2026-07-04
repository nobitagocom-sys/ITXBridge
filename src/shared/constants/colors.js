// Linear-inspired indigo color palette for ITXBridge
// Light theme: Clean cool neutral tones
// Dark theme: Near-black with subtle depth

export const COLORS = {
  // Primary - Indigo (Linear/Vercel-inspired)
  primary: {
    DEFAULT: "#5E6AD2",
    hover: "#4b56b8",
    light: "#8f86ef",
    dark: "#3a4494",
  },

  // Light theme backgrounds
  light: {
    bg: "#FAFAFA",
    bgAlt: "#F5F5F5",
    surface: "#FFFFFF",
    sidebar: "rgba(250, 250, 250, 0.85)",
    border: "rgba(0, 0, 0, 0.08)",
    textMain: "#0A0A0A",
    textMuted: "#6B6B6B",
  },

  // Dark theme backgrounds
  dark: {
    bg: "#0D0D0D",
    bgAlt: "#141414",
    surface: "#1A1A1A",
    sidebar: "rgba(13, 13, 13, 0.85)",
    border: "rgba(255, 255, 255, 0.08)",
    textMain: "#EDEDED",
    textMuted: "#888888",
  },

  // Status colors
  status: {
    success: "#22C55E",
    successLight: "#DCFCE7",
    successDark: "#166534",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    warningDark: "#92400E",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    errorDark: "#991B1B",
    info: "#3B82F6",
    infoLight: "#DBEAFE",
    infoDark: "#1E40AF",
  },
};

// CSS Variables mapping for Tailwind
export const CSS_VARIABLES = {
  light: {
    "--color-primary": COLORS.primary.DEFAULT,
    "--color-primary-hover": COLORS.primary.hover,
    "--color-bg": COLORS.light.bg,
    "--color-bg-alt": COLORS.light.bgAlt,
    "--color-surface": COLORS.light.surface,
    "--color-sidebar": COLORS.light.sidebar,
    "--color-border": COLORS.light.border,
    "--color-text-main": COLORS.light.textMain,
    "--color-text-muted": COLORS.light.textMuted,
  },
  dark: {
    "--color-primary": COLORS.primary.DEFAULT,
    "--color-primary-hover": COLORS.primary.hover,
    "--color-bg": COLORS.dark.bg,
    "--color-bg-alt": COLORS.dark.bgAlt,
    "--color-surface": COLORS.dark.surface,
    "--color-sidebar": COLORS.dark.sidebar,
    "--color-border": COLORS.dark.border,
    "--color-text-main": COLORS.dark.textMain,
    "--color-text-muted": COLORS.dark.textMuted,
  },
};
