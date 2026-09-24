
import { Link } from "wouter";
import { useListCategories } from "@workspace/api-client-react";

export function Footer() {
  const { data: categories = [] } = useListCategories();

  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link
              href="/"
              className="font-serif text-2xl font-bold tracking-tight text-primary"
            >
              Soko<span className="text-foreground">KE</span>
            </Link>

            <p className="text-sm text-muted-foreground max-w-xs">
              Your vibrant digital marketplace bringing the warmth
              of Kenyan shopping directly to you.
            </p>
          </div>

          <div>
            <h4 className="font-serif font-semibold mb-4">
              Shop
            </h4>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/products"
                  className="hover:text-primary"
                >
                  All Products
                </Link>
              </li>

              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${encodeURIComponent(
                      category.slug,
                    )}`}
                    className="hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-semibold mb-4">
              Support
            </h4>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/contact"
                  className="hover:text-primary"
                >
                  Contact Us
                </Link>
              </li>

              <li>
                <Link
                  href="/support/new"
                  className="hover:text-primary"
                >
                  Raise a Support Ticket
                </Link>
              </li>

              <li>
                <Link
                  href="/support/tickets"
                  className="hover:text-primary"
                >
                  My Tickets
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif font-semibold mb-4">
              Admin
            </h4>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/admin"
                  className="hover:text-primary"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Soko Kenya.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
