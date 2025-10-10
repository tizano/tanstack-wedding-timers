/**
 * Composant de démonstration pour tester le hook useTimerWithActions
 * avec des actions déclenchées selon leur triggerOffsetMinutes
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { useTimerWithActions } from "@/lib/hooks/useTimerWithActions";
import { createTimezoneAgnosticDate } from "@/lib/utils";
import { useState } from "react";
import ActionDisplay from "../timer/ActionDisplay";

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

  const [testActions, setTestActions] = useState<TimerAction[]>([
    {
      id: "action-1",
      timerId: "test-timer",
      type: "IMAGE",
      status: "PENDING",
      triggerOffsetMinutes: 0,
      title: "",
      url: "/assets/images/jeu.png",
      urls: [],
      contentFr: "Contenu en français pour la première action",
      contentEn: "English content for the first action",
      contentBr: "Conteúdo em português para a primeira ação",
      orderIndex: 0,
      displayDurationSec: 30,
      createdAt: new Date(),
      executedAt: null,
    },
    {
      id: "action-2",
      timerId: "test-timer",
      type: "SOUND",
      status: "PENDING",
      triggerOffsetMinutes: 0,
      title: "",
      url: "/assets/sounds/audio-1-atterrissage-tony.mp3",
      urls: [],
      contentFr: "Contenu en français pour la deuxième action",
      contentEn: "English content for the second action",
      contentBr: "Conteúdo em português para a segunda ação",
      orderIndex: 1,
      displayDurationSec: 30,
      createdAt: new Date(),
      executedAt: null,
    },
    {
      id: "action-3",
      timerId: "test-timer",
      type: "VIDEO",
      status: "PENDING",
      triggerOffsetMinutes: 0,
      title: "Vidéo de clôture",
      url: "/assets/videos/video-demo-with-sound.mp4",
      urls: [],
      contentFr: "Contenu en français pour la troisième action",
      contentEn: "English content for the third action",
      contentBr: "Conteúdo em português para a terceira ação",
      orderIndex: 2,
      displayDurationSec: 30,
      createdAt: new Date(),
      executedAt: null,
    },
    {
      id: "action-4",
      timerId: "test-timer",
      type: "IMAGE_SOUND",
      status: "PENDING",
      triggerOffsetMinutes: 0,
      title: "Image finale",
      url: "/assets/images/photomaton.png",
      urls: ["/assets/images/telephone.png", "/assets/sounds/audio-6-telephone.mp3"],
      contentFr: "Contenu en français pour la quatrième action",
      contentEn: "English content for the fourth action",
      contentBr: "Conteúdo em português para a quarta ação",
      orderIndex: 3,
      displayDurationSec: 30,
      createdAt: new Date(),
      executedAt: null,
    },
  ]);

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
    <Card className="mx-auto w-full max-w-3xl gap-3">
      <CardHeader>
        <CardTitle>Test des Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Informations du timer */}
        <div className="bg-muted rounded-lg px-4 py-2">
          <h3 className="mb-2 font-semibold">Timer</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge
                variant={isRunning ? "RUNNING" : isExpired ? "EXECUTED" : "NOT_EXECUTED"}
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

        {/* Liste des actions */}
        <div className="space-y-2">
          <h3 className="font-semibold">Actions programmées</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {testActions.map((action) => {
              const isCurrent = displayedAction?.id === action.id;
              const isNext = nextAction?.id === action.id;

              let triggerText = "";
              if (action.triggerOffsetMinutes === 0) {
                triggerText = "à la fin";
              } else if (action.triggerOffsetMinutes < 0) {
                triggerText = `${Math.abs(action.triggerOffsetMinutes)} min avant la fin`;
              } else {
                triggerText = `${action.triggerOffsetMinutes} min après le début`;
              }

              return (
                <div
                  key={action.id}
                  className={`rounded-lg border p-3 ${
                    isCurrent
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : isNext
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{action.title}</span>
                        <Badge variant="RUNNING">{action.type}</Badge>
                        {isCurrent && <Badge variant="RUNNING">EN COURS</Badge>}
                        {isNext && <Badge variant="NOT_EXECUTED">PROCHAINE</Badge>}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Déclenchement: {triggerText}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        // start the action
                        handleClickStartAction(action);
                      }}
                    >
                      Trigger
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action courante */}
        {displayedAction && (
          <>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
              <h4 className="mb-2 font-semibold text-green-900 dark:text-green-100">
                ⚡ Action en cours {manualCurrentAction && "(Manuel)"}
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
            <ActionDisplay
              currentAction={displayedAction}
              actions={testActions}
              timeLeft={timeLeft}
              timerId="test-timer"
              onActionComplete={handleActionComplete}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
