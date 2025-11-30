import { atom, selector } from "recoil";
import Router from "next/router";
import { role } from "@prisma/client";
import axios from "axios";
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

const __global = globalThis as any;
__global.__recoilAtoms = __global.__recoilAtoms || {};

const loginState = __global.__recoilAtoms.loginState || (__global.__recoilAtoms.loginState = atom<LoginState>({
	key: "loginState",
	default: {
		userId: 1,
		username: '',
		displayname: '',
		thumbnail: '',
		canMakeWorkspace: false,
		workspaces: [] as workspaceinfo[],
		isOwner: false
	},
}));

const workspacestate = __global.__recoilAtoms.workspacestate || (__global.__recoilAtoms.workspacestate = atom({
	key: "workspacestate",
	default: {
		groupId: typeof window !== 'undefined' ? parseInt(window.location.pathname.split('/')[2]) || 1 : 1,
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
			liveServersEnabled: false,
			widgets: [] as string[]
		}
	}
}));


export {loginState, workspacestate};