import zxcvbn from "zxcvbn";

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Weak" | "Okay" | "Strong" | "Super Secure";
  entropy: number;
  feedback: string[];
};

export function calculatePasswordStrength(
  password: string
): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: "Weak",
      entropy: 0,
      feedback: [],
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

  const feedback = [
    result.feedback.warning,
    ...result.feedback.suggestions,
  ].filter(Boolean);

  return {
    score,
    label: labels[score],
    entropy: result.guesses_log10,
    feedback,
  };
}