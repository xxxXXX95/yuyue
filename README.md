# 买 jd 预约抢购商品（原 jd_by_mask）

### 此代码受 https://github.com/tychxn/jd-assistan 启发完成

TG Group

[来吧加入电报组 😊](https://t.me/joinchat/I5uwLB2vr6pruLYG)

Issues 帮助
https://github.com/xxxXXX95/yuyue/issues/8

Master

https://github.com/xxxXXX95/yuyue/tree/master

## 支持预约-抢购-提交订单流程的商品

狗东预约抢购模式下又设置了如下俩种抢购流程, 现在程序内部实现了自动区分俩种流程。区分依据参照下文`代码分析`处贴的俩个 js 文件

1. 到时间直接抢购, 也叫秒杀(例如以前的口罩, 类似茅台(茅台现在限定 App 中抢购了 😄))
2. 到时间先添加购物车 -> 到购物车提交订单(普通显卡预约抢购类)
3. 原价到时间变价

写在前面

1. 模式 1 特别说明: 此模式商品展示无明显特征(console 控制台倒是可以打印对应参数区分).**`抢购时间有可能立即开始, 也有可能需要预约结束后再等一小段时间(几分钟到半个小时不等)才可以抢购`**。需要不需要再等都遇到过。抢购时注意终端中会提示 `"当前流程是预约秒杀流程`, 这样的提示就是此模式.
2. 如果需要再等, 提交会失败但是提示有货.此时请手机或者浏览器查看商品最新状态.流程也处理一部分情况请注意打印文字提示
3. 模式 1 再说明: 区分流程的特征, 狗东最晚在开抢前几分钟内才设置, 程序现在已经支持自动区分了
4. 因为狗东有红包的话, 会自动勾选使用红包.为了抢购成功和快速, 配置文件中`最好填写 6 位支付密码`(保存密码的`config.js` **`不会从你本地上传到任何地方,请放心!!`**)
5. 已知 `windows` 系统自带终端打印出来的二维码错位, 请更换终端或者手动打开自动生成在本目录下`qrcode.png`文件, 进行扫码
6. 由`jd_by_mask` 改名 `jd_yuyue`.之前使用错别字防止搜索且买口罩也不符合现在仓库内容, 所以改名 `jd_yuyue` 了
7. 由 `jd_yuyue` 改名 `yuyue`, 被 x 东邮件通知下架. 避免出问题, 规避搜索

TG Group

[来吧加入电报组 😊](https://t.me/joinchat/I5uwLB2vr6pruLYG)

## Quick Start

1 **`必须配置config文件`**, 在目录下新创建 `config.js` 文件。格式如下（可以直接复制过去填充内容）

```js
// 最简单只加 eid, areaId 和 fp
const config = {
	// 支持自定义 UA, 非必填
	userAgent:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
	// 是否微信公众号推送抢购结果, 非必填
	messenger: false, // true, false
	// key 值在 http://sc.ftqq.com/3.version, 查看申请使用的方法. 把key粘贴至这里, 微信关注网站中的公众号即可.
	sckey: '', // string, messenger 是 true 则为必填, 不填写不影响抢购流程

	// 必填,
	// 最新:用浏览器(最好chrome)打开本地文件夹下
	// `get_eid_fp.html`文件, 将网页中`eid`,`fp` 填入配置中
	// 其他方式: 或者电脑打开 jd 登陆页面, devtools, 选择
	// `Elements`, 搜索 eid 和 sessionId(即fp),
	// 在搜索到的input元素上面 value 属性中的值复制过来
	eid: '', // string, 必填
	fp: '', // string, 必填
	// 6位支付密码如 '123456' 最好填上.如果当前账号有红包之类的则必填
	// 只用于使用红包, 优惠券等. 不用于支付订单
	pwd: '',
	// *现在必须设置areaId*
	// areaId 获取在第5步骤说明
	areaId: ''
};
module.exports = config;
```

2 需要有 `node` 开发环境开发使用 `nodejs` v12.x 以上, 没有 nodejs 官网下载一个就行. 下载安装完后终端执行 `node -v` 查看版本. 其自带包管理器 `npm`

3 在`本项目目录`(不是 nodejs 安装目录)下执行 `npm install --production` 或者 `yarn --prod`(不熟悉的, 就直接使用 npm 效果一样的) 安装依赖, 已经默认配置使用 `taobao` 镜像地址下载依赖包

4 配置`tasks-pool.js`(以前在*index.js* 中, 现在迁移出来了) 中设置日期 `date`, `forceKO`, `areadId`(如果已在 `config.js` 中设置了`areadId`, 这里无需再设置) 和要抢购的 `skuId`, 可选参数 新增 `submitTimes` 不填默认 10, `maxWaitingMS` 不填默认 800
格式如下

```js
// 年      月          日      时     分     秒     毫秒
// 2020,  0-11,     1-31,   0-24,  0-60  0-60   0-1000
// 如
// new Date(2020, 2, 4, 10, 0, 0, 400).getTime()
// 等于 2020-3-4 10:00:00.400

// 修改使用的时间
// **日期说明** 1-12月
// 0表示是一月, 11表示是12月
// 2020/3/3 10:00:00.400
const dd1 = new Date(2020, 2, 3, 10, 0, 0, 400).getTime();
// 2020/3/3 20:00:00.400
const dd2 = new Date(2020, 2, 3, 20, 0, 0, 400).getTime();
// 2020/3/3 21:00:00.400
const dd3 = new Date(2020, 2, 3, 21, 0, 0, 400).getTime();

// 修改这里, 添加skuId, 抢购时间 date, 强制使用秒杀流程 forceKO(已经不推荐使用, 程序自动会判断), areaId, 选填项 submitTimes, maxWaitingMS
// 需要更改 年/月/日 时:分:秒.毫秒
// skuId 获取方法， 打开任意一个商品详情页如 `https://item.jd.com/100011521400.html`, 则 `100011521400` 就是其skuId
exports.pool = [
	// 1 *现在必须设置areaId*
	//   如果上面 `config.js`中已经配置过了, 此处可以不用再配置`areaId`, areaId 获取在第 5 步骤说明
	// 2 forceKO: true/false (废弃不用)
	// 3 此脚本也可在非预约抢购流程中的秒杀(到时间变价那种)使用,为防止提交原价订单, 可配置提交订单重试次数 推荐 2-3 次(不明白的忽略)
	// 4 如果抢购过程中出现 `请求结算页面超过xxx ms`, 请增大maxWaitingMS, 建议1000-2000之间, 不设置默认 800
	{ skuId: '100011621642', date: dd1, areaId: `2_2825_51936` }
	// skuId: '10022991959725',areaId: `2_2825_51936`, date: dd1, submitTimes: 3, maxWaitingMS: 1000
	// 不同时间的sku, 复制上述项修改值, 填写在下方
];
// 设置要强制扫码登录(没搞懂使用场景的忽略此配置)
// 说明: 因为 x 东, 24小时就要重新登录, 防止运行时登录状态有效
// 抢购执行时 cookie 过期了, 就尴尬了.
// true 强制扫码登录, 不使用当前已经存在本地的 cookie. 登录过后频繁重启时记得关闭
// 否则一直要扫码
exports.forceLogin = false;
```

5 *必须*配置地区 `areaId`. 请打开项目目录下 `area/你所在省份`, 找到你所在地区对应的 id 复制到 `config.js` 对应字段中. 如 `area/2.上海.txt`, `'崇明县/东平镇:'2_2919_50783',` 对应 `'2_2919_50783'`, 按照上面示范填入上述`config.js`中 或者 `tasks-pool.js` 内 pool 数组的一项中.

6 本项目目录下执行 `node index`

7 扫描终端中的二维码登录, 24 小时之内重启不需要再次扫码登录, `cookie` 串会保留在本地文件 `cookie.json` 中. 过期的话必须重新扫码（代码自动校验）

8 新增`pupetter` windows 下面 280M, linux 或者 mac 下面 200M 不到

## Todo

- [x] 合并抢购流程为添加购物车抢购流程的进程
- [x] 狗东太恶心了, 区分流程的关键参数, 等到开抢前几分钟才获取到, 要想办法兼容
- [x] 如果预约时间结束, 还需要等待一小段时间后才抢购, 程序自动等待执行(1h 内)
- [x] 根据商品, 自动确定抢购流程
- [x] 针对从购物车提交订单流程。如果此商品已经在购物车中, 则直接抢购不需要执行添加购物车操作了

## 代码分析

区分抢购模式主要 js 代码文件

- [isKO 逻辑 js](https://static.360buyimg.com/item/unite/1.0.114/components/??default-soa/common/common.js,default-soa/address/address.js,default-soa/prom/prom.js,default-soa/colorsize/colorsize.js,default-soa/buytype/buytype.js,default-soa/baitiao/baitiao.js,default-soa/o2o/o2o.js,default-soa/buybtn/buybtn.js,default-soa/pingou/pingou.js,default-soa/track/track.js,default-soa/suits/suits.js,default-soa/crumb/crumb.js,default-soa/fittings/fittings.js,default-soa/contact/contact.js,default-soa/popbox/popbox.js,default-soa/preview/preview.js,default-soa/info/info.js,default-soa/imcenter/imcenter.js,default-soa/jdservice/jdservice.js,default-soa/jdservicePlus/jdservicePlus.js,default-soa/jdserviceF/jdserviceF.js,default-soa/commitments/commitments.js,default-soa/gift/gift.js,default-soa/vehicle/vehicle.js,default-soa/lazyinit/lazyinit.js,public-soa/modules/detail/detail.js)
- [设置按钮状态逻辑](https://static.360buyimg.com/item/unite/1.0.114/components/??default/common/plugins/jQuery.scroller.js,default-soa/buybtn/reservation.js,default-soa/buybtn/ko.js,default-soa/buybtn/bigouma.js)

## Notice

- 反对 jd 耍猴, 更反对滥用盈利作恶！
- 对 `windows` 系统不友好, 有问题反馈
- 距离开始前稍近时启动, 最好不要让自己电脑在这期间黑屏待机
- 每天最好提前做一次扫码, 免得程序启动时候登录有效, 抢购过程中登录失效
- 预约每个人都很容易拿到, 不用使用脚本执行预约
- 这是 node 版本, 不熟悉的可使用 python 版本.(本版本借鉴/使用了下面部分功能和资源)
- ~~https://github.com/zhou-xiaojun/jd_mask~~
- ~~https://github.com/tychxn/jd-assistant(购物车逻辑已经更改了, 此脚本后续没有更新, 应该都不能使用了)~~
- 功能大同小异, 我根据自身需求加了在终端中扫码, 多进程抢不同商品
- 抢购流程的判断
- 关于 jd 口罩问题, 发现和地区有很大关系, 有的地区根本不会抢到(时间太久了, 现在没有人会在意口罩了吧 😄)
- 关于上面的问题, 几个类似库 issues 都有讨论
- https://github.com/zhou-xiaojun/jd_mask/issues/1
- https://github.com/tychxn/jd-assistant/issues/108#issuecomment-592947377
- 发现真的地区差异很大，上海一次没有，朋友江苏连续俩次 ---3-19 日最新更新

## 成功案例

- 订单<img src="https://user-images.githubusercontent.com/13815865/77068877-56728700-6a22-11ea-8102-925cc25a4b92.png" />

- 成功案例太多了, tg 群很多人都抢到了, 尤其日用品, 如日用纸, 和 0.01 的水果

更多案例(☝️ 加群): [issues/2](https://github.com/meooxx/jd_by_mask/issues/2)

## Advanced(废弃)

_解决不了 mac 待机状态, 代码不执行的问题。会延迟很久才执行_

熟悉 `nodejs` 和 `golang` 使用。正常 `master` 版本已经满足实际使用了， 这部分使用说明不会很详细  
分支 `feture-golang` 新加了 `golang` 的版本。 跟 `master` 分支上的区别:
`master` 上面全部是 `nodejs`代码，实际使用发现在定时功能和`cookie` 在会话间储存不是很高效。正好略懂 `golang`, 就用 `golang` 把提交订单的部分重写了。
这个分支上面的流程, `nodejs` 负责登录状态维护, 包括登录流程 和 初始 `cookie` 储存。 `golang` 只做定时提交订单这部分流程。下面这段时间，测测实际效果。
完整流程 nodejs 启动, 监听本地 8888 端口在后台。 golang 启动, func init 中访问 nodejs http://127.0.0.1:8888/getCookies, 获得一系列 cookie 等。然后等待预约时间, 提交订单

![流程图片](https://github.com/meooxx/jd_by_mask/blob/master/diagram.svg)
