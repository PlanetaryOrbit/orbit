const dark = "#4c4f69";
const light = "#cdd6f4";

type RGB = {
  r: number;
  g: number;
  b: number;
};

export function getTextColor(background: string): typeof dark | typeof light {
  const rgb = parseColor(background);

  if (!rgb) {
    return dark;
  }

  const darkContrast = contrastRatio(dark, rgb);
  const lightContrast = contrastRatio(light, rgb);

  return lightContrast >= darkContrast ? light : dark;
}

function contrastRatio(foreground: string, background: RGB): number {
  const foregroundRgb = parseColor(foreground);

  if (!foregroundRgb) {
    return 0;
  }

  const foregroundLuminance = luminance(foregroundRgb);
  const backgroundLuminance = luminance(background);

  const lighter = Math.max(foregroundLuminance, backgroundLuminance);

  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function luminance({ r, g, b }: RGB): number {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;

    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function parseColor(color: string): RGB | null {
  const value = color.trim().toLowerCase();

  if (value.startsWith("#")) {
    return parseHex(value);
  }

  if (value.startsWith("rgb(") || value.startsWith("rgba(")) {
    return parseRgb(value);
  }

  return null;
}

function parseHex(hex: string): RGB | null {
  const value = hex.slice(1);

  let normalized: string;

  if (value.length === 3) {
    normalized = value
      .split("")
      .map((channel) => channel + channel)
      .join("");
  } else if (value.length === 6) {
    normalized = value;
  } else {
    return null;
  }

  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function parseRgb(value: string): RGB | null {
  const match = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);

  if (r > 255 || g > 255 || b > 255) {
    return null;
  }

  return { r, g, b };
}
