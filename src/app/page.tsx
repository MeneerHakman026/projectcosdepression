import ParticipationStat from "@/components/ParticipationStat";
import PlaceholderImage from "@/components/PlaceholderImage";
import PreviewLink from "@/components/PreviewLink";
import Section from "@/components/Section";
import SurveyButton from "@/components/SurveyButton";
import TestimonialCard from "@/components/TestimonialCard";
import TriMark from "@/components/TriMark";
import { HOMEPAGE_PREVIEWS } from "@/lib/site-config";
import { PLACEHOLDER_TESTIMONIALS } from "@/lib/testimonials";

/**
 * Homepage prototype — see docs/WEBSITE_REQUIREMENTS.md.
 *
 * Introductory copy throughout this page is a first draft, not
 * Chris-approved final wording (open question in §18). Content flagged
 * "PLACEHOLDER" is also factually unfilled (no real figures, quotes, or
 * photography exist yet) and must not be treated as real data.
 */
export default function Home() {
  return (
    <>
      {/* Arrival — identity, short intro, primary CTA. */}
      <section className="border-b border-border bg-paper-alt">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:gap-10 sm:px-6 sm:py-16 lg:flex-row lg:items-center lg:gap-16 lg:py-24 3xl:max-w-7xl 3xl:gap-20 3xl:py-20 4xl:max-w-[100rem]">
          <div className="lg:w-1/2">
            <TriMark className="mb-4 sm:mb-5" />
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              COS-D
            </p>
            <h1 className="mt-2 max-w-xl text-[2rem] font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl sm:leading-tight 3xl:max-w-2xl 3xl:text-6xl">
              Deciding together what matters in depression care
            </h1>
            {/* Draft intro copy — pending Chris's final wording. */}
            <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-muted sm:mt-5 sm:text-lg 3xl:max-w-xl">
              COS-D brings people with depression, healthcare professionals, and
              informal caregivers together to agree on what should be measured
              in depression research and care.
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
          <div className="lg:w-1/2">
            <PlaceholderImage
              label="Photography of study participants or the research team will go here (final image style still to be determined)."
              aspect="aspect-[16/10] sm:aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* Understand what COS-D is, and why it matters. */}
      <Section id="what-is-cos-d" width="default">
        <div className="3xl:grid 3xl:grid-cols-2 3xl:items-start 3xl:gap-16">
          <div>
            <TriMark className="mb-5" />
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              What is COS-D?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
              COS-D — a Core Outcome Set for Depression — is a research study
              working out which outcomes should be measured in depression
              research and care: the things that actually change for someone.
              It draws on the experience of people with depression, the
              expertise of healthcare professionals, and the perspective of
              informal caregivers.
            </p>
          </div>

          <div className="mt-10 3xl:mt-0 3xl:pt-14">
            <h3 className="text-xl font-semibold text-ink">Why it matters</h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
              Studies and services don&apos;t always measure the same things,
              which makes it hard to compare results or know what really
              helps. Agreeing on a shared set of outcomes makes depression
              research and care easier to compare, combine, and improve — for
              everyone involved.
            </p>
          </div>
        </div>
      </Section>

      {/* Accessible explanation of the study, via the three groups it involves. */}
      <Section width="wide" divider>
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Who&apos;s involved
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
          COS-D only works if it reflects everyone affected by depression —
          not just one point of view.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-3 3xl:gap-12">
          <div className="border-t-4 border-teal pt-5">
            <h3 className="text-lg font-semibold text-ink">
              People with depression
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Lived experience of depression, including what recovery and
              support feel like day to day.
            </p>
          </div>
          <div className="border-t-4 border-mint pt-5">
            <h3 className="text-lg font-semibold text-ink">
              Healthcare professionals
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Clinical expertise from working with depression in practice, and
              what&apos;s realistic to measure.
            </p>
          </div>
          <div className="border-t-4 border-navy pt-5">
            <h3 className="text-lg font-semibold text-ink">
              Informal caregivers
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              The perspective of family and friends who support someone
              through depression.
            </p>
          </div>
        </div>
      </Section>

      {/* Visual break + participation/community statistic. */}
      <Section width="wide" divider>
        <div className="flex flex-col gap-10 md:flex-row md:items-center md:gap-16 3xl:gap-24">
          <div className="md:w-1/2">
            <PlaceholderImage
              label="A promotional image supporting participation will go here."
              aspect="aspect-[4/3]"
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              COS-D is growing
            </h2>
            <p className="mt-3 max-w-sm leading-relaxed text-ink-muted 3xl:max-w-md">
              Every response helps build a clearer, shared picture of what
              matters in depression care.
            </p>
            <div className="mt-8">
              <ParticipationStat />
            </div>
          </div>
        </div>
      </Section>

      {/* Testimonials / community preview. */}
      <Section width="wide" divider>
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          In their own words
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
          Reflections from people taking part in COS-D.
        </p>
        {/* Sample placeholder quotes — see src/lib/testimonials.ts. */}
        <div className="mt-10 grid gap-8 sm:grid-cols-3 3xl:gap-12">
          {PLACEHOLDER_TESTIMONIALS.map((testimonial) => (
            <TestimonialCard
              key={testimonial.role}
              quote={testimonial.quote}
              role={testimonial.role}
              accent={testimonial.accent}
            />
          ))}
        </div>
        <p className="mt-6 text-xs text-ink-muted/80">
          Placeholder quotes shown for layout only — to be replaced with real,
          consented testimonials.
        </p>
      </Section>

      {/* Previews of deeper site content, to encourage exploration. */}
      <Section width="narrow" divider>
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Explore COS-D
        </h2>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Learn more about the study before you take part.
        </p>
        <ul className="mt-8">
          {HOMEPAGE_PREVIEWS.map((preview) => (
            <PreviewLink
              key={preview.href}
              href={preview.href}
              title={preview.label}
              description={preview.description}
            />
          ))}
        </ul>
      </Section>

      {/* Final survey CTA. */}
      <section className="bg-navy">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Ready to take part?
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-paper/80">
            Share your perspective — it will help shape what gets measured in
            future depression research and care.
          </p>
          <div className="mt-8 flex justify-center">
            <SurveyButton />
          </div>
        </div>
      </section>
    </>
  );
}
