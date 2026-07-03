import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/api/server";
import { ProductBuyPanel } from "@/components/product/ProductBuyPanel";
import { ProductDetailBreadcrumb } from "@/components/product/ProductDetailBreadcrumb";
import { ProductDetailMain } from "@/components/product/ProductDetailMain";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductVariantProvider } from "@/components/product/ProductVariantContext";
import { productSchema } from "@/lib/seo/schema";
import { dealers, products, productsWithCommerce } from "@/lib/data/mock-data";
import type { ProductSummary } from "@/lib/api/api-contract";
import { createProductDetailViewModel } from "@/lib/product/product-detail-view-model";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

function ProductVariantSyncScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(() => {
  if (window.__vanstroPdpVariantSync) return;
  window.__vanstroPdpVariantSync = true;

  const normalizeAssetPath = (value) => {
    if (!value) return "";
    try {
      return new URL(value, window.location.origin).pathname;
    } catch {
      return value;
    }
  };

  const setActiveThumb = (imageUrl) => {
    const targetPath = normalizeAssetPath(imageUrl);
    document.querySelectorAll(".pdp-thumb").forEach((thumb) => {
      const thumbImage = thumb.querySelector("img");
      const thumbPath = normalizeAssetPath(thumbImage?.getAttribute("src") || thumbImage?.src);
      const active = thumbPath === targetPath;
      thumb.classList.toggle("active", active);
      thumb.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };

  const syncFromFinishInput = (input) => {
    if (!(input instanceof HTMLInputElement)) return;
    const imageUrl = input.dataset.imageUrl;
    if (!imageUrl) return;

    const finishTitle = document.querySelector("#pdp-finish-selector-title");
    if (finishTitle) finishTitle.textContent = input.value;

    const modelLabel = document.querySelector("[data-product-model]");
    const skuLabel = document.querySelector("[data-product-sku]");
    if (modelLabel && input.dataset.manufacturerPartNumber) {
      modelLabel.textContent = input.dataset.manufacturerPartNumber;
    }
    if (skuLabel && input.dataset.sku) {
      skuLabel.textContent = input.dataset.sku;
    }

    const mainImage = document.querySelector(".pdp-gallery-frame img");
    if (mainImage) {
      mainImage.setAttribute("src", imageUrl);
      mainImage.setAttribute("alt", input.dataset.imageAlt || input.value);
    }

    setActiveThumb(imageUrl);
  };

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.name === "product-finish") {
      syncFromFinishInput(input);
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const thumb = target.closest(".pdp-thumb");
    if (!thumb) return;

    const thumbImage = thumb.querySelector("img");
    const thumbUrl = thumbImage?.getAttribute("src") || thumbImage?.src;
    if (!thumbUrl) return;

    const matchingInput = Array.from(document.querySelectorAll('input[name="product-finish"]')).find((input) =>
      normalizeAssetPath(input.dataset.imageUrl) === normalizeAssetPath(thumbUrl)
    );

    if (matchingInput instanceof HTMLInputElement) {
      matchingInput.checked = true;
      syncFromFinishInput(matchingInput);
      return;
    }

    const mainImage = document.querySelector(".pdp-gallery-frame img");
    if (mainImage) mainImage.setAttribute("src", thumbUrl);
    setActiveThumb(thumbUrl);
  });

  const syncInitialFinish = () => {
    const checkedInput = document.querySelector('input[name="product-finish"]:checked');
    if (checkedInput) syncFromFinishInput(checkedInput);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncInitialFinish, { once: true });
  } else {
    syncInitialFinish();
  }
})();
`
      }}
    />
  );
}

function ProductDealerSyncScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(() => {
  if (window.__vanstroPdpDealerSync) return;
  window.__vanstroPdpDealerSync = true;

  const STORAGE_KEY = "vanstro-storefront-v1";
  const qs = (selector) => document.querySelector(selector);
  const qsa = (selector) => Array.from(document.querySelectorAll(selector));

  const setModalOpen = (open) => {
    const modal = qs(".pdp-dealer-modal");
    const trigger = qs("[data-selected-dealer-trigger]");
    if (!modal) return;
    modal.hidden = !open;
    trigger?.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const persistDealer = (option) => {
    try {
      const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
      current.selectedDealerId = option.dataset.dealerId;
      current.selectedDealerName = option.dataset.dealerName;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedDealerId: option.dataset.dealerId,
          selectedDealerName: option.dataset.dealerName
        })
      );
    }
  };

  const applyDealer = (option) => {
    const dealerName = option.dataset.dealerName || "";
    const city = option.dataset.dealerCity || "";
    const province = option.dataset.dealerProvince || "";
    const postalCode = option.dataset.dealerPostalCode || "";
    const address = option.dataset.dealerAddress || "";
    const inventoryLabel = option.dataset.dealerInventoryLabel || "";
    const inventoryClass = option.dataset.dealerInventoryClass || "";

    const title = qs("[data-dealer-fulfillment-title]");
    const inventory = qs("[data-dealer-inventory-label]");
    const pickup = qs("[data-dealer-pickup-label]");
    const addressLabel = qs("[data-dealer-address-label]");
    const cityLabel = qs("[data-dealer-city-label]");
    const note = qs(".purchase-note");
    const buyBarStock = qs(".pdp-desktop-buy-bar small");

    if (title) title.textContent = dealerName;
    if (inventory) {
      inventory.textContent = inventoryLabel + " at selected dealer";
      inventory.className = inventoryClass;
    }
    if (pickup) pickup.textContent = "Pick-Up";
    if (addressLabel) addressLabel.textContent = address;
    if (cityLabel) cityLabel.textContent = "From " + city + ", " + province + " " + postalCode;
    if (note) note.textContent = "Checkout reserves stock under " + dealerName + ".";
    if (buyBarStock) {
      buyBarStock.textContent = inventoryLabel + " at selected dealer";
      buyBarStock.className = inventoryClass;
    }

    qsa(".pdp-dealer-option").forEach((dealerOption) => {
      dealerOption.classList.toggle("selected", dealerOption === option);
    });

    persistDealer(option);
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest("[data-selected-dealer-trigger]");
    if (trigger) {
      setModalOpen(true);
      return;
    }

    if (target.closest(".pdp-dealer-backdrop") || target.closest("[data-dealer-close]")) {
      setModalOpen(false);
      return;
    }

    const option = target.closest(".pdp-dealer-option");
    if (option) {
      applyDealer(option);
      setModalOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setModalOpen(false);
  });
})();
`
      }}
    />
  );
}

function ProductNativeCartDrawerScript({
  product,
  suggestedProducts
}: {
  product: ProductSummary;
  suggestedProducts: ProductSummary[];
}) {
  const payload = {
    product,
    suggestedProducts: suggestedProducts.slice(0, 2)
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(() => {
  if (window.__vanstroNativeCartDrawer) return;
  window.__vanstroNativeCartDrawer = true;

  const STORAGE_KEY = "vanstro-storefront-v1";
  const payload = ${JSON.stringify(payload)};
  const product = payload.product;
  const suggestedProducts = payload.suggestedProducts || [];

  const formatMoney = (moneyOrAmount, currency = "CAD") => {
    const amount = typeof moneyOrAmount === "number" ? moneyOrAmount : moneyOrAmount?.amount || 0;
    const nextCurrency = typeof moneyOrAmount === "number" ? currency : moneyOrAmount?.currency || currency;
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: nextCurrency }).format(amount);
  };

  const getProductPrice = (nextProduct) =>
    nextProduct?.commerce?.pricing?.currentPrice || nextProduct?.price || { amount: 0, currency: "CAD" };

  const getSelectedVariantProduct = () => {
    const selectedInput = document.querySelector('input[name="product-finish"]:checked');
    if (!(selectedInput instanceof HTMLInputElement)) return product;

    const sku = selectedInput.dataset.sku || product.sku;
    const manufacturerPartNumber =
      selectedInput.dataset.manufacturerPartNumber || product.manufacturerPartNumber;
    const imageUrl = selectedInput.dataset.imageUrl;
    const imageAlt = selectedInput.dataset.imageAlt || product.name;
    const nextImages = imageUrl
      ? [{ url: imageUrl, alt: imageAlt }, ...(product.images || []).filter((image) => image.url !== imageUrl)]
      : product.images;

    return {
      ...product,
      id: \`\${product.id}-\${sku}\`,
      sku,
      manufacturerPartNumber,
      colorName: selectedInput.value,
      images: nextImages
    };
  };

  const readStore = () => {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const writeStore = (store) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  };

  const findQuantity = (button) => {
    const root = button.closest(".pdp-purchase-actions") || document;
    const value = Number(root.querySelector(".pdp-cart-control-row .quantity-stepper span")?.textContent?.trim());
    return Number.isFinite(value) && value > 0 ? value : 1;
  };

  const addProductToStore = (quantity) => {
    const store = readStore();
    const cartItems = Array.isArray(store.cartItems) ? store.cartItems : [];
    const variantProduct = getSelectedVariantProduct();
    const price = getProductPrice(variantProduct);
    const pricedProduct = { ...variantProduct, price };
    const existingIndex = cartItems.findIndex((item) => item?.product?.id === pricedProduct.id);

    if (existingIndex >= 0) {
      cartItems[existingIndex] = {
        ...cartItems[existingIndex],
        product: pricedProduct,
        quantity: (cartItems[existingIndex].quantity || 0) + quantity
      };
    } else {
      cartItems.push({ product: pricedProduct, quantity });
    }

    const nextStore = {
      ...store,
      cartItems,
      selectedDealerId: store.selectedDealerId || "toronto",
      selectedDealerName: store.selectedDealerName || "VanStro Toronto"
    };
    writeStore(nextStore);
    return nextStore;
  };

  const cartSubtotal = (items) =>
    items.reduce((total, item) => total + getProductPrice(item.product).amount * item.quantity, 0);

  const cartCount = (items) =>
    items.reduce((total, item) => total + (item.quantity || 0), 0);

  const syncHeaderCartCount = (items) => {
    const count = cartCount(items);
    document.querySelectorAll('a[href="/cart"], a[href="/cart/"]').forEach((link) => {
      const label = link.querySelector("span");
      if (label) label.textContent = count ? \`Cart \${count}\` : "Cart";
      link.setAttribute("aria-label", count ? \`Cart \${count}\` : "Cart");
    });
  };

  const syncQuantityDisplays = (quantity) => {
    document.querySelectorAll(".pdp-purchase-actions .quantity-stepper span").forEach((label) => {
      label.textContent = String(quantity);
    });
  };

  const getDisplayedQuantity = (button) => {
    const stepper = button.closest(".quantity-stepper");
    const value = Number(stepper?.querySelector("span")?.textContent?.trim());
    return Number.isFinite(value) && value > 0 ? value : 1;
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  const suggestionMarkup = () => suggestedProducts.map((nextProduct) => {
    const price = getProductPrice(nextProduct);
    const image = nextProduct.images?.[0] || {};
    return \`
      <a class="cart-added-suggestion" href="/products/\${escapeHtml(nextProduct.slug)}">
        <img src="\${escapeHtml(image.url)}" alt="\${escapeHtml(image.alt || nextProduct.name)}" />
        <strong>\${escapeHtml(nextProduct.name)}</strong>
        <span>\${formatMoney(price)} / \${escapeHtml(nextProduct.unit || "each")}</span>
      </a>
    \`;
  }).join("");

  const ensureDrawer = () => {
    let drawer = document.querySelector("#vanstro-native-cart-added-drawer");
    if (drawer) {
      if (drawer.parentElement !== document.body) document.body.appendChild(drawer);
      return drawer;
    }
    drawer = document.createElement("div");
    drawer.id = "vanstro-native-cart-added-drawer";
    drawer.className = "cart-added-drawer";
    drawer.setAttribute("aria-hidden", "true");
    document.body.appendChild(drawer);
    return drawer;
  };

  const renderDrawer = ({ quantity, store }) => {
    const drawer = ensureDrawer();
    const drawerProduct = getSelectedVariantProduct();
    const image = drawerProduct.images?.[0] || {};
    const price = getProductPrice(drawerProduct);
    const itemTotal = price.amount * quantity;
    const items = store.cartItems || [];
    const selectedDealerName = store.selectedDealerName || "VanStro Toronto";
    drawer.innerHTML = \`
      <button class="cart-added-backdrop" type="button" aria-label="Close cart drawer"></button>
      <aside class="cart-added-panel" role="dialog" aria-modal="true" aria-labelledby="cart-added-title">
        <header class="cart-added-header">
          <button type="button" aria-label="Close cart drawer" data-cart-drawer-close>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
          </button>
          <h2 id="cart-added-title">Added to cart</h2>
          <span aria-label="\${cartCount(items)} items in cart">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12L6 6ZM6 6 5 3H2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.5" fill="currentColor"/><circle cx="18" cy="20" r="1.5" fill="currentColor"/></svg>
            <em>\${cartCount(items)}</em>
          </span>
        </header>
        <div class="cart-added-confirmation">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="m20 6-11 11-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>\${quantity} item has been added to your cart</span>
        </div>
        <article class="cart-added-item">
          <img src="\${escapeHtml(image.url)}" alt="\${escapeHtml(image.alt || product.name)}" />
          <div>
            <h3>\${escapeHtml(drawerProduct.name)}</h3>
            <p>\${formatMoney(price)} / \${escapeHtml(drawerProduct.unit || "each")} | Qty: \${quantity}</p>
            <p>SKU \${escapeHtml(drawerProduct.sku)} / \${escapeHtml(drawerProduct.colorName || "")}</p>
            <small>\${escapeHtml(selectedDealerName)} pickup or coordinated local delivery</small>
          </div>
          <strong>\${formatMoney(itemTotal, price.currency)}</strong>
        </article>
        <section class="cart-added-summary" aria-label="Cart subtotal">
          <strong>\${cartCount(items)} item(s) in cart</strong>
          <div><span>Order subtotal</span><b>\${formatMoney(cartSubtotal(items), price.currency)}</b></div>
          <p>Final taxes and shipping/delivery will be calculated during checkout.</p>
          <a class="button button-accent" href="/cart">View cart</a>
          <button class="button button-outline" type="button" data-cart-drawer-close>Continue shopping</button>
        </section>
        <section class="cart-added-suggestions" aria-labelledby="cart-added-suggestions-title">
          <h3 id="cart-added-suggestions-title">Suggested items with your purchase</h3>
          <div>\${suggestionMarkup()}</div>
        </section>
      </aside>
    \`;
    drawer.querySelectorAll("[data-cart-drawer-close], .cart-added-backdrop").forEach((control) => {
      control.addEventListener("click", () => {
        drawer.classList.remove("open");
        drawer.setAttribute("aria-hidden", "true");
      });
    });
    requestAnimationFrame(() => {
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
    });
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const quantityButton = target.closest(".quantity-stepper button");
    if (quantityButton instanceof HTMLButtonElement && quantityButton.closest(".pdp-purchase-actions")) {
      const label = quantityButton.getAttribute("aria-label") || "";
      const currentQuantity = getDisplayedQuantity(quantityButton);
      const nextQuantity = label.includes("Increase")
        ? currentQuantity + 1
        : Math.max(1, currentQuantity - 1);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      syncQuantityDisplays(nextQuantity);
      return;
    }

    const button = target.closest(".add-cart-button");
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const quantity = findQuantity(button);
    const store = addProductToStore(quantity);
    const variantProduct = getSelectedVariantProduct();
    syncHeaderCartCount(store.cartItems || []);
    button.classList.add("added");
    window.setTimeout(() => button.classList.remove("added"), 650);
    renderDrawer({ quantity, store });
    window.dispatchEvent(new CustomEvent("vanstro-cart-added", { detail: { product: variantProduct, quantity } }));
  }, true);
})();
`
      }}
    />
  );
}

function ProductGalleryZoomScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(() => {
  if (window.__vanstroPdpGalleryZoom) return;
  window.__vanstroPdpGalleryZoom = true;

  const getFrame = (target) => target instanceof Element ? target.closest(".pdp-gallery-frame") : null;

  document.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    const frame = getFrame(event.target);
    if (frame) frame.classList.add("zoomed");
  }, true);

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    const frame = getFrame(event.target);
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    frame.style.setProperty("--pdp-zoom-x", x + "%");
    frame.style.setProperty("--pdp-zoom-y", y + "%");
    frame.classList.add("zoomed");
  }, true);

  document.addEventListener("pointerleave", (event) => {
    const frame = getFrame(event.target);
    if (frame) frame.classList.remove("zoomed");
  }, true);
})();
`
      }}
    />
  );
}

function ProductReviewModalScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(() => {
  if (window.__vanstroPdpReviewModalDelegated) return;
  window.__vanstroPdpReviewModalDelegated = true;
  window.__vanstroPdpReviewLastActiveElement = null;

  const getModal = () => document.querySelector("[data-review-modal]");
  const getGuidelines = (modal) => modal ? modal.querySelector("[data-review-guidelines]") : null;

  const updateRatingStatus = (modal = getModal()) => {
    if (!modal) return;
    const ratingInputs = modal.querySelectorAll('input[name="review-rating"]');
    const ratingStatus = modal.querySelector("[data-review-rating-status]");
    const checked = modal.querySelector('input[name="review-rating"]:checked');
    const value = checked ? Number(checked.value) : 0;
    ratingInputs.forEach((input) => {
      const label = input.closest("label");
      if (label) label.classList.toggle("selected", Number(input.value) <= value);
    });
    const labels = ["", "Poor", "Fair", "Average", "Good", "Excellent"];
    if (ratingStatus && checked) {
      ratingStatus.textContent = value + " out of 5 stars selected. Product is " + labels[value] + ".";
    }
  };

  const updateTopicCount = (modal = getModal()) => {
    if (!modal) return;
    const topicCount = modal.querySelector("[data-review-topic-count]");
    const selected = modal.querySelectorAll("[data-review-topic].selected").length;
    if (topicCount) topicCount.textContent = selected + "/5 topics used";
  };

  const openModal = (event) => {
    if (event) event.preventDefault();
    const modal = getModal();
    if (!modal) return;
    const sheet = modal.querySelector(".pdp-review-modal-sheet");
    window.__vanstroPdpReviewLastActiveElement = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("review-modal-open");
    updateRatingStatus(modal);
    updateTopicCount(modal);
    window.setTimeout(() => {
      const firstField = modal.querySelector('input[name="review-rating"]:checked') || sheet;
      if (firstField && typeof firstField.focus === "function") firstField.focus();
    }, 0);
  };

  const closeModal = () => {
    const modal = getModal();
    if (!modal) return;
    const guidelineDialog = getGuidelines(modal);
    if (guidelineDialog) guidelineDialog.hidden = true;
    modal.hidden = true;
    document.body.classList.remove("review-modal-open");
    const lastActiveElement = window.__vanstroPdpReviewLastActiveElement;
    if (lastActiveElement && typeof lastActiveElement.focus === "function") lastActiveElement.focus();
  };

  const openGuidelines = () => {
    const modal = getModal();
    const guidelineDialog = getGuidelines(modal);
    if (!guidelineDialog) return;
    guidelineDialog.hidden = false;
    const closeButton = guidelineDialog.querySelector("[data-review-guidelines-close]");
    if (closeButton && typeof closeButton.focus === "function") closeButton.focus();
  };

  const closeGuidelines = () => {
    const modal = getModal();
    const guidelineDialog = getGuidelines(modal);
    const guidelineOpen = modal ? modal.querySelector("[data-review-guidelines-open]") : null;
    if (guidelineDialog) guidelineDialog.hidden = true;
    if (guidelineOpen && typeof guidelineOpen.focus === "function") guidelineOpen.focus();
  };

  const setSubmitStatus = (form, message, type = "success") => {
    const status = form.querySelector("[data-review-submit-status]");
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.className = "pdp-review-submit-status " + type;
  };

  const getReviewPayload = (form) => {
    const rating = Number(form.querySelector('input[name="review-rating"]:checked')?.value || 0);
    const topics = Array.from(form.querySelectorAll("[data-review-topic].selected")).map((topic) =>
      topic.textContent.trim()
    );

    return {
      id: "local-review-" + Date.now(),
      productId: form.dataset.productId || "",
      rating,
      title: form.elements["review-title"]?.value?.trim() || "",
      body: form.elements["review-body"]?.value?.trim() || "",
      nickname: form.elements["review-name"]?.value?.trim() || "",
      email: form.elements["review-email"]?.value?.trim() || "",
      topics,
      acceptedTerms: Boolean(form.elements["review-terms"]?.checked),
      status: "pending",
      createdAt: new Date().toISOString()
    };
  };

  const validateReviewPayload = (payload) => {
    if (!payload.rating) return "Please choose an overall rating.";
    if (!payload.body) return "Please enter your review.";
    if (!payload.nickname) return "Please enter your nickname.";
    if (!payload.email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(payload.email)) {
      return "Please enter a valid email address.";
    }
    if (!payload.acceptedTerms) return "Please agree to the Terms of Use.";
    return "";
  };

  const saveReviewSubmission = (payload) => {
    const key = "vanstro-review-submissions";
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    current.push(payload);
    window.localStorage.setItem(key, JSON.stringify(current));
  };

  const submitReview = (form) => {
    const submitButton = form.querySelector("[data-review-submit]");
    const payload = getReviewPayload(form);
    const error = validateReviewPayload(payload);

    if (error) {
      setSubmitStatus(form, error, "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      saveReviewSubmission(payload);
      setSubmitStatus(form, "Review submitted. It is saved in the moderation queue for backend sync.", "success");
      window.dispatchEvent(new CustomEvent("vanstro-review-submitted", { detail: payload }));
      form.reset();
      form.querySelector('input[name="review-rating"][value="4"]')?.click();
      form.querySelectorAll("[data-review-topic].selected").forEach((topic) => {
        topic.classList.remove("selected");
        topic.setAttribute("aria-pressed", "false");
      });
      updateTopicCount(getModal());
    } catch {
      setSubmitStatus(form, "Review could not be saved. Please try again.", "error");
    } finally {
      window.setTimeout(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Submit & Continue";
        }
      }, 650);
    }
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const modal = getModal();

    if (target.closest("[data-review-modal-open]")) {
      openModal(event);
      return;
    }

    if (target.closest("[data-review-modal-close]")) {
      event.preventDefault();
      closeModal();
      return;
    }

    if (target.closest("[data-review-guidelines-open]")) {
      event.preventDefault();
      openGuidelines();
      return;
    }

    if (target.closest("[data-review-guidelines-close]")) {
      event.preventDefault();
      closeGuidelines();
      return;
    }

    const topicButton = target.closest("[data-review-topic]");
    if (topicButton && modal) {
      topicButton.classList.toggle("selected");
      topicButton.setAttribute("aria-pressed", topicButton.classList.contains("selected") ? "true" : "false");
      updateTopicCount(modal);
      return;
    }

    if (modal && target === modal) closeModal();
    if (modal && target === getGuidelines(modal)) closeGuidelines();
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "review-rating") {
      updateRatingStatus(getModal());
    }
  });

  document.addEventListener("submit", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement) || target.id !== "write-review") return;
    event.preventDefault();
    submitReview(target);
  });

  document.addEventListener("keydown", (event) => {
    const modal = getModal();
    const guidelineDialog = getGuidelines(modal);
    if (event.key === "Escape" && guidelineDialog && !guidelineDialog.hidden) {
      closeGuidelines();
      return;
    }
    if (event.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  updateRatingStatus();
  updateTopicCount();
})();
`
      }}
    />
  );
}

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: `/products/${product.slug}`
    }
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const viewModel = createProductDetailViewModel(product, productsWithCommerce);
  const projectProducts = viewModel.completeProjectProducts;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema(product)) }}
      />
      <section className="page-panel pdp-page">
        <div className="container">
          <ProductVariantSyncScript />
          <ProductDealerSyncScript />
          <ProductGalleryZoomScript />
          <ProductReviewModalScript />
          <ProductNativeCartDrawerScript product={product} suggestedProducts={projectProducts} />
          <ProductDetailBreadcrumb viewModel={viewModel} />

          <ProductVariantProvider initialFinishName={viewModel.activeFinishName}>
            <section className="pdp-shell">
            <div className="pdp-media-column">
              <div className="pdp-media-sheet">
                <ProductImageGallery images={product.images} finishOptions={product.finishOptions} />
              </div>
            </div>

            <ProductBuyPanel viewModel={viewModel} dealers={dealers} />

            <ProductDetailMain viewModel={viewModel} />
            </section>
          </ProductVariantProvider>
        </div>
      </section>
    </>
  );
}
