# Plan de Remédiation Sécurité — La Petite Maison de l'Épouvante

## 1. Analyse des résultats de tests

### 1.1 Couverture de tests

| Module | Couverture actuelle | Objectif | Action |
|--------|-------------------|----------|--------|
| Backend routes | _à remplir_ % | ≥ 60% | Ajouter tests Supertest pour chaque endpoint |
| Backend services | _à remplir_ % | ≥ 60% | Tests unitaires des services user, audit |
| Frontend components | _à remplir_ % | ≥ 60% | Tests Vitest des composants clés |

### 1.2 Performance (k6)

| Métrique | Résultat | Seuil | Statut | Action corrective |
|----------|----------|-------|--------|-------------------|
| P95 response time | _ms | < 500ms | | Optimiser requêtes SQL, ajouter indexes |
| Error rate | _% | < 1% | | Analyser les erreurs 5xx dans Winston |
| Product list P95 | _ms | < 400ms | | Pagination côté DB, cache Redis |
| Product detail P95 | _ms | < 300ms | | Cache applicatif, optimiser JOINs |

### 1.3 SAST (CodeQL + npm audit)

| Sévérité | Nombre | Action |
|----------|--------|--------|
| Critical | 0 | Pipeline bloqué si > 0 |
| High | _à remplir_ | Corriger dans le sprint suivant |
| Medium | _à remplir_ | Planifier dans le backlog |
| Low | _à remplir_ | Documentation uniquement |

---

## 2. Vulnérabilités identifiées et remédiations

### V-001 : Injection SQL potentielle

- **Source** : CodeQL / revue de code
- **Risque** : Élevé
- **Description** : Certaines requêtes pourraient être vulnérables si les paramètres ne sont pas correctement échappés
- **Remédiation** : Utilisation systématique de requêtes paramétrées (`$1, $2...`) — déjà implémenté dans toutes les routes
- **Statut** : ✅ Corrigé dès le développement initial
- **Justification** : Le driver `pg` de Node.js échappe automatiquement les paramètres dans les requêtes paramétrées

### V-002 : Headers de sécurité HTTP

- **Source** : Audit manuel / Helmet
- **Risque** : Moyen
- **Description** : Headers de sécurité nécessaires pour prévenir XSS, clickjacking, MIME sniffing
- **Remédiation** : 
  - Backend : Helmet.js configuré (X-Frame-Options, X-Content-Type-Options, CSP, etc.)
  - Frontend : Headers nginx (X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy)
- **Statut** : ✅ Implémenté
- **Justification** : Helmet applique les headers OWASP recommandés par défaut

### V-003 : Authentification et autorisation

- **Source** : Architecture review
- **Risque** : Élevé
- **Description** : Chaque endpoint protégé doit vérifier l'authentification ET les rôles
- **Remédiation** :
  - JWT vérifié par `express-oauth2-jwt-bearer` (Auth0)
  - Middleware `loadUser` + `requireRole` vérifient les rôles en DB
  - RBAC : BUYER, SELLER, ADMIN avec permissions granulaires
- **Statut** : ✅ Implémenté
- **Justification** : Double vérification (token JWT + rôles en base) pour defense in depth

### V-004 : Gestion des secrets

- **Source** : Audit DevSecOps
- **Risque** : Critique
- **Description** : Les secrets ne doivent jamais être en clair dans le code ou les logs
- **Remédiation** :
  - Développement : fichiers `.env` exclus du Git (`.gitignore`)
  - CI/CD : GitHub Secrets (chiffrés au repos)
  - Production : Azure Container Apps Secrets (references `secretref:`)
  - Validation : Zod vérifie les variables au démarrage sans les logger
- **Statut** : ✅ Implémenté
- **Justification** : Séparation complète des secrets par environnement

### V-005 : CORS trop permissif

- **Source** : Revue de configuration
- **Risque** : Moyen
- **Description** : Un CORS `*` permettrait des requêtes depuis n'importe quel domaine
- **Remédiation** : CORS restreint à `FRONTEND_URL` uniquement, avec credentials
- **Statut** : ✅ Implémenté
- **Justification** : Seul le frontend légitime peut appeler l'API

### V-006 : Dépendances vulnérables

- **Source** : npm audit + Dependabot
- **Risque** : Variable
- **Description** : Les dépendances npm peuvent avoir des CVE connues
- **Remédiation** :
  - Pipeline : `npm audit --audit-level=critical` bloque le deploy
  - Automatique : Dependabot crée des PR hebdomadaires
  - Process : Review obligatoire des PR Dependabot avant merge
- **Statut** : ✅ Automatisé
- **Justification** : Détection continue + correction automatique

### V-007 : Absence de rate limiting

- **Source** : Test de charge k6
- **Risque** : Moyen
- **Description** : Sans rate limiting, l'API est vulnérable au DDoS et au brute force
- **Remédiation proposée** :
  - Ajouter `express-rate-limit` sur les endpoints sensibles (/cart/checkout, /me/sync)
  - Azure Container Apps supporte le scaling automatique (absorbe les pics)
  - Configurer Azure WAF pour protection DDoS avancée
- **Statut** : 🔶 À implémenter (sprint suivant)
- **Priorité** : Haute

### V-008 : Logging des données sensibles

- **Source** : Audit observabilité
- **Risque** : Moyen
- **Description** : Les logs ne doivent pas contenir de données personnelles (email, adresse)
- **Remédiation** :
  - Winston configuré pour ne logger que les IDs et actions (pas les données)
  - Audit logs en DB avec userId uniquement (pas d'email)
  - Morgan en mode `combined` (IP + URL, pas de body)
- **Statut** : ✅ Implémenté
- **Justification** : Conformité RGPD minimale pour un POC

---

## 3. Plan d'action priorisé

| Priorité | Action | Effort | Impact sécurité |
|----------|--------|--------|----------------|
| 🔴 P0 | Rate limiting sur endpoints critiques | 2h | Élevé |
| 🔴 P0 | Validation Zod sur tous les body (cart, checkout, admin) | 3h | Élevé |
| 🟠 P1 | HTTPS strict (HSTS header) | 30min | Moyen |
| 🟠 P1 | Content Security Policy stricte | 1h | Moyen |
| 🟡 P2 | Pagination limitée (max 100 items) | 30min | Faible |
| 🟡 P2 | Timeout sur les requêtes DB | 30min | Faible |
| 🟢 P3 | Monitoring des tentatives de login échouées | 2h | Moyen |
| 🟢 P3 | Tests de pénétration OWASP ZAP | 4h | Élevé |

---

## 4. Matrice de couverture DevSecOps

| Phase | Mesure | Outil | Automatisé |
|-------|--------|-------|-----------|
| Code | Linting strict TypeScript | ESLint | ✅ Pipeline |
| Code | Requêtes SQL paramétrées | pg driver | ✅ Code |
| Build | Analyse statique SAST | CodeQL | ✅ Pipeline |
| Build | Audit dépendances | npm audit | ✅ Pipeline |
| Build | Docker non-root | Dockerfile | ✅ Build |
| Test | Tests unitaires ≥ 60% | Jest/Vitest | ✅ Pipeline |
| Test | Tests d'intégration | Supertest | ✅ Pipeline |
| Test | Tests de charge | k6 | ✅ Workflow |
| Deploy | Secrets chiffrés | Azure/GitHub | ✅ Config |
| Deploy | Health check post-deploy | curl | ✅ Pipeline |
| Runtime | Headers sécurité | Helmet + nginx | ✅ Code |
| Runtime | Audit logs | Winston + DB | ✅ Code |
| Runtime | CORS restrictif | Express CORS | ✅ Code |
| Maintenance | Mises à jour dépendances | Dependabot | ✅ Hebdomadaire |
