const DEFAULT_API_BASE = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "https://monvique-an7h.vercel.app/api";

function normalizeApiBase(rawBase) {
  const base = String(rawBase || "").trim();
  if (!base) {
    return DEFAULT_API_BASE;
  }

  if (!/^https?:\/\//i.test(base)) {
    return base.replace(/\/+$/, "");
  }

  try {
    const parsed = new URL(base);
    parsed.pathname = "/api";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    const withoutTrailingSlash = base.replace(/\/+$/, "");
    return `${withoutTrailingSlash.replace(/\/api$/i, "")}/api`;
  }
}

const PRIMARY_API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE || DEFAULT_API_BASE);
const API_BASE_CANDIDATES = [PRIMARY_API_BASE, "/api"].filter((value, index, arr) => arr.indexOf(value) === index);
const API_ORIGIN = /^https?:\/\//i.test(PRIMARY_API_BASE)
  ? PRIMARY_API_BASE.replace(/\/?api\/?$/, "")
  : window.location.origin;

export function toAssetUrl(imagePath = "") {
  if (!imagePath) {
    return "";
  }

  const normalizedSlashes = String(imagePath).replace(/\\/g, "/");

  if (/^https?:\/\//i.test(normalizedSlashes) || /^data:/i.test(normalizedSlashes)) {
    return normalizedSlashes;
  }

  const withoutPublicPrefix = normalizedSlashes.replace(/^\/?public\//i, "/");
  const normalizedPath = withoutPublicPrefix.startsWith("/") ? withoutPublicPrefix : `/${withoutPublicPrefix}`;
  return `${API_ORIGIN}${normalizedPath}`;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  let lastError = null;

  for (const base of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${base}${path}`, {
        credentials: "include",
        ...options,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(options.headers || {}),
        },
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : {};

      if (response.ok) {
        return payload;
      }

      const error = new Error(payload.message || "Request failed");
      error.status = response.status;

      // Retry with next base only for path/deploy mismatch.
      if (response.status === 404 && payload?.message === "Route not found") {
        lastError = error;
        continue;
      }

      throw error;
    } catch (error) {
      lastError = error;

      // Network/CORS uncertainty can be retried with alternate base.
      const shouldRetry = !error?.status;
      if (!shouldRetry) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed");
}

export const api = {
  getMe: () => request("/user/me", { method: "GET" }),
  login: (body) => request("/user/login", { method: "POST", body: JSON.stringify(body) }),
  signup: (body) => request("/user/signup", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/user/logout", { method: "POST" }),
  getProducts: (q = "") => request(`/product${q ? `?q=${encodeURIComponent(q)}` : ""}`, { method: "GET" }),
  getProduct: (id) => request(`/product/${id}`, { method: "GET" }),
  addToCart: (id, quantity) => request(`/product/${id}/cart`, { method: "POST", body: JSON.stringify({ quantity }) }),
  buyNow: (id, quantity) => request(`/product/${id}/buy-now`, { method: "POST", body: JSON.stringify({ quantity }) }),
  getCart: () => request("/product/cart", { method: "GET" }),
  updateCartQty: (productId, action) => request(`/product/cart/${productId}/update`, {
    method: "POST",
    body: JSON.stringify({ action }),
  }),
  removeCartItem: (productId) => request(`/product/cart/${productId}/remove`, { method: "POST" }),
  checkoutCart: () => request("/product/cart/checkout", { method: "POST" }),
  createCheckoutOrder: () => request("/product/cart/checkout/order", { method: "POST" }),
  verifyCheckoutPayment: (body) => request("/product/cart/checkout/verify", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  createBuyNowOrder: (id, quantity) => request(`/product/${id}/buy-now/order`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  }),
  verifyBuyNowPayment: (id, body) => request(`/product/${id}/buy-now/verify`, {
    method: "POST",
    body: JSON.stringify(body),
  }),
  createProduct: (formData) => request("/product", { method: "POST", body: formData }),
  updateProduct: (id, formData) => request(`/product/${id}`, { method: "PUT", body: formData }),
  deleteProduct: (id) => request(`/product/${id}`, { method: "DELETE" }),
};
