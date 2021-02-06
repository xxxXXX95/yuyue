// https://yushou.jd.com/member/qualificationList.action 自动获取页面中所有预约商品时间
// areaId输入所在aredID,preTime 提前时间单位ms
function getSkuTime(areaId,preTime=100){
    let skuArray = [];
    let skuReg = /item\.jd\.com\/(\d+)/;
    $(".mc .cont-box").each(function () {
        let date = 0;
        let i = 0;
        $(this).find("a").each(function () {
            if (i === 0) {
                let skuHref = $(this).attr("href");
                let sku = skuReg.exec(skuHref)[1].trim();
                let strTime = $("#" + sku + "_buystime").val();// 2021-01-15 11:00:00
                date = new Date(Date.parse(strTime.replace(/-/g, "/"))).getTime();}
            if (i > 0) {
                let skuHref = $(this).attr("href");
                if (skuReg.test(skuHref)) {
                    let sku = skuReg.exec(skuHref)[1].trim();
                    skuArray.push({
                        skuId: sku,
                        date: date,
                        detail_date: new Date(date).toLocaleString()
                    });
                }
            }
            i = i + 1;
        });

    })
    let timeArray = [];
    for(let sku of skuArray){
        if (timeArray.indexOf(sku.date)===-1) {
            timeArray.push(sku.date);
        }
    }
    let taskPool = [];
    for (let i of timeArray){
        let skuIDs = [];
        for (let sku of skuArray){
            if (sku.date===i){
                skuIDs.push(sku.skuId);
            }
        }
        let task = {
            skuId:skuIDs,
            date: i-100,
            "areaId": areaId,
            detail_date: new Date(i).toLocaleString()
        }
        taskPool.push(task)
    }
    console.log(taskPool);
}

getSkuTime(123456,200);




