import { atom } from "recoil";

const getInitialTheme = (): "light" | "dark" => {
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem("theme");
        if (stored === "dark" || stored === "light") return stored;
    }
    return "light"; 
};


const ATOM_KEY_PREFIX = 'tovy';

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

export const themeState = createAtomOnce('themeState', getInitialTheme());
