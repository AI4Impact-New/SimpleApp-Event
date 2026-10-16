import type { Metadata } from "next";
import { PolicyPage } from "@/components/legal/PolicyPage";
import { REFUND } from "@/content/legal";

export const metadata: Metadata = {
  title: "Refund Policy · AI4Impact",
  description: REFUND.lead,
};

export default function RefundPolicyPage() {
  return <PolicyPage policy={REFUND} href="/refund-policy" />;
}
