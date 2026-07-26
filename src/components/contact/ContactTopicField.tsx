"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SiteLocale } from "@/lib/i18n/locale";
import { localeHref } from "@/lib/i18n/routes";

const CAREERS_TOPIC = "careers";

export function ContactTopicField({ locale }: { locale: SiteLocale }) {
  const french = locale === "fr-CA";
  const [topic, setTopic] = useState("");
  const selectRef = useRef<HTMLSelectElement>(null);
  const disclosureId = "careers-privacy-disclosure";

  useEffect(() => {
    const requestedTopic = new URLSearchParams(window.location.search).get("topic");
    if (requestedTopic === CAREERS_TOPIC) setTopic(CAREERS_TOPIC);

    const form = selectRef.current?.form;
    if (!form) return;

    const resetTopic = () => setTopic("");
    form.addEventListener("reset", resetTopic);
    return () => form.removeEventListener("reset", resetTopic);
  }, []);

  return (
    <div className="field">
      <label htmlFor="topic">{french ? "Sujet" : "Topic"}</label>
      <select
        ref={selectRef}
        id="topic"
        name="topic"
        required
        value={topic}
        onChange={(event) => setTopic(event.currentTarget.value)}
        aria-describedby={topic === CAREERS_TOPIC ? disclosureId : undefined}
      >
        <option value="" disabled>
          {french ? "Sélectionnez un sujet" : "Select a topic"}
        </option>
        <option value="products">{french ? "Question sur un produit" : "Product question"}</option>
        <option value="orders">{french ? "Soutien à une commande" : "Order support"}</option>
        <option value="dealer-service">{french ? "Orientation vers un détaillant" : "Dealer service routing"}</option>
        <option value="dealer-program">{french ? "Programme pour les détaillants" : "Dealer program"}</option>
        <option value={CAREERS_TOPIC}>{french ? "Carrières" : "Careers"}</option>
        <option value="website-support">{french ? "Soutien du site Web" : "Website support"}</option>
      </select>
      <p
        id={disclosureId}
        className="form-privacy-disclosure contact-careers-privacy-disclosure"
        hidden={topic !== CAREERS_TOPIC}
      >
        {french
          ? "Pour une demande relative aux carrières, VanStro utilise les renseignements transmis pour évaluer votre demande, communiquer avec vous et prendre des décisions de recrutement ou d’engagement. Nous les conservons pendant ce processus, puis seulement dans la mesure nécessaire aux fins pour lesquelles ils ont été recueillis, au respect de nos obligations légales et contractuelles et au règlement des différends."
          : "For a careers inquiry, VanStro uses the information you submit to evaluate your inquiry, communicate with you, and make recruitment or engagement decisions. We retain it during that process and afterward only as necessary for the purposes for which it was collected, to meet legal and contractual obligations, and to resolve disputes."}{" "}
        <Link href={localeHref("/privacy", locale)}>
          {french ? "Consultez la Politique de confidentialité." : "Read the Privacy Policy."}
        </Link>
      </p>
    </div>
  );
}
