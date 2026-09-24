import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListProducts,
  useListCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatKes } from "@/lib/utils";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Star,
} from "lucide-react";
import { toast } from "sonner";

const productSchema = z.object({
  name: z
    .string()
    .min(2, "Name is required"),
  description: z
    .string()
    .min(10, "Description needed"),
  priceKes: z.coerce.number().min(0),
  category: z
    .string()
    .min(2, "Category required"),
  imageUrl: z
    .string()
    .url("Must be a valid URL"),
  stock: z.coerce.number().min(0),
  sellerName: z.string().optional(),
  county: z.string().optional(),
  featured: z.boolean().default(false),
});

type ProductFormValues =
  z.infer<typeof productSchema>;

export function AdminProducts() {
  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");

  const [
    isDialogOpen,
    setIsDialogOpen,
  ] = useState(false);

  const [
    editingProduct,
    setEditingProduct,
  ] = useState<Product | null>(null);

  const [
    imageUploading,
    setImageUploading,
  ] = useState(false);

  const queryClient =
    useQueryClient();

  const {
    data,
    isLoading,
  } = useListProducts({
    search:
      debouncedSearch || undefined,
    limit: 50,
  });

  const {
    data: categories = [],
  } = useListCategories();

  const createMutation =
    useCreateProduct();

  const updateMutation =
    useUpdateProduct();

  const deleteMutation =
    useDeleteProduct();

  const form =
    useForm<ProductFormValues>({
      resolver:
        zodResolver(productSchema),

      defaultValues: {
        name: "",
        description: "",
        priceKes: 0,
        category: "",
        imageUrl: "",
        stock: 0,
        sellerName: "",
        county: "",
        featured: false,
      },
    });

  const handleSearch = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setDebouncedSearch(
      searchTerm
    );
  };

  const openNewDialog = () => {
    if (imageUploading) {
      return;
    }

    setEditingProduct(null);

    form.reset({
      name: "",
      description: "",
      priceKes: 0,
      category: "",
      imageUrl: "",
      stock: 0,
      sellerName: "",
      county: "",
      featured: false,
    });

    setIsDialogOpen(true);
  };

  const openEditDialog = (
    prod: Product
  ) => {
    if (imageUploading) {
      return;
    }

    setEditingProduct(prod);

    form.reset({
      name: prod.name,
      description:
        prod.description,
      priceKes:
        prod.priceKes,
      category:
        prod.category,
      imageUrl:
        prod.imageUrl,
      stock:
        prod.stock,
      sellerName:
        prod.sellerName || "",
      county:
        prod.county || "",
      featured:
        prod.featured,
    });

    setIsDialogOpen(true);
  };

  const onSubmit = (
    values: ProductFormValues
  ) => {
    if (imageUploading) {
      toast.error(
        "Wait for the image upload to finish"
      );

      return;
    }

    if (editingProduct) {
      updateMutation.mutate(
        {
          id: editingProduct.id,
          data: values,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey:
                getListProductsQueryKey(),
            });

            toast.success(
              "Product updated"
            );

            setIsDialogOpen(false);
          },

          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not update product"
            );
          },
        }
      );

      return;
    }

    createMutation.mutate(
      {
        data: values,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey:
              getListProductsQueryKey(),
          });

          toast.success(
            "Product created"
          );

          setIsDialogOpen(false);
        },

        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not create product"
          );
        },
      }
    );
  };

  const handleDelete = (
    id: number
  ) => {
    if (
      confirm(
        "Are you sure you want to delete this product?"
      )
    ) {
      deleteMutation.mutate(
        {
          id,
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey:
                getListProductsQueryKey(),
            });

            toast.success(
              "Product deleted"
            );
          },

          onError: (error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not delete product"
            );
          },
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif">
              Products
            </h1>

            <p className="text-muted-foreground mt-1">
              Manage marketplace
              products and inventory.
            </p>
          </div>

          <Button
            onClick={
              openNewDialog
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <form
            onSubmit={
              handleSearch
            }
            className="flex gap-2 w-full max-w-md"
          >
            <Input
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search products..."
            />

            <Button
              type="submit"
              variant="outline"
              size="icon"
            >
              <Search className="w-4 h-4" />
            </Button>
          </form>
        </div>

        <div className="rounded-md border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  Image
                </TableHead>

                <TableHead>
                  Product
                </TableHead>

                <TableHead>
                  Price
                </TableHead>

                <TableHead>
                  Stock
                </TableHead>

                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({
                  length: 5,
                }).map(
                  (_, index) => (
                    <TableRow
                      key={index}
                    >
                      <TableCell>
                        <Skeleton className="h-12 w-12" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-40" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-8 w-20 ml-auto" />
                      </TableCell>
                    </TableRow>
                  )
                )
              ) : !data?.products
                  .length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-10 text-muted-foreground"
                  >
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                data.products.map(
                  (prod) => (
                    <TableRow
                      key={
                        prod.id
                      }
                    >
                      <TableCell>
                        <div className="w-12 h-12 rounded bg-muted overflow-hidden border">
                          <img
                            src={
                              prod.imageUrl
                            }
                            alt={
                              prod.name
                            }
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          {
                            prod.name
                          }

                          {prod.featured && (
                            <Star className="w-3 h-3 text-accent fill-current" />
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                          <span className="uppercase tracking-wider font-semibold">
                            {
                              prod.category
                            }
                          </span>

                          <span>
                            •
                          </span>

                          <span>
                            {prod.sellerName ||
                              "Soko"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="font-medium text-primary">
                        {formatKes(
                          prod.priceKes
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            prod.stock >
                            0
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {prod.stock >
                          0
                            ? `${prod.stock} in stock`
                            : "Out of stock"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={
                              imageUploading
                            }
                            onClick={() =>
                              openEditDialog(
                                prod
                              )
                            }
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={
                              deleteMutation.isPending ||
                              imageUploading
                            }
                            onClick={() =>
                              handleDelete(
                                prod.id
                              )
                            }
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(
          open
        ) => {
          if (
            !imageUploading
          ) {
            setIsDialogOpen(
              open
            );
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct
                ? "Edit Product"
                : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                onSubmit
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={
                    form.control
                  }
                  name="name"
                  render={({
                    field,
                  }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        Product Name
                      </FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={
                    form.control
                  }
                  name="priceKes"
                  render={({
                    field,
                  }) => (
                    <FormItem>
                      <FormLabel>
                        Price
                        (KES)
                      </FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={
                    form.control
                  }
                  name="stock"
                  render={({
                    field,
                  }) => (
                    <FormItem>
                      <FormLabel>
                        Stock
                        Quantity
                      </FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={
                    form.control
                  }
                  name="category"
                  render={({
                    field,
                  }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>
                        Category
                      </FormLabel>

                      <FormControl>
                        <select
                          value={
                            field.value
                          }
                          onChange={
                            field.onChange
                          }
                          onBlur={
                            field.onBlur
                          }
                          name={
                            field.name
                          }
                          ref={
                            field.ref
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">
                            Select
                            category
                          </option>

                          {categories.map(
                            (
                              category
                            ) => (
                              <option
                                key={
                                  category.id
                                }
                                value={
                                  category.slug
                                }
                              >
                                {
                                  category.name
                                }
                              </option>
                            )
                          )}
                        </select>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={
                    form.control
                  }
                  name="sellerName"
                  render={({
                    field,
                  }) => (
                    <FormItem>
                      <FormLabel>
                        Seller Name
                        (Optional)
                      </FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={
                    form.control
                  }
                  name="county"
                  render={({
                    field,
                  }) => (
                    <FormItem>
                      <FormLabel>
                        County
                        (Optional)
                      </FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={
                    form.control
                  }
                  name="featured"
                  render={({
                    field,
                  }) => (
                    <FormItem className="col-span-2 flex flex-row items-center gap-2 space-y-0 mt-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={
                            field.value
                          }
                          onChange={
                            field.onChange
                          }
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                      </FormControl>

                      <FormLabel className="font-normal cursor-pointer">
                        Feature
                        this
                        product
                        on
                        homepage
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={
                  form.control
                }
                name="imageUrl"
                render={({
                  field,
                }) => (
                  <FormItem>
                    <FormLabel>
                      Product Image
                    </FormLabel>

                    <ImageUpload
                      purpose="product"
                      imageUrl={
                        field.value
                      }
                      onUploaded={(
                        url
                      ) => {
                        field.onChange(
                          url
                        );

                        form.setValue(
                          "imageUrl",
                          url,
                          {
                            shouldDirty:
                              true,
                            shouldValidate:
                              true,
                          }
                        );
                      }}
                      onUploadingChange={
                        setImageUploading
                      }
                    />

                    <div className="pt-2">
                      <FormLabel className="text-xs text-muted-foreground">
                        Image URL
                      </FormLabel>

                      <FormControl>
                        <Input
                          className="mt-2"
                          placeholder="https://..."
                          {...field}
                        />
                      </FormControl>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Upload an
                      image above,
                      or provide
                      an image URL
                      manually.
                    </p>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={
                  form.control
                }
                name="description"
                render={({
                  field,
                }) => (
                  <FormItem>
                    <FormLabel>
                      Description
                    </FormLabel>

                    <FormControl>
                      <Textarea
                        rows={4}
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    imageUploading ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  onClick={() =>
                    setIsDialogOpen(
                      false
                    )
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    imageUploading
                  }
                >
                  {imageUploading
                    ? "Uploading image..."
                    : createMutation.isPending ||
                        updateMutation.isPending
                      ? "Saving..."
                      : editingProduct
                        ? "Save Changes"
                        : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
