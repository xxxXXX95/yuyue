const dayjs = require('./dayjs.min.js');
const ToolsClass = require('./tools');
const timer = require('./timer');
const { Cookie } = require('tough-cookie');

const helper = new ToolsClass();
const { sleep, safeMock } = helper;
const { getPage, setUpBrowser, getHandlerValue } = require('./puppeteerHelper');
const config = require('./config');

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
			await sleep(2000);
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
		console.log('二维码校验失败');
		return;
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
	console.log('尝试提前获取订单数据:', new Date().toLocaleString(), skuId);
	await helper.getTakIdHandle(skuId);
	await helper.getOrderData(skuId, 1);
	timer(date, async () => {
		console.log('执行获取链接时间:', new Date().toLocaleString());
		const res = await helper.getKOUrl(skuId);
		if (!res) {
			return;
		}
		let maxTimes = config.maxPollingTimes || 100;
		const pollingInterval = config.pollingInterval || 5000;
		let times = 0;
		safeMock(() => {
			concurrency = 0;
		}, false);
		for (let i = 0; i <= concurrency; i++) {
			console.log(i, '抢购:', new Date().toLocaleString());
			await helper.submitOrder(skuId).then(async r => {
				console.log(r);
				if (r.success) {
					await helper.sendToWechat(r, true);
					process.exit();
				}
				if (i === concurrency) {
					console.log('抢购失败, 轮询检查商品状态...');
					while (times < maxTimes) {
						console.log(`第${times}次轮询`);
						times++;
						const [avalible] = await checkItemState(skuId, params, 1);
						if (avalible) {
							i = 0;
							concurrency = 5;
							return;
						}
						await sleep(pollingInterval);
					}

					await helper.sendToWechat('抢购失败');
					process.exit();
				}
			});
			await sleep(100);
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
				num: 1
			});
			// type 5 plus 专用
			// state === 4 抢购, 此时可以添加购物车
			const { yuyueInfo = {}, stockInfo = {} } = yuyue;
			const isStock =
				[33, 40].includes(stockInfo.stockState) && stockInfo.isStock;
			if (
				(yuyueInfo.state == '4' && isStock) ||
				(yuyueInfo.state == null && isStock)
			) {
				isAvailable = true;
				break;
			} else {
				// 还剩多少时间
				console.log(
					// yuyueInfo.state,
					stockInfo.stockDesc,
					yuyueInfo.cdPrefix || '',
					yuyueInfo.countdown || ''
				);
				stock = isStock;
				seconds = yuyueInfo.countdown;
			}
		} catch (e) {
			console.log('查询预约信息失败:', i, e);
		}
		if (i) {
			await sleep(100);
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
const submitOrderFromShoppingCart = async function (
	date,
	skuIds,
	params = {},
	area,
	submitTimes,
	maxWaitingMS
) {
	try {
		// 尝试取cookie
		await helper.requestCartPage();
	} catch (e) {
		console.log(e, '访问购物车页面出错');
	}
	const notInCartIds = await isSkuInCart(skuIds, area);
	const skuIdsSet = new Set(skuIds);
	const yuyueSkuSet = new Set();
	// 最大轮询次数
	const maxPollingTimes = config.maxPollingTimes || 100;
	// 轮询间隔
	const pollingInterval = config.pollingInterval || 5000;
	let times = 0;
	//现在只支持一个
	const skuId = skuIds[0];
	console.log('获取库存信息参数:', skuId, params[skuId]);
	while (times <= maxPollingTimes) {
		times++;
		try {
			const { stockInfo = {}, yuyueInfo = {} } = await helper.getWareInfo({
				skuId,
				...params[skuId],
				num: 1
			});
			if (yuyueInfo && yuyueInfo.yuyue) {
				// eslint-disable-next-line no-param-reassign
				yuyueSkuSet.add(skuId);
			}
			console.log(
				'轮询查询',
				times,
				skuId,
				'库存信息:',
				stockInfo.stockState,
				'有货:',
				stockInfo.isStock
			);
			if (stockInfo.isStock) {
				const isInCart = notInCartIds.indexOf(skuId) === -1;
				if (!isInCart) {
					// 有货哦
					const result = await helper.addItemToCart(skuId);
					if (!result) {
						skuIdsSet.delete(skuId);
						console.log('添加购物车失败, skuId:', skuId);
						continue;
					}
				}
				break;
			}
		} catch (e) {
			safeMock(() => {
				console.log(e);
			});
		}
		if (times > 0) {
			await sleep(pollingInterval);
		}
		if (times === maxPollingTimes) {
			skuIdsSet.delete(skuId);
		}
	}
	if (skuIdsSet.size === 0) {
		console.log('没有可抢购的skuId');
		process.exit(1);
	}
	console.log('待抢购商品:', [...skuIdsSet]);
	let skuData = [];
	if (skuIdsSet.size > 0) {
		try {
			const data = await getSkusData(area);
			skuData = [...skuIdsSet]
				.map(s => data.get(s))
				.filter(Boolean)
				.map(item => {
					if (item.item.items) {
						// eslint-disable-next-line no-param-reassign
						item.item.items = item.item.items.filter(i =>
							skuIdsSet.has(i.item.Id)
						);
						return item;
					}
				});
			if (skuData.length === 0) {
				console.log('空的购物车数据');
				throw Error();
			}
		} catch (e) {
			console.log('获取购物车数据失败');
			process.exit();
		}
	}

	const submitOrder = async () => {
		const isSucess = await submitOrderImpl();
		if (isSucess || !config.inventoryPoll) {
			process.exit();
		}
		const maxPollingTimes = config.maxPollingTimes || 100;
		const pollingInterval = config.pollingInterval || 5000;
		let times = 0;
		while (times < maxPollingTimes) {
			times++;
			const [avalible] = await checkItemState(skuId, params[skuId], 1);
			if (avalible) {
				const isSucess = await submitOrderImpl();
				if (isSucess) {
					process.exit();
				}
			}
			await sleep(pollingInterval);
			console.log('正在轮询次数:', times);
		}
		console.log('我已经尽力了, 你被耍猴了, 溜了');
		await helper.checkSkus(skuData, [], area, true);
		process.exit();
	};

	const submitOrderImpl = async () => {
		if (yuyueSkuSet.size > 0) {
			const d = Date.now();
			const validIds = [...yuyueSkuSet];
			const [success] = await helper.checkSkus(skuData, validIds, area);
			console.log('开始勾选:', dayjs(d).format('YYYY-MM-DD HH:mm:ss.SSS'));
			if (!success) {
				console.log('勾选失败');
				console.log(
					'已经取消勾选:',
					dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss.SSS')
				);
				return false;
			}
			console.log(`使用${Date.now() - d}ms, 已勾选${validIds}`);
		}

		let isAvailable = false;
		// !!不要更改大于 7, 超过七会触发京东频率限制!!
		let i = 7;
		let loopTime = 0;
		const checkoutPageTime = new Date();
		const waitCheckoutPageDone = maxWaitingMS || 1000;
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
						setTimeout(
							r,
							waitCheckoutPageDone,
							`请求结算页面超过${waitCheckoutPageDone}ms, 准备重试`
						)
					)
				]);
				isAvailable = true;
				console.log('访问结算页面成功, 准备提交订单');
				break;
			} catch (e) {
				console.log('访问结算页面失败:', e.message || e);
			}
			if (i === 0 && loopTime === 0) {
				i = 7;
				loopTime++;
				await sleep(loopTime * 1000);
			}
			// loopTime 0: 50
			// loopTime 1: 100
			await sleep(loopTime * 50 + 50);
		}
		if (!isAvailable) {
			console.log('访问结算页面彻底失败, 溜了');
			console.log(
				`访问订单结算时间:${dayjs(checkoutPageTime).format(
					'YYYY-MM-DD HH:mm:ss.SSS'
				)}`
			);
			return false;
		}
		i = submitTimes || 10;
		const submitOrderTime = new Date();
		while (i--) {
			try {
				const res = await helper.submitCartOrder();
				if (res.success) {
					const now = new Date();
					const text = `订单提交成功!订单号:${res.orderId},时间:${dayjs(
						now
					).format('YYYY-MM-DD HH:mm:ss.SSS')}`;
					console.log(text);
					await helper.sendToWechat(text, true);
					return true;
				} else {
					if (res.noStockSkuIds) {
						skuIdsSet.forEach(skuId => {
							if (res.noStockSkuIds.indexOf(skuId) !== -1) {
								skuIdsSet.delete(skuId);
							}
						});
						if (skuIdsSet.size === 0) {
							console.log('所有sku都没库存了');
							break;
						}
					}
					console.log('尝试index', i, '失败原因', res.message || res);
				}
			} catch (e) {
				console.log('抢购失败:', i, e);
			}
			await sleep(1000);
		}
		console.log(
			`提交订单开始时间:${dayjs(submitOrderTime).format(
				'YYYY-MM-DD HH:mm:ss.SSS'
			)}`
		);
		return false;
	};
	await timer(date, submitOrder);
};
/**
 *
 * @param {*} skuId
 * 当前sku 是否在购物车中
 */
async function isSkuInCart(skuId, areaId) {
	const skuIds = Array.isArray(skuId) ? skuId : [skuId];
	// 获取购物车数据
	const res = await helper.getCartData(areaId);
	if (res.success) {
		let allskus = [];
		const allIds = new Set();
		if (!res.resultData.cartInfo) return skuIds;
		res.resultData.cartInfo.vendors.forEach(v => {
			allskus = allskus.concat(v.sorted);
		});
		allskus.forEach(s => {
			if (s.item && s.item.items) {
				s.item.items.forEach(i => {
					allIds.add(String(i.item.Id));
				});
			}
			allIds.add(String(s.item.Id));
		});
		return skuIds.filter(s => !allIds.has(s));
	}
	return skuIds;
}

/**
 *
 * @param {*} skuId
 * @param {*} areadId
 * 购物车中sku的数据
 */
async function getSkusData(areaId) {
	// 获取购物车数据
	const res = await helper.getCartData(areaId);
	const data = new Map();

	if (res.success) {
		let allskus = [];
		if (!res.resultData.cartInfo) return data;
		res.resultData.cartInfo.vendors.forEach(v => {
			allskus = allskus.concat(v.sorted);
		});
		allskus.forEach(s => {
			if (s.item && s.item.items) {
				s.item.items.forEach(i => {
					data.set(String(i.item.Id), s);
				});
			}
			data.set(String(s.item.Id), s);
		});
	}
	return data;
}

/**
 *
 * @param {*} skuId skuid
 * @param {*} areaId areaId
 * @returns {array} [isKO, {cat, area,...}]
 * 访问商品 detail 页面, 获取商品是否是秒杀商品和其他参数
 */
async function getPageConfig(skuId, area) {
	// 访问详情页 item.xxx.com/skuId.html
	const filter = request => {
		const sourceType = request.resourceType();
		const isDocument = sourceType === 'document';
		return isDocument;
	};

	const page = await getPage(filter);
	const url = `https://item.jd.com/${skuId}.html`;
	const cookies = await helper.reqTools.getCookies(url);
	await page.setCookie(
		...cookies.map(c => ({
			name: c.key,
			value: c.value,
			path: c.path,
			domain: '.jd.com',
			url: 'https://www.jd.com'
		}))
	);

	let times = 3;
	while (times > 0) {
		times--;
		try {
			const res = await page.goto(url, {
				waitUntil: 'domcontentloaded'
			});
			if (res.status() !== 200) {
				throw Error('status 非200');
			}
			break;
		} catch (e) {
			safeMock(() => {
				console.log(e);
			});
			if (times === 0) {
				throw e;
			}
		}
	}

	const product = await page.evaluateHandle(() => pageConfig.product);
	const get = await getHandlerValue(product);
	const cat = await get('cat');
	const venderId = await get('venderId');
	const shopId = await get('shopId');
	const paramJson = await get('paramJson');
	const specialAttrs = await get('specialAttrs');
	const pageCookies = await page.cookies();
	// 秒杀则是从 item 详情页面直接提交订单
	const isKO = specialAttrs.indexOf('isKO') !== -1;
	await page.close();
	return [
		isKO,
		{
			cat,
			venderId,
			shopId,
			paramJson,
			area
		},
		pageCookies
	];
}

// 提交订单, 此流程对应从购物车提交订单流程
const submitOrderProcess = async function (
	date,
	skuId,
	areaId,
	{ forceKO = false, submitTimes, maxWaitingMS }
) {
	if (!skuId) {
		console.error('skuId 缺少');
		process.exit(1);
	}
	await helper.getLocalCookie(true);
	await setUpBrowser();

	const allSKUParam = {};
	const skuIds = Array.isArray(skuId) ? skuId : [skuId];
	const isKOSet = new Set();
	const errorSet = new Set();
	const beforeRunTaskMinues = Math.round((date - Date.now()) / 1000 / 60) - 2;
	// < 0, 0
	// > 6, 6
	// range 0-6
	let m =
		beforeRunTaskMinues < 2
			? 2
			: beforeRunTaskMinues < 6
			? beforeRunTaskMinues
			: 6;
	if (m === 2) {
		await Promise.all(
			skuIds.map(skuId =>
				getPageConfig(skuId, areaId)
					.then(([isKO, params, cookies]) => {
						if (isKO || forceKO) {
							isKOSet.add(skuId);
						}
						allSKUParam[skuId] = params;
						try {
							cookies.forEach(c => {
								const domain = c.domain.startsWith('.')
									? c.domain.slice(1)
									: c.domain;
								helper.reqTools.cookiejar.setCookieSync(
									new Cookie({
										key: c.name,
										value: c.value,
										domain: domain
									}),
									`https://${domain}`
								);
							});
						} catch (e) {
							console.log('setCookie failed');
						}
					})
					.catch(async e => {
						errorSet.add(skuId);
						console.log(`${skuId},访问详情页出错`, e);
					})
			)
		);
	} else {
		await new Promise(resolve => {
			let printPoints = false;
			const id = setInterval(async () => {
				const now = Date.now();
				if (process.platform !== 'win32') {
					printPoints = !printPoints;
					process.stdout.write('\r\x1b[K');
					process.stdout.write(dayjs(now).format('YYYY-MM-DD HH:mm:ss.SSS'));
					if (printPoints) {
						process.stdout.write('...');
					}
				}
				if (now + m * 60 * 1000 >= date) {
					for (let i = 0; i < skuIds.length; i++) {
						const skuId = skuIds[i];
						if (isKOSet.has(skuId)) continue;
						const [isKO, params] = await getPageConfig(skuId, areaId).catch(
							e => {
								// errorSet.add(skuId);
								console.log(`${skuId},访问详情页出错`, e);
							}
						);
						if (params) {
							allSKUParam[skuId] = params;
						}
						if (isKO || forceKO) {
							isKOSet.add(skuId);
						}
						if (i < skuIds.length - 1) {
							await new Promise(r => setTimeout(r, 1000));
						}
						m--;
					}
				}
				if (now >= date || forceKO) {
					clearInterval(id);
					resolve();
				}
				if (isKOSet.size === skuIds.length || m <= 1) {
					// 所有sku都是秒杀商品或者开抢前一分钟没变化
					clearInterval(id);
					resolve();
				}
			}, 10000);
		});
		if (!allSKUParam[skuId]) {
			errorSet.add(skuId);
		}
	}

	// 购物车商品
	const cartSkuIds = skuIds.filter(s => !isKOSet.has(s) && !errorSet.has(s));
	if (isKOSet.size > 0 || forceKO) {
		console.log('当前流程是预约秒杀流程, 从详情页面直接提交订单的!');
		console.log('请留意窗口打印信息');
		const KOSkuIds = [...isKOSet];
		const skuId = KOSkuIds.shift();
		submitOrderFromItemDetailPage(date, skuId, allSKUParam[skuId]);
		if (KOSkuIds.length > 0) {
			process.send({
				doneWork: 'forkKO',
				items: KOSkuIds.map(skuId => ({
					skuId,
					date,
					param: allSKUParam[skuId],
					areaId
				}))
			});
		}
		return;
	}
	console.log(cartSkuIds, 'ids');
	if (cartSkuIds.length > 0) {
		if (cartSkuIds.length > 1) {
			console.log('发现你添加了多个商品, 如果其中一个无货则整个订单会提交失败');
			console.log('将会自动帮你提交第一个, 提高成功率');
		}
		console.log('第一个skuId:', cartSkuIds[0]);
		submitOrderFromShoppingCart(
			date,
			cartSkuIds.slice(0, 1),
			allSKUParam,
			areaId,
			submitTimes,
			maxWaitingMS
		);
	}
};

exports.login = login;
exports.helper = helper;
exports.submitOrderProcess = submitOrderProcess;
exports.submitOrderFromItemDetailPage = submitOrderFromItemDetailPage;
exports.isSkuInCart = isSkuInCart;
exports.getPageConfig = getPageConfig;
exports.submitOrderFromShoppingCart = submitOrderFromShoppingCart;
