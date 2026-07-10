# Design QA: v18

## Scope

- Source visual truth: `/tmp/verhremont-audit/01-v17-process-desktop.png` - desktop capture of the previous process block, including overlapping visual states.
- Implementation: `/tmp/verhremont-audit/v18-root-desktop-process.png` - root site after the v18 update.
- Full-view comparison: `/tmp/verhremont-audit/v17-v18-process-comparison.png`.
- Viewport: 1265 x 712 CSS px.
- State: second stage of the repair process is active.

The reference is a record of the issue reported by the client, not a pixel-perfect target. Acceptance is based on the requested behavior: one pinned stage at a time on desktop, sequential cards on mobile, and a clear materials conversion block.

## Checks

- Typography: Onest remains the active family. The stage headline, small label, body copy, and counter keep a clear hierarchy without text overlap.
- Layout rhythm: the desktop stage holds at `top: 72px`; exactly one image and one copy block are visible at a time. The desktop comparison confirms that the old stack of frames is removed.
- Colors and tokens: the existing graphite, warm gold, and off-white system is preserved.
- Images and icons: the new WebP icon pack is loaded at 330 x 330 source resolution and is displayed as square cards without stretching. Real repair photos remain in the tariff galleries.
- Copy: the materials section now explains the value, lists the practical conditions, and exposes catalog links as identifiable cards.
- Responsive behavior: at 402 x 874, the pinned desktop stage is disabled, mobile cards are stacked without horizontal overflow, and the sticky calculation CTA is hidden before the footer. The footer exposes two actions.
- Browser console: no error-level messages on the checked root page.

## Findings

No actionable P0, P1, or P2 differences found for the requested v18 changes.

## Remaining limits

- The viewport tool in the in-app browser provided a reliable 402 x 874 mobile check. Larger device presets were not used as separate screenshot evidence in this pass.
- This is a static prototype: submitting the quiz still demonstrates the client-side result and does not send a lead to a CRM.

final result: passed
