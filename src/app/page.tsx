import ParticipationStat from "@/components/ParticipationStat";
import PlaceholderImage from "@/components/PlaceholderImage";
import PreviewLink from "@/components/PreviewLink";
import ResearchMetrics from "@/components/ResearchMetrics";
import Section from "@/components/Section";
import SurveyButton from "@/components/SurveyButton";
import TriMark from "@/components/TriMark";
import { DEVELOPMENT_STEPS, type DevelopmentStep } from "@/lib/development-steps";
import { HOMEPAGE_PREVIEWS } from "@/lib/site-config";

const STEP_ACCENT_CLASSES: Record<DevelopmentStep["accent"], string> = {
  teal: "border-teal",
  mint: "border-mint",
  navy: "border-navy",
};

/**
 * Homepage — grounded in docs/CONTENT_SOURCES.md, the project's traced
 * scientific source of truth. Every statistic and status claim below is
 * taken from that document; nothing here is invented or extrapolated.
 *
 * Two kinds of number appear on this page and must stay visually and
 * verbally distinct:
 *  - ResearchMetrics: findings from earlier/background research (PROCEED,
 *    Veal 2024) that explain why COS-D is needed.
 *  - ParticipationStat: current COS-D participation — deliberately empty
 *    until Chris confirms the Step 2 survey is open and supplies a real
 *    figure. Never backfilled with PROCEED or recruitment-target numbers.
 *
 * Terminology note: Veal et al. 2026 (the current protocol) says "carers";
 * Chevance et al. 2020 (PROCEED, background) says "informal caregivers".
 * This page uses "carers" for the current project and "informal
 * caregivers" only when describing PROCEED specifically — final wording
 * still TODO: confirm with Chris (CONTENT_SOURCES.md §1).
 */
export default function Home() {
  return (
    <>
      {/* 1. What is this project? */}
      <section className="border-b border-border bg-paper-alt">
        <div className="mx-auto flex max-w-wide flex-col gap-composition-gap px-4 py-8 sm:px-6 sm:py-14 lg:grid lg:grid-cols-[1.3fr_1fr] lg:items-center lg:py-20">
          <div>
            <TriMark className="mb-4 sm:mb-5" />
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              COS-D
            </p>
            <h1 className="mt-2 max-w-2xl text-display font-bold tracking-tight text-ink">
              Deciding together what matters in depression care
            </h1>
            <p className="mt-4 max-w-2xl text-lead leading-relaxed text-ink-muted sm:mt-5">
              COS-D is working out which outcomes should always be measured in
              depression research — the things that matter most to people
              living with depression, their carers, and healthcare
              professionals — so that different studies can be fairly
              compared.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <SurveyButton />
              <a
                href="#what-is-cos-d"
                className="btn border-transparent bg-transparent px-0 py-2 text-ink-muted underline underline-offset-4 hover:bg-transparent hover:text-ink sm:border-ink sm:bg-transparent sm:px-6 sm:py-2.5 sm:text-ink sm:no-underline sm:hover:bg-ink sm:hover:text-paper"
              >
                Learn what this means
              </a>
            </div>
          </div>
          <div>
            <PlaceholderImage
              label="Photography of study participants or the research team will go here (final image style still to be determined)."
              aspect="aspect-[16/10] sm:aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* 2. Why is a Core Outcome Set needed? */}
      <Section id="what-is-cos-d" width="default">
        <div className="2xl:grid 2xl:grid-cols-2 2xl:items-start 2xl:gap-[clamp(4rem,-1.8182rem+6.0606vw,5rem)]">
          <div>
            <TriMark className="mb-5" />
            <h2 className="text-heading font-bold tracking-tight text-ink">
              What is COS-D?
            </h2>
            <p className="mt-4 max-w-3xl text-lead leading-relaxed text-ink-muted">
              COS-D — a Core Outcome Set for Depression — is a research
              project working out which outcomes should be measured in every
              study of depression treatment: <em>what</em> to measure (such
              as mood, ability to work, or social isolation) and{" "}
              <em>how</em> to measure it (which questionnaire or scale to
              use). It&apos;s being developed with people who have
              depression, their carers, and healthcare professionals — not
              decided for them.
            </p>
          </div>

          <div className="mt-10 2xl:mt-0 2xl:pt-14">
            <h3 className="text-subheading font-semibold text-ink">Why it matters</h3>
            <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
              Depression trials often measure different things, in different
              ways — and frequently miss what patients themselves say matters
              most. That makes it hard to know which treatments really work,
              or to combine results across studies. Agreeing on a shared set
              of outcomes makes depression research easier to compare,
              combine, and improve — for everyone involved.
            </p>
          </div>
        </div>
      </Section>

      {/* 3. What has previous research shown? */}
      <Section width="wide" divider>
        <h2 className="text-heading font-bold tracking-tight text-ink">
          Why this research is needed
        </h2>
        <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
          Two pieces of research make the case for COS-D: a large survey of
          people affected by depression, and a review of how depression
          trials actually measure outcomes. This is the evidence behind the
          project — not participation in COS-D itself.
        </p>

        <div className="mt-10">
          <ResearchMetrics />
        </div>

        <p className="mt-6 max-w-3xl text-xs text-ink-muted/80">
          These figures describe earlier research (the PROCEED study and a
          systematic review of depression trials) that led to COS-D. They are
          not current COS-D participation figures — see below for where the
          project stands today.
        </p>
      </Section>

      {/* 4 & 6. How is the Core Outcome Set being developed, and where is
          the project currently? Combined into one status section so the
          "how" and the "where" stay next to each other. */}
      <Section width="wide" divider>
        <h2 className="text-heading font-bold tracking-tight text-ink">
          How COS-D is being developed
        </h2>
        <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
          COS-D follows three steps. The first is complete and published; the
          second has a published plan but hasn&apos;t opened for
          participation yet; the third hasn&apos;t started.
        </p>

        <div className="mt-10 grid gap-grid-gap sm:grid-cols-3">
          {DEVELOPMENT_STEPS.map((step) => (
            <div
              key={step.step}
              className={`border-t-4 pt-5 ${STEP_ACCENT_CLASSES[step.accent]}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {step.step} · {step.status}
              </p>
              <h3 className="mt-2 text-subheading font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-body leading-relaxed text-ink-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-body leading-relaxed text-ink-muted">
          The process is overseen by a steering committee of 14 people,
          including three with lived experience of depression, who are
          co-authors of the study protocol.
        </p>

        <div className="mt-10 border-t border-border pt-8">
          <ParticipationStat />
        </div>
      </Section>

      {/* 5. Who contributes to the process? */}
      <Section width="wide" divider>
        <h2 className="text-heading font-bold tracking-tight text-ink">
          Who&apos;s involved
        </h2>
        <p className="mt-3 max-w-3xl text-lead leading-relaxed text-ink-muted">
          COS-D only works if it reflects everyone affected by depression —
          not just one point of view.
        </p>

        <div className="mt-10 grid gap-grid-gap sm:grid-cols-3">
          <div className="border-t-4 border-teal pt-5">
            <h3 className="text-subheading font-semibold text-ink">
              People with depression
            </h3>
            <p className="mt-2 text-body leading-relaxed text-ink-muted">
              Lived experience of depression, including what recovery and
              support feel like day to day.
            </p>
          </div>
          <div className="border-t-4 border-mint pt-5">
            <h3 className="text-subheading font-semibold text-ink">
              Healthcare professionals
            </h3>
            <p className="mt-2 text-body leading-relaxed text-ink-muted">
              Clinical expertise from working with depression in practice, and
              what&apos;s realistic to measure.
            </p>
          </div>
          {/* Terminology TODO: Veal et al. 2026 (the current protocol) says
              "carers"; Chevance et al. 2020 (PROCEED, background) says
              "informal caregivers". Using "carers" here as it describes the
              current project — confirm final preference with Chris. */}
          <div className="border-t-4 border-navy pt-5">
            <h3 className="text-subheading font-semibold text-ink">Carers</h3>
            <p className="mt-2 text-body leading-relaxed text-ink-muted">
              The perspective of family, partners, or friends who support
              someone through depression.
            </p>
          </div>
        </div>
      </Section>

      {/* 7. Where to learn more. */}
      <Section width="wide" divider>
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] xl:items-start xl:gap-x-[clamp(3rem,-1.5rem+9vw,6rem)]">
          <div>
            <h2 className="text-heading font-bold tracking-tight text-ink">
              Explore COS-D
            </h2>
            <p className="mt-3 max-w-sm leading-relaxed text-ink-muted xl:mt-4 xl:text-lead">
              Learn more about the study before you take part.
            </p>
          </div>
          <ul className="mt-8 xl:mt-0">
            {HOMEPAGE_PREVIEWS.map((preview, index) => (
              <PreviewLink
                key={preview.href}
                index={index + 1}
                href={preview.href}
                title={preview.label}
                description={preview.description}
              />
            ))}
          </ul>
        </div>
      </Section>

      {/* Final CTA — honest about the survey not being open yet. */}
      <section className="bg-navy">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-[clamp(1.875rem,1.3636rem+2.0455vw,3rem)] font-bold tracking-tight text-paper">
            Want to take part?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-body leading-relaxed text-paper/80">
            The next stage of COS-D — open to people with depression, their
            carers, and healthcare professionals — hasn&apos;t opened yet.
            When it does, this button will take you straight to it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <SurveyButton />
            <a
              href="/study"
              className="btn border-paper/40 bg-transparent text-paper hover:bg-paper hover:text-navy"
            >
              Read more about the study
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
