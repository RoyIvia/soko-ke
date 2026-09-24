import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  getListCategoriesQueryKey,
  useCreateCategory,
  useDeleteCategory,
  useListCategories,
  useUpdateCategory,
} from "@workspace/api-client-react";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CategoryForm = {
  name: string;
  slug: string;
  imageUrl: string;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  imageUrl: "",
};

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategories() {
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
  } = useListCategories();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [form, setForm] =
    useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] =
    useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const isSaving =
    createCategory.isPending ||
    updateCategory.isPending;

  useEffect(() => {
    if (!slugEdited && editingId === null) {
      setForm((current) => ({
        ...current,
        slug: makeSlug(current.name),
      }));
    }
  }, [form.name, slugEdited, editingId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSlugEdited(false);
  };

  const refreshCategories = async () => {
    await queryClient.invalidateQueries({
      queryKey: getListCategoriesQueryKey(),
    });
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const name = form.name.trim();
    const slug = makeSlug(form.slug || form.name);
    const imageUrl = form.imageUrl.trim();

    if (!name) {
      toast.error("Category name is required");
      return;
    }

    if (!slug) {
      toast.error("Category slug is required");
      return;
    }

    if (!imageUrl) {
      toast.error("Upload a category image first");
      return;
    }

    try {
      if (editingId !== null) {
        await updateCategory.mutateAsync({
          id: editingId,
          data: {
            name,
            slug,
            imageUrl,
          },
        });

        toast.success("Category updated");
      } else {
        await createCategory.mutateAsync({
          data: {
            name,
            slug,
            imageUrl,
          },
        });

        toast.success("Category created");
      }

      resetForm();
      await refreshCategories();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save category",
      );
    }
  };

  const handleEdit = (category: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string;
  }) => {
    setEditingId(category.id);
    setSlugEdited(true);
    setForm({
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (
    id: number,
    name: string,
  ) => {
    const confirmed = window.confirm(
      `Delete "${name}"? This is only allowed when no products use this category.`,
    );

    if (!confirmed) return;

    try {
      await deleteCategory.mutateAsync({ id });

      if (editingId === id) {
        resetForm();
      }

      await refreshCategories();
      toast.success("Category deleted");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete category",
      );
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-bold">
            Categories
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage the categories available to marketplace
            products.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              {editingId !== null
                ? "Edit category"
                : "Create category"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Categories created here become available to
              administrators and merchants when creating
              products.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
         <ImageUpload
           purpose="category"
           label="Category image"
           imageUrl={form.imageUrl}
           onUploaded={(url) =>
             setForm((current) => ({
              ...current,
              imageUrl: url,
            }))
          }
          onUploadingChange={setUploading}
       />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">
                  Category name
                </label>
                <Input
                  className="mt-2"
                  value={form.name}
                  placeholder="Electronics"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Slug
                </label>
                <Input
                  className="mt-2"
                  value={form.slug}
                  placeholder="electronics"
                  onChange={(event) => {
                    setSlugEdited(true);
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }));
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Used internally for product filtering and
                  category URLs.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isSaving || uploading}
              >
                <Plus className="mr-2 h-4 w-4" />
                {isSaving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update category"
                    : "Create category"}
              </Button>

              {editingId !== null && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">
              Marketplace categories
            </h2>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium">
                No categories yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create the first marketplace category above.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      /{category.slug}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {category.productCount} products
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deleteCategory.isPending}
                      onClick={() =>
                        handleDelete(
                          category.id,
                          category.name,
                        )
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
