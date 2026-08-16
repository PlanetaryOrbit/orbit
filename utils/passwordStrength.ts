import zxcvbn from "zxcvbn";

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Weak" | "Okay" | "Strong" | "Super Secure";
};

export function calculatePasswordStrength(
  password: string,
): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "Weak",
    };
  }

  const result = zxcvbn(password);
  const score = result.score as 0 | 1 | 2 | 3 | 4;

  const labels: Record<
    0 | 1 | 2 | 3 | 4,
    PasswordStrength["label"]
  > = {
    0: "Weak",
    1: "Weak",
    2: "Okay",
    3: "Strong",
    4: "Super Secure",
  };

  return {
    score,
    label: labels[score],
  };
}