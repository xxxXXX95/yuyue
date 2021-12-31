import * as tough from 'tough-cookie';
import fetch, { RequestInit, Response } from 'node-fetch';

const Cookie = tough.Cookie;

class Request {
	cookiejar: tough.CookieJar;
	constructor() {
		this.cookiejar = new tough.CookieJar();
		// this.Cookie = Cookie
	}

	getCookies = (url: string): Promise<tough.Cookie[]> => {
		return new Promise((resove, reject) => {
			this.cookiejar.getCookies(
				url,
				{
					allPaths: true
				},
				(err, cookies) => {
					if (err) reject(err);
					resove(cookies);
				}
			);
		});
	};
	setCookie = (
		url: string,
		cookie: tough.Cookie | string
	): Promise<tough.Cookie> => {
		return new Promise((resove, reject) => {
			this.cookiejar.setCookie(cookie, url, (err, cookie) => {
				if (err) reject(err);
				resove(cookie);
			});
		});
	};
	parse = (
		cookie: string,
		options?: tough.Cookie.ParseOptions
	): tough.Cookie => {
		return Cookie.parse(cookie, options);
	};
	request = async (
		url: string,
		preParams: RequestInit,
		ignoreCookie: boolean = false
	): Promise<Response | void> => {
		const { headers = {} } = preParams;

		const cookies = await this.getCookies(url);

		const params = {
			...preParams,
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
				// redirect: 'manue',
				...headers,
				cookie: cookies.join(';')
			}
		} as RequestInit;

		return fetch(url, params)
			.then(res => {
				if (ignoreCookie) return res;
				const cookies = res.headers.raw()['set-cookie'];
				if (cookies) {
					cookies
						.map(c => Cookie.parse(c))
						.forEach(cookie => {
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
export default Request