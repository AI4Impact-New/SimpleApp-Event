import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";
import { PRIVACY } from "@/content/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · AI4Impact",
  description: PRIVACY.lead,
};

export default function PrivacyPage() {
  return <PolicyPage policy={PRIVACY} href="/privacy" />;
}
