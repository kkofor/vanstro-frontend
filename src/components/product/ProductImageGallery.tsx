"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ImageAsset, ProductFinishOption } from "@/lib/api/api-contract";
import { useProductVariant } from "@/components/product/ProductVariantContext";

type ProductImageGalleryProps = {
  images: ImageAsset[];
  finishOptions?: ProductFinishOption[];
};

const MAX_COLLAPSED_THUMBNAILS = 7;
const COLLAPSED_IMAGE_COUNT = MAX_COLLAPSED_THUMBNAILS - 1;

export function ProductImageGallery({ images, finishOptions = [] }: ProductImageGalleryProps) {
  const productVariant = useProductVariant();
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
      ? images.findIndex((image) => image.url === initialImageUrl)
      : -1;

    return nextIndex >= 0 ? nextIndex : 0;
  }, [finishImageByName, finishOptions, images, productVariant?.selectedFinishName]);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const [galleryExpanded, setGalleryExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const activeImage = images[activeIndex] ?? images[0];
  const finishNameByImageUrl = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [option.image?.url, option.name])
      ),
    [finishOptions]
  );
  const hasOverflowImages = images.length > MAX_COLLAPSED_THUMBNAILS;
  const visibleImages = hasOverflowImages && !galleryExpanded
    ? images.slice(0, COLLAPSED_IMAGE_COUNT)
    : images;
  const hiddenImageCount = images.length - COLLAPSED_IMAGE_COUNT;

  useEffect(() => {
    const selectedFinishName = productVariant?.selectedFinishName;
    if (!selectedFinishName) return;

    const selectedImageUrl = finishImageByName.get(selectedFinishName);
    if (!selectedImageUrl) return;

    const nextIndex = images.findIndex((image) => image.url === selectedImageUrl);
    if (nextIndex >= 0) {
      setActiveIndex(nextIndex);
    }
  }, [finishImageByName, images, productVariant?.selectedFinishName]);

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
        <img src={activeImage.url} alt={activeImage.alt} />
        <span className="pdp-zoom-hint" aria-hidden="true">Hover to zoom</span>
      </div>
      <div className="pdp-thumb-row" aria-label="Product images">
        {visibleImages.map((image, index) => (
          <button
            aria-label={`Show ${finishNameByImageUrl.get(image.url) ?? (index === 0 ? "primary" : `view ${index + 1}`)} image`}
            aria-pressed={activeIndex === index}
            className={activeIndex === index ? "pdp-thumb active" : "pdp-thumb"}
            onClick={() => handleThumbClick(image, index)}
            type="button"
            key={image.url}
          >
            <img src={image.url} alt={image.alt || `${finishNameByImageUrl.get(image.url) ?? `View ${index + 1}`} thumbnail`} />
            <span>{finishNameByImageUrl.get(image.url) ?? (index === 0 ? "Primary" : `View ${index + 1}`)}</span>
          </button>
        ))}
        {hasOverflowImages && !galleryExpanded ? (
          <button
            aria-label={`Show ${hiddenImageCount} more product images`}
            aria-pressed={activeIndex >= COLLAPSED_IMAGE_COUNT}
            className={activeIndex >= COLLAPSED_IMAGE_COUNT ? "pdp-thumb pdp-thumb-more active" : "pdp-thumb pdp-thumb-more"}
            onClick={() => setGalleryExpanded(true)}
            type="button"
          >
            <span className="pdp-thumb-more-image" aria-hidden="true">
              <img src={images[COLLAPSED_IMAGE_COUNT].url} alt="" />
              <strong>+{hiddenImageCount}</strong>
            </span>
            <span>View all</span>
          </button>
        ) : null}
        {hasOverflowImages && galleryExpanded ? (
          <button
            aria-label="Collapse product images"
            className="pdp-thumb pdp-thumb-collapse"
            onClick={() => setGalleryExpanded(false)}
            type="button"
          >
            <strong aria-hidden="true">−</strong>
            <span>Show less</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
