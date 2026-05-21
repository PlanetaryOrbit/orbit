import clsx from "clsx";
import { IconLock } from "@tabler/icons-react";
import { DocsPanel, docsPanelShadow } from "./shell";

type Role = { id: string; name: string; color?: string | null };
type Department = { id: string; name: string; color?: string | null };

export function AccessControlPanel({
  roles,
  departments,
  selectedRoles,
  selectedDepartments,
  onToggleRole,
  onToggleDepartment,
  disabled,
  className,
  variant = "panel",
}: {
  roles: Role[];
  departments: Department[];
  selectedRoles: string[];
  selectedDepartments: string[];
  onToggleRole: (roleId: string) => void;
  onToggleDepartment: (departmentId: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "panel" | "sidebar";
}) {
  const checkboxClass =
    "h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/40 dark:border-zinc-600";

  const content = (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Roles
        </p>
        <div className="space-y-0.5">
          {roles.map((role) => (
            <label
              key={role.id}
              className={clsx(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                selectedRoles.includes(role.id)
                  ? "bg-primary/5 dark:bg-primary/10"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                disabled && "pointer-events-none opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.id)}
                onChange={() => onToggleRole(role.id)}
                disabled={disabled}
                className={checkboxClass}
              />
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: role.color || "#71717a" }}
              />
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                {role.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Departments
        </p>
        {departments.length > 0 ? (
          <div className="space-y-0.5">
            {departments.map((department) => (
              <label
                key={department.id}
                className={clsx(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                  selectedDepartments.includes(department.id)
                    ? "bg-primary/5 dark:bg-primary/10"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                  disabled && "pointer-events-none opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedDepartments.includes(department.id)}
                  onChange={() => onToggleDepartment(department.id)}
                  disabled={disabled}
                  className={checkboxClass}
                />
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: department.color || "#71717a" }}
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                  {department.name}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400">None yet</p>
        )}
      </div>

      {selectedRoles.length === 0 && selectedDepartments.length === 0 && (
        <p className="text-[11px] leading-relaxed text-zinc-400">
          Empty = visible to everyone
        </p>
      )}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div
        className={clsx(
          "rounded-2xl bg-white p-4 dark:bg-zinc-900/80",
          docsPanelShadow,
          className
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <IconLock className="h-3.5 w-3.5 text-zinc-400" stroke={1.75} />
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            Permissions
          </p>
        </div>
        {content}
      </div>
    );
  }

  return (
    <DocsPanel className={clsx("p-4 sm:p-5 lg:sticky lg:top-6", className)}>
      <div className="mb-4 flex items-center gap-2">
        <IconLock className="h-4 w-4 text-primary" stroke={1.75} />
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Access control
          </h2>
          <p className="text-xs text-zinc-400">Who can view this document</p>
        </div>
      </div>
      {content}
    </DocsPanel>
  );
}
