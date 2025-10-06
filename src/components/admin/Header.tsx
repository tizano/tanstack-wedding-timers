import authClient from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ThemeToggle } from "../theme-toggle";
import { Button } from "../ui/button";

export const Header = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onResponse: async () => {
          // manually set to null to avoid unnecessary refetching
          queryClient.setQueryData(authQueryOptions().queryKey, null);
          await router.invalidate();
          // navigate({ to: "/login" });
        },
      },
    });
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto px-3 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex flex-shrink-0 items-center space-x-4">
              <h1
                className="text-lg font-semibold text-gray-900 transition-colors hover:cursor-pointer hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
                onClick={() =>
                  navigate({
                    to: "/dashboard/$weddingEventId",
                    params: { weddingEventId: "wedding-event-1" },
                  })
                }
              >
                Tony & Neka Timers
              </h1>
              <Link
                to="/"
                className="text-gray-900 hover:cursor-pointer hover:text-gray-700 hover:underline dark:text-gray-100 dark:hover:text-gray-300"
              >
                Home Wedding
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
