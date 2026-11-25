import * as colors from 'tailwindcss/colors.js';

export const STEP_COUNT = 3;

export const ACCENT_COLORS = [
  { name: 'Rose', value: colors.rose[500] },
  { name: 'Red', value: colors.red[500] },
  { name: 'Orange', value: colors.orange[500] },
  { name: 'Amber', value: colors.amber[500] },
  { name: 'Yellow', value: colors.yellow[400] },
  { name: 'Lime', value: colors.lime[500] },
  { name: 'Green', value: colors.green[500] },
  { name: 'Emerald', value: colors.emerald[500] },
  { name: 'Teal', value: colors.teal[500] },
  { name: 'Cyan', value: colors.cyan[500] },
  { name: 'Sky', value: colors.sky[500] },
  { name: 'Blue', value: colors.blue[500] },
  { name: 'Indigo', value: colors.indigo[500] },
  { name: 'Violet', value: colors.violet[500] },
  { name: 'Purple', value: colors.purple[500] },
  { name: 'Fuchsia', value: colors.fuchsia[500] },
  { name: 'Pink', value: colors.pink[500] },
];

export const DEFAULT_ACCENT: string = colors.pink[500];
