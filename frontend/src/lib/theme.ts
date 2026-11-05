import type { CSSProperties } from "react";
import type { FontKey, ShapeKey, SpacingKey, Theme } from "@/lib/types";

export const DEFAULT_THEME: Theme = {
  accent: "#EA580C",
  background: "#FDFBF7",
  card: "#FFFFFF",
  font: "plus-jakarta",
  spacing: "comfortable",
  shape: "pill",
};

export const FONTS: Record<FontKey, { label: string; stack: string }> = {
  inter: { label: "Inter", stack: "'Inter Variable', system-ui, sans-serif" },
  "plus-jakarta": { label: "Plus Jakarta Sans", stack: "'Plus Jakarta Sans Variable', system-ui, sans-serif" },
  poppins: { label: "Poppins", stack: "'Poppins', system-ui, sans-serif" },
  system: { label: "System Sans", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
};

export const SPACING: Record<SpacingKey, { label: string; pad: string; gap: string; section: string; tap: string }> = {
  compact: { label: "Compact", pad: "16px", gap: "6px", section: "18px", tap: "40px" },
  comfortable: { label: "Comfortable", pad: "20px", gap: "8px", section: "26px", tap: "44px" },
  spacious: { label: "Spacious", pad: "26px", gap: "12px", section: "34px", tap: "50px" },
};

export const SHAPES: Record<ShapeKey, { label: string; chip: string; btn: string; card: string }> = {
  pill: { label: "Pill", chip: "9999px", btn: "9999px", card: "22px" },
  rounded: { label: "Soft Rounded", chip: "12px", btn: "14px", card: "16px" },
  square: { label: "Sharp Square", chip: "2px", btn: "2px", card: "4px" },
};

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Restaurant theme -> plain CSS variables (portable to any framework). */
export function themeVars(t: Theme): CSSProperties {
  const sp = SPACING[t.spacing] ?? SPACING.comfortable;
  const sh = SHAPES[t.shape] ?? SHAPES.pill;
  const darkBg = luminance(t.background) < 0.35;
  const darkCard = luminance(t.card) < 0.35;
  return {
    "--g-accent": t.accent,
    "--g-on-accent": luminance(t.accent) > 0.5 ? "#1C1917" : "#FFFFFF",
    "--g-bg": t.background,
    "--g-card": t.card,
    "--g-ink": darkBg ? "#FAF8F5" : "#1C1917",
    "--g-muted": darkBg ? "rgba(250,248,245,0.68)" : "#57534E",
    "--g-card-ink": darkCard ? "#FAF8F5" : "#1C1917",
    "--g-line": darkBg ? "rgba(255,255,255,0.14)" : "rgba(28,25,23,0.10)",
    "--g-pad": sp.pad,
    "--g-gap": sp.gap,
    "--g-section": sp.section,
    "--g-tap": sp.tap,
    "--g-chip-r": sh.chip,
    "--g-btn-r": sh.btn,
    "--g-card-r": sh.card,
    fontFamily: (FONTS[t.font] ?? FONTS["plus-jakarta"]).stack,
  } as CSSProperties;
}
