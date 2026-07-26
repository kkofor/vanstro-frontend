"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ImageAsset, ProductFinishOption } from "@/lib/api/api-contract";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import type { SiteLocale } from "@/lib/i18n/locale";

type ProductImageGalleryProps = {
  images: ImageAsset[];
  finishOptions?: ProductFinishOption[];
  locale?: SiteLocale;
};

const MAX_COLLAPSED_THUMBNAILS = 7;
const COLLAPSED_IMAGE_COUNT = MAX_COLLAPSED_THUMBNAILS - 1;

export function ProductImageGallery({ images, finishOptions = [], locale = "en-CA" }: ProductImageGalleryProps) {
  const french = locale === "fr-CA";
  const productVariant = useProductVariant();
  const selectedFinish = finishOptions.find(
    (option) => option.name === productVariant?.selectedFinishName
  ) ?? finishOptions.find((option) => option.active);
  const selectedImages = selectedFinish?.images?.length ? selectedFinish.images : images;
  const finishImageByName = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [option.name, option.image?.url])
      ),
    [finishOptions]
  );
  const initialActiveIndex = useMemo(() => {
    const initialFinishName =
      productVariant?.selectedFinishName ??
      finishOptions.find((option) => option.active)?.name;
    const initialImageUrl = initialFinishName
      ? finishImageByName.get(initialFinishName)
      : undefined;
    const nextIndex = initialImageUrl
      ? selectedImages.findIndex((image) => image.url === initialImageUrl)
      : -1;

    return nextIndex >= 0 ? nextIndex : 0;
  }, [finishImageByName, finishOptions, productVariant?.selectedFinishName, selectedImages]);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const [galleryExpanded, setGalleryExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const activeImage = selectedImages[activeIndex] ?? selectedImages[0];
  const finishNameByImageUrl = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [option.image?.url, option.name])
      ),
    [finishOptions]
  );
  const hasOverflowImages = selectedImages.length > MAX_COLLAPSED_THUMBNAILS;
  const visibleImages = hasOverflowImages && !galleryExpanded
    ? selectedImages.slice(0, COLLAPSED_IMAGE_COUNT)
    : selectedImages;
  const hiddenImageCount = selectedImages.length - COLLAPSED_IMAGE_COUNT;

  useEffect(() => {
    const selectedFinishName = productVariant?.selectedFinishName;
    if (!selectedFinishName) return;

    const selectedImageUrl = finishImageByName.get(selectedFinishName);
    if (!selectedImageUrl) return;

    const nextIndex = selectedImages.findIndex((image) => image.url === selectedImageUrl);
    setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
    setGalleryExpanded(false);
    setZoomed(false);
  }, [finishImageByName, productVariant?.selectedFinishName, selectedImages]);

  if (!activeImage) return null;

  function handleThumbClick(image: ImageAsset, index: number) {
    setActiveIndex(index);
    setZoomed(false);

    const finishName = finishNameByImageUrl.get(image.url);
    if (finishName) {
      productVariant?.setSelectedFinishName(finishName);
    }
  }

  function handleZoomMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;

    const rect = event.currentTarget.getBoundingClientRect();
    setZoomOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  }

  return (
    <div className="pdp-gallery-column">
      <div
        className={zoomed ? "pdp-gallery-frame zoomed" : "pdp-gallery-frame"}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setZoomed(true);
        }}
        onPointerLeave={() => setZoomed(false)}
        onPointerMove={handleZoomMove}
        style={{
          "--pdp-zoom-x": `${zoomOrigin.x}%`,
          "--pdp-zoom-y": `${zoomOrigin.y}%`
        } as React.CSSProperties}
      >
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
      </div>
      <HorizontalScrollRail
        className="pdp-thumb-row"
        label={french ? "Images du produit" : "Product images"}
        hint={french ? "Balayez ou utilisez les boutons fléchés pour voir plus d’images du produit." : "Swipe or use the arrow buttons to view more product images."}
        previousLabel={french ? "Images précédentes du produit" : "Previous product images"}
        nextLabel={french ? "Images suivantes du produit" : "Next product images"}
        activeKey={`${selectedFinish?.sku ?? selectedFinish?.name ?? "default"}:${activeIndex}:${galleryExpanded}`}
      >
        {visibleImages.map((image, index) => (
          <button
            aria-label={french
              ? `Afficher l’image ${finishNameByImageUrl.get(image.url) ?? (index === 0 ? "principale" : `vue ${index + 1}`)}`
              : `Show ${finishNameByImageUrl.get(image.url) ?? (index === 0 ? "primary" : `view ${index + 1}`)} image`}
            aria-pressed={activeIndex === index}
            className={activeIndex === index ? "pdp-thumb active" : "pdp-thumb"}
            onClick={() => handleThumbClick(image, index)}
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
            <span>{finishNameByImageUrl.get(image.url) ?? (index === 0 ? (french ? "Principale" : "Primary") : `${french ? "Vue" : "View"} ${index + 1}`)}</span>
          </button>
        ))}
        {hasOverflowImages && !galleryExpanded ? (
          <button
            aria-label={french ? `Afficher ${hiddenImageCount} autres images du produit` : `Show ${hiddenImageCount} more product images`}
            aria-pressed={activeIndex >= COLLAPSED_IMAGE_COUNT}
            className={activeIndex >= COLLAPSED_IMAGE_COUNT ? "pdp-thumb pdp-thumb-more active" : "pdp-thumb pdp-thumb-more"}
            onClick={() => setGalleryExpanded(true)}
            type="button"
          >
            <span className="pdp-thumb-more-image" aria-hidden="true">
              <img
                src={selectedImages[COLLAPSED_IMAGE_COUNT].url}
                alt=""
                width={selectedImages[COLLAPSED_IMAGE_COUNT].width}
                height={selectedImages[COLLAPSED_IMAGE_COUNT].height}
                loading="lazy"
                decoding="async"
              />
              <strong>+{hiddenImageCount}</strong>
            </span>
            <span>{french ? "Tout afficher" : "View all"}</span>
          </button>
        ) : null}
        {hasOverflowImages && galleryExpanded ? (
          <button
            aria-label={french ? "Réduire les images du produit" : "Collapse product images"}
            className="pdp-thumb pdp-thumb-collapse"
            onClick={() => setGalleryExpanded(false)}
            type="button"
          >
            <strong aria-hidden="true">−</strong>
            <span>{french ? "Afficher moins" : "Show less"}</span>
          </button>
        ) : null}
      </HorizontalScrollRail>
    </div>
  );
}
