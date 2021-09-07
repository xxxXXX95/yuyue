const cluster = require('cluster');
const path = require('path');
const fs = require('fs');
const dayjs = require('./dayjs.min.js');

const filePath = path.join(__dirname, 'config.js');
try {
	fs.accessSync(filePath, fs.constants.F_OK);
} catch (e) {
	console.log(e);
	console.log('请按 readme中, 在本目录下新建 config.js 并填写内容');
	process.exit();
}

const { login, submitOrderProcess, helper } = require('./jobs');
const { pool, forceLogin } = require('./tasks-pool');
const config = require('./config');

if (!config.eid || !config.fp) {
	console.log('请在 config.js 按备注填写 `eid` 和  `fp`');
	process.exit();
}

if (cluster.isWorker) {
	const setupLoginWork = item => {
		if (item.forceLogin) {
			console.warn(
				'已开启强制扫码登录, 如果接下里24小时内频繁重启, 重启最好关闭了'
			);
		}
		return login(item.forceLogin);
	};
	const setupWork = item => {
		const {
			date,
			skuId,
			areaId = config.areaId,
			forceKO = false,
			...rest
		} = item;
		if (!areaId) {
			console.log('no areaId!请确认填写了正确到areaId');
			process.exit(1);
		}
		const expectedDate = new Date(item.date);
		// 任务进程
		console.log(
			'process.worker:',
			process.pid,
			'待抢购时间:',
			dayjs(expectedDate).format('YYYY-MM-DD HH:mm:ss.SSS'),
			'sku',
			item.skuId
		);
		process.on('exit', () => {
			process.send({
				doneWork: 'cookie',
				cookies: helper.reqTools.cookiejar.toJSON()
			});
		});
		// 补足 2_xxx_xxx -> 2_xxx_xxx_0
		const area = areaId.split('_').length === 3 ? `${areaId}_0` : areaId;
		submitOrderProcess(date, skuId, area, { forceKO, ...rest });
	};
	process.on('unhandledRejection', reason => {
		console.log(reason);
	});
	cluster.worker.on('message', async job => {
		if (job.type === 'login') {
			console.log('progress.worker:login', process.pid);
			await setupLoginWork(job);
			cluster.worker.send({ doneWork: 'login' });
			console.log('登录完成');
			process.exit();
		}
		if (job.type === 'task') {
			setupWork(job);
		}
	});
} else {
	// 使用独立进程登陆
	// forcelogin, 强制登陆一次
	const cookies = [];
	let isWritingFile = false;
	cluster.fork().send({ type: 'login', forceLogin });
	cluster.on('message', (_, message) => {
		// 登陆流程
		if (message.doneWork === 'login') {
			// eslint-disable-next-line global-require
			require('./codeInfo');
			// 登陆完成后
			for (let i = 0; i < pool.length; i++) {
				const item = pool[i];
				cluster.fork().send({ ...item, type: 'task' });
			}
		}
		// fork 秒杀流程
		if (message.doneWork === 'forkKO') {
			for (let i = 0; i < message.items.length; i++) {
				const item = message.items[i];
				cluster.fork().send({ ...item, type: 'task', forceKO: true });
			}
		}
		//
		if (message.doneWork === 'cookie') {
			helper.saveJson(message.cookies);
		}
	});

	console.log('process.master:', process.pid);
}
