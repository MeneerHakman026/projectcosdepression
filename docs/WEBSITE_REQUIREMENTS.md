# COS-D Website Requirements

## 1. Purpose

The COS-D website is the main public landing page for people who are referred to the study.

The website should:

- provide a clear and welcoming introduction to the COS-D project;
- explain the study in accessible language;
- motivate visitors to participate;
- build trust and legitimacy;
- provide clear access to the externally hosted study/survey;
- support promotional material such as testimonials, videos and participation updates.

The website should not primarily feel like an academic portfolio or a highly technical research website.

The primary experience should be simple, welcoming and participant-facing.

---

## 2. Target Audience

The website targets people interacting with the COS-D study, with a particular focus on younger adults aged approximately 18–35.

The experience must therefore work especially well on mobile devices.

### Design principle

**Mobile-first.**

Design for a small mobile viewport first and progressively enhance the experience for tablet and desktop.

The desktop version should not simply be a stretched mobile layout, but both experiences should share the same content and visual identity.

---

## 3. Core User Journey

The primary visitor journey should be:

1. Arrive on the website.
2. Immediately understand what COS-D is.
3. Understand why the study matters.
4. Feel that the project is credible and approachable.
5. See evidence of participation/community where appropriate.
6. Learn more if desired.
7. Easily find the main call-to-action.
8. Continue to the externally hosted study/survey.

The primary CTA throughout the website is:

**Take the survey**

The survey itself will be hosted externally.

---

## 4. Proposed Information Architecture

The website should support the following content areas:

- Home
- About the Project
- Study Information
- FAQs
- Depression Dictionary
- Testimonials / Community
- Publications
- Media / Webinars
- Take the Survey

Most pages are expected to contain approximately one page of content.

Where pages contain more content, continuous vertical scrolling is preferred rather than unnecessarily splitting information across many subpages.

The exact navigation structure can be simplified during design if this improves usability, especially on mobile.

---

## 5. Homepage

The homepage is the main introduction to COS-D.

It should contain:

### Header / Navigation

- COS-D logo
- navigation
- clear access to the survey
- consistent across the website

### Hero / Title Area

- COS-D identity
- short, clear introduction
- strong but welcoming visual presentation
- prominent call-to-action

### Study Introduction

A simple explanation of:

- what COS-D is;
- what the study is about;
- why it matters.

Avoid overly academic or complicated language.

### Participation / Community

The homepage may contain:

- testimonials;
- participant stories;
- promotional images;
- short videos;
- slogans or quotes.

These should support trust and participation without making the website feel commercial.

### Participation Update

Allow space for a prominent study update such as:

> 4,000 people have participated so far.

This can be used to communicate momentum and community involvement.

### Content Previews

The homepage may show small amounts of content from other parts of the website to encourage exploration.

### Main CTA

**Take the survey**

This should be one of the most visually prominent actions on the page.

---

## 6. Visual Identity

### Primary Colours

Use the existing COS-D logo palette:

- `#4f9aa7`
- `#9fd0c2`
- `#1c2c43`

Use these alongside:

- black / near-black text;
- white;
- subtle neutral background colours where appropriate.

Avoid introducing many additional saturated colours.

### Character

The website should feel:

- welcoming;
- trustworthy;
- understated;
- professional;
- minimal;
- contemporary;
- approachable;
- serious without feeling cold.

Avoid making the website feel:

- overly academic;
- corporate;
- clinical;
- childish;
- gamified;
- excessively colourful;
- like a SaaS/startup landing page.

---

## 7. COS-D Logo

The COS-D logo is an important part of the visual identity.

The logo represents three tears associated with the three target groups:

1. people with depression;
2. healthcare professionals;
3. informal caregivers.

These three elements come together into a single tear.

This concept may inspire subtle visual elements throughout the website, but should not be overused or made overly literal.

The original logo itself should remain clearly recognizable.

---

## 8. Imagery

The website should balance information and imagery.

Images should help:

- make the project feel human;
- break up longer sections of text;
- make the study approachable;
- support the participant-facing nature of the site.

Avoid generic corporate imagery where possible.

The final image style still needs to be determined.

---

## 9. Video

Videos may be hosted externally, most likely on YouTube.

The website should support embedded video where appropriate.

Embedded video should:

- work responsively;
- not autoplay;
- remain visually consistent with the site;
- not dominate the experience unnecessarily.

---

## 10. Mobile Experience

Mobile is a first-class experience, not a secondary version of the website.

Requirements:

- responsive navigation;
- comfortable touch targets;
- readable typography without zooming;
- sensible text line lengths;
- vertically flowing content;
- prominent survey CTA;
- responsive images;
- responsive embedded videos;
- no horizontal scrolling;
- good performance on mobile connections.

Continuous vertical scrolling should be preferred where appropriate.

---

## 11. Interaction & Animation

Keep interaction restrained.

Allowed:

- subtle hover states;
- subtle focus states;
- small transitions;
- simple navigation interactions;
- gentle visual feedback.

Avoid:

- excessive animation;
- gamification;
- distracting motion;
- unnecessary carousels;
- interaction patterns that make the project feel less serious.

---

## 12. Pop-ups

Do not use promotional pop-ups or modal interruptions.

The website should feel legitimate and trustworthy.

Important calls-to-action should be incorporated naturally into the page layout instead.

---

## 13. Accessibility

Accessibility should be considered from the start.

The implementation should include:

- semantic HTML;
- logical heading hierarchy;
- keyboard-accessible navigation;
- visible focus states;
- sufficient colour contrast;
- descriptive link labels;
- alt text support for meaningful images;
- responsive text;
- accessible embedded media where possible.

---

## 14. Technical Direction

Current stack:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Next.js App Router

Development:

- local development first;
- deployment to Vercel later.

Prefer:

- Server Components by default;
- reusable components where they genuinely reduce duplication;
- minimal dependencies;
- simple maintainable code;
- static content where practical.

Do not introduce unless requirements change:

- database;
- CMS;
- authentication;
- backend;
- animation library;
- unnecessary third-party dependencies.

---

## 15. Content Management

For the initial version, content should remain simple and code-based.

Structured content such as testimonials, publications or media items can live in TypeScript data files if useful.

The architecture should make it straightforward to replace placeholder content with Chris's final content later.

---

## 16. Current Inspiration

### Primary inspiration

Einstein Youth Mental Health

Used as inspiration for:
- welcoming research communication;
- information/image balance;
- contemporary research-project presentation.

Do not directly copy its branding or layout.

### Additional references provided by Chris

Wellcome — Mental Health

Used as inspiration for:
- information/image balance.

MQ Mental Health Research

Used as inspiration for:
- information/image balance.

These references are directional rather than strict design specifications.

---

## 17. Prototype Priorities

The first prototype is intended to establish direction rather than provide a finished website.

Prioritize:

1. mobile-first visual direction;
2. COS-D branding and colour palette;
3. homepage layout;
4. clear study introduction;
5. strong "Take the survey" CTA;
6. navigation concept;
7. image/text balance;
8. overall feeling of trust and accessibility.

Do not spend significant time polishing secondary pages before the homepage direction has been reviewed.

The first prototype should primarily answer:

**Does this feel like COS-D, and would a potential participant understand what to do?**

---

## 18. Open Questions for Chris

The following still require confirmation or content:

- Final homepage introduction text
- Final project description
- Exact navigation labels
- Survey URL
- Testimonials
- Participant count / study statistics
- Photography / imagery
- Videos
- About Project content
- Study Information content
- FAQ content
- Depression Dictionary content
- Publications
- Media / webinar content
- University / partner logos
- Footer information
- Contact details