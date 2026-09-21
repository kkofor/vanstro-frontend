"use client";

import { useEffect, useState } from "react";
import type { ProductInventory } from "@/lib/api/api-contract";
import { useStorefront } from "@/components/storefront/StorefrontProvider";
import { toStockDealerId } from "@/lib/dealer/dealer-stock-id";

export type ProductInventoryState = {
  inventory?: ProductInventory;
  /** Raw reason from /api/stock: in_stock | out_of_stock | insufficient | dealer_no_stock | unavailable. */
  reason?: string;
  /** Server-side canOrder from lib/stock.ts (unavailable is true — an ERP outage never blocks ordering). */
  canOrder?: boolean;
  /** erp | manual | none — manual is a temporary backfill and has no ERP updatedAt to show. */
  source?: string;
  loading: boolean;
  error?: string;
};

/**
 * Fetches the dynamic SKU × dealer-location inventory for a single selected SKU.
 * Re-fetches whenever the SKU changes; fails closed (error set, no inventory)
 * so the purchase panel never treats "no data" as a real out-of-stock state.
 */
export function useProductInventory(productSlug: string, skuCode?: string): ProductInventoryState {
  const { selectedDealerId, selectedDealerCode } = useStorefront();
  const [state, setState] = useState<ProductInventoryState>({ loading: false });
  // Map the live-directory dealer identity (a Website-API UUID + code, e.g. "AB10") to the
  // ERP-snapshot id /api/stock understands (e.g. "AB-CGY"). An unmapped id is left as-is so
  // lib/stock.ts fails closed to dealer_no_stock instead of silently defaulting to Yuan.
  const stockDealerId = toStockDealerId({ id: selectedDealerId, code: selectedDealerCode });

  useEffect(() => {
    let cancelled = false;
    if (!productSlug || !skuCode) {
      setState({ loading: false });
      return;
    }
    setState((previous) => ({ ...previous, loading: true, error: undefined }));
    fetch(`/api/stock?sku=${encodeURIComponent(skuCode)}&dealerId=${encodeURIComponent(stockDealerId)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Inventory request failed with status ${response.status}.`);
        }
        return response.json();
      })
      .then((stock: { qty: number; reason: string; updatedAt: string | null; canOrder?: boolean; source?: string }) => {
        if (cancelled) return;
        const quantityKnown = stock.reason !== "unavailable";
        setState({
          inventory: {
            productId: productSlug,
            sku: skuCode,
            locations: [
              {
                dealerId: stockDealerId,
                dealerLocationId: selectedDealerId,
                quantity: stock.qty,
                quantityKnown,
                status: stock.qty > 0 || stock.reason === "unavailable" ? "in_stock" : "out_of_stock",
                updatedAt: stock.updatedAt ?? ""
              }
            ],
            totalAvailable: stock.qty,
            status: stock.qty > 0 || stock.reason === "unavailable" ? "in_stock" : "out_of_stock",
            updatedAt: stock.updatedAt ?? ""
          },
          reason: stock.reason,
          canOrder: stock.canOrder,
          source: stock.source,
          loading: false
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ loading: false, error: error?.message ?? "Inventory unavailable." });
      });

    return () => {
      cancelled = true;
    };
  }, [productSlug, skuCode, stockDealerId, selectedDealerId]);

  return state;
}
