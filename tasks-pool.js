// 年      月          日      时     分     秒     毫秒
// 2020,  0-11,     1-31,   0-24,  0-60  0-60   0-1000
// 如

const dd1 = new Date(2021, 5, 10, 17, 59, 59, 800).getTime()

exports.pool = [{ skuId: '100020882300', date: dd1 }]
exports.forceLogin = false
