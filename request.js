const tough = require('tough-cookie');
const Cookie = tough.Cookie;
const fetch = require('node-fetch');
class Request {
  constructor() {
    this.cookiejar = new tough.CookieJar();
    // this.Cookie = Cookie
    this.tough = tough;
  }

  getCookies = url => {
    return new Promise((resove, reject) => {
      this.cookiejar.getCookies(url, (err, cookies) => {
        if (err) reject(err);
        resove(cookies);
      });
    });
  };
  setCookie = (url, cookie) => {
    return new Promise((resove, reject) => {
      this.cookiejar.setCookie(cookie, url, (err, cookie) => {
        if (err) reject(err);
        resove(cookie);
      });
    });
  };
  parse = (cookie, options) => {
    return Cookie.parse(cookie, options);
  };
  request = async (url, preParams = {}, ignoreCookie = false) => {
    const { headers = {} } = preParams;
    // const getCookies = util.promisify(this.cookiejar.getCookies)
    // const setCookie = util.promisify(this.cookiejar.setCookie)
    // new Promise()
		const cookies = await this.getCookies(url);
		
    const params = {
      ...preParams,
      headers: {
				'content-type': 'application/x-www-form-urlencoded',
				// 'Content-Type': 'application/json',
				// redirect: 'manue',
        ...headers,
        cookie: cookies.join(';')
      }
    };

    return fetch(url, params)
      .then(res => {
        if(ignoreCookie) return res
        const cookies = res.headers.raw()['set-cookie'];
        if (cookies) {
          cookies.map(Cookie.parse).forEach(cookie => {
            this.setCookie(url, cookie);
          });
        }
        return res;
      })
      .catch(e => {
        console.log('请求出错url:', url);
      });
  };
}
module.exports = Request;
