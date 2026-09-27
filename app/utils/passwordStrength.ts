import zxcvbn from 'zxcvbn';

export type PasswordStrength = '0' | '1' | '2' | '3' | '4';

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return '0';
  }

  return String(zxcvbn(password).score) as PasswordStrength;
}
