import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	Building2,
	CheckCircle,
	Clock,
	CreditCard,
	MapPin,
	Power,
	Users,
} from "lucide-react";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_auth/organizations/$orgId")({
	component: OrgDetailPage,
});

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between py-2.5 border-b border-zinc-800 last:border-0">
			<span className="text-sm text-zinc-500">{label}</span>
			<span className="text-sm text-zinc-300 font-medium">{value}</span>
		</div>
	);
}

function RoleBadge({ role }: { role: string }) {
	const map: Record<string, string> = {
		owner: "bg-violet-500/10 text-violet-400 border-violet-500/20",
		admin: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
		manager: "bg-amber-500/10  text-amber-400  border-amber-500/20",
		staff: "bg-zinc-700/40   text-zinc-500   border-zinc-700",
	};
	return (
		<span
			className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[role] ?? map.staff}`}
		>
			{role}
		</span>
	);
}

function SubStatusBadge({ status }: { status: string }) {
	const map: Record<string, { cls: string; icon: React.ElementType }> = {
		active: { cls: "text-emerald-400", icon: CheckCircle },
		trialing: { cls: "text-indigo-400", icon: Clock },
		past_due: { cls: "text-amber-400", icon: AlertCircle },
		cancelled: { cls: "text-zinc-500", icon: Power },
	};
	const { cls, icon: Icon } = map[status] ?? map.cancelled;
	return (
		<span className={`flex items-center gap-1.5 text-sm font-medium ${cls}`}>
			<Icon className="w-4 h-4" />
			{status.replace("_", " ")}
		</span>
	);
}

function OrgDetailPage() {
	const { orgId } = Route.useParams();
	const qc = useQueryClient();

	const { data, isLoading, isError } = useQuery({
		queryKey: ["overlord", "org", orgId],
		queryFn: async () => {
			const res = await client.api.overlord.organizations[":id"].$get({
				param: { id: orgId },
			});
			if (!res.ok) throw new Error("Organization not found");
			return res.json();
		},
	});

	const toggleActive = useMutation({
		mutationFn: async (isActive: boolean) => {
			const res = await client.api.overlord.organizations[":id"].status.$patch({
				param: { id: orgId },
				json: { isActive },
			});
			if (!res.ok) throw new Error("Failed to update status");
			return res.json();
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["overlord", "org", orgId] }),
	});

	const changeSubStatus = useMutation({
		mutationFn: async (
			status: "active" | "trialing" | "past_due" | "cancelled" | "paused",
		) => {
			const res = await client.api.overlord.organizations[
				":id"
			].subscription.$patch({
				param: { id: orgId },
				json: { status },
			});
			if (!res.ok) throw new Error("Failed to update subscription");
			return res.json();
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["overlord", "org", orgId] }),
	});

	if (isLoading)
		return (
			<div className="flex items-center justify-center h-64">
				<div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
			</div>
		);

	if (isError || !data?.data)
		return (
			<div className="flex items-center justify-center h-64 gap-2 text-red-400">
				<AlertCircle className="w-4 h-4" />
				<span className="text-sm">Organization not found</span>
			</div>
		);

	const org = data.data;

	return (
		<div className="p-6 space-y-6 max-w-5xl mx-auto">
			{/* Back */}
			<Link
				to="/organizations"
				className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
			>
				<ArrowLeft className="w-4 h-4" />
				Organizations
			</Link>

			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-300">
						{org.name[0].toUpperCase()}
					</div>
					<div>
						<h1 className="text-xl font-bold text-zinc-100">{org.name}</h1>
						<p className="text-sm text-zinc-600">/{org.slug}</p>
					</div>
				</div>
				<button
					type="button"
					onClick={() => toggleActive.mutate(!org.isActive)}
					disabled={toggleActive.isPending}
					className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
						org.isActive
							? "border-red-500/30 text-red-400 hover:bg-red-500/10"
							: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
					}`}
				>
					<Power className="w-4 h-4" />
					{org.isActive ? "Deactivate" : "Activate"}
				</button>
			</div>

			<div className="grid lg:grid-cols-3 gap-6">
				{/* Left column */}
				<div className="lg:col-span-2 space-y-5">
					{/* Subscription */}
					<section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
						<div className="flex items-center gap-2 mb-4">
							<CreditCard className="w-4 h-4 text-zinc-500" />
							<h2 className="text-sm font-semibold text-zinc-300">
								Subscription
							</h2>
						</div>

						{org.subscription ? (
							<>
								<div className="flex items-center justify-between mb-4">
									<SubStatusBadge status={org.subscription.status} />
									<span className="text-sm font-semibold text-zinc-200">
										{org.subscription.planName} · ৳
										{org.subscription.monthlyPrice}/mo
									</span>
								</div>
								<InfoRow
									label="Period start"
									value={new Date(
										org.subscription.currentPeriodStart,
									).toLocaleDateString()}
								/>
								{org.subscription.currentPeriodEnd && (
									<InfoRow
										label="Period end"
										value={new Date(
											org.subscription.currentPeriodEnd,
										).toLocaleDateString()}
									/>
								)}
								{org.subscription.cancelledAt && (
									<InfoRow
										label="Cancelled"
										value={new Date(
											org.subscription.cancelledAt,
										).toLocaleDateString()}
									/>
								)}

								{/* Quick status actions */}
								<div className="flex gap-2 mt-4 flex-wrap">
									{(
										[
											"active",
											"trialing",
											"past_due",
											"cancelled",
											"paused",
										] as const
									).map((s) => (
										<button
											type="button"
											key={s}
											onClick={() => changeSubStatus.mutate(s)}
											disabled={
												changeSubStatus.isPending ||
												org.subscription?.status === s
											}
											className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-indigo-500/50 hover:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors capitalize"
										>
											{s.replace("_", " ")}
										</button>
									))}
								</div>
							</>
						) : (
							<p className="text-sm text-zinc-600">No subscription</p>
						)}
					</section>

					{/* Branches */}
					<section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
						<div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
							<MapPin className="w-4 h-4 text-zinc-500" />
							<h2 className="text-sm font-semibold text-zinc-300">
								Branches{" "}
								<span className="text-zinc-600 font-normal">
									({org.branches.length})
								</span>
							</h2>
						</div>
						{org.branches.length === 0 ? (
							<p className="text-sm text-zinc-600 px-5 py-4">No branches</p>
						) : (
							<div className="divide-y divide-zinc-800">
								{org.branches.map((b) => (
									<div
										key={b.id}
										className="flex items-center justify-between px-5 py-3"
									>
										<div className="flex items-center gap-2.5">
											<Building2 className="w-4 h-4 text-zinc-600" />
											<div>
												<p className="text-sm font-medium text-zinc-300">
													{b.name}
												</p>
												{b.address && (
													<p className="text-xs text-zinc-600">{b.address}</p>
												)}
											</div>
										</div>
										<div className="flex items-center gap-3 text-xs text-zinc-500">
											<span>{b.tableCount} tables</span>
											<span>{b.memberCount} staff</span>
											<span
												className={`w-1.5 h-1.5 rounded-full ${b.isActive ? "bg-emerald-500" : "bg-zinc-600"}`}
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</section>

					{/* Members */}
					<section className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
						<div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
							<Users className="w-4 h-4 text-zinc-500" />
							<h2 className="text-sm font-semibold text-zinc-300">
								Members{" "}
								<span className="text-zinc-600 font-normal">
									({org.members.length})
								</span>
							</h2>
						</div>
						{org.members.length === 0 ? (
							<p className="text-sm text-zinc-600 px-5 py-4">No members</p>
						) : (
							<div className="divide-y divide-zinc-800">
								{org.members.map((m) => (
									<div
										key={m.id}
										className="flex items-center justify-between px-5 py-3"
									>
										<div className="flex items-center gap-2.5">
											<div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-400">
												{m.name[0].toUpperCase()}
											</div>
											<div>
												<p className="text-sm font-medium text-zinc-300">
													{m.name}
												</p>
												<p className="text-xs text-zinc-600">{m.email}</p>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<RoleBadge role={m.role} />
											{m.branchName && (
												<span className="text-xs text-zinc-600 hidden sm:block">
													{m.branchName}
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</section>
				</div>

				{/* Right column — details */}
				<div className="space-y-5">
					<section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
						<h2 className="text-sm font-semibold text-zinc-300 mb-3">
							Details
						</h2>
						<InfoRow label="Currency" value={org.currency} />
						<InfoRow label="Timezone" value={org.timezone} />
						<InfoRow label="Tax rate" value={`${org.taxRate}%`} />
						<InfoRow
							label="Service charge"
							value={`${org.serviceChargeRate}%`}
						/>
						<InfoRow
							label="Tax inclusive"
							value={org.taxInclusive ? "Yes" : "No"}
						/>
						<InfoRow
							label="Status"
							value={
								<span
									className={`font-medium ${org.isActive ? "text-emerald-400" : "text-zinc-500"}`}
								>
									{org.isActive ? "Active" : "Inactive"}
								</span>
							}
						/>
						<InfoRow
							label="Created"
							value={new Date(org.createdAt).toLocaleDateString()}
						/>
						{org.trialEndsAt && (
							<InfoRow
								label="Trial ends"
								value={new Date(org.trialEndsAt).toLocaleDateString()}
							/>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}
