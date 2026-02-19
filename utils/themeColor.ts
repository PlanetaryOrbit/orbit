import hexRgb from "hex-rgb";
import * as colors from "tailwindcss/colors";

export const DEFAULT_THEME_RGB = "236, 72, 153";

function hexToRgb(hex: string): string | null {
  const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

const PRESET_HEX: Record<string, string> = {
  "bg-pink-100": colors.pink[100],
  "bg-rose-100": colors.rose[100],
  "bg-orange-100": colors.orange[100],
  "bg-amber-100": colors.amber[100],
  "bg-lime-100": colors.lime[100],
  "bg-emerald-100": colors.emerald[100],
  "bg-cyan-100": colors.cyan[100],
  "bg-sky-100": colors.sky[100],
  "bg-indigo-100": colors.indigo[100],
  "bg-purple-100": colors.purple[100],
  "bg-pink-400": colors.pink[400],
  "bg-rose-400": colors.rose[400],
  "bg-orange-400": colors.orange[400],
  "bg-amber-400": colors.amber[400],
  "bg-lime-400": colors.lime[400],
  "bg-emerald-400": colors.emerald[400],
  "bg-cyan-400": colors.cyan[400],
  "bg-sky-400": colors.sky[400],
  "bg-indigo-400": colors.indigo[400],
  "bg-violet-400": colors.violet[400],
  "bg-orbit": "#FF0099",
  "bg-rose-600": colors.rose[600],
  "bg-orange-600": colors.orange[600],
  "bg-amber-600": colors.amber[600],
  "bg-lime-600": colors.lime[600],
  "bg-emerald-600": colors.emerald[600],
  "bg-cyan-600": colors.cyan[600],
  "bg-sky-600": colors.sky[600],
  "bg-indigo-600": colors.indigo[600],
  "bg-violet-600": colors.violet[600],
  "bg-blue-500": colors.blue[500],
  "bg-red-500": colors.red[500],
  "bg-red-700": colors.red[700],
  "bg-green-500": colors.green[500],
  "bg-green-600": colors.green[600],
  "bg-yellow-500": colors.yellow[500],
  "bg-orange-500": colors.orange[500],
  "bg-purple-500": colors.purple[500],
  "bg-pink-500": colors.pink[500],
  "bg-black": colors.black,
  "bg-zinc-500": colors.gray[500],
};

export function getHexFromTheme(tw: unknown): string {
  if (tw === null || tw === undefined || typeof tw !== "string") return "#ec4899";
  const value = (tw as string).trim();
  if (!value) return "#ec4899";
  if (value.startsWith("#")) return value;
  return PRESET_HEX[value] ?? "#ec4899";
}

export function getRGBFromTailwindColor(tw: unknown): string {
  if (tw === null || tw === undefined || typeof tw !== "string") {
    return DEFAULT_THEME_RGB;
  }

  const value = tw.trim();
  if (!value) return DEFAULT_THEME_RGB;

  if (value.startsWith("#")) {
    const rgb = hexToRgb(value);
    return rgb ?? DEFAULT_THEME_RGB;
  }

  const hex = PRESET_HEX[value];
  if (hex) {
    try {
      const { red, green, blue } = hexRgb(hex);
      return `${red} ${green} ${blue}`;
    } catch {
      return DEFAULT_THEME_RGB;
    }
  }

  return DEFAULT_THEME_RGB;
}
