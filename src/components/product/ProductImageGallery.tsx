"use client";

import { useEffect, useMemo, useState } from "react";
import type { ImageAsset, ProductFinishOption } from "@/lib/api/api-contract";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import type { SiteLocale } from "@/lib/i18n/locale";
import { findFinishOptionByIdentity, finishOptionIdentity, inferFinishColorName } from "@/lib/product/product-finish-options";

type ProductImageGalleryProps = {
  images: ImageAsset[];
  finishOptions?: ProductFinishOption[];
  locale?: SiteLocale;
};

export function ProductImageGallery({ images, finishOptions = [], locale = "en-CA" }: ProductImageGalleryProps) {
  const french = locale === "fr-CA";
  const productVariant = useProductVariant();
  const selectedFinish = findFinishOptionByIdentity(
    finishOptions,
    productVariant?.selectedFinishName
  ) ?? finishOptions.find((option) => option.active);
  const selectedImages = selectedFinish?.images?.length ? selectedFinish.images : images;
  const finishImageByIdentity = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [finishOptionIdentity(option), option.image?.url])
      ),
    [finishOptions]
  );
  const initialActiveIndex = useMemo(() => {
    const initialFinishName =
      productVariant?.selectedFinishName ??
      (finishOptions.find((option) => option.active)
        ? finishOptionIdentity(finishOptions.find((option) => option.active)!)
        : undefined);
    const initialImageUrl = initialFinishName
      ? finishImageByIdentity.get(initialFinishName)
      : undefined;
    const nextIndex = initialImageUrl
      ? selectedImages.findIndex((image) => image.url === initialImageUrl)
      : -1;

    return nextIndex >= 0 ? nextIndex : 0;
  }, [finishImageByIdentity, finishOptions, productVariant?.selectedFinishName, selectedImages]);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const activeImage = selectedImages[activeIndex] ?? selectedImages[0];
  const finishIdentityByImageUrl = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [option.image?.url, finishOptionIdentity(option)])
      ),
    [finishOptions]
  );
  const finishLabelByImageUrl = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [option.image?.url, inferFinishColorName(option)])
      ),
    [finishOptions]
  );

  useEffect(() => {
    const selectedFinishName = productVariant?.selectedFinishName;
    if (!selectedFinishName) return;

    const selectedImageUrl = finishImageByIdentity.get(selectedFinishName);
    if (!selectedImageUrl) return;

    const nextIndex = selectedImages.findIndex((image) => image.url === selectedImageUrl);
    setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [finishImageByIdentity, productVariant?.selectedFinishName, selectedImages]);

  if (!activeImage) return null;

  function handleThumbClick(image: ImageAsset, index: number) {
    setActiveIndex(index);

    const finishIdentity = finishIdentityByImageUrl.get(image.url);
    if (finishIdentity) {
      productVariant?.setSelectedFinishName(finishIdentity);
    }
  }

  return (
    <div className="gal">
      <div
        className="gal__thumbs"
        role="tablist"
        aria-label={french ? "Images du produit" : "Product images"}
      >
        {selectedImages.map((image, index) => (
          <button
            aria-label={french
              ? finishLabelByImageUrl.get(image.url)
                ? `Afficher l’image ${finishLabelByImageUrl.get(image.url)}`
                : index === 0 ? "Afficher l’image principale" : `Afficher la vue ${index + 1} du produit`
              : finishLabelByImageUrl.get(image.url)
                ? `Show ${finishLabelByImageUrl.get(image.url)} image`
                : index === 0 ? "Show primary image" : `Show product view ${index + 1}`}
            aria-selected={activeIndex === index}
            className={activeIndex === index ? "is-active" : ""}
            onClick={() => handleThumbClick(image, index)}
            role="tab"
            type="button"
            key={`${selectedFinish?.sku ?? selectedFinish?.name ?? "default"}:${index}:${image.url}`}
          >
            <img
              src={image.url}
              alt=""
              width={image.width}
              height={image.height}
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>
      <div className="gal__main">
        <img
          key={`${selectedFinish?.sku ?? selectedFinish?.name ?? "default"}:${activeIndex}:${activeImage.url}`}
          src={activeImage.url}
          alt={activeImage.alt?.trim() || (french ? "Image du produit" : "Product image")}
          width={activeImage.width}
          height={activeImage.height}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <span className="pdp-zoom-hint" aria-hidden="true">{french ? "Survolez pour agrandir" : "Hover to zoom"}</span>
        <span className="gal__count">
          {activeIndex + 1} / {selectedImages.length}
        </span>
      </div>
    </div>
  );
}