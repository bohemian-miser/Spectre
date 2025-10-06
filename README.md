# Spectre

See this live at https://bohemian-miser.github.io/Spectre/

Playing with the spectre tiling. Mostly vibe coded and plagerised from https://cs.uwaterloo.ca/~csk/spectre/app.html. I've included the original version of this under 'web_orig'.

Ignore the spectre dir, it was an attempt at doing this in python.

run `python3 -m http.server --directory "./web/dist" 8000` to serve the pre-built version.

It lets you draw on each of the 10 flavours of tile and has better navigation and you can change the colours.

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
    npm start
    ```

## Infinite numbers of Lines and circuits.
You can have \[a fixed number | an infinite number\] of infinite line/s and \[a fixed number | an infinite number\] of circuits of unique lengths. Work out what combinations of lines between edges generate these and what is not possible.

I'm pretty sure I can make either an infinite line but haven't got a solid proof yet. I think I'd need to rework the generator to do a kind of substitution thing instead of the standard spectre algorithm and then I could show that you make a long line/circuit, and when you substitue all the tiles for the next superset you maintain all the paths (like a standard infinite line proof, like the hilbert curve).

## TODO list

* Do everything in shaders so it's nippy af.
* Click on a tile to bring up a large drawable window instead of having all of them at the top all the time.
* Put labels on the thumbnail boxes.
* Remove the duplicate Gamma colour boxes. 
* Clean up the ui .. a lot.
* Have some kind of title.
* Explainer text.