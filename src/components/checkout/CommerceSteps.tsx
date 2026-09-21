import { Check } from "lucide-react";
import type { SiteLocale } from "@/lib/i18n/locale";

type CommerceStep = "cart" | "checkout" | "payment";

const STEPS: CommerceStep[] = ["cart", "checkout", "payment"];

export function CommerceSteps({ current, locale }: { current: CommerceStep; locale: SiteLocale }) {
  const french = locale === "fr-CA";
  const labels: Record<CommerceStep, string> = french
    ? { cart: "Panier", checkout: "Renseignements", payment: "Paiement" }
    : { cart: "Cart", checkout: "Details", payment: "Payment" };
  const currentIndex = STEPS.indexOf(current);

  return (
    <nav className="commerce-steps" aria-label={french ? "Étapes de la commande" : "Checkout progress"}>
      <ol>
        {STEPS.map((step, index) => {
          const complete = index < currentIndex;
          const active = step === current;
          return (
            <li className={complete ? "complete" : active ? "active" : undefined} key={step}>
              <span aria-hidden="true">{complete ? <Check size={15} strokeWidth={2.6} /> : index + 1}</span>
              <strong aria-current={active ? "step" : undefined}>{labels[step]}</strong>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
