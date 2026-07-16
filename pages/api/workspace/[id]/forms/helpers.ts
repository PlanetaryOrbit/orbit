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
  ManagePages = "ManagePages",
  ManageQuestions = "ManageQuestions",
  ManageQuestionSettings = "ManageQuestionSettings",
  ManageSettings = "ManageSettings",
  ManagePermissions = "ManagePermissions",
  ViewResponses = "ViewResponses",
  ViewOwnResponses = "ViewOwnResponses",
  SubmitResponses = "SubmitResponses",
  WithdrawResponses = "WithdrawResponses",
  DeleteResponses = "DeleteResponses",
  ReviewResponses = "ReviewResponses",
  ApproveResponses = "ApproveResponses",
  DenyResponses = "DenyResponses",
  AddReviewComments = "AddReviewComments",
  ManageReviews = "ManageReviews",
  ExportResponses = "ExportResponses",
  ViewStatistics = "ViewStatistics",
}

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
  if (ctx.global.deny.includes(permission)) return false;
  if (ctx.form.deny.includes(permission)) return false;
  if (ctx.form.allow.includes(permission)) return true;
  if (ctx.global.allow.includes(permission)) return true;
  return false;
}
