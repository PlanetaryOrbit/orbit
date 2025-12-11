import React from "react";
import { useRecoilState } from "recoil";
import { workspacestate, loginState } from "@/state";
import ComplianceOverviewWidget from "@/components/ComplianceOverviewWidget";

const PoliciesWidget: React.FC = () => {
	const [workspace] = useRecoilState(workspacestate);
	const [login] = useRecoilState(loginState);

	return (
		<ComplianceOverviewWidget
			workspaceId={workspace.groupId.toString()}
		/>
	);
};

export default PoliciesWidget;