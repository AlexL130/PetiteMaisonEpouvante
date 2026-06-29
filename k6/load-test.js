import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const productListDuration = new Trend("product_list_duration");
const productDetailDuration = new Trend("product_detail_duration");

// Test configuration — tuned for Azure Container Apps (Burstable B1ms)
export const options = {
  stages: [
    { duration: "20s", target: 5 },    // Ramp up to 5 users (warm up)
    { duration: "30s", target: 15 },   // Ramp up to 15 users
    { duration: "1m", target: 15 },    // Stay at 15 users
    { duration: "20s", target: 30 },   // Spike to 30 users
    { duration: "30s", target: 30 },   // Stay at 30 users
    { duration: "20s", target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],  // 95th percentile < 2s (Azure cold start)
    errors: ["rate<0.05"],              // Error rate < 5%
    product_list_duration: ["p(95)<1500"],
    product_detail_duration: ["p(95)<1500"],
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000";

export default function () {
  // ──────────────────────────────────────────
  // 1. Health check
  // ──────────────────────────────────────────
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    "health: status 200": (r) => r.status === 200,
    "health: ok true": (r) => JSON.parse(r.body).ok === true,
  }) || errorRate.add(1);

  sleep(0.5);

  // ──────────────────────────────────────────
  // 2. List products (browse catalogue)
  // ──────────────────────────────────────────
  const listRes = http.get(`${BASE_URL}/products?limit=20&sort=created_at&order=desc`);
  productListDuration.add(listRes.timings.duration);
  const listOk = check(listRes, {
    "products: status 200": (r) => r.status === 200,
    "products: has items": (r) => JSON.parse(r.body).products.length > 0,
  });
  if (!listOk) errorRate.add(1);

  sleep(0.5);

  // ──────────────────────────────────────────
  // 3. Search products
  // ──────────────────────────────────────────
  const searchTerms = ["orc", "horreur", "figurine", "blu-ray", "jeu"];
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  const searchRes = http.get(`${BASE_URL}/products?search=${term}`);
  check(searchRes, {
    "search: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.3);

  // ──────────────────────────────────────────
  // 4. Filter by category
  // ──────────────────────────────────────────
  const categories = ["figurines", "bluray-dvd", "bd", "jeux", "goodies"];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const catRes = http.get(`${BASE_URL}/products?category=${cat}`);
  check(catRes, {
    "filter: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(0.3);

  // ──────────────────────────────────────────
  // 5. Product detail
  // ──────────────────────────────────────────
  const slugs = [
    "orc-figurine-collector-30cm",
    "riflesso-coltello-notte-bluray",
    "orc-tome-1-terres-maudites",
    "nuit-epouvante-jeu-plateau",
    "tshirt-evil-ed-logo-sang",
  ];
  const slug = slugs[Math.floor(Math.random() * slugs.length)];
  const detailRes = http.get(`${BASE_URL}/products/${slug}`);
  productDetailDuration.add(detailRes.timings.duration);
  check(detailRes, {
    "detail: status 200": (r) => r.status === 200,
    "detail: has title": (r) => JSON.parse(r.body).title !== undefined,
  }) || errorRate.add(1);

  sleep(0.5);

  // ──────────────────────────────────────────
  // 6. Fanzine issues
  // ──────────────────────────────────────────
  const fanzineRes = http.get(`${BASE_URL}/fanzine/issues`);
  check(fanzineRes, {
    "fanzine: status 200": (r) => r.status === 200,
    "fanzine: has issues": (r) => JSON.parse(r.body).length > 0,
  }) || errorRate.add(1);

  sleep(0.5);

  // ──────────────────────────────────────────
  // 7. Categories list
  // ──────────────────────────────────────────
  const categoriesRes = http.get(`${BASE_URL}/categories`);
  check(categoriesRes, {
    "categories: status 200": (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

export function handleSummary(data) {
  return {
    "k6-summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

// Note: textSummary needs k6 >= 0.30
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
