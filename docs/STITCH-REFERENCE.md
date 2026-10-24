# Stitch reference integration — v4

The user supplied three local exports on 24 October 2026:

| Export | Reference | Implementation |
|---|---|---|
| `stitch_hunger_food_rescue_platform.zip` | Refined desktop discovery | Worker discovery inventory summary, filters, meal cards and rule strip |
| `stitch_hunger_food_rescue_platform (1).zip` | Refined desktop meal details | `/meal/[id]` with food details, venue information and sticky reservation panel |
| `stitch_hunger_food_rescue_platform (2).zip` | Refined desktop active reservation | `/reservation/[id]` with current status, QR, fallback code, serving venue and cancellation |

The supplied `screen.png`, `code.html` and `DESIGN.md` were used as visual reference material. The HTML was not executed or shipped. The implementation uses the project's React/Next components and React Native styles, without adding the prototype's CDN scripts. White panels, blue-gray canvas, red actions, teal secondary accents and a compact header follow the reference. Web typography uses Inter and Plus Jakarta Sans; native uses system fonts for reliable rendering without a new font dependency.

Both worker clients use matching shared copy, palette and illustrative food assets. Phone layouts keep meals closer to the top; extra filters can be expanded with the filter control. Food photos are the existing labelled generated illustrations, not actual venue photos. The current schema has no venue/listing photo field. The supplied static QR, countdown, sample map and availability figures were replaced with the shared backend reservation model and real venue coordinates. Counts are calculated from loaded listings, expiry is determined by the server, and private token pages only show the signed-in account's reservation.

Prototype claims unsupported by the existing schema were omitted: HACCP/halal/temperature/allergen certification, worker verification, ratings, retail value, packaged pickup guarantees, priority/strikes/standby rules, and tomorrow notifications. No such rules or credentials are implied. Collection instructions come from the venue listing. Expired, cancelled and served tokens do not display an actionable QR or backup code.

The console shares the updated palette and utility surfaces. Backend SQL/RPC contracts are unchanged; already migrated projects do not reapply the initial migration for this UI release. Each of the four archives is a complete owned module and requires the matching assembled workspace.
