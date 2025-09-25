import click
from .core import parse_edges, check_combo_valid

@click.group()
def cli():
    """Spectre: Edge and Graph Analysis Toolkit"""
    pass

@cli.command()
@click.argument('edges')
def validate(edges):
    """Validate a set of edges (e.g. 023678 or 15)."""
    click.echo(f"Validating edges: {edges}")

@cli.command('max-options')
@click.argument('edges')
def max_options(edges):
    """Print the max_options string for the selected edges."""
    click.echo(f"Max options for edges: {edges}")


@cli.command('check')
@click.argument('edges')
@click.option('-v', '--verbose', is_flag=True, help='Show per-tile max options')
@click.argument('combo_selected', required=False)
def check_combo(edges, verbose, combo_selected):
    """Check if a set of edges is valid, show max options, and optionally validate a combo string."""
    try:
        edges_list = parse_edges(edges)
    except Exception as e:
        click.echo(f"Error parsing edges: {e}")
        return
    from .core import ALL_TILE_NAMES, max_options_for_edges, check_combo_valid
    max_options = max_options_for_edges(edges_list)
    if not any(max_options):
        click.secho("INVALID: No valid options for any tile with these edges.", fg='red')
        if verbose:
            for tile, val in zip(ALL_TILE_NAMES, max_options):
                click.echo(f"{tile}: {val}")
        return
    if verbose:
        for tile, val in zip(ALL_TILE_NAMES, max_options):
            click.echo(f"{tile}: {val}")
    else:
        click.echo(f"Max options: {max_options}")
    if combo_selected:
        valid, msg = check_combo_valid(edges_list, combo_selected)
        if valid:
            click.secho(f"VALID: {msg}", fg='green')
        else:
            click.secho(f"INVALID: {msg}", fg='red')

@cli.command('generate-image')
@click.argument('edges')
@click.argument('combo_selected')
@click.option('--out', default='out.svg', help='Output SVG path')
def generate_image(edges, combo_selected, out):
    click.echo(f"Generating image for {edges} {combo_selected} to {out}")

@cli.command('generate-template')
@click.argument('edges')
@click.argument('combo_selected')
@click.option('--out', default='template.svg', help='Output template SVG path')
def generate_template(edges, combo_selected, out):
    click.echo(f"Generating template for {edges} {combo_selected} to {out}")

@cli.command('graph-stats')
@click.argument('edges')
@click.argument('combo_selected')
@click.option('--depth', default=9, help='Depth for the stats (default: 9)')
def graph_stats(edges, combo_selected, depth):
    click.echo(f"Graph stats for {edges} {combo_selected} at depth {depth}")

@cli.command('analyze-graph')
@click.argument('edges')
@click.argument('combo_selected')
def analyze_graph_command(edges, combo_selected):
    """
    Perform graph analysis for the given edges and combination selection.

    Args:
        edges (str): Selected edges (e.g., '023678').
        combo_selected (str): Combination selection string (e.g., '0100101100').
    """
    from .core import analyze_graph, parse_edges

    try:
        edges_list = parse_edges(edges)
    except ValueError as e:
        click.secho(f"Error: {e}", fg='red')
        return

    result = analyze_graph(edges_list, combo_selected)

    if "error" in result:
        click.secho(result["error"], fg='red')
    else:
        click.secho("Graph Analysis Results:", fg='green')
        click.echo(f"Leaves: {result['leaves']}")
        click.echo(f"Circuits: {result['circuits']}")
        click.echo(f"Others: {result['others']}")
        click.echo(f"Unique Components: {result['unique_components']}")

if __name__ == '__main__':
    cli()
