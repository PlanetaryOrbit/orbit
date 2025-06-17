import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { IconBuildingCommunity } from "@tabler/icons";

type props = {
	triggerToast: typeof toast;
}

const Guide: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);

	const updateColor = async () => {
		const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/ally`, { 
			enabled: !workspace.settings.alliesEnabled
		});
		if (res.status === 200) {
			const obj = JSON.parse(JSON.stringify(workspace), (key, value) => (typeof value === 'bigint' ? value.toString() : value));
			obj.settings.alliesEnabled = !workspace.settings.alliesEnabled;
			setWorkspace(obj);
			triggerToast.success("Updated allies");
		} else {
			triggerToast.error("Failed to update allies");
		}
	};	

	return (
		<div>
			<div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<IconBuildingCommunity size={20} className="text-primary" />
					</div>
					<div>
						<p className="text-sm font-medium text-gray-900 dark:text-white">Alliances</p>
						<p className="text-xs text-gray-500 dark:text-gray-400">Create and manage group alliances</p>
					</div>
				</div>
				<SwitchComponenet 
					checked={workspace.settings?.alliesEnabled} 
					onChange={updateColor} 
					label="" 
					classoverride="mt-0"
				/>
			</div>
		</div>
	);
};

Guide.title = "Alliances";

export default Guide;
