
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";

import {
  useGetCart,
  useUpdateCartItem,
  useRemoveCartItem,
  getGetCartQueryKey,
} from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";
import { formatKes } from "@/lib/utils";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { Button } from "@/components/ui/button";

import {
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type QuantityControlProps = {
  quantity: number;
  stock: number;
  disabled: boolean;
  onUpdate: (quantity: number) => Promise<void>;
};

function QuantityControl({
  quantity,
  stock,
  disabled,
  onUpdate,
}: QuantityControlProps) {
  const [draft, setDraft] = useState(String(quantity));

  useEffect(() => {
    setDraft(String(quantity));
  }, [quantity]);

  const saveQuantity = async (value: string) => {
    const trimmed = value.trim();

    if (!/^\d+$/.test(trimmed)) {
      setDraft(String(quantity));
      toast.error("Enter a valid whole number.");
      return;
    }

    const nextQuantity = Number(trimmed);

    if (
      !Number.isSafeInteger(nextQuantity) ||
      nextQuantity < 1
    ) {
      setDraft(String(quantity));
      toast.error("Quantity must be at least 1.");
      return;
    }

    if (nextQuantity > stock) {
      setDraft(String(quantity));
      toast.error(
        `Only ${stock} item${stock === 1 ? "" : "s"} available in stock.`,
      );
      return;
    }

    if (nextQuantity === quantity) {
      setDraft(String(quantity));
      return;
    }

    try {
      await onUpdate(nextQuantity);
      setDraft(String(nextQuantity));
    } catch (error) {
      setDraft(String(quantity));

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update quantity.",
      );
    }
  };

  const handleStep = async (change: number) => {
    if (disabled) return;

    const nextQuantity = quantity + change;

    if (nextQuantity < 1 || nextQuantity > stock) {
      return;
    }

    await saveQuantity(String(nextQuantity));
  };

  return (
    <div className="flex h-10 items-center overflow-hidden rounded-md border border-input bg-background">
      <button
        type="button"
        aria-label="Decrease quantity"
        className="flex h-full w-10 items-center justify-center transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void handleStep(-1)}
        disabled={disabled || quantity <= 1}
      >
        <Minus className="h-3 w-3" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="Item quantity"
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;

          if (/^\d*$/.test(value)) {
            setDraft(value);
          }
        }}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => {
          if (!disabled) {
            void saveQuantity(event.currentTarget.value);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            event.currentTarget.value = String(quantity);
            setDraft(String(quantity));
            event.currentTarget.blur();
          }
        }}
        className="h-full w-14 border-x border-input bg-transparent px-1 text-center text-sm font-semibold outline-none focus:bg-muted/30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-50"
      />

      <button
        type="button"
        aria-label="Increase quantity"
        className="flex h-full w-10 items-center justify-center transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void handleStep(1)}
        disabled={disabled || quantity >= stock}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function Cart() {
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: cart, isLoading } = useGetCart(
    { sessionId },
    {
      query: {
        queryKey: ["/api/cart", sessionId],
        enabled: !!sessionId,
      },
    },
  );

  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();

  const refreshCart = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["/api/cart", sessionId],
      }),
      queryClient.invalidateQueries({
        queryKey: getGetCartQueryKey({ sessionId }),
      }),
    ]);
  };

  const handleUpdateQty = async (
    itemId: number,
    newQty: number,
  ) => {
    await updateItemMutation.mutateAsync({
      id: itemId,
      data: { quantity: newQty },
    });

    await refreshCart();
  };

  const handleRemove = (itemId: number) => {
    removeItemMutation.mutate(
      { id: itemId },
      {
        onSuccess: () => {
          void refreshCart();
          toast.success("Item removed from cart");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to remove item.",
          );
        },
      },
    );
  };

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <ShopLayout>
      <div className="container mx-auto max-w-5xl px-4 py-12 md:px-6">
        <h1 className="mb-8 font-serif text-3xl font-bold text-foreground md:text-4xl">
          Shopping Cart
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            <div className="space-y-4 lg:col-span-2">
              {[1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className="h-32 w-full rounded-xl"
                />
              ))}
            </div>

            <div>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 py-24 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>

            <h2 className="mb-4 font-serif text-2xl font-bold">
              Your cart is empty
            </h2>

            <p className="mb-8 text-muted-foreground">
              Looks like you haven't added anything yet.
            </p>

            <Link href="/products">
              <Button size="lg">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
            {/* Cart items */}
            <div className="space-y-4 lg:col-span-2">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                      transition: { duration: 0.2 },
                    }}
                    className="group relative flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row"
                  >
                    <Link
                      href={`/products/${item.product.id}`}
                      className="shrink-0"
                    >
                      <div className="h-24 w-24 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-32">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col justify-between py-1">
                      <div className="flex items-start justify-between pr-8">
                        <div>
                          <h3 className="mb-1 text-lg font-bold leading-tight transition-colors hover:text-primary">
                            <Link
                              href={`/products/${item.product.id}`}
                            >
                              {item.product.name}
                            </Link>
                          </h3>

                          <p className="text-sm text-muted-foreground">
                            {item.product.category}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <QuantityControl
                          quantity={item.quantity}
                          stock={item.product.stock}
                          disabled={updateItemMutation.isPending}
                          onUpdate={(newQty) =>
                            handleUpdateQty(item.id, newQty)
                          }
                        />

                        <p className="text-right text-lg font-bold text-primary">
                          {formatKes(
                            item.product.priceKes * item.quantity,
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={removeItemMutation.isPending}
                      className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order summary */}
            <div>
              <div className="sticky top-24 rounded-2xl border bg-muted/30 p-6">
                <h3 className="mb-6 border-b pb-4 font-serif text-xl font-bold">
                  Order Summary
                </h3>

                <div className="mb-6 space-y-4 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      Subtotal (
                      {cart.items.reduce(
                        (total, item) =>
                          total + item.quantity,
                        0,
                      )}{" "}
                      items)
                    </span>

                    <span>
                      {formatKes(cart.subtotalKes)}
                    </span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                <div className="mb-8 border-t pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-lg font-bold">
                      Total
                    </span>

                    <span className="text-2xl font-bold text-primary">
                      {formatKes(cart.subtotalKes)}
                    </span>
                  </div>

                  <p className="text-right text-xs text-muted-foreground">
                    Taxes included where applicable
                  </p>
                </div>

                <Button
                  size="lg"
                  className="h-14 w-full text-lg"
                  onClick={() => setLocation("/checkout")}
                  disabled={
                    updateItemMutation.isPending ||
                    removeItemMutation.isPending
                  }
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg"
                    alt="M-Pesa"
                    className="h-6 opacity-80"
                  />

                  <span>Secure checkout via M-Pesa</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ShopLayout>
  );
}
