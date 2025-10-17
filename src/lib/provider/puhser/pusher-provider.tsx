import { env } from "@/env/client";
import { getCurrentTimer, getTimerById } from "@/lib/actions/timer.action";
import { QUERY_KEYS } from "@/lib/constant/constant";
import { TimerAction } from "@/lib/db/schema";
import { ACTION_UPDATED, CHANNEL, TIMER_UPDATED, logger } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    punctualTimer?: Awaited<ReturnType<typeof getTimerById>>;
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
  const queryClient = useQueryClient();

  // useTimerPolling("wedding-event-1");
  const weddingParams = location.pathname.includes("demo")
    ? "wedding-event-demo"
    : "wedding-event-1";

  // State pour stocker l'action mise à jour via Pusher
  const [updatedAction, setUpdatedAction] = useState<{
    actionId: string;
    timerId: string;
    nextAction: TimerAction | null;
    punctualTimer?: Awaited<ReturnType<typeof getTimerById>>;
  } | null>(null);

  // State pour tracker les derniers updatedAt reçus
  const [lastTimerUpdate, setLastTimerUpdate] = useState<string | null>(null);
  const [lastActionUpdate, setLastActionUpdate] = useState<string | null>(null);

  const getCurrentTimerFn = useServerFn(getCurrentTimer);
  const getTimerByIdFn = useServerFn(getTimerById);

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
    const handleTimerUpdate = async (data: { id?: string; updatedAt?: string }) => {
      logger(`Timer updated via Pusher: ${JSON.stringify(data)}`);

      // Vérifier si c'est une vraie mise à jour en comparant updatedAt
      if (data.updatedAt) {
        if (lastTimerUpdate === data.updatedAt) {
          console.log(
            "⏭️ Même updatedAt détecté pour timer, skip du refetch",
            data.updatedAt,
          );
          return;
        }
        console.log(
          "🔄 Nouveau updatedAt pour timer, refetch nécessaire:",
          data.updatedAt,
        );
        setLastTimerUpdate(data.updatedAt);
      }

      // Refetch timer data and invalidate router
      // await refetchCurrentTimer();
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ACTION],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TIMER],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ALL_TIMERS],
      });
      router.invalidate().catch((error) => {
        logger(`Router invalidation error: ${error.message || error.toString()}`);
      });
    };

    // Créer une fonction unique pour ce composant
    const handleActionUpdate = async (data: {
      actionId: string;
      timerId: string;
      nextAction: TimerAction | null;
      updatedAt?: string;
    }) => {
      logger(`Action updated via Pusher: ${JSON.stringify(data)}`);

      // Vérifier si c'est une vraie mise à jour en comparant updatedAt
      if (data.updatedAt) {
        if (lastActionUpdate === data.updatedAt) {
          console.log(
            "⏭️ Même updatedAt détecté pour action, skip du refetch",
            data.updatedAt,
          );
          return;
        }
        console.log(
          "🔄 Nouveau updatedAt pour action, refetch nécessaire:",
          data.updatedAt,
        );
        setLastActionUpdate(data.updatedAt);
      }

      // Refetch timer data and invalidate router
      const result = await refetchCurrentTimer();
      console.log("refetch data from action update in pusher --- ", result.data);

      // Vérifier si l'action appartient à un timer différent du currentTimer
      // (c'est le cas pour les timers ponctuels/manuels)
      let punctualTimer = undefined;
      if (result.data && data.timerId !== result.data.id) {
        console.log(
          `Action d'un timer différent détecté (${data.timerId} vs ${result.data.id}), récupération du timer...`,
        );
        const timerData = await getTimerByIdFn({ data: { id: data.timerId } });
        if (timerData) {
          punctualTimer = timerData;
          console.log("Timer ponctuel récupéré:", timerData);
        }
      }

      // Stocker l'action mise à jour dans le state avec le timer ponctuel si disponible
      setUpdatedAction({
        ...data,
        punctualTimer,
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ACTION],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.TIMER],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ALL_TIMERS],
      });
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
  }, [
    pusher,
    router,
    refetchCurrentTimer,
    getTimerByIdFn,
    lastTimerUpdate,
    lastActionUpdate,
    queryClient,
  ]);

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
