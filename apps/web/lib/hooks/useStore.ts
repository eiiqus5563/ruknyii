'use client';

import { useState, useCallback } from 'react';
import { AuthClient } from '@/lib/auth/auth-client';
import { API_URL } from '@/lib/config';

// ==================== ENUMS ====================

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

// ==================== INTERFACES ====================

export interface Product {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  isActive: boolean;
  stock: number;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  hasVariants?: boolean;
  variants?: {
    id: string;
    sku?: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    attributes: Record<string, string>;
    imageUrl?: string;
    isActive?: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  totalOrders: number;
  totalRevenue: number;
  totalViews: number;
}

export interface ProductsFilters {
  status?: 'active' | 'draft' | 'archived';
  search?: string;
  categoryId?: string;
}

export type ProductsSortOption = 'newest' | 'oldest' | 'name' | 'price-high' | 'price-low' | 'stock';

// ==================== ARABIC LABELS ====================

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  draft: 'مخفي',
  archived: 'مؤرشف',
};

export const PRODUCT_STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  active: { color: 'text-emerald-600', bg: 'bg-emerald-100' },
  draft: { color: 'text-gray-600', bg: 'bg-gray-100' },
  archived: { color: 'text-amber-600', bg: 'bg-amber-100' },
};

// ==================== HELPERS ====================

export function filterProducts(products: Product[], filters: ProductsFilters): Product[] {
  if (!products || !Array.isArray(products)) return [];

  return products.filter((product) => {
    if (filters.status) {
      if (filters.status === 'active' && !product.isActive) return false;
      if (filters.status === 'draft' && product.isActive) return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(searchLower);
      const matchesDesc = product.description?.toLowerCase().includes(searchLower);
      const matchesSlug = product.slug.toLowerCase().includes(searchLower);
      if (!matchesName && !matchesDesc && !matchesSlug) return false;
    }

    if (filters.categoryId && product.categoryId !== filters.categoryId) return false;

    return true;
  });
}

export function sortProducts(products: Product[], sortBy: ProductsSortOption): Product[] {
  if (!products || !Array.isArray(products)) return [];

  const sorted = [...products];
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'stock':
      return sorted.sort((a, b) => b.stock - a.stock);
    default:
      return sorted;
  }
}

export function calculateStoreStats(products: Product[]): StoreStats {
  if (!products || !Array.isArray(products)) {
    return { totalProducts: 0, activeProducts: 0, draftProducts: 0, totalOrders: 0, totalRevenue: 0, totalViews: 0 };
  }

  return {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.isActive).length,
    draftProducts: products.filter(p => !p.isActive).length,
    totalOrders: 0,
    totalRevenue: 0,
    totalViews: 0,
  };
}

// ==================== HOOK ====================

export function useStore() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeProduct = useCallback((raw: any): Product => {
    const rawImages = Array.isArray(raw?.images)
      ? raw.images
      : Array.isArray(raw?.product_images)
        ? raw.product_images.map((img: any) => img?.imagePath).filter(Boolean)
        : [];

    return {
      id: String(raw?.id ?? ''),
      storeId: String(raw?.storeId ?? ''),
      name: raw?.name ?? raw?.nameAr ?? '',
      slug: raw?.slug ?? '',
      description: raw?.description ?? raw?.descriptionAr ?? undefined,
      price: Number(raw?.price ?? 0),
      compareAtPrice:
        raw?.compareAtPrice !== undefined
          ? Number(raw.compareAtPrice)
          : raw?.salePrice !== undefined
            ? Number(raw.salePrice)
            : undefined,
      images: rawImages,
      isActive:
        typeof raw?.isActive === 'boolean'
          ? raw.isActive
          : String(raw?.status ?? '').toUpperCase() === 'ACTIVE',
      stock: Number(raw?.stock ?? raw?.quantity ?? 0),
      categoryId: raw?.categoryId ?? undefined,
      category: raw?.product_categories
        ? {
            id: String(raw.product_categories.id),
            name: raw.product_categories.nameAr || raw.product_categories.name,
          }
        : raw?.category
          ? {
              id: String(raw.category.id),
              name: raw.category.name,
            }
          : undefined,
      createdAt: raw?.createdAt ?? new Date().toISOString(),
      updatedAt: raw?.updatedAt ?? new Date().toISOString(),
      hasVariants: raw?.hasVariants ?? false,
      variants: Array.isArray(raw?.variants)
        ? raw.variants.map((v: any) => ({
            id: String(v.id),
            sku: v.sku || undefined,
            price: Number(v.price ?? 0),
            compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
            stock: Number(v.stock ?? 0),
            attributes: v.attributes ?? {},
            imageUrl: v.imageUrl || undefined,
            isActive: v.isActive !== false,
          }))
        : undefined,
    };
  }, []);

  const ensureAuth = useCallback(async (): Promise<string | null> => {
    let token = AuthClient.getToken();
    if (!token) {
      const refreshed = await AuthClient.refreshTokens();
      if (refreshed) {
        token = AuthClient.getToken();
      }
    }
    return token;
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const token = await ensureAuth();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [ensureAuth]);

  // Get store products
  const getProducts = useCallback(async (): Promise<Product[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/products/my-products`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('فشل في تحميل المنتجات');
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];
      return data.map(normalizeProduct);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل المنتجات');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, normalizeProduct]);

  // Delete product
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'DELETE',
        headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [getAuthHeaders]);

  // Toggle product status
  const toggleProductStatus = useCallback(async (productId: string, isActive: boolean): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: isActive ? 'ACTIVE' : 'INACTIVE' }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [getAuthHeaders]);

  // Get single product by ID
  const getProduct = useCallback(async (productId: string): Promise<Product | null> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) return null;

      const data = await response.json();
      return normalizeProduct(data);
    } catch {
      return null;
    }
  }, [getAuthHeaders, normalizeProduct]);

  // Get single product by slug
  const getProductBySlug = useCallback(async (slug: string): Promise<Product | null> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/products/slug/${slug}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) return null;

      const data = await response.json();
      return normalizeProduct(data);
    } catch {
      return null;
    }
  }, [getAuthHeaders, normalizeProduct]);

  // Update product
  const updateProduct = useCallback(async (productId: string, payload: Record<string, unknown>): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, [getAuthHeaders]);

  return {
    getProducts,
    getProduct,
    getProductBySlug,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    isLoading,
    error,
  };
}
