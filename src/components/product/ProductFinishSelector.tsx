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
  const presentedOptions = finishOptions.map((option) => {
    const configurationMatch = option.name.match(/^(.*?)\s+(with top|cabinet only)$/i);
    const configuration = configurationMatch?.[2]?.toLowerCase() === "with top"
      ? "Vanity Cabinet + Top"
      : configurationMatch
        ? "Vanity Cabinet"
        : null;

    return {
      option,
      colorName: configurationMatch?.[1] ?? option.name,
      configuration
    };
  });
  const selectedPresentation =
    presentedOptions.find(({ option }) => option.name === selectedFinishName) ??
    presentedOptions[0];
  const colorOptions = presentedOptions.filter(
    (candidate, index, candidates) =>
      candidates.findIndex((other) => other.colorName === candidate.colorName) === index
  );
  const configurationOptions = presentedOptions.filter(
    (candidate) => candidate.colorName === selectedPresentation.colorName && candidate.configuration
  );

  function selectColor(colorName: string) {
    const next = presentedOptions.find(
      (candidate) =>
        candidate.colorName === colorName &&
        candidate.configuration === selectedPresentation.configuration
    ) ?? presentedOptions.find((candidate) => candidate.colorName === colorName);
    if (next) setSelectedFinishName(next.option.name);
  }

  function selectConfiguration(configuration: string) {
    const next = presentedOptions.find(
      (candidate) =>
        candidate.colorName === selectedPresentation.colorName &&
        candidate.configuration === configuration
    );
    if (next) setSelectedFinishName(next.option.name);
  }

  return (
    <fieldset className="pdp-finish-selector" aria-labelledby="pdp-finish-selector-title">
      <div className="pdp-finish-selector-head">
        <span className="pdp-finish-inline-title">
          <small>Color / finish:</small>
          <strong id="pdp-finish-selector-title">{selectedPresentation.colorName}</strong>
        </span>
      </div>

      <div className="pdp-finish-options" role="radiogroup" aria-label="Choose color or finish">
        {colorOptions.map(({ colorName, option }) => (
          <label
            className="pdp-finish-option"
            data-finish-name={colorName}
            aria-label={colorName}
            title={colorName}
            key={colorName}
          >
            <input
              type="radio"
              name="product-color"
              value={colorName}
              data-sku={option.sku}
              data-manufacturer-part-number={option.manufacturerPartNumber}
              data-image-url={option.image?.url}
              data-image-alt={option.image?.alt}
              checked={colorName === selectedPresentation.colorName}
              onChange={() => selectColor(colorName)}
            />
            <span className="pdp-finish-swatch" style={{ backgroundColor: option.colorHex }} />
          </label>
        ))}
      </div>

      {configurationOptions.length > 1 ? (
        <div className="pdp-configuration-selector">
          <strong>Configuration</strong>
          <div className="pdp-configuration-options" role="radiogroup" aria-label="Choose configuration">
            {configurationOptions.map(({ configuration, option }) => (
              <button
                className={configuration === selectedPresentation.configuration ? "active" : undefined}
                type="button"
                role="radio"
                aria-checked={configuration === selectedPresentation.configuration}
                data-sku={option.sku}
                onClick={() => selectConfiguration(configuration ?? "")}
                key={configuration}
              >
                {configuration}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
