import p5 from 'p5';

/**
 * This is the sketch function for our p5.js instance.
 * It takes a p5 instance as an argument, which allows us
 * to call p5 functions in "instance mode".
 * @param {p5} p The p5 instance.
 */
const sketch = (p: p5) => {

  // The setup function is called once when the program starts.
  p.setup = () => {
    // Create a canvas 600px wide and 400px high.
    p.createCanvas(600, 400);
    p.background(10, 25, 47); // A dark blue background
    p.noStroke();
    p.textSize(40);
    p.textAlign(p.CENTER, p.CENTER);
  };

  // The draw function is called repeatedly in a loop.
  p.draw = () => {
    // Fill the text with a gentle pulsing color
    const colorValue = p.map(p.sin(p.frameCount * 0.02), -1, 1, 150, 255);
    p.fill(210, 225, colorValue);
    
    // Display the text in the middle of the canvas
    p.text('Hello, p5.js & TypeScript!', p.width / 2, p.height / 2);
  };
};

// Create a new p5 instance and attach it to the <main> element in index.html
new p5(sketch, document.querySelector('main') ?? undefined);
