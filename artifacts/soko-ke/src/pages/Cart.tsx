import { Link, useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";
import { 
  useGetCart, 
  useUpdateCartItem, 
  useRemoveCartItem,
  getGetCartQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKes } from "@/lib/utils";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export function Cart() {
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: cart, isLoading } = useGetCart(
    { sessionId },
    { query: { queryKey: ["/api/cart", sessionId], enabled: !!sessionId } }
  );

  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveCartItem();

  const handleUpdateQty = (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    updateItemMutation.mutate(
      { id: itemId, data: { quantity: newQty } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
        }
      }
    );
  };

  const handleRemove = (itemId: number) => {
    removeItemMutation.mutate(
      { id: itemId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
          toast.success("Item removed from cart");
        }
      }
    );
  };

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <ShopLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-bold font-serif mb-8 text-foreground">Shopping Cart</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
            <div>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-24 bg-muted/20 rounded-2xl border border-dashed">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold font-serif mb-4">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">Looks like you haven't added anything yet.</p>
            <Link href="/products">
              <Button size="lg">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border bg-card relative group"
                  >
                    <Link href={`/products/${item.product.id}`} className="shrink-0">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.product.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start pr-8">
                        <div>
                          <h3 className="font-bold text-lg leading-tight mb-1 hover:text-primary transition-colors">
                            <Link href={`/products/${item.product.id}`}>{item.product.name}</Link>
                          </h3>
                          <p className="text-sm text-muted-foreground">{item.product.category}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center h-10 rounded-md border border-input bg-background overflow-hidden">
                          <button 
                            className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                            onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updateItemMutation.isPending}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <div className="w-10 h-full flex items-center justify-center font-semibold text-sm border-x border-input">
                            {item.quantity}
                          </div>
                          <button 
                            className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
                            onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock || updateItemMutation.isPending}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <p className="font-bold text-lg text-primary">
                          {formatKes(item.product.priceKes * item.quantity)}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleRemove(item.id)}
                      className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-muted/30 rounded-2xl border p-6 sticky top-24">
                <h3 className="text-xl font-bold font-serif mb-6 border-b pb-4">Order Summary</h3>
                
                <div className="space-y-4 mb-6 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal ({cart.items.reduce((a, b) => a + b.quantity, 0)} items)</span>
                    <span>{formatKes(cart.subtotalKes)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>
                
                <div className="border-t pt-4 mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl text-primary">{formatKes(cart.subtotalKes)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">Taxes included where applicable</p>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg"
                  onClick={() => setLocation("/checkout")}
                >
                  Proceed to Checkout <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                
                <div className="mt-6 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="h-6 opacity-80" />
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
