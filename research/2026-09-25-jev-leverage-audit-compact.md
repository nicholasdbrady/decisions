# Jev leverage audit

**Answer:** Yes. About 60 of the ~102 regex sites in draft-view.ts still make semantic decisions, and Jev can take most of them over. Batch closed-set enum signals and per-field “stated?” nouls into the existing classify call. Use Jev’s candidate-pick and date-part patterns for values. Keep math, dates, and formatting in code. Shapeshift is not a precedent for this: its “offline” mode is a regex classifier, and it keeps all field extraction deterministic.

**Confidence:** medium-high. **Critic:** PASS with gaps.

- Replace with Jev enum signals: groceries title, random mode, expense category, video place, repeat cadence (this also fixes the reminder bug).
- Add a per-field “stated?” noul so Luna runs only when needed.
- For values, pick from regex candidates with Jev (verbatim), or ask Jev for date parts; code resolves them.
- Keep calc, convert, timer, colors, and date formatting in code.
- Use confidence for dashed vs filled chips and for Enter gating.

**Gaps:** no in-app eval; `~typesafe/jev-latest` page is 404 while the docs cite jev-1.13; no local Jev found.

**Next:** a 30-phrase eval spike.
