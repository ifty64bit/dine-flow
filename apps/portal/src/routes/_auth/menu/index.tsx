import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	ChevronDown,
	ChevronRight,
	Loader2,
	Pencil,
	Plus,
	Tag,
	ToggleLeft,
	ToggleRight,
	Trash2,
	UtensilsCrossed,
	X,
} from "lucide-react";
import { useState } from "react";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_auth/menu/")({
	component: MenuPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
	id: number;
	name: string;
	description: string | null;
	sortOrder: number;
	isActive: boolean;
	items: Item[];
}

interface Item {
	id: number;
	name: string;
	description: string | null;
	basePrice: string;
	isAvailable: boolean;
	station: string | null;
	prepTimeMin: number;
	categoryId: number;
}

type Tab = "categories" | "items";
type ModalState =
	| { type: "add-category" }
	| { type: "edit-category"; cat: Category }
	| { type: "add-item" }
	| { type: "edit-item"; item: Item }
	| null;

const STATIONS = [
	"grill",
	"fryer",
	"salad",
	"drinks",
	"dessert",
	"general",
] as const;
type StationOption = (typeof STATIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputClass(extra = "") {
	return `w-full bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-colors ${extra}`;
}

function labelClass() {
	return "block text-xs font-medium text-zinc-400 mb-1";
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
			<div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
				<div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
					<h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-zinc-500 hover:text-zinc-300 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<div className="p-5">{children}</div>
			</div>
		</div>
	);
}

// ─── Category Form ────────────────────────────────────────────────────────────

function CategoryForm({
	initial,
	onSubmit,
	loading,
}: {
	initial?: Partial<Category>;
	onSubmit: (data: {
		name: string;
		description: string;
		sortOrder: number;
		isActive: boolean;
	}) => void;
	loading: boolean;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [description, setDescription] = useState(initial?.description ?? "");
	const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0);
	const [isActive, setIsActive] = useState(initial?.isActive ?? true);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit({ name, description, sortOrder, isActive });
			}}
			className="space-y-4"
		>
			<div>
				<label htmlFor="name" className={labelClass()}>
					Name *
				</label>
				<input
					className={inputClass()}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Starters"
					required
				/>
			</div>
			<div>
				<label htmlFor="description" className={labelClass()}>
					Description
				</label>
				<input
					className={inputClass()}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Optional description"
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label htmlFor="sort-order" className={labelClass()}>
						Sort Order
					</label>
					<input
						type="number"
						className={inputClass()}
						value={sortOrder}
						onChange={(e) => setSortOrder(Number(e.target.value))}
					/>
				</div>
				<div>
					<label htmlFor="status" className={labelClass()}>
						Status
					</label>
					<select
						className={inputClass()}
						value={isActive ? "1" : "0"}
						onChange={(e) => setIsActive(e.target.value === "1")}
					>
						<option value="1">Active</option>
						<option value="0">Inactive</option>
					</select>
				</div>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
			>
				{loading && <Loader2 className="w-4 h-4 animate-spin" />}
				{initial?.id ? "Save changes" : "Add category"}
			</button>
		</form>
	);
}

// ─── Item Form ────────────────────────────────────────────────────────────────

function ItemForm({
	initial,
	categories,
	onSubmit,
	loading,
}: {
	initial?: Partial<Item>;
	categories: Category[];
	onSubmit: (data: {
		name: string;
		description: string;
		basePrice: string;
		categoryId: number;
		station: StationOption;
		prepTimeMin: number;
		isAvailable: boolean;
	}) => void;
	loading: boolean;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [description, setDescription] = useState(initial?.description ?? "");
	const [basePrice, setBasePrice] = useState(initial?.basePrice ?? "");
	const [categoryId, setCategoryId] = useState(
		initial?.categoryId ?? categories[0]?.id ?? 0,
	);
	const [station, setStation] = useState<StationOption>(
		(initial?.station as StationOption) ?? "general",
	);
	const [prepTimeMin, setPrepTimeMin] = useState(initial?.prepTimeMin ?? 15);
	const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit({
					name,
					description,
					basePrice,
					categoryId,
					station,
					prepTimeMin,
					isAvailable,
				});
			}}
			className="space-y-4"
		>
			<div>
				<label htmlFor="name" className={labelClass()}>
					Name *
				</label>
				<input
					className={inputClass()}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Grilled Chicken"
					required
				/>
			</div>
			<div>
				<label htmlFor="description" className={labelClass()}>
					Description
				</label>
				<input
					className={inputClass()}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Optional description"
				/>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label htmlFor="base-price" className={labelClass()}>
						Base Price (৳) *
					</label>
					<input
						className={inputClass()}
						value={basePrice}
						onChange={(e) => setBasePrice(e.target.value)}
						placeholder="250"
						required
						pattern="^\d+(\.\d{1,2})?$"
					/>
				</div>
				<div>
					<label htmlFor="prep-time-min" className={labelClass()}>
						Prep Time (min)
					</label>
					<input
						type="number"
						className={inputClass()}
						value={prepTimeMin}
						onChange={(e) => setPrepTimeMin(Number(e.target.value))}
						min={0}
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<label htmlFor="category" className={labelClass()}>
						Category *
					</label>
					<select
						className={inputClass()}
						value={categoryId}
						onChange={(e) => setCategoryId(Number(e.target.value))}
						required
					>
						{categories.map((c) => (
							<option key={c.id} value={c.id}>
								{c.name}
							</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor="station" className={labelClass()}>
						Station
					</label>
					<select
						className={inputClass()}
						value={station}
						onChange={(e) => setStation(e.target.value as StationOption)}
					>
						{STATIONS.map((s) => (
							<option key={s} value={s}>
								{s.charAt(0).toUpperCase() + s.slice(1)}
							</option>
						))}
					</select>
				</div>
			</div>
			<div>
				<label htmlFor="availability" className={labelClass()}>
					Availability
				</label>
				<select
					className={inputClass()}
					value={isAvailable ? "1" : "0"}
					onChange={(e) => setIsAvailable(e.target.value === "1")}
				>
					<option value="1">Available</option>
					<option value="0">Unavailable</option>
				</select>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
			>
				{loading && <Loader2 className="w-4 h-4 animate-spin" />}
				{initial?.id ? "Save changes" : "Add item"}
			</button>
		</form>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MenuPage() {
	const qc = useQueryClient();
	const [tab, setTab] = useState<Tab>("categories");
	const [modal, setModal] = useState<ModalState>(null);
	const [expanded, setExpanded] = useState<Set<number>>(new Set());

	const invalidate = () =>
		qc.invalidateQueries({ queryKey: ["portal", "menu"] });

	// ── Queries ────────────────────────────────────────────────────────────────

	const catQuery = useQuery({
		queryKey: ["portal", "menu", "categories"],
		queryFn: async () => {
			const res = await client.api.v1.admin.menu.categories.$get();
			if (!res.ok) throw new Error("Failed to load categories");
			return res.json();
		},
	});

	const itemQuery = useQuery({
		queryKey: ["portal", "menu", "items"],
		queryFn: async () => {
			const res = await client.api.v1.admin.menu.items.$get();
			if (!res.ok) throw new Error("Failed to load items");
			return res.json();
		},
		enabled: tab === "items",
	});

	const categories: Category[] = (catQuery.data?.data ?? []) as Category[];
	const items: Item[] = (itemQuery.data?.data ?? []) as Item[];

	// ── Category mutations ────────────────────────────────────────────────────

	const addCat = useMutation({
		mutationFn: async (
			body: Parameters<
				typeof client.api.v1.admin.menu.categories.$post
			>[0]["json"],
		) => {
			const res = await client.api.v1.admin.menu.categories.$post({
				json: body,
			});
			if (!res.ok) throw new Error("Failed to create category");
		},
		onSuccess: () => {
			invalidate();
			setModal(null);
		},
	});

	const editCat = useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: number;
			body: Parameters<
				typeof client.api.v1.admin.menu.categories.$post
			>[0]["json"];
		}) => {
			const res = await client.api.v1.admin.menu.categories[":id"].$put({
				param: { id: String(id) },
				json: body,
			});
			if (!res.ok) throw new Error("Failed to update category");
		},
		onSuccess: () => {
			invalidate();
			setModal(null);
		},
	});

	const deleteCat = useMutation({
		mutationFn: async (id: number) => {
			const res = await client.api.v1.admin.menu.categories[":id"].$delete({
				param: { id: String(id) },
			});
			if (!res.ok) throw new Error("Failed to delete category");
		},
		onSuccess: () => invalidate(),
	});

	// ── Item mutations ────────────────────────────────────────────────────────

	const addItem = useMutation({
		mutationFn: async (
			body: Parameters<typeof client.api.v1.admin.menu.items.$post>[0]["json"],
		) => {
			const res = await client.api.v1.admin.menu.items.$post({ json: body });
			if (!res.ok) throw new Error("Failed to create item");
		},
		onSuccess: () => {
			invalidate();
			setModal(null);
		},
	});

	const editItem = useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: number;
			body: Parameters<typeof client.api.v1.admin.menu.items.$post>[0]["json"];
		}) => {
			const res = await client.api.v1.admin.menu.items[":id"].$put({
				param: { id: String(id) },
				json: body,
			});
			if (!res.ok) throw new Error("Failed to update item");
		},
		onSuccess: () => {
			invalidate();
			setModal(null);
		},
	});

	const deleteItem = useMutation({
		mutationFn: async (id: number) => {
			const res = await client.api.v1.admin.menu.items[":id"].$delete({
				param: { id: String(id) },
			});
			if (!res.ok) throw new Error("Failed to delete item");
		},
		onSuccess: () => invalidate(),
	});

	const toggleItem = useMutation({
		mutationFn: async ({
			id,
			isAvailable,
		}: {
			id: number;
			isAvailable: boolean;
		}) => {
			const res = await client.api.v1.admin.menu.items[":id"].$put({
				param: { id: String(id) },
				json: { isAvailable },
			});
			if (!res.ok) throw new Error("Failed to update item");
		},
		onSuccess: () => invalidate(),
	});

	// ── Expand helpers ────────────────────────────────────────────────────────

	function toggleExpand(id: number) {
		setExpanded((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	// ── Render ────────────────────────────────────────────────────────────────

	const isLoading =
		catQuery.isLoading || (tab === "items" && itemQuery.isLoading);
	const isError = catQuery.isError || (tab === "items" && itemQuery.isError);

	return (
		<div className="p-6 space-y-5 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-bold text-zinc-100">Menu</h1>
					<p className="text-sm text-zinc-500 mt-0.5">
						{categories.length} categories ·{" "}
						{categories.reduce((n, c) => n + c.items.length, 0)} items
					</p>
				</div>
				<button
					type="button"
					onClick={() =>
						setModal(
							tab === "categories"
								? { type: "add-category" }
								: { type: "add-item" },
						)
					}
					className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
				>
					<Plus className="w-4 h-4" />
					{tab === "categories" ? "Add category" : "Add item"}
				</button>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
				{(["categories", "items"] as Tab[]).map((t) => (
					<button
						type="button"
						key={t}
						onClick={() => setTab(t)}
						className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
							tab === t
								? "bg-zinc-700 text-zinc-100"
								: "text-zinc-500 hover:text-zinc-300"
						}`}
					>
						{t}
					</button>
				))}
			</div>

			{/* Loading */}
			{isLoading && (
				<div className="flex items-center justify-center py-16">
					<Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
				</div>
			)}

			{/* Error */}
			{isError && (
				<div className="flex items-center justify-center gap-2 py-16 text-red-400">
					<AlertCircle className="w-4 h-4" />
					<span className="text-sm">Failed to load menu data</span>
				</div>
			)}

			{/* ── Categories Tab ── */}
			{!isLoading && !isError && tab === "categories" && (
				<div className="space-y-3">
					{categories.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
							<UtensilsCrossed className="w-8 h-8" />
							<p className="text-sm">
								No categories yet — add one to get started
							</p>
						</div>
					)}
					{categories.map((cat) => (
						<div
							key={cat.id}
							className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
						>
							{/* Category row */}
							<div className="flex items-center gap-3 px-4 py-3">
								<button
									type="button"
									onClick={() => toggleExpand(cat.id)}
									className="text-zinc-500 hover:text-zinc-300 transition-colors"
								>
									{expanded.has(cat.id) ? (
										<ChevronDown className="w-4 h-4" />
									) : (
										<ChevronRight className="w-4 h-4" />
									)}
								</button>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold text-zinc-200">
											{cat.name}
										</span>
										{!cat.isActive && (
											<span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
												inactive
											</span>
										)}
									</div>
									{cat.description && (
										<p className="text-xs text-zinc-600 truncate">
											{cat.description}
										</p>
									)}
								</div>
								<span className="text-xs text-zinc-600 shrink-0">
									{cat.items.length} items
								</span>
								<div className="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onClick={() => setModal({ type: "edit-category", cat })}
										className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
									>
										<Pencil className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => {
											if (confirm(`Delete "${cat.name}"?`))
												deleteCat.mutate(cat.id);
										}}
										className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>

							{/* Expanded items */}
							{expanded.has(cat.id) && cat.items.length > 0 && (
								<div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
									{cat.items.map((item: Item) => (
										<div
											key={item.id}
											className="flex items-center gap-3 px-4 py-2.5 pl-11"
										>
											<Tag className="w-3 h-3 text-zinc-600 shrink-0" />
											<span className="flex-1 text-xs text-zinc-300 truncate">
												{item.name}
											</span>
											{item.station && (
												<span className="text-xs text-zinc-600 shrink-0">
													{item.station}
												</span>
											)}
											<span className="text-xs text-zinc-400 shrink-0">
												৳{item.basePrice}
											</span>
										</div>
									))}
								</div>
							)}
							{expanded.has(cat.id) && cat.items.length === 0 && (
								<div className="border-t border-zinc-800 px-11 py-3 text-xs text-zinc-600">
									No items in this category
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{/* ── Items Tab ── */}
			{!isLoading && !isError && tab === "items" && (
				<div className="space-y-2">
					{items.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
							<UtensilsCrossed className="w-8 h-8" />
							<p className="text-sm">No items yet — add one to get started</p>
						</div>
					)}
					{items.map((item: Item) => {
						const cat = categories.find((c) => c.id === item.categoryId);
						return (
							<div
								key={item.id}
								className={`flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 ${!item.isAvailable ? "opacity-60" : ""}`}
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-zinc-200 truncate">
											{item.name}
										</span>
										{item.station && (
											<span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 shrink-0">
												{item.station}
											</span>
										)}
									</div>
									<p className="text-xs text-zinc-600 truncate">
										{cat?.name ?? "—"} · {item.prepTimeMin}min
									</p>
								</div>
								<span className="text-sm font-medium text-zinc-300 shrink-0">
									৳{item.basePrice}
								</span>
								<button
									type="button"
									onClick={() =>
										toggleItem.mutate({
											id: item.id,
											isAvailable: !item.isAvailable,
										})
									}
									className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
									title={
										item.isAvailable ? "Mark unavailable" : "Mark available"
									}
								>
									{item.isAvailable ? (
										<ToggleRight className="w-5 h-5 text-orange-400" />
									) : (
										<ToggleLeft className="w-5 h-5" />
									)}
								</button>
								<div className="flex items-center gap-1 shrink-0">
									<button
										type="button"
										onClick={() => setModal({ type: "edit-item", item })}
										className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
									>
										<Pencil className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => {
											if (confirm(`Delete "${item.name}"?`))
												deleteItem.mutate(item.id);
										}}
										className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* ── Modals ── */}

			{modal?.type === "add-category" && (
				<Modal title="Add Category" onClose={() => setModal(null)}>
					<CategoryForm
						loading={addCat.isPending}
						onSubmit={(data) => addCat.mutate(data)}
					/>
					{addCat.isError && (
						<p className="text-xs text-red-400 mt-2">
							{(addCat.error as Error).message}
						</p>
					)}
				</Modal>
			)}

			{modal?.type === "edit-category" && (
				<Modal title="Edit Category" onClose={() => setModal(null)}>
					<CategoryForm
						initial={modal.cat}
						loading={editCat.isPending}
						onSubmit={(data) =>
							editCat.mutate({ id: modal.cat.id, body: data })
						}
					/>
					{editCat.isError && (
						<p className="text-xs text-red-400 mt-2">
							{(editCat.error as Error).message}
						</p>
					)}
				</Modal>
			)}

			{modal?.type === "add-item" && (
				<Modal title="Add Item" onClose={() => setModal(null)}>
					<ItemForm
						categories={categories}
						loading={addItem.isPending}
						onSubmit={(data) => addItem.mutate(data)}
					/>
					{addItem.isError && (
						<p className="text-xs text-red-400 mt-2">
							{(addItem.error as Error).message}
						</p>
					)}
				</Modal>
			)}

			{modal?.type === "edit-item" && (
				<Modal title="Edit Item" onClose={() => setModal(null)}>
					<ItemForm
						initial={modal.item}
						categories={categories}
						loading={editItem.isPending}
						onSubmit={(data) =>
							editItem.mutate({ id: modal.item.id, body: data })
						}
					/>
					{editItem.isError && (
						<p className="text-xs text-red-400 mt-2">
							{(editItem.error as Error).message}
						</p>
					)}
				</Modal>
			)}
		</div>
	);
}
