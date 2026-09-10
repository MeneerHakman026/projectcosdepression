import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How COS-D collects, uses, stores and protects personal data submitted through the Expression of Interest form.",
};

const CONTACT_EMAIL = "project.cosdepression@gmail.com";

const linkClasses =
  "text-ink underline underline-offset-2 hover:text-accent";

function ContactEmail() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={linkClasses}>
      {CONTACT_EMAIL}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <Hero eyebrow="COS-D" title="Privacy Policy">
        <p className="text-sm text-ink-muted">Last updated: 10 September 2026</p>
      </Hero>

      <Section width="narrow" divider>
        <div className="space-y-12">
          <div>
            <h2 className="text-subheading font-semibold text-ink">
              1. Introduction
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              This Privacy Policy explains how personal data is collected,
              used, stored, and protected when you visit this website or
              submit an Expression of Interest in relation to participating
              in a survey for the development of a Core Outcome Set for
              Depression.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We are committed to protecting your privacy and handling your
              personal data in accordance with applicable data protection
              law, including the General Data Protection Regulation (GDPR).
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Please read this Privacy Policy carefully to understand how we
              handle your information.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              2. Who is responsible for your personal data?
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              The data controller responsible for the processing of your
              personal data is:
            </p>
            <p className="mt-3 leading-relaxed text-ink">
              Mr Christopher Veal
              <br />
              <ContactEmail />
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              If you have any questions about this Privacy Policy or how
              your personal data is handled, please contact us using the
              details above.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              3. What personal data do we collect?
            </h2>
            <p className="mt-4 font-semibold text-ink">
              Information will be collected when you submit an Expression of
              Interest
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              If you choose to complete the Expression of Interest form, we
              may collect the following information:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-muted">
              <li>Name</li>
              <li>Email address</li>
              <li>Country of residence</li>
              <li>Age group</li>
              <li>Preferred language</li>
            </ul>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Submitting an Expression of Interest is voluntary. However, if
              you choose to submit an Expression of Interest, your name and
              email address are required, along with your consent to this
              Privacy Policy; country of residence, age group and preferred
              language are optional. Please do not provide any additional
              personal or sensitive information through the Expression of
              Interest form unless specifically requested.
            </p>
            <p className="mt-4 font-semibold text-ink">
              Information collected automatically
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              The website may also collect limited technical information
              automatically when you visit it, depending on the
              website&rsquo;s hosting and technical configuration. This may
              include information such as your IP address, browser type,
              device information, or website usage information.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              4. Why do we collect and use your personal data?
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We collect the information submitted through the Expression of
              Interest form for the purpose of:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-muted">
              <li>
                recording your interest in participating in the survey to
                select outcome domains for the Core Outcome Set for adults
                with depression;
              </li>
              <li>
                enabling us to contact you in connection with your
                Expression of Interest; and
              </li>
              <li>
                understanding, where optional information is provided, the
                range and characteristics of people expressing an interest.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We will not use your personal data for purposes that are
              incompatible with those described in this Privacy Policy.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              5. What is our legal basis for processing your personal data?
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We process the personal data you voluntarily provide through
              the Expression of Interest form on the basis of your consent,
              in accordance with Article 6(1)(a) of the GDPR.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              By voluntarily submitting your information through the
              Expression of Interest form, you consent to the processing of
              your personal data for the purposes described in this Privacy
              Policy.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              You may withdraw your consent at any time by contacting us at{" "}
              <ContactEmail />. Withdrawal of consent will not affect the
              lawfulness of any processing carried out before consent was
              withdrawn.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              6. Who has access to your personal data?
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Your personal data will only be accessed by individuals who
              are authorised to manage the website and the Expression of
              Interest process and who need access to the information for
              the purposes described in this Privacy Policy.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We will not sell, rent, or share the personal information you
              provide through the Expression of Interest form with third
              parties.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              7. International transfers
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We do not intend to transfer your personal data outside the
              European Economic Area (EEA).
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              If the technical operation of the website or its service
              providers results in the transfer of personal data outside the
              EEA, appropriate safeguards will be used in accordance with
              applicable data protection law.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              8. How long will we keep your personal data?
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Personal data submitted through the Expression of Interest
              form will be retained for no longer than 14 days after the
              Expression of Interest period is closed.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              After this period, all personal data submitted through the
              Expression of Interest process will be securely deleted.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We will not retain this information beyond this period.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              9. How do we protect your personal data?
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We take appropriate technical and organisational measures to
              protect personal data against unauthorised access, loss,
              misuse, alteration, disclosure, or destruction.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              These measures include limiting access to personal data to
              authorised individuals and using appropriate security measures
              for the systems used to collect and store the information.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              However, no method of transmitting information over the
              internet or storing electronic data can be guaranteed to be
              completely secure.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              10. Your data protection rights
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Subject to applicable data protection law, you may have the
              following rights in relation to your personal data:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-muted">
              <li>
                The right of access, to request a copy of the personal data
                we hold about you.
              </li>
              <li>
                The right to erasure, to request deletion of your personal
                data in certain circumstances.
              </li>
              <li>
                The right to withdraw consent, where processing is based on
                consent, you may withdraw your consent at any time.
              </li>
            </ul>
            <p className="mt-3 leading-relaxed text-ink-muted">
              To exercise any of these rights, please contact us at:{" "}
              <ContactEmail />
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              11. Your right to lodge a complaint
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              If you believe that your personal data has been handled in a
              way that does not comply with applicable data protection law,
              you have the right to lodge a complaint with the relevant data
              protection supervisory authority.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              If, after contacting us, you believe that your data protection
              rights have not been respected, you may lodge a complaint with
              the French Data Protection Authority (CNIL). Further
              information is available on the{" "}
              <a
                href="https://www.cnil.fr"
                className={linkClasses}
                target="_blank"
                rel="noopener noreferrer"
              >
                CNIL website (cnil.fr)
              </a>
              . You may submit a complaint either through the online service
              or by post to: CNIL &ndash; 3 Place de Fontenoy &ndash; TSA
              80715 &ndash; 75334 PARIS CEDEX 07.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              12. Automated decision-making
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We do not use the personal data submitted through the
              Expression of Interest form to make decisions based solely on
              automated processing, including profiling, that produce legal
              or similarly significant effects on individuals.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              13. Children
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              This website and the Expression of Interest process are not
              specifically intended for children.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We do not knowingly collect personal data from children unless
              this is specifically required and an appropriate lawful basis
              and any necessary safeguards are in place.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              14. Changes to this Privacy Policy
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              We may update this Privacy Policy from time to time to reflect
              changes to the website, the Expression of Interest process, or
              applicable legal requirements.
            </p>
            <p className="mt-3 leading-relaxed text-ink-muted">
              Any changes will be published on this page, and the &ldquo;Last
              updated&rdquo; date at the top of this Privacy Policy will be
              revised accordingly.
            </p>
          </div>

          <div>
            <h2 className="text-subheading font-semibold text-ink">
              15. Contact us
            </h2>
            <p className="mt-3 leading-relaxed text-ink-muted">
              If you have any questions about this Privacy Policy or how we
              handle your personal data, please contact:
            </p>
            <p className="mt-3 leading-relaxed text-ink">
              Mr Christopher Veal
              <br />
              <ContactEmail />
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
