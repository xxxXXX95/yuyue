const cluster = require('cluster');
const timer = require('./timer');
const path = require('path');
const filePath = path.join(__dirname, 'config.js');
const fs = require('fs');
//let config = null;
try {
  fs.accessSync(filePath, fs.constants.F_OK);
  const config = require('./config');
  if (!config.eid || !config.fp) {
    console.log('请在 config.js 按备注填写 `eid` 和  `fp`');
    process.exit();
  }
} catch (e) {
  console.log(e);
  console.log('请按 readme中, 在本目录下新建 config.js 并填写内容');
  process.exit();
}

const { buyMaskProgress, makeReserve, login } = require('./jobs');

// 年     月    日     时    分   秒     毫秒
// 2020, 0-11, 1-31, 0-24, 0-60  0-60  0-1000
// 例如 2020-3-4 10:00:00.400
// (2020, 2, 4, 10, 0, 0, 400)
// 修改使用的时间

// 2020/3/3 10:00:00.400
const dd1 = new Date(2020, 2, 3, 10, 0, 0, 400).getTime();
// 2020/3/3 20:00:00.400
const dd2 = new Date(2020, 2, 4, 20, 0, 0, 400).getTime();
// 2020/3/3 21:00:00.400
const dd3 = new Date(2020, 2, 3, 21, 0, 0, 400).getTime();

// 修改这里, 添加skuId, 和抢购时间 date, 需要更改 月/日 时:分:秒:毫秒
const pool = [
  // { skuId: '100011521400', date: dd1 },
  { skuId: '100011551632', date: dd2 }
  // { skuId: '100006394713', date: dd2 },
  // { skuId: '100011621642', date: dd2 }
];

if (cluster.isWorker) {
  console.log('progress work', process.pid);
  const item = pool.shift();
  timer(item.date, function() {
    console.log('执行时间:', new Date().toLocaleString());
    buyMaskProgress(item.skuId);
  });
} else {
  for (i = 0; i < pool.length; i++) {
    cluster.fork();
  }
  // 强制扫描登录重置24h
  // login(true)
  console.log('main progress');
}
