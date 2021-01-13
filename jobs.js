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

// 从商品详情提交订单
async function submitOrderFromItemDetailPage(
  date,
  skuId,
  params,
  concurrency = 20
) {
  timer(date, async function () {
    console.log('执行获取链接时间:', new Date().toLocaleString());
    let res = await helper.getKOUrl(skuId);
    if (!res) {
      console.log('没有抢购链接, 抢购失败可能未开始');
      console.log('检查商品状态...');
      const [isAvailable, ms] = await checkItemState(skuId, params, 1);
      const endTime = Date.now() + ms;
      if (isAvailable) {
        console.log(
          '代码错误, 请联系我:https://github.com/meooxx/jd_yuyue/issues'
        );
      }
      if (ms) {
        // 大于1h
        if (ms > 60 * 60 * 1000) {
          console.log(
            '抢购还有很长时间开始, 请修改时间重新启动, 剩余秒数:',
            ms / 1000
          );
          process.exit();
        }
        console.log(ms / 1000, '秒后抢购开始, 继续在此等待..');
        while (true) {
          if (Date.now() >= endTime) {
            break;
          }
        }
        console.log('再次执行获取链接时间');
        res = await helper.getKOUrl(skuId);
      }
    }
    if (!res) {
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
      await new Promise(r => setTimeout(r, 100));
    }
  });
}
// 检查当前商品是否开卖了?
async function checkItemState(skuId, params, retry = 30) {
  const { area, cat, shopId, venderId, paramJson } = params;
  let i = retry;
  let isAvailable = false;

  let seconds = 0;
  let stock = '';
  let preTime = Date.now();
  // let interval = 200;
  // 10 * 200 ms 内检查状态
  while (i--) {
    try {
      preTime = Date.now();
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
        isAvailable = true;
        break;
      } else {
        // 还剩多少时间
        console.log(
          // yuyueInfo.state,
          stockInfo.stockDesc,
          yuyueInfo.cdPrefix,
          yuyueInfo.countdown
        );
        stock = isStock;
        seconds = yuyueInfo.countdown;
      }
    } catch (e) {
      console.log('查询预约信息失败:', i, e);
    }
    if (i) {
      await new Promise(r => setTimeout(r, 80));
    }
  }
  // 不可用, 不是state ===4, 且有剩余时间
  // 说明抢购流程不是在预约结束
  // 预约结束之后还有一小段时间
  if (!isAvailable && stock && seconds) {
    const diff = Date.now() - preTime;
    return [isAvailable, seconds * 1000 + diff];
  }
  return [isAvailable];
}

/**
 *
 * @param {*} date
 * @param {*} skuId
 * 从购物车提交订单
 */
async function submitOrderFromShoppingCart(date, skuId, params = {}) {
  const { area } = params;
  let isInCart = await isSkuInCart(skuId, area);
  // 先加到购物车
  try {
    const { stockInfo = {} } = await helper.getWareInfo({
      skuId,
      ...params,
      num: 1,
    });
    console.log('库存信息:', stockInfo.stockState, '有货:', stockInfo.isStock);
    if (stockInfo.isStock) {
      if (!isInCart) {
        console.log('准备提交购物车');
        // 有货哦
        const result = await helper.addItemToCart(skuId);
        if (!result) {
          console.log(
            '!!!添加购物车请求成功, 但没响应购物车链接, 有可能是秒杀流程!!!'
          );
          console.log(
            '请先手动设置taskPool中指定forceKO: true,指定使用秒杀流程'
          );
          process.exit();
        }
        // 已经跳转至购物车页面
        // 当前sku 是套装商品, 已经在购物车页面了
        console.log('添加成功,', result);
        isInCart = true;
      }
    } else {
      console.log('商品无货, 请检查距离开抢日期前是否太久');
      console.log('如果距离开抢时间太久, 有可能会更新库存');
      console.log('请距离开抢日期稍近再启动脚本');
      process.exit();
    }
  } catch (e) {
    // e
  }

  timer(date, async () => {
    // let [isAvailable] = await checkItemState(skuId, params, 1);
    // if (!isAvailable) {
    //   console.log('哈哈又被耍猴了!');
    //   process.exit();
    // }
    let isAvailable = false;
    let i = 30;
    while (i--) {
      try {
        await Promise.race([
          helper.requestCheckoutPage().then(res => {
            if (
              res.url.indexOf('trade.jd.com/shopping/orderBack.html') !== -1
            ) {
              throw Error(
                '尝试访问订单结算页面失败, 可能没货或者没到时间.准备重试...'
              );
            }
          }),
          new Promise((_, r) =>
            setTimeout(r, 500, '请求结算页面超过500ms, 准备重试')
          ),
        ]);
        isAvailable = true;
        console.log('访问结算页面成功, 准备提交订单');
        break;
      } catch (e) {
        console.log('访问结算页面失败:', e.message);
      }
      await new Promise(r => setTimeout(r, 100));
    }
    if (!isAvailable) {
      console.log('访问结算页面彻底失败, 溜了');
      const { stockInfo = {} } = await helper.getWareInfo({
        skuId,
        ...params,
        num: 1,
      });
      console.log('库存信息:', stockInfo.stockState, stockInfo.isStock);
      process.exit();
    }
    i = 20;
    while (i--) {
      try {
        const res = await helper.submitCartOrder();
        if (res.success) {
          const text = `订单提交成功!订单号:${res.orderId}`;
          console.log(text);
          await helper.sendToWechat(text);
          process.exit();
        } else {
          if (res.noStockSkuIds) {
            if (res.noStockSkuIds.indexOf(skuId) !== -1) {
              console.log(
                `这些sku没有库存遛了:抢购的${skuId} in ${res.noStockSkuIds}`
              );
              return;
            }
          }
          console.log('尝试index', i, '失败原因', res.message || res);
        }
      } catch (e) {
        console.log('抢购失败:', i, e);
      }
      await new Promise(r => setTimeout(r, 300));
    }
  });
}
/**
 *
 * @param {*} skuId
 * 当前sku 是否在购物车中
 */
async function isSkuInCart(skuId, areaId) {
  // 获取购物车数据
  const res = await helper.getCartData(areaId);
  if (res.success) {
    let allskus = [];
    if (!res.resultData.cartInfo) return false;
    res.resultData.cartInfo.vendors.forEach(v => {
      allskus = allskus.concat(v.sorted);
    });
    return !!allskus.find(s => s.item.Id == skuId);
  }
  return false;
}

/**
 *
 * @param {*} skuId skuid
 * @param {*} areaId areaId
 * @returns {array} [isKO, {cat, area,...}]
 * 访问商品 detail 页面, 获取商品是否是秒杀商品和其他参数
 */
async function getPageConfig(skuId, areaId) {
  // 补足 2_xxx_xxx -> 2_xxx_xxx_0
  const area = areaId.split('_').length === 3 ? `${areaId}_0` : areaId;
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
  const specialAttrs = JSON.parse(text.match(/specialAttrs:(.*?]),/i)[1]);
  // 秒杀则是从 item 详情页面直接提交订单
  const isKO = specialAttrs.indexOf('isKO') !== -1;
  return [isKO, { cat, venderId, shopId, paramJson, area }];
}

// 提交订单, 此流程对应从购物车提交订单流程
async function submitOrderProcess(date, skuId, areaId, forceKO = false) {
  if (!areaId) {
    console.log('no areaId!请确认填写了正确到areaId');
    process.exit(1);
  }
  if (!skuId) {
    console.error('skuId 缺少');
    process.exit(1);
  }
  await helper.getLocalCookie(true);
  let [isKO, params] = await getPageConfig(skuId, areaId);
  if (!isKO && !forceKO) {
    let m = 5;
    while (1) {
      if (Date.now() + m * 60 * 1000 >= date) {
        [isKO, params] = await getPageConfig(skuId, areaId);
        m--;
        if (isKO || m <= 1) {
          break;
        }
      }
    }
  }
  if (isKO || forceKO) {
    console.log('当前流程是预约秒杀流程, 从详情页面直接提交订单的!');
    console.log('请留意窗口打印信息');
    submitOrderFromItemDetailPage(date, skuId, params);
    return;
  } else {
    // const stock = await helper.getItemStock(skuId, area);
    // const item = stock[skuId];
    // StockState:
    //  33 现货,
    //  40 可配货
    //  0,34 无货
    //  36 采购中
    submitOrderFromShoppingCart(date, skuId, params);
  }
}

exports.login = login;
exports.helper = helper;
exports.submitOrderProcess = submitOrderProcess;
