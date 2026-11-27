import { safeEqual } from '@/lib/security';
import type { NextApiRequest } from 'next';

const SETUP_TOKEN_HEADER = 'x-setup-token';

export function isSetupRequestAllowed(req: NextApiRequest): boolean {
  const token = process.env.INSTANCE_SETUP_TOKEN;

  if (!token) {
    return process.env.NODE_ENV !== 'production';
  }

  const supplied =
    (req.headers[SETUP_TOKEN_HEADER] as string | undefined) ||
    (typeof req.body?.setupToken === 'string' ? req.body.setupToken : '');

  return safeEqual(supplied, token);
}
