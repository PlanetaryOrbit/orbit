import zxcvbn from 'zxcvbn';

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Weak' | 'Okay' | 'Strong' | 'Super Secure';
};

const labels = ['Weak', 'Weak', 'Okay', 'Strong', 'Super Secure'] as const;

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return {
      score: 0,
      label: labels[0],
    };
  }

  const { score } = zxcvbn(password);

  return {
    score,
    label: labels[score],
  };
}
