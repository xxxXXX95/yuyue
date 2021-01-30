const fetch = require('node-fetch');
const config = require('./config');
const toolsClass = require('./tools');
const sleep = new toolsClass().sleep;

// 获取京东服务器时间
const getServerTime = async () => {
  const old = Date.now();
  const res = await fetch('https://a.jd.com//ajax/queryServerData.html', {
    headers: {
      // 瞎鸡儿填写一个 UA
      'User-Agent': config.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_0) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.56',
    },
  });
  const now = Date.now();
  const json = await res.json();
  return (now - old) / 2 + json.serverTime;
};

module.exports = async (d, fn, im = false) => {
  if (im) return Promise.resolve(fn());

  console.log('waiting...等待时间到达', new Date(d).toLocaleString());
  let sleepTime = d - Date.now();
  if (sleepTime>90*1000){
    await sleep(sleepTime-90*1000);
  }
  try {
    const  jdTime= await Promise.race([
      getServerTime(),
      getServerTime(),
      getServerTime(),
      getServerTime(),
    ]);
    // console.log("京东时间"+new Date(jdTime).toLocaleString());
    await sleep(d-jdTime);
  }catch (e){
    console.log(e);
    console.log("Timer.js出问题了")
    await sleep(88*1000);
  }
  await fn();
};
