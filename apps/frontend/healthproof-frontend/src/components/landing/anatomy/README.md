# Physical clinical exchange scene

The original clinic, laboratory and patient images remain the actors. A single
isometric instrument connects their actual sockets with grounded channels and a
document press. The existing demo reducer remains the only business-state owner.

## Check without starting a server

From the frontend directory:

```sh
node node_modules/vitest/vitest.mjs run src/components/landing/anatomy
```

For inspectable PNGs, set `HERO_PREVIEW_DIR` to an existing temporary directory
before running the command. The finite offline test uses Next's already-installed
Sharp dependency, the real SVG renderer and unchanged actor images. It does not
start localhost, Chrome or any persistent process. It produces preparation,
protection, reception and 390px-wide specimens. These are scene previews, not
proof of full-page responsive browser layout.

## Responsibilities

### Semantic feedback

Laboratory selection and sample-file intake are explicit demo events. Intake
ends in the laboratory tray; local encryption moves the file into the chamber.
The press runs only while the real sample-encryption callback is pending.
Already-protected result delivery does not encrypt again. Permission and sharing
routes carry key credentials, not shielded clinical documents.

The controller retains milestones independently of the presentation clock.
Stage indicators and parked credentials/documents remain available after
navigation or animation interruption, including reduced motion. These are
simulation outcomes, not real uploads, blockchain receipts or new access-control
features. Offline opt-in also produces `permission`, `intake` and `outcomes` PNGs.

### Source boundaries

- `geometry.ts`: selected MIT Anatomy camera/extrusion primitives; see `LICENSE.md`.
- `exchange.ts`: physical parts, shared world coordinates, terminal endpoints and
  finite presentation frames. No cryptographic or clinical state is fabricated.
- `HeroExchangeMachine.tsx`: shaded solids, reserved carrier layer, foreground
  occlusion, document faces and an offline frame option.
- `useHeroPathAnimation`: presentation clock and visibility/reduced-motion cleanup.
  A transfer never advances the demo, and navigation never fabricates a transfer.

The geometry tests check finite bounds, attachment endpoints and continuous
presentation frames. They are not a claim of passing Anatomy's separate full
clearance/depth/line-end audit. New hardware must preserve the actual openings,
stroke clearance and carrier layer rather than hiding defects with drawing order.
