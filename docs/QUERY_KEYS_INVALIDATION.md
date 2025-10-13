# Query Keys et Invalidation dans React Query

## Le problème résolu

Les queries ne se rafraîchissaient pas dans le dashboard malgré les invalidations dans `ActionDisplay` et `TimerDisplay`.

## Explication

### Comment fonctionnent les Query Keys

React Query utilise des **tableaux** comme clés de query. Ces clés doivent correspondre **exactement** ou **partiellement** selon comment vous invalidez.

#### Exemples de Query Keys

```typescript
// Query simple
queryKey: ["timers"];

// Query avec paramètre
queryKey: ["timers", "wedding-event-1"];

// Query avec plusieurs paramètres
queryKey: ["timer", "wedding-event-1", "timer-123"];
```

### Invalidation des Queries

#### ❌ MAUVAISE façon (avant le fix)

```typescript
// Dans le dashboard, la query est :
queryKey: [QUERY_KEYS.ALL_TIMERS, weddingEventId];
// ["timers", "wedding-event-1"]

// Mais dans ActionDisplay, on invalidait :
queryClient.invalidateQueries({
  queryKey: [QUERY_KEYS.ALL_TIMERS, QUERY_KEYS.ACTION, QUERY_KEYS.TIMER],
});
// ["timers", "action", "timer"]
// ❌ Aucune query ne matche cette structure !
```

#### ✅ BONNE façon (après le fix)

```typescript
// Pour invalider TOUTES les queries qui commencent par "timers"
queryClient.invalidateQueries({
  queryKey: [QUERY_KEYS.ALL_TIMERS],
});
// Ceci invalide :
// - ["timers"]
// - ["timers", "wedding-event-1"]
// - ["timers", "wedding-event-demo"]
// - etc.

// Pour invalider TOUTES les queries qui commencent par "timer"
queryClient.invalidateQueries({
  queryKey: [QUERY_KEYS.TIMER],
});
// Ceci invalide :
// - ["timer", "wedding-event-1"]
// - ["timer", "timer-123"]
// - etc.
```

### Options d'invalidation

#### Option 1: Invalidation partielle (par défaut)

```typescript
queryClient.invalidateQueries({
  queryKey: [QUERY_KEYS.ALL_TIMERS],
});
```

Invalide toutes les queries dont la clé **commence** par `["timers"]`.

#### Option 2: Invalidation exacte

```typescript
queryClient.invalidateQueries({
  queryKey: [QUERY_KEYS.ALL_TIMERS, weddingEventId],
  exact: true,
});
```

Invalide **seulement** la query avec exactement cette clé.

#### Option 3: Invalider plusieurs préfixes

```typescript
// Invalider toutes les queries liées aux timers
queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACTION] });
```

## Changements appliqués

### 1. PusherProvider (`pusher-provider.tsx`)

**Avant:**

```typescript
queryClient.invalidateQueries({
  queryKey: [QUERY_KEYS.ALL_TIMERS, QUERY_KEYS.ACTION, QUERY_KEYS.TIMER],
});
```

**Après:**

```typescript
queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACTION] });
```

### 2. ActionDisplay (`ActionDisplay.tsx`)

Ajouté l'invalidation de `QUERY_KEYS.TIMER` en plus de `QUERY_KEYS.ALL_TIMERS` dans les mutations.

### 3. ActionList (`ActionList.tsx`)

Ajouté l'invalidation de `QUERY_KEYS.TIMER` en plus de `QUERY_KEYS.ALL_TIMERS`.

## Bonnes pratiques

### ✅ À faire

1. **Utiliser des préfixes simples** pour les invalidations générales

   ```typescript
   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
   ```

2. **Invalider plusieurs préfixes** quand nécessaire

   ```typescript
   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMER] });
   ```

3. **Utiliser des clés hiérarchiques** cohérentes

   ```typescript
   // Liste de tous les timers
   ["timers", weddingEventId][
     // Timer spécifique
     ("timer", timerId)
   ][
     // Actions d'un timer
     ("actions", timerId)
   ];
   ```

### ❌ À éviter

1. **Ne pas mettre plusieurs concepts dans une même clé**

   ```typescript
   // ❌ Mauvais
   queryKey: [QUERY_KEYS.ALL_TIMERS, QUERY_KEYS.ACTION, QUERY_KEYS.TIMER];

   // ✅ Bon - invalider séparément
   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ALL_TIMERS] });
   queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ACTION] });
   ```

2. **Ne pas oublier les paramètres dans les clés**

   ```typescript
   // ❌ Mauvais - perd le contexte
   queryKey: [QUERY_KEYS.ALL_TIMERS];

   // ✅ Bon - garde le contexte
   queryKey: [QUERY_KEYS.ALL_TIMERS, weddingEventId];
   ```

## Résultat

Maintenant, quand une action ou un timer est modifié dans `ActionDisplay` ou `TimerDisplay`:

1. ✅ Les queries du dashboard sont invalidées
2. ✅ Les queries du timer courant sont invalidées
3. ✅ Le dashboard se rafraîchit automatiquement
4. ✅ Les composants affichent les données à jour

## Liens utiles

- [React Query - Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [React Query - Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
