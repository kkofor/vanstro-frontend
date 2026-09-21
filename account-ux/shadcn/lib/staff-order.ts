/**
 * Staff order JSON: public/staff shape plus live risk score.
 */
import { staffOrder, type Order } from "./orders"
import { assessRisk, declineLabel, getRiskStore, type RiskStore } from "./risk"

export async function staffOrderView(o: Order, all: Order[], store?: RiskStore) {
  const risk = store ?? await getRiskStore()
  const hold = o.riskHold ?? risk.holds[o.orderNo] ?? null
  const base = staffOrder(o)
  return {
    ...base,
    riskHold: hold,
    risk: assessRisk(o, all, risk),
    paymentAttempts: base.paymentAttempts.map(a => ({ ...a, label: declineLabel(a.code) })),
  }
}
