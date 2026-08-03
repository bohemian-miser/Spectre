# Spectre

See this live at https://bohemian-miser.github.io/Spectre/

Playing with the spectre tiling. Mostly vibe coded and plagerised from https://cs.uwaterloo.ca/~csk/spectre/app.html. I've included the original version of this under 'web_orig'.

Ignore the spectre dir, it was an attempt at doing this in python.

The site has a few pages:

* **Explorer** (`/`) - the main thing. Build supertiles, pick which edges join up, and watch the circuits light up.
* **The Tails Problem** (`/tails.html`) - an explainer for the edge-matching stuff and why some tiles end up with tails.
* **Circuits & Stats** (`/stats.html`) - the census of every edge combination, with the numbers behind it.
* **Legacy app** (`/legacy.html`) - the original p5 version. It lets you draw on each of the 10 flavours of tile and has better navigation and you can change the colours.

run `cd web && npm run build && npm run preview` to serve the pre-built version (it needs the `/Spectre/` base path, so a plain static server at the root won't find the assets).

I plan on integrating some cool edge stuff from my [blog](https://substack.com/@theharderthanobsidiantower/p-156511066)

## Running the web project

To run the project in the `web` directory, follow these steps:

1.  Navigate to the `web` directory:
    ```bash
    cd web
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Run the tests:
    ```bash
    npm test
    ```

## Infinite numbers of Lines and circuits.
You can have \[a fixed number | an infinite number\] of infinite line/s and \[a fixed number | an infinite number\] of circuits of unique lengths. Work out what combinations of lines between edges generate these and what is not possible.

I'm pretty sure I can make either an infinite line but haven't got a solid proof yet. I think I'd need to rework the generator to do a kind of substitution thing instead of the standard spectre algorithm and then I could show that you make a long line/circuit, and when you substitue all the tiles for the next superset you maintain all the paths (like a standard infinite line proof, like the hilbert curve).

## Lingo
* 'Thumbs' - The editable tiles at the top of the page. Short for 'Thumbnails'.

## TODO list

* Do everything in shaders so it's nippy af.
* Click on a tile to bring up a large drawable window instead of having all of them at the top all the time.
* Put labels on the thumbnail boxes.
* Remove the duplicate Gamma colour boxes. 
* Clean up the ui .. a lot.
* Have some kind of title.
* Explainer text.
* make quads, ids, and edge dots off by default. 
* Make 'Show all edge numbers' only turn on/off the edge labels, not the joiner edges
* Add another checkbox for all joiner edges and put it with the joiner edges text
* Fix hexagons and 0-edges they don't need the same treatment as the other shapes.
* Colour choice for lines.
* Download a template, edit as svg and re-upload.
* analysis time in bottom
* graph showing the lines between thumbs