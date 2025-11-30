import { atom } from "recoil";

const getInitialTheme = (): "light" | "dark" => {
	if (typeof window !== "undefined") {
		const stored = localStorage.getItem("theme");
		if (stored === "dark" || stored === "light") return stored;
	}
	return "light"; // fallback default
};

const __global = globalThis as any;
__global.__recoilAtoms = __global.__recoilAtoms || {};

export const themeState = __global.__recoilAtoms.themeState || (__global.__recoilAtoms.themeState = atom<"light" | "dark">({
	key: "themeState",
	default: getInitialTheme(),
}));
