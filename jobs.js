const toolsClass = require('./tools');
const helper = new toolsClass();
const timer = require('./timer');

// 登录
async function login(directly = false) {
  if (!directly && (await helper.getLoginStatus())) {
    console.log('cookie有效');
    return;
  }

  // save cookies
  await helper.getLoginPage();
  // 获取二维码打印在终端上面
  await helper.getQRCode();

  const retry = 85;
  let ticket = '';
  for (let i = 0; i < retry; i++) {
    const res = await helper.checkLoginStatus();
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
  const res = await helper.validateQRTicket(ticket);
  if (res.returnCode != 0) {
    return console.log('二维码校验失败');
  }
  console.info('二维码登录成功');
  helper.isLogin = true;
  // save cookies
  helper.saveJson();
  // console.log(res.headers.raw())
}

// 抢购
async function buyMaskProgress(date, skuId, concurrency = 1) {
  if (!skuId) {
    console.error('skuId 缺少');
    return;
  }
  // 当前进程读取本地 Cookie, 但不需要验证cookie, true
  await helper.getLocalCookie(true);
  timer(date, async function () {
    console.log('执行获取链接时间:', new Date().toLocaleString());
    const res = await helper.requestItemPage(skuId);
    if (!res) {
      console.log('没有抢购链接, 抢购失败未开始可能');
      return;
    }
    console.log('getOrderData:', new Date().toLocaleString());
    await helper.getOrderData(skuId);
    for (let i = 0; i <= concurrency; i++) {
      console.log(i, '抢购:', new Date().toLocaleString());
      helper.submitOrder(skuId).then(async r => {
        console.log(r);
        if (r.success) {
          await helper.sendToWechat(r);
          process.exit();
        }
        if (i === concurrency) {
          await helper.sendToWechat('抢购失败');
          process.exit();
        }
      });
      await new Promise(r => setTimeout(r, 50));
    }
  });
}

exports.buyMaskProgress = buyMaskProgress;
exports.login = login;
exports.helper = helper;
