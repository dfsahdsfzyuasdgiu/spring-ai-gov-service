# 广州市政务政策法规与办事导办 AI 智能系统
### 基于 SpringBoot + SpringAI 的全生命周期政务知识库与便民服务平台

<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg" alt="Spring Boot 3.3.4">
  <img src="https://img.shields.io/badge/Spring%20AI%20Alibaba-1.0.0--M2.1-orange.svg" alt="Spring AI Alibaba">
  <img src="https://img.shields.io/badge/Java-17-blue.svg" alt="Java 17">
  <img src="https://img.shields.io/badge/Database-H2%20(MySQL%20Mode)-yellow.svg" alt="H2 Database">
  <img src="https://img.shields.io/badge/UI%20Style-Square%20Gov%20Doc%20(Zero%20Emoji)-red.svg" alt="Zero Emoji Gov Style">
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License">
</p>

---

## 一、 系统定位与核心构想

本项目基于 **SpringBoot 3.3.4 + SpringAI + 阿里云百炼大模型（通义千问）** 研发，旨在解决传统政务咨询中政策条文晦涩、政务服务指引分散、网上办事“找不到入口、摸不清条件”的痛点。

### 核心架构构想与双轨回答机制
系统对标**广州市人民政府门户网站（`www.gz.gov.cn`）**政策库与**广东政务服务网（`www.gdzwfw.gov.cn` / `www.gdzwfw.gov.cn`）**全生命周期办事服务指引，建立中型政务服务数据库，实现 AI 双轨精准答复：
1. **当用户询问政策时**：
   - 提取法条核心要点进行大白话解读；
   - 严格挂载**【官方政策依据】**红头公文卡片，展示正式发文字号（如`穗公积金规字〔2023〕1号`、`穗府办规〔2022〕17号`等）、制定机关、施行日期，并支持一键展开条款原文抽屉，保证 100% 权威可溯源，杜绝大模型事实性幻觉；
2. **当用户询问如何办理/办事流程时**：
   - 以**【办事向导三步法】**卡片结构化极简输出：
     - **步骤 1【准入资格自查】（政务蓝 `#1677ff`）**：清晰罗列硬性门槛（户籍、社保月数、学历/年龄等），无任何套话尾注，便于市民精准自检；
     - **步骤 2【申报材料清单】（便民橙 `#fa8c16`）**：纯净清爽展示所需材料，彻底剔除冗余后缀徽章与重复说明，一目了然；
     - **步骤 3【全流程办事指引】（通畅绿 `#389e0d`）**：展示法定承诺时限、核心流转阶段（剔除耗时杂音小字）、线上申办通道与线下办事网点；
     - **【官方在线申办直达】（核心亮点）**：步骤 3 底部直出醒目的官方申办通道卡片，携带对应事项唯一实施编码（如 `GZ-GJJ-ZFTQ008` 等）与**广东政务服务网具体服务页面的真实在线申报跳转链接**，杜绝大段搜索套话，市民点击即可直达官方网办页面；
3. **严肃规范的政务视觉色彩体系与极致降噪标准（v1.8.0）**：
   - **向导三步法色彩分阶**：蓝（资格自查）➔ 橙（材料清单）➔ 绿（申办通道），层次分明，逻辑递进；
   - **官方政策依据**：精准保留正统**红头公文发文标准色**（`#c20505` 红边与 `#faecd8` 米底）；
   - **全局直角标准**：严格执行 `border-radius: 0 !important`；
   - **形式主义降噪彻底净化**：全面剔除“请对照上述准入条件...”、“核心材料已接入大数据联网核验...”、“打开手机微信搜索...实名认证后确认申报即可”、“信息承办：广州市政务服务和数据管理局”等所有无效废话套话；
   - **三重零 Emoji 纪律防御体系**：通过大模型 Prompt 公文纪律约束 + Java 后端 SSE 流式过滤器 + 前端 DOM 转义过滤，确保全流程**严格 0 Emoji、0 卡通图案**。

---

## 二、 全生命周期政务数据库架构（32 大核心事项 + 27 部政策规章）

系统在数据库中沉淀了覆盖广州市 10 大核心委办局（公安、住建、人社、医保、公积金、市监、民政、团委、科技等）的**全生命周期中型政务数据库**：

### 2.1 32 项政务服务事项全览（全部携带广东政务服务网具体服务跳转链接）

| 办事板块 | 事项数量 | 包含事项清单 | 实施编码 | 广东政务服务网官方办理链接 |
| :--- | :---: | :--- | :--- | :--- |
| **住房保障与公积金** | 3 项 | 1. 公共租赁住房申请<br>2. 无房租房提取公积金<br>3. 偿还购房贷款本息提取公积金 | GZ-ZJ-GZH001<br>GZ-GJJ-ZFTQ008<br>GZ-GJJ-HFTQ009 | [公租房申领直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%85%AC%E7%A7%9F%E6%88%BF&region=440100)<br>[租房提取直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%A7%9F%E6%88%BF%E6%8F%90%E5%8F%96&region=440100)<br>[还贷提取直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%BF%98%E8%B4%B7%E6%8F%90%E5%8F%96&region=440100) |
| **人才引育与落户** | 3 项 | 4. 积分制入户申请<br>5. 学历人才引进落户<br>6. 青年人才驿站免费住宿申请 | GZ-LS-JFRH002<br>GZ-RS-XLRH010<br>GZ-TW-QNYZ032 | [积分入户直通](https://djjd.gzlsrc.com.cn/)<br>[学历落户直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%AD%A6%E5%8E%86%E5%85%A5%E6%88%B7&region=440100)<br>[青年驿站直通](https://www.12355.net/gz/youth-station) |
| **青年创业与高校服务** | 2 项 | 7. 新引进博士与博士后安家费补贴<br>8. 粤港澳大湾区青年创业资助 | GZ-RS-RCBT011<br>GZ-KJ-QNCY033 | [人才补贴直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%BA%BA%E6%89%8D%E8%A1%A5%E8%B4%B4&region=440100)<br>[创业资助直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%9D%92%E5%B9%B4%E5%88%9B%E4%B8%9A&region=440100) |
| **公安户政与便民证件** | 3 项 | 9. 广东省内居民身份证到期换领<br>10. 广州市流动人口居住证申领<br>11. 新生儿出生登记落户 | GZ-GA-SFZ034<br>GZ-GA-JZZ012<br>GZ-GA-XSE013 | [身份证换领直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%BA%AB%E4%BB%BD%E8%AF%81%E6%8D%A2%E9%A2%86&region=440100)<br>[居住证申领直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%B1%85%E4%BD%8F%E8%AF%81&region=440100)<br>[新生儿落户直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%96%B0%E7%94%9F%E5%84%BF%E5%87%BA%E7%94%9F%E7%99%BB%E8%AE%B0&region=440100) |
| **交管车管警民服务** | 3 项 | 12. 机动车驾驶证期满换证（警医邮）<br>13. 中小客车增量指标申请（节能车摇号）<br>14. 六年免检机动车申请检验标志 | GZ-GA-JSZ015<br>GZ-JT-JNC014<br>GZ-GA-CLNJ016 | [期满换证直通](https://gd.122.gov.cn/)<br>[节能车指标直通](https://jtzl.jtj.gz.gov.cn/)<br>[免检标志直通](https://gd.122.gov.cn/) |
| **出入境往来服务** | 3 项 | 15. 往来港澳通行证个人旅游签注（智能速办）<br>16. 普通护照首次申领<br>17. 大陆居民往来台湾通行证及签注 | GZ-GA-GAQZ006<br>GZ-GA-HZ018<br>GZ-GA-TW019 | [往来港澳通行证直通](https://www.gdzwfw.gov.cn/portal/v2/guide/11440100007483172Q3440106043001)<br>[护照首次申领直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E6%8A%A4%E7%85%A7&region=440100)<br>[赴台通行证直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%8F%B0%E6%B9%BE%E9%80%9A%E8%A1%8C%E8%AF%81&region=440100) |
| **医疗保障与生育权益** | 4 项 | 18. 城乡居民基本医疗保险参保登记<br>19. 职工生育保险生育津贴申领<br>20. 广州医保个人账户家庭共济授权<br>21. 广州市异地就医定点联网备案 | GZ-YB-CXJM020<br>GZ-YB-SYJT023<br>GZ-YB-JTGJ021<br>GZ-YB-YDJY022 | [居民医保登记直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%9F%8E%E4%B9%A1%E5%B1%85%E6%B0%91%E5%8C%BB%E4%BF%9D&region=440100)<br>[生育津贴申领直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%94%9F%E8%82%B2%E6%B4%A5%E8%B4%B4&region=440100)<br>[家庭共济直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%AE%B6%E5%BA%AD%E5%85%B1%E6%B5%8E&region=440100)<br>[异地就医备案直通](https://fuwu.nhsa.gov.cn/) |
| **就业创业与社会救助** | 3 项 | 22. 失业保险金申领<br>23. 职业技能提升培训补贴<br>24. 广州市最低生活保障申请 | GZ-RS-SYBX024<br>GZ-RS-JNBT025<br>GZ-MZ-DB035 | [失业保险金直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%A4%B1%E4%B8%9A%E4%BF%9D%E9%99%A9%E9%87%91&region=440100)<br>[技能补贴直通](https://ggfw.hrss.gd.gov.cn/)<br>[低保申请直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%BD%8E%E4%BF%9D&region=440100) |
| **商事登记与企业培育** | 4 项 | 25. 个体工商户转型为企业（个转企）<br>26. 高新技术企业培育与市级认定奖励<br>27. 食品经营许可证核发（小型餐饮即办）<br>28. 企业简易注销登记公告与办理 | GZ-SC-GZQ027<br>GZ-KJ-GXJS029<br>GZ-SC-SPXK028<br>GZ-SC-JYZX030 | [个转企申报直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E4%B8%AA%E8%BD%AC%E4%BC%81&region=440100)<br>[高企奖励申报直通](https://kjj.gz.gov.cn/)<br>[食品经营许可直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%A3%9F%E5%93%81%E7%BB%8F%E8%90%A5%E8%AE%B8%E5%8F%AF&region=440100)<br>[简易注销直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E7%AE%80%E6%98%93%E6%B3%A8%E9%94%80&region=440100) |
| **民政老龄与拥军优属** | 4 项 | 29. 广州市老年人优待卡申领（敬老卡）<br>30. 广州市户籍80周岁以上长寿保健金<br>31. 婚姻登记预约（跨省通办）<br>32. 退役军人优待证申领 | GZ-MZ-LNYD031<br>GZ-MZ-CSJ036<br>GZ-MZ-HYDJ037<br>GZ-TY-YDZ038 | [老年人优待卡直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E8%80%81%E5%B9%B4%E4%BA%BA%E4%BC%98%E5%BE%85%E5%8D%A1&region=440100)<br>[长寿保健金直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%95%BF%E5%AF%BF%E4%BF%9D%E5%81%A5%E9%87%91&region=440100)<br>[婚姻登记预约直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E5%A9%9A%E5%A7%BB%E7%99%BB%E8%AE%B0&region=440100)<br>[退役军人优待证直通](https://www.gdzwfw.gov.cn/portal/v2/search?keyword=%E9%80%80%E5%BD%B9%E5%86%9B%E4%BA%BA%E4%BC%98%E5%BE%85%E8%AF%81&region=440100) |

### 2.2 27 部广州市政府现行红头政策公文库
数据库预置了 27 部真实有效的红头公文规章（包含 `穗府办规〔2024〕6号`、`穗公积金规字〔2023〕1号`、`穗府规〔2023〕1号`、`穗府办规〔2022〕17号`、`公安部令第162号` 等），覆盖发文字号、制定机构、成文日期及核心条文切片，为 RAG 问答提供坚实的法定依据支撑。

### 2.3 广州市法定公文发文字号“穗”字官方规范依据
根据中共中央办公厅、国务院办公厅印发的《党政机关公文处理工作条例》（中办发〔2012〕14号）第九条第四款规定：“发文字号由发文机关代字、年份、发文顺序号组成。”
* **广东省级机关**：统一代字为 **“粤”**（如 `粤府令`、`粤人社规`）；
* **广州市级机关**：统一依法使用官方简称 **“穗”**（源于羊城“五羊衔谷”历史典故，车牌为粤A）；
* **官方公文代字规范**：市政府发文为 `穗府`、市政府办公厅为 `穗府办/穗府办规`、市公积金中心为 `穗公积金/穗公积金规字`、市医保局为 `穗医保`、市人社局为 `穗人社`。若写作“广府”或“州府”，在行政法与公文审核中属于**违规公文**。

---

## 三、 技术架构与数据模型

| 层次 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **开发框架** | Spring Boot 3.3.4 (Java 17 LTS) | 企业级后端基础架构 |
| **大模型框架** | Spring AI Alibaba 1.0.0-M2.1 | 通义千问 `qwen-plus` 流式 SSE 调用与 Prompt 工程编排 |
| **持久化数据库** | H2 Database (文件模式 `./data/gz_gov_ai.mv.db`) | MySQL 兼容模式，增加外键级联约束，重启不丢数据 |
| **全局异常与安全** | `GovGlobalExceptionHandler` + `GovWebMvcConfig` | 拦截 400/404/405/500，统一结构化响应，彻底杜绝 Whitelabel 白页与堆栈泄露 |
| **数据爬虫采集** | Jsoup + Regex Engine | 广州市政务公文发文字号、正文条款及办事要素自动化抓取解析 |
| **前端交互规范** | 原生 JavaScript + Shadow DOM | 物理样式隔离，全直角公文视觉，字体字号舒适放大，自适应高清大屏 |

### 核心数据表设计
```text
gov_policy_doc            ── 广州市现行政策法规公文表 (发文字号、发布机关、成文日期、摘要)
gov_policy_clause         ── 政策法规条款切片表 (条款编号、法定原文内容，支持外键级联删除)
gov_affair_guide          ── 政务办事指南事项表 (实施编码、事项全称、法定/承诺时限、准入条件、官方直达链接)
gov_affair_material       ── 办事指南申报材料清单表 (材料名称、是否必备、免交方式、样本提示)
gov_affair_process        ── 办事流程步骤表 (环节序号、环节名称、办理内容、耗时估算)
gov_chat_history          ── 多轮会话持久化表 (sessionId、用户提问、AI回复、公文溯源、时间)
gov_knowledge_relation    ── 政务知识图谱三元组表 (事项 ➔ 政策依据 ➔ 办事要点结构化关联)
```

---

## 四、 快速构建与启动服务

### 方式一：一键双击批处理脚本（最推荐，零配置秒开）
* 在主工作区直接双击：👉 **`快速启动服务.bat`**
* 或进入项目根目录双击：👉 **`start.bat`**
> 脚本内置 JDK 17 环境自动检测、编译包自动检查（无包自动构建）、8080 端口占用防冲突及 UTF-8 编码强制保障。

### 方式二：命令行启动已打包 JAR（生产模式，2秒拉起）
```powershell
# 进入代码根目录
cd c:\Users\Lenovo\Desktop\实验项目\spring-ai-alibaba\spring-ai-alibaba

# 启动可执行程序包
java -Dfile.encoding=UTF-8 -jar target/spring-ai-alibaba-0.0.1-SNAPSHOT.jar
```

### 方式三：Maven 构建与运行
```powershell
# 一键编译并跳过测试打包
.\mvnw.cmd clean package -DskipTests

# 运行自动化安全与端点审计测试套件
.\mvnw.cmd test -Dtest=GovEndpointSecurityAuditTests
```
服务启动后，默认监听在 `http://localhost:8080/`。

---

## 五、 测试体验指南（三种方式）

### 方式一：【本地零配置极速测试】（最简便，无需安装任何插件）
1. 打开电脑浏览器，访问：  
   👉 **`http://localhost:8080/`**
2. 页面右下角已默认自动挂载**【广州政务 AI 智能咨询】**徽章；
3. 点击徽章展开抽屉，直接输入提问或点击推荐标签测试。

### 方式二：【真实政务网站 + 油猴插件测试】（真实环境伴随体验）
1. 确保浏览器已安装 **Tampermonkey（油猴）** 插件；
2. 访问 `http://localhost:8080/gz_gov_ai_assistant.user.js` 点击“安装”；
3. 打开真实官方政务网站：
   - 广州市人民政府门户网站：`https://www.gz.gov.cn/`
   - 广东政务服务网：`https://www.gdzwfw.gov.cn/`
4. 页面右下角将自动唤起助手，无感伴随咨询。

### 方式三：【真实政务网站 + 控制台一行注入】（免装插件，5秒即测）
1. 打开 `https://www.gz.gov.cn/` 或 `https://www.gdzwfw.gov.cn/`；
2. 按 `F12` 打开控制台（Console），粘贴执行以下代码：
   ```javascript
   const s=document.createElement('script');s.src='http://localhost:8080/gz_assistant_embed.js';document.body.appendChild(s);
   ```
3. 真实政务网页右下角即可立刻挂载专窗。

---

## 六、 32 项核心事项测试用例清单

| 测试场景 | 测试提问 (Prompt) | 验收要点 |
| :--- | :--- | :--- |
| **公积金租房提取** | `广州无房怎么提取公积金？` | • 命中事项 108 `GZ-GJJ-ZFTQ008`；<br>• 输出《广州市住房公积金提取管理办法》（穗公积金规字〔2023〕1号）；<br>• 步骤3展示**广东政务服务网直达办理链接**。 |
| **生育津贴发放** | `广州生育津贴怎么领取？` | • 命中事项 123 `GZ-YB-SYJT023`；<br>• 调取《广州市妇女儿童权益保障规定》（穗府办规〔2022〕17号）；<br>• 步骤3直出广东政务服务网生育津贴申报入口。 |
| **机动车期满换证** | `驾驶证快到期了怎么在广州换证？` | • 命中事项 115，说明“警医邮”网办到家或体检换证一站式流程；<br>• 步骤3提供官方交管综合平台申报直达链接。 |
| **港澳通行证签注** | `我想办理往来港澳通行证旅游签注怎么弄？` | • 命中事项 118，准确说明智能签注机“立等可取”与线上预约办理流程；<br>• 步骤3直出广东政务服务网办证入口。 |
| **学历引进入户** | `研究生学历怎么办理广州落户？` | • 命中事项 105，拆解统招硕士或博士落户社保门槛；<br>• 步骤3直出广东省人才引进入户申报通道。 |
| **个转企营商扶持** | `个体工商户怎么转成企业？` | • 命中事项 129，介绍资产直接承继与准入承诺绿色通道；<br>• 步骤3直出广东政务服务网“个转企”直达通道。 |
| **高企培育奖励** | `高新技术企业在广州有什么认定奖励？` | • 命中事项 128，引用科技奖励公文，明确市级一次性研发补贴；<br>• 步骤3提供市科技局官方申报链接。 |
| **长寿保健金发放** | `80岁以上老人的长寿保健金怎么领？` | • 命中事项 132，明确户籍年满80周岁长寿金按月发放标准与免申即享流程；<br>• 步骤3直出广东政务服务网申报入口。 |

---

## 七、 核心 API 接口一览

| 接口路径 | 方法 | 功能说明 |
| :--- | :--- | :--- |
| `/api/v1/gov/chat/stream` | `POST` | SSE 流式政务智能咨询接口（返回定性答复、公文出处、办事向导与直达链接） |
| `/api/v1/gov/policies` | `GET` | 查询 27 部政策公文库全量清单 |
| `/api/v1/gov/affairs` | `GET` | 查询 32 项全生命周期事项及广东政务服务网直达 URL |
| `/api/v1/gov/policy/search` | `GET` | 政策法规条款关键词模糊检索（参数 `keyword`） |
| `/api/v1/gov/chat/history` | `GET` | 查询多轮对话持久化历史记录 |
| `/api/v1/gov/chat/graph` | `GET` | 检索政务知识图谱三元组数据 |
| `/api/v1/gov/chat/crawl` | `POST` | 广州政务政策公文爬虫采集接口（输入 URL 或 HTML 自动解析入库） |
| `/gz_gov_ai_assistant.user.js` | `GET` | 油猴脚本一键分发安装端点 |
| `/gz_assistant_embed.js` | `GET` | 真实网站通用内嵌与控制台注入脚本端点 |

---

*版权所有 © 2026 广州市政务政策法规与办事导办 AI 智能系统研发团队。遵循 Apache License 2.0 开源协议。*