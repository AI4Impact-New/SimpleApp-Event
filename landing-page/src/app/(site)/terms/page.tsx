import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";
import { TERMS } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of Use · AI4Impact",
  description: TERMS.lead,
};

export default function TermsPage() {
  return <PolicyPage policy={TERMS} href="/terms" />;
}
