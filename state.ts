import { atom, RecoilState, AtomOptions } from "recoil";
import { role } from "@prisma/client";
import { ALLIANCE_STRIKES_DEFAULT_MAX } from "@/utils/allianceStrikesConfig";

const g = global as any;
if (!g.__recoilAtoms) g.__recoilAtoms = {};
function stableAtom<T>(options: AtomOptions<T>): RecoilState<T> {
	if (!g.__recoilAtoms[options.key]) {
		g.__recoilAtoms[options.key] = atom<T>(options);
	}
	return g.__recoilAtoms[options.key];
}
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
		email: string | null
	} | null
}

const loginState = stableAtom<LoginState>({
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

const workspacestate = stableAtom({
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
		lastSynced: new Date(),
		lastSyncedSuccessful: true,
		settings: {
			guidesEnabled: false,
			sessionsEnabled: false,
			alliesEnabled: false,
			noticesEnabled: false,
			resignationsEnabled: false,
			leaderboardEnabled: false,
			policiesEnabled: false,
			widgets: [] as string[],
			allianceMaxStrikes: ALLIANCE_STRIKES_DEFAULT_MAX,
		}
	}
});


export { loginState, workspacestate };