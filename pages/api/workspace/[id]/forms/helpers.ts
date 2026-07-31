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
"use strict";

import { prisma } from "@/lib/prisma";

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

export enum FormPermissionType {
  // Global
  Create = "Forms.Create",
  View = "Forms.View",
  Edit = "Forms.Edit",
  Delete = "Forms.Delete",
  Duplicate = "Forms.Duplicate",

  // Overrideable
  ManagePages = "Forms.ManagePages",
  ManageQuestions = "Forms.ManageQuestions",
  ManageQuestionSettings = "Forms.ManageQuestionSettings",
  ManageSettings = "Forms.ManageSettings",
  ManagePermissions = "Forms.ManagePermissions",
  ViewResponses = "Forms.ViewResponses",
  ViewOwnResponses = "Forms.ViewOwnResponses",
  SubmitResponses = "Forms.SubmitResponses",
  WithdrawResponses = "Forms.WithdrawResponses",
  DeleteResponses = "Forms.DeleteResponses",
  ReviewResponses = "Forms.ReviewResponses",
  ApproveResponses = "Forms.ApproveResponses",
  DenyResponses = "Forms.DenyResponses",
  AddReviewComments = "Forms.AddReviewComments",
  ManageReviews = "Forms.ManageReviews",
  ExportResponses = "Forms.ExportResponses",
  ViewStatistics = "Forms.ViewStatistics",
}

const OverrideableFormPermissions = [
  FormPermissionType.ManagePages,
  FormPermissionType.ManageQuestions,
  FormPermissionType.ManageQuestionSettings,
  FormPermissionType.ManageSettings,
  FormPermissionType.ManagePermissions,
  FormPermissionType.ViewResponses,
  FormPermissionType.ViewOwnResponses,
  FormPermissionType.SubmitResponses,
  FormPermissionType.WithdrawResponses,
  FormPermissionType.DeleteResponses,
  FormPermissionType.ReviewResponses,
  FormPermissionType.ApproveResponses,
  FormPermissionType.DenyResponses,
  FormPermissionType.AddReviewComments,
  FormPermissionType.ManageReviews,
  FormPermissionType.ExportResponses,
  FormPermissionType.ViewStatistics,
];

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

  // Form
  if (ctx.form.deny.includes(permission)) return false;
  if (ctx.form.allow.includes(permission)) return true;

  // Global
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
        global.allow.push(permission as FormPermissionType);
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
