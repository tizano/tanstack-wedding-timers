/**
 * Composant de démonstration pour tester le hook useTimerWithActions
 * avec des actions déclenchées selon leur triggerOffsetMinutes
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TimerAction } from "@/lib/db/schema/timer.schema";
import { useTimerWithActions } from "@/lib/hooks/useTimerWithActions";
import { createTimezoneAgnosticDate } from "@/lib/utils";
import { useState } from "react";

export function TimerWithActionsDemo() {
  // Créer un timer de test avec des actions
  const [testStartTime, setTestStartTime] = useState<Date | null>(() => {
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

  const [testActions] = useState<TimerAction[]>([
    {
      id: "action-1",
      timerId: "test-timer",
      type: "IMAGE",
      status: "PENDING",
      triggerOffsetMinutes: 0.25, // 15 secondes après le début (0.25 * 60 = 15)
      title: "Photo d'ouverture",
      url: "/assets/images/jeu.png",
      urls: [],
      contentFr: null,
      contentEn: null,
      contentBr: null,
      orderIndex: 0,
      displayDurationSec: 10,
      createdAt: new Date(),
      executedAt: null,
    },
    {
      id: "action-2",
      timerId: "test-timer",
      type: "SOUND",
      status: "PENDING",
      triggerOffsetMinutes: 0.5, // 30 secondes après le début
      title: "Musique d'ambiance",
      url: "/assets/sounds/audio-8-cosmic-love.mp3",
      urls: [],
      contentFr: null,
      contentEn: null,
      contentBr: null,
      orderIndex: 1,
      displayDurationSec: null,
      createdAt: new Date(),
      executedAt: null,
    },
    {
      id: "action-3",
      timerId: "test-timer",
      type: "VIDEO",
      status: "PENDING",
      triggerOffsetMinutes: -0.5, // 30 secondes AVANT la fin (à 1min30 pour un timer de 2min)
      title: "Vidéo de clôture",
      url: "/assets/videos/universe.mp4",
      urls: [],
      contentFr: null,
      contentEn: null,
      contentBr: null,
      orderIndex: 2,
      displayDurationSec: 20,
      createdAt: new Date(),
      executedAt: null,
    },
    {
      id: "action-4",
      timerId: "test-timer",
      type: "IMAGE",
      status: "PENDING",
      triggerOffsetMinutes: 0, // À la fin du timer
      title: "Image finale",
      url: "/assets/images/photomaton.png",
      urls: [],
      contentFr: null,
      contentEn: null,
      contentBr: null,
      orderIndex: 3,
      displayDurationSec: 5,
      createdAt: new Date(),
      executedAt: null,
    },
  ]);

  const {
    timeLeft,
    isExpired,
    isRunning,
    currentAction,
    nextAction,
    timeUntilNextAction,
  } = useTimerWithActions({
    startTime: testStartTime,
    durationMinutes: 2, // Timer de 2 minutes
    actions: testActions,
    onExpire: () => {
      console.log("🎉 Timer terminé!");
    },
    onActionTrigger: (action) => {
      console.log("🎬 Action déclenchée:", action.title);
    },
  });

  const handleStartNow = () => {
    const now = new Date();
    setTestStartTime(
      createTimezoneAgnosticDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
      ),
    );
  };

  const handleReset = () => {
    setTestStartTime(null);
  };

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Test du Timer avec Actions</CardTitle>
        <CardDescription>
          Démonstration du déclenchement d'actions selon leur triggerOffsetMinutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations du timer */}
        <div className="bg-muted rounded-lg p-4">
          <h3 className="mb-2 font-semibold">Timer (2 minutes)</h3>
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
          <div className="space-y-2">
            {testActions.map((action) => {
              const isCurrent = currentAction?.id === action.id;
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prochaine action */}
        {nextAction && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <h4 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
              Prochaine action
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              "{nextAction.title}" dans{" "}
              <span className="font-bold">
                {Math.floor(timeUntilNextAction / 60)}m {timeUntilNextAction % 60}s
              </span>
            </p>
          </div>
        )}

        {/* Action courante */}
        {currentAction && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <h4 className="mb-2 font-semibold text-green-900 dark:text-green-100">
              ⚡ Action en cours
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>{currentAction.title}</strong> ({currentAction.type})
            </p>
            {currentAction.displayDurationSec && (
              <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                Durée d'affichage: {currentAction.displayDurationSec}s
              </p>
            )}
          </div>
        )}

        {/* Boutons de contrôle */}
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={handleStartNow} variant="default">
            Démarrer maintenant
          </Button>
          <Button onClick={handleReset} variant="destructive">
            Réinitialiser
          </Button>
        </div>

        {/* Explication */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <h4 className="mb-2 font-semibold text-amber-900 dark:text-amber-100">
            💡 Comment ça fonctionne
          </h4>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            <li>
              • <strong>triggerOffsetMinutes positif</strong>: déclenchement X minutes
              après le début
            </li>
            <li>
              • <strong>triggerOffsetMinutes = 0</strong>: déclenchement à la fin du timer
            </li>
            <li>
              • <strong>triggerOffsetMinutes négatif</strong>: déclenchement X minutes
              avant la fin
            </li>
            <li>• Les actions sont déclenchées automatiquement au bon moment</li>
            <li>
              • Le hook gère la détection de l'action courante et de la prochaine action
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
