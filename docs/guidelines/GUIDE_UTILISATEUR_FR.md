# Guide d'utilisation - Application Wedding Timers

## 📖 Introduction

Cette application permet de gérer et d'afficher des minuteurs (timers) pour votre événement de mariage. Elle est composée de deux parties :

- **L'application principale** : Pour afficher les timers aux invités
- **Le tableau de bord** : Pour gérer et contrôler les timers

---

## 🔐 1. Connexion

### Comment se connecter ?

1. Ouvrez l'application dans votre navigateur [`https://ts-electric-timers.vercel.app/login`](https://ts-electric-timers.vercel.app/login)
2. Vous arriverez sur la page de connexion avec le titre "Neka & Tony - Wedding timers"
3. Entrez votre **email** et votre **mot de passe**
4. Cliquez sur le bouton **"Login"**

Une fois connecté, vous serez automatiquement redirigé vers le tableau de bord.

> **Note** : Si vous voyez "Logging in..." après avoir cliqué, l'application est en train de vous connecter.

---

## 🎯 2. Le Tableau de Bord (Dashboard)

Le tableau de bord est l'interface de contrôle où vous pouvez gérer tous les timers.

### Que peut-on voir ?

Vous verrez une grille de cartes, chaque carte représente un timer avec :

- **Le nom du timer** (ex: "Cérémonie", "Cocktail", "Dîner")
- **Un badge de statut** :
  - 🟡 PENDING (En attente) : Le timer n'a pas encore commencé
  - 🔵 RUNNING (En cours) : Le timer est actuellement actif
  - 🟢 COMPLETED (Terminé) : Le timer est terminé
- **La date et l'heure de début prévue**
- **Un compte à rebours** montrant le temps restant avant de déclencher une action
- **La liste des actions** associées au timer (images, sons, vidéos, etc.)
- **Des boutons de contrôle** pour gérer le timer

### Les types de timers

Il existe 3 types de timers :

1. **Timers avec durée** : Ont une durée définie (ex: 60 minutes avant l'entrée des mariés)
2. **Timers ponctuels** : Se déclenchent à un moment précis sans durée (ex: annonce spéciale)
3. **Timers manuels** : Démarrés manuellement par vous, sans heure programmée

### Comment démarrer/afficher un timer ?

1. Les timers s'affichent automatiquement après leur complétion
2. Si vous souhaitez tout de meme afficher un timer, cliquez sur "Dsplay Timer"
3. Le timer s'affiche immédiatement et son statut passe à "RUNNING"
4. Les invités voient maintenant ce timer sur l'application principale

> **Important** : Quand un timer se termine automatiquement, le timer suivant s'affiche automatiquement !

---

## 🎬 3. Les Actions

Chaque timer peut contenir plusieurs **actions** qui seront à déclencher manuellement pendant le timer.

### Types d'actions

- **Image** : Affiche une image aux invités
- **Image avec son** : Affiche une image et joue un son
- **Vidéo** : Joue une vidéo

### Quand les actions se déclenchent-elles ?

- Les actions sont à déclencher manuellement quand le timer atteint **00:00:00**.
- Les cartes se mettront à clignoter lorsque la durée du timer aura atteint sa limite de temps
- Plusieurs couleurs de clignotement pour annoncer visuellement à la personne en charge de clique sur la première action
- Une action peut être déclenché a tout moment, dans certains cas il y aura des action qui vont clignoter **10 minutes avant la fin**, il faudra donc appuyer sur "Start Action" à ce moment

---

## 🎭 4. Mode Démo

Le mode démo permet de **tester l'application** sans affecter votre événement réel. Vous verrez apparaître des bandeau "Demo" un peu partout dans le tableau de bord

### Comment désactiver le mode démo ?

Sur le tableau de bord, cliquez sur le bouton **"Disable Demo Mode"** dans la bannière jaune.

> **Important** : Ne pas l'utiliser pendant l'événement, sinon prévenir un admin, le cas échéant.

---

## 📺 5. L'Application Principale (Vue Invités)

C'est ce que vos invités voient ! Elle affiche le timer actuel en grand écran.

### Ce qui s'affiche

- **Un grand compte à rebours** montrant le temps restant
- Les textes dans les différentes langues de la première action du timer en train d'être affiché
- **Les actions visuelles** qui se déclenchent automatiquement lorsque un admin clique sur "Start Action" depuis le tableau de bord :
  - Images plein écran
  - Vidéos
  - Galeries photos
  - Textes en plusieurs langues
- Un timer plus petit si l'action en cours chevauche un timer qui n'est pas encore fini

### Mises à jour en temps réel

L'affichage se met à jour automatiquement grâce à la technologie **Pusher** :

- Quand vous affichez un timer depuis le dashboard
- Quand une action est déclenchée
- Quand une action est complété
- Quand un timer se termine
- Pas besoin de rafraîchir la page !

---

## ⏱️ 6. Que se passe-t-il à la fin d'un timer ?

### Fin automatique

Quand un timer atteint son temps imparti :

1. **Vérification des actions** : L'application vérifie si toutes les actions sont terminées
2. **Complétion automatique** : Si toutes les actions sont terminées, le timer passe automatiquement à "COMPLETED"
3. **Démarrage du suivant** : Le timer suivant qui n'est pas manuel ni ponctuel, dans l'ordre démarre **automatiquement**
4. **Mise à jour de l'affichage** : L'application principale affiche le nouveau timer
5. **Notification** : Le dashboard se met à jour pour montrer le changement

---

## ❓ 8. Questions Fréquentes

### Que faire si un timer/action ne s'affiche pas ?

- Vérifiez que le timer précédent est bien terminé
- Vérifiez que l'heure de début programmée est bien passée

### Peut-on revenir en arrière ?

Non, une fois qu'un timer est terminé, on ne peut pas le redémarrer. C'est pour cela que le **mode démo** existe !

### Dépannage

> **Important** : Ne pas refresh la page, sinon juste cliquer sur le bouton "Click me to enable video sound"

Possibilité annuler action en cours si problème de son en double puis de relancer
