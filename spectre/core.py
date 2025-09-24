from dataclasses import dataclass
from typing import List, Optional, Dict, Iterator
import re

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
