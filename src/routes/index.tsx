import { Button } from "@/components/ui/button";
import { getCurrentTimer } from "@/lib/actions/timer.action";
import { logger } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
  loader: async () => {
    logger("Loading homepage with current timer data");
    const currentTimer = await getCurrentTimer({
      data: { weddingEventId: "wedding-event-1" },
    });
    logger(`Current timer loaded: ${currentTimer ? currentTimer.name : "none"}`);
    return { currentTimer };
  },
});

function HomePage() {
  const navigate = Route.useNavigate();
  const { currentTimer } = Route.useLoaderData();
  // const { data: currentTimer } = useQuery(
  //   trpc.timers.getCurrentTimer.queryOptions({
  //     weddingEventId: "wedding-event-1",
  //   }),
  // );

  return (
    <main className="relative overflow-x-hidden">
      <section>
        <article>
          <video
            src="/assets/videos/universe.mp4"
            autoPlay
            muted
            loop
            className="absolute top-0 left-0 z-0 h-full w-full object-cover"
          ></video>
          <div className="absolute top-0 left-0 z-10 h-full w-full bg-black/70"></div>
          <div className="relative z-20 flex h-screen flex-col items-center justify-center gap-8">
            <h1 className="relative mb-4 text-center text-6xl font-bold text-gray-50">
              Tony & Neka
            </h1>
            {currentTimer ? (
              <div className="space-y-2 text-center text-gray-200">
                <h2 className="text-2xl font-semibold">{currentTimer.name}</h2>
                {currentTimer.scheduledStartTime && (
                  <p className="text-lg">
                    Programmé pour:{" "}
                    {new Date(currentTimer.scheduledStartTime).toLocaleString("fr-FR")}
                  </p>
                )}
                {currentTimer.durationMinutes && currentTimer.durationMinutes > 0 && (
                  <p className="text-md opacity-80">
                    Durée: {currentTimer.durationMinutes} minutes
                  </p>
                )}
                <p className="text-sm opacity-60">
                  Statut: {currentTimer.status || "En attente"}
                </p>
              </div>
            ) : (
              <div className="text-xl text-gray-300">Aucun timer programmé</div>
            )}
            <div className="group absolute top-0 right-0 p-4">
              <Button
                onClick={() =>
                  navigate({
                    to: "/dashboard/$weddingEventId",
                    params: { weddingEventId: "wedding-event-1" },
                  })
                }
                variant={"outline"}
                className="translate-x-[calc(100%+2rem)] cursor-pointer transition-transform group-hover:translate-x-0"
              >
                Go to dashboard
              </Button>
            </div>
            {/* {data?.timers && (
              <>
                <Timer timers={data.timers} />

                <div className="absolute bottom-16 right-16 min-w-[400px]">
                  <TimerList timers={data.timers} />
                </div>
              </>
            )} */}
          </div>
        </article>
      </section>
    </main>
  );
}
