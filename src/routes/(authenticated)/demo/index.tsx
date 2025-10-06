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
        data: { weddingEventId },
      }),
  });

export const Route = createFileRoute("/(authenticated)/demo/")({
  component: DemoPage,
  loader: async ({ context }) => {
    const data = await context.queryClient.ensureQueryData(
      currentTimerQueryOptions("wedding-event-demo"),
    );
    return data;
  },
});

function DemoPage() {
  // Active le polling pour vérifier les timers (toutes les 30 secondes)
  const { currentTimer } = usePusher();
  console.log("[DemoPage] currentTimer from PusherContext:", currentTimer);

  // const { data: currentTimerr } = useSuspenseQuery(
  //   currentTimerQueryOptions("wedding-event-demo"),
  // );

  return (
    <main className="relative">
      <WeddingTimerSection currentTimer={currentTimer} />
    </main>
  );
}
