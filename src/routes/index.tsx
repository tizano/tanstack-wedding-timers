import WeddingTimerSection from "@/components/timer/WeddingTimerSection";
import { getCurrentTimer } from "@/lib/actions/timer.action";
import { usePusher } from "@/lib/provider/puhser/pusher-provider";
import { queryOptions } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

const currentTimerQueryOptions = (weddingEventId: string) =>
  queryOptions({
    queryKey: ["currentTimer", weddingEventId],
    queryFn: () =>
      getCurrentTimer({
        data: { weddingEventId: "wedding-event-1" },
      }),
  });

export const Route = createFileRoute("/")({
  component: HomePage,
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(
      currentTimerQueryOptions("wedding-event-1"),
    );
    return data;
  },
});

function HomePage() {
  const { currentTimer } = usePusher();

  return (
    <main className="relative overflow-x-hidden">
      <WeddingTimerSection currentTimer={currentTimer} />
    </main>
  );
}
