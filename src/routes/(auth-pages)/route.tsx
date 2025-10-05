import { ThemeToggle } from "@/components/theme-toggle";
import { authQueryOptions } from "@/lib/auth/queries";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth-pages)")({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });
    if (user) {
      throw redirect({
        to: "/dashboard/$weddingEventId",
        params: { weddingEventId: "wedding-event-1" },
      });
    }

    return {
      redirectUrl: "/dashboard/wedding-event-1",
    };
  },
});

function RouteComponent() {
  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Outlet />
      </div>
    </div>
  );
}
