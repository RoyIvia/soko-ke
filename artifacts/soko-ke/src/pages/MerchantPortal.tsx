import { useEffect, useState } from "react";
import {
  Link,
  Redirect,
  useLocation,
  useSearch,
} from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Megaphone,
  Package,
  Pencil,
  Store,
  XCircle,
} from "lucide-react";
import { useUser, UserButton } from "@clerk/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import {
  confirmPromotion,
  type MarketplaceMe,
  type MerchantProfileInput,
  useApplyMerchant,
  useCreateMerchantProduct,
  useCreatePromotionCheckout,
  useDeleteMerchantProduct,
  useMarketplaceMe,
  useMerchantProducts,
  usePromotionPackages,
  usePromotions,
  useUpdateMerchantProduct,
  useUpdateMerchantProfile,
} from "@/hooks/use-marketplace";

export function MerchantPortal() {
  const { isSignedIn, isLoaded } = useUser();
  const { data: me, isLoading } = useMarketplaceMe();

  if (!isLoaded || isLoading) {
    return (
      <PortalShell>
        <div className="animate-pulse h-40 rounded-2xl bg-muted" />
      </PortalShell>
    );
  }

  if (!isSignedIn) {
    return <Redirect to="/sign-in" />;
  }

  if (me?.role === "platform_admin") {
    return <Redirect to="/admin" />;
  }

  return (
    <PortalShell>
      {me?.merchant ? (
        <MerchantDashboard merchant={me.merchant} />
      ) : (
        <MerchantApplication />
      )}
    </PortalShell>
  );
}

function PortalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-muted/20">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-2xl font-bold text-primary"
          >
            Soko
            <span className="text-foreground">
              KE
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Shop
            </Link>

            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-10 max-w-6xl">
        {children}
      </main>
    </div>
  );
}

function MerchantApplication() {
  const apply = useApplyMerchant();

  const [form, setForm] =
    useState<MerchantProfileInput>({
      name: "",
      email: "",
      phone: "",
      county: "",
      description: "",
    });

  const update = (
    key: keyof MerchantProfileInput,
    value: string
  ) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Badge className="mb-3 bg-accent text-accent-foreground">
          Sell on SokoKE
        </Badge>

        <h1 className="font-serif text-4xl font-bold">
          Bring your best products to Kenya.
        </h1>

        <p className="text-muted-foreground mt-3">
          Apply to become a SokoKE merchant. Our team
          reviews every application before your shop goes
          live.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Merchant application
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Business name"
              value={form.name}
              onChange={(value) =>
                update("name", value)
              }
              placeholder="e.g. Nairobi Threads"
            />

            <Field
              label="Business email"
              value={form.email}
              onChange={(value) =>
                update("email", value)
              }
              placeholder="you@business.co.ke"
              type="email"
            />

            <Field
              label="Phone number"
              value={form.phone}
              onChange={(value) =>
                update("phone", value)
              }
              placeholder="+254 7..."
            />

            <Field
              label="County"
              value={form.county}
              onChange={(value) =>
                update("county", value)
              }
              placeholder="Nairobi"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Tell us about your shop
            </label>

            <Textarea
              className="mt-2"
              value={form.description}
              onChange={(event) =>
                update(
                  "description",
                  event.target.value
                )
              }
              placeholder="What do you sell and what makes your business special?"
            />
          </div>

          <Button
            className="w-full"
            disabled={apply.isPending}
            onClick={() =>
              apply.mutate(form, {
                onSuccess: () =>
                  toast.success(
                    "Application sent for review"
                  ),
                onError: (error) =>
                  toast.error(error.message),
              })
            }
          >
            {apply.isPending
              ? "Sending application..."
              : "Submit application"}

            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function MerchantDashboard({
  merchant,
}: {
  merchant: NonNullable<
    MarketplaceMe["merchant"]
  >;
}) {
  if (merchant.status === "pending") {
    return (
      <PendingMerchant merchant={merchant} />
    );
  }

  if (merchant.status === "rejected") {
    return (
      <RejectedMerchant merchant={merchant} />
    );
  }

  return (
    <ApprovedMerchant merchant={merchant} />
  );
}

function PendingMerchant({
  merchant,
}: {
  merchant: NonNullable<
    MarketplaceMe["merchant"]
  >;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full flex items-center justify-center bg-amber-100 text-amber-700">
          <Clock3 />
        </div>

        <h1 className="font-serif text-4xl font-bold">
          Your application is under review
        </h1>

        <p className="text-muted-foreground mt-3 max-w-md mx-auto">
          We review merchant applications carefully.
          You’ll be able to add products and run
          promotions once approved.
        </p>
      </div>

      <MerchantProfileSummary
        merchant={merchant}
      />

      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
        >
          Back to marketplace
        </Button>
      </div>
    </div>
  );
}

function RejectedMerchant({
  merchant,
}: {
  merchant: NonNullable<
    MarketplaceMe["merchant"]
  >;
}) {
  const updateMerchant =
    useUpdateMerchantProfile();

  const [, setLocation] = useLocation();

  const [editing, setEditing] =
    useState(false);

  const [form, setForm] =
    useState<MerchantProfileInput>({
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      county: merchant.county,
      description: merchant.description,
    });

  const updateField = (
    key: keyof MerchantProfileInput,
    value: string
  ) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  const resubmit = () => {
    updateMerchant.mutate(form, {
      onSuccess: () => {
        toast.success(
          "Application updated and resubmitted for review"
        );
        setEditing(false);
      },
      onError: (error) =>
        toast.error(error.message),
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full flex items-center justify-center bg-destructive/10 text-destructive">
          <XCircle />
        </div>

        <h1 className="font-serif text-4xl font-bold">
          Application needs another look
        </h1>

        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Your merchant application was not approved
          in its current form. Review your business
          information, make any necessary changes, and
          resubmit it for another review.
        </p>
      </div>

      {!editing ? (
        <>
          <MerchantProfileSummary
            merchant={merchant}
          />

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit and resubmit
            </Button>

            <Button
              variant="outline"
              onClick={() => setLocation("/")}
            >
              Back to marketplace
            </Button>
          </div>
        </>
      ) : (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>
              Update merchant application
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <MerchantProfileForm
              form={form}
              onChange={updateField}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={
                  updateMerchant.isPending
                }
                onClick={resubmit}
              >
                {updateMerchant.isPending
                  ? "Resubmitting..."
                  : "Save and resubmit"}
              </Button>

              <Button
                variant="outline"
                disabled={
                  updateMerchant.isPending
                }
                onClick={() => {
                  setForm({
                    name: merchant.name,
                    email: merchant.email,
                    phone: merchant.phone,
                    county: merchant.county,
                    description:
                      merchant.description,
                  });

                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Resubmitting your application will
              return it to pending review.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ApprovedMerchant({
  merchant,
}: {
  merchant: NonNullable<
    MarketplaceMe["merchant"]
  >;
}) {
  const { data: products = [] } =
    useMerchantProducts(true);

  const { data: packages = [] } =
    usePromotionPackages();

  const { data: promotions = [] } =
    usePromotions(true);

  const checkout =
    useCreatePromotionCheckout();

  const createProduct =
    useCreateMerchantProduct();

  const updateProduct =
    useUpdateMerchantProduct();

  const deleteProduct =
    useDeleteMerchantProduct();

  const updateMerchant =
    useUpdateMerchantProfile();

  const [selectedProduct, setSelectedProduct] =
    useState<number | null>(null);

  const [showProductForm, setShowProductForm] =
    useState(false);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [profileForm, setProfileForm] =
    useState<MerchantProfileInput>({
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      county: merchant.county,
      description: merchant.description,
    });

  const [newProduct, setNewProduct] =
    useState({
      name: "",
      description: "",
      priceKes: "",
      category: "",
      imageUrl: "",
      stock: "",
      county: merchant.county,
    });

  const updateProductForm = (
    key: string,
    value: string
  ) =>
    setNewProduct((current) => ({
      ...current,
      [key]: value,
    }));

  const updateProfileField = (
    key: keyof MerchantProfileInput,
    value: string
  ) =>
    setProfileForm((current) => ({
      ...current,
      [key]: value,
    }));

  const saveProfile = () => {
    updateMerchant.mutate(profileForm, {
      onSuccess: () => {
        toast.success(
          "Business profile updated"
        );
        setEditingProfile(false);
      },
      onError: (error) =>
        toast.error(error.message),
    });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <Badge className="mb-3 bg-primary/10 text-primary border-0">
            <BadgeCheck className="w-3 h-3 mr-1" />
            Approved merchant
          </Badge>

          <h1 className="font-serif text-4xl font-bold">
            {merchant.name}
          </h1>

          <p className="text-muted-foreground mt-2">
            Manage your business profile, catalogue,
            and promotions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              setEditingProfile(
                !editingProfile
              )
            }
          >
            <Pencil className="mr-2 h-4 w-4" />

            {editingProfile
              ? "Close profile editor"
              : "Edit business profile"}
          </Button>

          <Button
            asChild
            variant="outline"
          >
            <Link href="/products">
              View marketplace
            </Link>
          </Button>
        </div>
      </div>

      {editingProfile && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              Business profile
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <MerchantProfileForm
              form={profileForm}
              onChange={updateProfileField}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  updateMerchant.isPending
                }
                onClick={saveProfile}
              >
                {updateMerchant.isPending
                  ? "Saving..."
                  : "Save profile"}
              </Button>

              <Button
                variant="outline"
                disabled={
                  updateMerchant.isPending
                }
                onClick={() => {
                  setProfileForm({
                    name: merchant.name,
                    email: merchant.email,
                    phone: merchant.phone,
                    county: merchant.county,
                    description:
                      merchant.description,
                  });

                  setEditingProfile(false);
                }}
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Updating business information does not
              change your approved merchant status.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Stat
          icon={<Package />}
          label="Your products"
          value={products.length}
        />

        <Stat
          icon={<Megaphone />}
          label="Active promotions"
          value={
            promotions.filter(
              (promotion: any) =>
                promotion.status === "active"
            ).length
          }
        />

        <Stat
          icon={<Store />}
          label="Based in"
          value={merchant.county}
        />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your catalogue</span>

            <Button
              size="sm"
              variant={
                showProductForm
                  ? "outline"
                  : "default"
              }
              onClick={() =>
                setShowProductForm(
                  !showProductForm
                )
              }
            >
              {showProductForm
                ? "Close"
                : "Add product"}
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent>
          {showProductForm && (
            <div className="rounded-xl bg-muted/40 border p-4 mb-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Product name"
                  value={newProduct.name}
                  onChange={(value) =>
                    updateProductForm(
                      "name",
                      value
                    )
                  }
                  placeholder="Handmade basket"
                />

                <Field
                  label="Image URL"
                  value={newProduct.imageUrl}
                  onChange={(value) =>
                    updateProductForm(
                      "imageUrl",
                      value
                    )
                  }
                  placeholder="https://..."
                />

                <Field
                  label="Price (KES)"
                  value={newProduct.priceKes}
                  onChange={(value) =>
                    updateProductForm(
                      "priceKes",
                      value
                    )
                  }
                  placeholder="2500"
                />

                <Field
                  label="Stock"
                  value={newProduct.stock}
                  onChange={(value) =>
                    updateProductForm(
                      "stock",
                      value
                    )
                  }
                  placeholder="10"
                />

                <Field
                  label="Category"
                  value={newProduct.category}
                  onChange={(value) =>
                    updateProductForm(
                      "category",
                      value
                    )
                  }
                  placeholder="Crafts"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Description
                </label>

                <Textarea
                  className="mt-2"
                  value={
                    newProduct.description
                  }
                  onChange={(event) =>
                    updateProductForm(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Describe the product..."
                />
              </div>

              <Button
                disabled={
                  createProduct.isPending
                }
                onClick={() =>
                  createProduct.mutate(
                    {
                      ...newProduct,
                      priceKes: Number(
                        newProduct.priceKes
                      ),
                      stock: Number(
                        newProduct.stock
                      ),
                    },
                    {
                      onSuccess: () => {
                        toast.success(
                          "Product submitted for review"
                        );

                        setShowProductForm(
                          false
                        );

                        setNewProduct({
                          name: "",
                          description: "",
                          priceKes: "",
                          category: "",
                          imageUrl: "",
                          stock: "",
                          county:
                            merchant.county,
                        });
                      },
                      onError: (error) =>
                        toast.error(
                          error.message
                        ),
                    }
                  )
                }
              >
                {createProduct.isPending
                  ? "Submitting..."
                  : "Submit for review"}
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="text-left rounded-xl border p-4"
              >
                <div className="flex gap-3 items-center">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {product.name}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {formatKes(
                        product.priceKes
                      )}{" "}
                      · {product.stock} in stock
                    </p>
                  </div>

                  <Badge
                    variant={
                      product.listingStatus ===
                      "approved"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {product.listingStatus}
                  </Badge>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const name =
                        window.prompt(
                          "Product name",
                          product.name
                        );

                      if (name) {
                        updateProduct.mutate(
                          {
                            id: product.id,
                            data: { name },
                          },
                          {
                            onSuccess: () =>
                              toast.success(
                                "Product updated"
                              ),
                            onError: (
                              error
                            ) =>
                              toast.error(
                                error.message
                              ),
                          }
                        );
                      }
                    }}
                  >
                    Edit name
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this product?"
                        )
                      ) {
                        deleteProduct.mutate(
                          product.id,
                          {
                            onSuccess: () =>
                              toast.success(
                                "Product removed"
                              ),
                            onError: (
                              error
                            ) =>
                              toast.error(
                                error.message
                              ),
                          }
                        );
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <p className="text-muted-foreground py-5">
              Add your first product to start
              building your catalogue.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Promote a product
            </span>

            <span className="text-sm font-normal text-muted-foreground">
              Secure checkout by Stripe
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {products
              .filter(
                (product) =>
                  product.listingStatus ===
                  "approved"
              )
              .map((product) => (
                <button
                  key={product.id}
                  onClick={() =>
                    setSelectedProduct(
                      product.id
                    )
                  }
                  className={`text-left rounded-xl border p-4 transition-colors ${
                    selectedProduct ===
                    product.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40"
                  }`}
                >
                  <div className="flex gap-3 items-center">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-14 w-14 rounded-lg object-cover"
                    />

                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {product.name}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {formatKes(
                          product.priceKes
                        )}{" "}
                        · {product.stock} in
                        stock
                      </p>
                    </div>
                  </div>
                </button>
              ))}
          </div>

          {products.filter(
            (product) =>
              product.listingStatus ===
              "approved"
          ).length === 0 && (
            <p className="text-muted-foreground py-5">
              Promotions become available
              after a product is approved.
            </p>
          )}

          {selectedProduct && (
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="border rounded-xl p-4 flex flex-col"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">
                      {pkg.name}
                    </h3>

                    <Badge variant="secondary">
                      {pkg.durationDays} days
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-2 flex-1">
                    {pkg.description}
                  </p>

                  <p className="text-xl font-bold mt-4">
                    {formatKes(pkg.priceKes)}
                  </p>

                  <Button
                    className="mt-4"
                    disabled={
                      checkout.isPending
                    }
                    onClick={() =>
                      checkout.mutate(
                        {
                          productId:
                            selectedProduct,
                          packageId: pkg.id,
                        },
                        {
                          onSuccess: ({
                            checkoutUrl,
                          }) => {
                            window.location.href =
                              checkoutUrl;
                          },
                          onError: (
                            error
                          ) =>
                            toast.error(
                              error.message
                            ),
                        }
                      )
                    }
                  >
                    Promote now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MerchantProfileSummary({
  merchant,
}: {
  merchant: NonNullable<
    MarketplaceMe["merchant"]
  >;
}) {
  return (
    <Card className="my-8 text-left">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>
            Application details
          </CardTitle>

          <MerchantStatus
            status={merchant.status}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ProfileItem
          label="Business name"
          value={merchant.name}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <ProfileItem
            label="Business email"
            value={merchant.email}
          />

          <ProfileItem
            label="Phone number"
            value={merchant.phone}
          />

          <ProfileItem
            label="County"
            value={merchant.county}
          />
        </div>

        <ProfileItem
          label="Description"
          value={merchant.description}
        />
      </CardContent>
    </Card>
  );
}

function MerchantProfileForm({
  form,
  onChange,
}: {
  form: MerchantProfileInput;
  onChange: (
    key: keyof MerchantProfileInput,
    value: string
  ) => void;
}) {
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Business name"
          value={form.name}
          onChange={(value) =>
            onChange("name", value)
          }
          placeholder="Business name"
        />

        <Field
          label="Business email"
          value={form.email}
          onChange={(value) =>
            onChange("email", value)
          }
          placeholder="you@business.co.ke"
          type="email"
        />

        <Field
          label="Phone number"
          value={form.phone}
          onChange={(value) =>
            onChange("phone", value)
          }
          placeholder="+254 7..."
        />

        <Field
          label="County"
          value={form.county}
          onChange={(value) =>
            onChange("county", value)
          }
          placeholder="Nairobi"
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Business description
        </label>

        <Textarea
          className="mt-2"
          value={form.description}
          onChange={(event) =>
            onChange(
              "description",
              event.target.value
            )
          }
          placeholder="Tell us about your business"
        />
      </div>
    </>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-sm">
        {value}
      </p>
    </div>
  );
}

function MerchantStatus({
  status,
}: {
  status: string;
}) {
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

export function PromotionSuccess() {
  const params =
    new URLSearchParams(useSearch());

  const sessionId =
    params.get("session_id");

  const [state, setState] =
    useState<
      "loading" | "success" | "error"
    >("loading");

  useEffect(() => {
    if (sessionId) {
      confirmPromotion(sessionId)
        .then(() =>
          setState("success")
        )
        .catch(() =>
          setState("error")
        );
    } else {
      setState("error");
    }
  }, [sessionId]);

  return (
    <PortalShell>
      <div className="max-w-xl mx-auto text-center py-16">
        {state === "loading" ? (
          <Clock3 className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
        ) : state === "success" ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />

            <h1 className="font-serif text-4xl font-bold mt-5">
              Promotion is live
            </h1>

            <p className="text-muted-foreground mt-3">
              Your product is now getting
              premium placement across SokoKE.
            </p>

            <Button
              asChild
              className="mt-7"
            >
              <Link href="/merchant">
                Back to dashboard
              </Link>
            </Button>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-14 w-14 text-destructive" />

            <h1 className="font-serif text-4xl font-bold mt-5">
              Payment not confirmed
            </h1>

            <p className="text-muted-foreground mt-3">
              We couldn’t confirm this
              checkout yet. If you were
              charged, contact support
              before trying again.
            </p>

            <Button
              asChild
              variant="outline"
              className="mt-7"
            >
              <Link href="/merchant">
                Back to dashboard
              </Link>
            </Button>
          </>
        )}
      </div>
    </PortalShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>

      <Input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2"
      />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </span>

        <div>
          <p className="text-sm text-muted-foreground">
            {label}
          </p>

          <p className="text-xl font-bold">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
