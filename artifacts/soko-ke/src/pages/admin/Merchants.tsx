import { BadgeCheck, Check, Clock3, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminProducts, useMerchants, useUpdateMerchantStatus, useUpdateProductStatus } from "@/hooks/use-marketplace";

export function AdminMerchants() {
  const { data: merchants = [], isLoading } = useMerchants();
  const { data: products = [] } = useAdminProducts();
  const updateMerchant = useUpdateMerchantStatus();
  const updateProduct = useUpdateProductStatus();
  const merchantProducts = products.filter((product: any) => product.ownerType === "merchant");

  return <AdminLayout>
    <div className="mb-8"><h1 className="text-3xl font-bold font-serif">Marketplace operations</h1><p className="text-muted-foreground">Approve merchants, review their catalogues, and keep sponsored inventory trusted.</p></div>
    <div className="grid lg:grid-cols-2 gap-8">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-primary" /> Merchant applications</CardTitle></CardHeader><CardContent className="space-y-4">
        {isLoading ? <p className="text-muted-foreground">Loading applications...</p> : merchants.length === 0 ? <p className="text-muted-foreground">No applications yet.</p> : merchants.map((merchant) => <div key={merchant.id} className="rounded-xl border p-4"><div className="flex justify-between gap-4"><div><p className="font-semibold">{merchant.name}</p><p className="text-sm text-muted-foreground">{merchant.county} · {merchant.email}</p></div><Status status={merchant.status} /></div><p className="text-sm mt-3 text-muted-foreground">{merchant.description}</p>{merchant.status === "pending" && <div className="flex gap-2 mt-4"><Button size="sm" onClick={() => updateMerchant.mutate({ id: merchant.id, status: "approved" }, { onSuccess: () => toast.success(`${merchant.name} approved`) })}><Check className="mr-1 h-4 w-4" /> Approve</Button><Button size="sm" variant="outline" onClick={() => updateMerchant.mutate({ id: merchant.id, status: "rejected" }, { onSuccess: () => toast.success("Application rejected") })}><X className="mr-1 h-4 w-4" /> Reject</Button></div>}</div>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" /> Product approvals</CardTitle></CardHeader><CardContent className="space-y-4">
        {merchantProducts.length === 0 ? <p className="text-muted-foreground">No merchant products to review.</p> : merchantProducts.map((product: any) => <div key={product.id} className="flex items-center gap-3 rounded-xl border p-3"><img src={product.imageUrl} className="h-12 w-12 rounded-lg object-cover" /><div className="min-w-0 flex-1"><p className="font-semibold truncate">{product.name}</p><p className="text-xs text-muted-foreground">{product.sellerName || "Merchant"} · {product.listingStatus}</p></div>{product.listingStatus === "pending" && <div className="flex gap-1"><Button size="sm" onClick={() => updateProduct.mutate({ id: product.id, status: "approved" }, { onSuccess: () => toast.success("Product approved") })}>Approve</Button><Button size="sm" variant="ghost" onClick={() => updateProduct.mutate({ id: product.id, status: "rejected" }, { onSuccess: () => toast.success("Product rejected") })}>Reject</Button></div>} {product.listingStatus !== "pending" && <Status status={product.listingStatus as any} />}</div>)}
      </CardContent></Card>
    </div>
  </AdminLayout>;
}

function Status({ status }: { status: string }) {
  return <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"}>{status === "pending" && <Clock3 className="h-3 w-3 mr-1" />}{status}</Badge>;
}