# Flow d'Affichage des Actions - Documentation

## Vue d'ensemble

Le système d'affichage des actions gère un flow complet depuis le déclenchement d'une action jusqu'à sa complétion et la transition vers la suivante.

## Flow Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                   DÉCLENCHEMENT D'UNE ACTION                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: Affichage du Média avec Overlay                       │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │  Overlay (fond noir semi-transparent)                      │ │
│ │                                                             │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  Titre (si présent)                                   │ │ │
│ │  └──────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  Média (VIDEO, IMAGE, SOUND, GALLERY)                │ │ │
│ │  └──────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │  Si triggerOffsetMinutes < 0 (action avant la fin):       │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  ⏱️ Mini Timer (countdown restant)                    │ │ │
│ │  │  Days: 0  Hours: 0  Minutes: 15  Seconds: 30         │ │ │
│ │  └──────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Média terminé (onComplete)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: Affichage du Contenu Textuel (si présent)             │
│                                                                  │
│ Si contentFr || contentEn || contentBr:                         │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │  Overlay (reste ouvert)                                     │ │
│ │                                                             │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  📝 Content FR (texte principal)                      │ │ │
│ │  └──────────────────────────────────────────────────────┘ │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  📝 Content EN (texte italique)                       │ │ │
│ │  └──────────────────────────────────────────────────────┘ │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  📝 Content BR (texte italique)                       │ │ │
│ │  └──────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │  Fermeture dans: 8s                                         │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Durée: displayDurationSec secondes                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              Timer displayDurationSec terminé
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: Complétion de l'Action                                │
│                                                                  │
│ 1. Appel API: completeAction(actionId)                          │
│    └─> Marque executedAt = now                                 │
│    └─> Status = "COMPLETED"                                    │
│                                                                  │
│ 2. Appel API: getNextActionFromCurrent(timerId, actionId)      │
│    └─> Retourne la prochaine action ou null                    │
│                                                                  │
│ 3. Fermeture de l'overlay (animation fade out)                 │
│                                                                  │
│ 4. Si prochaine action existe:                                 │
│    └─> Le hook useTimerWithActions la détectera               │
│    └─> Retour à l'ÉTAPE 1 avec la nouvelle action             │
│                                                                  │
│ 5. Si aucune prochaine action:                                 │
│    └─> Timer terminé                                           │
│    └─> Affichage du timer suivant (si disponible)             │
└─────────────────────────────────────────────────────────────────┘
```

## Cas Spéciaux

### Cas 1: Action avec triggerOffsetMinutes positif

```
Timer démarre à 14:00, durée 60 minutes
Action: VIDEO à triggerOffsetMinutes: 5 (5 min après le début)

Timeline:
14:00 ─────5min────→ 14:05 ─────55min────→ 15:00
                       ▲
                    Trigger
                       │
                       ▼
    ┌──────────────────────────────────┐
    │ Overlay s'ouvre                  │
    │ Titre: "Vidéo du couple"         │
    │ Média: Lecture de la vidéo       │
    │                                  │
    │ (Pas de mini timer, offset > 0)  │
    └──────────────────────────────────┘
                       │
                    Vidéo finie
                       │
                       ▼
    ┌──────────────────────────────────┐
    │ Affichage texte multilingue      │
    │ Pendant displayDurationSec       │
    └──────────────────────────────────┘
                       │
                       ▼
                Overlay se ferme
```

### Cas 2: Action avec triggerOffsetMinutes négatif

```
Timer démarre à 14:00, durée 60 minutes
Action: SOUND à triggerOffsetMinutes: -10 (10 min avant la fin)

Timeline:
14:00 ────50min───→ 14:50 ────10min────→ 15:00
                      ▲
                   Trigger
                      │
                      ▼
    ┌──────────────────────────────────┐
    │ Overlay s'ouvre                  │
    │ Titre: "Musique de clôture"      │
    │ Média: Lecture du son            │
    │                                  │
    │ ⏱️ Mini Timer visible:            │
    │ Temps restant: 10m 00s           │
    │ (continue le countdown)          │
    └──────────────────────────────────┘
                      │
                   Son fini
                      │
                      ▼
    ┌──────────────────────────────────┐
    │ Affichage texte multilingue      │
    │ Pendant displayDurationSec       │
    └──────────────────────────────────┘
                      │
                      ▼
                Overlay se ferme
```

### Cas 3: Action SOUND avec IMAGE précédente

```
Actions:
1. IMAGE (orderIndex: 0)
2. SOUND (orderIndex: 1)

Quand SOUND se déclenche:
    │
    ▼
Détection: IMAGE existe avant SOUND?
    │
    ├─ OUI → Affiche ImageWithSound
    │         (Image de l'action 1 + Son de l'action 2)
    │
    └─ NON → Affiche AudioAction simple
              (Juste le son)
```

## États du Composant ActionDisplay

```typescript
interface ActionDisplayState {
  isHidden: boolean;           // Overlay visible/caché
  showMediaContent: boolean;   // Affichage du média
  showTextContent: boolean;    // Affichage du contenu textuel
  textContentTimer: number;    // Countdown pour le texte
}

// Flow des états:
Initial:
  { isHidden: false, showMediaContent: true, showTextContent: false, textContentTimer: null }
      ↓
Media terminé:
  { isHidden: false, showMediaContent: false, showTextContent: true, textContentTimer: 10 }
      ↓
Text timer countdown:
  { isHidden: false, showMediaContent: false, showTextContent: true, textContentTimer: 9 }
  { isHidden: false, showMediaContent: false, showTextContent: true, textContentTimer: 8 }
  ...
  { isHidden: false, showMediaContent: false, showTextContent: true, textContentTimer: 1 }
      ↓
Text terminé:
  { isHidden: true, ... } → Overlay fermé
```

## API Calls Flow

```
Action déclenchée par useTimerWithActions
    │
    ▼
ActionDisplay monte avec currentAction
    │
    ▼
Affiche le média
    │
    ▼
onComplete() du composant média enfant
    │
    ▼
handleMediaComplete()
    │
    ├─ showMediaContent = false
    │
    ├─ Si contenu textuel existe:
    │   ├─ showTextContent = true
    │   ├─ textContentTimer = displayDurationSec
    │   └─ setInterval countdown
    │
    └─ Sinon: handleActionComplete()
              │
              ▼
          completeAction API
              │
              └─> POST /api/timer-actions/complete
                  Body: { actionId }
                  Response: { action, alreadyCompleted }
              │
              ▼
          getNextActionFromCurrent API
              │
              └─> GET /api/timer-actions/next
                  Query: { timerId, actionId }
                  Response: { action } | null
              │
              ▼
          Si prochaine action:
              │
              └─> Hook détecte et déclenche
                  (retour au début du flow)
              │
          Si aucune action:
              │
              └─> Timer terminé
                  └─> Chercher timer suivant
```

## Props et Composants

### ActionDisplay

```typescript
interface ActionDisplayProps {
  currentAction: TimerAction; // Action actuelle
  actions: TimerAction[]; // Toutes les actions (pour SOUND+IMAGE)
  timeLeft: TimeLeft; // Temps restant (pour mini timer)
  timerId: string; // ID du timer (pour API calls)
  onActionComplete?: () => void; // Callback optionnel
}
```

### Composants Média Enfants

Tous les composants média (VideoAction, ImageAction, AudioAction, etc.) suivent la même interface:

```typescript
interface MediaActionProps {
  url?: string;
  urls?: string[]; // Pour GALLERY
  title?: string;
  displayDurationSec?: number;
  onComplete: () => void; // IMPORTANT: appelé quand terminé
}
```

## Gestion du displayDurationSec

```
displayDurationSec a deux utilisations:

1. Dans les composants média:
   - IMAGE: affiche l'image pendant displayDurationSec
   - GALLERY: temps par image dans le carrousel
   - AUDIO: (optionnel) arrêter après displayDurationSec
   - VIDEO: (ignoré, la vidéo a sa propre durée)

2. Pour le contenu textuel:
   - Après le média, affiche le texte pendant displayDurationSec
   - Compte à rebours visible pour l'utilisateur
```

## Exemple Complet d'une Action

```typescript
// Action en DB
{
  id: "action-123",
  timerId: "timer-456",
  type: "VIDEO",
  status: "PENDING",
  triggerOffsetMinutes: -15,    // 15 min avant la fin
  title: "Vidéo des mariés",
  url: "/videos/couple.mp4",
  contentFr: "Merci d'être présents à notre mariage!",
  contentEn: "Thank you for joining our wedding!",
  contentBr: "Obrigado por participar do nosso casamento!",
  displayDurationSec: 10,
  orderIndex: 3,
  executedAt: null
}

// Flow d'affichage:
1. Trigger à 14:45 (pour timer se terminant à 15:00)
2. Overlay s'ouvre avec:
   - Titre: "Vidéo des mariés"
   - Vidéo: couple.mp4 (lecture)
   - Mini timer: "15m 00s" (countdown visible)
3. Vidéo se termine (ex: après 2 minutes)
4. Affichage textes:
   - "Merci d'être présents à notre mariage!"
   - "Thank you for joining our wedding!"
   - "Obrigado por participar do nosso casamento!"
   - Countdown: "10s... 9s... 8s..."
5. Après 10 secondes:
   - completeAction("action-123")
   - getNextActionFromCurrent("timer-456", "action-123")
   - Overlay se ferme (fade out)
6. Si prochaine action:
   - Nouveau cycle commence
7. Sinon:
   - Timer complété
```

## Détails Techniques

### Gestion des States avec useEffect

```typescript
// Quand currentAction change, reset tous les états
useEffect(() => {
  setIsHidden(false);
  setShowMediaContent(true);
  setShowTextContent(false);
  setTextContentTimer(null);
}, [currentAction.id]);
```

### Animation de Transition

```typescript
// Classes Tailwind pour l'overlay
className={cn(
  "fixed inset-0 z-50 transition-all duration-500",
  "bg-black/70 backdrop-blur-sm",
  isHidden && "opacity-0 pointer-events-none"
)}
```

### Timer pour Contenu Textuel

```typescript
const interval = setInterval(() => {
  setTextContentTimer((prev) => {
    if (prev === null || prev <= 1) {
      clearInterval(interval);
      handleActionComplete(); // Terminer l'action
      return 0;
    }
    return prev - 1;
  });
}, 1000);
```

## Prochaines Améliorations

1. ✅ Afficher le média avec overlay
2. ✅ Mini timer si offset négatif
3. ✅ Afficher titre si présent
4. ✅ Contenu textuel multilingue après média
5. ✅ Timer pour displayDurationSec
6. ✅ Complétion et recherche suivante
7. 🔄 Gestion des actions manuelles (isManual)
8. 🔄 Animations plus sophistiquées
9. 🔄 Support multi-timers avec transition automatique
10. 🔄 Mode preview/démo pour tester les actions
