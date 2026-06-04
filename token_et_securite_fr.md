# Token et sécurité du projet Matcha

Ce document résume, en français, les échanges sur :
- le `realtime token`
- la différence avec un JWT standard
- le moment où le token est obtenu pour la première connexion
- les principales mesures de cybersécurité présentes dans le projet

## 1. Vue d'ensemble des tokens

Dans ce projet, il faut distinguer :

- le token utilisé pour l'authentification HTTP
- le token utilisé pour la connexion realtime / Socket.IO

En pratique, le projet utilise une **même famille de token maison**, avec une logique commune de signature et de vérification. Ce n'est **pas un JWT standard** au sens strict.

### Ce que ce token contient

Le token realtime contient essentiellement :

- `sub` : l'identifiant de l'utilisateur
- `iat` : la date de génération
- `exp` : la date d'expiration

Il est composé de deux parties :

- `payload`
- `signature`

La signature est calculée avec `HMAC-SHA256`.

Fichier de référence :

- [realtime/authToken.js](/Users/leochen/matcha2/realtime/authToken.js)

## 2. Est-ce un JWT ?

Réponse courte : **non, pas un JWT standard**.

Un JWT standard ressemble à :

```text
header.payload.signature
```

Le token du projet ressemble plutôt à :

```text
payload.signature
```

Donc :

- même idée générale de signature
- même logique de base64url
- même usage d'un `exp`
- mais **pas le format JWT officiel**

Fichier de référence :

- [realtime/authToken.js](/Users/leochen/matcha2/realtime/authToken.js)

## 3. À quel moment le premier token est obtenu ?

Le premier token est obtenu **au moment du login réussi**.

### Flux réel

1. L'utilisateur saisit son identifiant et son mot de passe
2. Le front envoie `POST /api/auth/login`
3. Le backend vérifie les identifiants
4. Si le login réussit, le backend renvoie `realtime_token`
5. Le front sauvegarde l'utilisateur complet, token inclus
6. Les requêtes suivantes peuvent alors utiliser ce token

Fichiers de référence :

- [controllers/auth/login.js](/Users/leochen/matcha2/controllers/auth/login.js)
- [frontend/src/auth/hooks/useLogin.js](/Users/leochen/matcha2/frontend/src/auth/hooks/useLogin.js)

## 4. Où le token est stocké ?

Le token est stocké à deux endroits :

### 4.1 `currentUser` en mémoire

Le token est gardé dans l'état React de l'utilisateur courant.

Fichier de référence :

- [frontend/src/hooks/useCurrentUser.js](/Users/leochen/matcha2/frontend/src/hooks/useCurrentUser.js)

### 4.2 `localStorage`

L'utilisateur entier est sauvegardé dans `localStorage` sous la clé :

```text
matcha.currentUser
```

Le token est donc persistant entre deux rechargements de page.

Fichier de référence :

- [frontend/src/utils/userStorage.js](/Users/leochen/matcha2/frontend/src/utils/userStorage.js)

## 5. Comment le token est injecté dans les requêtes ?

La fonction `buildApiHeaders()` récupère le token dans cet ordre :

1. `currentUser.realtime_token`
2. puis, si absent, le token sauvegardé dans `localStorage`

Elle ajoute ensuite :

```http
Authorization: Bearer <token>
```

Fichier de référence :

- [frontend/src/utils/utils.js](/Users/leochen/matcha2/frontend/src/utils/utils.js)

## 6. Comment le projet évite le problème "pas de token au premier login" ?

Le point important est le suivant :

- au tout premier login, l'utilisateur **n'a pas encore de token**
- c'est normal
- le token est renvoyé **par la réponse du login**

### La protection réelle

Le projet évite les erreurs grâce à plusieurs garde-fous :

- le login lui-même ne dépend pas du token
- le backend crée le token après validation du mot de passe
- le front sauvegarde immédiatement l'utilisateur retourné
- les requêtes protégées utilisent `buildApiHeaders()`
- le socket realtime ne se connecte que si `id` et `realtime_token` existent
- si le token manque ou expire, le hook realtime le redemande automatiquement

Fichiers de référence :

- [controllers/auth/login.js](/Users/leochen/matcha2/controllers/auth/login.js)
- [frontend/src/auth/hooks/useLogin.js](/Users/leochen/matcha2/frontend/src/auth/hooks/useLogin.js)
- [frontend/src/utils/utils.js](/Users/leochen/matcha2/frontend/src/utils/utils.js)
- [frontend/src/hooks/useRealtimeConnection.js](/Users/leochen/matcha2/frontend/src/hooks/useRealtimeConnection.js)

## 7. Le token realtime et le token API sont-ils identiques ?

Dans ce projet, ils utilisent la **même logique de token** et la **même vérification**.

Donc :

- même structure
- même signature
- même mécanisme d'expiration
- même fonction de vérification

Mais ils ne sont pas un JWT standard.

### Usage pratique

- HTTP : token envoyé dans `Authorization`
- Socket.IO : token envoyé dans le handshake

Fichiers de référence :

- [middleware/auth.js](/Users/leochen/matcha2/middleware/auth.js)
- [realtime/index.js](/Users/leochen/matcha2/realtime/index.js)
- [realtime/handlers.js](/Users/leochen/matcha2/realtime/handlers.js)

## 8. Mécanisme d'expiration du token

Le token a une expiration basée sur `exp`.

### Fonctionnement

Lors de la création :

- `now = Date.now() / 1000`
- `exp = now + REALTIME_TOKEN_TTL_SECONDS`

Lors de la vérification :

- le projet lit `exp`
- si `exp <= now`, le token est rejeté

La durée par défaut est d'environ **15 minutes**.

Fichier de référence :

- [realtime/authToken.js](/Users/leochen/matcha2/realtime/authToken.js)

## 9. Sécurité du projet : mesures déjà en place

Cette section résume les principales protections présentes dans le code.

### 9.1 Durcissement HTTP et navigateur

Dans `app.js`, le projet utilise :

- `helmet`
- une Content Security Policy
- `HSTS` en production
- `app.disable("x-powered-by")`
- CORS limité à une liste d'origines autorisées
- parsing JSON / URL-encoded limité à `6mb`

Fichier de référence :

- [app.js](/Users/leochen/matcha2/app.js)

### 9.2 Protection CSRF

Le middleware `csrfProtection` :

- laisse passer les méthodes sûres : `GET`, `HEAD`, `OPTIONS`
- vérifie `Origin` puis `Referer`
- refuse les requêtes mutantes venant d'une origine non approuvée

Fichier de référence :

- [middleware/csrfProtection.js](/Users/leochen/matcha2/middleware/csrfProtection.js)

### 9.3 Limitation de débit

Le projet a plusieurs rate limiters :

- `globalApiLimiter`
- `authLimiter`
- `authSensitiveLimiter`

Le rate limit sensible utilise `skipSuccessfulRequests: true`, ce qui évite de pénaliser les actions légitimes réussies.

Fichier de référence :

- [middleware/rateLimit.js](/Users/leochen/matcha2/middleware/rateLimit.js)

### 9.4 Authentification et autorisation

Le middleware `requireAuth` :

- lit `Authorization: Bearer <token>`
- vérifie la signature
- vérifie l'expiration
- confirme que l'utilisateur existe encore
- injecte `req.userId`

Fichier de référence :

- [middleware/auth.js](/Users/leochen/matcha2/middleware/auth.js)

### 9.5 Vérification realtime

Le serveur Socket.IO vérifie le token avant d'accepter une connexion realtime.

Il :

- extrait le token du handshake
- valide sa signature
- refuse la connexion si le token est invalide
- associe ensuite `socket.data.userId`

Fichiers de référence :

- [realtime/index.js](/Users/leochen/matcha2/realtime/index.js)
- [realtime/handlers.js](/Users/leochen/matcha2/realtime/handlers.js)

### 9.6 Mots de passe et récupération de compte

Le projet utilise :

- `bcrypt` pour hasher les mots de passe
- des tokens de vérification par e-mail
- des tokens de réinitialisation de mot de passe
- une expiration de ces tokens
- la suppression des tokens après usage

Fichiers de référence :

- [controllers/auth/register.js](/Users/leochen/matcha2/controllers/auth/register.js)
- [controllers/auth/password.js](/Users/leochen/matcha2/controllers/auth/password.js)
- [controllers/auth/verification.js](/Users/leochen/matcha2/controllers/auth/verification.js)
- [services/authService.js](/Users/leochen/matcha2/services/authService.js)

### 9.7 Validation des entrées

Le projet vérifie beaucoup d'entrées côté backend :

- email valide
- mot de passe valide
- âge minimum
- format du nom d'utilisateur
- taille des messages
- ID positifs
- champs requis

Fichiers de référence :

- [controllers/auth/register.js](/Users/leochen/matcha2/controllers/auth/register.js)
- [controllers/auth/password.js](/Users/leochen/matcha2/controllers/auth/password.js)
- [controllers/chats/sendMessage.js](/Users/leochen/matcha2/controllers/chats/sendMessage.js)
- [controllers/moderation/reportUser.js](/Users/leochen/matcha2/controllers/moderation/reportUser.js)
- [controllers/likes/likeUser.js](/Users/leochen/matcha2/controllers/likes/likeUser.js)

### 9.8 Prévention SQL injection

Les requêtes SQL utilisent des paramètres positionnels (`$1`, `$2`, etc.) au lieu de concaténer des chaînes.

Cela réduit fortement le risque d'injection SQL.

Fichiers de référence :

- [services/authService.js](/Users/leochen/matcha2/services/authService.js)
- [services/likeService.js](/Users/leochen/matcha2/services/likeService.js)
- [services/chatService.js](/Users/leochen/matcha2/services/chatService.js)
- [services/profileService.js](/Users/leochen/matcha2/services/profileService.js)
- [services/notificationService.js](/Users/leochen/matcha2/services/notificationService.js)

### 9.9 Protection XSS côté front

Le front échappe le HTML avant d'afficher certaines données utilisateur.

Exemple :

- `escapeHtml()`
- `sanitizeText()`

Ces fonctions protègent notamment l'affichage de noms, textes de notifications ou champs saisis par d'autres utilisateurs.

Fichiers de référence :

- [frontend/src/utils/xssEscape.js](/Users/leochen/matcha2/frontend/src/utils/xssEscape.js)
- [frontend/src/notifications/NotificationsBell.jsx](/Users/leochen/matcha2/frontend/src/notifications/NotificationsBell.jsx)

### 9.10 Contrôle des doublons et des conflits

Le backend utilise des contraintes et des retours HTTP adaptés :

- `23505` devient `409`
- `ON CONFLICT DO NOTHING`
- `ON CONFLICT DO UPDATE`

Cela protège contre les doublons et certains problèmes de concurrence.

Fichiers de référence :

- [app.js](/Users/leochen/matcha2/app.js)
- [services/likeService.js](/Users/leochen/matcha2/services/likeService.js)
- [services/authService.js](/Users/leochen/matcha2/services/authService.js)

### 9.11 Défense contre le spam et l'abus relationnel

Le projet limite aussi les abus fonctionnels :

- pas de like sur soi-même
- pas de message sans match
- pas de notification si les utilisateurs sont bloqués
- pas de recommandation de comptes signalés

Fichiers de référence :

- [controllers/likes/likeUser.js](/Users/leochen/matcha2/controllers/likes/likeUser.js)
- [services/likeService.js](/Users/leochen/matcha2/services/likeService.js)
- [services/chatService.js](/Users/leochen/matcha2/services/chatService.js)
- [services/notificationService.js](/Users/leochen/matcha2/services/notificationService.js)
- [controllers/moderation/reportUser.js](/Users/leochen/matcha2/controllers/moderation/reportUser.js)

### 9.12 Validation et nettoyage de la session locale

Le front :

- lit la session stockée
- la valide contre le backend
- supprime la session si elle est invalide
- déconnecte le realtime si nécessaire

Fichier de référence :

- [frontend/src/hooks/useCurrentUser.js](/Users/leochen/matcha2/frontend/src/hooks/useCurrentUser.js)

## 10. Résumé rapide

### Sur le token

- le token n'est pas un JWT standard
- il est généré au login ou régénéré pour le realtime
- il expire automatiquement
- il est stocké dans `currentUser` et `localStorage`
- il est injecté dans les requêtes via `Authorization: Bearer ...`

### Sur la sécurité

Le projet couvre déjà :

- CORS
- CSRF
- rate limiting
- authentification
- vérification realtime
- hashing des mots de passe
- validation des entrées
- protection SQL
- protection XSS
- gestion des doublons
- anti-abus métier

## 11. Point important à retenir

Le vrai point sensible du projet est le suivant :

- le token est stocké côté front
- donc une faille XSS pourrait exposer ce token

Pour cette raison, la protection XSS est particulièrement importante dans ce projet.

