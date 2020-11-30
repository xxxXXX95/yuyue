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
// 提交订单, 此流程对应从购物车提交订单流程
async function submitOrderFromShoppingCart(date, skuId, areaId) {
  if (!areaId) {
    console.log('no areaId!请确认填写了正确到areaId');
    process.exit(0);
  }
  await helper.getLocalCookie(true);
  // 补足 2_xxx_xxx -> 2_xxx_xxx_0
  const area = areaId.split('_').length === 3 ? `${areaId}_0` : area;
  // 访问详情页 item.xxx.com/skuId.html
  const res = await helper.requestItemDetailPage(skuId);
  const text = await res.text();
  // skuId,
  // cat,
  // area,
  // shopId,
  // venderId,
  // paramJson,
  // num,
  const cat = JSON.parse(text.match(/cat:(.*?]),/i)[1]);
  const venderId = JSON.parse(text.match(/venderId:(.*?),/i)[1]);
  const shopId = text.match(/shopId:'(.*?)',/i)[1];
  const paramJson = text.match(/paramJson:\s*'(.*?)'/i)[1];

  // const stock = await helper.getItemStock(skuId, area);
  // const item = stock[skuId];
  // IsPurchase: 是否可以购买, false 可以购买, true 不可以
  // StockState:
  //  33 现货,
  //  40 可配货
  //  0,34 无货
  //  36 采购中
  //skuState # 商品是否上架
  // const { /*IsPurchase,*/ StockState, StockStateName, skuState } = item;
  // console.log('库存状态:', StockStateName);
  // if ([0, 34, 36].includes(StockState)) {
  //   console.log(`狗东耍猴呢!溜了~`);
  //   process.exit();
  // }

  timer(date, async () => {
    let i = 10;
    let isAvalibal = false;
    // let interval = 200;
    // 10 * 200 ms 内检查状态
    while (i--) {
      try {
        const yuyue = await helper.getWareInfo({
          skuId,
          cat: cat.join(),
          area,
          shopId,
          venderId,
          paramJson,
          num: 1,
        });
        // type 5 plus 专用
        // state === 4 抢购, 此时可以添加购物车
        const { yuyueInfo = {}, stockInfo = {} } = yuyue;
        const isStock =
          [33, 40].includes(stockInfo.stockState) && stockInfo.isStock;
        if (yuyueInfo.state == '4' && isStock) {
          console.log('准备提交购物车');
          isAvalibal = true;
          break;
        } else {
          // 还剩多少时间
          console.log(
            // yuyueInfo.state,
            stockInfo.stockDesc,
            yuyueInfo.cdPrefix,
            yuyueInfo.countdown
          );
        }
      } catch (e) {
        console.log('查询预约信息失败:', i, e);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!isAvalibal) {
      console.log('哈哈又被耍猴了!');
      process.exit();
    }
    // 有货哦
    const result = await helper.addItemToCart(skuId);
    // 已经跳转至购物车页面
    // 当前sku 是套装商品
    console.log('添加成功,', result);
    if (!result.isCartPage) {
      await helper.requestCartPage(skuId);
      console.log('访问购物车页面成功');
      await helper.requestCheckoutPage();
      console.log('访问购物车结算页面成功');
      let i = 10;
      while (i--) {
        try {
          const res = await helper.submitCartOrder();
          if (res.success) {
            const text = `订单提交成功!订单号:${res.order_id}`;
            console.log(text);
            helper.sendToWechat(text);
            process.exit();
          }
        } catch (e) {
          console.log('抢购失败:', i, e);
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }
  });
}

exports.buyMaskProgress = buyMaskProgress;
exports.login = login;
exports.helper = helper;
exports.submitOrderFromShoppingCart = submitOrderFromShoppingCart;
