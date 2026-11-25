import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error ?? fallback;
  return fallback;
}
