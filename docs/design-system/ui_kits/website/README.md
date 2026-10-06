# AI4Impact website — UI kit

Click-through recreation of the AI4Impact marketing site, built from the two supplied full-page screenshots (home and /courses). No source code or Figma was available, so values were measured from the 2× captures.

Screens
- **Home** (`HomeScreen` in HomeSections.jsx, hero in HomeHero.jsx) — hero, career tracks, track finder, how it works, projects, certification, Programme+, trainers, compare table, guidance form.
- **Career tracks** (`CoursesScreen.jsx`) — dark page hero, Build / Data / Product track groups, compare, guidance form.

Interactions: nav "Career tracks" switches page; Programme+ / Certification / Trainers scroll to home sections; finder options update the best-fit card; guidance form requires the consent box then shows a confirmation; announcement CTA and "Free career guidance" jump to the form. "Hire from us" and "Student login" have no screen in the source and are inert.

Approximations: hero-visual checklist rows 2–3 are hidden behind the mentor card in the screenshot and were filled in; trainer specialisms were truncated in the source and completed plausibly; the certificate QR is a placeholder.
