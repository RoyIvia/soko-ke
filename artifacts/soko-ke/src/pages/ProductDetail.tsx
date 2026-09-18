import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetProduct, 
  useGetProductReviews, 
  useAddToCart,
  getGetCartQueryKey,
  useCreateReview,
  getGetProductReviewsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { formatKes } from "@/lib/utils";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Minus, Plus, ShoppingCart, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function ProductDetail() {
  const params = useParams();
  const id = Number(params.id);
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");

  const { data: product, isLoading } = useGetProduct(id, {
    query: { queryKey: ["/api/products", id], enabled: !!id }
  });

  const { data: reviews, isLoading: loadingReviews } = useGetProductReviews(id, {
    query: { queryKey: ["/api/products", id, "reviews"], enabled: !!id }
  });

  const addToCartMutation = useAddToCart();
  const createReviewMutation = useCreateReview();

  const handleAddToCart = () => {
    if (!product) return;
    
    addToCartMutation.mutate({
      data: {
        sessionId,
        productId: product.id,
        quantity
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
        toast.success("Added to cart");
      }
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCartMutation.mutate({
      data: {
        sessionId,
        productId: product.id,
        quantity
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey({ sessionId }) });
        setLocation("/checkout");
      }
    });
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) return;

    createReviewMutation.mutate({
      id,
      data: {
        rating,
        comment,
        authorName
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductReviewsQueryKey(id) });
        setRating(5);
        setComment("");
        setAuthorName("");
        toast.success("Review submitted!");
      }
    });
  };

  if (isLoading) {
    return (
      <ShopLayout>
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-14 w-48" />
            </div>
          </div>
        </div>
      </ShopLayout>
    );
  }

  if (!product) {
    return (
      <ShopLayout>
        <div className="container mx-auto px-4 md:px-6 py-24 text-center">
          <h2 className="text-2xl font-bold font-serif mb-4">Product Not Found</h2>
          <Link href="/products">
            <Button>Back to Shop</Button>
          </Link>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-24">
          {/* Images */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted border relative">
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {(product.featured || product.isSponsored) && (
                <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground border-none px-3 py-1 text-sm">
                   {product.isSponsored ? "Sponsored" : "Top Pick"}
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Details */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {product.category}
              </span>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center text-accent text-sm font-bold">
                <Star className="w-4 h-4 fill-current mr-1" />
                {product.rating.toFixed(1)} 
                <span className="text-muted-foreground font-normal ml-1">({product.reviewCount} reviews)</span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold font-serif mb-4 leading-tight">
              {product.name}
            </h1>
            
            <p className="text-3xl font-bold text-primary mb-6">
              {formatKes(product.priceKes)}
            </p>
            <div className="flex items-center gap-2 mb-5">
              <Badge variant="outline">{product.ownerType === "merchant" ? `Sold by ${product.sellerName || "verified merchant"}` : "SokoKE owned"}</Badge>
              {product.county && <span className="text-sm text-muted-foreground">From {product.county}</span>}
            </div>
            
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              {product.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <Truck className="w-6 h-6 text-primary" />
                <div>
                  <h4 className="font-semibold text-sm">Delivery</h4>
                  <p className="text-xs text-muted-foreground">Countrywide via local logistics</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <div>
                  <h4 className="font-semibold text-sm">Buyer Protection</h4>
                  <p className="text-xs text-muted-foreground">Secure via M-Pesa</p>
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Status: {product.stock > 0 ? (
                    <span className="text-green-600 dark:text-green-400">In Stock ({product.stock})</span>
                  ) : (
                    <span className="text-destructive">Out of Stock</span>
                  )}
                </div>
                {product.sellerName && (
                  <div className="text-sm font-medium">
                    Seller: <span className="text-primary">{product.sellerName}</span> 
                    {product.county && <span className="text-muted-foreground"> ({product.county})</span>}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center h-14 rounded-md border border-input bg-background">
                  <button 
                    className="w-12 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={product.stock === 0}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-12 h-full flex items-center justify-center font-semibold border-x border-input">
                    {quantity}
                  </div>
                  <button 
                    className="w-12 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={product.stock === 0}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <Button 
                  size="lg" 
                  className="flex-1 h-14 text-base gap-2 w-full sm:w-auto"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || addToCartMutation.isPending}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </Button>
                
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="flex-1 h-14 text-base w-full sm:w-auto"
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                >
                  Buy Now
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <div className="border-t pt-12 md:pt-16">
          <h2 className="text-3xl font-bold font-serif mb-8 text-foreground">Customer Reviews</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Reviews List */}
            <div className="md:col-span-2 space-y-6">
              {loadingReviews ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))
              ) : reviews && reviews.length > 0 ? (
                reviews.map(review => (
                  <div key={review.id} className="p-6 rounded-xl border bg-card">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
                          {review.authorName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{review.authorName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex text-accent">
                        {Array(5).fill(0).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-muted-foreground/30'}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center border rounded-xl bg-muted/20 text-muted-foreground">
                  No reviews yet. Be the first to review this product!
                </div>
              )}
            </div>

            {/* Write Review */}
            <div className="bg-muted/30 p-6 md:p-8 rounded-2xl border h-fit">
              <h3 className="font-bold font-serif text-xl mb-6">Write a Review</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <Label className="mb-2 block">Rating</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-1 rounded-md transition-colors ${rating >= star ? 'text-accent' : 'text-muted-foreground'}`}
                      >
                        <Star className="w-8 h-8 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="authorName">Your Name</Label>
                  <Input 
                    id="authorName" 
                    placeholder="Enter your name" 
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="comment">Your Review (Optional)</Label>
                  <Textarea 
                    id="comment" 
                    placeholder="What did you like or dislike?" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createReviewMutation.isPending || !authorName.trim()}
                >
                  {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
}
