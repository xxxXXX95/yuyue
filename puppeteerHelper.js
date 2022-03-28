const isDebug = process.env.debug === 'debug';
let puppeteer = null;
if (isDebug) {
	puppeteer = require('puppeteer-core');
}
puppeteer = require('puppeteer');
const config = require('./config');
let browser = null;

const getBrowser = async () => {
	if (!browser) {
		const params = {
			headless: !isDebug,
			args: [
				'--no-sandbox',
				'–disable-gpu', // GPU硬件加速
				'–no-first-run', // 没有设置首页。在启动的时候，就会打开一个空白页面。
				'--disable-blink-features=AutomationControlled'
			]
		};
		if (isDebug) {
			params.executablePath = `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`;
		}
		browser = await puppeteer.launch(params);
		return browser;
	}
	return browser;
};
const setUpBrowser = async () => {
	await getBrowser();
};
const getPage = async filter => {
	const browser = await getBrowser();
	const page = await browser.newPage();
	await page.setRequestInterception(true);
	page.setDefaultTimeout(isDebug ? 0 : 3000);
	page.setUserAgent(config.userAgent);

	const events = filter ? [] : ['document', 'script', 'xhr', 'fetch'];
	page.on('request', async interceptedRequest => {
		const type = interceptedRequest.resourceType();
		if ((filter && filter(interceptedRequest)) || events.indexOf(type) !== -1) {
			interceptedRequest.continue();
		} else {
			interceptedRequest.abort();
		}
	});
	page.on('pageerror', e => {
		if(isDebug) {
			console.log(e)
		}
	});

	return page;
};
const exit = async () => {
	await browser.close();
};
const getHandlerValue = handle => async property => {
	const h = await handle.getProperty(property);
	const v = await h.jsonValue();
	return v;
};
module.exports = {
	setUpBrowser,
	getPage,
	exit,
	getHandlerValue
};
