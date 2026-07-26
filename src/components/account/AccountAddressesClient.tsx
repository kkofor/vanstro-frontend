"use client";

import { FormEvent, useEffect, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { CanadaAddressFieldset, emptyAddressDraft } from "@/components/address/CanadaAddressFieldset";
import { vanstroApi } from "@/lib/api/api-client";
import type { CustomerAddress } from "@/lib/api/api-contract";
import { useLocale } from "@/components/i18n/LocaleProvider";
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
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [draft, setDraft] = useState(emptyAddress);
  const [addressFields, setAddressFields] = useState(emptyAddressDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAddresses() {
    setLoading(true);
    try {
      const response = await vanstroApi.getAccountAddresses();
      setAddresses(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, []);

  function resetForm() {
    setDraft(emptyAddress);
    setAddressFields(emptyAddressDraft);
    setEditingId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
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
      resetForm();
      await loadAddresses();
    } catch {
      setMessage(copy.storefront.requestError);
    }
  }

  async function removeAddress(addressId: string) {
    setMessage("");
    try {
      await vanstroApi.deleteAccountAddress(addressId);
      if (editingId === addressId) resetForm();
      setMessage(copy.account.addressDeleted);
      await loadAddresses();
    } catch {
      setMessage(copy.storefront.requestError);
    }
  }

  async function makeDefault(addressId: string) {
    setMessage("");
    try {
      await vanstroApi.updateAccountAddress(addressId, { isDefault: true });
      setMessage(copy.account.addressUpdated);
      await loadAddresses();
    } catch {
      setMessage(copy.storefront.requestError);
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
  }

  return (
    <AccountShell active="addresses" locale={locale}>
      {loading ? <p>{copy.account.loading}</p> : null}
      <ul className="account-summary-list">
        {addresses.map((address) => (
          <li key={address.id}>
            <strong>
              {address.label || `${address.firstName} ${address.lastName}`}
              {address.isDefault ? ` (${copy.account.defaultAddress})` : ""}
            </strong>
            <p>
              {address.addressLine1}
              {address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.province}{" "}
              {address.postalCode}
            </p>
            <div className="account-actions">
              <button type="button" className="text-link" onClick={() => startEdit(address)}>{copy.account.editAddress}</button>
              {!address.isDefault ? (
                <button type="button" className="text-link" onClick={() => void makeDefault(address.id)}>{copy.account.setDefault}</button>
              ) : null}
              <button type="button" className="text-link" onClick={() => void removeAddress(address.id)}>{copy.account.deleteAddress}</button>
            </div>
          </li>
        ))}
      </ul>
      <form className="form-panel form-grid two" onSubmit={submit}>
        <h3>{editingId ? copy.account.saveAddress : copy.account.addAddress}</h3>
        <div className="field"><label>{copy.common.firstName}</label><input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} required /></div>
        <div className="field"><label>{copy.common.lastName}</label><input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} required /></div>
        <div className="field"><label>{copy.checkout.phone}</label><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
        <div className="field form-wide">
          <CanadaAddressFieldset locale={locale} value={addressFields} onChange={setAddressFields} idPrefix="account-address" />
        </div>
        <label className="field form-wide">
          <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
          {` ${copy.account.defaultAddress}`}
        </label>
        <button className="button button-primary" type="submit">{editingId ? copy.account.saveAddress : copy.account.addAddress}</button>
        {editingId ? <button className="button button-secondary" type="button" onClick={resetForm}>{copy.account.cancelEdit}</button> : null}
        {message ? <p role="status">{message}</p> : null}
      </form>
    </AccountShell>
  );
}
