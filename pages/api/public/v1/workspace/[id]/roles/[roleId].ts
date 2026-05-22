import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

const VALID_PERMISSIONS = [
  "view_wall",
  "post_on_wall",
  "add_wall_photos",
  "delete_wall_posts",
  "edit_sticky_post",
  "sessions_shift_see",
  "sessions_shift_assign",
  "sessions_shift_claim",
  "sessions_shift_host",
  "sessions_shift_unscheduled",
  "sessions_shift_scheduled",
  "sessions_shift_manage",
  "sessions_shift_notes",
  "sessions_training_see",
  "sessions_training_assign",
  "sessions_training_claim",
  "sessions_training_host",
  "sessions_training_unscheduled",
  "sessions_training_scheduled",
  "sessions_training_manage",
  "sessions_training_notes",
  "sessions_event_see",
  "sessions_event_assign",
  "sessions_event_claim",
  "sessions_event_host",
  "sessions_event_unscheduled",
  "sessions_event_scheduled",
  "sessions_event_manage",
  "sessions_event_notes",
  "sessions_other_see",
  "sessions_other_assign",
  "sessions_other_claim",
  "sessions_other_host",
  "sessions_other_unscheduled",
  "sessions_other_scheduled",
  "sessions_other_manage",
  "sessions_other_notes",
  "view_members",
  "use_views",
  "create_views",
  "edit_views",
  "delete_views",
  "create_alliances",
  "delete_alliances",
  "represent_alliance",
  "edit_alliance_details",
  "add_alliance_notes",
  "edit_alliance_notes",
  "delete_alliance_notes",
  "add_alliance_visits",
  "edit_alliance_visits",
  "delete_alliance_visits",
  "admin",
  "reset_activity",
  "view_audit_logs",
  "manage_apikeys",
  "manage_features",
  "workspace_customisation",
  "view_member_profiles",
  "edit_member_details",
  "record_notices",
  "activity_adjustments",
  "view_logbook",
  "logbook_redact",
  "logbook_delete",
  "logbook_note",
  "logbook_warning",
  "logbook_promotion",
  "logbook_demotion",
  "logbook_termination",
  "rank_users",
  "create_quotas",
  "delete_quotas",
  "submit_resignation",
  "approve_resignations",
  "manage_resignations",
  "create_notices",
  "approve_notices",
  "manage_notices",
  "create_policies",
  "edit_policies",
  "delete_policies",
  "view_compliance",
  "create_docs",
  "edit_docs",
  "delete_docs"
] as const;

type ValidPermission = typeof VALID_PERMISSIONS[number];

const VALID_PERMISSIONS_SET = new Set<ValidPermission>(VALID_PERMISSIONS);

function validatePermissions(permissions: string[]): { valid: boolean; invalidPermissions: string[] } {
  const invalidPermissions: string[] = [];
  
  for (const permission of permissions) {
    if (!VALID_PERMISSIONS_SET.has(permission as ValidPermission)) {
      invalidPermissions.push(permission);
    }
  }
  
  return {
    valid: invalidPermissions.length === 0,
    invalidPermissions
  };
}

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { id, roleId } = req.query;

  const workspaceId = Number.parseInt(id as string);
  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  const roleIdString = Array.isArray(roleId) ? roleId[0] : roleId;
  if (!roleIdString) {
    return res
      .status(400)
      .json({ success: false, error: "Missing role ID" });
  }

  if (req.method === "GET") {
    try {
      const role = await prisma.role.findFirst({
        where: {
          workspaceGroupId: workspaceId,
          id: roleIdString
        },
        select: {
          id: true,
          name: true,
          permissions: true,
          groupRoles: true,
          color: true,
          isOwnerRole: true,
          quotaRoles: {
            select: {
              quota: true,
              role: true,
            },
          },
        },
      });

      if (!role) {
        return res.status(404).json({ success: false, error: "Role not found" });
      }

      const formattedResponse = {
        name: role.name,
        id: role.id,
        color: role.color,
        isOwnerRole: role.isOwnerRole,
        permissions: role.permissions,
        groupRoles: role.groupRoles,
        quota: role.quotaRoles.map((qr) => ({
          quota: qr.quota,
          role: qr.role,
        })),
      };

      return res.status(200).json({ success: true, data: formattedResponse });
    } catch (error) {
      console.error("Error fetching role:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "PATCH") {
    const { name, permissions, color } = req.body;

    try {
      const existingRole = await prisma.role.findFirst({
        where: {
          workspaceGroupId: workspaceId,
          id: roleIdString
        }
      });

      if (!existingRole) {
        return res.status(404).json({ success: false, error: "Role not found" });
      }

      if (permissions && Array.isArray(permissions)) {
        const { valid, invalidPermissions } = validatePermissions(permissions);
        
        if (!valid) {
          return res.status(400).json({
            success: false,
            error: "Invalid permissions provided",
            invalidPermissions: invalidPermissions,
            validPermissions: VALID_PERMISSIONS
          });
        }
      }

      if (name && name !== existingRole.name) {
        const nameConflict = await prisma.role.findFirst({
          where: {
            workspaceGroupId: workspaceId,
            name: name,
            NOT: {
              id: roleIdString
            }
          }
        });

        if (nameConflict) {
          return res.status(409).json({
            success: false,
            error: "A role with this name already exists in this workspace"
          });
        }
      }

      const updatedRole = await prisma.role.update({
        where: {
          id: roleIdString
        },
        data: {
          ...(name && { name }),
          ...(permissions && { permissions: permissions as ValidPermission[] }),
          ...(color !== undefined && { color: color || null }),
        }
      });
      
      return res.status(200).json({ success: true, data: updatedRole });
    } catch (error) {
      console.error("Error updating role:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const existingRole = await prisma.role.findFirst({
        where: {
          workspaceGroupId: workspaceId,
          id: roleIdString
        },
        include: {
          roleMembers: true,
          quotaRoles: true
        }
      });

      if (!existingRole) {
        return res.status(404).json({ success: false, error: "Role not found" });
      }

      if (existingRole.isOwnerRole) {
        return res.status(403).json({ 
          success: false, 
          error: "Cannot delete the owner role" 
        });
      }

      await prisma.role.delete({
        where: {
          id: roleIdString
        }
      });
      
      return res.status(200).json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }
}