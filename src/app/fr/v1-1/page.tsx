import { notFound } from "next/navigation";

/**
 * The v1.1 concept is a private, English-only preview rather than a public
 * storefront surface. Do not expose a misleading French mirror until the
 * concept itself is approved and fully localized.
 */
export default function FrenchV11Page() {
  notFound();
}
