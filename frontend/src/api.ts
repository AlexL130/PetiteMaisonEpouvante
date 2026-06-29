const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...fetchOptions } = options || {};
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...fetchOptions, headers: { ...headers, ...fetchOptions.headers as Record<string, string> } });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Public ─────────────────────────────────────
export interface Product {
  id: number; title: string; slug: string; short_desc: string;
  price: string; compare_price: string | null; stock_quantity: number;
  is_featured: boolean; is_exclusive: boolean; attributes: Record<string, unknown>;
  category_name: string; category_slug: string;
  image_url: string; image_alt: string; created_at: string;
  description?: string; images?: ProductImage[];
}

export interface ProductImage { id: number; url: string; alt_text: string; position: number; is_primary: boolean; }
export interface Category { id: number; name: string; slug: string; description: string; icon_url: string; parent_id: number | null; sort_order: number; }
export interface FanzineIssue { id: number; issue_number: number; title: string; description: string; cover_url: string; page_count: number; published_at: string; is_free_preview: boolean; }
export interface CartItem { id: number; quantity: number; product_id: number; title: string; slug: string; price: string; stock_quantity: number; image_url: string; }
export interface Order { id: number; status: string; total_amount: string; shipping_cost: string; created_at: string; items_count: number; items?: OrderItem[]; }
export interface OrderItem { id: number; title: string; price: string; quantity: number; image_url: string; }
export interface Subscription { id: number; type: string; status: string; start_date: string; end_date: string; auto_renew: boolean; price_paid: string; }

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const api = {
  // Public
  getProducts: (params?: string) => request<{ products: Product[]; pagination: { page: number; limit: number; total: number; total_pages: number } }>(`/products${params ? `?${params}` : ""}`),
  getFeatured: () => request<Product[]>("/products/featured"),
  getProduct: (slug: string) => request<Product>(`/products/${slug}`),
  getCategories: () => request<Category[]>("/categories"),
  getFanzineIssues: () => request<FanzineIssue[]>("/fanzine/issues"),

  // Auth
  register: (email: string, password: string, displayName?: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name: displayName })
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  getMe: (token: string) => request<AuthUser>("/auth/me", { token }),

  // Auth required
  getProfile: (token: string) => request<{ id: number; email: string; display_name: string; avatar_url: string; roles: string[] }>("/me/profile", { token }),
  updateProfile: (token: string, body: { display_name?: string }) =>
    request<{ id: number; display_name: string }>("/me/profile", { method: "PATCH", body: JSON.stringify(body), token }),

  // Cart
  getCart: (token: string) => request<{ items: CartItem[]; subtotal: number; count: number }>("/cart", { token }),
  addToCart: (token: string, product_id: number, quantity = 1) =>
    request<{ id: number }>("/cart", { method: "POST", body: JSON.stringify({ product_id, quantity }), token }),
  updateCartItem: (token: string, id: number, quantity: number) =>
    request<{ id: number }>(`/cart/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }), token }),
  removeCartItem: (token: string, id: number) =>
    request<{ deleted: boolean }>(`/cart/${id}`, { method: "DELETE", token }),
  checkout: (token: string, shipping: { shipping_name: string; shipping_address: string; shipping_city: string; shipping_zip: string }) =>
    request<{ order: Order }>("/cart/checkout", { method: "POST", body: JSON.stringify(shipping), token }),

  // Orders
  getOrders: (token: string) => request<Order[]>("/orders", { token }),
  getOrder: (token: string, id: number) => request<Order>(`/orders/${id}`, { token }),

  // Fanzine
  readIssue: (token: string, id: number) => request<{ pdf_url: string; access: string }>(`/fanzine/read/${id}`, { token }),
  getLibrary: (token: string) => request<{ owned: FanzineIssue[]; free_previews: FanzineIssue[] }>("/fanzine/library", { token }),
  getSubscriptions: (token: string) => request<Subscription[]>("/subscriptions/me", { token }),
  subscribe: (token: string, type: string) =>
    request<Subscription>("/subscriptions", { method: "POST", body: JSON.stringify({ type }), token }),
  cancelSubscription: (token: string, id: number) =>
    request<{ id: number }>(`/subscriptions/${id}`, { method: "DELETE", token }),
};
