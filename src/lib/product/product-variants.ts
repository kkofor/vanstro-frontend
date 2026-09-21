import type { ProductSummary } from "../api/api-contract.ts";
import { findFinishOptionByIdentity, inferFinishColorName } from "./product-finish-options.ts";

export function resolveProductVariant<T extends ProductSummary>(
  product: T,
  selectedFinishName?: string
): T {
  const selectedFinish =
    findFinishOptionByIdentity(product.finishOptions ?? [], selectedFinishName) ??
    product.finishOptions?.find((option) => option.active);

  if (!selectedFinish) return product;

  const selectedImage = selectedFinish.image;
  const variantImages = selectedFinish.images?.length
    ? selectedFinish.images
    : selectedImage
      ? [selectedImage, ...product.images.filter((image) => image.url !== selectedImage.url)]
      : product.images;
  const sku = selectedFinish.sku ?? product.sku;
  const colorName = inferFinishColorName(selectedFinish);
  const variantPrice = selectedFinish.price ?? product.price;
  const commerce = product.commerce && selectedFinish.price
    ? {
        ...product.commerce,
        pricing: {
          ...product.commerce.pricing,
          basePrice: variantPrice,
          currentPrice: variantPrice
        }
      }
    : product.commerce;

  return {
    ...product,
    id: sku === product.sku ? product.id : `${product.id}-${sku}`,
    sku,
    manufacturerPartNumber: selectedFinish.manufacturerPartNumber ?? product.manufacturerPartNumber,
    finish: colorName,
    colorName,
    colorHex: selectedFinish.colorHex ?? product.colorHex,
    price: variantPrice,
    ...(commerce ? { commerce } : {}),
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
