import acceleration from './acceleration.js';
import keyboard from './keyboard.js';
import pointer from './pointer.js';

function events(p5){
  p5.registerAddon(acceleration);
  p5.registerAddon(keyboard);
  p5.registerAddon(pointer);
}

export { events as default };
