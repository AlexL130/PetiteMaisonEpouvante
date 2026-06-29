# La Petite Maison de l'Épouvante

Plateforme de vente en ligne de produits horrifiques et fantastiques.

## Stack technique

- **Frontend** : React 19 + Vite + TailwindCSS + Framer Motion
- **Backend** : Node.js + Express + TypeScript
- **Base de données** : PostgreSQL 16
- **Authentification** : Auth0 (RBAC : BUYER, SELLER, ADMIN)
- **CI/CD** : GitHub Actions
- **Hébergement** : Azure Container Apps
- **Tests de charge** : k6
- **Observabilité** : Winston + audit logs

## Lancement local

```bash
# 1. Copier les fichiers d'environnement
cp backend/.env.example backend/.env
cp docker/.env.example docker/.env

# 2. Renseigner les variables Auth0 dans les deux fichiers .env

# 3. Lancer avec Docker Compose
cd docker
docker compose --profile dev up --build

# 4. Accéder aux services
# Frontend  : http://localhost:3000
# Backend   : http://localhost:4000/health
# pgAdmin   : http://localhost:8080
```

## API Endpoints

### Publics
- `GET /health` — Healthcheck
- `GET /products` — Catalogue (filtres: category, search, min_price, max_price, featured, exclusive)
- `GET /products/featured` — Produits vedettes
- `GET /products/:slug` — Détail produit
- `GET /categories` — Liste des catégories
- `GET /fanzine/issues` — Numéros du fanzine

### Authentifiés (BUYER)
- `POST /me/sync` — Synchronisation utilisateur
- `GET /me/profile` — Profil
- `PATCH /me/profile` — Modifier profil
- `GET /cart` — Panier
- `POST /cart` — Ajouter au panier
- `PATCH /cart/:id` — Modifier quantité
- `DELETE /cart/:id` — Retirer du panier
- `POST /cart/checkout` — Passer commande
- `GET /orders` — Mes commandes
- `GET /orders/:id` — Détail commande
- `GET /subscriptions/me` — Mes abonnements
- `POST /subscriptions` — S'abonner
- `DELETE /subscriptions/:id` — Résilier
- `GET /fanzine/read/:id` — Lire un numéro
- `GET /fanzine/library` — Ma bibliothèque

### Admin
- `GET /admin/users` — Liste utilisateurs
- `POST /admin/users/:id/role` — Attribuer un rôle
- `POST /admin/products` — Créer produit
- `PATCH /admin/products/:id` — Modifier produit
- `GET /admin/orders` — Toutes les commandes
- `PATCH /admin/orders/:id/status` — Changer statut commande
- `GET /admin/audit-logs` — Logs d'audit

## Tests de charge (k6)

```bash
# Installer k6 : https://k6.io/docs/get-started/installation/
k6 run k6/load-test.js
```
