# Diagramme du système Timer avec Actions

## Timeline d'un Timer avec Actions

```
Timer: Cérémonie de Mariage (60 minutes)
Début: 14:00 | Fin: 15:00

Timeline:
═══════════════════════════════════════════════════════════════════════════

14:00  ┌────────┐
(0min) │ ACTION │ Image de bienvenue (triggerOffsetMinutes: 0, positif après début)
       └────────┘

14:05  ┌────────┐
(5min) │ ACTION │ Musique d'entrée (triggerOffsetMinutes: 5)
       └────────┘

14:15  ┌────────┐
(15min)│ ACTION │ Discours (triggerOffsetMinutes: 15)
       └────────┘

14:30  ┌────────┐
(30min)│ ACTION │ Vidéo du couple (triggerOffsetMinutes: 30)
       └────────┘

14:45  ┌────────┐
(45min)│ ACTION │ Galerie photos (triggerOffsetMinutes: 45)
       └────────┘

14:50  ┌────────┐
(-10m) │ ACTION │ Musique de clôture (triggerOffsetMinutes: -10, avant la fin)
       └────────┘

14:55  ┌────────┐
(-5m)  │ ACTION │ Annonce bouquet (triggerOffsetMinutes: -5)
       └────────┘

15:00  ┌────────┐
(FIN)  │ ACTION │ Image finale (triggerOffsetMinutes: 0, à la fin)
       └────────┘

═══════════════════════════════════════════════════════════════════════════
```

## Calcul du temps de déclenchement

### 1. Offset positif (après le début)

```
triggerOffsetMinutes = 15

┌────────────────────────────────────────────┐
│ startTime    triggerTime          endTime  │
│    │             │                    │     │
│ 14:00 ──15min──→ 14:15 ────45min───→ 15:00 │
└────────────────────────────────────────────┘

triggerTime = startTime + offset
            = 14:00 + 15 min
            = 14:15
```

### 2. Offset négatif (avant la fin)

```
triggerOffsetMinutes = -10

┌────────────────────────────────────────────┐
│ startTime        triggerTime      endTime  │
│    │                 │                │     │
│ 14:00 ────50min───→ 14:50 ──10min──→ 15:00 │
└────────────────────────────────────────────┘

triggerTime = startTime + (duration + offset)
            = 14:00 + (60 + (-10))
            = 14:00 + 50 min
            = 14:50
```

### 3. Offset à zéro (à la fin)

```
triggerOffsetMinutes = 0 (à la fin)

┌────────────────────────────────────────┐
│ startTime                    triggerTime│
│    │                              │     │
│ 14:00 ────────60min──────────→ 15:00   │
└────────────────────────────────────────┘

triggerTime = startTime + duration
            = 14:00 + 60 min
            = 15:00
```

## États du hook

```typescript
useTimerWithActions({
  startTime: "2025-10-25T14:00:00.000Z",
  durationMinutes: 60,
  actions: [...],
  onActionTrigger: (action) => { ... }
})

Retourne:
┌─────────────────────────────────────────────────────┐
│ timeLeft: {                                         │
│   days: 0,                                          │
│   hours: 0,                                         │
│   minutes: 45,  ← Temps jusqu'à la FIN du timer    │
│   seconds: 30,                                      │
│   totalSeconds: 2730                                │
│ }                                                   │
│                                                     │
│ isExpired: false                                    │
│ isRunning: true                                     │
│                                                     │
│ currentAction: {  ← Action EN COURS                 │
│   title: "Musique d'entrée",                       │
│   type: "SOUND",                                    │
│   triggerOffsetMinutes: 5                          │
│ }                                                   │
│                                                     │
│ nextAction: {  ← PROCHAINE action à déclencher      │
│   title: "Discours",                               │
│   type: "IMAGE",                                    │
│   triggerOffsetMinutes: 15                         │
│ }                                                   │
│                                                     │
│ timeUntilNextAction: 600  ← En secondes (10 min)   │
└─────────────────────────────────────────────────────┘
```

## Flux de déclenchement

```
Chaque seconde (ou updateInterval):
│
├─ 1. Calculer le temps jusqu'à la fin du timer
│   └─→ timeLeft
│
├─ 2. Pour chaque action non exécutée:
│   │
│   ├─ Calculer son temps de déclenchement
│   │   └─→ actionTriggerTime = f(startTime, duration, offset)
│   │
│   ├─ Comparer avec l'heure actuelle
│   │   │
│   │   ├─ Si actionTriggerTime <= now && !executedAt:
│   │   │   ├─→ currentAction = action
│   │   │   ├─→ onActionTrigger(action)
│   │   │   └─→ Marquer comme déclenchée (triggeredActionsRef)
│   │   │
│   │   └─ Si actionTriggerTime > now:
│   │       ├─→ nextAction = action
│   │       └─→ timeUntilNextAction = (actionTriggerTime - now) / 1000
│   │
│   └─ Continuer...
│
└─ 3. Si temps restant <= 0:
    ├─→ isExpired = true
    ├─→ isRunning = false
    └─→ onExpire()
```

## Architecture des composants

```
App
│
└─ TimerDisplay (composant principal)
    │
    ├─ useTimerWithActions (hook)
    │   │
    │   ├─ Calcule timeLeft
    │   ├─ Détecte currentAction
    │   ├─ Détecte nextAction
    │   └─ Appelle onActionTrigger()
    │
    ├─ TimerCountdown (affiche le temps restant)
    │   └─ Reçoit timeLeft
    │
    └─ ActionDisplay (affiche l'action courante)
        │   └─ Reçoit currentAction & actions
        │
        ├─ VideoAction (si type === "VIDEO")
        ├─ SoundAction (si type === "SOUND")
        ├─ ImageAction (si type === "IMAGE")
        ├─ GalleryAction (si type === "GALLERY")
        └─ ImageWithSound (si type === "IMAGE_SOUND")
```

## Exemple de données

```typescript
// Timer en DB
{
  id: "timer-123",
  name: "Cérémonie",
  scheduledStartTime: "2025-10-25T14:00:00.000Z",  // 14:00 locale
  durationMinutes: 60,
  status: "PENDING",
  actions: [
    {
      id: "action-1",
      type: "IMAGE",
      triggerOffsetMinutes: 0,
      title: "Bienvenue",
      url: "/welcome.jpg",
      orderIndex: 0
    },
    {
      id: "action-2",
      type: "SOUND",
      triggerOffsetMinutes: 5,
      title: "Musique d'entrée",
      url: "/entry.mp3",
      orderIndex: 1
    },
    {
      id: "action-3",
      type: "VIDEO",
      triggerOffsetMinutes: -10,
      title: "Vidéo de clôture",
      url: "/closing.mp4",
      orderIndex: 2
    },
    {
      id: "action-4",
      type: "IMAGE",
      triggerOffsetMinutes: 0,  // À la fin
      title: "Merci",
      url: "/thanks.jpg",
      orderIndex: 3
    }
  ]
}

// État du hook à 14:03
{
  timeLeft: { minutes: 57, seconds: 0, ... },
  isExpired: false,
  isRunning: true,
  currentAction: {
    id: "action-1",
    title: "Bienvenue",
    // Déclenchée à 14:00
  },
  nextAction: {
    id: "action-2",
    title: "Musique d'entrée",
    // Se déclenchera à 14:05
  },
  timeUntilNextAction: 120  // 2 minutes (en secondes)
}
```

## Cas d'usage avancés

### Scénario 1: Actions à la fin`

```
Timer: 30 minutes
Actions a la fin du timer

14:30:00 → Video 1 (offset: 0)
...
```

### Scénario 2: Actions avant la fin

```
Timer: 120 minutes (film)

14:00 → Début du film
15:45 → Rappel entracte (offset: -15, 15 min avant la fin)
15:50 → Annonce fin (offset: -10)
16:00 → Générique (offset: 0)
```

### Scénario 3: Timer ponctuel (durationMinutes = 0)

```
Timer ponctuel à 14:00 (pas de countdown)

Actions déclenchées immédiatement:
- Toutes avec offset = 0
- Pas de notion "avant la fin"
```
