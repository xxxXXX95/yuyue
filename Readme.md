
# 买 jd 直营口罩

### 此代码基于原作者 https://github.com/tychxn/jd-assistan 进行修改

## 单独支持预约-抢购-成功后直接提交订单的商品

**疫情期间, 口罩资源空缺, 没得办法(不作恶)**

## Quick Start

1 **`必须配置config文件` **, 在目录下新创建 `config.js` 文件。格式如下（可以直接复制过去填充内容）

```js
// 最简单只加 eid 和 fp
const config = {
	// 是否微信公众号推送抢购结果, 非必填
	messenger: true, // true, false 
	// key值在 http://sc.ftqq.com/3.version 查看申请使用的方法, 把key粘贴至这里, 关注网站中公众号即可
	sckey: '', // string, 跟 messenger 有则为必填, 不填写不影响抢购流程
	
	// 必填, jd登录 pc 端, 随便提交一个订单,利用谷歌浏览器devtools, 选择 `network`, 查看 submitOrder (注意要勾选 preserve log, 否则提交订单跳转后看不到该接口了) 接口, 把里面 `eid`, 和 `fp` 俩个字段分别粘贴过来
  eid:'',  // string, 必填
  fp: ''  // string, 必填
};

module.exports = config
```

2 需要有node开发环境开发使用 nodejs v12.x, 没有nodejs 官网 下载一个就行. 下载完安装完 node -v 查看版本. 自带包管理器 `npm`

3 在目录下执行 `npm install` 或者 `yarn`(不熟悉, 就使用 npm 一样的) 安装依赖, 已经默认使用 taobao 镜像地址下载依赖包

4 index.js 中修改日期和要抢购的skuId
```js
// 年     月    日     时    分   秒     毫秒
// 2020, 0-11, 1-31, 0-24, 0-60  0-60  0-1000
// 例如 2020-3-4 10:00:00.400
// (2020, 2, 4, 10, 0, 0, 400)

// 修改使用的时间
// 2020/3/3 10:00:00.400
const dd1 = new Date(2020, 2, 3, 10, 0, 0, 400).getTime();
// 2020/3/3 20:00:00.400
const dd2 = new Date(2020, 2, 3, 20, 0, 0, 400).getTime();
// 2020/3/3 21:00:00.400
const dd3 = new Date(2020, 2, 3, 21, 0, 0, 400).getTime();

// 修改这里, 添加skuId, 和抢购时间 date, 需要更改 月/日 时:分:秒:毫秒
// skuId 获取方法， 打开任意一个商品详情页如 `https://item.jd.com/100011521400.html`, 则 `100011521400` 就是其skuId
const pool = [
  // { skuId: '100011521400', date: dd1 },
  { skuId: '100011551632', date: dd2 },
  { skuId: '100006394713', date: dd2 },
  { skuId: '100011621642', date: dd2 }
];
```

5 当前目录下执行 `node index`

6 扫描终端中的二维码登录, 24小时之内重启不需要再次登录, cookie 串会保留在本地文件中 `cookie.json`中。过期的话必须重新扫码, 和 jd 官网一致

## Notice

* 目前最好每天上jd, 去找商品,  距离开始前十几分钟启动
* 预约每个人都很容易拿到, 不用使用脚本执行预约, 脚本也有功能, 但是不太需要, 而且没有加入定时
* 这是 node 版本, 不熟悉的可使用 python版本
* https://github.com/zhou-xiaojun/jd_mask
* 功能大同小异, 我根据自身需求加了在终端中扫码, 多进程抢不同商品
* 关于 jd 口罩问题, 发现和地区有很大关系, 有的地区根本不会抢到
* 关于上面的问题, 几个类似库 issues 都有讨论
* https://github.com/zhou-xiaojun/jd_mask/issues/1
* https://github.com/tychxn/jd-assistant/issues/108#issuecomment-592947377
* 发现真的地区差异很大，上海一次没有，朋友江苏连续俩次 ---3-19 日最新更新
* 注意使用最好提前个 `1s`, 因为提交订单前要请求其他俩个接口, 延迟疫苗差不多正好 
* 每天最好提前做一次扫码， 在 `//login(true)` 处打开, 会强制扫码登录一遍。或者多提前一会开启脚本

## 成功案例

* 订单<img src="https://user-images.githubusercontent.com/13815865/77068940-6ee2a180-6a22-11ea-91a9-e174fdd7a96a.png" />
* 订单<img src="https://user-images.githubusercontent.com/13815865/77068877-56728700-6a22-11ea-8102-925cc25a4b92.png" />

更多案例: [issues/2](https://github.com/meooxx/jd_by_mask/issues/2)
