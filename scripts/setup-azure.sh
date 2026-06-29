#!/usr/bin/env bash
# ============================================================
# setup-azure.sh — Provisioning Azure pour La Petite Maison de l'Épouvante
#
# Crée :
#   - Resource Group
#   - Azure Container Apps Environment
#   - Azure Database for PostgreSQL Flexible Server
#   - Container Apps (backend + frontend)
#   - Secrets dans Container Apps
#
# Prérequis :
#   - Azure CLI installé et authentifié (az login)
#   - Subscription active
#
# Usage :
#   chmod +x scripts/setup-azure.sh
#   ./scripts/setup-azure.sh
# ============================================================

set -euo pipefail

# ──────────────────────────────────────────────
# CONFIGURATION (à adapter)
# ──────────────────────────────────────────────
RESOURCE_GROUP="rg-petitemaison"
LOCATION="francecentral"
ENV_NAME="cae-petitemaison"
LOG_ANALYTICS_WS="law-petitemaison"

# PostgreSQL
PG_SERVER="pg-petitemaison"
PG_DB="petitemaison_db"
PG_USER="petitemaison_admin"
PG_PASSWORD="${PG_PASSWORD:-$(openssl rand -base64 24)}"
PG_SKU="B_Standard_B1ms"  # Burstable (pas cher pour POC)

# Container Apps
BACKEND_APP="petite-maison-api"
FRONTEND_APP="petite-maison-web"
REGISTRY="ghcr.io"

# Auth0 (à remplir ou passer en variables d'env)
AUTH0_DOMAIN="${AUTH0_DOMAIN:-dev-jyxtz7vl6gzris5c.us.auth0.com}"
AUTH0_AUDIENCE="${AUTH0_AUDIENCE:-https://dev-jyxtz7vl6gzris5c.us.auth0.com/api/v2/}"

echo "╔══════════════════════════════════════════════╗"
echo "║  🏚️  La Petite Maison de l'Épouvante         ║"
echo "║  Azure Infrastructure Setup                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────
# 1. Resource Group
# ──────────────────────────────────────────────
if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
    echo "✅ Resource Group existe déjà."
else
echo "📦 Creating Resource Group: $RESOURCE_GROUP ($LOCATION)..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none
fi

# ──────────────────────────────────────────────
# 2. Log Analytics Workspace (pour Container Apps)
# ──────────────────────────────────────────────
if az monitor log-analytics workspace show \
    --resource-group "$RESOURCE_GROUP" \
    --workspace-name "$LOG_ANALYTICS_WS" &>/dev/null; then
    echo "✅ Log Analytics Workspace existe déjà."
else
echo "📊 Creating Log Analytics Workspace..."
az monitor log-analytics workspace create \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --location "$LOCATION" \
  --output none
fi

LOG_ID=$(az monitor log-analytics workspace show \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --query customerId -o tsv)

LOG_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group "$RESOURCE_GROUP" \
  --workspace-name "$LOG_ANALYTICS_WS" \
  --query primarySharedKey -o tsv)

# ──────────────────────────────────────────────
# 3. Container Apps Environment
# ──────────────────────────────────────────────
echo "🌍 Creating Container Apps Environment: $ENV_NAME..."
if az containerapp env show \
    --name "$ENV_NAME" \
    --resource-group "$RESOURCE_GROUP" &>/dev/null; then
    echo "✅ Container Apps Environment existe déjà."
else
    az containerapp env create \
      --name "$ENV_NAME" \
      --resource-group "$RESOURCE_GROUP" \
      --location "$LOCATION" \
      --logs-workspace-id "$LOG_ID" \
  --logs-workspace-key "$LOG_KEY" \
  --output none
fi

# ──────────────────────────────────────────────
# 4. PostgreSQL Flexible Server
# ──────────────────────────────────────────────
if az postgres flexible-server show \
    --name "$PG_SERVER" \
    --resource-group "$RESOURCE_GROUP" &>/dev/null; then

    echo "✅ PostgreSQL existe déjà."

else
echo "🐘 Creating PostgreSQL Flexible Server: $PG_SERVER..."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$PG_SERVER" \
  --location "$LOCATION" \
  --admin-user "$PG_USER" \
  --admin-password "$PG_PASSWORD" \
  --tier "Burstable" \
  --storage-size 32 \
  --version 17 \
  --yes \
  --output none

echo "🔧 Configuring PostgreSQL firewall (allow Azure services)..."
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$PG_SERVER" \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output none
fi

if az postgres flexible-server db show \
    --server-name "$PG_SERVER" \
    --resource-group "$RESOURCE_GROUP" \
    --database-name "$PG_DB" &>/dev/null; then

    echo "✅ Base de données déjà créée."

else
echo "📝 Creating database: $PG_DB..."
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$PG_SERVER" \
  --name "$PG_DB" \
  --output none
fi

PG_HOST="${PG_SERVER}.postgres.database.azure.com"

echo "🗃️ Initializing database schema..."
PGPASSWORD="$PG_PASSWORD" psql \
  -h "$PG_HOST" \
  -U "$PG_USER" \
  -d "$PG_DB" \
  -f docker/postgres/init.sql \
  --set=sslmode=require || echo "⚠️ Schema init failed — you may need to run it manually"

# ──────────────────────────────────────────────
# 5. Backend Container App
# ──────────────────────────────────────────────
if az containerapp show \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" &>/dev/null; then

    echo "✅ Backend déjà déployé."

else
echo "🚀 Creating Backend Container App: $BACKEND_APP..."
az containerapp create \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENV_NAME" \
  --image "mcr.microsoft.com/k8se/quickstart:latest" \
  --target-port 4000 \
  --env-vars PORT=4000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --output none
fi

BACKEND_FQDN=$(az containerapp show \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)
BACKEND_URL="https://${BACKEND_FQDN}"

echo "🔑 Setting secrets on backend..."
az containerapp secret set \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --secrets \
    db-host="$PG_HOST" \
    db-port="5432" \
    db-user="$PG_USER" \
    db-password="$PG_PASSWORD" \
    db-name="$PG_DB" \
    auth0-audience="$AUTH0_AUDIENCE" \
    auth0-domain="$AUTH0_DOMAIN" \
  --output none

echo "⚙️ Setting environment variables on backend..."
az containerapp update \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    NODE_ENV=production \
    PORT=4000 \
    DB_HOST=secretref:db-host \
    DB_PORT=secretref:db-port \
    DB_USER=secretref:db-user \
    DB_PASSWORD=secretref:db-password \
    DB_NAME=secretref:db-name \
    AUTH0_AUDIENCE=secretref:auth0-audience \
    AUTH0_DOMAIN=secretref:auth0-domain \
    FRONTEND_URL="https://FRONTEND_URL_PLACEHOLDER" \
  --output none

# ──────────────────────────────────────────────
# 6. Frontend Container App
# ──────────────────────────────────────────────
if az containerapp show \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" &>/dev/null; then

    echo "✅ Frontend déjà déployé."

else
echo "🚀 Creating Frontend Container App: $FRONTEND_APP..."
az containerapp create \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENV_NAME" \
  --image "mcr.microsoft.com/k8se/quickstart:latest" \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --output none
fi

FRONTEND_FQDN=$(az containerapp show \
  --name "$FRONTEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)
FRONTEND_URL="https://${FRONTEND_FQDN}"

# Update backend CORS with actual frontend URL
echo "🔗 Updating backend FRONTEND_URL with: $FRONTEND_URL..."
az containerapp update \
  --name "$BACKEND_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --set-env-vars \
    FRONTEND_URL="$FRONTEND_URL" \
  --output none

# ──────────────────────────────────────────────
# 7. Create Service Principal for GitHub Actions
# ──────────────────────────────────────────────
echo "🔐 Creating Service Principal for GitHub Actions..."
AZURE_CREDS=$(az ad sp create-for-rbac \
  --name "sp-petitemaison-github" \
  --role contributor \
  --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP" \
  --sdk-auth 2>/dev/null || echo "⚠️ Service principal creation failed — you may need to do this manually")

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Infrastructure Created Successfully!                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  🌐 Frontend URL : $FRONTEND_URL"
echo "║  🔌 Backend URL  : $BACKEND_URL"
echo "║  🐘 PostgreSQL   : $PG_HOST"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  📋 GitHub Secrets to configure:                             ║"
echo "║                                                              ║"
echo "║  AZURE_CREDENTIALS = (JSON ci-dessous)                      ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  📋 GitHub Variables to configure:                           ║"
echo "║                                                              ║"
echo "║  AZURE_RESOURCE_GROUP = $RESOURCE_GROUP"
echo "║  BACKEND_URL          = $BACKEND_URL"
echo "║  FRONTEND_URL         = $FRONTEND_URL"
echo "║  VITE_API_URL         = $BACKEND_URL"
echo "║  VITE_AUTH0_DOMAIN    = $AUTH0_DOMAIN"
echo "║  VITE_AUTH0_CLIENT_ID = (votre Client ID Auth0)"
echo "║  VITE_AUTH0_AUDIENCE  = $AUTH0_AUDIENCE"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🔐 AZURE_CREDENTIALS JSON (save this as GitHub Secret):"
echo "$AZURE_CREDS"
echo ""
echo "🐘 PostgreSQL password: $PG_PASSWORD"
echo "⚠️  Save this password securely — it won't be shown again!"
