from dataclasses import dataclass
from typing import List, Optional, Dict, Iterator
import re
import logging

# --- Edge and TileEdges classes ported from notebook ---
@dataclass(frozen=True, order=True)
class Edge:
    major: int
    is_negative: Optional[bool] = None
    minor: Optional[int] = None
    variant: Optional[str] = None
    pos: Optional[int] = None

    @classmethod
    def from_string(cls, s, in_pos=None):
        # Example: '-3.1A', '2.0B', '5.0A', etc.
        m = re.match(r"(-)?(\d+)\.(\d+)([AB])?", s)
        if not m:
            raise ValueError(f"Invalid edge string: {s}")
        is_negative = m.group(1) == '-'
        major = int(m.group(2))
        minor = int(m.group(3))
        variant = m.group(4)
        return cls(major=major, is_negative=is_negative, minor=minor, variant=variant, pos=in_pos)

    def mask(self,  is_negative: bool = True,
             minor: bool = True, variant: bool = True) -> 'Edge':
        """
        Creates a new Edge with only the specified fields preserved.
        Other fields are set to None to act as wildcards in comparisons.

        Args:
            is_negative: If False, sets is_negative to None
            minor: If False, sets minor to None
            variant: If False, sets variant to None

        Returns:
            A new Edge instance with specified fields masked
        """
        return Edge(
            major=self.major, # Must have major. If I ever need to not have major I'll make it optional.
            is_negative=self.is_negative if is_negative else None,
            minor=self.minor if minor else None,
            variant=self.variant if variant else None
        )

    def matches(self, other: 'Edge') -> bool:
        if self.major != other.major:
            return False
        if other.minor is not None and self.minor != other.minor:
            return False
        if other.is_negative is not None and self.is_negative != other.is_negative:
            return False
        if other.variant is not None and self.variant != other.variant:
            return False
        return True


@dataclass
class TileEdges:
    """Represents all edges for a specific tile type"""
    tile_type: str
    edges: List[Edge]


    @classmethod
    def from_edge_list(cls, tile_type: str, edge_strings: List[str]) -> 'TileEdges':
        """Create TileEdges from a list of edge string representations"""
        return cls(
            tile_type,
            [Edge.from_string(edge_str,in_pos=pos) for pos, edge_str in enumerate(edge_strings)]
        )

    def __iter__(self) -> Iterator[Edge]:
        return iter(self.edges)

    def __getitem__(self, idx):
        return self.edges[idx]

    def index(self, edge):
        """Return the index of edge in the edges list"""
        return self.edges.index(edge)


    def subset(self, match_edge: Edge) -> List[Edge]:
        return [match_edge for edge in self.edges if edge.matches(match_edge)]

    def major_edges(self):
        """Return the index of edge in the edges list"""
        majors = set(
            # Make minor None.
            e.mask(is_negative=True, minor=False, variant=True)
            for e in self.edges
        )
        # The shared 2 edge in Gamma1 shouldn't be counted. It's counted in Gamma2.
        if self.tile_type == 'Gamma1':
          majors -= set([Edge(major=2, is_negative=False, minor=None, variant='A')])
        return majors

    def major_edge_count(self):
        """Count of how many of each major edge (keyed by major int)"""
        ec = defaultdict(int)
        for edge in self.major_edges():
          ec[edge.major] += 1
        return ec

    def tails(self):
        """Which edges have tails lying around."""
        ec = set()
        for edge in self.major_edges():
          # If there is an even number then they can join up so remove it.
          if edge.major in ec:
            ec.remove(edge.major)
          else:
            ec.add(edge.major)
        return ec

    def connectable_edges(self):
        """is_connectable_edge defines what is possible"""
        return TileEdges(
            tile_type = self.tile_type,
            edges = [edge for edge in self.edges if is_connectable_edge(edge)],
        )

    def with_majors(self, major_set):
        return TileEdges(
            tile_type = self.tile_type,
            edges = [edge for edge in self.edges if edge.major in major_set],
        )

    def multiplicity_major(self, multiplicity):
        """multiplicity is a dict from major edge to how many lines go through it"""
        return {e:multiplicity[e.major] for e in create_tile_edges()['Delta'].major_edges() if e.major in multiplicity}

    def make_edge_graph(self, big_edge_graph, allowed_edges=None):
        """
        Populate the big_edge_graph with edges from this tile.

        Args:
            big_edge_graph (dict): The graph to populate.
            allowed_edges (list, optional): List of allowed edges. Defaults to None.
        """
        for edge in self.edges:
            if allowed_edges is None or edge in allowed_edges:
                big_edge_graph[edge] = {}

def is_connectable_edge(edge):
   """Check if edge can be connected (has minor=1 or major=8)."""
   return edge.minor == 1 or edge.major == 8

def create_tile_edges() -> Dict[str, TileEdges]:
    """Create TileEdges objects for all tile types"""
    return {
        tile_type: TileEdges.from_edge_list(tile_type, edge_list)
        for tile_type, edge_list in unique_edge_labels.items()
    }


def get_edge_labels(tile_type: str) -> TileEdges:
    """Get edges for a specific tile type"""
    tile_edges = create_tile_edges()
    return tile_edges[tile_type]


def make_tails_df():
  tile_edges = create_tile_edges()
  data = {}
  for tile_name, tile in tile_edges.items():
    row = defaultdict(lambda: 0)
    ec = tile.major_edge_count()
    for tail in range(9):
      # row[tail] = 1 if tail in tile.tails() else 0
      row[tail] = ec[tail]# if tail in ec else 0
    data[tile_name] = row
  df = pd.DataFrame.from_dict(data, orient='index')
  return df


import numpy as np
import pandas as pd
from collections import defaultdict

def parse_edges(edges_str):
    """Parse a string of edge numbers into a sorted list of unique integers."""
    try:
        # Accepts comma, space, or just digits
        if isinstance(edges_str, (list, tuple)):
            edges = [int(e) for e in edges_str]
        else:
            edges = [int(e) for e in str(edges_str) if e.isdigit()]
        return sorted(set(edges))
    except Exception:
        raise ValueError(f"Invalid edge string: {edges_str}")


# --- Notebook logic for max_options ---
ALL_TILE_NAMES = ["Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Gamma2", "Gamma1"]

def edge_vec(l):
    return [1 if x in l else 0 for x in range(9)]


# --- Real notebook logic for make_tails_df ---
unique_edge_labels = {
    'Delta':  ['3.0A','3.1A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-3.1A','-3.0A', '-6.1A','-6.0A'],  # Δ
    'Theta':  ['3.0A','3.1A', '2.0A','2.1A','2.2A', '8.0A', '2.0B','2.1B','2.2B', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],  # Θ
    'Lambda': ['3.0A','3.1A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-8.0A', '-2.2A','-2.1A','-2.0A'],  # Λ
    'Xi':     ['-1.2A','-1.1A','-1.0A', '5.0A','5.1A', '8.0A', '2.0A','2.1A','2.2A', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],  # Ξ
    'Pi':     ['-1.2A','-1.1A','-1.0A', '5.0A','5.1A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-8.0A', '-2.2A','-2.1A','-2.0A'],  # Π
    'Sigma':  ['4.2A','4.3A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '1.0A','1.1A','1.2A', '-3.1A','-3.0A', '4.0A','4.1A'],  # Σ
    'Phi':    ['3.0A','3.1A', '2.0A','2.1A','2.2A', '-5.1A','-5.0A', '5.0A','5.1A', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],  # Φ
    'Psi':    ['-1.2A','-1.1A','-1.0A', '5.0A','5.1A', '-5.1A','-5.0A', '5.0B','5.1B', '0.0A','0.1A', '-2.2A','-2.1A','-2.0A'],  # Ψ
    'Gamma2': ['-7.1A','-7.0A', '-3.1A','-3.0A', '6.0A','6.1A', '-4.3A','-4.2A','-4.1A','-4.0A', '2.0A','2.1A', '-7.3A','-7.2A'],
    'Gamma1': ['-1.2A','-1.1A','-1.0A', '1.0A','1.1A','1.2A', '7.0A','7.1A','7.2A','7.3A', '2.2A', '-2.2A','-2.1A','-2.0A'],  # Γ
}



# --- Colab logic for max_options_for_edges ---

# --- Ported from notebook ---
def val_counts(stuff):
    counts = {}
    for x in stuff:
        if x not in counts:
            counts[x] = 0
        counts[x] += 1
    return counts

def val_count_key(vc):
    s = ""
    # Convert all keys to strings for sorting to avoid str/int comparison
    for k in sorted(vc.keys(), key=lambda x: str(x)):
        v = vc[k]
        s += f"{k}:{v},"
    return s[:-1]

def filter_results(subcombos):
    result = []
    seen_combos = set()
    for subcombo in subcombos:
        vc = val_count_key(val_counts(subcombo))
        if vc not in seen_combos:
            seen_combos.add(vc)
            result.append(subcombo)
    return result

def generate_valid_combinations(counts):
    if all(v == 0 for v in counts.values()):
        return [[]]  # Base case - no more edges needed
    # Find first non-zero key
    first_edge = next(k for k, v in counts.items() if v > 0)
    counts = counts.copy()
    counts[first_edge] -= 1
    result = []
    found_pair = False
    for second_edge in counts.keys():
        if counts[second_edge] == 0:
            continue
        found_pair = True
        cc = counts.copy()
        cc[second_edge] -= 1
        pair = (first_edge, second_edge)
        subcombos = generate_valid_combinations(cc)
        if not subcombos:
            result.append([pair])
            continue
        for subcombo in subcombos:
            result.append([pair] + subcombo)
    if not found_pair:
        result.append([(first_edge, 'X')])
    return filter_results(result)

def generate_map_of_valid_combinations(majors):
  result = {}
  for tile, ct in create_tile_edges().items():
    counts ={ e:1 for e in ct.connectable_edges().with_majors(majors) }
    result[tile] = generate_valid_combinations(counts)
  return result

def no_crossing(edge_pairs):
    # Convert pairs to indices
    index_pairs = []
    for edge1, edge2 in edge_pairs:
        i1, i2 = edge1, edge2
        index_pairs.append((min(i1, i2), max(i1, i2)))
    for i in range(len(index_pairs)):
        for j in range(i + 1, len(index_pairs)):
            a1, a2 = index_pairs[i]
            b1, b2 = index_pairs[j]
            if (a1 < b1 < a2 < b2) or (b1 < a1 < b2 < a2):
                return False
    return True

def filter_non_crossing_combinations(all_possible_edge_combos):
    filtered_combos = {}
    for tile, combinations in all_possible_edge_combos.items():
        filtered_combos[tile] = [c for c in combinations if no_crossing(c)]
    return filtered_combos


def max_options_for_edges(edges):
    # Use the Colab logic: generate_map_of_valid_combinations -> filter_non_crossing_combinations -> count per tile
    # Parity check: must match notebook logic
    tails_df = make_tails_df()
    parity = (tails_df.values @ edge_vec(edges)) % 2
    if not np.all(parity == 0):
        print("Parity check failed")
        # Invalid edge set: return all zeros
        return [0] * len(ALL_TILE_NAMES)
    all_edges = generate_map_of_valid_combinations(edges)
    non_crossing_options = filter_non_crossing_combinations(all_edges)
    max_options = [len(non_crossing_options[tile])-1 for tile in ALL_TILE_NAMES]
    return max_options


def check_combo_valid(edges, combo_selected):
    """Check if each digit in combo_selected is <= max for that tile."""
    max_options = max_options_for_edges(edges)
    if sum(max_options) == 0:
        return False, f"Invalid edge set: parity check failed for edges {edges}."
    if len(combo_selected) != len(max_options):
        return False, f"Combo length {len(combo_selected)} does not match max options {len(max_options)}."
    for i, (digit, max_val) in enumerate(zip(combo_selected, max_options)):
        if int(digit) > max_val:
            return False, f"Digit {digit} at position {i} exceeds max {max_val} for {ALL_TILE_NAMES[i]}."
    return True, f"Combo is valid for edges {edges}. Max options: {max_options}"


def analyze_graph(edges, combo_selected):
    """
    Perform graph analysis for the given edges and combination selection.

    Args:
        edges (list): List of selected edges.
        combo_selected (str): Combination selection string.

    Returns:
        dict: Analysis results including leaves, circuits, and other components.
    """
    # Validate the combination selection
    is_valid, validation_message = check_combo_valid(edges, combo_selected)
    if not is_valid:
        return {"error": validation_message}

    # Generate valid combinations and filter non-crossing ones
    all_edges = generate_map_of_valid_combinations(edges)
    non_crossing_options = filter_non_crossing_combinations(all_edges)

    # Extract allowed edges based on the combination
    allowed_edges = get_edges_from_combo(non_crossing_options, string_to_combo(combo_selected))

    # Filter edges in the graph
    fg = filter_edges(big_edge_graph, allowed_edges)

    # Find components in the graph
    components = find_components(fg)

    # Analyze components into leaves, circuits, and others
    leaves, circuits, others, unique_comps = comps_and_analysis(fg, components)

    # Return the analysis results
    return {
        "leaves": leaves,
        "circuits": circuits,
        "others": others,
        "unique_components": unique_comps
    }

# Set up logging for debugging
logging.basicConfig(level=logging.DEBUG, filename='debug.log', filemode='w', force=True)
logger = logging.getLogger(__name__)

def analyze_graph_with_level(edges, combo_selected, level):
    """
    Perform graph analysis for the given edges, combination selection, and level.

    Args:
        edges (list): List of selected edges.
        combo_selected (str): Combination selection string.
        level (int): Depth level for analysis.

    Returns:
        dict: Analysis results including leaves, circuits, and other components.
    """
    # Initialize big_edge_graph
    big_edge_graph = {}

    # Populate big_edge_graph with edges
    for tile_name, tile_edges in create_tile_edges().items():
        tile_edges.make_edge_graph(big_edge_graph)

    # Validate the combination selection
    is_valid, validation_message = check_combo_valid(edges, combo_selected)
    if not is_valid:
        logger.debug(f"Validation failed: {validation_message}")
        return {"error": validation_message}

    # Compute supertiles and edges
    logger.debug(f"Computing supertiles for edges: {edges}")
    all_edges = generate_map_of_valid_combinations(edges)
    logger.debug(f"Generated valid combinations: {all_edges}")

    non_crossing_options = filter_non_crossing_combinations(all_edges)
    logger.debug(f"Filtered non-crossing combinations: {non_crossing_options}")

    # Extract allowed edges based on the combination
    allowed_edges = get_edges_from_combo(non_crossing_options, string_to_combo(combo_selected))
    logger.debug(f"Allowed edges: {allowed_edges}")

    # Filter edges in the graph
    fg = filter_edges(big_edge_graph, allowed_edges)
    logger.debug(f"Filtered graph: {fg}")

    # Find components in the graph
    components = find_components(fg)
    logger.debug(f"Components: {components}")

    # Analyze components into leaves, circuits, and others
    leaves, circuits, others, unique_comps = comps_and_analysis(fg, components)
    logger.debug(f"Leaves: {leaves}, Circuits: {circuits}, Others: {others}, Unique Components: {unique_comps}")

    # Filter results based on the level
    leaves = [leaf for leaf in leaves if len(leaf) <= level]
    circuits = [circuit for circuit in circuits if len(circuit) <= level]

    logger.debug(f"Filtered Leaves: {leaves}, Filtered Circuits: {circuits}")

    # Return the analysis results
    return {
        "leaves": leaves,
        "circuits": circuits,
        "others": others,
        "unique_components": unique_comps
    }

# Ensure debug_comps_and_analysis is used globally
def comps_and_analysis(graph, components):
    return debug_comps_and_analysis(graph, components)

# Define missing functions and variables

def string_to_combo(combo_selected):
    """
    Convert a combination string into a list of integers.

    Args:
        combo_selected (str): Combination string (e.g., '0100101100').

    Returns:
        list: List of integers representing the combination.
    """
    return [int(digit) for digit in combo_selected]

def get_edges_from_combo(non_crossing_options, combo):
    """
    Extract edges from the combination string.

    Args:
        non_crossing_options (dict): Non-crossing combinations for each tile.
        combo (list): Combination as a list of integers.

    Returns:
        list: Allowed edges based on the combination.
    """
    allowed_edges = []
    for tile, index in zip(non_crossing_options.keys(), combo):
        if index < len(non_crossing_options[tile]):
            allowed_edges.extend(non_crossing_options[tile][index])
    return allowed_edges

def filter_edges(graph, edges):
    """
    Filter edges in the graph based on the allowed edges.

    Args:
        graph (dict): The graph to filter.
        edges (list): List of allowed edges.

    Returns:
        dict: Filtered graph containing only the allowed edges.
    """
    logger.debug(f"Original graph: {graph}")
    logger.debug(f"Edges to filter: {edges}")

    # Ensure the graph contains the edges to filter
    filtered_graph = {}
    for edge in edges:
        if edge in graph:
            filtered_graph[edge] = graph[edge]

    logger.debug(f"Filtered graph: {filtered_graph}")
    return filtered_graph

def find_components(graph):
    """
    Find components in the graph.

    Args:
        graph: The graph to analyze.

    Returns:
        list: List of components in the graph.
    """
    # Placeholder implementation
    return [[node] for node in graph]

def debug_comps_and_analysis(graph, components):
    """
    Debug version of comps_and_analysis to trace intermediate results.

    Args:
        graph: The graph to analyze.
        components (list): List of components.

    Returns:
        tuple: Leaves, circuits, others, and unique components.
    """
    logger.debug(f"Graph: {graph}")
    logger.debug(f"Components: {components}")

    leaves = [comp for comp in components if len(comp) == 1]
    circuits = [comp for comp in components if len(comp) > 1]
    others = []
    unique_comps = list(set(tuple(sorted(comp)) for comp in components))

    logger.debug(f"Leaves: {leaves}")
    logger.debug(f"Circuits: {circuits}")
    logger.debug(f"Others: {others}")
    logger.debug(f"Unique Components: {unique_comps}")

    return leaves, circuits, others, unique_comps

# Replace comps_and_analysis with debug_comps_and_analysis in analyze_graph_with_level
analyze_graph_with_level.__globals__['comps_and_analysis'] = debug_comps_and_analysis

# Adapted from https://github.com/shrx/spectre/blob/master/spectre.py

import drawsvg as draw
import numpy as np
from time import time
#@title The guts of the algorithms
# Adapted from https://github.com/shrx/spectre/blob/master/spectre.py

import drawsvg as draw
import numpy as np
from time import time


#@title Geometry and utilities.

class pt:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.xy = [x, y]

def midpoint(point1 :pt, point2:pt) -> pt:
    return pt(
        (point1.x + point2.x) / 2,
        (point1.y + point2.y) / 2
    )

# Affine matrix multiply
def mul(A, B):
    return [
        A[0]*B[0] + A[1]*B[3],
        A[0]*B[1] + A[1]*B[4],
        A[0]*B[2] + A[1]*B[5] + A[2],

        A[3]*B[0] + A[4]*B[3],
        A[3]*B[1] + A[4]*B[4],
        A[3]*B[2] + A[4]*B[5] + A[5]
    ]

def parse_matrix_transform(a, b, c, d, e, f):
    """ Manually create a transformation matrix """
    return np.array([[a, c, e],
                  [b, d, f],
                  [0, 0, 1]])

def invert_transform(M):
    """Invert 2x3 affine transform matrix"""
    # Extract 2x2 part
    a, b, tx = M[0], M[1], M[2]
    c, d, ty = M[3], M[4], M[5]

    # Calculate determinant
    det = a*d - b*c

    # Invert 2x2 part
    a_inv = d/det
    b_inv = -b/det
    c_inv = -c/det
    d_inv = a/det

    # Calculate translation part
    tx_inv = -(a_inv*tx + b_inv*ty)
    ty_inv = -(c_inv*tx + d_inv*ty)

    return [a_inv, b_inv, tx_inv, c_inv, d_inv, ty_inv]


# Rotation matrix
def trot(ang):
    c = np.cos(ang)
    s = np.sin(ang)
    return [c, -s, 0, s, c, 0]

# Translation matrix
def ttrans(tx, ty):
    return [1, 0, tx, 0, 1, ty]

def transTo(p, q):
    return ttrans(q.x - p.x, q.y - p.y)

# Matrix * point
def transPt(M, P):
    return pt(M[0]*P.x + M[1]*P.y + M[2], M[3]*P.x + M[4]*P.y + M[5])

def get_inset_point(p1, p2, inset=.3):
   """Get point that's inset from midpoint perpendicular to edge"""
   mid_x = (p1.x + p2.x)/2
   mid_y = (p1.y + p2.y)/2

   # Vector along edge
   dx = p2.x - p1.x
   dy = p2.y - p1.y

   # Perpendicular vector (rotate 90° counterclockwise)
   perp_x = -dy
   perp_y = dx

   # Normalize and scale
   length = np.sqrt(perp_x**2 + perp_y**2)
   perp_x = perp_x/length * inset
   perp_y = perp_y/length * inset

   return (mid_x + perp_x, mid_y + perp_y)




def align_edge(p1: pt, p2: pt, t1: pt, t2: pt):
    """Calculate affine matrix to transform input points to target points"""
    # Get vectors between points
    v1 = pt(p2.x - p1.x, p2.y - p1.y)
    v2 = pt(t2.x - t1.x, t2.y - t1.y)

    # Calculate rotation angle
    ang1 = np.arctan2(v1.y, v1.x)
    ang2 = np.arctan2(v2.y, v2.x)
    rot_angle = ang2 - ang1

    # Calculate scale
    len1 = np.sqrt(v1.x**2 + v1.y**2)
    len2 = np.sqrt(v2.x**2 + v2.y**2)
    scale = len2/len1 if len1 != 0 else 1

    # Compose transformation:
    # 1. Translate p1 to origin
    M = ttrans(-p1.x, -p1.y)
    # 2. Rotate
    M = mul(trot(rot_angle), M)
    # 3. Scale
    M = mul([scale, 0, 0, 0, scale, 0], M)
    # 4. Translate to t1
    M = mul(ttrans(t1.x, t1.y), M)

    return M

def list_to_str(l):
  return ''.join(str(x) for x in l)

def str_to_array(s):
  return np.array([int(x) for x in s])

def edge_vec(l):
  return [1 if x in l else 0 for x in range(9)]

def tails_for_major_edges(major_edge_matrix, s):
  """ Given a set of """
  v = np.array(edge_vec(s))
  return (major_edge_matrix @ v)%2

def set_to_str(ss):
  l = list(ss)
  l = sorted(l)
  return list_to_str(l)
def str_to_set(sr):
  return set(str_to_array(sr))



def pt_distance(p1:pt, p2:pt):
    return np.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)
def euclidean_distance(p1, p2):
    return pt_distance(pt(*p1), pt(*p2))

def distance(p1, p2):
    return euclidean_distance(p1,p2)
# Usefull when debugging with a plot.
def is_near_focal(point,focal_coords, dist=10):
    return any(distance(point, fp) <= dist for fp in focal_coords)

def flatten(lst):
    return [item for sublist in lst for item in sublist]
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

Centerpoint = pt(1.5, 1.0)
def drawPolygon(drawing, T, label, functions=None):
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

# Then define the individual drawing functions:
def draw_base(group, label, _):
    group.append(draw.Use(
        SPECTRE_SHAPE,
        0, 0,
        fill=COLOR_MAP[label],
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
            logger.debug(f"Adding edge pair {edge_pair} between {p1_key} and {p2_key}")

class Tile:
    def __init__(self, pts, label):
        """
        pts: list of Tile coordinate points
        label: Tile type used for coloring
        """
        self.quad = [pts[3], pts[5], pts[7], pts[11]]
        self.label = label

    def draw(self, drawing, tile_transformation=IDENTITY, draw_funcs=None):
        global num_tiles
        num_tiles += 1
        return drawPolygon(drawing, tile_transformation, self.label, draw_funcs)

    def make_edge_graph(self, big_edge_graph, tile_transformation=IDENTITY, allowed_edges=None):
        make_edge_graph(big_edge_graph, tile_transformation, self.label, allowed_edges=allowed_edges)

class MetaTile:
    def __init__(self, geometries=[], quad=[]):
        """
        geometries: list of pairs of (Meta)Tiles and their transformations
        quad: MetaTile quad points
        """
        self.geometries = geometries
        self.quad = quad

    def draw(self, drawing, metatile_transformation=IDENTITY,draw_funcs=None):
        """
        recursively expand MetaTiles down to Tiles and draw those
        """
        # TODO: parallelize?
        [ shape.draw(drawing, mul(metatile_transformation, shape_transformation), draw_funcs) for shape, shape_transformation in self.geometries ]

    def make_edge_graph(self, big_edge_graph, metatile_transformation=IDENTITY,allowed_edges=None):
        for shape, shape_transformation in self.geometries:
            shape.make_edge_graph(big_edge_graph, mul(metatile_transformation, shape_transformation), allowed_edges=allowed_edges)

def draw_shape(shape_data):
    drawing, metatile_transformation, shape, shape_transformation = shape_data
    return shape.draw(drawing, mul(metatile_transformation, shape_transformation))

def buildSpectreBase():
    spectre_base_cluster = { label: Tile(SPECTRE_POINTS, label) for label in TILE_NAMES if label != "Gamma" }
    # special rule for Gamma
    mystic = MetaTile(
        [
            [Tile(SPECTRE_POINTS, "Gamma1"), IDENTITY],
            [Tile(SPECTRE_POINTS, "Gamma2"), mul(ttrans(SPECTRE_POINTS[8].x, SPECTRE_POINTS[8].y), trot(np.pi/6))]
        ],
        [SPECTRE_POINTS[3], SPECTRE_POINTS[5], SPECTRE_POINTS[7], SPECTRE_POINTS[11]]
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
        "Gamma":  ["Pi",  "Delta", None,  "Theta", "Sigma", "Xi",  "Phi",    "Gamma"],
        "Delta":  ["Xi",  "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
        "Theta":  ["Psi", "Delta", "Pi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
        "Lambda": ["Psi", "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
        "Xi":     ["Psi", "Delta", "Pi",  "Phi",   "Sigma", "Psi", "Phi",    "Gamma"],
        "Pi":     ["Psi", "Delta", "Xi",  "Phi",   "Sigma", "Psi", "Phi",    "Gamma"],
        "Sigma":  ["Xi",  "Delta", "Xi",  "Phi",   "Sigma", "Pi",  "Lambda", "Gamma"],
        "Phi":    ["Psi", "Delta", "Psi", "Phi",   "Sigma", "Pi",  "Phi",    "Gamma"],
        "Psi":    ["Psi", "Delta", "Psi", "Phi",   "Sigma", "Psi", "Phi",    "Gamma"]
    }
    super_quad = [
        transPt(transformations[6], quad[2]),
        transPt(transformations[5], quad[1]),
        transPt(transformations[3], quad[2]),
        transPt(transformations[0], quad[1])
    ]

    return {
        label: MetaTile(
            [ [tileSystem[substitution], transformation] for substitution, transformation in zip(substitutions, transformations) if substitution ],
            super_quad
        ) for label, substitutions in super_rules.items() }