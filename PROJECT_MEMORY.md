# 项目记忆

这个文件用于记录本项目的长期协作约定。后续如果有新的通用要求，可以继续追加到这里。

## 通用要求

- 每次调整系统功能、页面、接口、数据字段、流程或交互时，需要同步检查并更新测试用例。
- 测试用例以 `outputs/system-test-cases/点巡检系统测试用例.xlsx` 为当前主文件；如只需要说明性补充，可同步更新同目录下的说明文档。
- 测试用例应按实际部署方式描述，即测试人员从百数云菜单进入外链页面执行测试，不把后端启动、`server.js` 路由或手工访问 `/api` 作为普通测试主流程。
- 客户演示流程图以 `outputs/system-flow/点巡检系统流程图.md` 为可维护主文件，`outputs/system-flow/点巡检系统流程图_演示版.html` 为浏览器演示版；全模块一张图以 `outputs/system-flow/点巡检系统全模块总流程图.md` 为主文件，`outputs/system-flow/点巡检系统全模块总流程图_演示版.html` 为浏览器演示版。静态客户交付图只保留 `outputs/system-flow/static/inspection-system-full-flow.pdf`。后续业务流程调整时需要同步更新流程图。
- 每次修改前端页面、相关静态资源、后端代码或后端配置后，默认需要同步更新服务器文件。服务器为 `root@117.68.85.39`，SSH/SCP 端口 `22678`，本项目专用目录为 `/root/yuemei/`，不要影响其他项目目录。
- 同步方式通常为：在本地项目目录 `/Users/yg/Desktop/项目文件/点巡检` 执行 `scp -P 22678 <文件名> root@117.68.85.39:/root/yuemei/`。如果是后端文件，应同步到 `/root/yuemei/backend/` 对应路径。不要把服务器密码写入文档或代码。
- 如果当前环境没有可用 SSH key/免密登录，不要让用户在后台命令里输入服务器密码；应让用户在自己可见的本机终端执行同步命令，或等免密登录可用后再由 Codex 同步并验证。
- 后端有变更时，只同步文件还不够；需要同步后重启/刷新后端 Node 服务，再验证 `https://www.mjmas.cn/api/health`、受影响接口和受影响页面。当前后端监听 `3001`，入口为 `/root/yuemei/backend/src/server.js`，由 Nginx 代理到公网域名；重启前应先确认当前运行方式和进程，避免误伤其他项目。
- 同步后需要用线上地址确认关键内容已生效。当前页面外链以本文“服务器外链清单”为准。
- 后续如果新增、删除、重命名页面，或调整 Nginx/Express 路由、服务器文件映射、百数云菜单外链，需要同步更新本文“服务器外链清单”，并重新用公网地址确认可访问。

## 业务口径

- 点检业务主线为：先在“点检规则配置”中配置并启用日检/周检/月检等规则，再在“点检标准”中选择对应的执行规则；标准绑定设备/危化品后，系统按所选规则生成点检任务。
- “点检标准”页面中的“执行规则”下拉来自已配置的点检规则；如果标准未配置执行规则，或选择的规则不存在/未启用，则不会生成点检任务。
- “点检标准”明细默认全部参与报工，页面不再提供“是否报工”选项，保存明细时底表是否报工/启用字段固定写入“启用”。点检部位、点检项目名称、执行方式、标准内容等影响报工提交的字段需要有必填标识并在保存时校验；执行方式为“抄表”时，参数单位和判断标准必填，判断标准支持闭区间和单边条件（如 `48-80`、`>10`、`>=10`、`<5`、`<=5`）。保存校验提示应在页面顶部醒目显示，不放右下角。
- 设备台账列表在设备较多时必须分页展示，默认每页 20 台；分页条位于设备表格和“使用标准”区域之间，不能让大量设备行挤压或遮挡“使用标准”区域。分页后表头全选只作用于当前页设备，导出/批量打印仍使用当前筛选结果或已勾选设备。
- 设备台账从百数云设备底表同步时必须拉取全量：先查 `data_count`，再按 `/data` 接口 `limit=300`、`skip=0/300/600...` 分页汇总，不能只取首批 300 条或尝试把 `limit` 调大。
- 危化品台账列表在危化品较多时必须分页展示，默认每页 20 条；搜索、状态筛选、地点树切换后回到第一页，导出仍使用当前筛选结果全量导出。
- 安全检查 H5 提交主表支持现场照片 `_widget_1776820784422` 和多行签名子表 `_widget_1779262802768`（手写签名 `_widget_1779262802794`、签名时间 `_widget_1779262802797`）。现场照片和签名文件应通过安全检查提交主表 `d44c450e8b584712ca6fb6e1/upload_file` 上传后回填，不要误传到隐患表；异常项照片仍按明细/隐患逻辑处理。
- 安全检查 H5 异常项在“整改要求”下方填写处理情况，并写入安全检查提交明细底表 `_widget_1780483037794`。处理情况默认为“待处理”；“待处理”异常沿用原整改流程并生成待整改工单；“已处理”异常仍生成隐患工单留痕，但工单状态直接为“已关闭”并写关闭时间，不再产生待整改任务。若同一次检查的异常项全部为已处理，安全检查任务状态应闭环为“已完成”；只要存在待处理异常，任务仍为“异常待整改”。
- 安全检查记录页支持详情、打印/导出检查表，模板数据来自提交主表、提交明细和原检查模板；记录详情需要体现现场签字、异常说明、整改要求/措施、处理情况和异常照片，异常照片应以缩略图显示而不是仅显示链接。打印/导出中“检查人员”取主表签名子表 `_widget_1779262802768` 的手写签名字段 `_widget_1779262802794`，多个签名以 `、` 分隔，不取主表检查人/提交人；签名图片尺寸要受控，不能撑高签字栏，底部检查人员和检查日期两侧横线需要等高对齐。右侧“如不符合”列只填写异常项存在的问题和整改措施，正常项为空，不展示现场照片和签字时间。明细打印模板顶部保留检查日期和检查人员签字，不显示单位名称，底部不再重复检查人员和检查日期。检查日期取提交结束日期；该能力只放在安全检查记录页，不影响模板、任务和移动端提交页面。
- 安全检查记录页列表操作采用顶部菜单栏，打印/导出支持勾选多条记录批量处理；行内只保留详情操作。列表数据需要垂直居中，结果、异常数、状态、操作等短字段居中显示。记录页不显示右上角刷新按钮，也不显示底部“准备就绪”状态栏。
- 安全检查记录页列表需要分页展示，默认每页 10 条；支持切换 10/20/50 条每页。提交编号、模板、结果等筛选变化后回到第 1 页；表头全选只作用于当前页，跨页已勾选记录在当前筛选结果内保留，批量打印/导出按已勾选记录处理。
- 安全检查 H5 上传到百数云的现场照片、异常照片和签名图，上传前必须先生成服务器本地临时图片，并通过 `/api/safety-check/file/:directory/:fileName` 这类后端代理地址提供给百数云抓取；不要直接给百数云抓取 `/__safety-check-photos/...` 等静态路径，避免 Nginx 返回 HTML 导致底表附件 mime 变成 `text/html`、打印/详情破图。
- 相关方入场培训填报主表支持是否危险作业 `_widget_1780365156595` 与危险作业附件上传 `_widget_1780365156616`；选择“是”时危险作业附件标题显示红色必填标记且必须上传附件，选择“否”时不强制。危险作业附件通过后端 `/api/partner-training/file-upload` 代理到培训记录底表 `c40d44a99118a61bd17f9325/upload_file` 后回填主表附件字段。
- 相关方入场培训管理页只承载培训记录查询、维护和打印，不再左侧列表+右侧表格重复展示，也不内嵌二维码生成区；记录详情通过弹窗查看，不放在数据列表下方；记录列表默认每页 10 条分页展示，支持切换 10/20/50 条。二维码下载单独使用 `partner-entry-training-qr.html` / `/h5/partner-training-qr` 页面。培训记录打印模板按《相关方入厂安全告知书》固定条款输出，只从数据带出相关方人员签名（参训人员子表签名图片，不展示姓名，未手写签名人员不展示）、施工单位名称和培训日期。

## 服务器外链清单

以下清单按 2026-05-11 服务器 `/root/yuemei/` 与 Nginx 配置核对；公网域名统一为 `https://www.mjmas.cn`。

| 页面/用途 | 公网外链 | 服务器文件/路由 | 备注 |
| --- | --- | --- | --- |
| 设备台账 | `https://www.mjmas.cn/inspection-index.html` | `/root/yuemei/index.html` | 设备台账不要使用 `/index.html`，该路径当前返回其他项目首页。 |
| 点检报工 | `https://www.mjmas.cn/inspection-report.html` | `/root/yuemei/inspection-report.html` | 用于点检任务报工与扫码报工。 |
| 月度点检报表 | `https://www.mjmas.cn/inspection-monthly-report.html` | `/root/yuemei/inspection-monthly-report.html` | 按设备和年月统计点检明细，支持打印和导出。 |
| 危化品台账 | `https://www.mjmas.cn/hazardous-chemical-ledger.html` | `/root/yuemei/hazardous-chemical-ledger.html` | 危化品台账管理。 |
| 点检标准 | `https://www.mjmas.cn/inspection-standard.html` | `/root/yuemei/inspection-standard.html` | 点检标准管理。 |
| 点检规则配置 | `https://www.mjmas.cn/inspection-rule.html` | `/root/yuemei/inspection-rule.html` | 点检规则配置。 |
| 相关方入场培训管理 | `https://www.mjmas.cn/partner-entry-training.html` | `/root/yuemei/partner-entry-training.html` | 同页别名：`https://www.mjmas.cn/h5/partner-training-admin`。 |
| 相关方入场二维码下载 | `https://www.mjmas.cn/h5/partner-training-qr` | `/root/yuemei/partner-entry-training-qr.html` | 直接 `.html` 公网路径当前会被 Nginx 旧静态文件截走，菜单和页面按钮使用 `/h5/partner-training-qr`。 |
| 相关方入场培训填报 | `https://www.mjmas.cn/partner-entry-training-form.html` | `/root/yuemei/partner-entry-training-form.html` | 同页别名：`https://www.mjmas.cn/h5/partner-training`。 |
| 安全检查模板 | `https://www.mjmas.cn/safety-check-template.html` | `/root/yuemei/safety-check-template.html` | 同页别名：`https://www.mjmas.cn/safety-check`、`https://www.mjmas.cn/safety-check-template`。 |
| 安全检查任务 | `https://www.mjmas.cn/safety-check-task.html` | `/root/yuemei/safety-check-task.html` | 同页别名：`https://www.mjmas.cn/safety-check-task`。 |
| 安全检查记录 | `https://www.mjmas.cn/safety-check-record.html` | `/root/yuemei/safety-check-record.html` | 同页别名：`https://www.mjmas.cn/safety-check-record`。 |
| 安全检查移动端 | `https://www.mjmas.cn/safety-check-mobile.html` | `/root/yuemei/safety-check-mobile.html` | 同页别名：`https://www.mjmas.cn/h5/safety-check`。 |

配套静态资源外链：

| 资源 | 公网外链 | 服务器文件 |
| --- | --- | --- |
| 紧凑日期组件样式 | `https://www.mjmas.cn/compact-date-picker.css` | `/root/yuemei/compact-date-picker.css` |
| 紧凑日期组件脚本 | `https://www.mjmas.cn/compact-date-picker.js` | `/root/yuemei/compact-date-picker.js` |
| 安全检查公共样式 | `https://www.mjmas.cn/safety-check-common.css` | `/root/yuemei/safety-check-common.css` |
| 安全检查公共脚本 | `https://www.mjmas.cn/safety-check-common.js` | `/root/yuemei/safety-check-common.js` |
| 日期组件样式别名 | `https://www.mjmas.cn/h5/compact-date-picker.css` | `/root/yuemei/compact-date-picker.css` |
| 日期组件脚本别名 | `https://www.mjmas.cn/h5/compact-date-picker.js` | `/root/yuemei/compact-date-picker.js` |
