import { Header } from "@/components/admin/Header";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-zinc-800">
      <Header />
      <div className="p-6">
        <Outlet />
      </div>
    </main>
  );
}
