import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, ClipboardList } from "lucide-react";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_auth/orders/")({
	component: OrdersPage,
});

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
	placed: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
	confirmed: { bg: "bg-sky-500/10", text: "text-sky-400" },
	preparing: { bg: "bg-orange-500/10", text: "text-orange-400" },
	ready: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
	served: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
	cancelled: { bg: "bg-red-500/10", text: "text-red-400" },
};

function OrdersPage() {
	const { data, isLoading, isError } = useQuery({
		queryKey: ["portal", "admin", "orders"],
		queryFn: async () => {
			const res = await client.api.v1.admin.orders.$get();
			if (!res.ok) throw new Error("Failed to load orders");
			return res.json();
		},
		refetchInterval: 10_000,
	});

	const allOrders = data
		? [
				...(data.data.placed ?? []),
				...(data.data.confirmed ?? []),
				...(data.data.preparing ?? []),
				...(data.data.ready ?? []),
			]
		: [];

	return (
		<div className="p-6 space-y-5 max-w-5xl mx-auto">
			<div>
				<h1 className="text-xl font-bold text-zinc-100">Orders</h1>
				<p className="text-sm text-zinc-500 mt-0.5">
					{allOrders.length} active orders · auto-refreshes every 10s
				</p>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center py-16">
					<div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
				</div>
			)}

			{isError && (
				<div className="flex items-center justify-center gap-2 py-16 text-red-400">
					<AlertCircle className="w-4 h-4" />
					<span className="text-sm">Failed to load orders</span>
				</div>
			)}

			{!isLoading && allOrders.length === 0 && (
				<div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
					<ClipboardList className="w-8 h-8" />
					<p className="text-sm">No active orders</p>
				</div>
			)}

			<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{allOrders.map((order) => {
					const style = STATUS_STYLES[order.status] ?? STATUS_STYLES.placed;
					return (
						<div
							key={order.id}
							className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3"
						>
							<div className="flex items-center justify-between">
								<p className="text-xs font-mono text-zinc-500">
									#{order.orderNumber}
								</p>
								<span
									className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
								>
									{order.status}
								</span>
							</div>
							<div className="space-y-1">
								{order.items.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between text-xs"
									>
										<span className="text-zinc-300">{item.menuItem.name}</span>
										<span className="text-zinc-600">×{item.quantity}</span>
									</div>
								))}
							</div>
							<p className="text-xs text-zinc-600">
								{new Date(order.createdAt).toLocaleTimeString()}
							</p>
						</div>
					);
				})}
			</div>
		</div>
	);
}
