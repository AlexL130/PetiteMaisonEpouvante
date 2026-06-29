# Architecture CI/CD — La Petite Maison de l'Épouvante

## Vue d'ensemble du pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  🔍 LINT     │────▶│  🧪 UNIT     │────▶│  🔗 INTEGRATION  │────▶│  🐳 BUILD    │────▶│  🚀 DEPLOY       │────▶│  ⚡ LOAD TEST   │
│              │     │  TESTS       │     │  TESTS           │     │  DOCKER      │     │  AZURE           │     │  k6             │
│  ESLint      │     │  Jest/Vitest │     │  Supertest + DB  │     │  GHCR        │     │  Container Apps  │     │  P95 < 500ms    │
│  frontend    │     │  Coverage    │     │  PostgreSQL 16   │     │  Multi-stage │     │  Health check    │     │  Error < 1%     │
│  backend     │     │  ≥ 60%       │     │                  │     │              │     │                  │     │                 │
└──────────────┘     └──────────────┘     └──────────────────┘     └──────────────┘     └──────────────────┘     └─────────────────┘
                            │                                              ▲
                            │         ┌──────────────────┐                 │
                            └────────▶│  🛡️ SAST         │─────────────────┘
                                      │  CodeQL          │
                                      │  npm audit       │
                                      │  0 critical      │
                                      └──────────────────┘
```

## Déclencheurs

| Événement | Stages exécutés |
|-----------|----------------|
| Push sur `develop` | Lint → Tests → SAST → Build Docker |
| Push sur `main` | Lint → Tests → SAST → Build → **Deploy Azure** |
| Pull Request → `main` | Lint → Tests → SAST (pas de build/deploy) |
| Manuel (workflow_dispatch) | Load Test k6 uniquement |

## Indicateurs qualité (ISO 25010)

| Indicateur | Catégorie ISO 25010 | Outil | Seuil | Stage pipeline |
|------------|-------------------|-------|-------|----------------|
| Couverture de tests | Fiabilité / Maintenabilité | Jest + Vitest | ≥ 60% | Unit Tests |
| Temps de réponse P95 | Performance | k6 | < 500ms | Load Test |
| Score SAST | Sécurité | CodeQL + npm audit | 0 vulnérabilité critique | SAST |
| Taux d'erreur API | Fiabilité | Winston + healthcheck | < 1% erreurs 5xx | Deploy (healthcheck) |

## Sécurité dans le pipeline (DevSecOps)

### Shift-left security

1. **Code** — ESLint avec règles TypeScript strictes
2. **Dépendances** — `npm audit` bloque si vulnérabilités critiques + Dependabot hebdomadaire
3. **SAST** — CodeQL analyse statique (SQL injection, XSS, path traversal)
4. **Build** — Docker multi-stage, user non-root, healthchecks
5. **Deploy** — Secrets Azure (pas en clair), HTTPS forcé, CORS strict
6. **Runtime** — Helmet headers, Winston audit logs, Azure Monitor

### Secrets management

```
GitHub Secrets (chiffré)
  └── AZURE_CREDENTIALS → Service Principal
  
GitHub Variables (non sensibles)
  ├── AZURE_RESOURCE_GROUP
  ├── BACKEND_URL
  ├── FRONTEND_URL
  ├── VITE_AUTH0_DOMAIN
  ├── VITE_AUTH0_CLIENT_ID
  └── VITE_AUTH0_AUDIENCE

Azure Container Apps Secrets
  ├── db-host, db-port, db-user, db-password, db-name
  ├── auth0-audience
  └── auth0-domain
```

## Infrastructure Azure

```
Azure Resource Group (rg-petitemaison)
├── Container Apps Environment (cae-petitemaison)
│   ├── Container App: petite-maison-api (backend)
│   │   ├── Image: ghcr.io/.../backend:latest
│   │   ├── Port: 4000
│   │   ├── Min replicas: 1, Max: 3
│   │   └── CPU: 0.5 vCPU, RAM: 1 GiB
│   │
│   └── Container App: petite-maison-web (frontend)
│       ├── Image: ghcr.io/.../frontend:latest
│       ├── Port: 80 (nginx)
│       ├── Min replicas: 1, Max: 3
│       └── CPU: 0.25 vCPU, RAM: 0.5 GiB
│
├── PostgreSQL Flexible Server (pg-petitemaison)
│   ├── Version: 16
│   ├── SKU: B_Standard_B1ms (Burstable)
│   └── Storage: 32 GB
│
└── Log Analytics Workspace (law-petitemaison)
    └── Centralized logs from Container Apps
```

## Coût estimé (POC)

| Ressource | SKU | Coût estimé/mois |
|-----------|-----|-----------------|
| Container Apps | Consumption | ~5-10 € (faible trafic) |
| PostgreSQL Flexible | B1ms Burstable | ~15 € |
| Log Analytics | Free tier (5 GB) | 0 € |
| **Total** | | **~20-25 €/mois** |

💡 Possibilité d'utiliser le crédit étudiant Azure (100 $/an) pour couvrir le POC.

## Commandes utiles

```bash
# Setup initial Azure
chmod +x scripts/setup-azure.sh
./scripts/setup-azure.sh

# Lancer le load test manuellement
# → GitHub Actions → "⚡ Load Tests (k6)" → Run workflow

# Voir les logs Container App
az containerapp logs show --name petite-maison-api --resource-group rg-petitemaison --follow

# Supprimer toutes les ressources
chmod +x scripts/teardown-azure.sh
./scripts/teardown-azure.sh
```

## Différenciation avec le projet Collector

| Aspect | Collector | Petite Maison |
|--------|-----------|---------------|
| CI/CD | GitLab CI/CD | **GitHub Actions** |
| Registry | GitLab Container Registry | **GHCR** |
| Hébergement | Docker Compose local | **Azure Container Apps** |
| SAST | Aucun | **CodeQL + npm audit** |
| Load testing | Manuel (Siege/JMeter) | **k6 automatisé dans pipeline** |
| Observabilité | Logs locaux | **Azure Monitor + Winston** |
| Secrets | Fichier .env | **Azure Secrets + GitHub Secrets** |
| Scaling | Manuel | **Auto-scaling 1-3 replicas** |
| Dependabot | Non | **Oui (npm + Docker + Actions)** |
