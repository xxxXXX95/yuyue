// 年     月    日     时    分   秒     毫秒
// 2020, 0-11, 1-31, 0-24, 0-60  0-60  0-1000
// 例如 2020-3-4 10:00:00.400
// (2020, 2, 4, 10, 0, 0, 400)

// 修改使用的时间
// 2020/3/3 10:00:00.400
const dd1 = new Date(2021, 0, 14, 9, 59, 59, 300).getTime();
const dd2 = new Date(2021, 0, 11, 11, 00, 00, 000).getTime();
// 修改这里, 添加skuId, 和抢购时间 date, 需要更改 月/日 时:分:秒:毫秒
// skuId 获取方法， 打开任意一个商品详情页如 `https://item.jd.com/100011521400.html`, 则 `100011521400` 就是其skuId
// https://item.jd.com/100015062660.html#crumb-wrap
exports.pool = [
  { skuId: '100012043978', date: dd1, areaId: '2_2825_51936' },
  {
    skuId: ['100012043978', '100016091234'],
    date: dd1,
    areaId: '2_2825_51936',
  },
  // { skuId: '100016091234', date: dd2, areaId: '2_2825_51936' },
  // { skuId: '100011621642', date: dd2 },
];

exports.forceLogin = false;
