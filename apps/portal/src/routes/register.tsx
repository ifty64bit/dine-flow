import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { BookOpen, Clock } from "lucide-react";
import { useState } from "react";
import * as v from "valibot";
import { client } from "@/lib/client";
import { getStoredToken, useAuthStore } from "@/store/auth";

export const Route = createFileRoute("/register")({
	beforeLoad: () => {
		const token = useAuthStore.getState().token ?? getStoredToken();
		if (token) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: RegisterPage,
});

const RegisterSchema = v.object({
	orgName: v.pipe(
		v.string(),
		v.minLength(2, "Organization name must be at least 2 characters"),
	),
	name: v.pipe(v.string(), v.minLength(1, "Your name is required")),
	email: v.pipe(v.string(), v.email("Invalid email address")),
	password: v.pipe(
		v.string(),
		v.minLength(8, "Password must be at least 8 characters"),
	),
});

function getPasswordStrength(password: string): {
	score: number;
	label: string;
	color: string;
} {
	if (password.length === 0) return { score: 0, label: "", color: "" };
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^A-Za-z0-9]/.test(password)) score++;

	if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
	if (score <= 2) return { score: 2, label: "Fair", color: "bg-orange-400" };
	if (score <= 3) return { score: 3, label: "Good", color: "bg-yellow-400" };
	return { score: 4, label: "Strong", color: "bg-green-500" };
}

function RegisterPage() {
	const navigate = useNavigate();
	const setAuth = useAuthStore((s) => s.setAuth);

	const [orgName, setOrgName] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const strength = getPasswordStrength(password);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		const result = v.safeParse(RegisterSchema, {
			orgName,
			name,
			email,
			password,
		});
		if (!result.success) {
			setError(result.issues[0].message);
			return;
		}

		setLoading(true);
		try {
			const res = await client.auth.register.$post({
				json: { orgName, name, email, password },
			});

			if (!res.ok) {
				const body = await res
					.json()
					.catch(() => ({ message: "Registration failed" }));
				throw new Error(
					(body as { message?: string }).message ?? "Registration failed",
				);
			}

			const { data } = await res.json();
			setAuth(data.token, data.user);
			await navigate({ to: "/dashboard" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 py-12">
			<div className="w-full max-w-sm">
				{/* Logo */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500 mb-4">
						<BookOpen className="w-6 h-6 text-white" />
					</div>
					<h1 className="text-xl font-bold text-zinc-100">DineFlow</h1>
					<p className="text-sm text-zinc-500 mt-1">
						Create your restaurant account
					</p>
				</div>

				{/* 30-day trial badge */}
				<div className="flex items-center justify-center gap-2 mb-6">
					<div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium px-3 py-1.5 rounded-full">
						<Clock className="w-3.5 h-3.5" />
						30-day free trial — no credit card required
					</div>
				</div>

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
							htmlFor="org-name"
							className="text-sm font-medium text-zinc-400"
						>
							Organization Name
						</label>
						<input
							id="org-name"
							type="text"
							value={orgName}
							onChange={(e) => setOrgName(e.target.value)}
							placeholder="Sunrise Restaurant"
							required
							className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="user-name"
							className="text-sm font-medium text-zinc-400"
						>
							Your Name
						</label>
						<input
							id="user-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Jane Smith"
							required
							className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
						/>
					</div>

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
							placeholder="you@restaurant.com"
							required
							className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
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
							className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors"
						/>
						{password.length > 0 && (
							<div className="space-y-1">
								<div className="flex gap-1">
									{[1, 2, 3, 4].map((i) => (
										<div
											key={i}
											className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
												i <= strength.score ? strength.color : "bg-zinc-700"
											}`}
										/>
									))}
								</div>
								<p className="text-xs text-zinc-500">
									Strength:{" "}
									<span
										className={
											strength.score <= 1
												? "text-red-400"
												: strength.score <= 2
													? "text-orange-400"
													: strength.score <= 3
														? "text-yellow-400"
														: "text-green-400"
										}
									>
										{strength.label}
									</span>
									{password.length < 8 && (
										<span className="text-zinc-600"> · min 8 characters</span>
									)}
								</p>
							</div>
						)}
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
					>
						{loading && (
							<span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						)}
						{loading ? "Creating account…" : "Create account"}
					</button>
				</form>

				<p className="text-center text-sm text-zinc-600 mt-4">
					Already have an account?{" "}
					<Link
						to="/login"
						className="text-zinc-400 hover:text-zinc-200 transition-colors"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
}
