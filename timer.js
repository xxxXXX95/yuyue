const fetch = require('node-fetch');
const config = require('./config');

const getDiffTime = async () => {
  const old = Date.now();
  const res = await fetch('https://a.jd.com//ajax/queryServerData.html', {
    headers: {
      // 瞎鸡儿填写一个 UA
      'User-Agent': config.userAgent || "chrome 81.0",
    },
  });
  const json = await res.json();
  const now = Date.now();
  return now - old + now - json.serverTime;
};

module.exports = async (d, fn, im = false) => {
  // Should excute immediately
  if (im) return Promise.resolve(fn());
  const diffTime = await getDiffTime();
  console.log('本地与服务器间隔:', diffTime);
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
