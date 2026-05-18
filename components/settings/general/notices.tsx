import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { IconClock } from "@tabler/icons-react";

type props = {
	triggerToast: typeof toast;
}

const Guide: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);

	const updateColor = async () => {
		const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/notices`, { 
			enabled: !workspace.settings.noticesEnabled
		});
		if (res.status === 200) {
			const obj = JSON.parse(JSON.stringify(workspace), (key, value) => (typeof value === 'bigint' ? value.toString() : value));
			obj.settings.noticesEnabled = !workspace.settings.noticesEnabled;
			setWorkspace(obj);
			triggerToast.success("Updated notices!");
		} else {
			triggerToast.error("Failed to update notices.");
		}
	};	

	return (
		<div className="flex items-center justify-between px-5 py-4">
			<div className="flex items-center gap-3">
				<div className="p-2 bg-primary/10 rounded-lg">
					<IconClock size={18} className="text-primary" />
				</div>
				<div>
					<p className="text-sm font-medium text-zinc-900 dark:text-white">Notices</p>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">Create and manage user notices</p>
				</div>
			</div>
			<SwitchComponenet 
				checked={workspace.settings?.noticesEnabled} 
				onChange={updateColor} 
				label="" 
				classoverride="mt-0"
			/>
		</div>
	);
};

Guide.title = "Notices";

export default Guide;
