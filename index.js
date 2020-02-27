const LoginClass = require('./loginClass');
const loginHelper = new LoginClass();
const nodeSchedule = require('node-schedule');

// 登录
async function login() {
  if (await loginHelper.getLoginStatus()) {
    console.log('cookie有效');
    return;
  }

  // save cookies
  await loginHelper.getLoginPage();
  // 获取二维码打印在终端上面
  await loginHelper.getQRCode();

  const retry = 85;
  let ticket = '';
  for (let i = 0; i < retry; i++) {
    const res = await loginHelper.checkLoginStatus();
    if (res.code !== 200) {
      console.log(`code: ${res.code}, message: ${res.msg}`);
      await new Promise(r => {
        setTimeout(r, 2000);
      });
    } else {
      console.info('已完成手机客户端确认');
      ticket = res.ticket;
      break;
    }
  }
  if (!ticket) {
    console.log('二维码过期, 马上更新');
  }
  const res = await loginHelper.validateQRTicket(ticket);
  if (res.returnCode != 0) {
    return console.log('二维码校验失败');
  }
  console.info('二维码登录成功');
  loginHelper.isLogin = true;
  // save cookies
  loginHelper.saveJson();
  // console.log(res.headers.raw())
}

async function makeReserve(skuId, time = {}) {
  await login();
  await loginHelper.getReserveUrl(skuId);
}

// 抢购
async function buyMaskProgress(skuId, time, concurrency = 5) {
  if (!skuId) {
    console.error('skuId 缺少');
    return;
  }
  if (!time) {
    console.error('缺少定时时间');
    return;
  }
  await login();
  // 可以先获取 orderData
  await loginHelper.getOrderData(skuId);

  console.log('waiting...等待时间到达');
  const job1 = nodeSchedule.scheduleJob({ hour: 10 }, async function() {
    console.log('开始job');
    await loginHelper.requestItemPage(skuId);
    await loginHelper.requestCheckoutPage(skuId);

    for (let i = 0; i < concurrency; i++) {
      loginHelper.submitOrder(skuId);
      await new Promise(r => setTimeout(r, 500));
    }
    await loginHelper.submitOrder(skuId);
  });
}

// 每天早晨10点
// { hour: 0-23, minute: 0-59}
buyMaskProgress('100011521400', { hour: 10, minute: 0 });
