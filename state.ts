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

// Use a constant prefix to ensure uniqueness across the application
const ATOM_KEY_PREFIX = 'tovy';

// Create atoms only if they don't already exist
const createAtomOnce = (key: string, defaultValue: any) => {
    const existing = (globalThis as any).__RECOIL_ATOMS__;
    if (existing?.[`${ATOM_KEY_PREFIX}_${key}`]) {
        return existing[`${ATOM_KEY_PREFIX}_${key}`];
    }
    
    const newAtom = atom({
        key: `${ATOM_KEY_PREFIX}_${key}`,
        default: defaultValue,
    });

    if (!existing) {
        (globalThis as any).__RECOIL_ATOMS__ = {};
    }
    (globalThis as any).__RECOIL_ATOMS__[`${ATOM_KEY_PREFIX}_${key}`] = newAtom;
    
    return newAtom;
};

export const loginState = createAtomOnce('loginState', {
    userId: 1,
    username: '',
    displayname: '',
    thumbnail: '',
    canMakeWorkspace: false,
    workspaces: [] as workspaceinfo[],
    isOwner: false
});

export const workspacestate = createAtomOnce('workspacestate', {
    groupId: 1,
    groupThumbnail: '',
    groupName: '',
    yourPermission: [] as string[],
    groupTheme: '',
    roles: [] as role[],
    yourRole: '',
    settings: {
        guidesEnabled: false,
        sessionsEnabled: false,
        noticesEnabled: false,
        widgets: [] as string[]
    }
});
