import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
	id: number;
	email: string;
	name: string;
	role: string;
	staffType: string | null;
	branchId: number | null;
}

interface AuthState {
	token: string | null;
	user: User | null;
	hasRehydrated: boolean;
	setAuth: (token: string, user: User) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			token: null,
			user: null,
			hasRehydrated: false,
			setAuth: (token, user) => set({ token, user }),
			logout: () => set({ token: null, user: null }),
		}),
		{
			name: "portal-auth",
			onRehydrateStorage: () => (state) => {
				if (state) {
					state.hasRehydrated = true;
				}
			},
		},
	),
);

/** Read token directly from localStorage (synchronous, no rehydration race). */
export function getStoredToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem("portal-auth");
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed?.state?.token ?? null;
	} catch {
		return null;
	}
}
