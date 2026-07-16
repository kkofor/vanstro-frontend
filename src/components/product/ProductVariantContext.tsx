"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ProductFinishOption } from "@/lib/api/api-contract";

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
  const [selectedFinishName, setSelectedFinishName] = useState(initialFinishName);

  useEffect(() => {
    const sku = new URLSearchParams(window.location.search).get("sku");
    const requestedFinish = finishOptions.find((option) => option.sku === sku);
    if (requestedFinish) setSelectedFinishName(requestedFinish.name);
  }, [finishOptions]);

  function updateSelectedFinishName(finishName: string) {
    setSelectedFinishName(finishName);
    const sku = finishOptions.find((option) => option.name === finishName)?.sku;
    if (!sku) return;

    const url = new URL(window.location.href);
    url.searchParams.set("sku", sku);
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
