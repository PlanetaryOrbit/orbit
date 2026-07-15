/*
 * Forms API - Build custom forms, manage submissions, and track analytics
 * from a single dashboard.
 *
 * This module contains shared helper utilities used throughout the Forms API.
 *
 * @file Helpers for the Forms API.
 * @module Pages/API/Workspace/[id]/Forms/Helpers
 * @since 2.1.10-beta21
 * @author BuddyWinte
 */

 export interface ErrorBody {
   code: string;
   message: string;
   details?: unknown;
 }

 export type RequestResponse<T> =
   | {
       success: true;
       data: T;
     }
   | {
       success: false;
       error: ErrorBody;
     };

import { withPermissionCheck } from "@/utils/permissionsManager";
import { withAuth } from "@/lib/withAuth";
