import Image from "next/image";
import ParticipationStat from "@/components/ParticipationStat";
import PreviewLink from "@/components/PreviewLink";
import ResearchMetrics from "@/components/ResearchMetrics";
import RichText from "@/components/RichText";
import Section from "@/components/Section";
import SurveyButton from "@/components/SurveyButton";
import TriMark from "@/components/TriMark";
import { ABOUT_SECTION_ID, type HomeContent } from "@/content/home/schema";
import type { Accent } from "@/lib/cms/validation";

const ACCENT_BORDER_CLASSES: Record<Accent, string> = {
  teal: "border-teal",
  mint: "border-mint",
  navy: "border-navy",
};

/**
 * Homepage layout. All wording comes from `content` (edited in the admin,
 * defaults in content/home/defaults.ts); structure and styling stay here.
 * Rendered by both the public homepage and the admin draft preview, so a
 * preview is always the real page.
 *
 * Two kinds of number appear on this page and must stay visually and
 * verbally distinct:
 *  - ResearchMetrics: findings from earlier/background research (PROCEED,
 *    Veal 2024) that explain why COS-D is needed.
 *  - ParticipationStat: current COS-D participation — deliberately empty
 *    until Chris confirms the Step 2 survey is open and supplies a real
 *    figure. Never backfilled with PROCEED or recruitment-target numbers.
 */
export default function HomePage({ content }: { content: HomeContent }) {
  const { hero, about, evidence, development, involved, explore, finalCta } = content;

  return (
    <>
      {/* 1. What is this project? */}
      <section className="border-b border-border bg-paper-alt">
        <div className="mx-auto flex max-w-wide flex-col gap-composition-gap px-4 py-8 sm:px-6 sm:py-14 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-center lg:py-20">
          <div>
            <TriMark className="mb-4 sm:mb-5" />
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              {hero.eyebrow}
            </p>
            <h1 className="mt-2 max-w-2xl text-display font-bold tracking-tight text-ink">
              {hero.heading}
            </h1>
            <p className="mt-4 max-w-2xl text-lead leading-relaxed text-ink-muted sm:mt-5">
              <RichText text={hero.intro} />
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <SurveyButton href={hero.primaryCta.href}>{hero.primaryCta.label}</SurveyButton>
              <a
                href={hero.secondaryCta.href}
                className="btn border-transparent bg-transparent px-0 py-2 text-ink-muted underline underline-offset-4 hover:bg-transparent hover:text-ink sm:border-ink sm:bg-transparent sm:px-6 sm:py-2.5 sm:text-ink sm:no-underline sm:hover:bg-ink sm:hover:text-paper"
              >
                {hero.secondaryCta.label}
              </a>
            </div>
          </div>
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[4/3]">
            <Image
              src={hero.image.src}
              alt={hero.image.alt}
              fill
              preload
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover object-[50%_35%]"
            />
          </div>
        </div>
      </section>

      {/* 2. Why is a Core Outcome Set needed? */}
      {about.visible && (
        <Section id={ABOUT_SECTION_ID} width="default">
          <div className="2xl:grid 2xl:grid-cols-2 2xl:items-start 2xl:gap-[clamp(4rem,-1.8182rem+6.0606vw,5rem)]">
            <div>
              <TriMark className="mb-5" />
              <h2 className="text-heading font-bold tracking-tight text-ink">{about.heading}</h2>
              <p className="mt-4 max-w-3xl text-lead leading-relaxed text-ink-muted">
                <RichText text={about.body} />
              </p>
            </div>

            <div className="mt-10 2xl:mt-0 2xl:pt-14">
              <h3 className="text-subheading font-semibold text-ink">{about.whyHeading}</h3>
              <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
                <RichText text={about.whyBody} />
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* 3. What has previous research shown? */}
      {evidence.visible && (
        <Section width="wide" divider>
          <h2 className="text-heading font-bold tracking-tight text-ink">{evidence.heading}</h2>
          <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
            <RichText text={evidence.intro} />
          </p>

          <div className="mt-10">
            <ResearchMetrics metrics={evidence.metrics} />
          </div>

          <p className="mt-6 max-w-3xl text-xs text-ink-muted/80">
            <RichText text={evidence.footnote} />
          </p>
        </Section>
      )}

      {/* 4 & 6. How is the Core Outcome Set being developed, and where is
          the project currently? Combined into one status section so the
          "how" and the "where" stay next to each other. */}
      {development.visible && (
        <Section width="wide" divider>
          <h2 className="text-heading font-bold tracking-tight text-ink">{development.heading}</h2>
          <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
            <RichText text={development.intro} />
          </p>

          <div className="mt-10 grid gap-grid-gap sm:grid-cols-3">
            {development.steps.map((step, index) => (
              <div
                key={`${index}-${step.step}`}
                className={`border-t-4 pt-5 ${ACCENT_BORDER_CLASSES[step.accent]}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {step.step} · {step.status}
                </p>
                <h3 className="mt-2 text-subheading font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-ink-muted">{step.description}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-3xl text-body leading-relaxed text-ink-muted">
            <RichText text={development.steeringNote} />
          </p>

          <div className="mt-10 border-t border-border pt-8">
            <ParticipationStat
              count={development.participation.count}
              label={development.participation.countLabel}
              emptyHeading={development.participation.emptyHeading}
              emptyBody={development.participation.emptyBody}
            />
          </div>
        </Section>
      )}

      {/* 5. Who contributes to the process? */}
      {involved.visible && (
        <Section width="wide" divider>
          <h2 className="text-heading font-bold tracking-tight text-ink">{involved.heading}</h2>
          <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
            <RichText text={involved.intro} />
          </p>

          <div className="mt-10 grid gap-grid-gap sm:grid-cols-3">
            {involved.groups.map((group, index) => (
              <div
                key={`${index}-${group.title}`}
                className={`border-t-4 ${ACCENT_BORDER_CLASSES[group.accent]} pt-5`}
              >
                <h3 className="text-subheading font-semibold text-ink">{group.title}</h3>
                <p className="mt-2 text-body leading-relaxed text-ink-muted">{group.description}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 7. Where to learn more. */}
      {explore.visible && (
        <Section width="wide" divider>
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] xl:items-start xl:gap-x-[clamp(3rem,-1.5rem+9vw,6rem)]">
            <div>
              <h2 className="text-heading font-bold tracking-tight text-ink">{explore.heading}</h2>
              <p className="mt-3 max-w-sm leading-relaxed text-ink-muted xl:mt-4 xl:text-lead">
                {explore.intro}
              </p>
            </div>
            <ul className="mt-8 xl:mt-0">
              {explore.links.map((link, index) => (
                <PreviewLink
                  key={`${index}-${link.href}`}
                  index={index + 1}
                  href={link.href}
                  title={link.label}
                  description={link.description}
                />
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* Final CTA — links through to the expression-of-interest form. */}
      {finalCta.visible && (
        <section className="bg-navy">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
            <h2 className="text-[clamp(1.875rem,1.3636rem+2.0455vw,3rem)] font-bold tracking-tight text-paper">
              {finalCta.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-body leading-relaxed text-paper/80">
              <RichText
                text={finalCta.body}
                linkClassName="text-paper underline underline-offset-2 hover:text-mint"
              />
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <SurveyButton href={finalCta.primaryCta.href}>{finalCta.primaryCta.label}</SurveyButton>
              <a
                href={finalCta.secondaryCta.href}
                className="btn border-paper/40 bg-transparent text-paper hover:bg-paper hover:text-navy"
              >
                {finalCta.secondaryCta.label}
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
