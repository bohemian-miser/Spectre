import pytest
import numpy as np
from spectre.core import make_tails_df, edge_vec, max_options_for_edges

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