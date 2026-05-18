import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { IconSpeakerphone } from "@tabler/icons-react";

type props = {
	triggerToast: typeof toast;
}

const Guide: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);

	const updateGuide = async () => {
		const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/sessions`, { 
			enabled: !workspace.settings.sessionsEnabled
		});
		if (res.status === 200) {
			const obj = JSON.parse(JSON.stringify(workspace), (key, value) => (typeof value === 'bigint' ? value.toString() : value));
			obj.settings.sessionsEnabled = !workspace.settings.sessionsEnabled;
			setWorkspace(obj);
			triggerToast.success("Updated sessions!");
		} else {
			triggerToast.error("Failed to update sessions.");
		}
	};	

	return (
		<div className="flex items-center justify-between px-5 py-4">
			<div className="flex items-center gap-3">
				<div className="p-2 bg-primary/10 rounded-lg">
					<IconSpeakerphone size={18} className="text-primary" />
				</div>
				<div>
					<p className="text-sm font-medium text-zinc-900 dark:text-white">Sessions</p>
					<p className="text-xs text-zinc-500 dark:text-zinc-400">Track and manage group sessions & shifts</p>
				</div>
			</div>
			<SwitchComponenet 
				checked={workspace.settings?.sessionsEnabled} 
				onChange={updateGuide} 
				label="" 
				classoverride="mt-0"
			/>
		</div>
	);
};

Guide.title = "Sessions";

export default Guide;
