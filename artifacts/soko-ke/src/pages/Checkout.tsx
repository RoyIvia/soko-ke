import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "@/hooks/use-session";
import { 
  useGetCart,
  useCreateOrder,
  getGetCartQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKes } from "@/lib/utils";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Truck, CreditCard } from "lucide-react";
import { toast } from "sonner";

const kenyaCounties = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kiambu", "Machakos", "Kajiado"
]; // Abbreviated for example

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^(?:254|\+254|0)?(7(?:(?:[129][0-9])|(?:0[0-8])|(4[0-1]))[0-9]{6})$/, "Enter a valid Safaricom M-Pesa number"),
  county: z.string().min(1, "County is required"),
  town: z.string().min(2, "Town is required"),
  address: z.string().min(5, "Detailed address is required"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function Checkout() {
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: cart, isLoading: cartLoading } = useGetCart(
    { sessionId },
    { query: { queryKey: ["/api/cart", sessionId], enabled: !!sessionId } }
  );

  const createOrderMutation = useCreateOrder();

  useEffect(() => {
    if (!cartLoading && (!cart || cart.items.length === 0)) {
      setLocation("/cart");
    }
  }, [cart, cartLoading, setLocation]);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      county: "",
      town: "",
      address: "",
    },
  });

  const onSubmit = (data: CheckoutFormValues) => {
    createOrderMutation.mutate({
      data: {
        sessionId,
        ...data
      }
    }, {
      onSuccess: (order) => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
        toast.success("Order placed successfully!");
        setLocation(`/orders/${order.id}`);
      },
      onError: () => {
        toast.error("Failed to place order. Please try again.");
      }
    });
  };

  if (cartLoading || !cart || cart.items.length === 0) return null;

  const total = cart.subtotalKes; // Add shipping logic here if needed

  return (
    <ShopLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-6xl">
        <h1 className="text-3xl md:text-4xl font-bold font-serif mb-8 text-foreground">Secure Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-card border rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold font-serif mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Delivery Information
              </h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" id="checkout-form">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="county"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>County</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select County" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {kenyaCounties.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="town"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Town/City</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Westlands" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detailed Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street name, Building, Apartment number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-6 border-t mt-8">
                    <h2 className="text-xl font-bold font-serif mb-6 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" /> Payment details (M-Pesa)
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your Safaricom M-Pesa number. You will receive a prompt on your phone to enter your PIN to complete the payment.
                    </p>
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>M-Pesa Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 0712345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-muted/20 border rounded-2xl p-6 sticky top-24">
              <h3 className="text-xl font-bold font-serif mb-6 border-b pb-4">Order Summary</h3>
              
              <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                {cart.items.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 rounded-md bg-muted overflow-hidden shrink-0 border">
                      <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-sm">
                      <h4 className="font-semibold line-clamp-1">{item.product.name}</h4>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-semibold text-sm">
                      {formatKes(item.product.priceKes * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatKes(cart.subtotalKes)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-green-600">Free (Nairobi only)</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="font-bold text-lg text-foreground">Total to Pay</span>
                  <span className="font-bold text-2xl text-primary">{formatKes(total)}</span>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                <Button 
                  type="submit" 
                  form="checkout-form"
                  size="lg" 
                  className="w-full h-14 text-lg"
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? "Processing..." : "Pay with M-Pesa"}
                </Button>
                
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  Payments are secure and encrypted
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ShopLayout>
  );
}
