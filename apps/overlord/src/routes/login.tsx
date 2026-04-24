import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as v from "valibot";
import { client } from "@/lib/client";
import { useAuthStore } from "@/store/auth";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		if (useAuthStore.getState().token) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

const LoginSchema = v.object({
	email: v.pipe(v.string(), v.email("Invalid email")),
	password: v.pipe(v.string(), v.minLength(1, "Required")),
});

function LoginPage() {
	const navigate = useNavigate();
	const setAuth = useAuthStore((s) => s.setAuth);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		const result = v.safeParse(LoginSchema, { email, password });
		if (!result.success) {
			setError(result.issues[0].message);
			return;
		}

		setLoading(true);
		try {
			const res = await client.api.overlord.auth.login.$post({
				json: { email, password },
			});
			if (!res.ok) {
				const body = await res
					.json()
					.catch(() => ({ message: "Login failed" }));
				throw new Error(
					(body as { message?: string }).message ?? "Login failed",
				);
			}
			const { data } = await res.json();
			setAuth(data.token, data.admin);
			await navigate({ to: "/dashboard" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
			<div className="w-full max-w-sm">
				{/* Logo */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
						<svg
							className="w-6 h-6 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Logo</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
							/>
						</svg>
					</div>
					<h1 className="text-xl font-bold text-zinc-100">Overlord</h1>
					<p className="text-sm text-zinc-500 mt-1">DineFlow Platform Admin</p>
				</div>

				{/* Card */}
				<form
					onSubmit={handleSubmit}
					className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
				>
					{error && (
						<div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-lg">
							{error}
						</div>
					)}

					<div className="space-y-1.5">
						<label
							htmlFor="email"
							className="text-sm font-medium text-zinc-400"
						>
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="admin@dineflow.io"
							required
							className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="password"
							className="text-sm font-medium text-zinc-400"
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							required
							className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
					>
						{loading && (
							<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						)}
						{loading ? "Signing in…" : "Sign in"}
					</button>
				</form>
			</div>
		</div>
	);
}
