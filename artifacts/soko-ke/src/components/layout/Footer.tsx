import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">
              Soko<span className="text-foreground">KE</span>
            </span>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your vibrant digital marketplace bringing the warmth of Kenyan shopping directly to you.
            </p>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-primary">All Products</Link></li>
              <li><Link href="/products?category=electronics" className="hover:text-primary">Electronics</Link></li>
              <li><Link href="/products?category=fashion" className="hover:text-primary">Fashion</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-primary">Shipping Info</Link></li>
              <li><Link href="#" className="hover:text-primary">Returns</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-serif font-semibold mb-4">Admin</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/admin" className="hover:text-primary">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Soko Kenya. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="font-medium">Secure Payments with M-Pesa</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
