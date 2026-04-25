import type { RestaurantAppType } from "@dineflow/api/restaurant-app";
import { hc } from "hono/client";
import { useAuthStore, getStoredToken } from "@/store/auth";

const BASE =
	import.meta.env.VITE_API_URL ?? "https://dineflow-api.ifty64bit.workers.dev/";
const AUTH_STORAGE_KEY = "portal-auth";

function getAuthHeaders(): Record<string, string> {
	const token = useAuthStore.getState().token ?? getStoredToken();
	console.log('[portal-client] getAuthHeaders token:', token ? token.slice(0, 10) + '...' : null);
	return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearAuthOnUnauthorized() {
	useAuthStore.getState().logout();
	if (typeof window !== "undefined") {
		window.localStorage.removeItem(AUTH_STORAGE_KEY);
		console.error('[portal-client] 401 — clearing auth');
		if (window.location.pathname !== "/login") {
			window.location.replace("/login");
		}
	}
}

export const client = hc<RestaurantAppType>(BASE, {
	headers: getAuthHeaders,
	async fetch(input: RequestInfo | URL, init?: RequestInit) {
		console.log('[portal-client] fetch →', input);
		const res = await fetch(input, init);
		if (res.status === 401) clearAuthOnUnauthorized();
		return res;
	},
});

export type Client = typeof client;

export async function unwrap<T>(res: Response): Promise<T> {
	if (res.ok) return res.json() as Promise<T>;
	const body = await res.json().catch(() => ({ message: "Request failed" }));
	throw new Error((body as { message?: string }).message ?? "Request failed");
}
