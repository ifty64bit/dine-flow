import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Building2, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_auth/organizations/")({
	component: OrganizationsPage,
});

function StatusBadge({ status }: { status: string }) {
	const map: Record<string, string> = {
		active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
		trialing: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
		past_due: "bg-amber-500/10 text-amber-400 border-amber-500/20",
		cancelled: "bg-zinc-700/40 text-zinc-500 border-zinc-700",
		paused: "bg-zinc-700/40 text-zinc-500 border-zinc-700",
		none: "bg-zinc-700/40 text-zinc-500 border-zinc-700",
	};
	return (
		<span
			className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] ?? map.none}`}
		>
			{status}
		</span>
	);
}

function OrganizationsPage() {
	const [search, setSearch] = useState("");

	const { data, isLoading, isError } = useQuery({
		queryKey: ["overlord", "organizations"],
		queryFn: async () => {
			const res = await client.api.overlord.organizations.$get();
			if (!res.ok) throw new Error("Failed to load organizations");
			return res.json();
		},
	});

	const orgs = (data?.data ?? []).filter(
		(o) =>
			search === "" ||
			o.name.toLowerCase().includes(search.toLowerCase()) ||
			o.slug.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className="p-6 space-y-5 max-w-6xl mx-auto">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-xl font-bold text-zinc-100">Organizations</h1>
					<p className="text-sm text-zinc-500 mt-0.5">
						{data?.data.length ?? 0} total
					</p>
				</div>
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search by name or slug…"
					className="w-full max-w-sm bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors"
				/>
			</div>

			{/* Table */}
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
				{/* Header */}
				<div className="hidden md:grid grid-cols-[1fr_120px_100px_100px_80px_36px] gap-4 px-5 py-3 border-b border-zinc-800">
					{["Organization", "Plan", "Branches", "Members", "Status", ""].map(
						(h) => (
							<span
								key={h}
								className="text-xs font-medium text-zinc-600 uppercase tracking-wide"
							>
								{h}
							</span>
						),
					)}
				</div>

				{isLoading && (
					<div className="flex items-center justify-center py-16">
						<div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
					</div>
				)}

				{isError && (
					<div className="flex items-center justify-center gap-2 py-16 text-red-400">
						<AlertCircle className="w-4 h-4" />
						<span className="text-sm">Failed to load organizations</span>
					</div>
				)}

				{!isLoading && !isError && orgs.length === 0 && (
					<div className="flex flex-col items-center justify-center py-16 gap-2">
						<Building2 className="w-8 h-8 text-zinc-700" />
						<p className="text-sm text-zinc-600">
							{search ? "No results found" : "No organizations yet"}
						</p>
					</div>
				)}

				<div className="divide-y divide-zinc-800">
					{orgs.map((org) => (
						<Link
							key={org.id}
							to="/organizations/$orgId"
							params={{ orgId: String(org.id) }}
							className="hidden md:grid grid-cols-[1fr_120px_100px_100px_80px_36px] gap-4 items-center px-5 py-3.5 hover:bg-zinc-800/50 transition-colors group"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0 group-hover:bg-zinc-700">
									{org.name[0].toUpperCase()}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium text-zinc-200 truncate">
										{org.name}
									</p>
									<p className="text-xs text-zinc-600 truncate">/{org.slug}</p>
								</div>
							</div>
							<span className="text-sm text-zinc-400 truncate">
								{org.subscription?.planName ?? "—"}
							</span>
							<span className="text-sm text-zinc-400">{org.branchCount}</span>
							<span className="text-sm text-zinc-400">{org.memberCount}</span>
							<StatusBadge status={org.subscription?.status ?? "none"} />
							<ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500" />
						</Link>
					))}

					{/* Mobile rows */}
					{orgs.map((org) => (
						<Link
							key={`mob-${org.id}`}
							to="/organizations/$orgId"
							params={{ orgId: String(org.id) }}
							className="md:hidden flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/50 transition-colors"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
									{org.name[0].toUpperCase()}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium text-zinc-200 truncate">
										{org.name}
									</p>
									<div className="flex items-center gap-2 mt-0.5">
										<StatusBadge status={org.subscription?.status ?? "none"} />
										<span className="text-xs text-zinc-600">
											{org.branchCount} branches
										</span>
									</div>
								</div>
							</div>
							<ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
