const toolsClass = require('./tools');
const helper = new toolsClass();

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

async function makeReserve(skuId, time = {}) {
  await login();
  await helper.getReserveUrl(skuId);
}

// 抢购
async function buyMaskProgress(skuId, concurrency = 100) {
  if (!skuId) {
    console.error('skuId 缺少');
    return;
  }

  await login();
  // 可以先获取 orderData
  await helper.getOrderData(skuId);
  console.log('开始job', new Date().toLocaleString());
  await helper.requestCheckoutPage(skuId);

  for (let i = 0; i <= concurrency; i++) {
    helper.submitOrder(skuId).then(async r => {
      if (r.success) {
        await helper.sendToWechat(r);
        process.exit();
      }
      if (i === concurrency) {
        await helper.sendToWechat('抢购失败');
        process.exit();
      }
    });
    await new Promise(r => setTimeout(r, 1000));
  }
}

exports.buyMaskProgress = buyMaskProgress;
exports.login = login;
exports.makeReserve = makeReserve;
