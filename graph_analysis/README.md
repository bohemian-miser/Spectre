### `mega_df.csv` Description

The `mega_df.csv` file contains an exhaustive analysis of circuit and tail patterns generated from various edge selections within the Spectre tiling system, expanded to a specific supertiling level. Each row represents a unique configuration of selected edges and the resulting path characteristics within the generated tiling.

**Columns:**

*   **`combo`** (string): A binary string representing the specific combination of edge pairing options chosen for each of the 10 Spectre tile types. The order of tile types corresponds to `ALL_TILE_NAMES = ["Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Gamma2", "Gamma1"]`.
*   **`tails`** (integer): The total number of open paths (or 'tails') found in the tiling for the given `combo`.
*   **`circuits`** (integer): The total number of closed loops (or 'circuits') found in the tiling for the given `combo`.
*   **`max_tail`** (integer): The length of the longest individual tail found in the tiling.
*   **`max_circuit`** (integer): The length of the longest individual circuit found in the tiling.
*   **`circuit_lengths`** (list of integers): A list of all unique lengths of circuits identified, sorted in ascending order.
*   **`tail_lengths`** (dictionary): A dictionary where keys are the lengths of tails, and values are the count of how many tails of that specific length were found.
*   **`edge_selection`** (string): A string representing the major edge types (e.g., '0136') that were initially selected to be active for the analysis across all tiles.


The entries with **`max_circuit = 0`** indicate that they are potentially space filling curves that never make circuits.