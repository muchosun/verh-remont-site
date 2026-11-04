# Reference Quiz QA - 2026-11-04

Source: https://lokta.remont-i-otdelka-kvartir.ru/
Implementation: https://verhremont.ru/remont-kvartir/

## Scope

Reference structure adapted to VERH with its own photographs, contacts, legal details, Onest font and supported claims. No competitor identity, unsupported savings or completion-time promises copied. This is not a pixel-identical copy of third-party content.

## Comparisons

Source and implementation screenshots were reviewed together in five pairs: desktop hero, repair cards, contact; mobile hero and contact. Evidence lives in ../reports relative to the checkout parent, files prefixed lokta-reference- and reference-build- dated 20261104. The source mobile contact view renders scaled desktop content; that defect is intentionally not copied.

Preserved: white/charcoal with restrained gold controls, photographic hero, benefits and calculation CTA, fullscreen quiz, progress badge, native choices, four repair images, back/next navigation, optional name and final phone.

Intentional differences: own brand/assets and font, safe claims, readable mobile fields, regional rejection ends without a submission, explicit submit label, honest receipt and CAPTCHA statuses.

## Functional Checks

- Desktop: 1440 x 1000; modal opening, automatic choice advance, back with preserved choices, incomplete rooms and dimensions errors, dimensions in metres/centimetres, contact validation.
- Responsive: 390 x 844; complete local eight-step preview, multiple channels, consent, terminal preview without network delivery; no horizontal overflow in DOM measurements. Browser screenshot scaling became inconsistent during later emulation; DOM measurements and earlier mobile flow screenshots are retained. No physical phone was used.
- Other region: terminal rejection and return to city, no delivery.
- Escape/close uses native dialog; visible keyboard focus and named icon buttons.
- Images load locally; reduced motion, fixed control dimensions and small-screen wrapping included.
- Frontend tests: 172 passed, 0 failed.
- Backend tests: 165 passed, 0 failed; server version d4egidm5c8ka116rj6r1 ACTIVE.
- Paid success is emitted only by shared sender after server-confirmed CAPTCHA; unverified/rejected/duplicate receipts do not emit paid success.

## Findings Resolved

1. Unique result heading and accessible dialog title.
2. Image cards have nonduplicated accessible names.
3. Reference progress percentages restored.
4. Other-region rejection cannot collect an irrelevant lead.
5. Error paths retain fields and never claim delivery without a receipt.

Final result: passed for local functional and responsive adaptation. Public delivery, MAX and analytics verification are separate release checks, not inferred from this document.

## Numeric Dimensions Follow-up

2026-11-04: the combined free-text dimensions field was replaced by two required fields: area in square metres and ceiling height in centimetres. Clients enter numbers only; decimal area accepts a dot or comma. Units stay in labels. Ceiling height was not removed and the server schema is unchanged.

Verified locally at 1280 x 720 and 390 x 844: values 72 and 275 advance correctly, survive Back, and remain fully visible without horizontal overflow. Empty area and empty ceiling have separate validation messages and focus. Frontend suite: 173 passed; existing backend reference suite: 14 passed. Earlier combined-field notes above describe the initial version only.

## Authorized Source Copy And Branches

2026-11-04: exact source questions, answer labels, free-consultation explanation, phone motivation, consent label and Next CTA restored. The owner explicitly confirmed the three estimates, savings up to RUB250000 and gifts, and the partial-repair rejection policy. The original brand/assets and website hero remain VERH; this change concerns the quiz.

The source contains 11 screens including regional and partial-repair terminal states. Reference source data is retained in tests/fixtures/reference-quiz-copy-20261104.json. One/several-room partial repair routes through a full-repair offer. Declining ends without phone collection/submission; accepting sends scope=full. Preclean/full/other follow the source's direct route. Native Back now follows actual navigation history rather than array order. Region/partial rejection has a return command instead of the source's irrelevant required text field.

Local checks: source-copy comparisons, full route, partial rejection, explicit upgrade, Back through both routes, numeric inputs, region rejection and complete preview without sending. Desktop1280x720 and mobile390x844 screenshots verified. Long phone text, phone field and Next button fit without overlap or horizontal overflow. 176 frontend tests and 167 backend tests passed. Shared CAPTCHA/delivery modules are unchanged. New backend version d4e0ia0ag18bcfi414if ACTIVE changes only reference-validation.js to reject partial-only scope on this route.
