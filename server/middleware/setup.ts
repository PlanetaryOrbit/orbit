import { getSettings } from '~~/server/lib/instance';

export default defineEventHandler(async (event) => {
  const settings = await getSettings();

  const path = getRequestURL(event).pathname;

  // DONT BLOCK API ROUTES, learned this the hard way!
  if (path.startsWith('/api/')) {
    return;
  }

  const allowedWhileUnsetup = ['/signup', '/setup'];

  // We are already setup, don't redirect.
  if (settings.isSetup) {
    return;
  }

  // Force redirect for setup-related pages.
  if (allowedWhileUnsetup.some((route) => path === route || path.startsWith(`${route}/`))) {
    return;
  }

  // Redirect everything else to /setup.
  return sendRedirect(event, '/setup', 302);
});
