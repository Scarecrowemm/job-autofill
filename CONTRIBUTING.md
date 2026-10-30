# 贡献指南

感谢你愿意参与。这个项目的核心价值来自「适配更多真实站点的字段写法」，所以最需要的贡献是**规则补充**和**站点适配器**。

## 环境准备

```bash
git clone <repo-url>
cd job-application-autofill
pip install pillow          # 仅生成图标需要
python scripts/build.py     # 构建到 dist/
```

改代码后必须重新构建，然后在 `chrome://extensions` 里点扩展卡片上的刷新按钮。

## 目录约定

| 目录 | 放什么 | 不要放什么 |
|---|---|---|
| `src/core/` | 纯逻辑：存储、规则、填充引擎 | DOM 操作（UI 相关除外） |
| `src/ui/` | 面板等界面代码 | 业务规则 |
| `src/` | manifest、sw、options、content 入口 | 具体实现 |
| `dist/` | **构建产物，不要手改** | 任何源码 |
| `scripts/` | 构建、图标生成 | 运行时逻辑 |

## 新增字段规则

这是最常见的贡献。编辑 `src/core/rules.js`，往 `RULES` 数组里加一条：

```js
{ path: "basic.native_place", re: /籍贯|户籍|native\s*place/ }
```

规则要点：

1. **顺序即优先级**，越靠前越优先。新规则要插在语义相近的通用规则**之前**。
   - 反例：`紧急联系人电话` 含 `phone`，如果放在通用手机号规则后面就会被抢走。
2. `re` 会匹配「字段上下文」的小写字符串，尽量写具体。
3. 长文本字段（自我评价、项目描述）加 `area: true`。
4. 匹配到但数据为空时会跳过，不会写空值。

改完请至少手工验证一个真实站点，并在 PR 里说明验证的是哪个网站。

## 新增站点适配器（进阶）

如果某站点用纯启发式匹配效果差（字段名是随机 id、label 在别处），可以在 `src/core/adapters/` 下加一个适配器：

```js
// 约定：返回 { 字段路径: 元素 } 的映射，优先于通用规则
window.JAF_ADAPTERS = window.JAF_ADAPTERS || [];
window.JAF_ADAPTERS.push({
  name: "beisen",
  match: () => /beisen|italent/.test(location.hostname),
  resolve: () => {
    const map = {};
    // 自定义定位逻辑
    return map;
  }
});
```

> 适配器机制目前是 Roadmap 里的 P1，接口可能在实现时调整。

## 提交前自检

- [ ] `python scripts/build.py` 构建通过
- [ ] 在至少一个真实网申页面验证过，没有 JS 报错
- [ ] 没有提交任何**真实个人信息**（身份证、手机号、真实姓名）
- [ ] 没有引入远程代码 / 外部脚本
- [ ] 代码风格尽量与周围一致（缩进 2 空格，中文注释）

## 代码风格

项目使用 Prettier 统一格式：

```bash
npx prettier --write "src/**/*.{js,html,json}"
```

配置见 `.prettierrc`。

## 提交信息

建议使用 Conventional Commits：

```
feat(rules): 支持"户籍所在地"字段
fix(filler): 单选按钮被已有 value 误判为已填写
docs: 补充站点适配器说明
```

## 报告问题

提 issue 时请附上：

1. 目标网站（可脱敏域名）
2. 填不进去的字段：**label 文字 + input 的 name/id + 控件类型**
3. 面板上的提示（哪些字段被列为未识别）

获取字段信息的方法：在该页面按 F12，用元素选择器点一下目标输入框，把 `<input ...>` 那一行贴出来即可。
