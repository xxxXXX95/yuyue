# windows 引导设置

下载最新 release 中 Assets 中 yuyue-setup-amd64.exe 文件, 执行后根据引导配置项目
下载链接:  
[release链接:https://github.com/xxxXXX95/yuyue/releases](https://github.com/xxxXXX95/yuyue/releases)

```shell
# 执行 main.exe
# 输出以下内容
2021/11/04 21:44:26 main.go:42: 未发现proxy代理, 可能会从github下载失败
2021/11/04 21:44:26 main.go:81: 正在下载...
2021/11/04 21:44:34 main.go:96: 下载完成, 准备解压
2021/11/04 21:44:34 main.go:124: 不认识的文件类型 103 pax_global_header
2021/11/04 21:44:35 main.go:129: 解压完成: C:\Users\lenovo\project\gocode\xxxXXX95-yuyue-master
2021/11/04 21:44:35 main.go:245: 正在安装依赖...
此流程可能因为网络环境花费3~5分钟,请耐心等待

..................................................................................................................
................................
..................................................................................................................
..................................................................................................................
................................................................................................................
依赖下载完毕
2021/11/04 21:46:49 main.go:158: node依赖安装完毕!

请按照提示完成以下输入, 回车确认。
如果输入错误请完成此流程后前往
xxxXXX95-yuyue-d32b4d8\config.js文件修改
------------------------------
------------------------------
请打开C:\Users\lenovo\project\gocode\xxxXXX95-yuyue-master\xxxXXX95-yuyue-d32b4d8\area
文件根据你所在区域选择对应areaId, 例如: 1_72_4211

# 输入 xxx 按回车 如 123_123_123Enter
请输入你的areaId: 123_123_123
# 输入密码 如 123456Enter
请输入密码(此密码只会保存在本地): 123456
请使用浏览器打开C:\Users\lenovo\project\gocode\xxxXXX95-yuyue-master\xxxXXX95-yuyue-d32b4d8\get_eid_fp.html, 获取e
id和fp
# 按提示输入fp和Eid
请输入浏览器页面显示的fp(必填): 123
请输入浏览器页面显示的eid(必填):123


&main.Config{Pwd:"123", AreaId:"1233_123_123", Fp:"123", Eid:"123"}
C:\Users\lenovo\project\gocode\xxxXXX95-yuyue-master <nil>

最后一步
----------------------------------------
请打开xxxXXX95-yuyue-d32b4d8\tasks-pool.js文件, 仔细查看说明,修改skuId,和抢购日期后, 然后执行
C:\Users\lenovo\project\gocode\xxxXXX95-yuyue-master\executeNodejs.bat进行抢购
----------------------------------------
程序已经初始化完成!
all work done!
```
