import axios from "axios";
import React, { useEffect } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { Listbox, Transition } from "@headlessui/react";
import { IconCheck } from "@tabler/icons";
import { IconChevronDown } from "@tabler/icons";
import Button from "@/components/button";
import { useRouter } from "next/router";


import { FC } from '@/types/settingsComponent'

type props = {
	triggerToast: typeof toast;

}

const Activity: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const [roles, setRoles] = React.useState([]);
	const [selectedRole, setSelectedRole] = React.useState<number>();
	const router = useRouter();


	useEffect(() => {
		(async () => {
			const res = await axios.get(`/api/workspace/${router.query.id}/settings/activity/getConfig`);
			if (res.status === 200) {
				setRoles(res.data.roles);
				setSelectedRole(res.data.currentRole);
			}
		})();
	}, []);


	const downloadLoader = async () => {
		window.open(`/api/workspace/${router.query.id}/settings/activity/download`);
	};

	const updateRole = async (id: number) => {
		const req = await axios.post(`/api/workspace/${workspace.groupId}/settings/activity/setRole`, { role: id });
		if (req.status === 200) {
			setSelectedRole((roles.find((role: any) => role.rank === id) as any).rank);
			triggerToast.success("Updated role");
		}
	}


	return (
		<div className="relative z-15">
			<p className="mb-2 z-15 dark:text-gray-400"> Sessions are a powerful way to keep track of your groups sessions & shifts</p>
			<Listbox value={selectedRole} onChange={(value: number) => updateRole(value)} as="div" className="relative inline-block w-full text-left mb-2">
				<Listbox.Button className="z-10 h-auto w-full flex flex-row rounded-xl py-1 hover:bg-gray-200 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800 px-2 transition cursor-pointer outline-1 outline-gray-300 outline mb-1 focus-visible:bg-gray-200">
					
					<p className="z-10 my-auto text-lg pl-2 dark:text-white">
						{(roles.find((r: any) => r.rank === selectedRole) as any)?.name || "Guest"}
					</p>
					<IconChevronDown size={18} color="#AAAAAA" className="my-auto ml-auto" />
				</Listbox.Button>
				<Listbox.Options className="absolute left-0 z-10 mt-2 w-48 origin-top-left rounded-xl bg-white dark:text-white dark:bg-gray-800 shadow-lg ring-1 ring-gray-300 focus-visible:outline-none overflow-clip">
					<div className="">
						{roles.map((role: any, index) => (
							<Listbox.Option
								className={({ active }) =>
									`${active ? 'text-white bg-primary' : 'text-gray-900 dark:text-white'} relative cursor-pointer select-none py-2 pl-3 pr-9`
								}
								key={index}
								value={role.rank}
							>
								{({ selected, active }) => (
									<>
										<div className="flex items-center">
											<span
												className={`${selected ? 'font-semibold' : 'font-normal'} ml-2 block truncate text-lg`}
											>
												{role.name}
											</span>
										</div>

										{selected ? (
											<span
												className={`${active ? 'text-white' : 'text-primary'}
																absolute inset-y-0 right-0 flex items-center pr-4`
												}
											>
												<IconCheck className="h-5 w-5" aria-hidden="true" />
											</span>
										) : null}
									</>
								)}
							</Listbox.Option>
						))}
					</div>

				</Listbox.Options>
			</Listbox>
			<Button onPress={downloadLoader} workspace>
				Download loader
			</Button>
		</div>
	);
};

Activity.title = "Activity";
Activity.isAboveOthers = true;

export default Activity;
