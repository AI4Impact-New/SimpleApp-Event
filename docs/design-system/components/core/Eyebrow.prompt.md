Kicker above a section heading; optional — omit when the heading stands on its own.
```jsx
<Eyebrow>Certification standards</Eyebrow>
<Eyebrow tone="onDark">Verification</Eyebrow>
<Eyebrow tone="muted" line={false}>What you get by finishing</Eyebrow>
<Eyebrow variant="sentence">Career tracks</Eyebrow>
```
`mono` (default): write the text in sentence case — uppercase comes from styling. Teal with a 24px rule on section headers and heroes; `muted` with `line={false}` inside cards.
`sentence`: quiet body-font kicker, neutral colour, no rule. Legacy; don't mix with `mono` on the same page.
