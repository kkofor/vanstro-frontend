"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ProductFinishOption } from "@/lib/api/api-contract";
import { findFinishOptionByIdentity, finishOptionIdentity } from "@/lib/product/product-finish-options";

type ProductVariantContextValue = {
  selectedFinishName: string;
  setSelectedFinishName: (finishName: string) => void;
};

const ProductVariantContext = createContext<ProductVariantContextValue | null>(null);

type ProductVariantProviderProps = {
  children: React.ReactNode;
  initialFinishName: string;
  finishOptions?: ProductFinishOption[];
};

export function ProductVariantProvider({
  children,
  initialFinishName,
  finishOptions = []
}: ProductVariantProviderProps) {
  const [selectedFinishName, setSelectedFinishName] = useState(() => {
    if (typeof window === "undefined") return initialFinishName;
    const sku = new URLSearchParams(window.location.search).get("sku");
    const requestedFinish = finishOptions.find((option) => option.sku === sku);
    return requestedFinish ? finishOptionIdentity(requestedFinish) : initialFinishName;
  });

  useLayoutEffect(() => {
    const sku = new URLSearchParams(window.location.search).get("sku");
    const requestedFinish = finishOptions.find((option) => option.sku === sku);
    if (requestedFinish) setSelectedFinishName(finishOptionIdentity(requestedFinish));
  }, [finishOptions]);

  function updateSelectedFinishName(finishName: string) {
    const selected = findFinishOptionByIdentity(finishOptions, finishName);
    const identity = selected ? finishOptionIdentity(selected) : finishName;
    setSelectedFinishName(identity);
    const nextSku = selected?.sku;
    if (!nextSku) return;

    const url = new URL(window.location.href);
    url.searchParams.set("sku", nextSku);
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <ProductVariantContext.Provider
      value={{ selectedFinishName, setSelectedFinishName: updateSelectedFinishName }}
    >
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  return useContext(ProductVariantContext);
}
