#!/usr/bin/env bash
# ============================================================
# teardown-azure.sh — Suppression des ressources Azure
# ⚠️  ATTENTION : Supprime TOUTES les ressources du projet !
# ============================================================

set -euo pipefail

RESOURCE_GROUP="rg-petitemaison"

echo "⚠️  ATTENTION : Ceci va supprimer TOUTES les ressources du groupe $RESOURCE_GROUP"
echo "   - Container Apps (frontend + backend)"
echo "   - PostgreSQL Flexible Server (+ données)"
echo "   - Log Analytics Workspace"
echo "   - Container Apps Environment"
echo ""
read -p "Êtes-vous sûr ? Tapez 'oui' pour confirmer : " CONFIRM

if [ "$CONFIRM" != "oui" ]; then
  echo "❌ Annulé."
  exit 0
fi

echo "🗑️  Suppression du Resource Group: $RESOURCE_GROUP..."
az group delete \
  --name "$RESOURCE_GROUP" \
  --yes \
  --no-wait

echo "✅ Suppression lancée (peut prendre quelques minutes)."
echo "   Vérifiez avec : az group show --name $RESOURCE_GROUP"
