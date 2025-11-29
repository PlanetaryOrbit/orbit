import React from "react";
import { useRecoilState } from "recoil";
import { workspacestate, loginState } from "@/state";
import UserPolicyDashboard from "@/components/UserPolicyDashboard";

const PoliciesWidget: React.FC = () => {
	const [workspace] = useRecoilState(workspacestate);
	const [login] = useRecoilState(loginState);

	return (
		<UserPolicyDashboard
			workspaceId={workspace.groupId.toString()}
			className="border-0 shadow-none bg-transparent"
			currentUsername={login.username}
		/>
	);
};

export default PoliciesWidget;