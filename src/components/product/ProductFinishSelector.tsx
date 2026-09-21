"use client";

import { useState } from "react";
import type { ProductFinishOption } from "@/lib/api/api-contract";
import { useProductVariant } from "@/components/product/ProductVariantContext";
import type { SiteLocale } from "@/lib/i18n/locale";
import {
  findProductFinishOption,
  finishOptionIdentity,
  presentProductFinishOptions
} from "@/lib/product/product-finish-options";

type ProductFinishSelectorProps = {
  options?: ProductFinishOption[];
  fallbackColorHex?: string;
  fallbackName: string;
  locale?: SiteLocale;
  category?: string | null;
};

export function ProductFinishSelector({
  options,
  fallbackColorHex,
  fallbackName,
  locale = "en-CA",
  category
}: ProductFinishSelectorProps) {
  const french = locale === "fr-CA";
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
  const [localFinishName, setLocalFinishName] = useState(finishOptionIdentity(initialFinish));
  const selectedFinishName = productVariant?.selectedFinishName ?? localFinishName;
  const setSelectedFinishName = productVariant?.setSelectedFinishName ?? setLocalFinishName;
  const presentedOptions = presentProductFinishOptions(finishOptions, locale, category);
  const selectedPresentation =
    presentedOptions.find(({ option }) => finishOptionIdentity(option) === selectedFinishName) ??
    presentedOptions.find(({ option }) => option.name === selectedFinishName) ??
    presentedOptions[0];
  const colorOptions = presentedOptions.filter(
    (candidate, index, candidates) =>
      candidates.findIndex((other) => other.colorName === candidate.colorName) === index
  );
  const configurationOptions = presentedOptions.filter(
    (candidate) => candidate.configuration
  ).filter(
    (candidate, index, candidates) =>
      candidates.findIndex((other) => other.configuration === candidate.configuration) === index
  );

  function selectColor(colorName: string) {
    const next = findProductFinishOption(
      presentedOptions,
      colorName,
      selectedPresentation.configuration
    );
    if (next) setSelectedFinishName(finishOptionIdentity(next.option));
  }

  function selectConfiguration(configuration: ProductFinishOption["configuration"]) {
    const next = findProductFinishOption(
      presentedOptions,
      selectedPresentation.colorName,
      configuration
    );
    if (next) setSelectedFinishName(finishOptionIdentity(next.option));
  }

  return (
    <fieldset className="opt pdp-finish-selector" aria-labelledby="pdp-finish-selector-title">
      <div className="opt__label pdp-finish-selector-head">
        <small id="pdp-finish-selector-title">{french ? "Couleur / fini" : "Color / Finish"}</small>
        <span id="finishName" className="pdp-finish-name">{selectedPresentation.colorName}</span>
      </div>
      <div className="swatches pdp-finish-options" role="radiogroup" aria-label={french ? "Choisir la couleur ou le fini" : "Choose color or finish"}>
          {colorOptions.map(({ colorName }) => {
            const resolved = findProductFinishOption(
              presentedOptions,
              colorName,
              selectedPresentation.configuration
            );
            const option = resolved?.option;
            const selected = colorName === selectedPresentation.colorName;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? "sw is-active pdp-swatch" : "sw pdp-swatch"}
                data-finish-name={colorName}
                data-sku={option?.sku}
                data-manufacturer-part-number={option?.manufacturerPartNumber}
                data-image-url={option?.image?.url}
                data-image-alt={option?.image?.alt}
                aria-label={colorName}
                title={colorName}
                onClick={() => selectColor(colorName)}
                key={colorName}
              >
                <i style={{ background: option?.colorHex }} aria-hidden="true" />
                <span>{colorName}</span>
              </button>
            );
          })}
        </div>

      {configurationOptions.length > 1 ? (
        <div className="pdp-configuration-selector">
          <strong>Configuration</strong>
          <div className="pdp-configuration-options" role="radiogroup" aria-label={french ? "Choisir la configuration" : "Choose configuration"}>
            {configurationOptions.map(({ configuration, configurationLabel }) => {
              const resolved = findProductFinishOption(
                presentedOptions,
                selectedPresentation.colorName,
                configuration
              );
              return (
                <button
                  className={configuration === selectedPresentation.configuration ? "active" : undefined}
                  type="button"
                  role="radio"
                  aria-checked={configuration === selectedPresentation.configuration}
                  data-configuration={configuration}
                  data-sku={resolved?.option.sku}
                  onClick={() => selectConfiguration(configuration)}
                  key={configuration}
                >
                  {configurationLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}
