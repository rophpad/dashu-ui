import { config } from "./config";

export type Plan = "free" | "pro";
export type LicenseState = {
  plan: Plan;
  licensedTo: string | null;
  expiresAt: string | null;
  problem: string | null;
  source: "cloud" | "none";
  editable: false;
};

/** Dashu Cloud validates entitlement from the installation credential. */
export async function resolveLicense(): Promise<LicenseState> {
  const connected = Boolean(config.cloudUrl && config.cloudCredential);
  return {
    plan: connected ? "pro" : "free",
    licensedTo: connected ? "Dashu Cloud installation" : null,
    expiresAt: null,
    problem: connected ? null : "Set DASHU_CLOUD_CREDENTIAL to enable managed AI and Pro features.",
    source: connected ? "cloud" : "none",
    editable: false,
  };
}

export async function isPro(): Promise<boolean> {
  return (await resolveLicense()).plan === "pro";
}
