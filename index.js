const cluster = require('cluster');
const path = require('path');
const filePath = path.join(__dirname, 'config.js');
const fs = require('fs');

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

const { login, submitOrderProcess } = require('./jobs');
const { pool, forceLogin } = require('./tasks-pool');

if (cluster.isWorker) {
  cluster.worker.once('message', item => {
    if (item.type === 'loginWork') {
      console.log('progress worker login', process.pid);
      if (item.forceLogin) {
        console.warn(
          '已开启强制扫码登录, 如果接下里24小时内频繁重启, 重启最好关闭了'
        );
      }
      login(item.forceLogin).then(() => {
        // 登陆完成后通知主进程
        // 派生任务进程
        cluster.worker.send('loginReady');
      });
    } else {
      // 任务进程
      console.log(
        'progress worker login',
        process.pid,
        '时间:',
        item.date,
        'sku',
        item.skuId
      );
      if (item.areaId) {
        submitOrderProcess(item.date, item.skuId, item.areaId);
      }
    }
  });
} else {
  // 使用独立进程登陆
  // forcelogin, 强制登陆一次
  cluster.fork().send({ type: 'loginWork', forceLogin });
  cluster.on('message', () => {
    // 登陆完成后
    for (i = 0; i < pool.length; i++) {
      const item = pool[i];
      cluster.fork().send(item);
    }
  });

  console.log('main progress');
}
