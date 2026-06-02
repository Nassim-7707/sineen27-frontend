// Sineen API Client — all data comes from the backend database.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── Token management ──────────────────────────────────────────────────────────
// Use localStorage so token persists across page refreshes
let _token: string | null = localStorage.getItem("sineen_access_token");

export function setToken(token: string) {
  _token = token;
  localStorage.setItem("sineen_access_token", token);
}

export function clearToken() {
  _token = null;
  localStorage.removeItem("sineen_access_token");
}

export function getToken(): string | null {
  return _token;
}

// ── Base fetch with auth + offline detection ──────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!navigator.onLine) {
    throw new OfflineError(`Offline: cannot reach ${path}`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message || `HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export class OfflineError extends Error {
  readonly isOffline = true;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (username: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; username: string; role: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) }
    ),

  checkRecovery: (username: string) =>
    apiFetch<{ configured: boolean }>(
      `/auth/recovery/check?username=${encodeURIComponent(username)}`
    ),

  recovery: (username: string, answer: string, newPassword: string) =>
    apiFetch<{ success: boolean }>("/auth/recovery", {
      method: "POST",
      body: JSON.stringify({ username, answer, newPassword }),
    }),

  setupRecovery: (answer: string) =>
    apiFetch<{ success: boolean }>("/auth/recovery/setup", {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiFetch<{ success: boolean }>("/auth/password/change", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
};

// ── Users (admin only) ────────────────────────────────────────────────────────
export const users = {
  getAll: () =>
    apiFetch<{ id: string; username: string; role: string; isActive: boolean }[]>("/admin/users"),
  create: (username: string, password: string, role: string) =>
    apiFetch<{ id: string; username: string; role: string }>("/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    }),
  deactivate: (id: string) =>
    apiFetch<{ id: string; isActive: boolean }>(`/admin/users/${id}/deactivate`, { method: "PATCH" }),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const products = {
  getPublished: () => apiFetch<unknown[]>("/products"),
  getAll: () => apiFetch<unknown[]>("/products/admin"),
  getById: (id: string) => apiFetch<unknown>(`/products/${id}`),
  create: (data: unknown) =>
    apiFetch<unknown>("/products/admin", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    apiFetch<unknown>(`/products/admin/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  publish: (id: string) =>
    apiFetch<unknown>(`/products/admin/${id}/publish`, { method: "PATCH" }),
  unpublish: (id: string) =>
    apiFetch<unknown>(`/products/admin/${id}/unpublish`, { method: "PATCH" }),
  archive: (id: string) =>
    apiFetch<unknown>(`/products/admin/${id}/archive`, { method: "PATCH" }),
  restore: (id: string) =>
    apiFetch<unknown>(`/products/admin/${id}/restore`, { method: "PATCH" }),
};

// ── Batches ───────────────────────────────────────────────────────────────────
export const batches = {
  getAll: (productId?: string) =>
    apiFetch<unknown[]>(`/admin/batches${productId ? `?productId=${productId}` : ""}`),
  getStock: (productId: string, color?: string, size?: string) =>
    apiFetch<{ remaining: number }>(
      `/admin/batches/stock/${productId}${color ? `?color=${color}&size=${size}` : ""}`
    ),
};

// ── Purchases ─────────────────────────────────────────────────────────────────
export const purchases = {
  getAll: () => apiFetch<unknown[]>("/admin/purchases"),
  getById: (id: string) => apiFetch<unknown>(`/admin/purchases/${id}`),
  create: (data: unknown) =>
    apiFetch<unknown>("/admin/purchases", { method: "POST", body: JSON.stringify(data) }),
  updatePayment: (id: string, paidAmount: number) =>
    apiFetch<unknown>(`/admin/purchases/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify({ paidAmount }),
    }),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = {
  create: (data: unknown) =>
    apiFetch<unknown>("/orders", { method: "POST", body: JSON.stringify(data) }),
  getAll: (params?: { status?: string; isOnlineOrder?: boolean }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<unknown[]>(`/admin/orders${q ? `?${q}` : ""}`);
  },
  getById: (id: string) => apiFetch<unknown>(`/admin/orders/${id}`),
  updateStatus: (id: string, status: string) =>
    apiFetch<unknown>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  completePOS: (data: unknown) =>
    apiFetch<unknown>("/admin/orders/pos", { method: "POST", body: JSON.stringify(data) }),
};

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const suppliers = {
  getAll: () => apiFetch<unknown[]>("/admin/suppliers"),
  create: (data: unknown) =>
    apiFetch<unknown>("/admin/suppliers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    apiFetch<unknown>(`/admin/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<null>(`/admin/suppliers/${id}`, { method: "DELETE" }),
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = {
  getAll: () => apiFetch<unknown[]>("/admin/customers"),
  getById: (id: string) => apiFetch<unknown>(`/admin/customers/${id}`),
  create: (data: unknown) =>
    apiFetch<unknown>("/admin/customers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    apiFetch<unknown>(`/admin/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  settleDebt: (id: string, amount: number) =>
    apiFetch<unknown>(`/admin/customers/${id}/debt`, {
      method: "PATCH",
      body: JSON.stringify({ amount }),
    }),
};

// ── Wilayas ───────────────────────────────────────────────────────────────────
export const wilayas = {
  getAll: () => apiFetch<{ wilayaCode: string; wilayaName: string; deliveryFee: number }[]>("/wilayas"),
  updateFee: (code: string, deliveryFee: number) =>
    apiFetch<unknown>(`/wilayas/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: JSON.stringify({ deliveryFee }),
    }),
};

