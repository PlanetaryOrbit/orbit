/**
 * Orbit Forms
 * Licensed under GPL-3.0 (see LICENSE for details)
 *
 * Form collection endpoint.
 * Used for listing existing forms and creating new forms.
 *
 * Routes:
 * GET  /api/forms
 * POST /api/forms
 *
 * Permissions:
 * - Forms.View
 * - Forms.Create
 *
 * @module api/forms
 * @author BuddyWinte
 * @since 2.1.10-beta20
 */

import { withAuth } from "@/lib/withAuth";
