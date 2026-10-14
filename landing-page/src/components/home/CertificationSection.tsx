import { ArrowRight } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Certificate } from "@/components/cards/Certificate";
import { CheckCard } from "@/components/cards/CheckCard";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { Section } from "@/components/layout/Section";
import { CERT_TIERS } from "@/content/site";

export function CertificationSection() {
  return (
    <Section id="certification">
      <div className="grid items-center gap-(--space-12) lg:grid-cols-[1fr_1.05fr] lg:gap-(--space-16)">
        <div>
          <SectionHeader
            eyebrow="Certification"
            title={
              <>
                Earn proof of what
                <br />
                you can actually build.
              </>
            }
            lead="Professional certificates are issued by the AI4Impact Institute of Applied AI (IIAA) and can be verified by any employer."
          />
          <div className="mt-(--space-8)">
            <Button size="sm" icon={ArrowRight} href="/certification#standards">
              Explore certification standards
            </Button>
          </div>
        </div>
        <Certificate />
      </div>
      <div className="mt-(--space-16) grid gap-(--space-4) md:grid-cols-2">
        <CheckCard {...CERT_TIERS.completion} />
        <CheckCard highlighted {...CERT_TIERS.professional} />
      </div>
    </Section>
  );
}
