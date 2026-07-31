/*
 * Forms API - Build custom forms, manage submissions, and track analytics
 * from a single dashboard.
 *
 * This file manages `POST /` and `GET /` requests for the Forms API.
 *
 * @file API route handler for the Forms API.
 * @module Pages/API/Workspace/[id]/Forms
 * @since 2.1.10-beta21
 * @author BuddyWinte
 */

"use strict";

import { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";
import { FormPermissionType } from "./helpers";

export default withAuth(async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed",
        },
      });
    }

    const { session } = req.auth;

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Unauthorized",
        },
      });
    }

    const workspaceId = Number(req.query.id);

    const {
      archived,
      enabled,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const where: Prisma.FormWhereInput = {
      workspaceGroupId: workspaceId,

      ...(archived !== undefined && {
        archived: archived === "true",
      }),

      ...(enabled !== undefined && {
        enabled: enabled === "true",
      }),

      ...(typeof search === "string" &&
        search.length > 0 && {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }),
    };

    const [forms, total] = await Promise.all([
      prisma.form.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          enabled: true,
          archived: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),

      prisma.form.count({
        where,
      }),
    ]);

    const isOwner = session.user.isOwner ?? false;

    if (!isOwner && forms.length > 0) {
      const roleMemberships = await prisma.roleMember.findMany({
        where: {
          userId: session.user.userid,
        },
        select: {
          roleId: true,
        },
      });

      const roleIds = roleMemberships.map(
        role => role.roleId,
      );

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

      const globalPermissions = new Set<FormPermissionType>();

      for (const role of roles) {
        for (const permission of role.permissions) {
          if (
            Object.values(FormPermissionType).includes(
              permission as FormPermissionType,
            )
          ) {
            globalPermissions.add(
              permission as FormPermissionType,
            );
          }
        }
      }

      const overrides = await prisma.formPermission.findMany({
        where: {
          formId: {
            in: forms.map(form => form.id),
          },
          OR: [
            {
              userId: session.user.userid,
            },
            {
              roleId: {
                in: roleIds,
              },
            },
          ],
        },
      });

      const visibleForms = forms.filter(form => {
        const permissions = overrides.filter(
          override => override.formId === form.id,
        );

        const allowed = new Set<FormPermissionType>();
        const denied = new Set<FormPermissionType>();

        for (const permission of permissions) {
          permission.allow.forEach(value =>
            allowed.add(value),
          );

          permission.deny.forEach(value =>
            denied.add(value),
          );
        }

        if (denied.has(FormPermissionType.View)) {
          return false;
        }

        if (allowed.has(FormPermissionType.View)) {
          return true;
        }

        return globalPermissions.has(
          FormPermissionType.View,
        );
      });

      return res.status(200).json({
        success: true,
        data: {
          forms: visibleForms,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total,
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        forms,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
        },
      },
    });
  } catch (err) {
    console.error("[Forms] Failed to list forms", err);

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
});
