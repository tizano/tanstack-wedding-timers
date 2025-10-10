import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Link
        to="/dashboard/$weddingEventId"
        params={{ weddingEventId: "wedding-event-1" }}
        className="underline transition-all hover:opacity-80"
      >
        Go to Wedding Event
      </Link>
    </div>
  );
}
