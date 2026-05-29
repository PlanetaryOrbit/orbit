import React, { FC } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import {
  IconChevronDown,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { workspacestate } from "@/state";
import { Role } from "noblox.js";
import { role } from "@/utils/database";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import axios from "axios";
import clsx from "clsx";

type Props = {
  setRoles: React.Dispatch<React.SetStateAction<role[]>>;
  roles: role[];
  grouproles: Role[];
};

const RolesManager: FC<Props> = ({ roles, setRoles, grouproles }) => {
  const [workspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = React.useState<
    Set<string>
  >(new Set());

  const sessionTypes = ["shift", "training", "event", "other"];
  const sessionSubcategories: Record<string, Record<string, string>> = {};

  const groles = Array.from(new Map(grouproles.map((r) => [r.rank, r])).values());

  const filteredRoles = groles.filter((gr) => gr.name !== "Guest");

  sessionTypes.forEach((type) => {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    sessionSubcategories[`${typeCapitalized}`] = {
      [`See ${typeCapitalized} Sessions`]: `sessions_${type}_see`,
      [`Assign others to ${typeCapitalized} Sessions`]: `sessions_${type}_assign`,
      [`Assign Self to ${typeCapitalized} Sessions`]: `sessions_${type}_claim`,
      [`Host ${typeCapitalized} Sessions`]: `sessions_${type}_host`,
      [`Create Unscheduled ${typeCapitalized}`]: `sessions_${type}_unscheduled`,
      [`Create Scheduled ${typeCapitalized}`]: `sessions_${type}_scheduled`,
      [`Manage ${typeCapitalized} Sessions`]: `sessions_${type}_manage`,
      [`Add Notes to ${typeCapitalized} Sessions`]: `sessions_${type}_notes`,
    };
  });

  const permissionCategories: Record<
    string,
    | Record<string, string>
    | { _subcategories: Record<string, Record<string, string>> }
  > = {
    Wall: {
      "View wall": "view_wall",
      "Post on wall": "post_on_wall",
      "Add photos to wall posts": "add_wall_photos",
      "Delete wall posts": "delete_wall_posts",
      "Edit sticky post": "edit_sticky_post",
    },
    Sessions: {
      _subcategories: sessionSubcategories,
    },
    Views: {
      "View members": "view_members",
      "Use saved views": "use_views",
      "Create views": "create_views",
      "Edit views": "edit_views",
      "Delete views": "delete_views",
    },
    Docs: {
      "Create docs": "create_docs",
      "Edit docs": "edit_docs",
      "Delete docs": "delete_docs",
    },
    Policies: {
      "Create policies": "create_policies",
      "Edit policies": "edit_policies",
      "Delete policies": "delete_policies",
      "View compliance": "view_compliance",
    },
    Notices: {
      "Create notices": "create_notices",
      "Approve notices": "approve_notices",
      "Manage notices": "manage_notices",
    },
    Resignations: {
      "Submit resignation": "submit_resignation",
      "Approve resignations": "approve_resignations",
      "Manage resignations": "manage_resignations",
    },
    Quotas: {
      "Create quotas": "create_quotas",
      "Delete quotas": "delete_quotas",
    },
    Members: {
      "Profiles - View": "view_member_profiles",
      "Info - Edit details": "edit_member_details",
      "Notices - Record approved": "record_notices",
      "Activity - Adjustments": "activity_adjustments",
      "Logbook - See Entries": "view_logbook",
      "Logbook - Redact Entries": "logbook_redact",
      "Logbook - Delete Entries": "logbook_delete",
      "Logbook - Note": "logbook_note",
      "Logbook - Warning": "logbook_warning",
      "Logbook - Promotion": "logbook_promotion",
      "Logbook - Demotion": "logbook_demotion",
      "Logbook - Termination": "logbook_termination",
      "Logbook - Use Ranking Integration": "rank_users",
    },
    Alliances: {
      "Create alliances": "create_alliances",
      "Delete alliances": "delete_alliances",
      "Represent alliance": "represent_alliance",
      "Edit alliance details": "edit_alliance_details",
      "Add notes": "add_alliance_notes",
      "Edit notes": "edit_alliance_notes",
      "Delete notes": "delete_alliance_notes",
      "Add visits": "add_alliance_visits",
      "Edit visits": "edit_alliance_visits",
      "Delete visits": "delete_alliance_visits",
    },
    Settings: {
      "Admin (Manage workspace)": "admin",
      "Reset activity": "reset_activity",
      "View audit logs": "view_audit_logs",
      "Create API keys": "manage_apikeys",
      "Manage features": "manage_features",
      "Workspace customisation": "workspace_customisation",
    },
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubcategory = (subcategory: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategory)) {
      newExpanded.delete(subcategory);
    } else {
      newExpanded.add(subcategory);
    }
    setExpandedSubcategories(newExpanded);
  };

  const toggleCategoryPermissions = (roleId: string, category: string) => {
    const index = roles.findIndex((role: any) => role.id === roleId);
    if (index === -1) return;

    const rroles = Object.assign([] as typeof roles, roles);
    if (rroles[index].isOwnerRole) {
      toast.error("Owner role permissions cannot be modified");
      return;
    }

    const categoryData =
      permissionCategories[category as keyof typeof permissionCategories];
    let categoryPerms: string[] = [];
    if (
      categoryData &&
      typeof categoryData === "object" &&
      "_subcategories" in categoryData
    ) {
      const subcats = (categoryData as any)._subcategories;
      categoryPerms = Object.values(subcats).flatMap((subcat: any) =>
        Object.values(subcat),
      );
    } else {
      categoryPerms = Object.values(categoryData as Record<string, string>);
    }

    const allChecked = categoryPerms.every((perm) =>
      rroles[index].permissions.includes(perm),
    );

    if (allChecked) {
      rroles[index].permissions = rroles[index].permissions.filter(
        (perm: any) => !categoryPerms.includes(perm),
      );
    } else {
      categoryPerms.forEach((perm) => {
        if (!rroles[index].permissions.includes(perm)) {
          rroles[index].permissions.push(perm);
        }
      });
    }
    setRoles(rroles);
  };

  const newRole = async () => {
    const res = await axios.post(
      "/api/workspace/" + workspace.groupId + "/settings/roles/new",
      {},
    );
    if (res.status === 200) {
      setRoles([...roles, res.data.role]);
      toast.success("New role created");
    }
  };

  const updateRole = async (value: string, id: string) => {
    const index = roles.findIndex((role: any) => role.id === id);
    if (index === null) return;
    const rroles = Object.assign([] as typeof roles, roles);

    if (rroles[index].isOwnerRole) {
      toast.error("Owner role name cannot be modified");
      const input = document.querySelector(
        `input[value="${value}"]`,
      ) as HTMLInputElement;
      if (input) input.value = rroles[index].name;
      return;
    }

    rroles[index].name = value;
    setRoles(rroles);
  };

  const updateRoleColor = async (color: string, id: string) => {
    const index = roles.findIndex((role: any) => role.id === id);
    if (index === null) return;
    const rroles = Object.assign([] as typeof roles, roles);
    rroles[index].color = color;
    setRoles(rroles);
  };

  const togglePermission = async (id: string, permission: string) => {
    const index = roles.findIndex((role: any) => role.id === id);
    if (index === null) return;
    const rroles = Object.assign([] as typeof roles, roles);

    if (rroles[index].isOwnerRole) {
      toast.error("Owner role permissions cannot be modified");
      return;
    }

    if (rroles[index].permissions.includes(permission)) {
      rroles[index].permissions = rroles[index].permissions.filter(
        (perm: any) => perm !== permission,
      );
    } else {
      rroles[index].permissions.push(permission);
    }
    setRoles(rroles);
  };

  const toggleGroupRole = async (id: string, role: Role) => {
    const index = roles.findIndex((r: any) => r.id === id);
    if (index === null) return;
    const rroles = Object.assign([] as typeof roles, roles);

    if (rroles[index].isOwnerRole) {
      toast.error("Owner role group assignments cannot be modified.");
      return;
    }

    const roleIdStr = String(role.id);

    if (rroles[index].groupRoles.map(String).includes(roleIdStr)) {
      rroles[index].groupRoles = rroles[index].groupRoles.filter(
        (r) => String(r) !== roleIdStr,
      );
    } else {
      if (aroledoesincludegrouprole(id, role)) {
        toast.error(`This rank is already assigned to another role.`);
        return;
      }
      rroles[index].groupRoles.push(roleIdStr as any);
    }
    setRoles(rroles);
  };

  const saveRole = async (id: string) => {
    const index = roles.findIndex((r: any) => r.id === id);
    if (index === -1) return;
    const payload = {
      name: roles[index].name,
      permissions: roles[index].permissions,
      groupRoles: roles[index].groupRoles,
      color: roles[index].color,
    };
    try {
      await axios.post(
        `/api/workspace/${workspace.groupId}/settings/roles/${id}/update`,
        payload,
      );
      toast.success("Role saved!");
    } catch (e) {
      toast.error("Failed to save role.");
    }
  };

  const checkRoles = async () => {
    try {
      const keyres = await axios.get(
        `/api/workspace/${workspace.groupId}/settings/general/roblox/key`,
      );

      if (!keyres.data.success) {
        return toast.error("An error occurred while checking your API key");
      }

      const { enabled, keySet } = keyres.data.value;

      if (!enabled) {
        return toast.error("Open Cloud API key is not configured");
      }

      if (!keySet) {
        return toast.error("Open Cloud API key cannot be empty.");
      }
    } catch (err) {
      console.log(err);
      return toast.error("An error occurred while checking your API key");
    }

    const res = axios.post(
      `/api/workspace/${workspace.groupId}/settings/roles/checkgrouproles`,
    );
    toast.promise(res, {
      loading: "Checking roles...",
      success: "Roles updated!",
      error: "Error updating roles",
    });
  };

  const deleteRole = async (id: string) => {
    const res = axios
      .post(`/api/workspace/${workspace.groupId}/settings/roles/${id}/delete`)
      .then(() => {
        router.reload();
      });
    toast.promise(res, {
      loading: "Deleting role...",
      success: "Role deleted!",
      error: "Error deleting role",
    });
  };

  const aroledoesincludegrouprole = (id: string, role: Role) => {
    const rs = roles.filter((r: any) => r.id !== id);
    const roleIdStr = String(role.id);
    for (let i = 0; i < rs.length; i++) {
      if (rs[i].groupRoles.map(String).includes(roleIdStr)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/40 dark:bg-zinc-900/25 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Roles
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Create roles, pick a color, and control what each role can access.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={newRole}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm whitespace-nowrap w-full sm:w-auto"
            >
              <IconPlus size={16} className="mr-1.5 shrink-0" />
              Add Role
            </button>
            <button
              type="button"
              onClick={checkRoles}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80 transition-colors whitespace-nowrap w-full sm:w-auto"
            >
              <IconRefresh size={16} className="mr-1.5 shrink-0" />
              Sync Groups
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {roles.map((role) => (
          <Disclosure
            as="div"
            key={role.id}
            className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 shadow-sm"
          >
            {({ open }) => (
              <>
                <Disclosure.Button className="w-full px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 rounded-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {role.name}
                      </span>
                      {role.isOwnerRole && (
                        <span className="inline-flex shrink-0 items-center rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Owner
                        </span>
                      )}
                    </div>
                    <span
                      className={clsx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50 text-zinc-500 transition-transform dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400",
                        open && "rotate-180",
                      )}
                    >
                      <IconChevronDown className="h-4 w-4" stroke={2} />
                    </span>
                  </div>
                </Disclosure.Button>

                <Transition
                  enter="transition duration-100 ease-out"
                  enterFrom="transform scale-95 opacity-0"
                  enterTo="transform scale-100 opacity-100"
                  leave="transition duration-75 ease-out"
                  leaveFrom="transform scale-100 opacity-100"
                  leaveTo="transform scale-95 opacity-0"
                >
                  <Disclosure.Panel className="border-t border-zinc-100 px-4 pb-4 pt-1 dark:border-zinc-700/80">
                    <div className="space-y-5 pt-4">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Role name
                        </label>
                        <input
                          type="text"
                          placeholder="Role name"
                          value={role.name}
                          onChange={(e) => updateRole(e.target.value, role.id)}
                          disabled={role.isOwnerRole === true}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
                        />
                        {role.isOwnerRole === true && (
                          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Owner role name cannot be changed
                          </p>
                        )}
                      </div>

                      <div>
                        <h4 className="mb-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          Role color
                        </h4>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-600"
                            value={role.color || "#6b7280"}
                            onChange={(e) =>
                              updateRoleColor(e.target.value, role.id)
                            }
                          />
                          <input
                            type="text"
                            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                            value={role.color || "#6b7280"}
                            onChange={(e) =>
                              updateRoleColor(e.target.value, role.id)
                            }
                            placeholder="#6b7280"
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                          Permissions
                        </h4>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          Manage the permissions assigned to this role
                        </p>
                        <div className="mt-3 space-y-2">
                          {Object.entries(permissionCategories).map(
                            ([category, perms]) => {
                              const isExpanded =
                                expandedCategories.has(category);
                              const hasSubcategories =
                                perms &&
                                typeof perms === "object" &&
                                "_subcategories" in perms;
                              let categoryPerms: string[] = [];

                              if (hasSubcategories) {
                                const subcats = (perms as any)._subcategories;
                                categoryPerms = Object.values(subcats).flatMap(
                                  (subcat: any) => Object.values(subcat),
                                );
                              } else {
                                categoryPerms = Object.values(
                                  perms as Record<string, string>,
                                );
                              }

                              const allChecked = categoryPerms.every((perm) =>
                                role.permissions.includes(perm),
                              );
                              const someChecked = categoryPerms.some((perm) =>
                                role.permissions.includes(perm),
                              );

                              return (
                                <div
                                  key={category}
                                  className="overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-50/50 dark:border-zinc-700/60 dark:bg-zinc-900/35"
                                >
                                  <div className="flex items-center gap-2 px-3 py-2.5">
                                    <input
                                      type="checkbox"
                                      checked={allChecked}
                                      ref={(el) => {
                                        if (el)
                                          el.indeterminate =
                                            someChecked && !allChecked;
                                      }}
                                      onChange={() =>
                                        toggleCategoryPermissions(
                                          role.id,
                                          category,
                                        )
                                      }
                                      disabled={role.isOwnerRole === true}
                                      className="h-4 w-4 shrink-0 rounded border-zinc-300 text-primary focus:ring-primary/40 dark:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => toggleCategory(category)}
                                      className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                                    >
                                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                        {category}
                                      </span>
                                      <span
                                        className={clsx(
                                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-white text-zinc-500 transition-transform dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                                          isExpanded && "rotate-180",
                                        )}
                                      >
                                        <IconChevronDown
                                          className="h-3.5 w-3.5"
                                          stroke={2}
                                        />
                                      </span>
                                    </button>
                                  </div>
                                  {isExpanded && (
                                    <div className="space-y-2 border-t border-zinc-200/60 bg-white px-3 py-3 dark:border-zinc-700/60 dark:bg-zinc-800/50">
                                      {hasSubcategories
                                        ? Object.entries(
                                            (perms as any)._subcategories,
                                          ).map(
                                            ([subcat, subPerms]: [
                                              string,
                                              any,
                                            ]) => {
                                              const subcatKey = `${category}-${subcat}`;
                                              const isSubExpanded =
                                                expandedSubcategories.has(
                                                  subcatKey,
                                                );
                                              const subcatPerms =
                                                Object.values(subPerms);
                                              const allSubChecked =
                                                subcatPerms.every((perm: any) =>
                                                  role.permissions.includes(
                                                    perm,
                                                  ),
                                                );
                                              const someSubChecked =
                                                subcatPerms.some((perm: any) =>
                                                  role.permissions.includes(
                                                    perm,
                                                  ),
                                                );

                                              return (
                                                <div
                                                  key={subcat}
                                                  className="ml-3 overflow-hidden rounded-lg border border-zinc-200/80 dark:border-zinc-700/70 sm:ml-4"
                                                >
                                                  <div className="flex items-center gap-2 bg-zinc-100/80 px-3 py-2 dark:bg-zinc-900/70">
                                                    <input
                                                      type="checkbox"
                                                      checked={allSubChecked}
                                                      ref={(el) => {
                                                        if (el)
                                                          el.indeterminate =
                                                            someSubChecked &&
                                                            !allSubChecked;
                                                      }}
                                                      onChange={() => {
                                                        const index =
                                                          roles.findIndex(
                                                            (r: any) =>
                                                              r.id === role.id,
                                                          );
                                                        if (
                                                          index === -1 ||
                                                          role.isOwnerRole
                                                        )
                                                          return;
                                                        const rroles =
                                                          Object.assign(
                                                            [] as typeof roles,
                                                            roles,
                                                          );
                                                        const allChecked =
                                                          subcatPerms.every(
                                                            (perm: any) =>
                                                              rroles[
                                                                index
                                                              ].permissions.includes(
                                                                perm,
                                                              ),
                                                          );
                                                        if (allChecked) {
                                                          rroles[
                                                            index
                                                          ].permissions =
                                                            rroles[
                                                              index
                                                            ].permissions.filter(
                                                              (perm: any) =>
                                                                !subcatPerms.includes(
                                                                  perm,
                                                                ),
                                                            );
                                                        } else {
                                                          subcatPerms.forEach(
                                                            (perm: any) => {
                                                              if (
                                                                !rroles[
                                                                  index
                                                                ].permissions.includes(
                                                                  perm,
                                                                )
                                                              ) {
                                                                rroles[
                                                                  index
                                                                ].permissions.push(
                                                                  perm,
                                                                );
                                                              }
                                                            },
                                                          );
                                                        }
                                                        setRoles(rroles);
                                                      }}
                                                      disabled={
                                                        role.isOwnerRole ===
                                                        true
                                                      }
                                                      className="h-4 w-4 shrink-0 rounded border-zinc-300 text-primary focus:ring-primary/40 dark:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        toggleSubcategory(
                                                          subcatKey,
                                                        )
                                                      }
                                                      className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
                                                    >
                                                      <span className="text-xs font-medium text-zinc-900 dark:text-white">
                                                        {subcat} Sessions
                                                      </span>
                                                      <span
                                                        className={clsx(
                                                          "flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-200/80 bg-white text-zinc-500 transition-transform dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                                                          isSubExpanded &&
                                                            "rotate-180",
                                                        )}
                                                      >
                                                        <IconChevronDown
                                                          className="h-3 w-3"
                                                          stroke={2}
                                                        />
                                                      </span>
                                                    </button>
                                                  </div>
                                                  {isSubExpanded && (
                                                    <div className="space-y-1.5 border-t border-zinc-200/60 px-3 py-2 dark:border-zinc-700/60">
                                                      {Object.entries(
                                                        subPerms,
                                                      ).map(
                                                        ([label, value]: [
                                                          string,
                                                          any,
                                                        ]) => (
                                                          <label
                                                            key={value}
                                                            className="flex cursor-pointer items-center gap-2.5 pl-4"
                                                          >
                                                            <input
                                                              type="checkbox"
                                                              checked={role.permissions.includes(
                                                                value,
                                                              )}
                                                              onChange={() =>
                                                                togglePermission(
                                                                  role.id,
                                                                  value,
                                                                )
                                                              }
                                                              disabled={
                                                                role.isOwnerRole ===
                                                                true
                                                              }
                                                              className="h-4 w-4 shrink-0 rounded border-zinc-300 text-primary focus:ring-primary/40 dark:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                            />
                                                            <span className="text-xs text-zinc-700 dark:text-zinc-200">
                                                              {label}
                                                            </span>
                                                          </label>
                                                        ),
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            },
                                          )
                                        : Object.entries(
                                            perms as Record<string, string>,
                                          ).map(([label, value]) => (
                                            <label
                                              key={value}
                                              className="flex cursor-pointer items-center gap-2.5 pl-1"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={role.permissions.includes(
                                                  value,
                                                )}
                                                onChange={() =>
                                                  togglePermission(
                                                    role.id,
                                                    value,
                                                  )
                                                }
                                                disabled={
                                                  role.isOwnerRole === true
                                                }
                                                className="h-4 w-4 shrink-0 rounded border-zinc-300 text-primary focus:ring-primary/40 dark:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                                              />
                                              <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                                {label}
                                              </span>
                                            </label>
                                          ))}
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                        {role.isOwnerRole === true && (
                          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                            Owner role permissions are automatically managed
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/40 p-4 dark:border-zinc-700/60 dark:bg-zinc-900/25">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                          Group-synced roles
                        </h4>
                        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                          Each rank can only be assigned to one role
                        </p>
                        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                          {filteredRoles.map((groupRole) => {
                            const isAssignedElsewhere =
                              aroledoesincludegrouprole(role.id, groupRole);
                            return (
                              <label
                                key={groupRole.id}
                                className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent px-1 py-0.5 hover:border-zinc-200/80 hover:bg-white/80 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={role.groupRoles
                                      .map(String)
                                      .includes(String(groupRole.id))}
                                    onChange={() =>
                                      toggleGroupRole(role.id, groupRole)
                                    }
                                    disabled={
                                      role.isOwnerRole === true ||
                                      isAssignedElsewhere
                                    }
                                    className="h-4 w-4 shrink-0 rounded border-zinc-300 text-primary focus:ring-primary/40 dark:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <span
                                    className={clsx(
                                      "truncate text-sm",
                                      isAssignedElsewhere
                                        ? "text-zinc-400 dark:text-zinc-500"
                                        : "text-zinc-700 dark:text-zinc-200",
                                    )}
                                  >
                                    {groupRole.name}{" "}
                                    <span className="text-zinc-400 dark:text-zinc-500">
                                      (rank: {groupRole.rank})
                                    </span>
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {role.isOwnerRole === true && (
                          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                            Owner role group synchronization is disabled
                          </p>
                        )}
                      </div>

                      {!role.isOwnerRole && (
                        <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-700/80 sm:flex-row sm:items-center">
                          <button
                            type="button"
                            onClick={() => saveRole(role.id)}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            Save changes
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRole(role.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <IconTrash size={16} className="shrink-0" />
                            Delete role
                          </button>
                        </div>
                      )}
                    </div>
                  </Disclosure.Panel>
                </Transition>
              </>
            )}
          </Disclosure>
        ))}
      </div>
    </div>
  );
};

export default RolesManager;
