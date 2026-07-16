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
import { FormPermissionType, getFormPermissions, hasFormPermission } from "./helpers";
import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

export default withAuth(async (req, res) => {
  try {
    const { auth } = req;
    const { session } = auth;
    const { userid } = session;
    const { id } = req.query;
    const { method } = req;

    if (method === "GET") {
      const forms = await prisma.form.findMany({
        where: {
          workspaceGroupId: Number(id),
        },
      });

      const filtered = await Promise.all(
        forms.map(async (form) => {
          const permissions = await getFormPermissions({
            formId: form.id,
            userId: userid,
            isOwner: session.isOwner ?? true,
            roleIds: session.roles ?? [],
          });

          if (
            hasFormPermission(permissions, FormPermissionType.View)) {
            return form
          }

          return null;
        }),
      );

      const visible = filtered.filter(
        (form): form is typeof forms[number] => form !== null
      );

      return res.status(200).json({
        success: true,
        data: visible
      });
    }

    return res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed"
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error"
      },
    });
  }
});
