import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowRight,
	Bell,
	CheckCircle2,
	ChefHat,
	Clock,
	Flame,
	Package,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { client, unwrap } from "@/lib/client";
import { useAuthStore } from "@/store/auth";

export const Route = createFileRoute("/_auth/kitchen/")({
	component: KitchenPage,
});

/* ─── Local types for events (avoids adding @dineflow/shared dep) ─── */

type KitchenEvent =
	| { type: "order:new"; payload: { orderNumber: string; tableNumber: number } }
	| {
			type: "order:status_update";
			payload: { orderId: number; status: string };
	  }
	| {
			type: "item:status_update";
			payload: { orderItemId: number; orderId: number; status: string };
	  }
	| { type: "kitchen:alert"; payload: { message: string; severity: string } };

/* ─── Status helpers ─── */

const STATUS_STYLES: Record<
	string,
	{ bg: string; text: string; border: string; icon: React.ElementType }
> = {
	placed: {
		bg: "bg-yellow-500/10",
		text: "text-yellow-400",
		border: "border-yellow-500/20",
		icon: Bell,
	},
	confirmed: {
		bg: "bg-sky-500/10",
		text: "text-sky-400",
		border: "border-sky-500/20",
		icon: CheckCircle2,
	},
	preparing: {
		bg: "bg-orange-500/10",
		text: "text-orange-400",
		border: "border-orange-500/20",
		icon: Flame,
	},
	ready: {
		bg: "bg-emerald-500/10",
		text: "text-emerald-400",
		border: "border-emerald-500/20",
		icon: Package,
	},
	served: {
		bg: "bg-zinc-500/10",
		text: "text-zinc-400",
		border: "border-zinc-500/20",
		icon: CheckCircle2,
	},
	cancelled: {
		bg: "bg-red-500/10",
		text: "text-red-400",
		border: "border-red-500/20",
		icon: AlertCircle,
	},
};

const ITEM_STATUS_FLOW = ["queued", "preparing", "ready", "served"] as const;

const ORDER_ACTIONS: Record<string, { label: string; next: string }> = {
	placed: { label: "Confirm", next: "confirmed" },
	confirmed: { label: "Start Cooking", next: "preparing" },
	preparing: { label: "Mark Ready", next: "ready" },
};

const BASE =
	import.meta.env.VITE_API_URL ?? "https://dineflow-api.ifty64bit.workers.dev/";

/* ─── Component ─── */

const SELECTED_BRANCH_KEY = "kitchen-selected-branch";

function KitchenPage() {
	const { user, token } = useAuthStore();
	const assignedBranchId = user?.branchId;
	const queryClient = useQueryClient();

	const [alert, setAlert] = useState<string | null>(null);
	const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Owners/admins can pick a branch; kitchen staff use their assigned one
	const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
		() => {
			if (assignedBranchId) return assignedBranchId;
			const saved =
				typeof window !== "undefined"
					? window.localStorage.getItem(SELECTED_BRANCH_KEY)
					: null;
			return saved ? Number(saved) : null;
		},
	);

	const branchId = assignedBranchId ?? selectedBranchId;

	const branchesQuery = useQuery({
		queryKey: ["branches"],
		queryFn: async () => {
			const res = await client.api.v1.admin.branches.$get();
			if (!res.ok) throw new Error("Failed to load branches");
			return res.json();
		},
		enabled: !assignedBranchId,
	});

	/* ── Fetch active orders ── */
	const ordersQuery = useQuery({
		queryKey: ["kitchen", "orders", branchId],
		queryFn: async () => {
			const res = await client.api.v1.kitchen[":branchId"].$get({
				param: { branchId: String(branchId) },
			});
			if (!res.ok) throw new Error("Failed to load orders");
			return res.json() as unknown as Promise<{
				data: {
					placed: Order[];
					confirmed: Order[];
					preparing: Order[];
				};
			}>;
		},
		refetchInterval: 30_000, // fallback refresh every 30s
		enabled: !!branchId,
	});

	/* ── Mutations ── */
	const updateOrderStatus = useMutation({
		mutationFn: async ({
			orderId,
			status,
		}: {
			orderId: number;
			status: string;
		}) => {
			const res = await client.api.v1.kitchen.orders[":orderId"].status.$put({
				param: { orderId: String(orderId) },
				json: {
					status: status as
						| "placed"
						| "confirmed"
						| "preparing"
						| "ready"
						| "served"
						| "cancelled",
				},
			});
			return unwrap<{ data: unknown }>(res);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["kitchen", "orders", branchId],
			});
		},
	});

	const updateItemStatus = useMutation({
		mutationFn: async ({
			itemId,
			status,
		}: {
			itemId: number;
			status: string;
		}) => {
			const res = await client.api.v1.kitchen.items[":orderItemId"].status.$put(
				{
					param: { orderItemId: String(itemId) },
					json: {
						status: status as "queued" | "preparing" | "ready" | "served",
					},
				},
			);
			return unwrap<{ data: unknown }>(res);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["kitchen", "orders", branchId],
			});
		},
	});

	/* ── Long-poll events ── */
	const showAlert = useCallback((message: string) => {
		setAlert(message);
		if (alertTimer.current) clearTimeout(alertTimer.current);
		alertTimer.current = setTimeout(() => setAlert(null), 5_000);
	}, []);

	const handleEvent = useCallback(
		(event: KitchenEvent) => {
			if (event.type === "order:new") {
				showAlert(
					`New order #${event.payload.orderNumber} — Table ${event.payload.tableNumber}`,
				);
				queryClient.invalidateQueries({
					queryKey: ["kitchen", "orders", branchId],
				});
			} else if (
				event.type === "order:status_update" ||
				event.type === "item:status_update"
			) {
				queryClient.invalidateQueries({
					queryKey: ["kitchen", "orders", branchId],
				});
			} else if (event.type === "kitchen:alert") {
				showAlert(event.payload.message);
			}
		},
		[branchId, queryClient, showAlert],
	);

	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		let after = 0;

		async function poll() {
			while (!cancelled) {
				try {
					const res = await fetch(
						`${BASE}/api/v1/events?channel=kitchen:${branchId}&after=${after}`,
						{ headers: { Authorization: `Bearer ${token}` } },
					);
					if (cancelled) break;
					if (!res.ok) {
						await new Promise((r) => setTimeout(r, 2_000));
						continue;
					}
					const json = (await res.json()) as {
						data: { ts: number; event: KitchenEvent } | null;
					};
					if (cancelled) break;
					if (json.data) {
						after = json.data.ts;
						handleEvent(json.data.event);
					}
				} catch {
					if (cancelled) break;
					await new Promise((r) => setTimeout(r, 2_000));
				}
			}
		}

		poll();
		return () => {
			cancelled = true;
		};
	}, [branchId, token, handleEvent]);
	if (!branchId) {
		const branches = branchesQuery.data?.data ?? [];
		return (
			<div className="h-full flex flex-col items-center justify-center bg-[#09090b] text-zinc-500 gap-4">
				<ChefHat className="w-10 h-10" />
				<p className="text-sm">Select a branch to view the kitchen</p>
				{branchesQuery.isLoading ? (
					<div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
				) : branches.length === 0 ? (
					<p className="text-xs">No branches found.</p>
				) : (
					<div className="flex flex-col gap-2 w-64">
						{branches.map((b) => (
							<button
								type="button"
								key={b.id}
								onClick={() => {
									setSelectedBranchId(b.id);
									window.localStorage.setItem(
										SELECTED_BRANCH_KEY,
										String(b.id),
									);
								}}
								className="text-left px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm hover:border-orange-500/50 hover:bg-zinc-800 transition-colors"
							>
								{b.name}
							</button>
						))}
					</div>
				)}
			</div>
		);
	}
	/* ── Derived data ── */
	const groups = ordersQuery.data?.data ?? {
		placed: [],
		confirmed: [],
		preparing: [],
	};
	const totalActive =
		groups.placed.length + groups.confirmed.length + groups.preparing.length;

	return (
		<div className="h-full flex flex-col bg-[#09090b]">
			{/* Header */}
			<div className="shrink-0 border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-950">
				<div className="flex items-center gap-3">
					<ChefHat className="w-5 h-5 text-orange-400" />
					<div>
						<h1 className="text-sm font-semibold text-zinc-100">
							Kitchen Display
						</h1>
						<p className="text-xs text-zinc-500">
							{totalActive} active · long-poll connected
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<StatusBadge status="placed" count={groups.placed.length} />
					<StatusBadge status="confirmed" count={groups.confirmed.length} />
					<StatusBadge status="preparing" count={groups.preparing.length} />
				</div>
			</div>

			{/* Alert banner */}
			{alert && (
				<div className="shrink-0 bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 flex items-center justify-between">
					<span className="text-sm text-orange-300 font-medium">{alert}</span>
					<button
						type="button"
						onClick={() => setAlert(null)}
						className="text-orange-400 hover:text-orange-200"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Columns */}
			<div className="flex-1 overflow-hidden">
				<div className="h-full grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
					<OrderColumn
						title="Placed"
						status="placed"
						orders={groups.placed}
						onOrderAction={(id, status) =>
							updateOrderStatus.mutate({ orderId: id, status })
						}
						onItemAction={(id, status) =>
							updateItemStatus.mutate({ itemId: id, status })
						}
						isPending={
							updateOrderStatus.isPending || updateItemStatus.isPending
						}
					/>
					<OrderColumn
						title="Confirmed"
						status="confirmed"
						orders={groups.confirmed}
						onOrderAction={(id, status) =>
							updateOrderStatus.mutate({ orderId: id, status })
						}
						onItemAction={(id, status) =>
							updateItemStatus.mutate({ itemId: id, status })
						}
						isPending={
							updateOrderStatus.isPending || updateItemStatus.isPending
						}
					/>
					<OrderColumn
						title="Preparing"
						status="preparing"
						orders={groups.preparing}
						onOrderAction={(id, status) =>
							updateOrderStatus.mutate({ orderId: id, status })
						}
						onItemAction={(id, status) =>
							updateItemStatus.mutate({ itemId: id, status })
						}
						isPending={
							updateOrderStatus.isPending || updateItemStatus.isPending
						}
					/>
				</div>
			</div>
		</div>
	);
}

/* ─── Sub-components ─── */

function StatusBadge({ status, count }: { status: string; count: number }) {
	const style = STATUS_STYLES[status] ?? STATUS_STYLES.placed;
	const Icon = style.icon;
	return (
		<div
			className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${style.bg} ${style.text}`}
		>
			<Icon className="w-3.5 h-3.5" />
			<span className="capitalize">{status}</span>
			<span className="ml-0.5 opacity-70">{count}</span>
		</div>
	);
}

function OrderColumn({
	title,
	status,
	orders,
	onOrderAction,
	onItemAction,
	isPending,
}: {
	title: string;
	status: string;
	orders: Order[];
	onOrderAction: (id: number, status: string) => void;
	onItemAction: (id: number, status: string) => void;
	isPending: boolean;
}) {
	const style = STATUS_STYLES[status] ?? STATUS_STYLES.placed;
	const Icon = style.icon;
	const action = ORDER_ACTIONS[status];

	return (
		<div className="flex flex-col h-full min-h-0">
			{/* Column header */}
			<div
				className={`shrink-0 px-4 py-3 border-b ${style.border} bg-zinc-950/50 flex items-center justify-between`}
			>
				<div className="flex items-center gap-2">
					<Icon className={`w-4 h-4 ${style.text}`} />
					<span className="text-sm font-semibold text-zinc-200">{title}</span>
				</div>
				<span className="text-xs text-zinc-500 font-mono">{orders.length}</span>
			</div>

			{/* Order list */}
			<div className="flex-1 overflow-y-auto p-3 space-y-3">
				{orders.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2">
						<Package className="w-6 h-6" />
						<p className="text-xs">No {title.toLowerCase()} orders</p>
					</div>
				)}
				{orders.map((order) => (
					<OrderCard
						key={order.id}
						order={order}
						action={action}
						onOrderAction={onOrderAction}
						onItemAction={onItemAction}
						isPending={isPending}
					/>
				))}
			</div>
		</div>
	);
}

function OrderCard({
	order,
	action,
	onOrderAction,
	onItemAction,
	isPending,
}: {
	order: Order;
	action?: { label: string; next: string };
	onOrderAction: (id: number, status: string) => void;
	onItemAction: (id: number, status: string) => void;
	isPending: boolean;
}) {
	const elapsed = useElapsed(order.createdAt);

	return (
		<div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
			{/* Card header */}
			<div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="text-xs font-mono text-zinc-400">
						#{order.orderNumber}
					</span>
					<span className="text-xs text-zinc-500">·</span>
					<span className="text-xs text-zinc-300">
						Table {order.session.table.tableNumber}
					</span>
					{order.session.guestName && (
						<>
							<span className="text-xs text-zinc-500">·</span>
							<span className="text-xs text-zinc-400">
								{order.session.guestName}
							</span>
						</>
					)}
				</div>
				<div className="flex items-center gap-1 text-zinc-500">
					<Clock className="w-3 h-3" />
					<span className="text-[11px]">{elapsed}</span>
				</div>
			</div>

			{/* Items */}
			<div className="px-3 py-2 space-y-2">
				{order.items.map((item) => (
					<div key={item.id} className="space-y-1">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 min-w-0">
								<span className="text-sm text-zinc-200 truncate">
									{item.menuItem.name}
								</span>
								<span className="text-xs text-zinc-500 shrink-0">
									×{item.quantity}
								</span>
							</div>
							<span
								className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLES[item.status]?.bg ?? ""} ${STATUS_STYLES[item.status]?.text ?? "text-zinc-400"}`}
							>
								{item.status}
							</span>
						</div>
						{item.specialInstructions && (
							<p className="text-[11px] text-zinc-500 italic pl-1">
								&ldquo;{item.specialInstructions}&rdquo;
							</p>
						)}
						{/* Item status buttons */}
						<div className="flex items-center gap-1 pl-1">
							{ITEM_STATUS_FLOW.map((s) => (
								<button
									type="button"
									key={s}
									onClick={() => onItemAction(item.id, s)}
									disabled={isPending || item.status === s}
									className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
										item.status === s
											? "bg-orange-500/20 text-orange-300 font-medium"
											: "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
									} disabled:opacity-50`}
								>
									{s}
								</button>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Card footer — order action */}
			{action && (
				<div className="px-3 py-2 border-t border-zinc-800">
					<button
						type="button"
						onClick={() => onOrderAction(order.id, action.next)}
						disabled={isPending}
						className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-medium rounded-lg px-3 py-2 transition-colors"
					>
						{action.label}
						<ArrowRight className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{order.notes && (
				<div className="px-3 py-1.5 bg-yellow-500/5 border-t border-yellow-500/10">
					<p className="text-[11px] text-yellow-400/80">{order.notes}</p>
				</div>
			)}
		</div>
	);
}

/* ─── Hooks ─── */

function useElapsed(iso: string) {
	const [elapsed, setElapsed] = useState(() => formatElapsed(iso));

	useEffect(() => {
		const id = setInterval(() => setElapsed(formatElapsed(iso)), 30_000);
		return () => clearInterval(id);
	}, [iso]);

	return elapsed;
}

function formatElapsed(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m`;
	const hrs = Math.floor(mins / 60);
	const rem = mins % 60;
	return `${hrs}h ${rem}m`;
}

/* ─── Order types (mirroring DB shape) ─── */

interface Order {
	id: number;
	orderNumber: string;
	status: string;
	subtotal: number;
	taxAmount: number;
	serviceCharge: number;
	discountAmount: number;
	total: number;
	notes: string | null;
	createdBy: number | null;
	waiterId: number | null;
	createdAt: string;
	updatedAt: string;
	items: OrderItem[];
	session: Session;
}

interface OrderItem {
	id: number;
	orderId: number;
	menuItemId: number;
	quantity: number;
	unitPrice: number;
	modifiers: unknown;
	specialInstructions: string | null;
	status: string;
	station: string | null;
	createdAt: string;
	updatedAt: string;
	menuItem: MenuItem;
}

interface MenuItem {
	id: number;
	name: string;
	description: string | null;
	price: number;
	imageUrl: string | null;
	isAvailable: boolean;
}

interface Session {
	id: number;
	branchId: number;
	tableId: number;
	tableClassId: number | null;
	guestName: string | null;
	startedAt: string;
	endedAt: string | null;
	isActive: boolean;
	table: Table;
}

interface Table {
	id: number;
	tableNumber: number;
	capacity: number;
	status: string;
}
