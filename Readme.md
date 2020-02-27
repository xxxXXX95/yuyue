
# 买 jd 直营口罩

### 此代码基于原作者 https://github.com/tychxn/jd-assistan 进行修改

## 单独支持预约-抢购-成功后直接提交订单的商品

**疫情期间, 口罩资源空缺, 没得办法(不作恶)**

## Quick Start

1 **`必须配置config文件` **
```js
const config = {
	// 是否微信公众号推送
	messenger: true,
	// key值在 http://sc.ftqq.com/3.version 查看申请使用的方法, 把key粘贴至这里, 关注网站中公众号即可
	sckey: '',
	
	// 必填, jd登录 pc 端, 随便提交一个订单, 查看 submitOrder 接口把里面eid, 和fp粘贴过来
  eid:'',
  fp: ''
};
```

2 有node开发环境开发使用 nodejs v12.x

3 `npm intall` 或者 `yarn` 安装依赖, 可使用 taobao 镜像

4 index.js 中修改, 第一个参数 `skuId`, 必填。例如商品链接 `https://item.jd.com/100006362015.html`  '100006362015' 即 `skuId`, `hour`:0-23, `minute`: 0-59, 意思每天 hour:minute 执行抢购. 实际只要执行一次
`buyMaskProgress('100011521400', { hour: 10, minute: 0 });` 意思 早上10:00 执行

5 当前目录下 `node index`

6 扫描终端中的二维码登录, 24小时重启不需要再次登录, cookie 串会保留在本地文件中。过期必须重新扫码, 和jd 官网一致