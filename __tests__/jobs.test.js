const fetch = require('node-fetch');
const puppeteerHelper = require('../puppeteerHelper');
const Request = require('../request');
const jobs = require('../jobs');
const { isSkuInCart, submitOrderProcess, getPageConfig, __RewireAPI__ } = jobs;

jest.mock('node-fetch');
jest.mock(
	'../config',
	() => {
		return {
			__esModule: true,
			userAgent: 'jest',
			messenger: false,
			sckey: '',
			eid: 'eid1234',
			fp: 'fp1234',
			pwd: '',
			areaId: '1_1_1'
		};
	},
	{ virtual: true }
);
jest.mock('../request', () => {
	const Request = jest.requireActual('../request');
	return function () {
		return {
			...new Request(),
			getCookies: jest.fn().mockReturnValue([
				{
					key: 'key',
					value: 'value',
					path: '/'
				}
			])
		};
	};
});
jest.mock('../tools', () => {
	const Tools = jest.requireActual('../tools');
	return function () {
		return { ...new Tools(), getLocalCookie: jest.fn() };
	};
});
// jest.mock('../jobs', () => {
// 	const o = jest.requireActual('../jobs');
// 	return {
// 		__esModule: true,
// 		...o,
// 		submitOrderFromShoppingCart: jest.fn()
// 	};
// });

describe('isSkuInCart', function () {
	beforeEach(() => {});
	test('isSkuInCart should works fine', async function () {
		fetch.mockImplementation(() =>
			Promise.resolve({
				headers: {
					raw: () => {
						return {};
					}
				},
				json() {
					return {
						success: true,
						resultData: {
							cartInfo: {
								vendors: [
									{
										sorted: [
											{
												item: {
													Id: 1
												}
											},
											{
												item: {
													Id: 2
												}
											},
											{
												item: {
													Id: 44,
													items: [
														{
															item: {
																Id: 3
															}
														}
													]
												}
											}
										]
									},
									{
										sorted: [
											{
												item: {
													Id: 5
												}
											},
											{
												item: {
													Id: 6
												},
												items: []
											}
										]
									}
								]
							}
						}
					};
				}
			})
		);
		const res1 = await isSkuInCart('1');
		const res2 = await isSkuInCart('2');
		const res3 = await isSkuInCart('3');
		const res4 = await isSkuInCart('4');
		const res5 = await isSkuInCart('5');
		expect([res1, res2, res3, res4, res5]).toEqual([[], [], [], ['4'], []]);
		const res6 = await isSkuInCart('6');
		const res7 = await isSkuInCart('44');
		expect(res6).toEqual([]);
		expect(res7).toEqual([]);
	});

	test('if cart is empty should return all skuIds', async () => {
		fetch.mockImplementation(() => {
			return Promise.resolve({
				headers: {
					raw: () => {
						return {};
					}
				},
				json() {
					return {
						success: true,
						resultData: {
							cartInfo: null
						}
					};
				}
			});
		});
		const res1 = await isSkuInCart('1');
		const res2 = await isSkuInCart(['1', '2', '3']);
		expect([res1, res2]).toEqual([['1'], ['1', '2', '3']]);
	});
});

jest.mock('../puppeteerHelper', () => {
	const originalModule = jest.requireActual('../puppeteerHelper');
	const setCookieFn = jest.fn();
	const getPageFn = jest.fn().mockImplementation(() => {
		return Promise.resolve({
			setCookie: setCookieFn,
			goto,
			evaluateHandle,
			cookies: jest.fn().mockReturnValue([]),
			close: jest.fn()
		});
	});

	const goto = jest
		.fn(() => ({
			status: () => 200
		}))
		.mockImplementationOnce(() => {
			return {
				status: () => 500
			};
		})
		.mockImplementationOnce(() => {
			return {
				status: () => 500
			};
		})
		.mockImplementationOnce(() => {
			return {
				status: () => 500
			};
		});

	const evaluateHandle = jest.fn().mockReturnValue({
		getProperty(key) {
			return Promise.resolve({
				jsonValue: () => Promise.resolve(key)
			});
		}
	});

	return {
		__esModule: true,
		// ...originalModule,
		getHandlerValue: originalModule.getHandlerValue,
		getPage: getPageFn,
		__goto: goto,
		setUpBrowser: jest.fn()
	};
});

describe('submitProcess should work properly', () => {
	beforeEach(() => {});
	afterEach(() => {
		jest.useRealTimers();
	});
	test('call getPage imply whthin getPageConfig three times', async () => {
		expect.assertions(8);
		try {
			await getPageConfig(1, 2);
		} catch (e) {
			expect(e.toString()).toMatch('status 非200');
		}

		expect(puppeteerHelper.getPage).toHaveBeenCalled();
		const getPageCallback = puppeteerHelper.getPage.mock.calls[0][0];
		const r1 = getPageCallback
			? getPageCallback({
					resourceType() {
						return 'document';
					}
			  })
			: true;
		const r2 = getPageCallback
			? getPageCallback({
					resourceType() {
						return 'script';
					}
			  })
			: false;
		expect(r1).toBeTruthy();
		expect(r2).toBeFalsy();

		expect(puppeteerHelper.__goto.mock.calls.length).toBe(3);
		expect(puppeteerHelper.__goto.mock.results[0].value.status()).toBe(500);
		expect(puppeteerHelper.__goto.mock.results[1].value.status()).toBe(500);
		expect(puppeteerHelper.__goto.mock.results[2].value.status()).toBe(500);
	});
	test('call submitProcess-submitOrderFromShoppingCart-less2minues', async () => {
		jest.useFakeTimers('modern');
		const now = 10000;
		const date = 4 * 60 * 1000 + now;
		jest.setSystemTime(now);
		expect.assertions(1);
		const submitOrderFromShoppingCartFn = jest.fn();
		__RewireAPI__.__set__(
			'submitOrderFromShoppingCart',
			submitOrderFromShoppingCartFn
		);
		await submitOrderProcess(date, 1, 1, {}).then(() => {
			__RewireAPI__.__ResetDependency__('submitOrderFromShoppingCart');
		});
		expect(submitOrderFromShoppingCartFn).toHaveBeenCalled();
	});
	test('call submitProcess-submitOrderFromShoppingCart->=6min', async () => {
		jest.useFakeTimers();
		jest.spyOn(global, 'setInterval');

		const now = 10000;
		const date = (2 + 6) * 60 * 1000 + now;
		jest.setSystemTime(now);
		const submitOrderFromShoppingCartFn = jest.fn();
		__RewireAPI__.__set__(
			'submitOrderFromShoppingCart',
			submitOrderFromShoppingCartFn
		);
		expect.assertions(1);
		submitOrderProcess(date, 1, 1, {}).then(() => {
			__RewireAPI__.__ResetDependency__('submitOrderFromShoppingCart');
		});
		const times = jest.requireActual('timers');
		await new Promise(r => times.setImmediate(r));
		jest.advanceTimersByTime(6 * 60 * 1000);
		expect(setInterval).toHaveBeenCalledTimes(1);
	});
	test('call submitProcess=2min,出错exit', async () => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		jest.spyOn(global, 'setInterval');

		const now = 10000;
		const date = (2 + 2) * 60 * 1000 + 1 + now;
		jest.setSystemTime(now);
		const submitOrderFromShoppingCartFn = jest.fn();
		__RewireAPI__.__set__(
			'submitOrderFromShoppingCart',
			submitOrderFromShoppingCartFn
		);
		expect.assertions(1);
		puppeteerHelper.__goto.mockReset();
		puppeteerHelper.__goto
			.mockImplementationOnce(() => ({
				status: () => 500
			}))
			.mockImplementationOnce(() => ({
				status: () => 500
			}))
			.mockImplementationOnce(() => ({
				status: () => 500
			}));
		const r = submitOrderProcess(date, 1, 1, {}).then(() => {});
		const times = jest.requireActual('timers');
		await new Promise(r => times.setImmediate(r));
		jest.runAllTimers();
		expect(submitOrderFromShoppingCartFn).not.toHaveBeenCalled();
		await r;
		console.log(submitOrderFromShoppingCartFn.mock.calls);
		__RewireAPI__.__ResetDependency__('submitOrderFromShoppingCart');
	});
	test('call submitProcess>2min,只第一次出错', async () => {
		jest.useFakeTimers();
		jest.spyOn(global, 'setInterval');
		puppeteerHelper.__goto.mockReset();
		puppeteerHelper.__goto
			.mockImplementation(() => ({
				status() {
					return 200;
				}
			}))
			.mockImplementationOnce(() => ({
				status: () => 500
			}))
			.mockImplementationOnce(() => ({
				status: () => 500
			}))
			.mockImplementationOnce(() => ({
				status: () => 500
			}));
		const now = 10000;
		const date = (2 + 3) * 60 * 1000 + now;
		jest.setSystemTime(now);
		const submitOrderFromShoppingCartFn = jest.fn();
		__RewireAPI__.__set__(
			'submitOrderFromShoppingCart',
			submitOrderFromShoppingCartFn
		);
		expect.assertions(1);

		const r = submitOrderProcess(date, 1, 1, {}).then(() => {});
		const times = jest.requireActual('timers');
		await new Promise(r => times.setImmediate(r));
		//jest.runAllTimers();
		jest.advanceTimersByTime(3 * 60 * 1000);
		jest.clearAllTimers();
		await r;

		expect(submitOrderFromShoppingCartFn).toHaveBeenCalled();
		console.log(submitOrderFromShoppingCartFn.mock.calls);
		__RewireAPI__.__ResetDependency__('submitOrderFromShoppingCart');
	});
	test('call getConfigPage success', async () => {
		puppeteerHelper.__goto.mockReset();
		puppeteerHelper.__goto.mockImplementation(() => ({
			status: () => 200
		}));
		expect.assertions(3);
		await getPageConfig(1, 2);

		expect(puppeteerHelper.__goto.mock.calls.length).toBe(1);
		expect(puppeteerHelper.__goto.mock.results[0].value.status()).toBe(200);
		const page = await puppeteerHelper.getPage();
		expect(page.setCookie.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				name: 'key',
				value: 'value',
				path: '/'
			})
		);
	});
});
