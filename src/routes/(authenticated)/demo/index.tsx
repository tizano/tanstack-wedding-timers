import WeddingTimerSection from "@/components/timer/WeddingTimerSection";
import { getCurrentTimer } from "@/lib/actions/timer.action";
import { QUERY_KEYS } from "@/lib/constant/constant";
import { usePusher } from "@/lib/provider/puhser/pusher-provider";
import { queryOptions } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

const currentTimerQueryOptions = (weddingEventId: string) =>
  queryOptions({
    queryKey: [QUERY_KEYS.TIMER, weddingEventId],
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
  const { currentTimer } = usePusher();

  return (
    <main className="relative">
      <WeddingTimerSection currentTimer={currentTimer} />
    </main>
  );
}
