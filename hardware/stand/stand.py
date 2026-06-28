"""
BoothPilot iPad stand — simple, clean, 3D-printable.

Holds an iPad Pro 12.9" (5th gen) in landscape, tilted back ~12deg on a wide,
stable base. Bone-white body, a thin cyan frame around the screen, a tiny pink
dot. 100% 3D-printed, zero hardware: the ~305 mm panel splits at the centre to
fit a 256 mm bed and the two halves join with a printed sliding dovetail (slide
the halves together, then drop into the base's 12deg slot which clamps the seam;
the webcam cradle clips over the top and locks it). The bottom plate snaps into
the base and the Raspberry Pi 5 sits on printed posts under printed hold-down
clips. No screws, pins, nuts, or glue.

Coordinate system (assembly, mm):  X width (0 = centre), Y depth (0 = front),
Z up (0 = table).

Run:  python stand.py   ->  out/{step,stl,3mf,views}
"""

from types import SimpleNamespace
import math
import os
import zipfile

import cadquery as cq

P = SimpleNamespace(
    # iPad Pro 12.9" 5th gen + pocket
    ipad_w=280.6, ipad_h=214.9, ipad_d=6.4,
    pocket_w=281.0, pocket_h=215.0, pocket_depth=7.0,
    lip=6.0, lip_thk=2.5, back_wall=5.0, back_border=15.0,

    # bezel / panel
    bezel=12.0,            # even border at sides + top
    bezel_bottom=22.0,     # taller bottom (sits in the base slot)
    tilt=12.0,             # back-tilt from vertical
    corner_r=10.0,         # rounded outer corners
    soften=1.4,            # front-edge softening chamfer

    # base (hollow — hides the Raspberry Pi 5)
    base_w=250.0, base_d=185.0, base_h=60.0,
    base_r=12.0,           # base rounded corners
    wall=3.0, plate_t=3.0,  # base wall + bottom-plate thickness
    slot_w=230.0,          # width of the panel slot in the base
    slot_engage=20.0,      # how deep the panel sits in the base
    panel_y0=104.0,        # slot position (depth) of the panel bottom-front edge

    # Raspberry Pi 5 (on the bottom plate; accessed by removing the plate)
    pi_hole_dx=58.0, pi_hole_dy=49.0, pi_post_d=2.5, pi_post_h=5.0,
    pi_cooler_clear=30.0,
    pi_clip_t=1.8, pi_clip_over=1.5,   # printed PCB hold-down clips
    foot_d=16.0,           # printed foot pads
    snap_n_w=12.0, snap_n_h=5.0, snap_proud=1.0,   # plate->base snap nibs

    # Logitech C310 webcam cradle (top-centre, faces the visitor)
    cam_w=67.0, cam_h=33.0, cam_d=28.0, cam_clear=0.6,
    cam_downtilt=10.0, cradle_wall=3.0,

    # logo (cyan, debossed into the base front)
    logo=True, logo_text="BOOTHP\\LOT",
    logo_font="/System/Library/Fonts/Avenir Next.ttc",
    logo_h=15.0, logo_depth=1.2, logo_z=26.0,

    # seam (centre split) — printed sliding-dovetail joint, no hardware
    seam_clear=0.30,        # dovetail slide clearance
    dt_depth=12.0,          # dovetail penetration across the seam (+X)
    dt_root=6.0, dt_tip=10.0,    # dovetail Z-height: narrow root -> wide tip
    dt_bot=(2.0, 22.0),     # Y span of the bottom (structural) dovetail
    dt_top=(224.0, 249.0),  # Y span of the top (back-wall) dovetail
    dt_top_root=3.0, dt_top_tip=4.2,

    # cutouts (verify against the device)
    camera_edge="left",    # short edge kept clear for the front camera
    charge_edge="right",   # short edge with USB-C
    usbc_w=14.0, usbc_h=10.0,
    cam_lip=16.0,          # front-camera lip clearance length
    speaker_w=26.0,        # speaker relief length

    # finish
    fit=0.4,               # general slip fit
    bed=256.0, split_threshold=250.0,

    # colours (multi-colour 3MF)
    col_body=(0.93, 0.91, 0.85),   # bone white
    col_accent=(0.16, 0.78, 0.82),  # cyan
    col_pink=(0.96, 0.43, 0.66),    # tiny pink detail
)

# Derived
P.plate_thk = P.lip_thk + P.pocket_depth + P.back_wall      # 14.5
P.panel_w = P.pocket_w + 2 * P.bezel                        # 305
P.panel_h = P.pocket_h + P.bezel + P.bezel_bottom           # 249
T = math.radians(P.tilt)
COS, SIN = math.cos(T), math.sin(T)


# --------------------------------------------------------------------------- #
def try_fillet(wp, sel, r):
    try:
        return wp.edges(sel).fillet(r)
    except Exception:
        return wp


def pose_panel(shape):
    """Stand the flat panel up: screen faces the viewer (-Y), leaning back."""
    return (shape
            .rotate((0, 0, 0), (1, 0, 0), 90.0 + P.tilt)
            .rotate((0, 0, 0), (0, 0, 1), 180.0)
            .translate((0, P.panel_y0, P.base_h - P.slot_engage)))


# --------------------------------------------------------------------------- #
# PANEL
# --------------------------------------------------------------------------- #
def panel_full():
    pw, ph, t = P.panel_w, P.panel_h, P.plate_thk
    plate = cq.Workplane("XY").box(pw, ph, t, centered=(True, False, False))
    plate = try_fillet(plate, "|Z", P.corner_r)
    plate = try_fillet(plate, ">Z", P.soften)         # soften the front face edge

    px = P.pocket_w
    py0 = P.bezel_bottom
    ptop = ph                                          # pocket open at the top
    # iPad recess, leaving a back wall
    plate = plate.cut(cq.Workplane("XY")
                      .transformed(offset=(0, (py0 + ptop) / 2.0, P.lip_thk))
                      .box(px, ptop - py0, P.pocket_depth,
                           centered=(True, True, False)))
    # screen window (lip on bottom + sides, open top)
    ox = px - 2 * P.lip
    oy0 = py0 + P.lip
    plate = plate.cut(cq.Workplane("XY")
                      .transformed(offset=(0, (oy0 + ptop) / 2.0, -1))
                      .box(ox, ptop - oy0, P.lip_thk + 2,
                           centered=(True, True, False)))
    # rear relief window (camera-bump clearance + push-out + lighter)
    by0 = py0 + P.back_border
    by1 = py0 + P.pocket_h - P.back_border
    plate = plate.cut(cq.Workplane("XY")
                      .transformed(offset=(0, (by0 + by1) / 2.0,
                                           P.lip_thk + P.pocket_depth - 0.1))
                      .box(px - 2 * P.back_border, by1 - by0, P.back_wall + 0.4,
                           centered=(True, True, False)))
    plate = _cutouts(plate)
    return plate


def _cutouts(plate):
    px = P.pocket_w
    py0 = P.bezel_bottom
    ymid = py0 + P.pocket_h / 2.0
    ex = px / 2.0
    csign = +1 if P.camera_edge == "right" else -1
    usign = +1 if P.charge_edge == "right" else -1

    # front camera: a small clear notch in the lip on its short edge
    plate = plate.cut(cq.Workplane("XY")
                      .transformed(offset=(csign * (ex - P.lip / 2.0), ymid, 0))
                      .box(P.lip + 1, P.cam_lip, P.lip_thk * 2,
                           centered=(True, True, True)))
    # speakers fire out the short edges -> slots in the SIDE walls (hidden
    # from the front), near both corners on both edges.
    for s in (+1, -1):
        for dy in (-(P.pocket_h / 2.0 - 26), P.pocket_h / 2.0 - 26):
            plate = plate.cut(cq.Workplane("XY")
                              .transformed(offset=(s * (ex + P.bezel / 2.0),
                                                   ymid + dy,
                                                   P.lip_thk + P.pocket_depth
                                                   / 2.0))
                              .box(P.bezel + 6, P.speaker_w, 6,
                                   centered=(True, True, True)))
    # USB-C port through the side wall + a channel down the back to the bottom
    plate = plate.cut(cq.Workplane("XY")
                      .transformed(offset=(usign * (ex + P.bezel / 2.0), ymid,
                                           P.lip_thk + P.pocket_depth / 2.0))
                      .box(P.bezel + 6, P.usbc_w, P.usbc_h,
                           centered=(True, True, True)))
    plate = plate.cut(cq.Workplane("XY")
                      .transformed(offset=(usign * (ex - 4), ymid / 2.0 + 6,
                                           P.plate_thk - 2.0))
                      .box(11, ymid + 12, 4.5, centered=(True, True, True)))
    return plate


def _dovetail(y0, y1, zc, root_h, tip_h, depth, grow=0.0):
    """A sliding-dovetail tongue: an isosceles trapezoid in X-Z (narrow root at
    the seam X=0, wide tip at +X) extruded along Y. `grow` inflates it to make
    the matching socket. The seam slides along Y."""
    r, t, d = root_h + 2 * grow, tip_h + 2 * grow, depth + grow
    prof = (cq.Workplane("XZ")
            .polyline([(0, zc - r / 2.0), (d, zc - t / 2.0),
                       (d, zc + t / 2.0), (0, zc + r / 2.0)]).close())
    sol = prof.extrude(y1 - y0 + 2 * grow).val()
    bb = sol.BoundingBox()
    return cq.Workplane(obj=sol).translate((0, (y0 - grow) - bb.ymin, 0)).val()


def _seam_pins(grow=0.0):
    """Both dovetail tongues (bottom structural rail + top back-wall rail)."""
    zc_back = P.lip_thk + P.pocket_depth + P.back_wall / 2.0
    bot = _dovetail(*P.dt_bot, P.plate_thk / 2.0, P.dt_root, P.dt_tip,
                    P.dt_depth, grow)
    top = _dovetail(*P.dt_top, zc_back, P.dt_top_root, P.dt_top_tip,
                    P.dt_depth, grow)
    return cq.Workplane(obj=bot).union(cq.Workplane(obj=top))


def build_panel():
    full = panel_full()
    half = (cq.Workplane("XY")
            .box(P.panel_w, P.panel_h + 6, P.plate_thk + 6,
                 centered=(True, False, False))
            .translate((-P.panel_w / 2.0, -3, -3)))      # X<=0 half-space
    pins = _seam_pins()                                  # tongues -> LEFT half
    socket = _seam_pins(P.seam_clear)                    # cavity -> RIGHT half
    left = full.intersect(half).union(full.intersect(pins))
    right = full.cut(half).cut(socket)
    return left.val(), right.val()


# --------------------------------------------------------------------------- #
# BASE
# --------------------------------------------------------------------------- #
def logo_shape():
    """BOOTHP\\LOT wordmark, positioned to fill the deboss on the base front."""
    if not P.logo:
        return None
    try:
        t = (cq.Workplane("XY").text(P.logo_text, P.logo_h, P.logo_depth,
                                     fontPath=P.logo_font, kind="bold").val())
        return t.rotate((0, 0, 0), (1, 0, 0), 90).translate(
            (0, P.logo_depth, P.logo_z))
    except Exception as e:           # noqa: BLE001
        print("  [logo] skipped:", e)
        return None


def build_base():
    bw, bd, bh, w = P.base_w, P.base_d, P.base_h, P.wall
    base = cq.Workplane("XY").box(bw, bd, bh, centered=(True, False, False))
    base = base.edges("|Z").fillet(P.base_r)
    base = try_fillet(base, ">Z", 2.0)

    # hollow almost fully (thin top shell) so it's light; then re-add a
    # full-width transverse wall where the panel plugs in, so the slot keeps
    # full-depth grip.
    ceil = bh - 3
    base = base.cut(cq.Workplane("XY")
                    .box(bw - 2 * w, bd - 2 * w, ceil,
                         centered=(True, True, False))
                    .translate((0, bd / 2.0, 0)))
    base = base.union(cq.Workplane("XY")
                      .box(bw, 48, bh, centered=(True, True, False))
                      .translate((0, P.panel_y0, 0)))

    # 12deg slot for the panel bottom
    slot_tool = (cq.Workplane("XY")
                 .box(P.slot_w, P.slot_engage + 12, P.plate_thk + 2 * P.fit,
                      centered=(True, True, False))
                 .translate((0, 0, -2)).val())
    base = base.cut(pose_panel(slot_tool))

    # cable pass-through from the slot down into the Pi cavity
    base = base.cut(cq.Workplane("XY")
                    .box(24, 18, bh, centered=(True, True, False))
                    .translate((0, P.panel_y0, 0)))

    # snap windows the bottom-plate nibs click into (low on the side walls)
    for s in (+1, -1):
        for yy in (bd * 0.32, bd * 0.68):
            base = base.cut(cq.Workplane("XY")
                            .box(2 * w + 2, P.snap_n_w, P.snap_n_h,
                                 centered=(True, True, True))
                            .translate((s * (bw / 2.0 - w), yy,
                                        P.plate_t + 7.0)))

    base = _base_vents(base)
    # cable exit at the back
    base = base.cut(cq.Workplane("XY")
                    .box(26, 2 * w + 6, 12, centered=(True, True, False))
                    .translate((0, bd - w, P.plate_t + 3)))
    # logo deboss (cyan)
    lg = logo_shape()
    if lg is not None:
        base = base.cut(lg)
    return base.val()


def _base_vents(base):
    bw, bd, bh, w = P.base_w, P.base_d, P.base_h, P.wall
    for s in (+1, -1):
        for j in range(3):
            for z in (P.plate_t + 8, bh - P.slot_engage - 14):
                base = base.cut(cq.Workplane("XY")
                                .box(2 * w + 4, 22, 6, centered=(True, True, True))
                                .translate((s * (bw / 2.0 - w),
                                            bd * 0.4 + j * 18, z)))
    return base


def build_base_plate():
    """Bottom plate: snaps up into the base, carries the Pi on printed posts +
    hold-down clips. Has feet. No hardware."""
    bw, bd, w = P.base_w, P.base_d, P.wall
    pw, pd = bw - 2 * w - 1.0, bd - 2 * w - 1.0
    y0 = w + 0.5
    plate = cq.Workplane("XY").box(pw, pd, P.plate_t, centered=(True, False,
                                                               False))
    plate = plate.translate((0, y0, 0)).edges("|Z").fillet(8)

    # perimeter lip (rectangular tube) that nests inside the base walls
    lip_h, lt = 11.0, 1.8
    outer = (cq.Workplane("XY").box(pw, pd, lip_h, centered=(True, False, False))
             .translate((0, y0, P.plate_t)))
    inner = (cq.Workplane("XY").box(pw - 2 * lt, pd - 2 * lt, lip_h + 2,
                                    centered=(True, False, False))
             .translate((0, y0 + lt, P.plate_t - 1)))
    plate = plate.union(outer.cut(inner))

    # snap nibs on the lip's X faces -> base side-wall windows
    for s in (+1, -1):
        for yy in (bd * 0.32, bd * 0.68):
            nib = (cq.Workplane("XY")
                   .box(2 * lt + P.snap_proud, P.snap_n_w - 0.8,
                        P.snap_n_h - 0.8, centered=(True, True, True))
                   .translate((s * (pw / 2.0), yy, P.plate_t + 7.0)))
            plate = plate.union(nib)

    # Pi locating posts (board drops over them via its M2.5 mounting holes)
    cx, cy = 0.0, bd * 0.30
    for sx in (+1, -1):
        for sy in (+1, -1):
            post = (cq.Workplane("XY").circle(3.4).extrude(P.pi_post_h)
                    .faces(">Z").workplane().circle(P.pi_post_d / 2.0)
                    .extrude(2.2)
                    .translate((cx + sx * P.pi_hole_dx / 2.0,
                                cy + sy * P.pi_hole_dy / 2.0, P.plate_t)))
            plate = plate.union(post)
    # two printed hold-down clips over the board's Y edges
    pcb_top = P.pi_post_h + 1.6
    for sy in (+1, -1):
        ay = cy + sy * (P.pi_hole_dy / 2.0 + 3.2)
        arm = (cq.Workplane("XY")
               .box(12, P.pi_clip_t, pcb_top + 2.0, centered=(True, True, False))
               .translate((cx - 6, ay, P.plate_t)))
        hook = (cq.Workplane("XY")
                .box(12, P.pi_clip_t + P.pi_clip_over, 1.4,
                     centered=(True, True, False))
                .translate((cx - 6, ay - sy * P.pi_clip_over / 2.0,
                            P.plate_t + pcb_top + 0.4)))
        plate = plate.union(arm).union(hook)

    # feet
    for sx in (+1, -1):
        for y in (bd - 22, 22):
            plate = plate.union(cq.Workplane("XY").circle(P.foot_d / 2.0)
                                .extrude(-2.5)
                                .translate((sx * (bw / 2.0 - 18), y, 0)))
    return plate.val()


def build_cradle():
    """Clean webcam housing for the C310, faces -Y with a downtilt."""
    cw, ch, cd, wl = P.cam_w, P.cam_h, P.cam_d, P.cradle_wall
    bw_, bh_, bd_ = cw + 2 * wl + 8, ch + 2 * wl, cd + wl + 4
    body = cq.Workplane("XY").box(bw_, bd_, bh_, centered=(True, True, False))
    body = body.edges("|Z").fillet(6).edges(">Z").fillet(3)
    body = body.cut(cq.Workplane("XY")
                    .box(cw + 2 * P.cam_clear, cd + 2 * P.cam_clear,
                         ch + 2 * P.cam_clear, centered=(True, True, False))
                    .translate((0, -1, wl)))
    body = body.cut(cq.Workplane("XY")
                    .box(cw - 8, bd_, ch - 8, centered=(True, True, False))
                    .translate((0, -bd_ / 2.0, wl + 4)))
    # foot that hooks over the panel's top edge (no downtilt — C310 hinges)
    foot = (cq.Workplane("XY").box(bw_, 16, 10, centered=(True, True, False))
            .translate((0, 2, -10)))
    return body.union(foot).val()


def cradle_pose(shape):
    # seat the cradle's foot on the panel's top-front edge
    yt = P.panel_h * SIN + P.panel_y0
    zt = P.panel_h * COS + (P.base_h - P.slot_engage)
    return shape.translate((0, yt - 3, zt - 3))


# --------------------------------------------------------------------------- #
# COLOUR DECOMPOSITION (for the multi-colour 3MF / render)
# --------------------------------------------------------------------------- #
def _accent_tools():
    """Cyan frame around the screen + a tiny pink dot, as cutting solids."""
    px = P.pocket_w
    py0 = P.bezel_bottom
    ox, oy = px - 2 * P.lip, P.pocket_h - 2 * P.lip
    oyc = py0 + P.lip + (P.panel_h - (py0 + P.lip)) / 2.0
    rw = 7.0
    outer = (cq.Workplane("XY")
             .transformed(offset=(0, oyc, 0))
             .box(ox + 2 * rw, (P.panel_h - (py0 + P.lip)) + 0, P.lip_thk + 0.2,
                  centered=(True, True, False)))
    inner = (cq.Workplane("XY")
             .transformed(offset=(0, oyc, -0.1))
             .box(ox, (P.panel_h - (py0 + P.lip)) - 2 * rw, P.lip_thk + 0.6,
                  centered=(True, True, False)))
    cyan = outer.cut(inner)
    pink = (cq.Workplane("XY")
            .transformed(offset=(0, py0 / 2.0 + 2, 0))
            .cylinder(P.lip_thk + 0.2, 3.2, centered=(True, True, False)))
    return cyan.val(), pink.val()


def colour_split(name, shape):
    """Return [(rgb, solid)] per printed part for the multi-colour 3MF."""
    if name == "base":
        out = [(P.col_body, shape)]
        lg = logo_shape()                       # cyan logo inlay fills the deboss
        if lg is not None:
            out.append((P.col_accent, lg))
        return out
    if name.startswith("panel"):
        cyan, pink = _accent_tools()
        body = (cq.Workplane(obj=shape).cut(cq.Workplane(obj=cyan))
                .cut(cq.Workplane(obj=pink)))
        out = [(P.col_body, body.val())]
        c = cq.Workplane(obj=shape).intersect(cq.Workplane(obj=cyan))
        if c.solids().size():
            out.append((P.col_accent, c.val()))
        pk = cq.Workplane(obj=shape).intersect(cq.Workplane(obj=pink))
        if pk.solids().size():
            out.append((P.col_pink, pk.val()))
        return out
    return [(P.col_body, shape)]


# --------------------------------------------------------------------------- #
# 3MF
# --------------------------------------------------------------------------- #
def _hex(rgb):
    r, g, b = (max(0, min(255, int(round(c * 255)))) for c in rgb)
    return f"#{r:02X}{g:02X}{b:02X}FF"


def export_3mf(items, path, tol=0.2):
    bases, objects, builds = [], [], []
    for name, _, rgb in items:
        bases.append(f'<base name="{name}" displaycolor="{_hex(rgb)}"/>')
    for i, (name, shape, _) in enumerate(items):
        v, tr = shape.tessellate(tol)
        vx = "".join(f'<vertex x="{p.x:.4f}" y="{p.y:.4f}" z="{p.z:.4f}"/>'
                     for p in v)
        tx = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in tr)
        oid = i + 2
        objects.append(f'<object id="{oid}" type="model" pid="1" pindex="{i}">'
                       f'<mesh><vertices>{vx}</vertices>'
                       f'<triangles>{tx}</triangles></mesh></object>')
        builds.append(f'<item objectid="{oid}" '
                      f'transform="1 0 0 0 1 0 0 0 1 0 0 0"/>')
    model = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<model unit="millimeter" xml:lang="en-US" '
             'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
             '<resources>'
             f'<basematerials id="1">{"".join(bases)}</basematerials>'
             f'{"".join(objects)}</resources>'
             f'<build>{"".join(builds)}</build></model>')
    ct = ('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.'
          'openxmlformats.org/package/2006/content-types"><Default '
          'Extension="rels" ContentType="application/vnd.openxmlformats-package.'
          'relationships+xml"/><Default Extension="model" ContentType='
          '"application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http:'
            '//schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://'
            'schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>'
            '</Relationships>')
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", ct)
        z.writestr("_rels/.rels", rels)
        z.writestr("3D/3dmodel.model", model)


# --------------------------------------------------------------------------- #
def build_all():
    pl, pr = build_panel()
    return {"base": build_base(), "base_plate": build_base_plate(),
            "panel_left": pl, "panel_right": pr,
            "webcam_cradle": build_cradle()}


def posed(parts):
    wp = lambda k: cq.Workplane(obj=parts[k]).val()
    return {"base": parts["base"],
            "base_plate": parts["base_plate"],
            "panel_left": pose_panel(wp("panel_left")),
            "panel_right": pose_panel(wp("panel_right")),
            "webcam_cradle": cradle_pose(wp("webcam_cradle"))}


def export(parts, posed_parts, out):
    for d in ("step", "stl", "3mf", "views"):
        os.makedirs(os.path.join(out, d), exist_ok=True)
    for n, s in parts.items():
        cq.exporters.export(cq.Workplane(obj=s), f"{out}/step/{n}.step")
        cq.exporters.export(cq.Workplane(obj=s), f"{out}/stl/{n}.stl",
                            tolerance=0.04, angularTolerance=0.2)
    asm = cq.Assembly(name="ipad_stand")
    for n, s in posed_parts.items():
        asm.add(s, name=n, color=cq.Color(*P.col_body))
    asm.save(f"{out}/step/ipad_stand_assembly.step")

    # multi-colour 3MF (assembled + flat)
    asm_items, flat_items = [], []
    flat_x = 0.0
    for n, s in parts.items():
        split = colour_split(n, s)
        for j, (rgb, sub) in enumerate(split):
            asm_items.append((f"{n}_{j}", _posed_sub(n, sub), rgb))
        bb = s.BoundingBox()
        for j, (rgb, sub) in enumerate(split):
            flat_items.append((f"{n}_{j}",
                               sub.translate((flat_x - bb.xmin, -bb.ymin,
                                              -bb.zmin)), rgb))
        flat_x += bb.xlen + 25
    export_3mf(asm_items, f"{out}/3mf/ipad_stand_assembled.3mf")
    export_3mf(flat_items, f"{out}/3mf/ipad_stand_print.3mf")


def _posed_sub(name, sub):
    """Apply the same pose to a colour sub-solid as its parent part."""
    if name.startswith("panel"):
        return pose_panel(sub)
    if name == "webcam_cradle":
        return cradle_pose(sub)
    return sub


def report(parts, posed_parts):
    print("\n=== bed-fit (bed %.0f) ===" % P.bed)
    for n, s in parts.items():
        bb = s.BoundingBox()
        dims = sorted([bb.xlen, bb.ylen, bb.zlen])
        ok = "OK" if dims[2] <= P.bed else "!! OVER"
        print(f"  {n:12s} {bb.xlen:6.1f} x {bb.ylen:6.1f} x {bb.zlen:6.1f}  {ok}")
    bb = cq.Compound.makeCompound(list(posed_parts.values())).BoundingBox()
    print("  envelope: %.0f W x %.0f D x %.0f H" % (bb.xlen, bb.ylen, bb.zlen))


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    parts = build_all()
    pp = posed(parts)
    report(parts, pp)
    export(parts, pp, out)
    print("wrote", out)
