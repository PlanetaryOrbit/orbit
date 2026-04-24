import { atom, selector } from "recoil";
import Router from "next/router";
import { role } from "@prisma/client";
import axios from "axios";
export type workspaceinfo = {
	groupId: number;
	groupThumbnail: string;
	groupName: string;
  customName: string;
}

export type LoginState = {
	userId: number;
	username: string;
	displayname: string;
	thumbnail: string;
	canMakeWorkspace: boolean;
	workspaces: workspaceinfo[];
	isOwner: boolean;
  isFirstLogin: boolean,
	discordUser?: {
		discordUserId: string
		username: string
		avatar: string | null
	} | null,
  googleUser?: {
    username: string,
    avatar: string | null,
    email: string | null  // add | null
  } | null
}

const loginState = atom<LoginState>({
	key: "loginState",
	default: {
		userId: 1,
		username: '',
		displayname: '',
		thumbnail: '',
    isFirstLogin: true,
		canMakeWorkspace: false,
		workspaces: [] as workspaceinfo[],
		isOwner: false,
		discordUser: null,
    googleUser: null
	},
});

const workspacestate = atom({
	key: "workspacestate",
	default: {
		groupId: typeof window !== 'undefined' ? parseInt(window.location.pathname.split('/')[2]) || 1 : 1,
		groupThumbnail: '',
    customName: '',
		groupName: '',
		yourPermission: [] as string[],
		isAdmin: false,
		groupTheme: '',
		groupDarkTheme: '',
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