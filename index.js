const cluster = require('cluster');
const path = require('path');
const filePath = path.join(__dirname, 'config.js');
const fs = require('fs');

try {
  fs.accessSync(filePath, fs.constants.F_OK);
} catch (e) {
  console.log(e);
  console.log('请按 readme中, 在本目录下新建 config.js 并填写内容');
  process.exit();
}

const { login, submitOrderProcess } = require('./jobs');
const { pool, forceLogin } = require('./tasks-pool');
const config = require('./config');
if (!config.eid || !config.fp) {
  console.log('请在 config.js 按备注填写 `eid` 和  `fp`');
  process.exit();
}

if (cluster.isWorker) {
  const setupLoginWork = () => {
    console.log('progress.worker login', process.pid);
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
  };
  const setupWork = item => {
    const { date, skuId, areaId = config.areaId, forceKO = false } = item;
    // 任务进程
    console.log(
      'progress.worker:',
      process.pid,
      '时间:',
      item.date,
      'sku',
      item.skuId
    );
    submitOrderProcess(date, skuId, areaId, forceKO);
  };

  cluster.worker.on('message', async job => {
    if (job.type === 'login') {
      await setupLoginWork(job);
      cluster.worker.send({ doneWork: 'login' });
    }
    if (job.type === 'task') {
      setupWork(job);
    }
  });
} else {
  // 使用独立进程登陆
  // forcelogin, 强制登陆一次
  cluster.fork().send({ type: 'login', forceLogin });
  cluster.on('message', message => {
    if (message.doneWork === 'login') {
      // 登陆完成后
      for (i = 0; i < pool.length; i++) {
        const item = pool[i];
        cluster.fork().send({ ...item, type: 'task' });
      }
    }
  });

  console.log('progress.master:', process.id);
}
