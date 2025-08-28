# 🏈 MythaYun Backend - Documentation Product Owner


## 🔗 Endpoints disponibles

### **Santé de l'API**
- **Vérification** : Statut de l'API et des services connectés

### **Authentification**
- **Inscription** : Créer un nouveau compte utilisateur
- **Connexion** : Se connecter avec email/mot de passe
- **Rafraîchissement** : Renouveler les tokens d'authentification
- **Déconnexion** : Fermer la session utilisateur

### **Matchs et fixtures**
- **Matchs du jour** : Récupérer tous les matchs d'une date spécifique
- **Matchs en direct** : Obtenir les matchs actuellement en cours
- **Détails d'un match** : Informations complètes sur un match spécifique
- **Événements de match** : Chronologie des événements (buts, cartons, etc.)
- **Statistiques de match** : Données avancées (possession, tirs, etc.)
- **Compositions** : Formations et joueurs de chaque équipe

### **Utilisateurs et préférences**
- **Profil utilisateur** : Informations du compte
- **Équipes suivies** : Gérer la liste des équipes favorites
- **Préférences** : Configuration personnalisée de l'utilisateur

### **Stades et lieux**
- **Liste des stades** : Tous les stades disponibles
- **Détails d'un stade** : Informations complètes sur un stade spécifique

---

## 🚀 Guide de lancement en local

### **Prérequis**
Avant de commencer, assurez-vous d'avoir installé :
- **Node.js** (version 18 ou supérieure)
- **npm** (gestionnaire de paquets Node.js)
- **PostgreSQL** (base de données)
- **Git** (pour cloner le projet)

### **Étape 1 : Cloner le projet**
```bash
# Cloner le repository depuis GitHub
git clone https://github.com/MythaYun/mythayun-backend.git

# Aller dans le dossier du projet
cd mythayun-backend
```

### **Étape 2 : Installer les dépendances**
```bash
# Installer tous les packages nécessaires
npm install
```

### **Étape 3 : Configuration de la base de données**
1. **Créer une base de données PostgreSQL** nommée `mythayun`
2. **Noter les informations de connexion** :
   - Hôte (généralement `localhost`)
   - Port (généralement `5432`)
   - Nom d'utilisateur
   - Mot de passe
   - Nom de la base de données

### **Étape 4 : Configuration des variables d'environnement**
1. **Copier le fichier d'exemple** :
   ```bash
   cp .env.example .env
   ```

2. **Modifier le fichier `.env`** avec vos informations :
   ```env
   # Configuration générale
   NODE_ENV=development
   PORT=3333
   APP_KEY=votre_clé_secrète_très_longue
   HOST=127.0.0.1
   LOG_LEVEL=info

   # Base de données
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=votre_utilisateur_postgres
   DB_PASSWORD=votre_mot_de_passe_postgres
   DB_DATABASE=mythayun

   # Authentification JWT
   JWT_SECRET=votre_secret_jwt_très_sécurisé
   JWT_EXPIRES_IN=24h
   REFRESH_TOKEN_EXPIRES_IN=7d

   # API Football (optionnel pour les tests)
   RAPIDAPI_HOST=api-football-v1.p.rapidapi.com
   RAPIDAPI_KEY=votre_clé_rapidapi
   AF_SEASON=2024
   AF_LEAGUE_SLUGS=39,140,78,135,61
   MOCK_API=false

   # Sessions
   SESSION_DRIVER=cookie
   ```

### **Étape 5 : Initialiser la base de données**
```bash
# Créer les tables de la base de données
node ace migration:run
```

### **Étape 6 : Lancer le serveur**
```bash
# Démarrer le serveur en mode développement
npm run dev
```

### **Étape 7 : Vérifier que tout fonctionne**
1. **Ouvrir un navigateur** et aller sur `http://localhost:3333/health`
2. **Vous devriez voir** : `{"status":"ok","timestamp":"...","services":{"api":"healthy","footballApi":"healthy"}}`

---

## 🔧 Commandes utiles

### **Développement**
```bash
# Lancer en mode développement (redémarrage automatique)
npm run dev

# Lancer en mode production
npm start

# Vérifier la syntaxe du code
npm run lint

# Formater le code automatiquement
npm run format
```

### **Base de données**
```bash
# Créer une nouvelle migration
node ace make:migration nom_de_la_migration

# Exécuter les migrations
node ace migration:run

# Annuler la dernière migration
node ace migration:rollback

# Remettre la base à zéro
node ace migration:reset
```

### **Tests**
```bash
# Lancer tous les tests
npm test

# Lancer les tests en mode watch
npm run test:watch
```

---

## 🌐 Environnements et déploiement

### **Environnements disponibles**
- **Local** : `http://localhost:3333` (développement)
- **Staging** : À configurer sur Railway (tests)
- **Production** : À configurer sur Railway (utilisateurs finaux)

### **Branches Git**
- **`main`** : Code de production stable
- **`staging`** : Code en test avant production
- **`dev`** : Code de développement actuel

---

## 📊 Monitoring et logs

### **Vérification de la santé**
- **Endpoint** : `/health`
- **Utilisation** : Vérifier que l'API et tous les services fonctionnent

### **Logs de l'application**
- **Niveau de log** : Configurable via `LOG_LEVEL` dans `.env`
- **Types de logs** : Erreurs, informations, debug, requêtes API

---

## 🆘 Résolution de problèmes courants

### **Le serveur ne démarre pas**
1. Vérifier que PostgreSQL est lancé
2. Vérifier les informations de connexion dans `.env`
3. S'assurer que le port 3333 n'est pas utilisé par une autre application

### **Erreurs de base de données**
1. Vérifier que la base de données `mythayun` existe
2. Exécuter `node ace migration:run` pour créer les tables
3. Vérifier les permissions de l'utilisateur PostgreSQL

### **Données de matchs non disponibles**
1. Vérifier la clé `RAPIDAPI_KEY` dans `.env`
2. Temporairement mettre `MOCK_API=true` pour utiliser des données de test
3. Vérifier la connexion internet

### **Problèmes d'authentification**
1. Vérifier que `JWT_SECRET` est défini dans `.env`
2. S'assurer que `APP_KEY` est une chaîne longue et sécurisée
3. Vérifier que les migrations de la table `users` ont été exécutées

---

## 📞 Support et contact

Pour toute question technique ou problème :
1. **Vérifier cette documentation** en premier
2. **Consulter les logs** de l'application pour identifier l'erreur
3. **Contacter l'équipe de développement** avec les détails de l'erreur

---

*Documentation mise à jour le 27 août 2025*
*Version du backend : 1.0.0*
