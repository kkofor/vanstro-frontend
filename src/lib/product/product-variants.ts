import type { ProductSummary } from "@/lib/api/api-contract";

export function resolveProductVariant(
  product: ProductSummary,
  selectedFinishName?: string
): ProductSummary {
  const selectedFinish =
    product.finishOptions?.find((option) => option.name === selectedFinishName) ??
    product.finishOptions?.find((option) => option.active);

  if (!selectedFinish) return product;

  const selectedImage = selectedFinish.image;
  const imageUrl = selectedImage?.url;
  const variantImages = selectedImage && imageUrl
    ? [
        selectedImage,
        ...product.images.filter((image) => image.url !== imageUrl)
      ]
    : product.images;
  const sku = selectedFinish.sku ?? product.sku;

  return {
    ...product,
    id: sku === product.sku ? product.id : `${product.id}-${sku}`,
    sku,
    manufacturerPartNumber:
      selectedFinish.manufacturerPartNumber ?? product.manufacturerPartNumber,
    finish: selectedFinish.name,
    colorName: selectedFinish.name,
    colorHex: selectedFinish.colorHex ?? product.colorHex,
    images: variantImages
  };
}
