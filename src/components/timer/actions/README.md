# Actions Components

Ce dossier contient les composants modulaires pour l'affichage des différents types d'actions de timer.

## Architecture

L'architecture a été refactorisée pour séparer les responsabilités et faciliter la maintenance :

### Composant Principal : `ActionDisplay`

Le composant `ActionDisplay` est le point d'entrée principal. Il :

- Reçoit une action de type `TimerAction`
- Dispatche l'affichage au composant enfant approprié selon le type d'action
- Gère l'overlay général (fond noir avec blur)
- Affiche les contenus multilingues (FR, EN, BR)

### Composants d'Actions Spécifiques

Chaque type d'action a son propre composant dédié :

#### 1. **VideoAction** (`VideoAction.tsx`)

- Affiche une vidéo avec contrôles
- Gère la fin automatique après `displayDurationSec` secondes
- Appelle `onComplete` quand terminé

**Props :**

```typescript
{
  url: string;
  title?: string;
  displayDurationSec?: number;
  onComplete?: () => void;
}
```

#### 2. **SoundAction** (`SoundAction.tsx`)

- Affiche un lecteur audio avec contrôles
- Gère la fin automatique après `displayDurationSec` secondes
- Appelle `onComplete` quand terminé

**Props :**

```typescript
{
  url: string;
  title?: string;
  displayDurationSec?: number;
  onComplete?: () => void;
}
```

#### 3. **ImageAction** (`ImageAction.tsx`)

- Affiche une image
- Se ferme automatiquement après `displayDurationSec` secondes
- Si pas de durée, appelle `onComplete` immédiatement

**Props :**

```typescript
{
  url: string;
  title?: string;
  displayDurationSec?: number;
  onComplete?: () => void;
}
```

#### 4. **GalleryAction** (`GalleryAction.tsx`)

- Affiche une galerie d'images avec navigation
- Boutons précédent/suivant
- Indicateurs de pagination (dots)
- Se ferme automatiquement après `displayDurationSec` secondes

**Props :**

```typescript
{
  urls: string[];
  title?: string;
  displayDurationSec?: number;
  onComplete?: () => void;
}
```

#### 5. **ImageWithSound** (`ImageWithSound.tsx`)

- **NOUVEAU** : Composant spécial pour afficher une image pendant qu'un son joue
- L'image reste affichée pendant toute la durée du son
- Se ferme automatiquement à la fin du son
- Idéal pour des diaporamas avec narration

**Props :**

```typescript
{
  imageUrl: string;
  soundUrl: string;
  title?: string;
  onComplete?: () => void;
}
```

**Usage :**
Dans `ActionDisplay`, si une action de type `SOUND` a à la fois :

- `action.url` (le son)
- `action.urls[0]` (l'image)

Alors `ImageWithSound` est utilisé au lieu d'`SoundAction`.

## Flux de Données

```
TimerAction (from database)
    ↓
ActionDisplay (dispatcher)
    ↓
[VideoAction | SoundAction | ImageAction | GalleryAction | ImageWithSound]
    ↓
onComplete callback
    ↓
Refresh / Next Action
```

## Avantages de cette Architecture

1. **Séparation des responsabilités** : Chaque composant gère un seul type d'action
2. **Facilité de maintenance** : Modifier un type d'action n'affecte pas les autres
3. **Réutilisabilité** : Les composants peuvent être utilisés ailleurs dans l'app
4. **Testabilité** : Chaque composant peut être testé indépendamment
5. **Extensibilité** : Ajouter un nouveau type d'action est simple

## Ajouter un Nouveau Type d'Action

1. Créer un nouveau composant dans `src/components/timer/actions/`
2. Exporter le composant dans `index.ts`
3. Ajouter un nouveau case dans `ActionDisplay.renderActionContent()`
4. Mettre à jour ce README

## Exemple d'Utilisation

```tsx
import ActionDisplay from "@/components/timer/ActionDisplay";

function MyComponent() {
  const action = {
    id: "action-1",
    type: "VIDEO",
    url: "/assets/videos/demo.mp4",
    title: "Demo Video",
    displayDurationSec: 5,
    // ... autres propriétés
  };

  const handleComplete = () => {
    console.log("Action terminée !");
  };

  return <ActionDisplay action={action} onComplete={handleComplete} />;
}
```
