import React, { FC } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import {
  IconChevronDown,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import Btn from "@/components/button";
import { workspacestate } from "@/state";
import { Role } from "noblox.js";
import { role } from "@/utils/database";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import toast, { Toaster } from "react-hot-toast";
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
  const permissions = {
    "View wall": "view_wall",
    "View members": "view_members",
    "View Activity History": "view_entire_groups_activity",
    "Create notices": "create_notices",
    "Post on wall": "post_on_wall",
    "Represent alliance": "represent_alliance",
    "Assign users to Sessions": "sessions_assign",
    "Assign Self to Sessions": "sessions_claim",
    "Host/Co-Host Sessions": "sessions_host",
    "Create Unscheduled Sessions": "sessions_unscheduled",
    "Create Scheduled Sessions": "sessions_scheduled",
    "Manage sessions": "manage_sessions",
    "Manage activity": "manage_activity",
    "Manage notices": "manage_notices",
    "Manage quotas": "manage_quotas",
    "Manage members": "manage_members",
    "Manage docs": "manage_docs",
    "Manage policies": "manage_policies",
    "Manage views": "manage_views",
    "Manage alliances": "manage_alliances",
    "Admin (Manage workspace)": "admin",
  };

  const newRole = async () => {
    const res = await axios.post(
      "/api/workspace/" + workspace.groupId + "/settings/roles/new",
      {}
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
        `input[value="${value}"]`
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
        (perm: any) => perm !== permission
      );
    } else {
      rroles[index].permissions.push(permission);
    }
    setRoles(rroles);
  };

  const toggleGroupRole = async (id: string, role: Role) => {
    const index = roles.findIndex((role: any) => role.id === id);
    if (index === null) return;
    const rroles = Object.assign([] as typeof roles, roles);

    if (rroles[index].isOwnerRole) {
      toast.error("Owner role group assignments cannot be modified.");
      return;
    }

    if (rroles[index].groupRoles.includes(role.id)) {
      rroles[index].groupRoles = rroles[index].groupRoles.filter(
        (r) => r !== role.id
      );
    } else {
      if (aroledoesincludegrouprole(id, role)) {
        const assignedRole = roles.find(
          (r) => r.id !== id && r.groupRoles.includes(role.id)
        );
        toast.error(`This rank is already assigned to another role.`);
        return;
      }
      rroles[index].groupRoles.push(role.id);
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
        payload
      );
      toast.success("Role saved!");
    } catch (e) {
      toast.error("Failed to save role.");
    }
  };

  const checkRoles = async () => {
    const res = axios.post(
      `/api/workspace/${workspace.groupId}/settings/roles/checkgrouproles`
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
    const rs = roles.filter((role: any) => role.id !== id);
    for (let i = 0; i < rs.length; i++) {
      if (rs[i].groupRoles.includes(role.id)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
          Roles
        </h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={newRole}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
          >
            <IconPlus size={16} className="mr-1.5" />
            Add Role
          </button>
          <button
            onClick={checkRoles}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors"
          >
            <IconRefresh size={16} className="mr-1.5" />
            Sync Group
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {roles.map((role) => (
          <Disclosure
            as="div"
            key={role.id}
            className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm"
          >
            {({ open }) => (
              <>
                <Disclosure.Button className="w-full px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {role.name}
                      </span>
                      {role.isOwnerRole && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          Owner
                        </span>
                      )}
                    </div>
                    <IconChevronDown
                      className={clsx(
                        "w-5 h-5 text-zinc-500 transition-transform",
                        open ? "transform rotate-180" : ""
                      )}
                    />
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
                  <Disclosure.Panel className="px-4 pb-4">
                    <div className="space-y-4">
                      <div>
                        <input
                          type="text"
                          placeholder="Role name"
                          value={role.name}
                          onChange={(e) => updateRole(e.target.value, role.id)}
                          disabled={role.isOwnerRole === true}
                          className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        {role.isOwnerRole === true && (
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Owner role name cannot be changed
                          </p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                          Role Color
                        </h4>
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            className="w-12 h-8 rounded border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                            value={role.color || "#6b7280"}
                            onChange={(e) => updateRoleColor(e.target.value, role.id)}
                          />
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            value={role.color || "#6b7280"}
                            onChange={(e) => updateRoleColor(e.target.value, role.id)}
                            placeholder="#6b7280"
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                          Permissions
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                          Manage the permissions assigned to this role
                        </p>
                        <div className="space-y-2">
                          {Object.entries(permissions).map(([label, value]) => (
                            <label
                              key={value}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                checked={role.permissions.includes(value)}
                                onChange={() =>
                                  togglePermission(role.id, value)
                                }
                                disabled={role.isOwnerRole === true}
                                className="w-4 h-4 rounded text-primary border-gray-300 dark:border-zinc-600 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                {label}
                              </span>
                            </label>
                          ))}
                        </div>
                        {role.isOwnerRole === true && (
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Owner role permissions are automatically managed
                          </p>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                          Group-synced roles
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                          Each rank can only be assigned to one role
                        </p>
                        <div className="space-y-2">
                          {grouproles.map((groupRole) => {
                            const isAssignedElsewhere =
                              aroledoesincludegrouprole(role.id, groupRole);
                            const assignedRole = isAssignedElsewhere
                              ? roles.find(
                                  (r) =>
                                    r.id !== role.id &&
                                    r.groupRoles.includes(groupRole.id)
                                )
                              : null;
                            return (
                              <label
                                key={groupRole.id}
                                className="flex items-center justify-between space-x-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={role.groupRoles.includes(
                                      groupRole.id
                                    )}
                                    onChange={() =>
                                      toggleGroupRole(role.id, groupRole)
                                    }
                                    disabled={
                                      role.isOwnerRole === true ||
                                      isAssignedElsewhere
                                    }
                                    className="w-4 h-4 rounded text-primary border-gray-300 dark:border-zinc-600 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span
                                    className={clsx(
                                      "text-sm",
                                      isAssignedElsewhere
                                        ? "text-zinc-400 dark:text-zinc-500"
                                        : "text-zinc-700 dark:text-zinc-200"
                                    )}
                                  >
                                    {groupRole.name}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {role.isOwnerRole === true && (
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Owner role group synchronization is disabled
                          </p>
                        )}
                      </div>

                      {!role.isOwnerRole && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveRole(role.id)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => deleteRole(role.id)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
                          >
                            <IconTrash size={16} className="mr-1.5" />
                            Delete Role
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
      <Toaster position="bottom-center" />
    </div>
  );
};

export default RolesManager;