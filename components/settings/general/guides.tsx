import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { IconFileText } from "@tabler/icons";

type props = {
	triggerToast: typeof toast;
}

const Guide: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);

	const updateColor = async () => {
		const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/guides`, { 
			enabled: !workspace.settings.guidesEnabled
		});
		if (res.status === 200) {
			const obj = JSON.parse(JSON.stringify(workspace), (key, value) => (typeof value === 'bigint' ? value.toString() : value));
			obj.settings.guidesEnabled = !workspace.settings.guidesEnabled;
			setWorkspace(obj);
			triggerToast.success("Updated documents");
		} else {
			triggerToast.error("Failed to update documents");
		}
	};	

	return (
		<div>
			<div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<IconFileText size={20} className="text-primary" />
					</div>
					<div>
						<p className="text-sm font-medium text-gray-900 dark:text-white">Documents</p>
						<p className="text-xs text-gray-500 dark:text-gray-400">Create and manage workspace documents</p>
					</div>
				</div>
				<SwitchComponenet 
					checked={workspace.settings?.guidesEnabled} 
					onChange={updateColor} 
					label="" 
					classoverride="mt-0"
				/>
			</div>
		</div>
	);
};

Guide.title = "Documents";

export default Guide;
