module.exports = (d, fn) => {
  return new Promise(r => {
    while (true) {
      if (Date.now() >= d) {
        r(fn());
        break;
      }
    }
  });
};
