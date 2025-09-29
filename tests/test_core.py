import pytest
import numpy as np
from spectre.core import make_tails_df, edge_vec, max_options_for_edges, analyze_graph_with_level

def test_max_options_for_edges_single():
    tails = make_tails_df()
    result = (tails.values @ np.array(edge_vec([1]))) 
    expected = np.array([1, 0, 1, 1, 2, 1, 0, 1, 0, 2])
    assert np.array_equal(result, expected), f"Expected {expected}, got {result}"

def test_max_options_for_edges_pair():
    tails = make_tails_df()
    result = (tails.values @ np.array(edge_vec([1,5]))) % 2
    expected = np.array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    assert np.array_equal(result, expected), f"Expected {expected}, got {result}"
    # Also test via max_options_for_edges
    assert max_options_for_edges([1,5]) == [0,0,0,0,1,0,0,1,0,0]

def test_analyze_graph_with_level():
    edges_selected = [1, 5]
    combo_selected = '0000100100'
    level = 4

    result = analyze_graph_with_level(edges_selected, combo_selected, level)

    assert "leaves" in result, "Leaves key missing in result"
    assert "circuits" in result, "Circuits key missing in result"

    # Validate leaves
    leaves = result["leaves"]
    assert len(leaves) == 3, f"Expected 3 leaves, got {len(leaves)}"
    assert all(len(leaf) <= level for leaf in leaves), "Leaves exceed level limit"

    # Validate circuits
    circuits = result["circuits"]
    assert len(circuits) == 2, f"Expected 2 circuits, got {len(circuits)}"
    assert all(len(circuit) <= level for circuit in circuits), "Circuits exceed level limit"

