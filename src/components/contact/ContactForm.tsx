"use client";

import Link from "next/link";
import { ContactTopicField } from "@/components/contact/ContactTopicField";
import { DealerSelect } from "@/components/dealer/DealerSelect";
import { PublicSubmissionForm } from "@/components/forms/PublicSubmissionForm";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localeHref } from "@/lib/i18n/routes";
import type { SiteLocale } from "@/lib/i18n/locale";

export function ContactForm({ locale = "en-CA" }: { locale?: SiteLocale }) {
  const french = locale === "fr-CA";

  return (
    <PublicSubmissionForm
      className="form-panel form-grid two contact-page-form"
      id="contact-form"
      kind="contact"
    >
      <div className="contact-page-form-heading form-wide">
        <span className="contact-page-kicker">{french ? "Demande générale" : "General inquiry"}</span>
        <h2>{french ? "Transmettez-nous les renseignements une seule fois; nous acheminerons votre demande à la bonne équipe." : "Send Us the Details Once. We Will Route It."}</h2>
        <p>
          {french
            ? "Indiquez votre numéro de commande, la catégorie de produit, votre ville et votre détaillant préféré, s’il y a lieu."
            : "Include your order number, product category, city, and preferred dealer if you have one."}
        </p>
      </div>

      <Field controlId="name" label={french ? "Nom" : "Name"}>
        <Input name="name" autoComplete="name" required />
      </Field>

      <Field controlId="email" label={french ? "Courriel" : "Email"}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>

      <ContactTopicField locale={locale} />

      <Field controlId="phone" label={french ? "Téléphone" : "Phone"}>
        <Input name="phone" type="tel" autoComplete="tel" />
      </Field>

      <Field controlId="city" label={french ? "Ville / province" : "City / province"}>
        <Input name="city" autoComplete="address-level2" />
      </Field>

      <DealerSelect locale={locale} />

      <Field controlId="orderNumber" className="form-wide" label={french ? "Numéro de commande" : "Order number"}>
        <Input name="orderNumber" placeholder={french ? "Facultatif" : "Optional"} />
      </Field>

      <Field controlId="message" className="form-wide" label="Message">
        <Textarea
          name="message"
          placeholder={french ? "Décrivez votre besoin, notamment le nom des produits, l’emplacement du détaillant ou les échéances." : "Tell us what you need help with, including product names, dealer location, or timing details."}
          required
        />
      </Field>

      <p className="form-wide form-privacy-disclosure">
        {french
          ? "Ce formulaire transmet votre demande et vos coordonnées à VanStro. Si vous choisissez un détaillant ou demandez une coordination locale, VanStro peut communiquer les renseignements raisonnablement nécessaires à ce détaillant pour répondre à votre demande."
          : "This form sends your inquiry and contact details to VanStro. If you select a dealer or request local coordination, VanStro may share information reasonably necessary for that dealer to respond to your request."}{" "}
        <Link href={localeHref("/privacy", locale)}>
          {french ? "Consultez la Politique de confidentialité." : "Read the Privacy Policy."}
        </Link>
      </p>

      <Button type="submit" variant="primary">
        {french ? "Envoyer le message" : "Send message"}
      </Button>
    </PublicSubmissionForm>
  );
}
