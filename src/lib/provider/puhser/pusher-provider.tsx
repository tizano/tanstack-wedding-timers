import { env } from "@/env/client";
import { getCurrentTimer } from "@/lib/actions/timer.action";
import { CHANNEL, TIMER_UPDATED, logger } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import Pusher from "pusher-js";
import { createContext, use, useEffect, useMemo } from "react";

interface PusherContextType {
  pusher: Pusher | null;
  currentTimer: Awaited<ReturnType<typeof getCurrentTimer>> | null;
  isLoading: boolean;
  refetch: () => void;
}

const PusherContext = createContext<PusherContextType>({
  pusher: null,
  currentTimer: null,
  isLoading: false,
  refetch: () => {},
});

export const usePusher = () => {
  const context = use(PusherContext);
  if (!context) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return context;
};

interface PusherProviderProps {
  children: React.ReactNode;
}

export function PusherProvider({ children }: PusherProviderProps) {
  const router = useRouter();
  const location = useLocation();

  const getCurrentTimerFn = useServerFn(getCurrentTimer);
  const {
    data: currentTimer,
    refetch: refetchCurrentTimer,
    isLoading,
  } = useQuery({
    queryKey: ["currentTimer"],
    queryFn: () =>
      getCurrentTimerFn({
        data: {
          weddingEventId: location.pathname.includes("demo")
            ? "wedding-event-demo"
            : "wedding-event-1",
        },
      }),
  });

  const pusher = useMemo(() => {
    // Configuration Pusher en mode développement uniquement
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line react-hooks/immutability
      Pusher.logToConsole = true;
    }

    // Initialiser Pusher
    return new Pusher(env.VITE_PUSHER_KEY, {
      cluster: env.VITE_PUSHER_CLUSTER,
    });
  }, []);

  useEffect(() => {
    if (!pusher) return;

    // S'abonner au canal principal
    const channel = pusher.subscribe(CHANNEL);

    // Écouter les événements de mise à jour des timers
    channel.bind(TIMER_UPDATED, function (data: { id: string }) {
      logger(`Timer updated via Pusher: ${JSON.stringify(data)}`);

      // Refetch timer data and invalidate router
      refetchCurrentTimer();
      router.invalidate().catch((error) => {
        logger(`Router invalidation error: ${error.message || error.toString()}`);
      });
    });

    // Nettoyage à la fermeture du composant
    return () => {
      pusher.unsubscribe(CHANNEL);
      pusher.disconnect();
    };
  }, [pusher, router, refetchCurrentTimer]);

  const contextValue = useMemo(
    () => ({
      pusher,
      currentTimer: currentTimer || null,
      isLoading,
      refetch: refetchCurrentTimer,
    }),
    [pusher, currentTimer, isLoading, refetchCurrentTimer],
  );

  return <PusherContext value={contextValue}>{children}</PusherContext>;
}
