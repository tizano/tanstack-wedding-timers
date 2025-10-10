import TimerList from "@/components/admin/TimerList";
import { getAllTimers } from "@/lib/actions/timer.action";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

const timersQueryOptions = (weddingEventId: string) =>
  queryOptions({
    queryKey: ["timers", weddingEventId],
    queryFn: async () => await getAllTimers({ data: { weddingEventId } }),
  });

export const Route = createFileRoute("/(authenticated)/dashboard/$weddingEventId/")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    context.queryClient.ensureQueryData(timersQueryOptions(params.weddingEventId));
  },
});

function RouteComponent() {
  const { weddingEventId } = Route.useParams();

  const { data: timersWithActions, isLoading } = useSuspenseQuery(
    timersQueryOptions(weddingEventId),
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!timersWithActions) {
    return <div>No timers found.</div>;
  }

  return (
    <TimerList
      timersWithActions={timersWithActions}
      isDemo={weddingEventId === "wedding-event-demo"}
    />
  );
}
