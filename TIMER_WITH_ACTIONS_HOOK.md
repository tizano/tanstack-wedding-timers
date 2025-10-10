# Hook useTimerWithActions - Documentation

## Vue d'ensemble

Le hook `useTimerWithActions` est une extension du hook `useTimerCountdown` qui gère également les **actions du timer** avec leur `triggerOffsetMinutes`. Ce hook permet de déclencher automatiquement des actions (images, sons, vidéos, galeries) à des moments précis pendant la durée du timer.

## Concept des Actions

Les actions d'un timer sont définies dans la table `timer_action` avec un champ `triggerOffsetMinutes` qui détermine **quand** l'action doit être déclenchée:

### Types de déclenchement

1. **Offset positif** (`triggerOffsetMinutes > 0`):
   - Déclenche l'action X minutes **après le début** du timer
   - Exemple: `triggerOffsetMinutes: 5` → action à 5 minutes après le début

2. **Offset à zéro** (`triggerOffsetMinutes = 0`):
   - Déclenche l'action **à la fin** du timer
   - Exemple: parfait pour une image de clôture

3. **Offset négatif** (`triggerOffsetMinutes < 0`):
   - Déclenche l'action X minutes **avant la fin** du timer
   - Exemple: `triggerOffsetMinutes: -15` → action à 15 minutes avant la fin
   - Pour un timer de 60 minutes, l'action se déclenche à 45 minutes après le début

## Calcul du temps de déclenchement

```typescript
function calculateActionTriggerTime(
  startTime: Date,
  durationMinutes: number,
  triggerOffsetMinutes: number,
): Date {
  if (triggerOffsetMinutes === 0) {
    // À la fin: startTime + duration
    return new Date(startTime.getTime() + durationMinutes * 60000);
  } else if (triggerOffsetMinutes < 0) {
    // X min avant la fin: startTime + (duration + offset)
    // Ex: duration=60, offset=-15 → startTime + 45 minutes
    return new Date(
      startTime.getTime() + (durationMinutes + triggerOffsetMinutes) * 60000,
    );
  } else {
    // X min après le début: startTime + offset
    return new Date(startTime.getTime() + triggerOffsetMinutes * 60000);
  }
}
```

## Schéma de la DB

```sql
CREATE TABLE timer_action (
  id TEXT PRIMARY KEY,
  timer_id TEXT REFERENCES timer(id),
  type asset_type NOT NULL,           -- SOUND, VIDEO, IMAGE, GALLERY, IMAGE_SOUND
  status status DEFAULT 'PENDING',    -- PENDING, RUNNING, COMPLETED
  trigger_offset_minutes INTEGER DEFAULT 0,
  title TEXT,
  url TEXT,                           -- pour sons/vidéos/images
  urls TEXT[],                        -- pour galeries
  content_fr TEXT,                    -- contenu multilingue
  content_en TEXT,
  content_br TEXT,
  order_index INTEGER DEFAULT 0,
  display_duration_sec INTEGER,       -- durée d'affichage
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP               -- timestamp d'exécution
);
```

## Utilisation du hook

### Import

```typescript
import { useTimerWithActions } from "@/lib/hooks/useTimerWithActions";
```

### Signature

```typescript
interface UseTimerWithActionsOptions {
  startTime: Date | string | null; // Date de début (timezone-agnostic)
  durationMinutes: number; // Durée du timer
  actions: TimerAction[]; // Liste des actions
  onExpire?: () => void; // Callback à l'expiration
  onActionTrigger?: (action: TimerAction) => void; // Callback au déclenchement d'action
  updateInterval?: number; // Intervalle de mise à jour (défaut: 1000ms)
}

interface UseTimerWithActionsReturn {
  timeLeft: TimeLeft; // Temps restant
  isExpired: boolean; // Timer expiré?
  isRunning: boolean; // Timer en cours?
  currentAction: TimerAction | null; // Action actuellement déclenchée
  nextAction: TimerAction | null; // Prochaine action à déclencher
  timeUntilNextAction: number; // Temps avant prochaine action (en secondes)
}
```

### Exemple d'utilisation

```typescript
const MyTimerComponent = ({ timer }: { timer: TimerWithActions }) => {
  const {
    timeLeft,
    isExpired,
    currentAction,
    nextAction,
    timeUntilNextAction,
  } = useTimerWithActions({
    startTime: timer.scheduledStartTime,
    durationMinutes: timer.durationMinutes,
    actions: timer.actions,
    onExpire: () => {
      console.log("Timer terminé!");
    },
    onActionTrigger: (action) => {
      console.log("Action déclenchée:", action.title);
      // Marquer l'action comme exécutée en DB
      updateActionStatus(action.id, "COMPLETED");
    },
  });

  return (
    <div>
      <h1>{timer.name}</h1>

      {/* Afficher le compte à rebours */}
      <div>
        Temps restant: {timeLeft.minutes}m {timeLeft.seconds}s
      </div>

      {/* Afficher l'action courante */}
      {currentAction && (
        <ActionDisplay
          currentAction={currentAction}
          actions={timer.actions}
        />
      )}

      {/* Info sur la prochaine action */}
      {nextAction && (
        <div>
          Prochaine action: {nextAction.title} dans {timeUntilNextAction}s
        </div>
      )}
    </div>
  );
};
```

## Exemples de scénarios

### Scénario 1: Mariage avec séquence d'actions

```typescript
// Timer: Cérémonie (60 minutes)
// Début: 14:00

const actions = [
  {
    triggerOffsetMinutes: 0, // À 14:00 (début)
    type: "IMAGE",
    title: "Bienvenue",
    url: "/welcome.jpg",
  },
  {
    triggerOffsetMinutes: 5, // À 14:05
    type: "SOUND",
    title: "Musique d'entrée",
    url: "/entry-music.mp3",
  },
  {
    triggerOffsetMinutes: 30, // À 14:30
    type: "VIDEO",
    title: "Vidéo des mariés",
    url: "/couple-video.mp4",
  },
  {
    triggerOffsetMinutes: -10, // À 14:50 (10 min avant la fin)
    type: "SOUND",
    title: "Musique de clôture",
    url: "/closing-music.mp3",
  },
  {
    triggerOffsetMinutes: 0, // À 15:00 (fin)
    type: "IMAGE",
    title: "Merci",
    url: "/thank-you.jpg",
  },
];
```

### Scénario 2: Cocktail avec galerie photos

```typescript
// Timer: Cocktail (90 minutes)
// Début: 16:00

const actions = [
  {
    triggerOffsetMinutes: 0, // À 16:00
    type: "GALLERY",
    title: "Photos du couple",
    urls: ["/photo1.jpg", "/photo2.jpg", "/photo3.jpg"],
  },
  {
    triggerOffsetMinutes: 45, // À 16:45 (mi-parcours)
    type: "IMAGE_SOUND",
    title: "Jeu interactif",
    url: "/game-image.jpg",
    soundUrl: "/game-sound.mp3",
  },
  {
    triggerOffsetMinutes: -15, // À 17:15 (15 min avant la fin)
    type: "SOUND",
    title: "Annonce du dîner",
    url: "/dinner-announcement.mp3",
  },
];
```

## Fonctionnalités du hook

### 1. Détection automatique des actions

Le hook surveille constamment l'heure actuelle et déclenche automatiquement les actions au bon moment:

```typescript
// Chaque seconde, le hook vérifie:
for (const action of sortedActions) {
  const actionTriggerTime = calculateActionTriggerTime(...);
  if (now >= actionTriggerTime && !action.executedAt) {
    // Déclencher l'action!
    onActionTrigger(action);
  }
}
```

### 2. Prévention des déclenchements multiples

Le hook utilise un `Set` pour traquer les actions déjà déclenchées:

```typescript
const triggeredActionsRef = useRef<Set<string>>(new Set());

// Lors du déclenchement
if (!triggeredActionsRef.current.has(action.id)) {
  triggeredActionsRef.current.add(action.id);
  onActionTrigger(action);
}
```

### 3. Gestion de la prochaine action

Le hook identifie la prochaine action à venir et calcule le temps restant:

```typescript
const nextAction = sortedActions.find(action => {
  const triggerTime = calculateActionTriggerTime(...);
  return triggerTime > now;
});

const timeUntilNextAction = Math.floor(
  (triggerTime.getTime() - now.getTime()) / 1000
);
```

## Intégration avec TimerDisplay

Le composant `TimerDisplay` utilise maintenant ce hook:

```typescript
const TimerDisplay = ({ timerData }: TimerDisplayProps) => {
  const {
    timeLeft,
    currentAction,
    nextAction,
    timeUntilNextAction,
  } = useTimerWithActions({
    startTime: timerData.scheduledStartTime,
    durationMinutes: timerData.durationMinutes,
    actions: timerData.actions,
    onActionTrigger: (action) => {
      // Logique de déclenchement
      console.log("Action:", action.title);
    },
  });

  return (
    <div>
      <TimerCountdown timeLeft={timeLeft} />
      {currentAction && (
        <ActionDisplay
          currentAction={currentAction}
          actions={timerData.actions}
        />
      )}
    </div>
  );
};
```

## Tests et démonstration

### Composant de démo

Un composant `TimerWithActionsDemo` est fourni pour tester le système:

```typescript
import { TimerWithActionsDemo } from "@/components/demo/TimerWithActionsDemo";

// Dans votre page de test
<TimerWithActionsDemo />
```

Ce composant crée un timer de 2 minutes avec 4 actions:

1. Image à 15 secondes (offset: 0.25 min)
2. Son à 30 secondes (offset: 0.5 min)
3. Vidéo à 1min30 (offset: -0.5 min, 30s avant la fin)
4. Image finale à 2min (offset: 0)

## Notes importantes

### Timezone-agnostic

Le hook utilise les mêmes fonctions timezone-agnostic que `useTimerCountdown`:

- Les dates sont stockées en UTC mais interprétées comme heures locales
- Fonctionne correctement peu importe le fuseau horaire de l'utilisateur

### Performance

- Le hook met à jour l'état seulement quand nécessaire
- Utilise `useCallback` pour optimiser les recalculs
- L'intervalle par défaut est de 1000ms (personnalisable)

### Gestion des erreurs

- Si `startTime` est `null`, le hook retourne des valeurs par défaut
- Si `durationMinutes` est 0, le timer est considéré comme ponctuel
- Les actions sans `triggerOffsetMinutes` sont traitées comme ayant un offset de 0

## Fichiers créés/modifiés

1. ✅ `src/lib/hooks/useTimerWithActions.ts` - Le hook principal
2. ✅ `src/components/timer/TimerDisplay.tsx` - Mis à jour pour utiliser le nouveau hook
3. ✅ `src/components/demo/TimerWithActionsDemo.tsx` - Composant de démonstration
4. ✅ `src/lib/db/schema/timer.schema.ts` - Schéma existant (référence)

## Prochaines étapes

1. Intégrer avec les mutations pour mettre à jour `executedAt` lors du déclenchement
2. Ajouter la gestion des actions manuelles (`isManual`)
3. Implémenter la logique de `displayDurationSec` pour auto-fermer les actions
4. Ajouter des animations de transition entre les actions
