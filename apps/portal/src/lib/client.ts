import type { RestaurantAppType } from "@dineflow/api/restaurant-app";
import { hc } from "hono/client";
import { useAuthStore } from "@/store/auth";

const BASE =
	import.meta.env.VITE_API_URL ?? "https://dineflow-api.ifty64bit.workers.dev/";
const AUTH_STORAGE_KEY = "portal-auth";

function withAuthHeader(init?: RequestInit): RequestInit {
	const token = useAuthStore.getState().token;
	if (!token) return init ?? {};

	const headers = new Headers(init?.headers);
	if (!headers.has("Authorization")) {
		headers.set("Authorization", `Bearer ${token}`);
	}
	return { ...init, headers };
}

function clearAuthOnUnauthorized() {
	useAuthStore.getState().logout();
	if (typeof window !== "undefined") {
		window.localStorage.removeItem(AUTH_STORAGE_KEY);
		if (window.location.pathname !== "/login") {
			window.location.replace("/login");
		}
	}
}

export const client = hc<RestaurantAppType>(BASE, {
	async fetch(input: RequestInfo | URL, init?: RequestInit) {
		const res = await fetch(input, withAuthHeader(init));
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
