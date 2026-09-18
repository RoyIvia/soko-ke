import { Link } from "wouter";
import { ArrowRight, Star } from "lucide-react";
import { useGetFeaturedProducts, useListCategories } from "@workspace/api-client-react";
import { formatKes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { motion } from "framer-motion";

export function Home() {
  const { data: featuredProducts, isLoading: loadingFeatured } = useGetFeaturedProducts();
  const { data: categories, isLoading: loadingCategories } = useListCategories();

  return (
    <ShopLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-secondary text-secondary-foreground py-20 md:py-32">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')]"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 flex flex-col md:flex-row items-center gap-12">
          <motion.div 
            className="flex-1 space-y-6 text-center md:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-accent/20 text-accent hover:bg-accent/30 border-none mb-4">
              Premium Quality
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold font-serif leading-tight">
              The vibrant spirit of Kenya, <span className="text-primary">delivered.</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary-foreground/80 max-w-xl mx-auto md:mx-0">
              Discover authentic fashion, electronics, and local crafts from the best sellers across the country.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <Link href="/products" className="w-full sm:w-auto">
                <Button size="lg" className="w-full text-lg group">
                  Shop Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>
          <motion.div 
            className="flex-1 w-full max-w-md md:max-w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-card/10 relative bg-muted">
              {/* Fallback image if generative image is not used */}
              <img 
                src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1470&auto=format&fit=crop" 
                alt="Market shopping"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold font-serif mb-2 text-foreground">Shop by Category</h2>
            <p className="text-muted-foreground">Everything you need in one place.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {loadingCategories ? (
            Array(4).fill(0).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))
          ) : (
            categories?.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/products?category=${cat.slug}`}>
                  <div className="group cursor-pointer relative overflow-hidden rounded-xl aspect-square bg-muted flex flex-col justify-end p-6 border shadow-sm hover:shadow-md transition-all">
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-white mb-1">{cat.name}</h3>
                      <p className="text-white/80 text-sm">{cat.productCount} products</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 md:py-24 bg-card border-t container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold font-serif mb-2 text-foreground">Featured Picks</h2>
            <p className="text-muted-foreground">Handpicked selections just for you.</p>
          </div>
          <Link href="/products" className="hidden md:flex text-primary font-medium hover:underline items-center">
            View All <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingFeatured ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i} className="border-0 shadow-none bg-transparent">
                <Skeleton className="aspect-square rounded-xl mb-4" />
                <Skeleton className="h-4 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            ))
          ) : (
            featuredProducts?.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/products/${product.id}`}>
                  <Card className="group cursor-pointer overflow-hidden border-transparent shadow-none bg-transparent hover:bg-muted/30 transition-colors p-3">
                    <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-4 relative">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {(product.featured || product.isSponsored) && (
                        <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-none">{product.isSponsored ? "Sponsored" : "Featured"}</Badge>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{product.category}</span>
                        <div className="flex items-center text-accent text-xs font-bold">
                          <Star className="w-3 h-3 fill-current mr-1" />
                          {product.rating.toFixed(1)}
                        </div>
                      </div>
                       <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
                       <p className="text-xs text-muted-foreground mb-1">{product.ownerType === "merchant" ? `Sold by ${product.sellerName || "verified merchant"}` : "SokoKE owned"}</p>
                      <p className="text-foreground font-semibold">{formatKes(product.priceKes)}</p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </ShopLayout>
  );
}
