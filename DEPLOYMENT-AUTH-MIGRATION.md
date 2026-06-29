# Guide de Déploiement - Authentification Interne

Ce guide explique comment migrer de Auth0 vers l'authentification interne.

## Résumé des Changements

- **Backend**: Nouveau système d'authentification avec bcryptjs + jsonwebtoken
- **Frontend**: Modal de connexion intégré à la navbar
- **Routes API**: `/auth/register`, `/auth/login`, `/auth/me`

---

## Informations Azure Actuelles

| Élément | Valeur |
|---------|--------|
| Resource Group | `rg-petitemaison` |
| Container Apps Environment | `cae-petitemaison` |
| Backend App | `petite-maison-api` |
| Frontend App | `petite-maison-web` |
| PostgreSQL Server | À récupérer (voir étape 1) |
| Database | `petitemaison_db` |
| Admin | `pmadmin` |

---

## Étape 1: Récupérer le nom du serveur PostgreSQL

Exécute cette commande pour lister tes serveurs PostgreSQL:

```
bash
az postgres flexible-server list --resource-group rg-petitemaison --query "[].name" -o table
```

---

## Étape 2: Exécuter la migration SQL

### Via Azure CLI

```
bash
# Se connecter à Azure
az login

# Exécuter la migration (remplace PG_SERVER par le nom récupéré à l'étape 1)
az postgres flexible-server execute \
  --name PG_SERVER \
  --database-name petitemaison_db \
  --resource-group rg-petitemaison \
  --query-text "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);"
```

### Via Azure Portal

1. Va sur ton serveur PostgreSQL dans Azure Portal
2. Clique sur **Query Editor**
3. Connecte-toi avec `pmadmin` et ton mot de passe
4. Copie-colle et exécute:

```
sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
```

---

## Étape 3: Configurer les Secrets Azure (Backend)

**IMPORTANT**: Remplace `TON_MOT_DE_PASSE_PG` par ton mot de passe PostgreSQL.

```
bash
# Secrets pour petite-maison-api
# REMPLACE: PG_SERVER par le nom de ton serveur PostgreSQL (ex: pg-abc123)
# REMPLACE: TON_MOT_DE_PASSE_PG par ton mot de passe PostgreSQL

az containerapp secret set \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --secrets \
    "db-host=PG_SERVER.postgres.database.azure.com" \
    "db-port=5432" \
    "db-user=pmadmin" \
    "db-password=TON_MOT_DE_PASSE_PG" \
    "db-name=petitemaison_db" \
    "jwt-secret=JwtSecret2024!LaPetiteMaison123"
```

---

## Étape 4: Configurer les variables d'environnement du Backend

```
bash
# Supprimer les anciennes variables Auth0 et ajouter les nouvelles
az containerapp update \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --remove-env-vars AUTH0_AUDIENCE AUTH0_DOMAIN AUTH0_MGMT_AUDIENCE AUTH0_MGMT_CLIENT_ID AUTH0_MGMT_CLIENT_SECRET

az containerapp update \
  --name petite-maison-api \
  --resource-group rg-petitemaison \
  --set-env-vars \
    NODE_ENV=production \
    PORT=4000 \
    DB_HOST=secretref:db-host \
    DB_PORT=secretref:db-port \
    DB_USER=secretref:db-user \
    DB_PASSWORD=secretref:db-password \
    DB_NAME=secretref:db-name \
    FRONTEND_URL=https://petite-maison-web.grayforest-0a123456.francecentral.azurecontainerapps.io
```

---

## Étape 5: Redémarrer le Backend

```
bash
az containerapp restart \
  --name petite-maison-api \
  --resource-group rg-petitemaison
```

---

## Étape 6: GitHub Actions - Variables

Va dans **GitHub** → **Settings** → **Secrets and variables** → **Actions**

### Variables (Repository Variables):

| Nom | Valeur |
|-----|--------|
| `AZURE_RESOURCE_GROUP` | `rg-petitemaison` |
| `AZURE_LOCATION` | `francecentral` |
| `VITE_API_URL` | URL du backend (ex: https://petite-maison-api.xxx.azurecontainerapps.io) |

### Secrets (Repository Secrets):

| Nom | Valeur |
|-----|--------|
| `AZURE_CREDENTIALS` | JSON avec tes identifiants Azure (voir ci-dessous) |

**Pour créer AZURE_CREDENTIALS**, va dans Azure Portal:
1. Azure Active Directory → App registrations
2. Sélectionne ton application (ou crée-en une si nécessaire)
3. Overview → copie **Client ID** et **Tenant ID**
4. Certificates & secrets → crée un nouveau client secret et copie la valeur
5. All services → Subscriptions → copie **Subscription ID**

Puis crée le JSON:
```json
{
  "clientId": "TON_CLIENT_ID",
  "clientSecret": "TON_CLIENT_SECRET",
  "subscriptionId": "TON_SUBSCRIPTION_ID",
  "tenantId": "TON_TENANT_ID"
}
```

---

## Vérification

Après le redémarrage, teste l'API:

```
bash
# Tester la santé du backend
curl https://petite-maison-api.grayforest-0a123456.francecentral.azurecontainerapps.io/health

# Tester l'inscription
curl -X POST https://petite-maison-api.grayforest-0a123456.francecentral.azurecontainerapps.io/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}'

# Tester la connexion
curl -X POST https://petite-maison-api.grayforest-0a123456.francecentral.azurecontainerapps.io/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123456"}'
```

---

## Dépannage

### Erreur: "password_hash column doesn't exist"
→ La migration SQL n'a pas été exécutée. Voir Étape 2.

### Erreur: "Invalid credentials"
→ Le mot de passe DB est incorrect. Voir Étape 3.

### Erreur: "JWT_SECRET not set"
→ Le secret jwt-secret n'a pas été configuré. Voir Étape 3.

---

## Commandes Utiles

```
bash
# Voir les secrets configurés
az containerapp secret list --name petite-maison-api --resource-group rg-petitemaison

# Voir les logs du backend
az containerapp logs show --name petite-maison-api --resource-group rg-petitemaison --tail 50

# Voir l'URL du backend
az containerapp show --name petite-maison-api --resource-group rg-petitemaison --query properties.configuration.ingress.fqdn -o tsv
```

---

## JWT

- **Durée**: 7 jours
- **Stockage**: localStorage dans le navigateur
- **Nom du token**: `auth_token`
