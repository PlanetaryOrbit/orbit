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

    const where = {
      workspaceGroupId: workspaceId,

      ...(archived !== undefined && {
        archived: archived === "true",
      }),

      ...(enabled !== undefined && {
        enabled: enabled === "true",
      }),

      ...(typeof search === "string" && {
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

    if (!session.isOwner && forms.length > 0) {
      const roles = await prisma.role.findMany({
        where: {
          id: {
            in: session.roles ?? [],
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
            Object.values(FormPermissionType)
              .includes(permission as FormPermissionType)
          ) {
            globalPermissions.add(
              permission as FormPermissionType
            );
          }
        }
      }


      const overrides = await prisma.formPermission.findMany({
        where: {
          formId: {
            in: forms.map(x => x.id),
          },
          OR: [
            {
              userId: session.userid,
            },
            {
              roleId: {
                in: session.roles ?? [],
              },
            },
          ],
        },
      });


      const visibleForms = forms.filter(form => {
        const formPermissions =
          overrides.filter(
            x => x.formId === form.id
          );


        const denied = new Set<FormPermissionType>();
        const allowed = new Set<FormPermissionType>();

        for (const permission of formPermissions) {
          permission.deny.forEach(x => denied.add(x));
          permission.allow.forEach(x => allowed.add(x));
        }


        if (denied.has(FormPermissionType.View)) {
          return false;
        }

        if (allowed.has(FormPermissionType.View)) {
          return true;
        }

        return globalPermissions.has(
          FormPermissionType.View
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
