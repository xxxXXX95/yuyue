const callbacks = new Set();

function runProcessNextTick() {
  process.send('emitTimeTick');
  process.nextTick(runProcessNextTick);
}

runProcessNextTick();
