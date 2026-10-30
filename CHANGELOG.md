# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [2.0.0] - 2026-10-23

首个开源版本。从个人脚本重构为可维护的工程结构。

### 新增
- **选项页**（`options.html`）：78 个字段的可视化编辑界面，按 10 个分区组织，未填字段高亮提示
- **数据同源**：选项页与内容脚本共用 `chrome.storage.local` 的 `jaf_profile` 键，不再需要导出/导入 JSON
- **Service Worker**：首次安装自动打开选项页；点击工具栏图标唤起面板
- **图标**：16/32/48/128 四尺寸，由脚本生成
- **构建脚本**：`scripts/build.py` 按依赖顺序拼接模块，无需打包器
- **JSON 文件导入**：面板内可直接选择本地 JSON 文件导入数据
- **单元测试**：24 个用例（`test/cases.js`），Node 与浏览器共用同一份断言；CI 已接入
- **隐私守卫**：`scripts/check_no_pii.py` 校验默认模板为空、无硬编码手机号/邮箱/身份证
- **README 截图**：数据填写页与填表面板
- **Issue 模板**：站点适配反馈、功能建议

### 变更
- 代码拆分为 7 个模块（`core/config`、`core/default-profile`、`core/utils`、`core/rules`、`core/filler`、`ui/panel`、`content`）
- 存储层同时兼容 `chrome.storage` / `GM_*` / `localStorage` 三种环境
- `all_frames` 由 `true` 改为 `false`，避免面板在 iframe 内重复渲染（iframe 支持列入 Roadmap）
- **默认数据改为空模板**：仓库不包含任何真实个人信息，用户数据只存在本地
- `filler.js` 抽出纯函数 `pickRule` / `pickOption` / `normalizeDateValue`，便于单测
- `pickRule` 内部统一转小写，`CET-6` 与 `cet-6` 等价

### 修复
- 修复字段上下文采集过度导致**所有输入框都被填成同一个值**的问题（祖先容器文字污染）
- 修复**单选按钮填不进去**：radio 的 `value` 属性天生非空，被「已有值不覆盖」逻辑误拦，改用 `checked` 判断
- 修复**紧急联系人电话被误填成本人手机号**：规则顺序调整，带「紧急」前缀的规则优先于通用电话规则

---

## [1.1.0] - 2026-10-23

### 新增
- 面板内「选择 JSON 文件导入」按钮，替代手动复制粘贴
- 数据状态提示（还缺哪些核心字段）

---

## [1.0.0] - 2026-10-23

### 新增
- 首版：字段语义识别与自动填充
- 页内浮动按钮与操作面板
- 支持文本框、多行文本、下拉框、单选按钮、日期控件
- 填充结果高亮与未识别字段列表
