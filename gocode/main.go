package main

import (
	"archive/tar"
	"bufio"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	_ "strconv"
	"strings"
	"syscall"
	"text/template"
)

var (
	setup   = "setup"
	upgrade = "upgrade"
	repo    = "yuyue"
	owner   = "xxxXXX95"
	repoUrl = "https://github.com/xxxXXX95/yuyue"
)

func main() {
	_, err := exec.LookPath("node")
	if err != nil {
		fmt.Println("请先下载安装`nodejs`后重启, 安装地址 http://nodejs.cn/download/current/")
		PressExit("")
	}
	log.SetFlags(log.Ldate | log.Lshortfile | log.Ltime)
	httpProxy := os.Getenv("http_proxy")
	httpsProxy := os.Getenv("https_proxy")

	if httpProxy == "" && httpsProxy == "" {
		log.Println("未发现proxy代理, 可能会从github下载失败")
	}

	arg1 := []string{"setup"}
	if len(os.Args) > 1 {
		arg1 = os.Args[1:2]
	}

	action1 := strings.TrimSpace(arg1[0])
	if action1 == "" {
		action1 = "setup"
	}
	switch action1 {
	case setup:
		setupProject()

	case upgrade:
		//
	}
}

func NewProxyClient() *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
		},
	}
}

func downloadRepo() (*http.Response, error) {
	repoUrl := fmt.Sprintf("https://api.github.com/repos/%s/%s/tarball/master", owner, repo)
	client := NewProxyClient()
	req, _ := http.NewRequest("GET", repoUrl, nil)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	res, err := client.Do(req)
	return res, err
}

func setupProject() {
	log.Println("正在下载...")
	res, err := downloadRepo()
	if err != nil {
		log.Println("下载失败, 请最好设置代理后再试")
		PressExit("")
	}

	defer func() {
		res.Body.Close()
	}()
	gz, err := gzip.NewReader(res.Body)
	if err != nil {
		log.Println(err)
		PressExit("")
	}
	log.Println("下载完成, 准备解压")
	dirName := fmt.Sprintf("%s-%s-master", owner, repo)
	_, pathErr := os.Stat(dirName)

	if os.IsExist(pathErr) {
		// 文件夹已经存在情况
		fmt.Println("TODO: file or dir exists")
	}
	os.Mkdir(dirName, os.ModePerm)
	os.Chdir(dirName)
	tr := tar.NewReader(gz)
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break // reach the end of tar
		}
		if err != nil {
			log.Println(err)
			PressExit("")
		}
		switch h.Typeflag {
		case tar.TypeDir:
			os.MkdirAll(h.Name, h.FileInfo().Mode())
		case tar.TypeReg:
			tarFile, _ := os.Create(h.Name)
			io.Copy(tarFile, tr)
			tarFile.Close()
		default:
			log.Println("不认识的文件类型", h.Typeflag, h.Name)
		}

	}
	cwd, _ := os.Getwd()
	log.Printf("解压完成: %s", cwd)
	dir, _ := os.ReadDir(".")
	type Config struct {
		Pwd    string
		AreaId string
		Fp     string
		Eid    string
	}
	if dir[0].IsDir() {
		repoRootDir := dir[0].Name()
		repoRootDirPath := filepath.Join(cwd,
			repoRootDir)
		configJsPath := filepath.Join(repoRootDir, "config.js")
		installErr := RunNpmInstall(repoRootDirPath)
		c := make(chan os.Signal, 1)

		signal.Notify(c, os.Interrupt, syscall.SIGTERM)
		go func() {
			<-c
			_, err := os.Stat(configJsPath)
			if os.IsNotExist(err) {
				fmt.Println()
				log.Fatalln("配置尚未生成,但程序被提前退出了, 如要继续请重启")
			}
		}()
		if installErr != nil {
			log.Println(installErr)
			PressExit("")
		}
		log.Println("node依赖安装完毕!")
		fmt.Println()
		fmt.Printf("请按照提示完成以下输入, 回车确认。\n如果输入错误请完成此流程后前往\n%s文件修改\n", configJsPath)
		fmt.Println(strings.Repeat("-", 30))
		fmt.Println(strings.Repeat("-", 30))
		fmt.Printf("请打开%s\n文件根据你所在区域选择对应areaId, 例如: 1_72_4211", filepath.Join(repoRootDirPath, "area"))
		fmt.Println()
		areaId := ScanText("请输入你的areaId:", true)
		pwd := ScanText("请输入密码(此密码只会保存在本地):", false)
		fmt.Printf("请使用浏览器打开%s, 获取eid和fp", filepath.Join(repoRootDirPath, "get_eid_fp.html"))
		fmt.Println()
		fp := ScanText("请输入浏览器页面显示的fp(必填):", true)
		eid := ScanText("请输入浏览器页面显示的eid(必填):", true)

		config := &Config{Pwd: pwd, Fp: fp, Eid: eid, AreaId: areaId}
		fmt.Printf("%#v\n", config)

		configjsText := `
		// 最简单只加 eid, areaId 和 fp
		const config = {
			// 支持自定义 UA, 非必填
			userAgent:
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
			// 必填,
			// 最新:用浏览器(最好chrome)打开本地文件夹下
			// 'get_eid_fp.html'文件, 将网页中'eid','fp' 填入配置中
			eid: '{{.Eid}}', // string, 必填
			fp: '{{.Fp}}', // string, 必填
			// 6位支付密码如 '123456' 最好填上.如果当前账号有红包之类的则必填
			// 只用于使用红包, 优惠券等. 不用于支付订单
			pwd: '{{.Pwd}}',
			// *现在必须设置areaId*
			// areaId 获取在第5步骤说明
			areaId: '{{.AreaId}}',
			// 提交订单失败后, 是否继续轮询库存状态
			// 当有库存时, 再次提交订单
			// 默认 false 因为秒杀商品过了抢购时间会恢复原价
			// 此时可能提交了一个原价的订单
			inventoryPoll: false
		};
		module.exports = config;`
		tmpl, tempErr := template.New("congfigjs").Parse(configjsText)
		fmt.Println(os.Getwd())
		if tempErr != nil {
			log.Println(tempErr)
			PressExit("")
		}
		configJs, createPathErr := os.Create(configJsPath)
		if createPathErr != nil {
			log.Panicln(createPathErr)
			PressExit("")
		}
		defer configJs.Close()

		tmpl.Execute(configJs, config)

		if runtime.GOOS == "windows" {
			fName := "executeNodejs.bat"
			f, _ := os.Create(fName)
			nodejsIndex := filepath.Join(repoRootDirPath, "index.js")
			b := []byte(fmt.Sprintf("node %s\nPAUSE", nodejsIndex))
			f.Write(b)
			fmt.Println()
			fmt.Println("最后一步")
			fmt.Println(strings.Repeat("-", 40))
			fmt.Printf("请打开%s文件, 仔细查看说明,修改skuId,和抢购日期后, 然后执行\n%s进行抢购\n", filepath.Join(repoRootDir, "tasks-pool.js"), filepath.Join(cwd, fName))
			fmt.Println(strings.Repeat("-", 40))
			fmt.Println("程序已经初始化完成!")
			fmt.Println("all work done!")
			fmt.Printf("邀请你加入tgGroup: https://t.me/joinchat/TbvlRm5WL8hruLYG\n")
			PressExit("")
		} else {
			// f, _ := os.Create("executeNodejs.sh")
			fmt.Printf("非windows系统用户, 应该自己可以解决吧")
			PressExit("")
		}
		return

	}
	log.Fatalln("解压文件为空, 可能内部导致错误, 请联系作者", repoUrl)
	// http.req
}

func RunNpmInstall(dir string) error {
	cmd := exec.Command("npm", "install", "--production")
	cmd.Dir = dir
	stdout, err := cmd.StdoutPipe()
	log.Println("正在安装依赖...")
	fmt.Println("此流程可能因为网络环境花费3~5分钟,请耐心等待")
	fmt.Println()
	execErr := cmd.Start()
	if err != nil || execErr != nil {
		log.Println(err, execErr)
		if err != nil {
			return err
		} else {
			return execErr
		}
	}
	br := bufio.NewReader(stdout)
	for {
		_, err := br.ReadByte()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		fmt.Print(".")

	}
	fmt.Println()
	fmt.Println("依赖下载完毕")
	cmd.Wait()
	return nil
}

func ScanText(q string, required bool) string {
	var input string
	fmt.Print(q)
	fmt.Scanln(&input)
	if required && input == "" {
		return ScanText(q, required)
	}
	fmt.Println()
	return input
}

func PressExit(tip string) {
	fmt.Println(errors.New(tip))
	fmt.Print("输入回车退出...")
	fmt.Scanln()
	os.Exit(1)
}
