import { Route, Switch, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ClerkProvider, Show } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import NotFound from "@/pages/not-found";

import { Home } from "@/pages/Home";
import { Products } from "@/pages/Products";
import { ProductDetail } from "@/pages/ProductDetail";
import { Cart } from "@/pages/Cart";
import { Checkout } from "@/pages/Checkout";
import { OrderDetail } from "@/pages/OrderDetail";
import { Dashboard } from "@/pages/admin/Dashboard";
import { AdminProducts } from "@/pages/admin/Products";
import { AdminOrders } from "@/pages/admin/Orders";
import { AdminMerchants } from "@/pages/admin/Merchants";
import {
  MerchantPortal,
  PromotionSuccess,
} from "@/pages/MerchantPortal";
import {
  SignInPage,
  SignUpPage,
  localization,
} from "@/pages/Auth";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <MerchantPortal />
      </Show>

      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={HomeRoute} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders/:id" component={OrderDetail} />
      <Route path="/merchant" component={MerchantPortal} />
      <Route path="/promote/success" component={PromotionSuccess} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />

      {/* Admin Routes */}
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/merchants" component={AdminMerchants} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={{ theme: shadcn }}
      localization={localization}
    >
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={basePath}>
          <Router />
        </WouterRouter>

        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
