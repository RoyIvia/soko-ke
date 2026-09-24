
import { Link, useLocation, Redirect } from "wouter";
import { useUser } from "@clerk/react";

import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  ArrowLeft,
  Store,
  Headset,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMarketplaceMe } from "@/hooks/use-marketplace";

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: Tags,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingCart,
  },
  {
    href: "/admin/merchants",
    label: "Merchants",
    icon: Store,
  },
  {
    href: "/admin/support",
    label: "Support",
    icon: Headset,
  },
];

export function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();

  const { isLoaded, isSignedIn } = useUser();

  const {
    data: me,
    isLoading,
  } = useMarketplaceMe();

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-[100dvh] bg-muted/20 p-8">
        <div className="h-16 max-w-5xl mx-auto rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  if (me?.role !== "platform_admin") {
    return (
      <div className="min-h-[100dvh] bg-muted/20 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl font-bold">
            SokoAdmin is restricted
          </h1>

          <p className="text-muted-foreground mt-3">
            This workspace is reserved for approved SokoKE
            platform operators.
          </p>

          <Link
            href="/"
            className="inline-flex mt-6 text-primary font-medium"
          >
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-col hidden md:flex border-r border-sidebar-border">
        <div className="p-6">
          <div className="font-serif text-2xl font-bold tracking-tight text-sidebar-primary">
            Soko
            <span className="text-sidebar-foreground">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/admin" &&
                location.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />

                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <ArrowLeft className="w-5 h-5" />

            Back to Shop
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="h-16 border-b bg-card flex items-center px-6 md:hidden">
          <Link
            href="/admin"
            className="font-serif text-xl font-bold text-primary"
          >
            SokoAdmin
          </Link>
        </div>

        {/* Mobile navigation */}
        <nav className="flex gap-2 overflow-x-auto border-b bg-card px-4 py-3 md:hidden">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/admin" &&
                location.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />

                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 md:p-8 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
