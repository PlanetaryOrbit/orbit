/**
 * Orbit API
 *
 * Returns the text color based on the background color. WCAG Compliance
 *
 * @author BuddyWinte
 */
const dark = "#4c4f69";
const light = "#cdd6f4";

export function getTextColor(
  background: string
): typeof dark | typeof light {
  const bg = resolveColor(background);

  if (!bg) return dark;

  const darkContrast = contrastRatio(bg, dark);
  const lightContrast = contrastRatio(bg, light);

  return lightContrast > darkContrast ? light : dark;
}

function contrastRatio(
  foreground: string,
  background: string
): number {
  const l1 = luminance(foreground);
  const l2 = luminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;

    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return (
    channels[0] * 0.2126 +
    channels[1] * 0.7152 +
    channels[2] * 0.0722
  );
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");

  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((x) => x + x)
          .join("")
      : clean;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function resolveColor(color: string): string | null {
  if (color.startsWith("#")) {
    return color;
  }

  if (color.startsWith("var(") && typeof window !== "undefined") {
    const variable = color
      .replace("var(", "")
      .replace(")", "")
      .trim();

    const resolved = getComputedStyle(
      document.documentElement
    )
      .getPropertyValue(variable)
      .trim();

    return resolved.startsWith("#") ? resolved : null;
  }

  return null;
}
