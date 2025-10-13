# Hooks de Gestion des Timers

## Vue d'ensemble

Ce dossier contient les hooks personnalisés pour gérer les timers avec synchronisation en temps réel via Pusher.

## Architecture

### `useTimerWithPusher` (Hook Principal) ⭐

Hook unifié qui gère **automatiquement** la synchronisation des données avec le `PusherProvider`.

#### Caractéristiques

✅ **Source unique de vérité** : Utilise TOUJOURS les données depuis `currentTimer` du PusherProvider
✅ **Synchronisation automatique** : Se met à jour automatiquement après chaque refetch Pusher
✅ **Simplification** : Pas besoin de passer les `actions` en paramètre
✅ **Performance** : Recalcul intelligent uniquement quand nécessaire

#### Utilisation

```tsx
import { useTimerWithPusher } from "@/lib/hooks/useTimerWithPusher";

function TimerComponent({ timerData }) {
  const {
    timeLeft,
    isExpired,
    isRunning,
    currentAction,
    nextAction,
    shouldNotifyAction,
    markActionAsCompleting,
  } = useTimerWithPusher({
    timer: timerData,
    startTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes,
    // Les actions sont automatiquement récupérées depuis PusherProvider
    onExpire: () => console.log("Timer expiré"),
    onActionTrigger: (action) => console.log("Action déclenchée:", action),
  });

  return (
    <div>
      <TimerCountdown timeLeft={timeLeft} />
      {currentAction && <ActionDisplay action={currentAction} />}
    </div>
  );
}
```

#### Paramètres

| Paramètre         | Type                     | Requis | Description                                |
| ----------------- | ------------------------ | ------ | ------------------------------------------ |
| `timer`           | `Timer`                  | ✅     | L'objet timer de base (sans actions)       |
| `startTime`       | `Date \| string \| null` | ✅     | Date de début du timer                     |
| `durationMinutes` | `number`                 | ✅     | Durée en minutes                           |
| `onExpire`        | `() => void`             | ❌     | Callback quand le timer expire             |
| `onActionTrigger` | `(action) => void`       | ❌     | Callback quand une action se déclenche     |
| `updateInterval`  | `number`                 | ❌     | Intervalle de mise à jour (défaut: 1000ms) |
| `displayLog`      | `boolean`                | ❌     | Activer les logs de debug                  |

#### Valeurs retournées

| Propriété                | Type                   | Description                                      |
| ------------------------ | ---------------------- | ------------------------------------------------ |
| `timeLeft`               | `TimeLeft`             | Temps restant (jours, heures, minutes, secondes) |
| `isExpired`              | `boolean`              | Timer terminé ?                                  |
| `isRunning`              | `boolean`              | Timer en cours ?                                 |
| `currentAction`          | `TimerAction \| null`  | Action actuellement en cours (status: RUNNING)   |
| `nextAction`             | `TimerAction \| null`  | Prochaine action à venir (status: PENDING)       |
| `shouldNotifyAction`     | `TimerAction \| null`  | Action prête à être déclenchée manuellement      |
| `markActionAsCompleting` | `(id: string) => void` | Marque une action comme en cours de complétion   |

---

### `useTimerWithActions` (Ancien Hook - Déprécié)

⚠️ **Ce hook est maintenant déprécié.** Utilisez `useTimerWithPusher` à la place.

Ce hook nécessitait de passer les actions manuellement et ne se synchronisait pas automatiquement avec Pusher.

---

## Flux de Données

```
PusherProvider (Source unique)
    ↓
currentTimer (avec actions à jour)
    ↓
useTimerWithPusher (extrait actions depuis currentTimer)
    ↓
Calcul de l'état (currentAction, nextAction, etc.)
    ↓
Composants UI (TimerDisplay, TimerCard, etc.)
```

### Synchronisation Pusher

1. **Événement Pusher reçu** (`ACTION_UPDATED` ou `TIMER_UPDATED`)
2. **PusherProvider** : `refetchCurrentTimer()` appelé
3. **React Query** : Met à jour `currentTimer` automatiquement
4. **useTimerWithPusher** : Détecte le changement via `useMemo` sur `actions`
5. **Recalcul** : L'état est recalculé avec les nouvelles données
6. **UI mise à jour** : Les composants se re-rendent avec les données fraîches

---

## Types

### `TimeLeft`

```typescript
interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}
```

### Statuts d'Action

- `PENDING` : Action en attente de déclenchement
- `RUNNING` : Action en cours d'exécution
- `COMPLETED` : Action terminée

---

## Best Practices

### ✅ À faire

```tsx
// Utiliser le hook avec les données du PusherProvider
const { currentTimer } = usePusher();
const timerState = useTimerWithPusher({
  timer: currentTimer,
  startTime: currentTimer.scheduledStartTime,
  durationMinutes: currentTimer.durationMinutes,
});
```

### ❌ À éviter

```tsx
// Ne pas passer manuellement les actions (ancien système)
const timerState = useTimerWithPusher({
  timer: timerData,
  actions: timerData.actions, // ❌ Pas nécessaire, géré automatiquement
});
```

---

## Migration depuis l'ancien système

Si vous utilisez encore `useTimerWithActions`, voici comment migrer :

### Avant

```tsx
import { useTimerWithActions } from "@/lib/hooks/useTimerWithActions";

const { timeLeft, currentAction } = useTimerWithActions({
  timer: timerData,
  startTime: timerData.scheduledStartTime,
  durationMinutes: timerData.durationMinutes,
  actions: timerData.actions, // Actions passées manuellement
});
```

### Après

```tsx
import { useTimerWithPusher } from "@/lib/hooks/useTimerWithPusher";

const { timeLeft, currentAction } = useTimerWithPusher({
  timer: timerData,
  startTime: timerData.scheduledStartTime,
  durationMinutes: timerData.durationMinutes,
  // Les actions sont récupérées automatiquement depuis PusherProvider
});
```

---

## Debugging

Activez les logs pour diagnostiquer les problèmes :

```tsx
const timerState = useTimerWithPusher({
  timer: timerData,
  startTime: timerData.scheduledStartTime,
  durationMinutes: timerData.durationMinutes,
  displayLog: true, // Active les logs de debug
});
```

Les logs affichent :

- 📦 Utilisation des actions depuis currentTimer
- ♻️ Actions mises à jour, recalcul de l'état
- 🔔 Action Pusher reçue
- 🎯 Déclenchement callback pour action
- 🔒 Marquage de l'action comme en cours de complétion
