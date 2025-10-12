/**
 * Composant de démonstration pour tester le hook useTimerWithActions
 * avec des actions déclenchées selon leur triggerOffsetMinutes
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { useTimerWithActions } from "@/lib/hooks/useTimerWithActions";
import { cn, createTimezoneAgnosticDate } from "@/lib/utils";
import { useState } from "react";
import ActionDisplay from "../timer/ActionDisplay";
import ActionList from "../timer/ActionList";
import { timersData } from "./timersData.mock";

export function TimerWithActionsDemo() {
  // Créer un timer de test avec des actions
  const [testStartTime] = useState<Date | null>(() => {
    const now = new Date();
    return createTimezoneAgnosticDate(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds() + 10, // Démarre dans 10 secondes
    );
  });

  // État pour forcer l'affichage d'une action manuellement
  const [manualCurrentAction, setManualCurrentAction] = useState<TimerAction | null>(
    null,
  );

  const [testActions, setTestActions] = useState<TimerAction[]>(timersData);

  const { timeLeft, isExpired, isRunning, currentAction, nextAction } =
    useTimerWithActions({
      startTime: testStartTime,
      durationMinutes: 2, // Timer de 2 minutes
      actions: testActions,
      onExpire: () => {
        console.log("🎉 Timer terminé!");
        setManualCurrentAction(null);
      },
      onActionTrigger: (action) => {
        console.log("🎬 Action déclenchée:", action.title);
      },
    });

  const handleClickStartAction = (action: TimerAction) => {
    console.log("Starting action manually:", action);

    // Forcer cette action à être affichée manuellement
    setManualCurrentAction(action);

    // Mettre à jour le tableau d'actions pour marquer le statut
    setTestActions((prevActions) =>
      prevActions.map((a) => {
        if (a.id === action.id) {
          // Marquer l'action cliquée comme en cours d'exécution
          return {
            ...a,
            status: "RUNNING" as const,
            executedAt: null, // Pas encore terminée
          };
        }
        // Marquer les autres actions comme en attente ou complétées
        if (a.status === "RUNNING") {
          return {
            ...a,
            status: "COMPLETED" as const,
            executedAt: new Date(),
          };
        }
        return a;
      }),
    );
  };

  const handleActionComplete = () => {
    console.log("Action completed");

    // Marquer l'action courante comme terminée
    const actionToComplete = manualCurrentAction || currentAction;
    if (actionToComplete) {
      setTestActions((prevActions) =>
        prevActions.map((a) => {
          if (a.id === actionToComplete.id) {
            return {
              ...a,
              status: "COMPLETED" as const,
              executedAt: new Date(),
            };
          }
          return a;
        }),
      );
      // Réinitialiser l'action manuelle
      setManualCurrentAction(null);
    }
  };

  // Utiliser l'action manuelle si définie, sinon l'action du hook
  const displayedAction = manualCurrentAction || currentAction;

  return (
    <Card className="mx-auto w-full max-w-5xl gap-3">
      <CardHeader>
        <CardTitle>Test des Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Informations du timer */}
        <div
          className={cn("grid grid-cols-1 gap-4", displayedAction && "lg:grid-cols-2")}
        >
          <div className="bg-muted rounded-lg px-4 py-2 transition-all">
            <h3 className="mb-2 font-semibold">Timer</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge
                  variant={
                    isRunning ? "RUNNING" : isExpired ? "EXECUTED" : "NOT_EXECUTED"
                  }
                >
                  {isRunning ? "En cours" : isExpired ? "Expiré" : "En attente"}
                </Badge>
              </p>
              <p>
                <span className="text-muted-foreground">Temps restant:</span>{" "}
                <span className="font-mono font-bold">
                  {timeLeft.minutes}m {timeLeft.seconds}s
                </span>
              </p>
            </div>
          </div>
          {displayedAction && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 transition-all dark:border-green-800 dark:bg-green-950">
              <h4 className="mb-2 font-semibold text-green-900 dark:text-green-100">
                ⚡ Action en cours {manualCurrentAction && "(Manual Demo)"}
              </h4>

              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>{displayedAction.title}</strong> ({displayedAction.type})
              </p>
              {displayedAction.displayDurationSec != null && (
                <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                  Durée d'affichage: {displayedAction.displayDurationSec}s
                </p>
              )}
            </div>
          )}
        </div>

        {/* Liste des actions */}
        <ActionList
          actions={testActions}
          isDemo={true}
          currentAction={currentAction}
          onActionStart={handleClickStartAction}
        />

        {/* Action courante */}
        {displayedAction && (
          <ActionDisplay
            currentAction={displayedAction}
            actions={testActions}
            timeLeft={timeLeft}
            timerId="test-timer"
            onActionComplete={handleActionComplete}
          />
        )}
      </CardContent>
    </Card>
  );
}
