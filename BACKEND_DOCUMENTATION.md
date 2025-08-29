# MythaYun Backend API - Documentation Complète

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Fonctionnalités implémentées](#fonctionnalités-implémentées)
4. [Installation et configuration locale](#installation-et-configuration-locale)
5. [Endpoints API](#endpoints-api)
6. [Base de données](#base-de-données)
7. [Déploiement en production](#déploiement-en-production)
8. [Tests et validation](#tests-et-validation)
9. [Maintenance et monitoring](#maintenance-et-monitoring)

---

## 🎯 Vue d'ensemble

**MythaYun Backend** est une API REST moderne développée avec AdonisJS v6 et TypeScript, conçue pour alimenter l'application mobile de football en temps réel MythaYun.

### Informations générales
- **Framework** : AdonisJS v6 avec TypeScript
- **Base de données** : PostgreSQL (Railway)
- **Déploiement** : Railway (Production & Staging)
- **API Football** : RapidAPI Football API v3
- **Authentification** : JWT (JSON Web Tokens)
- **Repository** : [MythaYun/mythayun-backend](https://github.com/MythaYun/mythayun-backend)

### URLs de déploiement
- **Production** : `https://mythayun-backend-production.up.railway.app`
- **Staging** : `https://mythayun-backend-staging.up.railway.app` (à configurer)
- **Health Check** : `https://mythayun-backend-production.up.railway.app/health`

---

## 🏗️ Architecture technique

### Stack technologique
```
Frontend (Next.js) ↔ Backend API (AdonisJS) ↔ PostgreSQL (Railway)
                                    ↕
                            RapidAPI Football API
```

### Structure du projet
```
mythayun-backend/
├── app/
│   ├── controllers/          # Contrôleurs API
│   ├── models/              # Modèles de données
│   ├── services/            # Services métier
│   └── middleware/          # Middlewares d'authentification
├── config/                  # Configuration (DB, app, etc.)
├── database/
│   └── migrations/          # Migrations de base de données
├── start/                   # Configuration des routes et environnement
└── .env                     # Variables d'environnement
```

### Sécurité
- **Authentification JWT** avec tokens d'accès (24h) et de rafraîchissement (7j)
- **Validation des données** avec VineJS
- **Protection CORS** configurée
- **Variables d'environnement** sécurisées
- **Connexions SSL** pour PostgreSQL en production

---

## ✨ Fonctionnalités implémentées

### 🔐 Authentification
- **Inscription utilisateur** avec validation email/mot de passe
- **Connexion utilisateur** avec génération de tokens JWT
- **Rafraîchissement de tokens** automatique
- **Déconnexion** sécurisée
- **Gestion de profil** utilisateur

### ⚽ Données de football
- **Matchs en temps réel** des 5 grandes ligues européennes
- **Fixtures** avec dates et statuts des matchs
- **Équipes et ligues** avec logos et informations
- **Statistiques de matchs** avancées
- **Événements de matchs** (buts, cartons, etc.)

### 👥 Système de follows
- **Suivre/Ne plus suivre** des équipes, ligues, et matchs
- **Préférences de notifications** granulaires
- **Statistiques de follows** par utilisateur
- **Recommandations** basées sur l'activité
- **Opérations en masse** pour l'onboarding

### 🏟️ Guides de stades
- **Informations détaillées** sur les stades
- **Capacité et localisation**
- **Intégration** avec les données de matchs

### 📊 API de santé
- **Monitoring** de l'état du service
- **Vérification** de la connexion à l'API Football
- **Timestamps** pour le debugging

---

## 🛠️ Installation et configuration locale

### Prérequis
```bash
# Versions requises
Node.js >= 18.0.0
npm >= 8.0.0
PostgreSQL >= 13.0
Git
```

### 1. Cloner le repository
```bash
git clone https://github.com/MythaYun/mythayun-backend.git
cd mythayun-backend
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration de l'environnement
Créer un fichier `.env` à la racine du projet :

```env
# Application
NODE_ENV=development
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=debug

# Sécurité
APP_KEY=votre_clé_app_32_caractères
JWT_SECRET=votre_secret_jwt_32_caractères
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Base de données PostgreSQL
DB_CONNECTION=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
DB_DATABASE=mythayun_dev

# API Football (RapidAPI)
RAPIDAPI_KEY=votre_clé_rapidapi
RAPIDAPI_HOST=api-football-v1.p.rapidapi.com
AF_SEASON=2025
AF_LEAGUE_SLUGS=39,140,78,135,61

# Configuration
MOCK_API=false
SESSION_DRIVER=cookie
```

### 4. Configuration de la base de données
```bash
# Créer la base de données PostgreSQL
createdb mythayun_dev

# Exécuter les migrations
node ace migration:run

# (Optionnel) Ajouter des données de test
node ace db:seed
```

### 5. Démarrer le serveur de développement
```bash
# Mode développement avec rechargement automatique
npm run dev

# Ou mode production
npm run build
npm start
```

### 6. Vérifier l'installation
```bash
# Test de l'API de santé
curl http://localhost:3333/health

# Réponse attendue :
# {"status":"ok","timestamp":"2025-08-28T...","services":{"api":"healthy","footballApi":"healthy"}}
```

---

## 🌐 Endpoints API

### Base URL
- **Local** : `http://localhost:3333`
- **Production** : `https://mythayun-backend-production.up.railway.app`

### 📊 Santé et monitoring

#### `GET /health`
Vérification de l'état du service et de l'API Football.

**Réponse :**
```json
{
  "status": "ok",
  "timestamp": "2025-08-28T12:00:00.000Z",
  "services": {
    "api": "healthy",
    "footballApi": "healthy"
  }
}
```

### 🔐 Authentification

#### `POST /auth/register`
Inscription d'un nouvel utilisateur.

**Body :**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "motdepasse123"
}
```

**Réponse :**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "authProvider": "email",
    "emailVerified": false
  },
  "tokens": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "expiresIn": 86400,
    "tokenType": "Bearer"
  }
}
```

#### `POST /auth/login`
Connexion utilisateur.

**Body :**
```json
{
  "email": "john@example.com",
  "password": "motdepasse123"
}
```

**Réponse :** Identique à l'inscription.

#### `GET /api/v1/profile`
Récupération du profil utilisateur (authentification requise).

**Headers :**
```
Authorization: Bearer {accessToken}
```

**Réponse :**
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "authProvider": "email",
    "emailVerified": false,
    "createdAt": "2025-08-28T...",
    "updatedAt": "2025-08-28T..."
  }
}
```

### ⚽ Données de football

#### `GET /api/v1/fixtures`
Liste des matchs avec filtrage par date.

**Paramètres :**
- `date` (optionnel) : Format YYYY-MM-DD

**Exemple :**
```bash
GET /api/v1/fixtures?date=2025-08-28
```

**Réponse :**
```json
[
  {
    "id": "1448216",
    "startTime": "2025-08-28T20:00:00+00:00",
    "status": "NS",
    "minute": null,
    "phase": "NOT_STARTED",
    "league": {
      "id": "39",
      "name": "Premier League",
      "country": "England"
    },
    "homeTeam": {
      "id": "50",
      "name": "Manchester City",
      "shortName": "MCI",
      "logoUrl": "https://..."
    },
    "awayTeam": {
      "id": "33",
      "name": "Manchester United",
      "shortName": "MUN",
      "logoUrl": "https://..."
    },
    "score": {
      "home": null,
      "away": null
    },
    "venue": {
      "id": "555",
      "name": "Etihad Stadium",
      "city": "Manchester"
    }
  }
]
```

#### `GET /api/v1/fixtures/live`
Matchs en cours en temps réel.

#### `GET /api/v1/matches/{id}`
Détails d'un match spécifique avec statistiques.

### 👥 Système de follows

#### `POST /api/v1/follows`
Suivre une équipe, ligue ou match (authentification requise).

**Body :**
```json
{
  "entityType": "team",
  "entityId": "50",
  "notificationPreferences": {
    "goals": true,
    "cards": false,
    "substitutions": false,
    "matchStart": true,
    "matchEnd": true,
    "lineups": false
  }
}
```

**Réponse :**
```json
{
  "message": "Successfully followed team",
  "follow": {
    "id": "uuid",
    "userId": "user_uuid",
    "entityType": "team",
    "entityId": "50",
    "isActive": true,
    "notificationPreferences": {...},
    "createdAt": "2025-08-28T..."
  }
}
```

#### `GET /api/v1/follows`
Liste des entités suivies par l'utilisateur (authentification requise).

**Réponse :**
```json
{
  "follows": [
    {
      "id": "uuid",
      "entityType": "team",
      "entityId": "50",
      "isActive": true,
      "notificationPreferences": {...}
    }
  ],
  "pagination": {
    "total": 1,
    "perPage": 20,
    "currentPage": 1,
    "lastPage": 1
  }
}
```

#### `DELETE /api/v1/follows`
Ne plus suivre une entité (authentification requise).

**Body :**
```json
{
  "entityType": "team",
  "entityId": "50"
}
```

---

## 🗄️ Base de données

### Schéma PostgreSQL

#### Table `users`
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  full_name VARCHAR(255),
  email VARCHAR(254) UNIQUE,
  password VARCHAR(255),
  account_status VARCHAR(50) DEFAULT 'active',
  auth_provider VARCHAR(50) DEFAULT 'local',
  email_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Table `teams`
```sql
CREATE TABLE teams (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  logo_url VARCHAR(500),
  league_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (league_id) REFERENCES leagues(id)
);
```

#### Table `follows`
```sql
CREATE TABLE follows (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  entity_type VARCHAR(50), -- 'team', 'league', 'match'
  entity_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Migrations
```bash
# Exécuter toutes les migrations
node ace migration:run

# Rollback de la dernière migration
node ace migration:rollback

# Statut des migrations
node ace migration:status
```

---

## 🚀 Déploiement en production

### Railway (Recommandé)

#### 1. Configuration Railway
```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter à Railway
railway login

# Lier le projet
railway link
```

#### 2. Variables d'environnement Railway
Configurer ces variables dans le dashboard Railway :

```env
NODE_ENV=production
PORT=3333
HOST=0.0.0.0
LOG_LEVEL=warn

APP_KEY=production_app_key_32_chars
JWT_SECRET=production_jwt_secret_32_chars
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

DATABASE_URL=${Postgres.DATABASE_URL}
DB_CONNECTION=postgres

RAPIDAPI_KEY=votre_clé_production
RAPIDAPI_HOST=api-football-v1.p.rapidapi.com
AF_SEASON=2025
AF_LEAGUE_SLUGS=39,140,78,135,61

MOCK_API=false
SESSION_DRIVER=cookie
TZ=UTC
```

#### 3. Déploiement
```bash
# Déployer sur Railway
git push origin main

# Ou déploiement manuel
railway up
```

#### 4. Migrations en production
```bash
# Exécuter les migrations sur Railway
railway run node ace migration:run --force
```

### Configuration PostgreSQL Railway
1. Ajouter un service PostgreSQL dans Railway
2. Connecter la base de données au service backend
3. La variable `DATABASE_URL` sera automatiquement générée

---

## 🧪 Tests et validation

### Tests manuels des endpoints

#### 1. Test de santé
```bash
curl https://mythayun-backend-production.up.railway.app/health
```

#### 2. Test d'inscription
```bash
curl -X POST "https://mythayun-backend-production.up.railway.app/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

#### 3. Test de connexion
```bash
curl -X POST "https://mythayun-backend-production.up.railway.app/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

#### 4. Test des matchs
```bash
curl "https://mythayun-backend-production.up.railway.app/api/v1/fixtures?date=2025-08-28"
```

#### 5. Test des follows (avec token)
```bash
curl -X POST "https://mythayun-backend-production.up.railway.app/api/v1/follows" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "team",
    "entityId": "50"
  }'
```

### Validation des réponses
- **Status 200** : Succès
- **Status 401** : Non authentifié
- **Status 422** : Erreur de validation
- **Status 500** : Erreur serveur

---

## 📊 Maintenance et monitoring

### Logs Railway
```bash
# Voir les logs en temps réel
railway logs

# Logs avec filtre
railway logs --filter error
```

### Monitoring de santé
- **URL** : `https://mythayun-backend-production.up.railway.app/health`
- **Fréquence recommandée** : Toutes les 5 minutes
- **Alertes** : Si `status !== "ok"` ou `footballApi !== "healthy"`

### Base de données
```bash
# Se connecter à PostgreSQL Railway
railway connect postgres

# Vérifier les tables
\dt

# Statistiques utilisateurs
SELECT COUNT(*) FROM users;

# Statistiques follows
SELECT entity_type, COUNT(*) FROM follows GROUP BY entity_type;
```

### Sauvegarde
Railway effectue des sauvegardes automatiques de PostgreSQL. Pour des sauvegardes manuelles :

```bash
# Export de la base de données
railway run pg_dump $DATABASE_URL > backup.sql
```

---

## 🔧 Dépannage

### Problèmes courants

#### 1. Erreur de connexion à la base de données
```bash
# Vérifier les variables d'environnement
railway variables

# Tester la connexion
railway run node ace migration:status
```

#### 2. API Football non accessible
- Vérifier la clé `RAPIDAPI_KEY`
- Vérifier les quotas sur RapidAPI
- Tester manuellement l'API Football

#### 3. Erreurs JWT
- Vérifier `JWT_SECRET` en production
- Vérifier la cohérence des secrets entre environnements

#### 4. Problèmes de CORS
- Vérifier la configuration CORS dans `config/cors.ts`
- Ajouter les domaines frontend autorisés

### Support
- **Repository** : [MythaYun/mythayun-backend](https://github.com/MythaYun/mythayun-backend)
- **Issues** : Créer une issue sur GitHub
- **Documentation AdonisJS** : [docs.adonisjs.com](https://docs.adonisjs.com)

---

## 📝 Changelog

### Version 1.0.0 (Août 2025)
- ✅ API d'authentification complète
- ✅ Intégration API Football temps réel
- ✅ Système de follows avancé
- ✅ Déploiement Railway production
- ✅ Base de données PostgreSQL
- ✅ Documentation complète

### Fonctionnalités à venir
- 🔄 Notifications push
- 🔄 Cache Redis pour les performances
- 🔄 Tests automatisés
- 🔄 Analytics et métriques
- 🔄 Authentification sociale (Google, Facebook)

---

*Documentation mise à jour le 28 août 2025*
*Version du backend : 1.0.0*
*Environnement : Production Railway*
