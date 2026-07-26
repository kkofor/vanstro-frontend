"use client";

import { useEffect, useMemo, useState } from "react";
import { vanstroApi } from "@/lib/api/api-client";
import type { CustomerAddress, ShippingAddress } from "@/lib/api/api-contract";
import { getCommerceCopy } from "@/lib/i18n/commerce-copy";
import type { SiteLocale } from "@/lib/i18n/locale";

export type AddressDraft = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

export const emptyAddressDraft: AddressDraft = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "CA"
};

const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

type CanadaAddressFieldsetProps = {
  locale: SiteLocale;
  value: AddressDraft;
  onChange: (value: AddressDraft) => void;
  savedAddresses?: CustomerAddress[];
  onSelectSavedAddress?: (address: CustomerAddress) => void;
  idPrefix?: string;
};

export function CanadaAddressFieldset({
  locale,
  value,
  onChange,
  savedAddresses = [],
  onSelectSavedAddress,
  idPrefix = "address"
}: CanadaAddressFieldsetProps) {
  const copy = getCommerceCopy(locale);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string }>>([]);
  const [autocompleteUnavailable, setAutocompleteUnavailable] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 3 || autocompleteUnavailable) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void vanstroApi.addressAutocomplete(trimmed)
        .then((response) => {
          setSuggestions(response.data.suggestions);
        })
        .catch(() => {
          setAutocompleteUnavailable(true);
          setSuggestions([]);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, autocompleteUnavailable]);

  const fieldIds = useMemo(() => ({
    search: `${idPrefix}-search`,
    line1: `${idPrefix}-line1`,
    line2: `${idPrefix}-line2`,
    city: `${idPrefix}-city`,
    province: `${idPrefix}-province`,
    postalCode: `${idPrefix}-postal`
  }), [idPrefix]);

  async function applySuggestion(id: string) {
    try {
      const response = await vanstroApi.addressRetrieve(id);
      onChange({
        addressLine1: response.data.address.addressLine1,
        addressLine2: response.data.address.addressLine2 ?? "",
        city: response.data.address.city,
        province: response.data.address.province,
        postalCode: response.data.address.postalCode,
        country: response.data.address.country
      });
      setSearch("");
      setSuggestions([]);
    } catch {
      setAutocompleteUnavailable(true);
    }
  }

  function mapSavedAddress(address: CustomerAddress): ShippingAddress {
    return {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? undefined,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country
    };
  }

  return (
    <fieldset className="form-panel form-grid two address-fieldset">
      <legend className="form-wide">{copy.address.title}</legend>
      {savedAddresses.length > 0 && onSelectSavedAddress ? (
        <div className="field form-wide">
          <label htmlFor={`${idPrefix}-saved`}>{copy.address.useSaved}</label>
          <select
            id={`${idPrefix}-saved`}
            defaultValue=""
            onChange={(event) => {
              const selected = savedAddresses.find((address) => address.id === event.target.value);
              if (!selected) return;
              onSelectSavedAddress(selected);
              const mapped = mapSavedAddress(selected);
              onChange({
                addressLine1: mapped.addressLine1,
                addressLine2: mapped.addressLine2 ?? "",
                city: mapped.city,
                province: mapped.province,
                postalCode: mapped.postalCode,
                country: mapped.country
              });
            }}
          >
            <option value="">{copy.address.chooseSaved}</option>
            {savedAddresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.label || `${address.firstName} ${address.lastName}`} — {address.addressLine1}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {!autocompleteUnavailable ? (
        <div className="field form-wide">
          <label htmlFor={fieldIds.search}>{copy.address.search}</label>
          <input
            id={fieldIds.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.address.searchPlaceholder}
            autoComplete="off"
          />
          {searching ? <p className="product-meta">{copy.address.searching}</p> : null}
          {suggestions.length > 0 ? (
            <ul className="address-suggestions">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button type="button" className="text-link" onClick={() => void applySuggestion(suggestion.id)}>
                    {suggestion.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="product-meta form-wide">{copy.address.manualFallback}</p>
      )}
      <div className="field form-wide">
        <label htmlFor={fieldIds.line1}>{copy.address.line1}</label>
        <input
          id={fieldIds.line1}
          value={value.addressLine1}
          onChange={(event) => onChange({ ...value, addressLine1: event.target.value })}
          autoComplete="address-line1"
          required
        />
      </div>
      <div className="field form-wide">
        <label htmlFor={fieldIds.line2}>{copy.address.line2}</label>
        <input
          id={fieldIds.line2}
          value={value.addressLine2}
          onChange={(event) => onChange({ ...value, addressLine2: event.target.value })}
          autoComplete="address-line2"
        />
      </div>
      <div className="field">
        <label htmlFor={fieldIds.city}>{copy.address.city}</label>
        <input
          id={fieldIds.city}
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
          autoComplete="address-level2"
          required
        />
      </div>
      <div className="field">
        <label htmlFor={fieldIds.province}>{copy.address.province}</label>
        <select
          id={fieldIds.province}
          value={value.province}
          onChange={(event) => onChange({ ...value, province: event.target.value })}
          autoComplete="address-level1"
          required
        >
          <option value="">{copy.address.chooseProvince}</option>
          {PROVINCES.map((province) => (
            <option key={province} value={province}>{province}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={fieldIds.postalCode}>{copy.address.postalCode}</label>
        <input
          id={fieldIds.postalCode}
          value={value.postalCode}
          onChange={(event) => onChange({ ...value, postalCode: event.target.value.toUpperCase() })}
          autoComplete="postal-code"
          required
        />
      </div>
    </fieldset>
  );
}
