import React, { FC } from "react";
import { Disclosure, Transition, Listbox } from "@headlessui/react";
import { IconCheck, IconChevronDown, IconPlus, IconUser } from "@tabler/icons";
import { workspacestate } from "@/state";
import { useForm, FormProvider } from "react-hook-form";
import { role } from "@/utils/database";
import { useRecoilState } from "recoil";
import Input from "@/components/input";
import axios from "axios";
import clsx from 'clsx';

type Props = {
	users: any[];
	roles: role[];
};

type form = {
	username: string;
};

const Button: FC<Props> = (props) => {
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const [users, setUsers] = React.useState(props.users);
	const userForm = useForm<form>();
	const { roles } = props;

	const updateRole = async (id: number, roleid: string) => {
		const user = users.findIndex((user: any) => user.userid === id);
		if (!user) return;
		const usi = users;
		const role = roles.find((role: any) => role.id === roleid);
		if (!role) return;
		usi[user].roles = [role];
		setUsers([...usi]);
		await axios.post(
			`/api/workspace/${workspace.groupId}/settings/users/${id}/update`,
			{ role: role.id }
		);
	};

	const removeUser = async (id: number) => {
		const user = users.find((user: any) => user.userid === id);
		if (!user) return;
		setUsers(users.filter((user: any) => user.userid !== id));
		await axios.delete(`/api/workspace/${workspace.groupId}/settings/users/${id}/remove`);
	};

	const addUser = async () => {
		const user = await axios.post(`/api/workspace/${workspace.groupId}/settings/users/add`, {
			username: userForm.getValues().username,
		}).catch(err => {
			userForm.setError("username", { type: "custom", message: err.response.data.error })
		});
		if (!user) return;
		userForm.clearErrors()
		setUsers([...users, user.data.user]);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium text-gray-900 dark:text-white">Users</h3>
				<div className="flex items-center space-x-3">
					<FormProvider {...userForm}>
						<div className="flex items-center space-x-2">
							<Input
								{...userForm.register("username")}
								label=""
								placeholder="Enter username"
								classoverride="w-48 py-1.5 text-sm"
							/>
							<button
								onClick={addUser}
								className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
							>
								<IconPlus size={16} className="mr-1.5" />
								Add User
							</button>
						</div>
					</FormProvider>
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
										<div className="flex items-center space-x-2">
											<span className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</span>
											<span className="text-xs text-gray-500 dark:text-gray-400">
												({users.filter((user: any) => user.roles[0].id === role.id).length} users)
											</span>
										</div>
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
										{users.filter((user: any) => user.roles[0].id === role.id).length > 100 ? (
											<p className="text-sm text-gray-500 dark:text-gray-400">
												Too many users to display (max 100)
											</p>
										) : (
											<div className="space-y-2">
												{users.filter((user: any) => user.roles[0].id === role.id).map((user: any) => (
													<div
														key={user.userid}
														className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
													>
														<div className="flex items-center space-x-3">
															<img
																src={user.thumbnail}
																alt={user.displayName}
																className="w-10 h-10 rounded-full"
															/>
															<div>
																<p className="text-sm font-medium text-gray-900 dark:text-white">
																	{user.displayName}
																</p>
																<p className="text-xs text-gray-500 dark:text-gray-400">
																	@{user.username}
																</p>
															</div>
														</div>

														<Listbox
															value={user.roles[0].id}
															onChange={(value) => updateRole(user.userid, value)}
														>
															<div className="relative">
																<Listbox.Button className="relative w-40 py-2 pl-3 pr-10 text-left dark:text-white bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50">
																	<span className="block truncate text-sm">
																		{user.roles[0].name}
																	</span>
																	<span className="absolute inset-y-0 right-0 flex items-center pr-2">
																		<IconChevronDown className="w-5 h-5 text-gray-400" />
																	</span>
																</Listbox.Button>
																<Transition
																	as={React.Fragment}
																	leave="transition ease-in duration-100"
																	leaveFrom="opacity-100"
																	leaveTo="opacity-0"
																>
																	<Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none">
																		{workspace.roles.map((role) => (
																			<Listbox.Option
																				key={role.id}
																				value={role.id}
																				className={({ active }) =>
																					clsx(
																						"relative cursor-pointer select-none py-2 pl-10 pr-4",
																						active
																							? "bg-primary/10 text-primary"
																							: "text-gray-900 dark:text-gray-100"
																					)
																				}
																			>
																				{({ selected }) => (
																					<>
																						<span className="block truncate text-sm dark:text-white">
																							{role.name}
																						</span>
																						{selected ? (
																							<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary dark:text-white">
																								<IconCheck className="w-5 h-5" />
																							</span>
																						) : null}
																					</>
																				)}
																			</Listbox.Option>
																		))}
																	</Listbox.Options>
																</Transition>
															</div>
														</Listbox>
													</div>
												))}
											</div>
										)}
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

export default Button;
