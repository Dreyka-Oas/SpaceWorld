# 🚀 SpacePanel

**SpacePanel** est une interface d'administration web légère et moderne conçue pour surveiller les performances d'un serveur Linux et gérer les utilisateurs système en temps réel.

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=node.js) ![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=flat&logo=socket.io) ![Express](https://img.shields.io/badge/Express-Server-000000?style=flat&logo=express)

## ✨ Fonctionnalités

### 📊 Monitoring en Temps Réel
Surveillance des ressources système via des graphiques fluides (Canvas) et des jauges SVG :
*   **Processeur :** Charge totale et détail par cœur.
*   **Mémoire :** Utilisation de la RAM physique et du Swap.
*   **Disque :** Vitesses de lecture/écriture et jauge de stockage.
*   **Réseau :** Débit entrant (Download) et sortant (Upload).

### 👥 Gestion des Utilisateurs (Admin)
Une interface dédiée aux administrateurs (Sudoers) pour gérer les comptes système :
*   Listing des utilisateurs système.
*   Création de nouveaux utilisateurs.
*   Suppression de comptes.
*   Modification de mots de passe.
*   Attribution/Révocation des droits administrateur (Sudo).

### 🔒 Sécurité & Authentification
*   Système de connexion via **JWT**.
*   Authentification via `/etc/shadow` (avec script Python interne) ou fallback via `sudo`.
*   **Sécurité :** La connexion directe en tant que `root` est désactivée par défaut pour protéger le serveur.

## 🛠️ Prérequis

*   **OS :** Linux (Debian, Ubuntu, CentOS, etc.)
*   **Runtime :** Node.js (version 16 ou supérieure recommandée)
*   **Python 3 :** Requis pour le hachage des mots de passe lors de l'authentification.
*   **Droits :** L'application nécessite des privilèges élevés pour lire `/etc/shadow` et exécuter des commandes système (`useradd`, `userdel`).

## 📦 Installation

1.  **Cloner ou télécharger le projet**
2.  **Installer les dépendances :**
    ```bash
    npm install
    ```
    *Dépendances principales : `express`, `socket.io`, `systeminformation`, `jsonwebtoken`.*

## 🚀 Démarrage

Pour lancer le serveur en mode production :

```bash
npm start
```

Pour le développement (avec redémarrage automatique) :

```bash
npm run dev
```

L'interface sera accessible sur : **`http://localhost:3000`**

## ⚙️ Configuration Technique

*   **Port :** 3000 (défini dans `server.js`).
*   **Secret JWT :** Configuré par défaut sur `SPACE_KEY_SECRET_999` (⚠️ À changer pour la production dans `server.js`).
*   **Base de données :** Aucune base de données externe n'est requise. L'application lit directement les fichiers système (`/etc/passwd`, `/etc/group`, `/etc/shadow`).

## 🖥️ Aperçu de l'Interface

L'interface utilise un thème sombre ("Dark Space") avec des effets de flou (backdrop-filter) et une grille responsive.

*   **Login :** Page de connexion sécurisée.
*   **Dashboard :** Sidebar rétractable et vues modulaires (CPU, RAM, Disque, Réseau).
*   **Panel Admin :** Visible uniquement si l'utilisateur connecté possède les droits `sudo` ou `wheel`.

## ⚠️ Note de Sécurité

Cette application manipule directement des utilisateurs système et des fichiers sensibles.
*   Assurez-vous que le serveur Node.js tourne dans un environnement sécurisé.
*   Ne pas exposer le port 3000 sur internet public sans un reverse proxy (Nginx/Apache) avec SSL (HTTPS).