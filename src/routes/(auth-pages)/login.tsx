import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authClient from "@/lib/auth/auth-client";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, PartyPopper } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/(auth-pages)/login")({
  component: LoginForm,
});

function LoginForm() {
  const routeContext = Route.useRouteContext();
  const redirectUrl = routeContext?.redirectUrl || "/dashboard/wedding-event-1";

  const { mutate: emailLoginMutate, isPending } = useMutation({
    mutationFn: async (data: { email: string; password: string }) =>
      await authClient.signIn.email(
        {
          ...data,
          callbackURL: redirectUrl,
        },
        {
          onError: ({ error }) => {
            toast.error(error.message || "An error occurred while signing in.");
          },
          // better-auth seems to trigger a hard navigation on login,
          // so we don't have to revalidate & navigate ourselves
          onSuccess: ({ response }) => {
            console.log("Login successful, should redirect to ", response);

            // queryClient.removeQueries({ queryKey: authQueryOptions().queryKey });
            // navigate({ to: redirectUrl });
          },
        },
      ),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return;

    emailLoginMutate({ email, password });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <PartyPopper className="size-9" />
              </div>
            </a>
            <h1 className="font-parisienne mb-4 text-6xl">Neka & Tony</h1>
            <h2 className="text-xl font-bold">Wedding timers</h2>
          </div>
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="hello@example.com"
                readOnly={isPending}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password here"
                readOnly={isPending}
                required
              />
            </div>
            <Button type="submit" className="mt-2 w-full" size="lg" disabled={isPending}>
              {isPending && <LoaderCircle className="animate-spin" />}
              {isPending ? "Logging in..." : "Login"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
