"""
iPad Pro 12.9" (5th gen) easel stand — adapted from the 'HA Screen' picture-frame
+ fold-out-leg design. 100% printed, zero fasteners.

Form (matches the source file): a THIN framed panel that sandwiches the iPad
(front bezel + rear tray) propped by a FOLD-OUT KICKSTAND LEG whose rod snaps
into cradles on the panel back. Not a chunky dock — a flat screen on an easel.

Printed parts (all fit a 256 mm bed):
  front_left / front_right : screen-side bezel, split at centre, peg-joined
  rear_left  / rear_right  : iPad tray + hinge cradles, split at centre
  leg                      : fold-out kickstand; rod snaps into the cradles

Joinery, all printed:
  - centre seam: planar split + integral alignment pegs (thin frames can't take
    a dovetail) and the bezel snap-pegs that clamp the sandwich also bridge it.
  - bezel <-> tray: snap-pegs press into the tray wall tops.
  - leg <-> panel: 8 mm rod snaps into two C-cradles (grip >180 deg).

Build convention: panel modelled FLAT in XY, centred on origin, bottom edge at
Y = -outer_h/2. Tray back face at Z = 0, screen side +Z. Posed with rotateX(90 -
tilt) so the screen faces the viewer (-Y) and leans back `tilt` from vertical.
"""
from types import SimpleNamespace
import math
import os
import cadquery as cq
import stand  # reuse try_fillet, export_3mf, _hex

P = SimpleNamespace(
    ipad_w=280.6, ipad_h=214.9, ipad_d=6.4,
    clr=0.5, rim=7.0, lip=5.0,
    bez_t=4.0,
    tray_floor=3.0, tray_wall=3.5,
    peg_d=3.6, peg_h=6.0,           # bezel -> tray snap pegs
    rear_border=24.0,
    tilt=15.0, corner_r=9.0,
    # fold-out hinge
    rod_d=8.0, rod_clr=0.35, rod_stand=2.0,
    cr_len=52.0, cr_x=78.0, cr_wall=3.0,
    leg_w=180.0, leg_pw=100.0, leg_th=6.0, foot_y=98.0, pivot_drop=52.0,
    # seam
    seam_clear=0.30,
    col_body=(0.93, 0.91, 0.85), col_accent=(0.16, 0.78, 0.82),
    col_pink=(0.96, 0.43, 0.66),
    logo_text="BOOTHP\\LOT", logo_font="/System/Library/Fonts/Avenir Next.ttc",
    bed=256.0,
)
P.cav_w = P.ipad_w + 2 * P.clr
P.cav_h = P.ipad_h + 2 * P.clr
P.cav_d = P.ipad_d + 0.6
P.outer_w = P.cav_w + 2 * P.rim
P.outer_h = P.cav_h + 2 * P.rim
P.win_w = P.cav_w - 2 * P.lip
P.win_h = P.cav_h - 2 * P.lip
P.tray_t = P.tray_floor + P.cav_d
P.panel_t = P.tray_t + P.bez_t
P.y_pivot = P.outer_h / 2.0 - P.pivot_drop
P.z_rod = -(P.rod_d / 2.0 + P.rod_stand)

# ---- pose / leg geometry (computed once) ---------------------------------- #
ROT = 90.0 - P.tilt


def _rotx_pt(p):
    a = math.radians(ROT)
    return (p[0], p[1] * math.cos(a) - p[2] * math.sin(a),
            p[1] * math.sin(a) + p[2] * math.cos(a))


P.zb = math.sin(math.radians(ROT)) * (-P.outer_h / 2.0)   # desk plane (rotated)
P.lift = -P.zb
_rod_u = _rotx_pt((0.0, P.y_pivot, P.z_rod))
_dy = P.foot_y - _rod_u[1]
_dz = P.zb - _rod_u[2]
P.leg_psi = math.degrees(math.atan2(_dz, _dy))
P.leg_len = math.hypot(_dy, _dz)
P.rod_world = (0.0, _rod_u[1], _rod_u[2] + P.lift)


def _peg_xy():
    """Bezel -> tray snap pegs, near the L/R rims (off the centre seam)."""
    ex = P.outer_w / 2.0 - P.rim / 2.0
    ey = P.outer_h / 2.0 - P.rim / 2.0
    return [(s * ex, y) for s in (+1, -1) for y in (-ey + 14, ey - 14)]


# --------------------------------------------------------------------------- #
def front_bezel():
    """Flat frame, screen window, snap-pegs pointing -Z into the tray."""
    b = (cq.Workplane("XY").box(P.outer_w, P.outer_h, P.bez_t,
                                centered=(True, True, False))
         .translate((0, 0, P.tray_t)))
    b = stand.try_fillet(b, "|Z", P.corner_r)
    b = stand.try_fillet(b, ">Z", 1.2)
    b = b.cut(cq.Workplane("XY").box(P.win_w, P.win_h, P.bez_t + 2,
                                     centered=(True, True, True))
              .translate((0, 0, P.tray_t + P.bez_t / 2.0)))
    for x, y in _peg_xy():
        peg = (cq.Workplane("XY").circle(P.peg_d / 2.0).extrude(-P.peg_h)
               .faces("<Z").workplane().circle(P.peg_d / 2.0 + 0.4).extrude(0.8)
               .translate((x, y, P.tray_t)))
        b = b.union(peg)
    return b.val()


def _add_cradles(tray):
    """Two downward-opening C-cradles on the back face; rod snaps in (-Z)."""
    z_bot = P.z_rod - P.rod_d / 2.0 - P.cr_wall          # block reaches here
    for s in (+1, -1):
        xc = s * P.cr_x
        blk = (cq.Workplane("XY").box(P.cr_len, P.rod_d + 2 * P.cr_wall,
                                      -z_bot + 0.8, centered=(True, True, False))
               .translate((xc, P.y_pivot, z_bot)))   # +0.8 into the floor to fuse
        tray = tray.union(blk)
    for s in (+1, -1):
        xc = s * P.cr_x
        bore = cq.Solid.makeCylinder(
            P.rod_d / 2.0 + P.rod_clr, P.cr_len + 2,
            cq.Vector(xc - P.cr_len / 2.0 - 1, P.y_pivot, P.z_rod),
            cq.Vector(1, 0, 0))
        tray = tray.cut(cq.Workplane(obj=bore))
        throat = (cq.Workplane("XY").box(P.cr_len + 2, P.rod_d - 1.0,
                                         P.z_rod - (z_bot - 1),
                                         centered=(True, True, False))
                  .translate((xc, P.y_pivot, z_bot - 1)))
        tray = tray.cut(throat)
    return tray


def rear_tray():
    """Holds the iPad; rear ledge + ports; hinge cradles on the back."""
    outer = cq.Workplane("XY").box(P.outer_w, P.outer_h, P.tray_t,
                                   centered=(True, True, False))
    outer = stand.try_fillet(outer, "|Z", P.corner_r)
    cavity = (cq.Workplane("XY").box(P.cav_w, P.cav_h, P.cav_d + 2,
                                     centered=(True, True, False))
              .translate((0, 0, P.tray_floor)))
    tray = outer.cut(cavity)
    # rear window in two panes, leaving a solid floor rib at the hinge band so
    # the cradles bond to the tray (the ledge also retains the iPad's back)
    win_x = P.cav_w - 2 * P.rear_border
    rib_lo, rib_hi = P.y_pivot - 12.0, P.y_pivot + 12.0
    y_top = P.cav_h / 2.0 - P.rear_border
    for y0, y1 in ((-y_top, rib_lo), (rib_hi, y_top)):
        tray = tray.cut(cq.Workplane("XY")
                        .box(win_x, y1 - y0, P.tray_floor + 2,
                             centered=(True, False, True))
                        .translate((0, y0, P.tray_floor / 2.0)))
    # bezel peg holes in the wall tops
    for x, y in _peg_xy():
        tray = tray.cut(cq.Workplane("XY").circle(P.peg_d / 2.0 + 0.25)
                        .extrude(-P.peg_h - 1).translate((x, y, P.tray_t)))
    # speaker / port / cable slots on both side rims (USB-C + speakers sit on the
    # short edges in landscape); keeps the bottom rim solid for the seam peg
    for s in (+1, -1):
        tray = tray.cut(cq.Workplane("XY").box(2 * (P.rim + 1), 60, P.tray_t + 2,
                                               centered=(True, True, False))
                        .translate((s * P.outer_w / 2.0, 0, -1)))
    return _add_cradles(tray).val()


def kickstand_leg():
    """Flat leg; rod knuckle at the top snaps into the panel cradles."""
    rod = cq.Solid.makeCylinder(P.rod_d / 2.0, P.leg_w,
                                cq.Vector(-P.leg_w / 2.0, 0, 0), cq.Vector(1, 0, 0))
    plate = (cq.Workplane("XY").box(P.leg_pw, P.leg_len, P.leg_th,
                                    centered=(True, False, True)))
    leg = cq.Workplane(obj=rod).union(plate)
    leg = stand.try_fillet(leg, "|X and >Y", P.leg_th / 2.0 * 0.9)
    leg = stand.try_fillet(leg, "|Z and >Y", 12.0)
    return leg.val()


# --------------------------------------------------------------------------- #
def _planar_split(solid):
    bb = solid.BoundingBox()
    big = (cq.Workplane("XY").box(2000, bb.ylen + 8, bb.zlen + 60,
                                  centered=(True, True, True))
           .translate((-1000, (bb.ymin + bb.ymax) / 2.0,
                       (bb.zmin + bb.zmax) / 2.0)))
    W = cq.Workplane(obj=solid)
    return W.intersect(big).val(), W.cut(big).val()


def _peg_join(left, right, specs):
    """Integral X-pegs on the LEFT border into holes in the RIGHT border."""
    for y, zc in specs:
        peg = cq.Workplane("YZ").circle(1.8).extrude(7.0).translate((-0.6, y, zc))
        hole = (cq.Workplane("YZ").circle(2.05).extrude(7.6)
                .translate((-0.3, y, zc)))
        left = cq.Workplane(obj=left).union(peg).val()
        right = cq.Workplane(obj=right).cut(hole).val()
    return left, right


def build_all():
    fb, rt, leg = front_bezel(), rear_tray(), kickstand_leg()

    fbl, fbr = _planar_split(fb)
    eyb = P.outer_h / 2.0 - P.rim / 2.0
    fbl, fbr = _peg_join(fbl, fbr, [(eyb, P.tray_t + P.bez_t / 2.0),
                                    (-eyb, P.tray_t + P.bez_t / 2.0)])

    rtl, rtr = _planar_split(rt)
    rtl, rtr = _peg_join(rtl, rtr, [(eyb, P.tray_t / 2.0),
                                    (-eyb, P.tray_t / 2.0)])

    return {"front_left": fbl, "front_right": fbr,
            "rear_left": rtl, "rear_right": rtr, "leg": leg}


# ----- poses for render ----------------------------------------------------- #
def pose_panel(s):
    return (cq.Workplane(obj=s).rotate((0, 0, 0), (1, 0, 0), ROT)
            .translate((0, 0, P.lift)).val())


def pose_leg(s):
    return (cq.Workplane(obj=s).rotate((0, 0, 0), (1, 0, 0), P.leg_psi)
            .translate(P.rod_world).val())


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ha_out")
    for d in ("step", "stl"):
        os.makedirs(os.path.join(out, d), exist_ok=True)
    parts = build_all()
    print("=== bed-fit (bed %.0f) | leg %.1f long, %.1f deg ===" %
          (P.bed, P.leg_len, P.leg_psi))
    for n, s in parts.items():
        bb = s.BoundingBox()
        d = sorted([bb.xlen, bb.ylen, bb.zlen])
        ok = "OK" if d[1] <= P.bed else "!! OVER"
        print(f"  {n:12s} {bb.xlen:6.1f} x {bb.ylen:6.1f} x {bb.zlen:6.1f}  {ok}"
              f"  solids={cq.Workplane(obj=s).solids().size()}")
        cq.exporters.export(cq.Workplane(obj=s), f"{out}/step/{n}.step")
        cq.exporters.export(cq.Workplane(obj=s), f"{out}/stl/{n}.stl",
                            tolerance=0.04, angularTolerance=0.2)
    print("wrote", out)
