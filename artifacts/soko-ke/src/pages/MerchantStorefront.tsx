
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";

import { ShopLayout } from "@/components/layout/ShopLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKes } from "@/lib/utils";

type StorefrontMerchant = {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string;
  county: string;
  description: string;
  logoUrl: string | null;
  approvedAt: string | null;
  verified: boolean;
};

type StorefrontProduct = {
  id: number;
  name: string;
  description: string;
  priceKes: number;
  category: string;
  imageUrl: string;
  stock: number;
  rating: number;
  reviewCount: number;
  county: string | null;
  featured: boolean;
  isSponsored: boolean;
  createdAt: string;
};

type StorefrontResponse = {
  merchant: StorefrontMerchant;
  products: StorefrontProduct[];
  totalProducts: number;
};

async function fetchStorefront(
  slug: string,
): Promise<StorefrontResponse> {
  const response = await fetch(
    `/api/storefronts/${encodeURIComponent(slug)}`,
    {
      credentials: "include",
    },
  );

  if (response.status === 404) {
    throw new Error("MERCHANT_NOT_FOUND");
  }

  if (!response.ok) {
    throw new Error("Unable to load this merchant storefront.");
  }

  return response.json() as Promise<StorefrontResponse>;
}

function StorefrontLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 md:px-6">
      <Skeleton className="mb-8 h-5 w-36" />

      <div className="mb-10 overflow-hidden rounded-2xl border">
        <Skeleton className="h-36 w-full md:h-44" />

        <div className="space-y-4 p-6 md:p-8">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full max-w-2xl" />
        </div>
      </div>

      <Skeleton className="mb-6 h-8 w-48" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="space-y-3">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MerchantStorefront() {
  const { slug } = useParams<{ slug: string }>();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["merchant-storefront", slug],
    queryFn: () => fetchStorefront(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <ShopLayout>
        <StorefrontLoading />
      </ShopLayout>
    );
  }

  if (isError || !data) {
    const notFound =
      error instanceof Error &&
      error.message === "MERCHANT_NOT_FOUND";

    return (
      <ShopLayout>
        <div className="container mx-auto max-w-3xl px-4 py-24 text-center md:px-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Store className="h-10 w-10 text-muted-foreground" />
          </div>

          <h1 className="mb-4 font-serif text-3xl font-bold">
            {notFound
              ? "Merchant storefront unavailable"
              : "Unable to load storefront"}
          </h1>

          <p className="mb-8 text-muted-foreground">
            {notFound
              ? "This merchant may be unavailable or their storefront has not been approved."
              : "We couldn't load this storefront. Please try again."}
          </p>

          <Link href="/products">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Products
            </Button>
          </Link>
        </div>
      </ShopLayout>
    );
  }

  const { merchant, products, totalProducts } = data;

  const phoneHref = `tel:${merchant.phone.replace(
    /[^\d+]/g,
    "",
  )}`;

  const emailHref = `mailto:${merchant.email}`;

  return (
    <ShopLayout>
      <div className="container mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Link
          href="/products"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        {/* Merchant profile */}
        <section className="mb-12 overflow-hidden rounded-2xl border bg-card">
          <div className="h-32 bg-primary md:h-44" />

          <div className="relative px-5 pb-7 md:px-8 md:pb-9">
            <div className="-mt-10 mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-sm md:-mt-12 md:h-24 md:w-24">
              {merchant.logoUrl ? (
                <img
                  src={merchant.logoUrl}
                  alt={`${merchant.name} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-9 w-9 text-primary" />
              )}
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h1 className="font-serif text-3xl font-bold md:text-4xl">
                    {merchant.name}
                  </h1>

                  {merchant.verified && (
                    <Badge
                      variant="secondary"
                      className="gap-1"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Approved Merchant
                    </Badge>
                  )}
                </div>

                <p className="mb-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {merchant.county}, Kenya
                </p>

                <h2 className="mb-2 font-semibold">
                  About this merchant
                </h2>

                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                  {merchant.description}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3 md:flex-col">
                <Button asChild>
                  <a href={phoneHref}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Merchant
                  </a>
                </Button>

                <Button variant="outline" asChild>
                  <a href={emailHref}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email Merchant
                  </a>
                </Button>
              </div>
            </div>

            <div className="mt-7 grid gap-3 border-t pt-6 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-primary" />

                <a
                  href={phoneHref}
                  className="break-all hover:text-primary hover:underline"
                >
                  {merchant.phone}
                </a>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-primary" />

                <a
                  href={emailHref}
                  className="break-all hover:text-primary hover:underline"
                >
                  {merchant.email}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Merchant products */}
        <section>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="mb-2 font-serif text-2xl font-bold md:text-3xl">
                Products from {merchant.name}
              </h2>

              <p className="text-sm text-muted-foreground">
                {totalProducts}{" "}
                {totalProducts === 1
                  ? "product"
                  : "products"}{" "}
                available in this storefront
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center">
              <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />

              <h3 className="mb-2 text-xl font-semibold">
                No products available yet
              </h3>

              <p className="mb-6 text-muted-foreground">
                This merchant currently has no approved products
                listed.
              </p>

              <Link href="/products">
                <Button variant="outline">
                  Browse Other Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="block"
                >
                  <Card className="group flex h-full cursor-pointer flex-col overflow-hidden border-transparent bg-transparent p-3 shadow-none transition-colors hover:bg-muted/30">
                    <div className="relative mb-4 aspect-square shrink-0 overflow-hidden rounded-xl bg-muted">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {(product.featured ||
                        product.isSponsored) && (
                        <Badge className="absolute left-3 top-3 border-none bg-accent text-accent-foreground">
                          {product.isSponsored
                            ? "Sponsored"
                            : "Featured"}
                        </Badge>
                      )}

                      {product.stock === 0 && (
                        <Badge
                          variant="secondary"
                          className="absolute bottom-3 left-3"
                        >
                          Out of Stock
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {product.category}
                        </span>

                        <span className="flex items-center text-xs font-bold text-accent">
                          <Star className="mr-1 h-3 w-3 fill-current" />
                          {product.rating.toFixed(1)}
                        </span>
                      </div>

                      <h3 className="mb-3 line-clamp-2 flex-1 text-base font-bold leading-tight transition-colors group-hover:text-primary">
                        {product.name}
                      </h3>

                      <p className="mt-auto font-semibold text-foreground">
                        {formatKes(product.priceKes)}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </ShopLayout>
  );
}
