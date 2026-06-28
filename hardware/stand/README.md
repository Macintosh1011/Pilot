# BoothPilot iPad Stand

A clean, wide-based tabletop stand that holds an **iPad Pro 12.9" (5th gen)** in
landscape tilted back ~12°, hides a **Raspberry Pi 5** in the base, and mounts a
**Logitech C310** webcam on top facing the visitor. Bone-white body, a thin cyan
frame around the screen, the cyan **BOOTHP\LOT** wordmark on the base front.

**100% 3D-printed — no screws, pins, nuts, or glue.** Everything snaps or slides
together.

![hero](renders/stand_hero.png)

## Parts (5 printed pieces)

| Part | File | Size (mm) | Notes |
|------|------|-----------|-------|
| Base | `base` | 250 × 185 × 60 | Hollow, hides the Pi; cyan logo on front |
| Bottom plate | `base_plate` | 248 × 178 × 17 | Snaps into the base; carries the Pi |
| Panel — left | `panel_left` | 165 × 249 × 14.5 | Dovetail **tongue** at the seam |
| Panel — right | `panel_right` | 153 × 249 × 14.5 | Dovetail **socket** at the seam |
| Webcam cradle | `webcam_cradle` | 81 × 35 × 49 | Hooks over the panel top, locks the seam |

The panel is ~305 mm wide, so it splits down the centre to fit a 256 mm bed.
STEP, STL and multi-colour 3MF for every part are in `out/`.

## How it goes together (no hardware)

1. **Seam** — slide `panel_right` down onto `panel_left`'s dovetail tongue. The
   dovetail locks the halves side-to-side; the joint is hidden behind the screen.
2. **Stand the panel** — drop the joined panel into the 12° slot in the base. The
   slot clamps the seam front-to-back and sets the tilt.
3. **Webcam** — clip the cradle over the centre of the panel's top edge. It spans
   the seam and stops the halves sliding apart. Drop the C310 in; its hinge sets
   the look-down angle.
4. **Pi** — drop the Raspberry Pi 5 onto the four locating posts on the bottom
   plate; press the two printed clips over the board edges to hold it down.
5. **Close up** — push the bottom plate up into the base until the four side nibs
   snap into the wall windows. Route the USB-C charge cable out the back.
6. **iPad** — slide it into the front pocket from the top; it rests on the 6 mm
   front lip and is fully removable.

## Bill of materials

**Printed:** the 5 parts above — ≈ 0.6 kg PLA total at ~18% infill (bone-white,
plus a few grams of cyan and pink for the accents). **Hardware: none.**

**You supply (drop-in electronics):**

| Item | Qty |
|------|-----|
| iPad Pro 12.9" (5th gen) | 1 |
| Raspberry Pi 5 | 1 |
| Logitech C310 webcam | 1 |
| USB-C charge cable | 1 |

## Print settings

- **Material:** PLA. Body in bone-white; small amounts of cyan + pink for the
  screen frame, logo, and dot (multi-colour 3MF), or print mono and skip them.
- **Walls:** 3 mm (≈4 perimeters), 3 mm top/bottom, 15–20% infill.
- **Layer height:** 0.2–0.28 mm.
- **Bed:** fits 256 × 256 mm. All five parts print without splitting further.
- **Supports:** none for the panels (print screen-face-down, pockets up) or the
  base (print on its bottom, cavity up). The cradle prints opening-up. The only
  bridges are the short cable cut-outs — fine without support.
- **Orientation:** print each part as modelled (its largest flat face down).

## Fit notes

Pocket is 281 × 215 × 7 mm for a 280.6 × 214.9 × 6.4 mm iPad. Seam dovetail uses
0.3 mm slide clearance; plate nibs and Pi posts assume typical PLA tolerances —
if your printer runs tight, bump `seam_clear` / `fit` in `stand.py` by 0.1 mm.
Verify the USB-C and speaker cut-outs against your unit before a full print.

## Regenerate

```
pip install cadquery==2.5.2
python stand.py        # writes out/{step,stl,3mf}
```
