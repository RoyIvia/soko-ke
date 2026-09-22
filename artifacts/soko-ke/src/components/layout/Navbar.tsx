import { Link } from "wouter";
import { ShoppingBag, Search } from "lucide-react";
import { Show, UserButton } from "@clerk/react";
import { useSession } from "@/hooks/use-session";
import { useMarketplaceMe } from "@/hooks/use-marketplace";
import { useGetCart } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const sessionId = useSession();

  const { data: me } = useMarketplaceMe();

  const { data: cart } = useGetCart(
    { sessionId },
    {
      query: {
        queryKey: ["/api/cart", sessionId],
        enabled: !!sessionId,
      },
    }
  );

  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const isAdmin = me?.signedIn && me.role === "platform_admin";
  const isMerchant = me?.signedIn && me.role === "merchant";
  const isCustomer = me?.signedIn && me.role === "customer";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">
              Soko<span className="text-foreground">KE</span>
            </span>
          </Link>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-4 items-center relative">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />

          <input
            type="search"
            placeholder="Search products..."
            className="w-full h-10 pl-9 pr-4 rounded-full border border-input bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-sm"
          />
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/products"
            className="text-sm font-medium hover:text-primary transition-colors hidden md:block"
          >
            Shop
          </Link>

          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="text-sm font-medium hover:text-primary transition-colors hidden md:block"
            >
              Sign in
            </Link>
          </Show>

          <Show when="signed-in">
            {isCustomer && (
              <Link
                href="/merchant"
                className="text-sm font-medium hover:text-primary transition-colors hidden md:block"
              >
                Sell on SokoKE
              </Link>
            )}

            {isMerchant && (
              <Link
                href="/merchant"
                className="text-sm font-medium hover:text-primary transition-colors hidden md:block"
              >
                Merchant Portal
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm font-medium hover:text-primary transition-colors hidden md:block"
              >
                Admin
              </Link>
            )}

            <UserButton />
          </Show>

          <Link
            href="/cart"
            className="relative p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-foreground" />

            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full bg-accent text-accent-foreground border-none">
                {itemCount}
              </Badge>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
