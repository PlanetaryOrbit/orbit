import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { IconShield } from "@tabler/icons-react";

type props = {
	triggerToast: typeof toast;
}

const Policies: FC<props> = (props) => {
	const triggerToast = props.triggerToast;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);

	const updatePolicies = async () => {
		const res = await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/policies`, {
			enabled: !workspace.settings.policiesEnabled
		});
		if (res.status === 200) {
			const obj = JSON.parse(JSON.stringify(workspace), (key, value) => (typeof value === 'bigint' ? value.toString() : value));
			obj.settings.policiesEnabled = !workspace.settings.policiesEnabled;
			setWorkspace(obj);
			triggerToast.success("Updated policies!");
		} else {
			triggerToast.error("Failed to update policies.");
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<IconShield size={20} className="text-primary" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<p className="text-sm font-medium text-zinc-900 dark:text-white">Policies</p>
							<span className="px-1.5 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
								BETA
							</span>
						</div>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">Manage and track policy acknowledgments</p>
					</div>
				</div>
				<SwitchComponenet
					checked={workspace.settings?.policiesEnabled}
					onChange={updatePolicies}
					label=""
					classoverride="mt-0"
				/>
			</div>
		</div>
	);
};

Policies.title = "Policies";

export default Policies;