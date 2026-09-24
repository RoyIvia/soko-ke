import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ImagePlus,
  Loader2,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  uploadImage,
  type MediaPurpose,
} from "@/lib/media";

type ImageUploadProps = {
  purpose: MediaPurpose;
  imageUrl: string;
  onUploaded: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  label?: string;
};

export function ImageUpload({
  purpose,
  imageUrl,
  onUploaded,
  onUploadingChange,
  label = "Product image",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] =
    useState(false);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file || uploading) {
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      toast.error(
        "Only JPEG, PNG, and WebP images are supported",
      );

      event.target.value = "";
      return;
    }

    if (
      file.size <= 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      toast.error(
        "Image must be 5 MiB or smaller",
      );

      event.target.value = "";
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);

    const localPreview =
      URL.createObjectURL(file);

    setPreviewUrl(localPreview);

    try {
      const result = await uploadImage(
        file,
        purpose,
      );

      onUploaded(result.publicUrl);

      toast.success(
        "Image uploaded successfully",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Image upload failed",
      );

      setPreviewUrl(null);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        {label}
      </label>

      <div className="flex flex-col sm:flex-row gap-4 rounded-xl border p-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
          {previewUrl || imageUrl ? (
            <img
              src={previewUrl ?? imageUrl}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col justify-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={handleFileChange}
          />

          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() =>
              inputRef.current?.click()
            }
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus className="mr-2 h-4 w-4" />
                Choose image
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            JPEG, PNG or WebP. Maximum 5 MiB.
          </p>
        </div>
      </div>
    </div>
  );
}
