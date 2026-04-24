import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	Building2,
	Loader2,
	MapPin,
	Pencil,
	Phone,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { useState } from "react";
import { client } from "@/lib/client";

export const Route = createFileRoute("/_auth/branches/")({
	component: BranchesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
	id: number;
	name: string;
	address: string | null;
	phone: string | null;
	isActive: boolean;
	createdAt: string;
}

type ModalState = { type: "add" } | { type: "edit"; branch: Branch } | null;

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

// ─── Branch Form ──────────────────────────────────────────────────────────────

function BranchForm({
	initial,
	onSubmit,
	loading,
}: {
	initial?: Partial<Branch>;
	onSubmit: (data: {
		name: string;
		address: string;
		phone: string;
		isActive: boolean;
	}) => void;
	loading: boolean;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [address, setAddress] = useState(initial?.address ?? "");
	const [phone, setPhone] = useState(initial?.phone ?? "");
	const [isActive, setIsActive] = useState(initial?.isActive ?? true);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit({ name, address, phone, isActive });
			}}
			className="space-y-4"
		>
			<div>
				<label htmlFor="branch-name" className={labelClass()}>
					Name *
				</label>
				<input
					id="branch-name"
					className={inputClass()}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Main Branch"
					required
				/>
			</div>
			<div>
				<label htmlFor="branch-address" className={labelClass()}>
					Address
				</label>
				<input
					id="branch-address"
					className={inputClass()}
					value={address}
					onChange={(e) => setAddress(e.target.value)}
					placeholder="123 Restaurant St"
				/>
			</div>
			<div>
				<label htmlFor="branch-phone" className={labelClass()}>
					Phone
				</label>
				<input
					id="branch-phone"
					className={inputClass()}
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					placeholder="+1 234 567 890"
				/>
			</div>
			<div>
				<label htmlFor="branch-status" className={labelClass()}>
					Status
				</label>
				<select
					id="branch-status"
					className={inputClass()}
					value={isActive ? "1" : "0"}
					onChange={(e) => setIsActive(e.target.value === "1")}
				>
					<option value="1">Active</option>
					<option value="0">Inactive</option>
				</select>
			</div>
			<button
				type="submit"
				disabled={loading}
				className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
			>
				{loading && <Loader2 className="w-4 h-4 animate-spin" />}
				{initial?.id ? "Save changes" : "Add branch"}
			</button>
		</form>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function BranchesPage() {
	const qc = useQueryClient();
	const [modal, setModal] = useState<ModalState>(null);

	const invalidate = () =>
		qc.invalidateQueries({ queryKey: ["portal", "branches"] });

	// ── Query ──────────────────────────────────────────────────────────────────

	const query = useQuery({
		queryKey: ["portal", "branches"],
		queryFn: async () => {
			const res = await client.api.v1.admin.branches.$get();
			if (!res.ok) throw new Error("Failed to load branches");
			return res.json();
		},
	});

	const branches: Branch[] = (query.data?.data ?? []) as Branch[];

	// ── Mutations ──────────────────────────────────────────────────────────────

	const addBranch = useMutation({
		mutationFn: async (
			body: Parameters<typeof client.api.v1.admin.branches.$post>[0]["json"],
		) => {
			const res = await client.api.v1.admin.branches.$post({ json: body });
			if (!res.ok) throw new Error("Failed to create branch");
		},
		onSuccess: () => {
			invalidate();
			setModal(null);
		},
	});

	const editBranch = useMutation({
		mutationFn: async ({
			id,
			body,
		}: {
			id: number;
			body: Parameters<typeof client.api.v1.admin.branches.$post>[0]["json"];
		}) => {
			const res = await client.api.v1.admin.branches[":id"].$put({
				param: { id: String(id) },
				json: body,
			});
			if (!res.ok) throw new Error("Failed to update branch");
		},
		onSuccess: () => {
			invalidate();
			setModal(null);
		},
	});

	const deleteBranch = useMutation({
		mutationFn: async (id: number) => {
			const res = await client.api.v1.admin.branches[":id"].$delete({
				param: { id: String(id) },
			});
			if (!res.ok) throw new Error("Failed to delete branch");
		},
		onSuccess: () => invalidate(),
	});

	// ── Render ─────────────────────────────────────────────────────────────────

	return (
		<div className="p-6 space-y-5 max-w-5xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-bold text-zinc-100">Branches</h1>
					<p className="text-sm text-zinc-500 mt-0.5">
						{branches.length} branches
					</p>
				</div>
				<button
					type="button"
					onClick={() => setModal({ type: "add" })}
					className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
				>
					<Plus className="w-4 h-4" />
					Add branch
				</button>
			</div>

			{/* Loading */}
			{query.isLoading && (
				<div className="flex items-center justify-center py-16">
					<Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
				</div>
			)}

			{/* Error */}
			{query.isError && (
				<div className="flex items-center justify-center gap-2 py-16 text-red-400">
					<AlertCircle className="w-4 h-4" />
					<span className="text-sm">Failed to load branches</span>
				</div>
			)}

			{/* List */}
			{!query.isLoading && !query.isError && (
				<div className="space-y-2">
					{branches.length === 0 && (
						<div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-600">
							<Building2 className="w-8 h-8" />
							<p className="text-sm">
								No branches yet — add one to get started
							</p>
						</div>
					)}
					{branches.map((branch) => (
						<div
							key={branch.id}
							className={`flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 ${!branch.isActive ? "opacity-60" : ""}`}
						>
							<div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
								<Building2 className="w-5 h-5 text-orange-400" />
							</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium text-zinc-200">
										{branch.name}
									</span>
									{!branch.isActive && (
										<span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
											inactive
										</span>
									)}
								</div>
								<div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
									{branch.address && (
										<span className="flex items-center gap-1">
											<MapPin className="w-3 h-3" />
											{branch.address}
										</span>
									)}
									{branch.phone && (
										<span className="flex items-center gap-1">
											<Phone className="w-3 h-3" />
											{branch.phone}
										</span>
									)}
								</div>
							</div>
							<div className="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onClick={() => setModal({ type: "edit", branch })}
									className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
								>
									<Pencil className="w-3.5 h-3.5" />
								</button>
								<button
									type="button"
									onClick={() => {
										if (confirm(`Delete "${branch.name}"?`))
											deleteBranch.mutate(branch.id);
									}}
									className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
								>
									<Trash2 className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* ── Modals ── */}

			{modal?.type === "add" && (
				<Modal title="Add Branch" onClose={() => setModal(null)}>
					<BranchForm
						loading={addBranch.isPending}
						onSubmit={(data) => addBranch.mutate(data)}
					/>
					{addBranch.isError && (
						<p className="text-xs text-red-400 mt-2">
							{(addBranch.error as Error).message}
						</p>
					)}
				</Modal>
			)}

			{modal?.type === "edit" && (
				<Modal title="Edit Branch" onClose={() => setModal(null)}>
					<BranchForm
						initial={modal.branch}
						loading={editBranch.isPending}
						onSubmit={(data) =>
							editBranch.mutate({ id: modal.branch.id, body: data })
						}
					/>
					{editBranch.isError && (
						<p className="text-xs text-red-400 mt-2">
							{(editBranch.error as Error).message}
						</p>
					)}
				</Modal>
			)}
		</div>
	);
}
