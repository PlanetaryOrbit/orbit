import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { IconServer } from "@tabler/icons-react";

type props = {
	triggerToast: typeof toast;
}

const LiveServers: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);

	const updateColor = async () => {
		const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/live_servers`, { 
			enabled: !workspace.settings.liveServersEnabled
		});
		if (res.status === 200) {
			const obj = JSON.parse(JSON.stringify(workspace), (key, value) => (typeof value === 'bigint' ? value.toString() : value));
			obj.settings.liveServersEnabled = !workspace.settings.liveServersEnabled;
			setWorkspace(obj);
			triggerToast.success("Updated live servers!");
		} else {
			triggerToast.error("Failed to update live servers.");
		}
	};	

	return (
		<div>
			<div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<IconServer size={20} className="text-primary" />
					</div>
					<div>
						<p className="text-sm font-medium text-zinc-900 dark:text-white">Live Servers</p>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">Shows servers for game enabled in services.</p>
					</div>
				</div>
				<SwitchComponenet 
					checked={workspace.settings?.liveServersEnabled} 
					onChange={updateColor} 
					label="" 
					classoverride="mt-0"
				/>
			</div>
		</div>
	);
};

LiveServers.title = "Live Servers";

export default LiveServers;