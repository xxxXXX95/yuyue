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

class Tools {
  constructor() {
    this.isLogin = false;
    this.userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36';
    this.headers = {
      'user-agent': this.userAgent
    };
    this.reqTools = new Request();
    this.request = this.reqTools.request;
    // this.reserveUrl = new Map();
    this.config = config;
    this.initInfo = null;
    this.reserveUrl = 'url';
    this.hasGetCode = false;

    // this.getLocalCookie();
    // const cookie = fs.readFile()
    // this.reqTools.Cookie.fromJSON()
  }

  getLoginStatus = async () => {
    if (this.isLogin) return true;
    else {
      await this.getLocalCookie();
      return this.isLogin;
    }
  };

  /**获取本地cookie，检查cookie有效期, 返回登录状态 */
  getLocalCookie = async () => {
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
      rid: Date.now()
    };
    try {
      const resp = await this.request(url + `?${qs.stringify(payload)}`, {
        redirect: 'manual'
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
        headers: this.headers
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
    // 多进程共享等一个登录状态
    if (this.hasGetCode) {
      // qrcodeTerminal.generate(this.qrUrl, { small: true });
      return;
    }
    this.hasGetCode = true
    /**
     *
     */
    const url = 'https://qr.m.jd.com/show';
    //  const url ='https://personal.psu.edu/dfz5027/Mario.png'
    // const url =  'http://localhost:8081/headers'

    const params = {
      appid: 133,
      size: 147,
      t: ''
    };
    const headers = {
      'User-Agent': this.userAgent,
      Referer: 'https://passport.jd.com/new/login.aspx'
    };
    const qsStr = `?${qs.stringify(params)}`;
    const res = await this.request(url + qsStr, {
      method: 'GET',
      headers: {
        ...headers
      }
    });

    const bffArray = await res.arrayBuffer();
    const bff = Buffer.from(bffArray);

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
      _: Date.now()
    };

    const headers = {
      'User-Agent': this.user_agent,
      Referer: 'https://passport.jd.com/new/login.aspx'
    };

    // console.log()
    const res = await this.request(url + `?${qs.stringify(params)}`, {
      headers
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
      Referer: 'https://passport.jd.com/uc/login?ltype=logout'
    };
    const str = `?t=${ticket}`;
    const res = await this.request(url + str, {
      headers
    });
    // console.log(res.headers.raw(), 'valid')
    return res.json();
  }
  saveJson = async () => {
    const json = this.reqTools.cookiejar.toJSON();
    fs.writeFileSync('./cookie.json', JSON.stringify(json));
  };
  getRandomNumber = (max = 9999999, min = 1000000) => {
    return Math.floor(Math.random() * (9999999 - 1000000 + 1) + 1000000);
  };

  // 预约商品
  getReserveUrl = async sku_id => {
    const url = 'https://yushou.jd.com/youshouinfo.action';
    const payload = {
      callback: 'fetchJSON',
      sku: sku_id
    };
    const headers = {
      'User-Agent': this.user_agent,
      Referer: `https://item.jd.com/${sku_id}.html`
    };
    try {
      const res = await this.request(url + `?${qs.stringify(payload)}`, {
        headers
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

  /**访问抢购商品页面 */
  requestItemPage = async skuId => {
    const url = 'https://itemko.jd.com/itemShowBtn';
    const payload = {
      callback: `jQuery${this.getRandomNumber()}`,
      skuId: skuId,
      from: 'pc',
      _: Date.now()
    };
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'itemko.jd.com',
      Referer: `https://item.jd.com/${skuId}.html`
    };

    // 10s 内获取不到链接基本凉凉
    let reTry = 100;
    while (reTry--) {
      try {
        const res = await this.request(url + `?${qs.stringify(payload)}`, {
          headers
        });
        // console.log(`正在请求:${url}`)
        const result = this.parseJsonp(await res.text());

        if (result.url) {
          const routeUrl = 'https:' + result.url;
          const seckillUrl = routeUrl
            .replace('divide', 'marathon')
            .replace('user_routing', 'captcha.html');

          console.log(`已经获取到抢购链接: ${seckillUrl}`);
          this.reserveUrl = seckillUrl;
          try {
            await this.request(seckillUrl, {
              method: 'GET',
              headers: {
                'User-Agent': this.userAgent,
                Host: 'marathon.jd.com',
                Referer: `https://item.jd.com/${skuId}.html`
              }
            });
          } catch (e) {
            console.log('request seckillUrl err')
          }

          return seckillUrl;
        }
        console.log('在重试获取抢购链接', result);
        // 直接重试
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {}
    }
    console.log('没获取到抢购链接, 退出了');
    return '';
  };

  requestCheckoutPage = async skuId => {
    console.info('访问抢购订单结算页面...');
    const url = 'https://marathon.jd.com/seckill/seckill.action';
    const payload = {
      skuId: skuId,
      num: 1,
      rid: Math.floor(Date.now() / 1000)
    };
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'marathon.jd.com',
      Referer: `https://item.jd.com/${skuId}.html` //.format(self.sku_id)
    };
    const res = await this.request(url + `?${qs.stringify(payload)}`, {
      headers
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
      isModifyAddress: 'false'
    };
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'marathon.jd.com'
    };
    const res = await this.request(url, {
      method: 'POST',
      body: qs.stringify(data),
      headers
    });
    return await res.json();
    // return this.parseJsonp(await res.text());
  };
  getOrderData = async (skuId, retry = 10) => {
    while (retry--) {
      // let data = null;
      try {
        console.info('生成提交抢购订单所需参数...', retry);
        // self.seckill_init_info[self.sku_id] = self._get_seckill_init_info()
        const initInfo = await this.getInitInfo(skuId);
        // if(initInfo)
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
          password: '',
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
        };
        this.initInfo = data;
        return data;
      } catch (e) {
        console.error(e, 'get initInfo err');
      }
      await new Promise(r => setTimeout(r, 500));
    }
  };

  // submit 之前获取initInfo
  submitOrder = async (skuId, retry = 10) => {
    const url =
      'https://marathon.jd.com/seckillnew/orderService/pc/submitOrder.action';
    const payload = {
      skuId: skuId
    };

    // self.seckill_order_data[self.sku_id] = self._get_seckill_order_data();
    console.info('提交抢购订单...');
    const headers = {
      'User-Agent': this.userAgent,
      Host: 'marathon.jd.com',
      Referer: `https://marathon.jd.com/seckill/seckill.action?skuId=${skuId}&num=1&rid=${new Date().getSeconds()}` //.format(
    };

    // getOrderData 重试 getInitInfo
    // 其他是同步代码不会出错

    // const data = await this.getOrderData(skuId);
    const data = this.initInfo;

    if (!data) {
      console.log('null initInfo', data);
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
          headers
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
      //console.log('抢购失败, 马上重试', retry, result);
      return {};
    }
    // await new Promise(r => setTimeout(r, 1000));
    //}

    // 失败了的推送
    // this.sendToWechat(JSON.stringify(result));
  };
  sendToWechat = message => {
    if (!message) return;
    const url = `http://sc.ftqq.com/${this.config.sckey}.send`;
    const payload = {
      text: '抢购结果',
      desp: message
    };
    return this.request(url + `?${qs.stringify(payload)}`);
  };
}

module.exports = Tools;
