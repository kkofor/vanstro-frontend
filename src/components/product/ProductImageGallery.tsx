"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ImageAsset, ProductFinishOption } from "@/lib/api/api-contract";
import { useProductVariant } from "@/components/product/ProductVariantContext";

type ProductImageGalleryProps = {
  images: ImageAsset[];
  finishOptions?: ProductFinishOption[];
};

export function ProductImageGallery({ images, finishOptions = [] }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const productVariant = useProductVariant();
  const activeImage = images[activeIndex] ?? images[0];
  const finishImageByName = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [option.name, option.image?.url])
      ),
    [finishOptions]
  );
  const finishNameByImageUrl = useMemo(
    () =>
      new Map(
        finishOptions
          .filter((option) => option.image?.url)
          .map((option) => [option.image?.url, option.name])
      ),
    [finishOptions]
  );

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
        {images.map((image, index) => (
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
      </div>
    </div>
  );
}
