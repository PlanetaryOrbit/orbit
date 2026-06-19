/**
 * Orbit Forms
 * Licensed under GPL-3.0 (see LICENSE for details)
 *
 * Helpers to make life easier in the other scripts
 *
 *
 * @module api/forms
 * @author BuddyWinte
 * @since 2.1.10-beta20
 */

type Permission = string;
interface Role {
  permissions: Permission[];
}
interface UserWithRoles {
  roles: Role[];
}

/**
 * Checks if a user has a given permission.
 *
 * Supports:
 * - Exact matches: "Form.View"
 * - Wildcards: "Form.*"
 * 
 * @returns true if the user has permissions
 * @returns false if the user doesn't have permissions
 * @readonly
 */
export function hasPerms(
  user: UserWithRoles,
  permission: string
): boolean {
  if (!user?.roles?.length) return false;
  for (const role of user.roles) {
    if (!role?.permissions?.length) continue;

    for (const perm of role.permissions) {
      if (perm === permission) return true;
      if (perm.endsWith(".*")) {
        const prefix = perm.slice(0,-2);
        if (permission.startsWith(prefix + ".")) {
          return true;
        }
      }
    }
  }

  return false;
}