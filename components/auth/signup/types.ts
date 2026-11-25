export type Verification = {
  code: string;
  userId: number;
};

export type SignUpStep = 0 | 1 | 2 | 3;

export const SIGN_UP_STEP_COUNT = 4;
