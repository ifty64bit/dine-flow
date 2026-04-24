import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { useAuthStore } from "@/store/auth";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 30_000, retry: 1 },
	},
});

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	context: { queryClient },
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

function App() {
	const hasRehydrated = useAuthStore((s) => s.hasRehydrated);

	if (!hasRehydrated) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#09090b]">
				<div className="w-6 h-6 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
			</div>
		);
	}

	return <RouterProvider router={router} />;
}

const root = document.getElementById("app") as HTMLElement;
ReactDOM.createRoot(root).render(
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>,
);
