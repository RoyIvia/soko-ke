import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Search, Filter, Star } from "lucide-react";
import {
  useListProducts,
  useListCategories,
} from "@workspace/api-client-react";
import { formatKes } from "@/lib/utils";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "popular";

export function Products() {
  const searchString = useSearch();
  const [, navigate] = useLocation();

  const searchParams = new URLSearchParams(searchString);

  const urlSearch = searchParams.get("search") || "";
  const urlCategory = searchParams.get("category") || "";

  const [searchTerm, setSearchTerm] =
    useState(urlSearch);

  const [debouncedSearch, setDebouncedSearch] =
    useState(urlSearch);

  const [category, setCategory] =
    useState(urlCategory);

  const [sort, setSort] =
    useState<ProductSort>("popular");

  /*
   * Keep the page state synchronized when navigation
   * changes the URL, for example from the navbar:
   *
   * /products?search=laptop
   */
  useEffect(() => {
    const params = new URLSearchParams(searchString);

    const nextSearch =
      params.get("search") || "";

    const nextCategory =
      params.get("category") || "";

    setSearchTerm(nextSearch);
    setDebouncedSearch(nextSearch);
    setCategory(nextCategory);
  }, [searchString]);

  const updateUrl = (
    nextSearch: string,
    nextCategory: string,
  ) => {
    const params = new URLSearchParams();

    const trimmedSearch = nextSearch.trim();

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    if (nextCategory) {
      params.set("category", nextCategory);
    }

    const query = params.toString();

    navigate(
      query
        ? `/products?${query}`
        : "/products",
    );
  };

  const handleSearch = (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const trimmedSearch =
      searchTerm.trim();

    setSearchTerm(trimmedSearch);
    setDebouncedSearch(trimmedSearch);

    updateUrl(trimmedSearch, category);
  };

  const handleCategoryChange = (
    nextCategory: string,
  ) => {
    setCategory(nextCategory);

    updateUrl(
      debouncedSearch,
      nextCategory,
    );
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setCategory("");

    navigate("/products");
  };

  const { data, isLoading } =
    useListProducts({
      search:
        debouncedSearch || undefined,
      category:
        category || undefined,
      sort,
      limit: 20,
    });

  const { data: categories } =
    useListCategories();

  return (
    <ShopLayout>
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <h1 className="text-3xl md:text-4xl font-bold font-serif text-foreground mb-4">
            All Products
          </h1>

          <p className="text-muted-foreground max-w-2xl">
            Browse our wide selection of items from top sellers.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8 flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 space-y-8 flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </h3>

            <form
              onSubmit={handleSearch}
              className="mb-6 relative"
            >
              <Input
                type="search"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value,
                  )
                }
                className="pl-9"
              />

              <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
            </form>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-3">
                  Categories
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="cat-all"
                      name="category"
                      checked={
                        category === ""
                      }
                      onChange={() =>
                        handleCategoryChange(
                          "",
                        )
                      }
                      className="mr-2 text-primary focus:ring-primary"
                    />

                    <label
                      htmlFor="cat-all"
                      className="text-sm cursor-pointer"
                    >
                      All Categories
                    </label>
                  </div>

                  {categories?.map(
                    (cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center"
                      >
                        <input
                          type="radio"
                          id={`cat-${cat.slug}`}
                          name="category"
                          checked={
                            category ===
                            cat.slug
                          }
                          onChange={() =>
                            handleCategoryChange(
                              cat.slug,
                            )
                          }
                          className="mr-2 text-primary focus:ring-primary"
                        />

                        <label
                          htmlFor={`cat-${cat.slug}`}
                          className="text-sm cursor-pointer"
                        >
                          {cat.name}
                        </label>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">
                  Sort By
                </h4>

                <Select
                  value={sort}
                  onValueChange={(
                    value: ProductSort,
                  ) =>
                    setSort(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="popular">
                      Popularity
                    </SelectItem>

                    <SelectItem value="newest">
                      Newest Arrivals
                    </SelectItem>

                    <SelectItem value="price_asc">
                      Price: Low to High
                    </SelectItem>

                    <SelectItem value="price_desc">
                      Price: High to Low
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              {data?.products.length || 0}{" "}
              of {data?.total || 0} results
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading ? (
              Array(8)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="space-y-4"
                  >
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))
            ) : data?.products.length ===
              0 ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-lg text-muted-foreground mb-4">
                  No products found matching your criteria.
                </p>

                <Button
                  variant="outline"
                  onClick={
                    handleClearFilters
                  }
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              data?.products.map(
                (product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                  >
                    <Card className="group cursor-pointer overflow-hidden border-transparent shadow-none bg-transparent hover:bg-muted/30 transition-colors p-3 h-full flex flex-col">
                      <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-4 relative flex-shrink-0">
                        <img
                          src={
                            product.imageUrl
                          }
                          alt={
                            product.name
                          }
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {(product.featured ||
                          product.isSponsored) && (
                          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-none">
                            {product.isSponsored
                              ? "Sponsored"
                              : "Featured"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {
                              product.category
                            }
                          </span>

                          <div className="flex items-center text-accent text-xs font-bold">
                            <Star className="w-3 h-3 fill-current mr-1" />
                            {product.rating.toFixed(
                              1,
                            )}
                          </div>
                        </div>

                        <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-1">
                          {product.name}
                        </h3>

                        <p className="text-xs text-muted-foreground mb-2">
                          {product.ownerType ===
                          "merchant"
                            ? `Sold by ${
                                product.sellerName ||
                                "verified merchant"
                              }`
                            : "SokoKE owned"}
                        </p>

                        <div className="flex items-center justify-between mt-auto">
                          <p className="text-foreground font-semibold">
                            {formatKes(
                              product.priceKes,
                            )}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ),
              )
            )}
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
