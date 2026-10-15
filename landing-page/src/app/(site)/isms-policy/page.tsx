import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";
import { ISMS } from "@/content/legal";

export const metadata: Metadata = {
  title: "ISMS Policy · AI4Impact",
  description: ISMS.lead,
};

export default function IsmsPolicyPage() {
  return <PolicyPage policy={ISMS} href="/isms-policy" />;
}
