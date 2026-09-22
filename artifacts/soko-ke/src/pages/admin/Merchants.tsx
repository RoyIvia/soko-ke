import { useState } from "react";
import {
  BadgeCheck,
  Check,
  Clock3,
  PackageCheck,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type Merchant,
  type MerchantProfileInput,
  useAdminProducts,
  useAdminUpdateMerchant,
  useMerchants,
  useUpdateMerchantStatus,
  useUpdateProductStatus,
} from "@/hooks/use-marketplace";

export function AdminMerchants() {
  const { data: merchants = [], isLoading } = useMerchants();
  const { data: products = [] } = useAdminProducts();
  const updateMerchantStatus = useUpdateMerchantStatus();
  const updateProduct = useUpdateProductStatus();

  const merchantProducts = products.filter(
    (product: any) => product.ownerType === "merchant"
  );

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif">
          Marketplace operations
        </h1>

        <p className="text-muted-foreground">
          Manage merchant profiles, approval status, catalogues, and sponsored
          inventory.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Merchant applications
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">
                Loading applications...
              </p>
            ) : merchants.length === 0 ? (
              <p className="text-muted-foreground">
                No applications yet.
              </p>
            ) : (
              merchants.map((merchant) => (
                <MerchantAdminCard
                  key={merchant.id}
                  merchant={merchant}
                  onStatusChange={(status) =>
                    updateMerchantStatus.mutate(
                      {
                        id: merchant.id,
                        status,
                      },
                      {
                        onSuccess: () => {
                          if (status === "approved") {
                            toast.success(`${merchant.name} approved`);
                          } else if (status === "rejected") {
                            toast.success(`${merchant.name} rejected`);
                          } else {
                            toast.success(
                              `${merchant.name} returned to pending review`
                            );
                          }
                        },
                        onError: (error) =>
                          toast.error(error.message),
                      }
                    )
                  }
                  statusPending={updateMerchantStatus.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-primary" />
              Product approvals
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {merchantProducts.length === 0 ? (
              <p className="text-muted-foreground">
                No merchant products to review.
              </p>
            ) : (
              merchantProducts.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {product.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {product.sellerName || "Merchant"} ·{" "}
                      {product.listingStatus}
                    </p>
                  </div>

                  {product.listingStatus === "pending" ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateProduct.mutate(
                            {
                              id: product.id,
                              status: "approved",
                            },
                            {
                              onSuccess: () =>
                                toast.success("Product approved"),
                              onError: (error) =>
                                toast.error(error.message),
                            }
                          )
                        }
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateProduct.mutate(
                            {
                              id: product.id,
                              status: "rejected",
                            },
                            {
                              onSuccess: () =>
                                toast.success("Product rejected"),
                              onError: (error) =>
                                toast.error(error.message),
                            }
                          )
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <Status status={product.listingStatus} />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function MerchantAdminCard({
  merchant,
  onStatusChange,
  statusPending,
}: {
  merchant: Merchant;
  onStatusChange: (status: Merchant["status"]) => void;
  statusPending: boolean;
}) {
  const updateMerchant = useAdminUpdateMerchant();

  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState<MerchantProfileInput>({
    name: merchant.name,
    email: merchant.email,
    phone: merchant.phone,
    county: merchant.county,
    description: merchant.description,
  });

  const updateField = (
    key: keyof MerchantProfileInput,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const cancelEditing = () => {
    setForm({
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      county: merchant.county,
      description: merchant.description,
    });

    setEditing(false);
  };

  const saveMerchant = () => {
    updateMerchant.mutate(
      {
        id: merchant.id,
        data: form,
      },
      {
        onSuccess: () => {
          toast.success("Merchant profile updated");
          setEditing(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className="rounded-xl border p-4">
      <div className="flex justify-between gap-4">
        <div>
          <p className="font-semibold">{merchant.name}</p>

          <p className="text-sm text-muted-foreground">
            {merchant.county} · {merchant.email}
          </p>
        </div>

        <Status status={merchant.status} />
      </div>

      {!editing ? (
        <>
          <p className="text-sm mt-3 text-muted-foreground">
            {merchant.description}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>

            {merchant.status !== "approved" && (
              <Button
                size="sm"
                disabled={statusPending}
                onClick={() => onStatusChange("approved")}
              >
                <Check className="mr-1 h-4 w-4" />
                Approve
              </Button>
            )}

            {merchant.status !== "rejected" && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusPending}
                onClick={() => onStatusChange("rejected")}
              >
                <X className="mr-1 h-4 w-4" />
                Reject
              </Button>
            )}

            {merchant.status !== "pending" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={statusPending}
                onClick={() => onStatusChange("pending")}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Return to pending
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <MerchantField
              label="Business name"
              value={form.name}
              onChange={(value) =>
                updateField("name", value)
              }
            />

            <MerchantField
              label="Business email"
              value={form.email}
              type="email"
              onChange={(value) =>
                updateField("email", value)
              }
            />

            <MerchantField
              label="Phone number"
              value={form.phone}
              onChange={(value) =>
                updateField("phone", value)
              }
            />

            <MerchantField
              label="County"
              value={form.county}
              onChange={(value) =>
                updateField("county", value)
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Description
            </label>

            <Textarea
              className="mt-2"
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={updateMerchant.isPending}
              onClick={saveMerchant}
            >
              {updateMerchant.isPending
                ? "Saving..."
                : "Save changes"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={updateMerchant.isPending}
              onClick={cancelEditing}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MerchantField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>

      <Input
        className="mt-2"
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function Status({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "approved"
          ? "default"
          : status === "rejected"
            ? "destructive"
            : "secondary"
      }
    >
      {status === "pending" && (
        <Clock3 className="h-3 w-3 mr-1" />
      )}

      {status}
    </Badge>
  );
}
