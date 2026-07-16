import type { ProductSummary } from "@/lib/api/api-contract";

export function resolveProductVariant<T extends ProductSummary>(
  product: T,
  selectedFinishName?: string
): T {
  const selectedFinish =
    product.finishOptions?.find((option) => option.name === selectedFinishName) ??
    product.finishOptions?.find((option) => option.active);

  if (!selectedFinish) return product;

  const selectedImage = selectedFinish.image;
  const variantImages = selectedFinish.images?.length
    ? selectedFinish.images
    : selectedImage
      ? [selectedImage, ...product.images.filter((image) => image.url !== selectedImage.url)]
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
    price: selectedFinish.price ?? product.price,
    dimensions: selectedFinish.dimensions ?? product.dimensions,
    images: variantImages,
    ...(selectedFinish.description ? { description: selectedFinish.description } : {}),
    ...(selectedFinish.productHighlights
      ? { productHighlights: selectedFinish.productHighlights }
      : {}),
    ...(selectedFinish.specifications
      ? { specifications: selectedFinish.specifications }
      : {})
  } as T;
}
