import { env } from "@/env/client";
import { getCurrentTimer } from "@/lib/actions/timer.action";
import { QUERY_KEYS } from "@/lib/constant/constant";
import { TimerAction } from "@/lib/db/schema";
import { ACTION_UPDATED, CHANNEL, TIMER_UPDATED, logger } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import Pusher from "pusher-js";
import { createContext, use, useEffect, useMemo, useState } from "react";

interface PusherContextType {
  pusher: Pusher | null;
  currentTimer: Awaited<ReturnType<typeof getCurrentTimer>> | null;
  isLoading: boolean;
  refetch: () => void;
  updatedAction: {
    actionId: string;
    timerId: string;
    nextAction: TimerAction | null;
  } | null;
  clearUpdatedAction: () => void;
}

export const PusherContext = createContext<PusherContextType>({
  pusher: null,
  currentTimer: null,
  isLoading: false,
  refetch: () => {},
  updatedAction: null,
  clearUpdatedAction: () => {},
});

// Instance unique de Pusher partagée dans toute l'application
let pusherInstance: Pusher | null = null;

const getPusherInstance = (): Pusher => {
  if (!pusherInstance) {
    // Configuration Pusher en mode développement uniquement

    // Initialiser Pusher une seule fois
    pusherInstance = new Pusher(env.VITE_PUSHER_KEY, {
      cluster: env.VITE_PUSHER_CLUSTER,
    });

    logger("Nouvelle instance Pusher créée");
  } else {
    logger("Réutilisation de l'instance Pusher existante");
  }

  return pusherInstance;
};

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
  // useTimerPolling("wedding-event-1");
  const weddingParams = location.pathname.includes("demo")
    ? "wedding-event-demo"
    : "wedding-event-1";

  // State pour stocker l'action mise à jour via Pusher
  const [updatedAction, setUpdatedAction] = useState<{
    actionId: string;
    timerId: string;
    nextAction: TimerAction | null;
  } | null>(null);

  const getCurrentTimerFn = useServerFn(getCurrentTimer);
  const {
    data: currentTimer,
    refetch: refetchCurrentTimer,
    isLoading,
  } = useQuery({
    queryKey: [QUERY_KEYS.TIMER, weddingParams],
    queryFn: () =>
      getCurrentTimerFn({
        data: {
          weddingEventId: weddingParams,
        },
      }),
  });

  const pusher = useMemo(() => {
    // Obtenir l'instance unique de Pusher
    return getPusherInstance();
  }, []);

  useEffect(() => {
    if (!pusher) return;

    // S'abonner au canal principal (seulement si pas déjà abonné)
    const channel = pusher.subscribe(CHANNEL);

    // Créer une fonction unique pour ce composant
    const handleTimerUpdate = (data: { id: string }) => {
      logger(`Timer updated via Pusher: ${JSON.stringify(data)}`);
      console.log("Je passe par le timer update");

      // Refetch timer data and invalidate router
      refetchCurrentTimer();
      router.invalidate().catch((error) => {
        logger(`Router invalidation error: ${error.message || error.toString()}`);
      });
    };

    // Créer une fonction unique pour ce composant
    const handleActionUpdate = (data: {
      actionId: string;
      timerId: string;
      nextAction: TimerAction | null;
    }) => {
      logger(`Action updated via Pusher: ${JSON.stringify(data)}`);

      // Stocker l'action mise à jour dans le state
      setUpdatedAction(data);
      console.log("Je passe par l action update");

      // Refetch timer data and invalidate router
      refetchCurrentTimer();
      router.invalidate().catch((error) => {
        logger(`Router invalidation error: ${error.message || error.toString()}`);
      });
    };

    // Écouter les événements de mise à jour des timers
    channel.bind(TIMER_UPDATED, handleTimerUpdate);
    channel.bind(ACTION_UPDATED, handleActionUpdate);

    // Nettoyage à la fermeture du composant
    return () => {
      // Ne supprimer que le listener spécifique à ce composant
      channel.unbind(TIMER_UPDATED, handleTimerUpdate);
      channel.unbind(ACTION_UPDATED, handleActionUpdate);
      // Ne pas déconnecter Pusher car d'autres composants peuvent l'utiliser
      // La déconnexion se fera quand l'application se ferme
    };
  }, [pusher, router, refetchCurrentTimer]);

  // Fonction pour réinitialiser updatedAction après traitement
  const clearUpdatedAction = () => {
    console.log("🧹 Clearing updatedAction");
    setUpdatedAction(null);
  };

  const contextValue = useMemo(
    () => ({
      pusher,
      currentTimer: currentTimer || null,
      isLoading,
      refetch: refetchCurrentTimer,
      updatedAction,
      clearUpdatedAction,
      nextAction: updatedAction?.nextAction || null,
    }),
    [pusher, currentTimer, isLoading, refetchCurrentTimer, updatedAction],
  );

  return <PusherContext value={contextValue}>{children}</PusherContext>;
}
