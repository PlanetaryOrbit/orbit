import { atom } from "recoil";
import type { role } from "@prisma/client";

export type workspaceinfo = {
	groupId: number;
	groupThumbnail: string;
	groupName: string
}

export type LoginState = {
	userId: number;
	username: string;
	displayname: string;
	thumbnail: string;
	canMakeWorkspace: boolean;
	workspaces: workspaceinfo[];
	isOwner: boolean;
}

const loginState = atom<LoginState>({
	key: "loginState",
	default: {
		userId: 0,
		username: '',
		displayname: '',
		thumbnail: '',
		canMakeWorkspace: false,
		workspaces: [] as workspaceinfo[],
		isOwner: false
	},
});

const workspacestate = atom({
	key: "workspacestate",
	default: {
		groupId: typeof window !== "undefined"
			? Number.parseInt(window.location.pathname.split("/")[2] ?? "", 10) || 0
			: 0,
		groupThumbnail: '',
		groupName: '',
		yourPermission: [] as string[],
		groupTheme: '',
		roles: [] as role[],
		yourRole: '',
		settings: {
			guidesEnabled: false,
			sessionsEnabled: false,
			alliesEnabled: false,
			noticesEnabled: false,
			leaderboardEnabled: false,
			policiesEnabled: false,
			widgets: [] as string[]
		}
	}
});


export {loginState, workspacestate};