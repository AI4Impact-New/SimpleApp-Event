import { ArrowRight } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Certificate } from "@/components/cards/Certificate";
import { CheckCard } from "@/components/cards/CheckCard";
import { SectionHeader } from "@/components/navigation/SectionHeader";
import { Section } from "./Section";

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
            <Button size="sm" icon={ArrowRight} href="#">
              Explore certification standards
            </Button>
          </div>
        </div>
        <Certificate />
      </div>
      <div className="mt-(--space-16) grid gap-(--space-4) md:grid-cols-2">
        <CheckCard
          eyebrow="What you get by finishing"
          title="Course completion"
          subtitle="You watched the lessons and submitted the work."
          items={["90%+ of lessons completed", "All weekly assignments submitted", "Quizzes attempted"]}
          footer="Record of completion in your learner profile"
        />
        <CheckCard
          highlighted
          eyebrow="What employers can verify"
          title="Professional certificate"
          subtitle="You proved you can do the work, under assessment."
          items={[
            "Overall assessed score of 70% or more",
            "Capstone passed by an independent reviewer",
            "Capstone defence: a recorded walkthrough and Q&A",
          ]}
          footer="Verifiable certificate with credential ID and QR code"
        />
      </div>
    </Section>
  );
}
