// This file uses WCAG luminance calculation to detect weather text should be white or black.

export function getContrastColor(hex?: string) {
  if (!hex || !hex.startsWith("#")) return "#ffffff";

  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((x) => parseInt(x, 16));

  if (!rgb || rgb.length !== 3) return "#ffffff";

  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  const luminance =
    0.2126 * r +
    0.7152 * g +
    0.0722 * b;

  return luminance > 0.179 ? "#000000" : "#ffffff";
}