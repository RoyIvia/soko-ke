import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

const api = async <T>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Something went wrong");
  }

  return body as T;
};

export type MarketplaceMe = {
  signedIn: boolean;
  role: "customer" | "merchant" | "platform_admin";
  merchant: Merchant | null;
};

export type Merchant = {
  id: number;
  name: string;
  email: string;
  phone: string;
  county: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  productCount: number;
  createdAt: string;
  approvedAt: string | null;
};

export type MerchantProfileInput = {
  name: string;
  email: string;
  phone: string;
  county: string;
  description: string;
};

export type MerchantProduct = {
  id: number;
  name: string;
  description: string;
  priceKes: number;
  category: string;
  imageUrl: string;
  stock: number;
  county: string | null;
  listingStatus: "pending" | "approved" | "rejected";
  isSponsored: boolean;
  sponsoredUntil: string | null;
};

export type MerchantProductInput = {
  name: string;
  description: string;
  priceKes: number;
  category: string;
  imageUrl: string;
  stock: number;
  county: string;
};

export type PromotionPackage = {
  id: string;
  name: string;
  durationDays: number;
  priceKes: number;
  description: string;
};

export function useMarketplaceMe() {
  return useQuery({
    queryKey: ["marketplace-me"],
    queryFn: () => api<MarketplaceMe>("/me"),
  });
}

export function useMerchants(enabled = true) {
  return useQuery({
    queryKey: ["merchants"],
    queryFn: () => api<Merchant[]>("/merchants"),
    enabled,
  });
}

export function useUpdateMerchantProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MerchantProfileInput) =>
      api<Merchant>("/merchant/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["marketplace-me"],
      });
    },
  });
}

export function useAdminUpdateMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: MerchantProfileInput;
    }) =>
      api<Merchant>(`/merchants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["merchants"],
      });
    },
  });
}

export function useMerchantProducts(enabled = true) {
  return useQuery({
    queryKey: ["merchant-products"],
    queryFn: () =>
      api<MerchantProduct[]>("/merchant/products"),
    enabled,
  });
}

export function useCreateMerchantProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MerchantProductInput) =>
      api<MerchantProduct>("/merchant/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["merchant-products"],
      });
    },
  });
}

export function useUpdateMerchantProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: MerchantProductInput;
    }) =>
      api<MerchantProduct>(
        `/merchant/products/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["merchant-products"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });
}

export function useDeleteMerchantProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/merchant/products/${id}`, {
        method: "DELETE",
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["merchant-products"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });
}

export function useAdminProducts(enabled = true) {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: () =>
      api<MerchantProduct[]>("/admin/products"),
    enabled,
  });
}

export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) =>
      api<MerchantProduct>(
        `/admin/products/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      ),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-products"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });
}

export function usePromotionPackages() {
  return useQuery({
    queryKey: ["promotion-packages"],
    queryFn: () =>
      api<PromotionPackage[]>("/promotions/packages"),
  });
}

export function usePromotions(enabled = true) {
  return useQuery({
    queryKey: ["promotions"],
    queryFn: () => api<any[]>("/promotions"),
    enabled,
  });
}

export function useApplyMerchant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MerchantProfileInput) =>
      api<Merchant>("/merchants/apply", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["marketplace-me"],
      });
    },
  });
}

export function useUpdateMerchantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: Merchant["status"];
    }) =>
      api<Merchant>(`/merchants/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["merchants"],
      });
    },
  });
}

export function useCreatePromotionCheckout() {
  return useMutation({
    mutationFn: ({
      productId,
      packageId,
    }: {
      productId: number;
      packageId: string;
    }) =>
      api<{
        checkoutUrl: string;
        campaign: any;
      }>("/promotions/checkout", {
        method: "POST",
        body: JSON.stringify({
          productId,
          packageId,
        }),
      }),
  });
}

export async function confirmPromotion(
  sessionId: string
) {
  return api<any>(
    `/promotions/confirm?session_id=${encodeURIComponent(
      sessionId
    )}`
  );
}
