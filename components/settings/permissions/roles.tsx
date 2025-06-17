import React, { FC } from "react";
import { Disclosure, Transition } from "@headlessui/react";
import { IconChevronDown, IconPlus, IconRefresh, IconTrash } from "@tabler/icons";
import Btn from "@/components/button";
import { workspacestate } from "@/state";
import { Role } from "noblox.js";
import { role } from "@/utils/database";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import toast, { Toaster } from 'react-hot-toast';
import axios from "axios";
import clsx from 'clsx';

type Props = {
	setRoles: React.Dispatch<React.SetStateAction<role[]>>;
	roles: role[];
	grouproles: Role[];
};

const RolesManager: FC<Props> = ({ roles, setRoles, grouproles }) => {
	const [workspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const permissions = {
		"Post on wall": "post_on_wall",
		"View members": "view_members",
		'View all activity': 'view_entire_groups_activity',
		'Represent alliance': 'represent_alliance',
		"Manage wall": "manage_wall",
		'Manage alliances': 'manage_alliances',
		"Manage docs": "manage_docs",
		"Manage sessions": "manage_sessions",
		"Manage activity & staff": "manage_activity",
		"Admin (Manage workspace)": "admin",
	};

	const newRole = async () => {
		const res = await axios.post(
			"/api/workspace/" + workspace.groupId + "/settings/roles/new",
			{}
		);
		if (res.status === 200) {
			setRoles([...roles, res.data.role]);
			toast.success('New role created');
		}
	};

	const updateRole = async (value: string, id: string) => {
		const index = roles.findIndex((role: any) => role.id === id);
		if (index === null) return;
		const rroles = Object.assign(([] as typeof roles), roles);
		rroles[index].name = value;
		setRoles(rroles);
		await axios.post(
			`/api/workspace/${workspace.groupId}/settings/roles/${id}/update`,
			{ name: value, permissions: rroles[index].permissions, groupRoles: rroles[index].groupRoles }
		);
	};

	const togglePermission = async (id: string, permission: string) => {
		const index = roles.findIndex((role: any) => role.id === id);
		if (index === null) return;
		const rroles = Object.assign(([] as typeof roles), roles);
		if (rroles[index].permissions.includes(permission)) {
			rroles[index].permissions = rroles[index].permissions.filter(
				(perm: any) => perm !== permission
			);
		} else {
			rroles[index].permissions.push(permission);
		}
		setRoles(rroles);

		await axios.post(
			`/api/workspace/${workspace.groupId}/settings/roles/${id}/update`,
			{ name: rroles[index].name, permissions: rroles[index].permissions, groupRoles: rroles[index].groupRoles }
		);
	};

	const toggleGroupRole = async (id: string, role: Role) => {
		const index = roles.findIndex((role: any) => role.id === id);
		if (index === null) return;
		const rroles = Object.assign(([] as typeof roles), roles);
		if (rroles[index].groupRoles.includes(role.id)) {
			rroles[index].groupRoles = rroles[index].groupRoles.filter((r) => r !== role.id);
		} else {
			rroles[index].groupRoles.push(role.id);
		}
		setRoles(rroles);
		await axios.post(
			`/api/workspace/${workspace.groupId}/settings/roles/${id}/update`,
			{ name: rroles[index].name, permissions: rroles[index].permissions, groupRoles: rroles[index].groupRoles }
		);
	};

	const checkRoles = async () => {
		const res = axios.post(
			`/api/workspace/${workspace.groupId}/settings/roles/checkgrouproles`
		);
		toast.promise(res, {
			loading: 'Checking roles...',
			success: 'Roles updated!',
			error: 'Error updating roles'
		});
	};

	const deleteRole = async (id: string) => {
		const res = axios.post(
			`/api/workspace/${workspace.groupId}/settings/roles/${id}/delete`
		).then(() => {
			router.reload();
		});
		toast.promise(res, {
			loading: 'Deleting role...',
			success: 'Role deleted!',
			error: 'Error deleting role'
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
				<h3 className="text-lg font-medium text-gray-900 dark:text-white">Roles</h3>
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
						className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
					>
						<IconRefresh size={16} className="mr-1.5" />
						Sync Group Roles
					</button>
				</div>
			</div>

			<div className="space-y-3">
				{roles.map((role) => (
					<Disclosure
						as="div"
						key={role.id}
						className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
					>
						{({ open }) => (
							<>
								<Disclosure.Button
									className="w-full px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
								>
									<div className="flex items-center justify-between">
										<span className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</span>
										<IconChevronDown
											className={clsx(
												"w-5 h-5 text-gray-500 transition-transform",
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
													className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
												/>
											</div>

											<div>
												<h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Permissions</h4>
												<div className="space-y-2">
													{Object.entries(permissions).map(([label, value]) => (
														<label key={value} className="flex items-center space-x-2">
															<input
																type="checkbox"
																checked={role.permissions.includes(value)}
																onChange={() => togglePermission(role.id, value)}
																className="w-4 h-4 rounded text-primary border-gray-300 dark:border-gray-600 focus:ring-primary/50"
															/>
															<span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
														</label>
													))}
												</div>
											</div>

											<div>
												<h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Group-synced roles</h4>
												<div className="space-y-2">
													{grouproles.map((groupRole) => (
														<label key={groupRole.id} className="flex items-center space-x-2">
															<input
																type="checkbox"
																checked={role.groupRoles.includes(groupRole.id)}
																onChange={() => toggleGroupRole(role.id, groupRole)}
																disabled={aroledoesincludegrouprole(role.id, groupRole)}
																className="w-4 h-4 rounded text-primary border-gray-300 dark:border-gray-600 focus:ring-primary/50 disabled:opacity-50"
															/>
															<span className="text-sm text-gray-700 dark:text-gray-200">{groupRole.name}</span>
														</label>
													))}
												</div>
											</div>

											<button
												onClick={() => deleteRole(role.id)}
												className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors"
											>
												<IconTrash size={16} className="mr-1.5" />
												Delete Role
											</button>
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
