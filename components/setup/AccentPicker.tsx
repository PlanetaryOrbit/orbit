import clsx from 'clsx';
import type { CSSProperties } from 'react';

import { ACCENT_COLORS } from './constants';

const SPECTRUM =
  'conic-gradient(from 0deg, #f43f5e, #f59e0b, #84cc16, #10b981, #0ea5e9, #8b5cf6, #ec4899, #f43f5e)';

const swatchClass =
  'h-8 w-8 rounded-full ring-offset-2 ring-offset-white transition duration-200 focus:outline-none focus-visible:ring-2 dark:ring-offset-zinc-950';

type AccentPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export default function AccentPicker({ value, onChange }: AccentPickerProps) {
  const isPreset = ACCENT_COLORS.some((color) => color.value.toLowerCase() === value.toLowerCase());

  return (
    <div
      role='radiogroup'
      aria-label='Accent color'
      className='grid grid-cols-9 justify-items-center gap-y-3'
    >
      {ACCENT_COLORS.map(({ name, value: color }) => {
        const selected = color.toLowerCase() === value.toLowerCase();

        return (
          <button
            key={color}
            type='button'
            role='radio'
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color, '--tw-ring-color': color } as CSSProperties}
            className={clsx(
              swatchClass,
              selected ? 'scale-100 ring-2' : 'scale-90 hover:scale-100',
            )}
          />
        );
      })}

      <label
        title='Custom color'
        style={
          {
            background: isPreset ? SPECTRUM : value,
            '--tw-ring-color': value,
          } as CSSProperties
        }
        className={clsx(
          swatchClass,
          'relative cursor-pointer focus-within:ring-2',
          isPreset ? 'scale-90 hover:scale-100' : 'scale-100 ring-2',
        )}
      >
        <input
          type='color'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label='Custom color'
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
        />
      </label>
    </div>
  );
}
