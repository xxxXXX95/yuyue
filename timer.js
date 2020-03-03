module.exports = (d, fn, im = false) => {
	// Should excute immediately
	if(im) return Promise.resolve(fn())
  return new Promise(r => {
    console.log('waiting...等待时间到达', d);
    while (true) {
      if (Date.now() >= d) {
        r(fn());
        break;
      }
    }
  });
};
