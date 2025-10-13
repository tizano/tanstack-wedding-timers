# Flow d'Affichage des Actions - Documentation

## Vue d'ensemble

Le système d'affichage des actions gère un flow complet depuis le déclenchement d'une action jusqu'à sa complétion et la transition vers la suivante.

## Flow Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                   DÉCLENCHEMENT D'UNE ACTION
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: Affichage du Média avec Overlay
│
│ ┌────────────────────────────────────────────────────────────┐ │
│ │  Overlay (fond noir semi-transparent)                    │
│ │                                                             │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  Titre (si présent)                                   │ │ │
│ │  └──────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │  Média (VIDEO, IMAGE, SOUND, GALLERY, IMAGE_SOUND)                │ │ │
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
                    Média terminé (onMediaComplete)
                    Overlay se ferme
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: Affichage du Contenu Textuel (si présent)             │
│                                                                  │
│ Si contentFr || contentEn || contentBr:                         │
│                                                                  │
│   ┌──────────────────────────────────────────────────────┐ │ │
│   │  📝 Content FR (texte FR)                      │ │ │
│   └──────────────────────────────────────────────────────┘ │ │
│   ┌──────────────────────────────────────────────────────┐ │ │
│   │  📝 Content EN (texte EN)                       │ │ │
│   └──────────────────────────────────────────────────────┘ │ │
│   ┌──────────────────────────────────────────────────────┐ │ │
│   │  📝 Content BR (texte BR)                       │ │ │
│   └──────────────────────────────────────────────────────┘ │ │
│                                                              │ │
│ │  Affiche le contenu textual pendant displayDurationSec secondes                      │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                               │
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

### Cas 2: Action avec triggerOffsetMinutes négatif

```
Timer démarre à 14:00, durée 60 minutes
Action: SOUND à triggerOffsetMinutes: -10 (10 min avant la fin)

Timeline:
14:00 ────50min───→ 14:50 ────10min────→ 15:00
                      ▲
                   Trigger : ETAPE 1
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
                   Son fini, overlay se ferme
                   ETAPE 2
                      │
                      ▼
    ┌──────────────────────────────────┐
    │ Affichage texte multilingue      │
    │ Si trriggerOffsetMinutes, affiche jusqu'a la fin du timer       │
    └──────────────────────────────────┘
                      │
                      ▼
          ÉTAPE 3: Complétion de l'Action
                      │
                      ▼
            On refait les memes actions
```

1. Afficher le média avec overlay
2. Mini timer si offset négatif
3. Contenu textuel multilingue après média
4. Timer pour displayDurationSec pour la durée d'affichage des contenu textuels
