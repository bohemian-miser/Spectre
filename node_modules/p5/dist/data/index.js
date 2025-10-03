import storage from './local_storage.js';

function data(p5){
  p5.registerAddon(storage);
}

export { data as default };
