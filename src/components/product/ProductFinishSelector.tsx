"use client";

import { useState } from "react";
import type { ProductFinishOption } from "@/lib/api/api-contract";
import { useProductVariant } from "@/components/product/ProductVariantContext";

type ProductFinishSelectorProps = {
  options?: ProductFinishOption[];
  fallbackColorHex?: string;
  fallbackName: string;
};

export function ProductFinishSelector({
  options,
  fallbackColorHex,
  fallbackName
}: ProductFinishSelectorProps) {
  const normalizedOptions = options?.length
    ? options
    : [
        {
          name: fallbackName,
          colorHex: fallbackColorHex,
          active: true
        }
      ];
  const finishOptions = normalizedOptions.map((option, index) => ({
    ...option,
    colorHex: option.colorHex ?? fallbackColorHex ?? "#f4f2ee",
    active: option.active ?? index === 0
  }));
  const initialFinish = finishOptions.find((option) => option.active) ?? finishOptions[0];
  const productVariant = useProductVariant();
  const [localFinishName, setLocalFinishName] = useState(initialFinish.name);
  const selectedFinishName = productVariant?.selectedFinishName ?? localFinishName;
  const setSelectedFinishName = productVariant?.setSelectedFinishName ?? setLocalFinishName;

  return (
    <fieldset className="pdp-finish-selector" aria-labelledby="pdp-finish-selector-title">
      <div className="pdp-finish-selector-head">
        <span className="pdp-finish-inline-title">
          <small>Color / finish:</small>
          <strong id="pdp-finish-selector-title">{selectedFinishName}</strong>
        </span>
      </div>

      <div className="pdp-finish-options" role="radiogroup" aria-label="Choose color or finish">
        {finishOptions.map((option) => (
          <label
            className="pdp-finish-option"
            data-finish-name={option.name}
            aria-label={option.name}
            title={option.name}
            key={option.name}
          >
            <input
              type="radio"
              name="product-finish"
              value={option.name}
              data-sku={option.sku}
              data-manufacturer-part-number={option.manufacturerPartNumber}
              data-image-url={option.image?.url}
              data-image-alt={option.image?.alt}
              checked={option.name === selectedFinishName}
              onChange={() => setSelectedFinishName(option.name)}
            />
            <span className="pdp-finish-swatch" style={{ backgroundColor: option.colorHex }} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
