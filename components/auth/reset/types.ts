import type { Identity } from '../types';

export type ResetSession = {
  identity: Identity;
  code: string;
  userId: string | number;
};

export type ResetStep = 0 | 1 | 2 | 3;

export const RESET_STEP_COUNT = 4;
