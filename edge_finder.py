#@title The guts of the algorithms
# Adapted from https://github.com/shrx/spectre/blob/master/spectre.py

import drawsvg as draw
import numpy as np
from time import time

num_tiles = 0

IDENTITY = [1, 0, 0, 0, 1, 0]

TILE_NAMES = ["Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi"]

COLOR_MAP_ORIG = {
    "Gamma":  "rgb(255, 255, 255)",
    "Gamma1": "rgb(255, 255, 255)",
    "Gamma2": "rgb(255, 255, 255)",
    "Delta":  "rgb(220, 220, 220)",
    "Theta":  "rgb(255, 191, 191)",
    "Lambda": "rgb(255, 160, 122)",
    "Xi":     "rgb(255, 242, 0)",
    "Pi":     "rgb(135, 206, 250)",
    "Sigma":  "rgb(245, 245, 220)",
    "Phi":    "rgb(0,   255, 0)",
    "Psi":    "rgb(0,   255, 255)"
}



COLOR_MAP_lite = {
    "Gamma":  "rgba(255, 255, 255, 0.3)",
    "Gamma1": "rgba(255, 255, 255, 0.3)",
    "Gamma2": "rgba(255, 255, 255, 0.3)",
    "Delta":  "rgba(220, 220, 220, 0.3)",
    "Theta":  "rgba(255, 191, 191, 0.3)",
    "Lambda": "rgba(255, 160, 122, 0.3)",
    "Xi":     "rgba(255, 242, 0, 0.3)",
    "Pi":     "rgba(135, 206, 250, 0.3)",
    "Sigma":  "rgba(245, 245, 220, 0.3)",
    "Phi":    "rgba(0,   255, 0, 0.3)",
    "Psi":    "rgba(0,   255, 255, 0.3)"
}

COLOR_MAP_MYSTICS = {
    "Gamma":  "rgb(196, 201, 169)",
    "Gamma1": "rgb(196, 201, 169)",
    "Gamma2": "rgb(156, 160, 116)",
    "Delta":  "rgb(247, 252, 248)",
    "Theta":  "rgb(247, 252, 248)",
    "Lambda": "rgb(247, 252, 248)",
    "Xi":     "rgb(247, 252, 248)",
    "Pi":     "rgb(247, 252, 248)",
    "Sigma":  "rgb(247, 252, 248)",
    "Phi":    "rgb(247, 252, 248)",
    "Psi":    "rgb(247, 252, 248)"
}

COLOR_MAP = COLOR_MAP_ORIG

SPECTRE_POINTS = [
    pt(0,                0),
    pt(1.0,              0.0),
    pt(1.5,              -np.sqrt(3)/2),
    pt(1.5+np.sqrt(3)/2, 0.5-np.sqrt(3)/2),
    pt(1.5+np.sqrt(3)/2, 1.5-np.sqrt(3)/2),
    pt(2.5+np.sqrt(3)/2, 1.5-np.sqrt(3)/2),
    pt(3+np.sqrt(3)/2,   1.5),
    pt(3.0,              2.0),
    pt(3-np.sqrt(3)/2,   1.5),
    pt(2.5-np.sqrt(3)/2, 1.5+np.sqrt(3)/2),
    pt(1.5-np.sqrt(3)/2, 1.5+np.sqrt(3)/2),
    pt(0.5-np.sqrt(3)/2, 1.5+np.sqrt(3)/2),
    pt(-np.sqrt(3)/2,    1.5),
    pt(0.0,              1.0)
]

SPECTRE_SHAPE = draw.Lines(*flatten([p.xy for p in SPECTRE_POINTS]), close=True)
SPECTRE_SHAPE_QUAD = draw.Lines(*flatten([p.xy for i,p in enumerate(SPECTRE_POINTS) if i in {3,5,7,11}]), close=True)

Centerpoint = pt(1.5, 1.0)
def drawPolygon(drawing, T, label, functions=None, ppos=-1):
    """
    Draw a polygon with transformation and accepts a list of drawing functions

    Args:
        drawing: The drawing object to append to
        T: Transformation matrix
        label: The tile label
        functions: List of functions that each accept (group, label) as arguments
    """
    group = draw.Group(
        transform=f"matrix({T[0]} {T[3]} {T[1]} {T[4]} {T[2]} {T[5]})"
    )

    # Apply each drawing function
    if functions:
        for func in functions:
            func(group, label, T)

    drawing.append(group)
    group.append(draw.Text(
        f"{ppos}",
        .4,
        1.5, .6,
        text_anchor="middle",
        fill="black",
        dominant_baseline="middle"
    ))

# Then define the individual drawing functions:


def draw_base(group, label, _):
    group.append(draw.Use(
        SPECTRE_SHAPE,
        0, 0,
        fill=COLOR_MAP[label],
        stroke="black",
        stroke_width=0.1))


def draw_quad(group, label, _):
    group.append(draw.Use(
        SPECTRE_SHAPE_QUAD,
        0, 0,
        fill=COLOR_MAP_lite[label],
        stroke="black",
        stroke_width=0.1))

def draw_center_text(group, label, _):
    group.append(draw.Text(
        label,
        .4,
        1.5, 1.0,
        text_anchor="middle",
        fill="black",
        dominant_baseline="middle"
    ))

def draw_edge_numbers(group, label, _):
    edge_labels = get_edge_labels(label)
    for i in range(len(SPECTRE_POINTS)):
        p1 = SPECTRE_POINTS[i]
        p2 = SPECTRE_POINTS[(i + 1) % len(SPECTRE_POINTS)]
        label_x, label_y = get_inset_point(p1, p2)
        elab = str(edge_labels[i])
        group.append(draw.Text(
            elab,
            0.15, # .22
            label_x, label_y,
            text_anchor="middle",
            fill="red" if '-' in elab else "blue",
            dominant_baseline="middle"
        ))

def check_edge_pair_conditions(pair, minor_edge_selector=1):
    """Check if edge pair meets the minor edge or major 8 conditions."""
    return (
        is_connectable_edge(pair[0]) and is_connectable_edge(pair[1])
      )

def is_connectable_edge(edge):
   """Check if edge can be connected (has minor=1 or major=8)."""
   return edge.minor == 1 or edge.major == 8

def make_edge_graph(big_edge_graph, T, face, allowed_edges=None):
    """Create graph edges for a tile, similar to drawPolygon. TODO prefilter for allowed_edges"""

    # Get transformed points
    transformed_points = [transPt(T, p) for p in SPECTRE_POINTS]

    # Add edges using edge labels
    edges = get_edge_labels(face)
    face_point = transPt(T, pt(1.5,1))

    face_label = f"{face}:[{round(face_point.x*10,3)},{round(face_point.y*10,3)}]"

    for i in range(len(SPECTRE_POINTS)):
        pA = transformed_points[i]
        pAuse = pA
        if edges[i].major != 0:
          pA2 = transformed_points[(i+1) % len(SPECTRE_POINTS)]
          pAuse = midpoint(pA,pA2)
        p1_key = (round(pAuse.x*10,3), round(pAuse.y*10,3))
        for i2 in range(len(SPECTRE_POINTS)):
          if i2 <= i:
            continue

          edge_pair = (edges[i], edges[i2])
          # Filter the edge pair before adding
          # This filters for only .1's except 8's which only have 1 edge.
          if check_edge_pair_conditions(edge_pair):
            pB = transformed_points[i2]
            pBuse = pB
            if edges[i2].major != 0:
              pB2 = transformed_points[(i2+1) % len(SPECTRE_POINTS)]
              pBuse = midpoint(pB,pB2)
            p2_key = (round(pBuse.x*10,3), round(pBuse.y*10,3))
            big_edge_graph.setdefault(p1_key, {}).setdefault(p2_key, {}).setdefault(face_label, []).append(edge_pair)









class Tile:
  def __init__(self,pts, label):
        """
        pts: list of Tile coordinate points
        label: Tile type used for coloring
        """
        self.quad = [pts[3], pts[5], pts[7], pts[11]]
        self.label = label
        # self.pos=pos

  def draw(self, drawing, tile_transformation=IDENTITY, draw_funcs=None, ppos=0):
        global num_tiles
        num_tiles += 1
        return drawPolygon(drawing, tile_transformation, self.label, draw_funcs, ppos)

  def make_edge_graph(self, big_edge_graph, tile_transformation=IDENTITY, allowed_edges=None):
        make_edge_graph(big_edge_graph, tile_transformation, self.label, allowed_edges=allowed_edges)

  def count(self):
    return 1

  def process_circuits(self, stats, allowed_edges, tile_transformation=IDENTITY):
    """Process paths in a tile to find circuits and track unfinished paths.

    Each entry in tails maps a point to a tuple of (other_endpoint, path_length)
    """
    if self.label not in allowed_edges:
        return

    # For each valid edge pair in this tile type
    for edge_pair in allowed_edges[self.label]:
        points = []
        # Get entry/exit points for both edges
        for edge in edge_pair:
            point = edge.entry_on_spectre()
            if point:
                # Transform the point based on tile position
                transformed_point = transPt(tile_transformation, point)
                # Round coordinates to avoid floating point issues
                point_key = (round(transformed_point.x*10, 3), round(transformed_point.y*10, 3))
                points.append(point_key)

        if len(points) != 2:
            continue

        p1, p2 = points
        # Calculate length of this segment
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        segment_length = 1


        # Both points are existing tails - we found a circuit!
        if p1 in stats['tails'] and p2 in stats['tails']:
            # Get the other ends and lengths of both tails
            p1_other, p1_length = stats['tails'][p1]
            p2_other, p2_length = stats['tails'][p2]

            # Verify bidirectional integrity
            assert p1 == stats['tails'][p1_other][0], f"Bidirectional integrity failed for p1 {p1} and {p1_other}"
            assert p2 == stats['tails'][p2_other][0], f"Bidirectional integrity failed for p2 {p2} and {p2_other}"

            # Add up total circuit length

            if p1_other == p2 or p2_other == p1:
              # Circuit.
              assert p2_other == p1, f"circuit check failed for p1 {p1}-{p1_other} {p2}-{p2_other}"
              assert p1_other == p2, f"circuit check failed for p1 {p1}-{p1_other} {p2}-{p2_other}"
              assert p1_length == p2_length, f"circuit check failed for p1 {p1}-{p1_other} {p2}-{p2_other} with lengths {p1_length}, {p2_length}"
              total_length = p1_length + segment_length
              # Remove both tail pairs
              del stats['tails'][p1]
              del stats['tails'][p2]

              # Record circuit with its length
              stats['circuits'][total_length]+=1
            else:
              # Bridge
              del stats['tails'][p1]
              del stats['tails'][p2]
              new_length = p1_length + p2_length + segment_length
              stats['tails'][p1_other] = (p2_other, new_length)
              stats['tails'][p2_other] = (p1_other, new_length)


        # One point matches an existing tail
        elif p1 in stats['tails']:
            other_end, current_length = stats['tails'][p1]
            # Verify bidirectional integrity
            assert p1 == stats['tails'][other_end][0], f"Bidirectional integrity failed for p1 {p1} and {other_end}"

            # Replace the tail point with the new end and update length
            new_length = current_length + segment_length
            del stats['tails'][p1]
            #del stats['tails'][other_end]
            stats['tails'][p2] = (other_end, new_length)
            stats['tails'][other_end] = (p2, new_length)

        elif p2 in stats['tails']:
            other_end, current_length = stats['tails'][p2]
            # Verify bidirectional integrity
            assert p2 == stats['tails'][other_end][0], f"Bidirectional integrity failed for p2 {p2} and {other_end}"

            # Replace the tail point with the new end and update length
            new_length = current_length + segment_length
            del stats['tails'][p2]
            #del stats['tails'][other_end]
            stats['tails'][p1] = (other_end, new_length)
            stats['tails'][other_end] = (p1, new_length)

        # Neither point is a tail - add new tail pair
        else:
            stats['tails'][p1] = (p2, segment_length)
            stats['tails'][p2] = (p1, segment_length)



class MetaTile:
  def __init__(self, geometries=[], quad=[], label=""):
        """
        geometries: list of pairs of (Meta)Tiles and their transformations
        quad: MetaTile quad points
        """
        self.geometries = geometries
        self.quad = quad
        self.label = label
        #self.pos=pos

  def draw(self, drawing, metatile_transformation=IDENTITY,draw_funcs=None,ppos=0):
        """
        recursively expand MetaTiles down to Tiles and draw those
        """
        # TODO: parallelize?
        m = 1 if len(self.geometries) == 2 else 10
        [ shape.draw(drawing, mul(metatile_transformation, shape_transformation), draw_funcs, ppos*m +pos) for shape, shape_transformation, pos in self.geometries ]
        if len(self.geometries) == 2:
          return
        tps = []
        for pt in self.quad:
          tp = transPt(metatile_transformation, pt)
          drawing.append(draw.Circle(tp.x, tp.y, 0.1, fill="none", stroke='red'))
          tps.append(tp)
        # SPECTRE_SHAPE_QUAD = draw.Lines(*flatten([p.xy for i,p in enumerate(SPECTRE_POINTS) if i in {3,5,7,11}]), close=True)
        lines = draw.Lines(*flatten([t.xy for t in tps]), close=True)
        drawing.append(draw.Use(
          lines,
          0, 0,
          fill='none',
          stroke=COLOR_MAP[self.label],
          stroke_width=0.1)
        )

  def make_edge_graph(self, big_edge_graph, metatile_transformation=IDENTITY,allowed_edges=None):
        for shape, shape_transformation,_ in self.geometries:
            shape.make_edge_graph(big_edge_graph, mul(metatile_transformation, shape_transformation), allowed_edges=allowed_edges)


  def process_circuits(self, stats, allowed_edges, metatile_transformation=IDENTITY):
    """Process circuits for all geometries in the metatile."""
    for shape, shape_transformation,_ in self.geometries:
        shape.process_circuits(stats,allowed_edges, mul(metatile_transformation, shape_transformation))

  def count(self):
    return sum(shape.count() for shape, g,_ in self.geometries)

def draw_shape(shape_data):
    drawing, metatile_transformation, shape, shape_transformation = shape_data
    return shape.draw(drawing, mul(metatile_transformation, shape_transformation))

def buildSpectreBase():
    spectre_base_cluster = { label: Tile(SPECTRE_POINTS, label) for pos,label in enumerate(TILE_NAMES) if label != "Gamma" }
    # special rule for Gamma
    mystic = MetaTile(
        [
            [Tile(SPECTRE_POINTS, "Gamma1"), IDENTITY, 0],
            [Tile(SPECTRE_POINTS, "Gamma2"), mul(ttrans(SPECTRE_POINTS[8].x, SPECTRE_POINTS[8].y), trot(np.pi/6)), 1]
        ],
        [SPECTRE_POINTS[3], SPECTRE_POINTS[5], SPECTRE_POINTS[7], SPECTRE_POINTS[11]],
        "Gamma"
    )
    spectre_base_cluster["Gamma"] = mystic

    return spectre_base_cluster

# This is where the magic happens.
def buildSupertiles(tileSystem):
    """
    iteratively build on current system of tiles
    tileSystem = current system of tiles, initially built with buildSpectreBase()
    """

    # First, use any of the nine-unit tiles in tileSystem to obtain
    # a list of transformation matrices for placing tiles within
    # supertiles.
    quad = tileSystem["Delta"].quad
    R = [-1, 0, 0, 0, 1, 0]

    """
    [rotation angle, starting quad point, target quad point]
    """
    transformation_rules = [
        [60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
        [0, 2, 0], [60, 3, 1], [-120, 3, 3]
    ]

    transformations = [IDENTITY]
    total_angle = 0
    rotation = IDENTITY
    transformed_quad = list(quad)

    for _angle, _from, _to in transformation_rules:
        if(_angle != 0):
            total_angle += _angle
            rotation = trot(np.deg2rad(total_angle))
            transformed_quad = [ transPt(rotation, quad_pt) for quad_pt in quad ]

        ttt = transTo(
            transformed_quad[_to],
            transPt(transformations[-1], quad[_from])
        )
        transformations.append(mul(ttt, rotation))

    transformations = [ mul(R, transformation) for transformation in transformations ]

    # Now build the actual supertiles, labelling appropriately.
    super_rules = {
        "Sigma":  ["Xi",  "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Lambda", "Gamma"],
        "Gamma":  ["Pi",  "Delta", None,  "Theta", "Sigma", "Xi",  "Phi",    "Gamma"],
        "Delta":  ["Xi",  "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],#4*8 5*7 or 6*6
        "Theta":  ["Psi", "Delta", "Pi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
        "Lambda": ["Psi", "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
        "Xi":     ["Psi", "Delta", "Pi",  "Phi",   "Sigma", "Psi", "Phi",    "Gamma"],
        "Pi":     ["Psi", "Delta", "Xi",  "Phi",   "Sigma", "Psi", "Phi",    "Gamma"],
        "Phi":    ["Psi", "Delta", "Psi", "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
        "Psi":    ["Psi", "Delta", "Psi", "Phi",   "Sigma", "Psi", "Phi",    "Gamma"]
    }
    super_quad = [
        transPt(transformations[6], quad[2]),
        transPt(transformations[5], quad[1]),
        transPt(transformations[3], quad[2]),
        transPt(transformations[0], quad[1])
    ]


    # Need to make metatile know what tile connects to what other tile.
    # We can do it here without using any geometry at run time, just calculate it on paper.

    return {
        label: MetaTile(
            [ [tileSystem[substitution], transformation,pos] for pos,(substitution, transformation) in enumerate(zip(substitutions, transformations)) if substitution ],
            super_quad,
            label
        ) for label, substitutions in super_rules.items() }

# "Delta":  ["Xi",  "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],#4*8 5*7 or 6*6
# 2Xi.-2A:3Phi.2A
# 2Xi.-1A:1Delta.1A
# Make this data from the big graph implementation.
# Then update the metaedges to also have edges such that we can get all the sub edges and test if they have lines.
# This is all doable but what's the point? I'm convinced that it's an infinite line.
# This has been useful to develop a better understanding of the stuff. I should leave it at that. Maybe focus on faster rendering.