import { useParams, Link } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { formatKes } from "@/lib/utils";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Truck, Package, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const statusSteps = [
  { id: "pending", label: "Order Placed", icon: Clock },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { id: "shipped", label: "Shipped", icon: Truck },
  { id: "delivered", label: "Delivered", icon: Package },
];

export function OrderDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: order, isLoading } = useGetOrder(id, {
    query: { queryKey: ["/api/orders", id], enabled: !!id }
  });

  if (isLoading) {
    return (
      <ShopLayout>
        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-8">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </ShopLayout>
    );
  }

  if (!order) {
    return (
      <ShopLayout>
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold font-serif mb-4">Order Not Found</h2>
          <Link href="/"><Button>Back to Home</Button></Link>
        </div>
      </ShopLayout>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.id === order.status);

  return (
    <ShopLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-4xl">
        {/* Header */}
        <div className="bg-card border rounded-2xl p-8 mb-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-serif mb-2 text-foreground">Thank you for your order!</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Order #{order.id.toString().padStart(6, '0')} has been successfully placed.
          </p>
          
          {/* Progress Tracker */}
          <div className="relative max-w-2xl mx-auto mt-12">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -translate-y-1/2 rounded-full z-0"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full z-0 transition-all duration-500"
              style={{ width: `${(Math.max(0, currentStepIndex) / (statusSteps.length - 1)) * 100}%` }}
            ></div>
            
            <div className="relative z-10 flex justify-between">
              {statusSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-background transition-colors
                        ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-xl font-bold font-serif border-b pb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map(item => (
                <div key={item.id} className="flex gap-4 p-4 rounded-xl border bg-card/50">
                  <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.productImageUrl ? (
                      <img src={item.productImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package /></div>
                    )}
                  </div>
                  <div className="flex-1 py-1">
                    <h4 className="font-semibold">{item.productName}</h4>
                    <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity} x {formatKes(item.priceKes)}</p>
                  </div>
                  <div className="font-bold text-primary">
                    {formatKes(item.priceKes * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center p-6 border rounded-xl bg-card font-bold text-xl">
              <span>Total</span>
              <span className="text-primary">{formatKes(order.totalKes)}</span>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold font-serif border-b pb-4">Delivery Details</h3>
            <div className="bg-muted/20 border rounded-xl p-6 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold tracking-wider mb-1">Customer</p>
                <p className="font-medium text-base">{order.customerName || "Customer"}</p>
                <p>{order.phone}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold tracking-wider mb-1">Address</p>
                <p className="font-medium">{order.address}</p>
                <p>{order.town}, {order.county}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-xs uppercase font-semibold tracking-wider mb-1">Date Placed</p>
                <p>{new Date(order.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <Link href="/products" className="block w-full">
              <Button variant="outline" className="w-full group">
                Continue Shopping <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
