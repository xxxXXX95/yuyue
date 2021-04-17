const qs = require('querystring');
const fs = require('fs');
const Jimp = require('jimp');
// const request = require('R')
const jsQRCode = require('jsqr');
const qrcodeTerminal = require('qrcode-terminal');
const Request = require('./request');
const path = require('path');
const util = require('util');
// const cookie = require('cookie.json')
const config = require('./config');
const iconv = require('iconv-lite');

class Tools {
  constructor() {
    this.isLogin = false;
    this.userAgent =
      config.userAgent ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36';
    this.headers = {
      'user-agent': this.userAgent,
    };
    this.reqTools = new Request();
    this.request = this.reqTools.request;
    // this.reserveUrl = new Map();
    this.config = config;
    this.initInfo = null;
    this.reserveUrl = 'url';

    // this.getLocalCookie();
    // const cookie = fs.readFile()
    // this.reqTools.Cookie.fromJSON()
  }

  sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  getLoginStatus = async () => {
    if (this.isLogin) return true;
    else {
      await this.getLocalCookie();
      return this.isLogin;
    }
  };

  /**获取本地cookie，检查cookie有效期, 返回登录状态 */
  getLocalCookie = async (noValidating = false) => {
    const pathname = path.resolve(__dirname, 'cookie.json');
    const readFile = util.promisify(fs.readFile);
    try {
      const cookieJson = await readFile(pathname, 'utf-8');
      let resolve = '';
      const p = new Promise(r => {
        resolve = r;
      });
      this.reqTools.tough.CookieJar.deserialize(
        cookieJson,
        this.reqTools.cookiejar.store,
        async (err, cookie) => {
          // 不需要验证cookie有效性
          // 确定刚刚登陆, 就不需要验证
          if (noValidating) {
            this.isLogin = true;
            resolve(this.isLogin);
            return;
          }
          if (await this.validateCookies()) {
            this.isLogin = true;
            // return true
          }
          resolve(this.isLogin);
        }
      );
      return await p;
      // console.log(JSON.parse(cookieJson))
      // JSON.parse(cookieJson).cookies.forEach(this.reqTools.setCookie)
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  validateCookies = async () => {
    const url = 'https://order.jd.com/center/list.action';
    const payload = {
      rid: Date.now(),
    };
    try {
      const resp = await this.request(url + `?${qs.stringify(payload)}`, {
        redirect: 'manual',
      });
      // console.log(resp)
      // if(res.status == '301' || res.statu)
      // console.log(await resp.headers.raw());
      if ((await resp.status) == 200) {
        return true;
      }
    } catch (e) {
      console.error(e);
      return false;
    }

    // self.sess = requests.session()
    // return False
  };
  async getLoginPage() {
    const url = 'https://passport.jd.com/new/login.aspx';
    const page = await this.request(
      url,
      {
        method: 'GET',
        headers: this.headers,
      }
      // (headers = self.headers)
    );
    return page;
  }

  decodeQRCode(bff) {
    return Jimp.read(bff).then(image => {
      const bitMap = image.bitmap;
      const code = jsQRCode(bitMap.data, bitMap.width, bitMap.height);
      return code.data;
    });
  }
  async getQRCode() {
    /**
     *
     */
    const url = 'https://qr.m.jd.com/show';
    //  const url ='https://personal.psu.edu/dfz5027/Mario.png'
    // const url =  'http://localhost:8081/headers'

    const params = {
      appid: 133,
      size: 147,
      t: '',
    };
    const headers = {
      'User-Agent': this.userAgent,
      Referer: 'https://passport.jd.com/new/login.aspx',
    };
    const qsStr = `?${qs.stringify(params)}`;
    const res = await this.request(url + qsStr, {
      method: 'GET',
      headers: {
        ...headers,
      },
    });

    const bffArray = await res.arrayBuffer();
    const bff = Buffer.from(bffArray);
    const localQRPath = path.join(__dirname, 'qrcode.png');
    fs.writeFileSync(localQRPath, bff);
    console.log(
      '如果你是windows系统终端二维码现实有问题,',
      '请打开本地目录新生成到qrcode.png 扫码'
    );
    const qrUrl = await this.decodeQRCode(bff).catch(e => {
      console.log(e);
    });
    qrcodeTerminal.generate(qrUrl, { small: true });
  }

  parseJsonp = (v = '') => {
    const regex = /^\w+\(({[\S\s]*})\)/i;
    const match = v.match(regex);
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.log(e);
    }
    // return match[1];
  };
  async checkLoginStatus() {
    const url = 'https://qr.m.jd.com/check';
    const cookies = await this.reqTools.getCookies(url);
    const randomInt = Math.floor(
      Math.random() * (9999999 - 1000000 + 1) + 1000000
    );
    // console.log(cookies, typeof cookies, cookies.key)
    // const cookiesObj = cookies.map(this.reqTools.parse);
    let token = '';

    cookies.forEach(c => {
      if (c.key === 'wlfstk_smdl') {
        token = c.value;
      }
    });

    const params = {
      appid: '133',
      callback: `jQuery${randomInt}`, // 'jQuery{}'.format(random.randint(1000000, 9999999)),
      token: token, // self.sess.cookies.get('wlfstk_smdl'),
      _: Date.now(),
    };

    const headers = {
      'User-Agent': this.user_agent,
      Referer: 'https://passport.jd.com/new/login.aspx',
    };

    // console.log()
    const res = await this.request(url + `?${qs.stringify(params)}`, {
      headers,
    });

    const text = await res.text();
    // const regex = /^\w+\(({[\S\s]*})\)/i;
    // const match = text.match(regex);
    // console.log(res.headers.raw())
    return this.parseJsonp(text);
  }
  async validateQRTicket(ticket) {
    const url = 'https://passport.jd.com/uc/qrCodeTicketValidation';
    const headers = {
      'User-Agent': this.user_agent,
      Referer: 'https://passport.jd.com/uc/login?ltype=logout',
    };
    const str = `?t=${ticket}`;
    const res = await this.request(url + str, {
      headers,
    });
    // console.log(res.headers.raw(), 'valid')
    return res.json();
  }
  saveJson = async () => {
    const json = this.reqTools.cookiejar.toJSON();
    const cookiePath = path.join(__dirname, 'cookie.json');
    fs.writeFileSync(cookiePath, JSON.stringify(json));
  };
  getRandomNumber = (max = 9999999, min = 1000000) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  // 加密支付密码
  stringToHex = (str = '') => {
    var val = '';
    for (var i = 0; i < str.length; i++) {
      val += 'u' + str.charCodeAt(i).toString(16);
    }
    return val;
  };

  // 预约商品
  getReserveUrl = async sku_id => {
    const url = 'https://yushou.jd.com/youshouinfo.action';
    const payload = {
      callback: 'fetchJSON',
      sku: sku_id,
    };
    const headers = {
      'User-Agent': this.user_agent,
      Referer: `https://item.jd.com/${sku_id}.html`,
    };
    try {
      const res = await this.request(url + `?${qs.stringify(payload)}`, {
        headers,
      });
      const text = await res.text();
      const r = this.parseJsonp(text);
      // this.reserveUrl.set(sku_id, r);
      try {
        // console.log(r)
        const res = await this.request('https:' + r.url);
        // console.log(await res.text())
      } catch (e) {
        console.log('预约失败', res);
      }
      return r;
    } catch (e) {
      //
    }

    // resp = self.sess.get(url=url, params=payload, headers=headers)
    // resp_json = parse_json(resp.text)
  };

  /**获取抢购连接 */
  getKOUrl = async skuId => {
    const url = 'https://itemko.jd.com/itemShowBtn';
    const payload = {
      callback: `jQuery${this.getRandomNumber()}`,
      skuId: skuId,
      from: 'pc',
      _: Date.now(),
    };
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'itemko.jd.com',
      Referer: `https://item.jd.com/${skuId}.html`,
    };

    // 10s 内获取不到链接基本凉凉
    let reTry = 100;
    while (reTry--) {
      try {
        const res = await this.request(url + `?${qs.stringify(payload)}`, {
          headers,
        });
        const result = this.parseJsonp(await res.text());

        if (result.url) {
          const routeUrl = 'https:' + result.url;
          const seckillUrl = routeUrl
            .replace('divide', 'marathon')
            .replace('user_routing', 'captcha.html');

          console.log(`已经获取到抢购链接: ${seckillUrl}`, result.type);
          this.reserveUrl = seckillUrl;
          let n = 30;
          while (n--) {
            try {
              await Promise.race([
                this.request(seckillUrl, {
                  method: 'GET',
                  headers: {
                    'User-Agent': this.userAgent,
                    Host: 'marathon.jd.com',
                    Referer: `https://item.jd.com/${skuId}.html`,
                  },
                }),
                new Promise((_, r) => setTimeout(r, 500, '访问秒杀链接超时')),
              ]);
              break;
            } catch (e) {
              console.log('访问秒杀链接出错', e.message);
            }
          }
          return seckillUrl;
        }
        console.log(result, ',重试获取抢购链接');
        // 直接重试
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        //
      }
    }
    console.log('没获取到抢购链接, 退出了');
    return '';
  };

  // 预约直接抢购订单页面
  requestSeckillCheckoutPage = async skuId => {
    console.info('访问抢购订单结算页面...');
    const url = 'https://marathon.jd.com/seckill/seckill.action';
    const payload = {
      skuId: skuId,
      num: 1,
      rid: Math.floor(Date.now() / 1000),
    };
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'marathon.jd.com',
      Referer: `https://item.jd.com/${skuId}.html`, //.format(self.sku_id)
    };
    const res = await this.request(url + `?${qs.stringify(payload)}`, {
      headers,
    });
  };

  getInitInfo = async skuId => {
    console.info('获取抢购初始化信息...');
    const url =
      'https://marathon.jd.com/seckillnew/orderService/pc/init.action';
    // const url ='http://localhost:8081/headers'
    const data = {
      sku: skuId,
      num: 1,
      isModifyAddress: 'false',
    };
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'marathon.jd.com',
    };
    const res = await this.request(url, {
      method: 'POST',
      body: qs.stringify(data),
      headers,
    });
    return await res.json();
    // return this.parseJsonp(await res.text());
  };
  getOrderData = async (skuId, retry = 20) => {
    while (retry--) {
      try {
        console.info('生成提交抢购订单所需参数...', retry);
        const initInfo = await this.getInitInfo(skuId);
        const defaultAddress = initInfo.addressList[0];
        const invoiceInfo = initInfo.invoiceInfo || {};
        const token = initInfo.token;
        const data = {
          skuId: skuId,
          num: 1,
          addressId: defaultAddress.id,
          yuShou: 'true',
          isModifyAddress: 'false',
          name: defaultAddress.name,
          provinceId: defaultAddress.provinceId,
          cityId: defaultAddress.cityId,
          countyId: defaultAddress.countyId,
          townId: defaultAddress.townId,
          addressDetail: defaultAddress.addressDetail,
          mobile: defaultAddress.mobile,
          mobileKey: defaultAddress.mobileKey,
          email: defaultAddress.email || '',
          postCode: '',
          invoiceTitle: invoiceInfo.invoiceTitle || -1,
          invoiceCompanyName: '',
          invoiceContent: invoiceInfo.invoiceContentType || 1,
          invoiceTaxpayerNO: '',
          invoiceEmail: '',
          invoicePhone: invoiceInfo.invoicePhone || '',
          invoicePhoneKey: invoiceInfo.invoicePhoneKey || '',
          invoice: invoiceInfo ? 'true' : 'false',
          password: config.pwd || '',
          codTimeType: 3,
          paymentType: 4,
          areaCode: '',
          overseas: 0,
          phone: '',
          eid: this.config.eid,
          fp: this.config.fp,
          token: token,
          pru: '',
          provinceName: defaultAddress.provinceName,
          cityName: defaultAddress.cityName,
          countyName: defaultAddress.countyName,
          townName: defaultAddress.townName,
        };
        this.initInfo = data;
        return data;
      } catch (e) {
        console.error('获取订单地址等信息失败, 将重试');
      }
      await new Promise(r => setTimeout(r, 100));
    }
  };

  // submit 之前获取initInfo
  submitOrder = async (skuId, retry = 10) => {
    const url =
      'https://marathon.jd.com/seckillnew/orderService/pc/submitOrder.action';
    const payload = {
      skuId: skuId,
    };

    // self.seckill_order_data[self.sku_id] = self._get_seckill_order_data();
    console.info('提交抢购订单...');
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'marathon.jd.com',
      Referer: `https://marathon.jd.com/seckill/seckill.action?skuId=${skuId}&num=1&rid=${new Date().getSeconds()}`, //.format(
    };

    // getOrderData 重试 getInitInfo
    // 其他是同步代码不会出错
    let data = this.initInfo;
    if (!data) {
      data = await this.getOrderData(skuId);
    }
    if (!data) {
      console.log('未获取到订单详细信息', skuId);
      return;
    }
    let result = null;
    // while (retry--) {
    try {
      const res = await this.request(
        url + `?=${qs.stringify(payload)}`,
        {
          method: 'POST',
          body: qs.stringify(data),
          headers,
        },
        true
      );

      const r = await res.json();

      result = r;
      if (r.success) {
        const { orderId, totalMoney, pcUrl } = r;
        const msg = `抢购成功，订单号:${orderId}, 总价:${totalMoney}, 电脑端付款链接:${pcUrl}`;
        console.info(msg);
      }
      return result;
    } catch (e) {
      console.log(e);
      return {};
    }
  };
  sendToWechat = message => {
    if (!message) return;
    if (!config.messenger) return;
    const url = `http://sc.ftqq.com/${this.config.sckey}.send`;
    const payload = {
      text: '抢购结果',
      desp: message,
    };
    return this.request(url + `?${qs.stringify(payload)}`);
  };

  // 访问sku 详情页面
  requestItemDetailPage = async skuId => {
    const url = `https://item.jd.com/${skuId}.html`;
    return this.request(url, {
      'User-Agent': this.userAgent,
    });
  };
  // 获取库存
  getItemStock = async (skuId, area) => {
    const payload = {
      callback: `jQuery${this.getRandomNumber()}`,
      type: 'getstocks',
      skuIds: String(skuId),
      area: area,
      _: Date.now(),
    };
    const headers = {
      'User-Agent': this.userAgent,
      Referer: `https://item.jd.com/${skuId}.html`,
    };
    const res = await this.request(
      'https://c0.3.cn/stocks?' + qs.stringify(payload),
      {
        headers,
      }
    );
    const gbkText = await res.buffer();
    const text = iconv.decode(gbkText, 'gbk');

    return this.parseJsonp(text);
  };
  // 获取是否开启购买
  getWareInfo = async params => {
    const url = `https://item-soa.jd.com/getWareBusiness`;
    const headers = {
      'User-Agent': this.userAgent,
    };
    const payload = {
      callback: `jQuery${this.getRandomNumber()}`,
      ...params,
      // skuId,
      // cat,
      // area,
      // shopId,
      // venderId,
      // paramJson,
      // num,
    };
    const res = await this.request(url + `?${qs.stringify(payload)}`, {
      headers,
    });
    const text = await res.text();
    return this.parseJsonp(text);
  };
  // 添加到购物车
  addItemToCart = async skuId => {
    const url = `https://cart.jd.com/gate.action`;
    const payload = {
      pid: skuId,
      pcount: 1,
      ptype: 1,
    };
    const headers = {
      'User-Agent': this.userAgent,
    };
    const res = await this.request(url + `?${qs.stringify(payload)}`, {
      headers,
    });
    if (res.url.indexOf('https://cart.jd.com/addToCart.html') !== -1) {
      const text = await res.text();
      // const text.match()
      const isSuccess = text.match(/(class="ftx-02")/i)[1];
      return {
        pageUrl: `https://cart.jd.com/addToCart.html`,
        msg: isSuccess ? '已经成功添加购物车' : '添加购物车失败',
      };
    }
    if (
      res.url.indexOf(`https://cart.jd.com/cart_asyc_index_utf8.html`) !== -1
    ) {
      return {
        pageUrl: `https://cart.jd.com/cart_asyc_index_utf8.html`,
        isCartPage: true,
        msg: '当前是套装商品, 直接跳转至购物车了',
      };
    }
  };
  // 访问购物车详情页面
  requestCartPage = async skuId => {
    const url = `https://cart.jd.com/cart.action?r=${Math.random()}`;
    const headers = {
      'User-Agent': this.userAgent,
      Referer: `https://cart.jd.com/addToCart.html?rcd=1&pid=${skuId}&pc=1&eb=1&rid=${Date.now()}&em=`,
    };
    return this.request(url, { headers });
  };

  // 从购物车结算的页面
  requestCheckoutPage = async () => {
    const url = 'https://trade.jd.com/shopping/order/getOrderInfo.action';
    try {
      const res = await this.request(url, {
        headers: {
          'User-Agent': this.userAgent,
          Referer: 'https://cart.jd.com/',
        },
      });

      return res;
    } catch (e) {
      console.log('购物车结算页面失败', e);
      return undefined;
    }
  };
  // 提交购物车选中订单
  submitCartOrder = async () => {
    const url = 'https://trade.jd.com/shopping/order/submitOrder.action';
    const headers = {
      Referer: 'https://trade.jd.com/shopping/order/getOrderInfo.action',
      'User-Agent': this.userAgent,
    };
    const payload = {
      overseaPurchaseCookies: '',
      vendorRemarks: '[]',
      'submitOrderParam.sopNotPutInvoice': 'false',
      'submitOrderParam.trackID': 'TestTrackId',
      'submitOrderParam.ignorePriceChange': '0',
      'submitOrderParam.btSupport': '0',
      'submitOrderParam.jxj': 1,
      'submitOrderParam.eid': config.eid,
      'submitOrderParam.fp': config.fp,
    };
    if (config.pwd) {
      payload['submitOrderParam.payPassword'] = this.stringToHex(config.pwd);
    }
    const res = await this.request(url, {
      headers,
      body: qs.stringify(payload),
      method: 'POST',
    });
    const result = res.json();
    return result;
  };

  // 获取购物车数据接口
  getCartData = async (area) => {
    const origin = 'https://api.m.jd.com';
    const cookies = await this.reqTools.getCookies(origin);
    const item = cookies.find(c => c.key === 'user-key') || {};
    const body = {
      serInfo: {
        area,
        'user-key': item['user-key'] || '',
      },
      cartExt: {
        specialId: 1,
      },
    };
    const payload = {
      functionId: 'pcCart_jc_getCurrentCart',
      appid: 'JDC_mall_cart',
      loginType: 3,
      body: JSON.stringify(body),
    };
    const url = `${origin}/api?${qs.stringify(payload)}`;
    const res = await this.request(url, {
      headers: {
        'User-Agent': this.userAgent,
        origin: 'https://cart.jd.com',
        referer: `https://cart.jd.com/`,
      },
    });
    return await res.json();
  };

  // 选中/取消选中sku
  /**
   * 
   * @param {*} skus 
   * @param {*} ids 
   * @param {*} area 
   * @param {*} uncheck 取消选中
   * @returns 
   */
  checkSkus = async (skus, ids = [], area, uncheck) => {
    const p = {
      ThePacks: [],
      TheSkus: [],
      carttype: "5"
    }
    // 业务逻辑复制自官网
    const suitParam = (e) => {
      var t, a = e.itemType, n = e.item.Id, r = e.item.Num, c = e.item.SType, i = e.item.items[0], s = i.item.Num;
      16 === c && 0 !== e.item.items.length && (c = 13);
      var o = e.item.items.map((function (e) {
        return {
          Id: e.item.Id,
          num: e.item.Num,
          skuUuid: e.item.skuUuid,
          useUuid: e.item.useUuid
        }
      }
      ));
      switch (a) {
        case 4:
          return {
            Id: n,
            num: r,
            sType: c,
            TheSkus: o
          };
        case 9:
          return 4 == i.itemType ? (t = 12 == a ? 29 : 24,
            o = [{
              Id: i.item.Id,
              num: s,
              sType: t
            }]) : o = [{
              Id: i.item.Id,
              num: s
            }],
          {
            Id: n,
            num: r,
            sType: c,
            TheSkus: o
          };
        case 12:
          return 4 == i.itemType ? (t = 12 == a ? 29 : 24,
            o = [{
              Id: i.item.Id,
              num: s,
              sType: t
            }]) : o = [{
              Id: i.item.Id,
              num: s
            }],
          {
            Id: n,
            num: r,
            sType: c,
            TheSkus: o
          }
      }
    }
    // 业务逻辑复制自官网
    const combineParam = (e, t) => {
      var a = e.SType;
      return 16 == a && (a = 13),
      {
        num: e.Num,
        sType: a,
        Id: e.Id,
        TheSkus: [{
          num: t.Num,
          Id: t.Id,
          skuUuid: t.skuUuid,
          useUuid: t.useUuid
        }]
      }
    }


    skus.forEach(e => {
      switch (e.itemType) {
        case 1: {
          const item = e.item
          const param = {
            Id: item.Id,
            num: item.Num,
            skuUuid: item.skuUuid,
            useUuid: item.useUuid
          }
          p.TheSkus.push(param);
          break
        }
        case 4: {
          const c = suitParam(e);
          p.ThePacks.push(c);
          break;
        }
        case 9:
        case 12: {
          const i = e.item;
          i.items && i.items.length > 0 && i.items.map((function (t) {
            switch (t.itemType) {
              case 1: {
                var r = combineParam(e.item, t.item);
                p.ThePacks.push(r);
                break;
              }
              case 4: {
                const i = suitParam(e);
                p.ThePacks.push(i)
              }
            }
          }
          ))
        }

      }
    })

    const remote = 'https://api.m.jd.com/api'
    const cookies = await this.reqTools.getCookies(remote);
    const item = cookies.find(c => c.key === 'user-key') || {};
    let functionId = 'pcCart_jc_cartCheckSingle'
    if (uncheck) {
      p.carttype = '6'
      functionId = 'pcCart_jc_cartUnCheckSingle'
    }

    const body = {
      operations: [p],
      serInfo: {
        area,
        'user-key': item['user-key'] || '',
      },
    };
    const payload = {
      functionId,
      appid: 'JDC_mall_cart',
      body: JSON.stringify(body),
    };

    let i = 10
    while (i--) {
      try {
        const res = await this.request(remote, {
          headers: {
            'User-Agent': this.userAgent,
            origin: 'https://cart.jd.com',
            referer: `https://cart.jd.com/`,
          },
          method: "POST",
          body: qs.stringify(payload)
        });
        if (uncheck) {
          console.log("已经取消勾选")
          break
        }
        if (!ids) {
          const result = await res.json()
          return [true, result]
        }
        const result = await res.json()
        if (!result.success) return [false]
        const vendors = (result.resultData || {}).cartInfo ? result.resultData.cartInfo.vendors : []

        let checkedNum = 0
        for (let i = 0; i < vendors.length; i++) {
          const v = vendors[i] || {}
          for (let j = 0; j < v.sorted.length; j++) {
            if (v.sorted[j].checkedNum > 0) {
              checkedNum += v.sorted[j].checkedNum
            }
            if (checkedNum >= ids.length) {
              return [true, result]
            }
          }
        }
      } catch (e) {
        console.log('勾选商品失败:', index)
      }

      if (i - 1 !== 0) {
        this.sleep(50)
      }

    }
    return [false]

  }
}

module.exports = Tools;
