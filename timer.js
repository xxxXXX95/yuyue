const fetch = require('node-fetch');
const config = require('./config');

const getDiffTime = async () => {
  const old = Date.now();
  const res = await fetch('https://a.jd.com//ajax/queryServerData.html', {
    headers: {
      // 瞎鸡儿填写一个 UA
      'User-Agent': config.userAgent || 'chrome 81.0',
    },
  });
  const now = Date.now();
  const json = await res.json();
  return Date.now() - (now - old) / 2 - json.serverTime;
};

module.exports = async (d, fn, im = false) => {
  // Should excute immediately
  if (im) return Promise.resolve(fn());
  const diffTime = await Promise.race([
    getDiffTime(),
    getDiffTime(),
    getDiffTime(),
    getDiffTime(),
  ]);
  console.log(
    '多次请求中最快的一次与服务器时间差(根据这个值设置提前多少ms开始),',
    diffTime
  );
  return new Promise(r => {
    console.log('waiting...等待时间到达', new Date(d).toLocaleString());
    while (true) {
      if (Date.now() - diffTime >= d) {
        r(fn());
        break;
      }
    }
  });
};
