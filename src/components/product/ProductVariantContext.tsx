"use client";

import { createContext, useContext, useState } from "react";

type ProductVariantContextValue = {
  selectedFinishName: string;
  setSelectedFinishName: (finishName: string) => void;
};

const ProductVariantContext = createContext<ProductVariantContextValue | null>(null);

type ProductVariantProviderProps = {
  children: React.ReactNode;
  initialFinishName: string;
};

export function ProductVariantProvider({
  children,
  initialFinishName
}: ProductVariantProviderProps) {
  const [selectedFinishName, setSelectedFinishName] = useState(initialFinishName);

  return (
    <ProductVariantContext.Provider value={{ selectedFinishName, setSelectedFinishName }}>
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  return useContext(ProductVariantContext);
}
