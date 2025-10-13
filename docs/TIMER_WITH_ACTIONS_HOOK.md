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
