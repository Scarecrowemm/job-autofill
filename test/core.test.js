/**
 * 单元测试入口（Node）
 *
 * 运行：
 *     node --test test/
 *
 * 说明：本项目没有打包器，src/core/*.js 是共享作用域的普通脚本。
 * 这里用 node:vm 把它们拼进同一个函数作用域后取出内部函数，
 * 这样既不用改造成 ESM，也能对纯逻辑做单测。
 * 具体断言在 test/cases.js，浏览器入口 test/browser-check.html 复用同一份。
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const runCases = require("./cases.js");

const CORE_DIR = path.join(__dirname, "..", "src", "core");
const CORE_FILES = ["config.js", "default-profile.js", "utils.js", "rules.js", "filler.js"];

function loadCore() {
  const code = CORE_FILES.map((f) => fs.readFileSync(path.join(CORE_DIR, f), "utf8")).join("\n");

  const sandbox = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    CSS: { escape: (s) => String(s) },
    localStorage: { getItem: () => null, setItem: () => {} },
    document: undefined,
    window: undefined
  };

  const wrapper = [
    "(function () {",
    '  "use strict";',
    code,
    "  return {",
    "    RULES, DEFAULT_PROFILE,",
    "    pickRule, pickOption, normalizeDateValue,",
    "    isReal, deepMerge, getPath, setPath",
    "  };",
    "})()"
  ].join("\n");

  return vm.runInNewContext(wrapper, sandbox, { filename: "core-bundle.js" });
}

runCases(loadCore(), { test, assert });
