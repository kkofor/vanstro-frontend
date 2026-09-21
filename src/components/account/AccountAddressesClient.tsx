"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { AccountShell } from "@/components/account/AccountShell";
import { useCustomerSession } from "@/components/account/CustomerSessionProvider";
import { CanadaAddressFieldset, emptyAddressDraft } from "@/components/address/CanadaAddressFieldset";
import { CommercePageSkeleton, CommerceStatePanel } from "@/components/ui/CommerceStatePanel";
import { vanstroApi } from "@/lib/api/api-client";
import type { CustomerAddress } from "@/lib/api/api-contract";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getAccountCopy } from "@/lib/i18n/account-copy";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";

const emptyAddress = {
  label: "",
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "CA",
  isDefault: false
};

export function AccountAddressesClient({ locale: explicitLocale }: { locale?: SiteLocale }) {
  const { locale: contextLocale } = useLocale();
  const locale = explicitLocale ?? contextLocale;
  const copy = getCommerceCopy(locale);
  const accountCopy = getAccountCopy(locale);
  const session = useCustomerSession();
  const requestGeneration = useRef(0);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [draft, setDraft] = useState(emptyAddress);
  const [addressFields, setAddressFields] = useState(emptyAddressDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const confirmDeleteRefs = useRef(new Map<string, HTMLButtonElement>());

  const loadAddresses = useCallback(() => {
    const generation = ++requestGeneration.current;
    setLoading(true);
    setLoadError(false);
    void vanstroApi.getAccountAddresses()
      .then((response) => {
        if (generation === requestGeneration.current) setAddresses(response.data);
      })
      .catch(() => {
        if (generation === requestGeneration.current) setLoadError(true);
      })
      .finally(() => {
        if (generation === requestGeneration.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated" || !session.user?.id) {
      requestGeneration.current += 1;
      setAddresses([]);
      setLoading(true);
      setLoadError(false);
      setMessage("");
      resetForm();
      return;
    }
    loadAddresses();
    return () => {
      requestGeneration.current += 1;
    };
  }, [loadAddresses, session.status, session.user?.id]);

  useEffect(() => {
    if (deleteCandidateId) confirmDeleteRefs.current.get(deleteCandidateId)?.focus();
  }, [deleteCandidateId]);

  function resetForm() {
    setDraft(emptyAddress);
    setAddressFields(emptyAddressDraft);
    setEditingId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPendingAction("save");
    const payload = {
      ...draft,
      addressLine1: addressFields.addressLine1,
      addressLine2: addressFields.addressLine2 || undefined,
      city: addressFields.city,
      province: addressFields.province,
      postalCode: addressFields.postalCode,
      country: addressFields.country
    };
    try {
      if (editingId) {
        await vanstroApi.updateAccountAddress(editingId, payload);
        setMessage(copy.account.addressUpdated);
      } else {
        await vanstroApi.createAccountAddress(payload);
        setMessage(copy.account.addressSaved);
      }
      setMessageTone("success");
      resetForm();
      loadAddresses();
    } catch {
      setMessageTone("error");
      setMessage(copy.storefront.requestError);
    } finally {
      setPendingAction(null);
    }
  }

  async function runAddressAction(addressId: string, action: "delete" | "default") {
    setMessage("");
    setPendingAction(`${action}:${addressId}`);
    try {
      if (action === "delete") {
        await vanstroApi.deleteAccountAddress(addressId);
        if (editingId === addressId) resetForm();
        setMessage(copy.account.addressDeleted);
      } else {
        await vanstroApi.updateAccountAddress(addressId, { isDefault: true });
        setMessage(copy.account.addressUpdated);
      }
      setMessageTone("success");
      if (action === "delete") {
        setDeleteCandidateId(null);
        requestAnimationFrame(() => headingRef.current?.focus());
      }
      loadAddresses();
    } catch {
      setMessageTone("error");
      setMessage(copy.storefront.requestError);
    } finally {
      setPendingAction(null);
    }
  }

  function startEdit(address: CustomerAddress) {
    setEditingId(address.id);
    setDraft({
      label: address.label ?? "",
      firstName: address.firstName,
      lastName: address.lastName,
      phone: address.phone ?? "",
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault
    });
    setAddressFields({
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country
    });
    requestAnimationFrame(() => {
      const firstField = formRef.current?.querySelector<HTMLInputElement>("#address-first-name");
      firstField?.focus();
      firstField?.scrollIntoView({ block: "center" });
    });
  }

  function cancelDelete(addressId: string) {
    setDeleteCandidateId(null);
    requestAnimationFrame(() => deleteButtonRefs.current.get(addressId)?.focus());
  }

  function cancelEdit() {
    const addressId = editingId;
    resetForm();
    if (addressId) requestAnimationFrame(() => editButtonRefs.current.get(addressId)?.focus());
  }

  return (
    <AccountShell active="addresses" locale={locale}>
      <header className="account-section-heading account-section-heading-rich">
        <div><h2 ref={headingRef} tabIndex={-1}>{accountCopy.addresses.title}</h2><p>{accountCopy.addresses.intro}</p></div>
        {!loading && !loadError ? <span className="account-count-badge">{accountCopy.addresses.count(addresses.length)}</span> : null}
      </header>
      {loading ? <CommercePageSkeleton rows={2} label={copy.account.loading} /> : null}
      {!loading && loadError ? (
        <CommerceStatePanel tone="error" title={copy.account.loadErrorTitle} body={copy.account.loadErrorBody} actions={<button className="button button-primary" type="button" onClick={loadAddresses}>{copy.account.retry}</button>} />
      ) : null}
      {!loading && !loadError && addresses.length === 0 ? (
        <CommerceStatePanel compact title={copy.account.addressesEmptyTitle} body={copy.account.addressesEmptyBody} />
      ) : null}
      {!loading && !loadError && addresses.length > 0 ? (
        <div className="address-list">
          {addresses.map((address) => (
            <article className="address-card" key={address.id}>
              <header>
                <span className="address-icon"><MapPin size={19} strokeWidth={2} aria-hidden="true" /></span>
                <div>
                  <strong>{address.label || `${address.firstName} ${address.lastName}`}</strong>
                  {address.isDefault ? <span className="status-badge status-default">{copy.account.defaultAddress}</span> : null}
                </div>
              </header>
              <dl className="address-card-details">
                <div><dt>{accountCopy.addresses.recipient}</dt><dd>{address.firstName} {address.lastName}</dd></div>
                <div><dt>{copy.address.title}</dt><dd>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}<br />{address.city}, {address.province} {address.postalCode}{address.country !== "CA" ? <><br />{address.country}</> : null}</dd></div>
                {address.phone ? <div><dt>{accountCopy.addresses.phone}</dt><dd>{address.phone}</dd></div> : null}
              </dl>
              <div className="address-actions">
                <button ref={(node) => { if (node) editButtonRefs.current.set(address.id, node); else editButtonRefs.current.delete(address.id); }} type="button" disabled={Boolean(pendingAction)} onClick={() => startEdit(address)}><Pencil size={16} aria-hidden="true" />{copy.account.editAddress}</button>
                {!address.isDefault ? <button type="button" disabled={Boolean(pendingAction)} onClick={() => void runAddressAction(address.id, "default")}><Star size={16} aria-hidden="true" />{copy.account.setDefault}</button> : null}
                {deleteCandidateId === address.id ? (
                  <span className="address-delete-confirm" role="group" aria-label={copy.account.deleteAddress}>
                    {address.isDefault ? <small>{accountCopy.addresses.defaultDeleteWarning}</small> : null}
                    <button ref={(node) => { if (node) confirmDeleteRefs.current.set(address.id, node); else confirmDeleteRefs.current.delete(address.id); }} className="danger" type="button" disabled={Boolean(pendingAction)} onClick={() => void runAddressAction(address.id, "delete")}>{pendingAction === `delete:${address.id}` ? accountCopy.addresses.removing : accountCopy.addresses.confirmDelete}</button>
                    <button type="button" disabled={Boolean(pendingAction)} onClick={() => cancelDelete(address.id)}>{copy.account.cancelEdit}</button>
                  </span>
                ) : (
                  <button ref={(node) => { if (node) deleteButtonRefs.current.set(address.id, node); else deleteButtonRefs.current.delete(address.id); }} className="danger" type="button" disabled={Boolean(pendingAction)} onClick={() => setDeleteCandidateId(address.id)} aria-label={`${copy.account.deleteAddress}: ${address.label || address.addressLine1}`}><Trash2 size={16} aria-hidden="true" />{copy.account.deleteAddress}</button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <form ref={formRef} className="account-form account-address-form" onSubmit={submit} aria-busy={pendingAction === "save"}>
        <header className="form-section-heading form-wide">
          <span className="form-section-icon"><Plus size={19} aria-hidden="true" /></span>
          <div>
            <h3>{editingId ? accountCopy.addresses.editTitle : accountCopy.addresses.addTitle}</h3>
            <p>{editingId ? accountCopy.addresses.editBody : accountCopy.addresses.addBody}</p>
          </div>
        </header>
        <div className="field"><label htmlFor="address-first-name">{copy.common.firstName}</label><input id="address-first-name" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} autoComplete="given-name" required /></div>
        <div className="field"><label htmlFor="address-last-name">{copy.common.lastName}</label><input id="address-last-name" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} autoComplete="family-name" required /></div>
        <div className="field"><label htmlFor="address-phone">{copy.checkout.phone}</label><input id="address-phone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} autoComplete="tel" inputMode="tel" /></div>
        <div className="field"><label htmlFor="address-label">{accountCopy.addresses.label}</label><input id="address-label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder={accountCopy.addresses.labelPlaceholder} /></div>
        <div className="field form-wide"><CanadaAddressFieldset locale={locale} value={addressFields} onChange={setAddressFields} idPrefix="account-address" /></div>
        <aside className="account-address-guidance form-wide">
          <strong>{accountCopy.addresses.guidanceTitle}</strong>
          <ul>{accountCopy.addresses.guidanceItems.map((item) => <li key={item}>{item}</li>)}</ul>
        </aside>
        <label className="checkbox-field form-wide"><input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })} /><span>{copy.account.defaultAddress}</span></label>
        {message ? <p className={`form-message form-message-${messageTone} form-wide`} role={messageTone === "error" ? "alert" : "status"}>{message}</p> : null}
        <div className="form-actions form-wide">
          <button className="button button-primary" disabled={pendingAction === "save"} type="submit">{pendingAction === "save" ? copy.auth.wait : editingId ? copy.account.saveAddress : copy.account.addAddress}</button>
          {editingId ? <button className="button button-secondary" type="button" onClick={cancelEdit}>{copy.account.cancelEdit}</button> : null}
        </div>
      </form>
    </AccountShell>
  );
}
