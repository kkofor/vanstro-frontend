/**
 * Maps a dealer account to the Vanstro-owned Moneris Go Cloud terminal at that store.
 * All card present transactions settle on Vanstro's merchant account.
 *
 * MONERIS_GO_TERMINALS=MB-YUAN:66012345,ON-WAT:66012346
 */
export function terminalIdForDealer(dealerId: string | null | undefined): string | null {
  if (!dealerId) return null
  const raw = process.env.MONERIS_GO_TERMINALS || ""
  for (const part of raw.split(",")) {
    const [id, term] = part.split(":").map(s => s.trim())
    if (id && term && id === dealerId) return term
  }
  if (process.env.MONERIS_MOCK === "1" || process.env.MONERIS_MOCK === "true") return "mock-go"
  return null
}

export function goCloudConfigured(): boolean {
  return !!(process.env.MONERIS_GO_API_TOKEN && process.env.MONERIS_GO_IST_CONFIG && (process.env.MONERIS_GO_TERMINALS || process.env.MONERIS_GO_TERMINAL_ID))
}
