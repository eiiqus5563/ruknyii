/**
 * 🛒 Cart Store - localStorage-based cart for guest checkout
 * No authentication required. One cart per store (by storeUsername).
 */

export interface CartItem {
  productId: string;
  name: string;
  /** Actual selling price (salePrice if discounted, else base price) */
  price: number;
  /** Original base price (for showing crossed-out price) */
  originalPrice: number;
  currency: string;
  quantity: number;
  image: string;
  /** Max available stock */
  stock: number;
  /** Is this a digital product (e-book, file, etc.) */
  isDigital?: boolean;
  /** Variant info (optional) */
  variantId?: string;
  variantName?: string;
  variantAttributes?: Record<string, string>;
}

export interface Cart {
  storeId: string;
  storeUsername: string;
  items: CartItem[];
}

const CART_KEY = 'rukny_cart';

function readCart(): Cart | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Cart;
  } catch {
    return null;
  }
}

function writeCart(cart: Cart): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function getCart(): Cart | null {
  return readCart();
}

export function getCartItems(): CartItem[] {
  return readCart()?.items ?? [];
}

export function getCartCount(): number {
  return getCartItems().reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartTotal(): number {
  return getCartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Check if all items in cart are digital products
 */
export function isCartAllDigital(): boolean {
  const items = getCartItems();
  return items.length > 0 && items.every((item) => item.isDigital);
}

/**
 * Check if cart has any digital items
 */
export function hasDigitalItems(): boolean {
  return getCartItems().some((item) => item.isDigital);
}

export function getCartCurrency(): string {
  return readCart()?.items[0]?.currency ?? 'IQD';
}

/**
 * Unique key for a cart item: productId + variantId
 */
function cartItemKey(item: { productId: string; variantId?: string }): string {
  return item.variantId ? `${item.productId}::${item.variantId}` : item.productId;
}

/**
 * Add a product to cart. If product is from a different store, clears cart first.
 * Returns 'added' | 'updated' | 'store_conflict'
 */
export function addToCart(
  item: Omit<CartItem, 'quantity'> & { storeId: string; storeUsername: string; quantity?: number },
): 'added' | 'updated' {
  const { storeId, storeUsername, quantity = 1, ...itemData } = item;
  let cart = readCart();

  // If cart has items from a DIFFERENT store, clear it first
  if (cart && cart.storeId !== storeId) {
    cart = { storeId, storeUsername, items: [] };
  }

  if (!cart) {
    cart = { storeId, storeUsername, items: [] };
  }

  const key = cartItemKey(itemData);
  const existing = cart.items.find((i) => cartItemKey(i) === key);

  if (existing) {
    const newQty = Math.min(existing.quantity + quantity, itemData.stock);
    existing.quantity = newQty;
    writeCart(cart);
    return 'updated';
  }

  cart.items.push({ ...itemData, quantity: Math.min(quantity, itemData.stock) });
  writeCart(cart);
  return 'added';
}

export function removeFromCart(productId: string, variantId?: string): void {
  const cart = readCart();
  if (!cart) return;
  const key = cartItemKey({ productId, variantId });
  cart.items = cart.items.filter((i) => cartItemKey(i) !== key);
  writeCart(cart);
}

export function updateQuantity(productId: string, quantity: number, variantId?: string): void {
  const cart = readCart();
  if (!cart) return;
  const key = cartItemKey({ productId, variantId });
  const item = cart.items.find((i) => cartItemKey(i) === key);
  if (!item) return;
  if (quantity <= 0) {
    cart.items = cart.items.filter((i) => cartItemKey(i) !== key);
  } else {
    item.quantity = Math.min(quantity, item.stock);
  }
  writeCart(cart);
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_KEY);
}

/**
 * Sync cart items' stock values with fresh product data.
 * Removes items that are now out of stock, clamps quantities.
 */
export function syncCartStock(products: { id: string; stock?: number; variants?: { id: string; stock: number }[] }[]): void {
  const cart = readCart();
  if (!cart || cart.items.length === 0) return;

  const productMap = new Map(products.map(p => [p.id, p]));
  let changed = false;

  cart.items = cart.items.filter(item => {
    const product = productMap.get(item.productId);
    if (!product) return true; // product not in the fetched set, keep it

    let freshStock: number;
    if (item.variantId && product.variants) {
      const variant = product.variants.find(v => v.id === item.variantId);
      freshStock = variant ? variant.stock : 0;
    } else {
      freshStock = product.stock ?? 0;
    }

    if (freshStock <= 0) {
      changed = true;
      return false; // remove from cart
    }

    if (item.stock !== freshStock) {
      item.stock = freshStock;
      changed = true;
    }
    if (item.quantity > freshStock) {
      item.quantity = freshStock;
      changed = true;
    }
    return true;
  });

  if (changed) writeCart(cart);
}

// ─── Checkout session token ──────────────────────────────────────────────────

const CHECKOUT_TOKEN_KEY = 'rukny_checkout_token';
const CHECKOUT_PHONE_KEY = 'rukny_checkout_phone';

export function getCheckoutToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CHECKOUT_TOKEN_KEY);
}

export function setCheckoutToken(token: string, phone: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHECKOUT_TOKEN_KEY, token);
  localStorage.setItem(CHECKOUT_PHONE_KEY, phone);
}

export function getCheckoutPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CHECKOUT_PHONE_KEY);
}

export function clearCheckoutSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CHECKOUT_TOKEN_KEY);
  localStorage.removeItem(CHECKOUT_PHONE_KEY);
}

// ─── Payment Sessions ───────────────────────────────────────────────────────

const PAYMENT_SESSION_PREFIX = 'rukny_pay_';
const ACTIVE_SESSION_KEY = 'rukny_active_session';

export interface PaymentSession {
  id: string;
  storeId: string;
  storeUsername: string;
  items: CartItem[];
  total: number;
  currency: string;
  createdAt: number;
  /** True if ALL items are digital (no shipping needed) */
  allDigital: boolean;
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pay_${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(36).substring(2, 10);
  const ts = Date.now().toString(36);
  return `pay_${ts}${rand}`;
}

/**
 * Create a payment session from current cart, returns { sessionId, url }.
 * Cart is NOT cleared here — cleared after successful order.
 */
export function createPaymentSession(): { sessionId: string; url: string } | null {
  const cart = readCart();
  if (!cart || cart.items.length === 0) return null;

  // Clear any previous checkout session so verify page doesn't skip
  clearCheckoutSession();

  const sessionId = generateSessionId();
  const allDigital = cart.items.length > 0 && cart.items.every((i) => i.isDigital);
  const session: PaymentSession = {
    id: sessionId,
    storeId: cart.storeId,
    storeUsername: cart.storeUsername,
    items: [...cart.items],
    total: cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    currency: cart.items[0]?.currency ?? 'IQD',
    createdAt: Date.now(),
    allDigital,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(PAYMENT_SESSION_PREFIX + sessionId, JSON.stringify(session));
    sessionStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  }

  const url = `/payment/verify?id=${sessionId}`;
  return { sessionId, url };
}

export function getPaymentSession(sessionId: string): PaymentSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PAYMENT_SESSION_PREFIX + sessionId);
    if (!raw) return null;
    return JSON.parse(raw) as PaymentSession;
  } catch {
    return null;
  }
}

/**
 * Get the active payment session ID from sessionStorage.
 */
export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACTIVE_SESSION_KEY);
}

export function clearPaymentSession(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PAYMENT_SESSION_PREFIX + sessionId);
  sessionStorage.removeItem(ACTIVE_SESSION_KEY);
}
