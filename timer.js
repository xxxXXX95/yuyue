const fetch = require('node-fetch');
const config = require('./config');
const dayjs = require('./dayjs.min.js');

const getDiffTime = async () => {
  const old = Date.now();
  const res = await fetch('https://api.m.jd.com/client.action?functionId=queryMaterialProducts&client=wh5', {
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
    '多次请求中最快的一次与服务器时间差,',
    'now - 请求往返/2 - jd服务器时间=',
    diffTime
  );
  return new Promise(r => {
    console.log('等待时间到达:', dayjs(d).format('YYYY-MM-DD HH:mm:ss.SSS'));
    while (true) {
      if (Date.now() - diffTime >= d) {
        r(fn());
        break;
      }
    }
  });
};
