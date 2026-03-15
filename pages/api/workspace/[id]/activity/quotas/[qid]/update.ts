import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";

type Data = {
  success: boolean;
  error?: string;
  quota?: any;
};

export default withPermissionCheck(handler, "create_quotas");

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!req.session?.userid) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  const qid = req.query.qid;
  if (!qid || typeof qid !== "string") {
    return res.status(400).json({ success: false, error: "Missing or invalid quota id" });
  }

  const { name, type, value, roles, departments, description, sessionType } = req.body;
  const isCustom = type === "custom";
  const hasRoles = Array.isArray(roles) && roles.length > 0;
  const hasDepartments = Array.isArray(departments) && departments.length > 0;

  const parsedValue = value != null ? Number(value) : null;
  if (
    !name ||
    !type ||
    (!isCustom && (parsedValue === null || Number.isNaN(parsedValue))) ||
    (!hasRoles && !hasDepartments)
  ) {
    return res.status(400).json({ success: false, error: "Missing or invalid data" });
  }

  try {
    const existing = await prisma.quota.findUnique({
      where: { id: qid },
      include: {
        quotaRoles: { include: { role: true } },
        quotaDepartments: { include: { department: true } },
      },
    });

    if (!existing || String(existing.workspaceGroupId) !== String(req.query.id)) {
      return res.status(404).json({ success: false, error: "Quota not found" });
    }

    const updateData: any = {
      name,
      type,
      description: description || null,
    };
    if (!isCustom) {
      updateData.value = parsedValue;
    } else {
      updateData.value = null;
    }
    if (sessionType && !isCustom) {
      updateData.sessionType = sessionType;
    } else {
      updateData.sessionType = null;
    }

    await prisma.quota.update({
      where: { id: qid },
      data: updateData,
    });

    await prisma.quotaRole.deleteMany({ where: { quotaId: qid } });
    await prisma.quotaDepartment.deleteMany({ where: { quotaId: qid } });

    if (Array.isArray(roles) && roles.length > 0) {
      await prisma.quotaRole.createMany({
        data: roles.map((roleId: string) => ({
          quotaId: qid,
          roleId,
        })),
      });
    }
    if (Array.isArray(departments) && departments.length > 0) {
      await prisma.quotaDepartment.createMany({
        data: departments.map((departmentId: string) => ({
          quotaId: qid,
          departmentId,
        })),
      });
    }

    const fullQuota = await prisma.quota.findUnique({
      where: { id: qid },
      include: {
        quotaRoles: { include: { role: true } },
        quotaDepartments: { include: { department: true } },
      },
    });

    try {
      await logAudit(
        parseInt(req.query.id as string),
        (req as any).session?.userid || null,
        "activity.quota.update",
        `quota:${fullQuota?.id}`,
        {
          id: fullQuota?.id,
          name: fullQuota?.name,
          type: fullQuota?.type,
          value: fullQuota?.value,
          roles: (fullQuota?.quotaRoles || []).map((r: any) => (r.role ? r.role.name : r.roleId)),
          departments: (fullQuota?.quotaDepartments || []).map((d: any) => (d.department ? d.department.name : d.departmentId)),
        }
      );
    } catch (e) {}

    return res.status(200).json({
      success: true,
      quota: JSON.parse(
        JSON.stringify(fullQuota, (_key, value) => (typeof value === "bigint" ? value.toString() : value))
      ),
    });
  } catch (error) {
    console.error("Quota update error:", error);
    return res.status(500).json({ success: false, error: "Something went wrong" });
  }
}
