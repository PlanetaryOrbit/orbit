/*
 * Forms API - Build custom forms, manage submissions, and track analytics
 * from a single dashboard.
 *
 * This file contains helpers for the Forms API.
 *
 * @module Pages/API/Workspace/[id]/Forms
 * @since 2.1.10-beta21
 * @author BuddyWinte
 */

"use strict";

import { prisma } from "@/lib/prisma";
import { FormPermissionType } from "@prisma/client";

export { FormPermissionType };

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

type PermissionSet = {
  allow: FormPermissionType[];
  deny: FormPermissionType[];
};

type PermissionContext = {
  isOwner: boolean;
  global: PermissionSet;
  form: PermissionSet;
};

export function hasFormPermission(
  ctx: PermissionContext,
  permission: FormPermissionType,
): boolean {
  if (ctx.isOwner) return true;

  // Form overrides take priority
  if (ctx.form.deny.includes(permission)) return false;
  if (ctx.form.allow.includes(permission)) return true;

  // Global permissions
  if (ctx.global.deny.includes(permission)) return false;
  if (ctx.global.allow.includes(permission)) return true;

  return false;
}

export async function getFormPermissions({
  formId,
  userId,
  isOwner,
  roleIds,
}: {
  formId: string;
  userId: bigint;
  isOwner: boolean;
  roleIds: string[];
}): Promise<PermissionContext> {
  if (isOwner) {
    return {
      isOwner: true,
      global: {
        allow: Object.values(FormPermissionType),
        deny: [],
      },
      form: {
        allow: Object.values(FormPermissionType),
        deny: [],
      },
    };
  }

  const roles = await prisma.role.findMany({
    where: {
      id: {
        in: roleIds,
      },
    },
    select: {
      permissions: true,
    },
  });

  const global: PermissionSet = {
    allow: [],
    deny: [],
  };

  for (const role of roles) {
    for (const permission of role.permissions) {
      if (
        Object.values(FormPermissionType).includes(
          permission as FormPermissionType,
        )
      ) {
        global.allow.push(
          permission as FormPermissionType,
        );
      }
    }
  }

  const overrides = await prisma.formPermission.findMany({
    where: {
      formId,
      OR: [
        {
          userId,
        },
        {
          roleId: {
            in: roleIds,
          },
        },
      ],
    },
  });

  const form: PermissionSet = {
    allow: [],
    deny: [],
  };

  for (const override of overrides) {
    form.allow.push(...override.allow);
    form.deny.push(...override.deny);
  }

  return {
    isOwner,
    global,
    form,
  };
}
