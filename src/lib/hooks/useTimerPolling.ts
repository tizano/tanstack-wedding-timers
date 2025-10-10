// import { checkAndStartWedding } from "@/lib/actions/timer.action";
// import { useQueryClient } from "@tanstack/react-query";
// import { useEffect, useRef } from "react";

// /**
//  * Hook pour vérifier automatiquement et démarrer les timers
//  * toutes les 30 secondes en fonction de leur scheduledStartTime
//  *
//  * Vérifie:
//  * 1. Si le mariage doit démarrer (premier timer avec durée)
//  * 2. Si des timers ponctuels doivent démarrer
//  *
//  * @param weddingEventId - L'ID de l'événement de mariage
//  * @param enabled - Active ou désactive le polling (par défaut: true)
//  */
// export function useTimerPolling(weddingEventId: string, enabled = true) {
//   const queryClient = useQueryClient();
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);

//   useEffect(() => {
//     if (!enabled || !weddingEventId) {
//       return;
//     }

//     // Fonction pour vérifier et démarrer les timers
//     const checkTimers = async () => {
//       try {
//         console.log(`[Timer Polling] Vérification des timers pour ${weddingEventId}...`);

//         // 1. Vérifier si le mariage doit démarrer
//         const weddingStartResult = await checkAndStartWedding({
//           data: { weddingEventId },
//         });

//         if (weddingStartResult.started) {
//           console.log(
//             `[Timer Polling] ✅ Mariage démarré: ${weddingStartResult.timerName}`,
//           );
//         }

//         // Invalider le cache pour forcer le rechargement des données
//         queryClient.invalidateQueries({
//           queryKey: ["timers", weddingEventId],
//         });

//         console.log(`[Timer Polling] Vérification terminée pour ${weddingEventId}`);
//       } catch (error) {
//         console.error(
//           "[Timer Polling] Erreur lors de la vérification des timers:",
//           error,
//         );
//       }
//     };

//     // Exécuter immédiatement au montage
//     checkTimers();

//     // Configurer l'intervalle de 30 secondes
//     intervalRef.current = setInterval(checkTimers, 30000);

//     // Cleanup: nettoyer l'intervalle au démontage
//     return () => {
//       if (intervalRef.current) {
//         clearInterval(intervalRef.current);
//         intervalRef.current = null;
//         console.log(`[Timer Polling] Arrêt du polling pour ${weddingEventId}`);
//       }
//     };
//   }, [weddingEventId, enabled, queryClient]);
// }
