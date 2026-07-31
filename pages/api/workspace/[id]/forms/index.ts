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

import { FormPermissionType, getFormPermissions, hasFormPermission } from "./helpers";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

export default withAuth(async (req, res) => {
  try {
    const { auth } = req;
    const { session } = auth;
    const { userid } = session;

    const workspaceId = Number(req.query.id);

    if (req.method !== "GET") {
      return res.status(405).json({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed",
        },
      });
    }

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

    if (!session.isOwner) {
      const permissions = await prisma.formPermission.findMany({
        where: {
          formId: {
            in: forms.map((form) => form.id),
          },
          OR: [
            {
              userId: userid,
            },
            {
              roleId: {
                in: session.roles ?? [],
              },
            },
          ],
        },
      });

      const visible = forms.filter((form) => {
        const overrides = permissions.filter(
          (permission) => permission.formId === form.id,
        );
        return hasFormPermission(
          {
            isOwner: false,
            global: {
              allow: [],
              deny: [],
            },
            form: {
              allow: overrides.flatMap((x) => x.allow),
              deny: overrides.flatMap((x) => x.deny),
            },
          },
          FormPermissionType.View,
        );
      });
      return res.status(200).json({
        success: true,
        data: {
          forms: visible,
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
    console.error("[Forms] Failed to list forms:", err);
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
});
