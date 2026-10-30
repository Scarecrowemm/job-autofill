/**
 * 测试用例（环境无关）
 *
 * 被两处复用：
 *   - test/core.test.js      Node 入口，用 node:vm 加载 core 后执行（CI 用）
 *   - test/browser-check.html 浏览器入口，直接 <script> 加载 core 后执行（本地手测用）
 *
 * 约定：api = { test(name, fn), assert }
 *       assert 需要提供 ok / equal / deepEqual
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.JAF_TEST_CASES = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  return function runCases(core, api) {
    const { test, assert } = api;
    const isRegExp = (v) => Object.prototype.toString.call(v) === "[object RegExp]";

    /* ============================================================
     * 一、pickRule —— 字段识别
     * ============================================================ */
    test("pickRule: 基础字段", () => {
      const cases = [
        ["姓名", "basic.name"],
        ["真实姓名", "basic.name"],
        ["性别", "basic.gender"],
        ["手机号码", "basic.phone"],
        ["电子邮箱", "basic.email"],
        ["身份证号", "basic.id_card"],
        ["政治面貌", "basic.political"],
        ["民族", "basic.nation"],
        ["籍贯", "basic.native_place"],
        ["通讯地址", "basic.address"],
        ["毕业院校", "education.school"],
        ["所学专业", "education.major"],
        ["学历", "education.edu_level"],
        ["毕业时间", "education.end"],
        ["入学时间", "education.start"],
        ["应聘岗位", "intent.position"],
        ["期望工作地点", "intent.city"],
        ["期望薪资", "intent.salary"],
        ["到岗时间", "intent.available_date"]
      ];
      for (const pair of cases) {
        const ctx = pair[0];
        const expected = pair[1];
        const rule = core.pickRule(ctx);
        assert.ok(rule, "「" + ctx + "」应当命中规则");
        assert.equal(rule.path, expected, "「" + ctx + "」应命中 " + expected + "，实际 " + (rule && rule.path));
      }
    });

    test("pickRule: 四六级不能互相串台", () => {
      assert.equal(core.pickRule("英语四级").path, "education.cet4");
      assert.equal(core.pickRule("英语六级").path, "education.cet6");
      assert.equal(core.pickRule("CET-6").path, "education.cet6");
      assert.equal(core.pickRule("CET4").path, "education.cet4");
    });

    test("pickRule: 回归 - 紧急联系人不能被通用手机号规则抢走", () => {
      assert.equal(core.pickRule("紧急联系人电话").path, "basic.emergency_phone");
      assert.equal(core.pickRule("紧急联系电话").path, "basic.emergency_phone");
      assert.equal(core.pickRule("紧急联系人").path, "basic.emergency_name");
      assert.equal(core.pickRule("与本人关系").path, "basic.emergency_relation");
      assert.equal(core.pickRule("手机号码").path, "basic.phone");
    });

    test("pickRule: 未识别的字段返回 null", () => {
      assert.equal(core.pickRule("验证码"), null);
      assert.equal(core.pickRule("随便写点什么"), null);
      assert.equal(core.pickRule(""), null);
      assert.equal(core.pickRule(null), null);
    });

    test("pickRule: 长文本字段标记 area", () => {
      assert.equal(core.pickRule("自我评价").area, true);
      assert.equal(core.pickRule("项目描述").area, true);
      assert.equal(core.pickRule("自我介绍").area, true);
    });

    /* ============================================================
     * 二、pickOption —— 下拉选项匹配
     * ============================================================ */
    test("pickOption: 精确匹配", () => {
      const opts = [
        { text: "请选择", value: "" },
        { text: "大专", value: "1" },
        { text: "本科", value: "2" },
        { text: "硕士", value: "3" }
      ];
      assert.equal(core.pickOption(opts, "本科").value, "2");
      assert.equal(core.pickOption(opts, " 本科 ").value, "2");
    });

    test("pickOption: 选项文字包含目标值", () => {
      const opts = [
        { text: "本科及以上", value: "b" },
        { text: "硕士及以上", value: "m" }
      ];
      assert.equal(core.pickOption(opts, "本科").value, "b");
    });

    test("pickOption: 目标包含选项文字（多选场景）", () => {
      const opts = [
        { text: "广州", value: "gz" },
        { text: "深圳", value: "sz" }
      ];
      assert.equal(core.pickOption(opts, "广州 / 深圳").value, "gz");
    });

    test("pickOption: 不匹配时返回 null", () => {
      const opts = [
        { text: "请选择", value: "" },
        { text: "男", value: "1" }
      ];
      assert.equal(core.pickOption(opts, "本科"), null);
      assert.equal(core.pickOption([], "本科"), null);
      assert.equal(core.pickOption(opts, ""), null);
      assert.equal(core.pickOption(opts, null), null);
    });

    test("pickOption: 空选项文字不会被反向匹配命中", () => {
      const opts = [
        { text: "", value: "" },
        { text: "本科", value: "b" }
      ];
      assert.equal(core.pickOption(opts, "本科").value, "b");
    });

    /* ============================================================
     * 三、normalizeDateValue —— 日期归一化
     * ============================================================ */
    test("normalizeDateValue: month 控件", () => {
      assert.equal(core.normalizeDateValue("2027-06", "month"), "2027-06");
      assert.equal(core.normalizeDateValue("2027/6", "month"), "2027-06");
      assert.equal(core.normalizeDateValue("2027年6月", "month"), "2027-06");
      assert.equal(core.normalizeDateValue("2027", "month"), "2027-01");
      assert.equal(core.normalizeDateValue("2027.12", "month"), "2027-12");
    });

    test("normalizeDateValue: date 控件补全到 1 号", () => {
      assert.equal(core.normalizeDateValue("2027-06", "date"), "2027-06-01");
      assert.equal(core.normalizeDateValue("2027/6", "date"), "2027-06-01");
    });

    test("normalizeDateValue: 非日期控件原样返回", () => {
      assert.equal(core.normalizeDateValue("2027-06", "text"), "2027-06");
      assert.equal(core.normalizeDateValue("立即到岗", "text"), "立即到岗");
    });

    test("normalizeDateValue: 无法解析时原样返回", () => {
      assert.equal(core.normalizeDateValue("abc", "month"), "abc");
      assert.equal(core.normalizeDateValue("", "month"), "");
      assert.equal(core.normalizeDateValue(null, "month"), "");
    });

    /* ============================================================
     * 四、isReal —— 占位符判定
     * ============================================================ */
    test("isReal: 空值与占位符视为未填", () => {
      assert.equal(core.isReal(""), false);
      assert.equal(core.isReal("   "), false);
      assert.equal(core.isReal(null), false);
      assert.equal(core.isReal(undefined), false);
      assert.equal(core.isReal("{{PHONE_1}}"), false);
      assert.equal(core.isReal("{{  EMAIL  }}"), false);
    });

    test("isReal: 正常值视为已填", () => {
      assert.equal(core.isReal("张三"), true);
      assert.equal(core.isReal("0"), true);
      assert.equal(core.isReal(2027), true);
    });

    /* ============================================================
     * 五、deepMerge / getPath / setPath
     * ============================================================ */
    test("deepMerge: 嵌套合并保留未覆盖字段", () => {
      const base = { a: { x: 1, y: 2 }, b: { z: 3 } };
      const out = core.deepMerge(base, { a: { y: 20 } });
      assert.equal(out.a.x, 1);
      assert.equal(out.a.y, 20);
      assert.equal(out.b.z, 3);
      assert.equal(base.a.y, 2);
    });

    test("deepMerge: 数组整体替换", () => {
      const base = { list: [1, 2, 3] };
      const out = core.deepMerge(base, { list: [9] });
      assert.deepEqual(Array.from(out.list), [9]);
    });

    test("getPath / setPath: 支持数组下标", () => {
      const obj = { work: [{ company: "A" }] };
      assert.equal(core.getPath(obj, "work.0.company"), "A");

      const target = {};
      core.setPath(target, "work.0.company", "B");
      assert.equal(target.work[0].company, "B");

      core.setPath(target, "basic.name", "张三");
      assert.equal(target.basic.name, "张三");
    });

    test("getPath: 路径不存在时返回 undefined", () => {
      assert.equal(core.getPath({}, "a.b.c"), undefined);
      assert.equal(core.getPath({ a: null }, "a.b"), undefined);
    });

    /* ============================================================
     * 六、规则表与默认数据的完整性
     * ============================================================ */
    test("RULES: 每条规则都有 path 和正则", () => {
      assert.ok(core.RULES.length > 30, "规则数量应当足够覆盖常见字段");
      for (const r of core.RULES) {
        assert.equal(typeof r.path, "string", "规则缺少 path");
        assert.ok(r.path.length > 0, "path 不能为空");
        assert.ok(isRegExp(r.re), r.path + " 的 re 不是正则");
      }
    });

    test("RULES: 带「紧急」的规则必须排在通用电话/姓名规则之前", () => {
      const idx = (p) => {
        for (let i = 0; i < core.RULES.length; i++) if (core.RULES[i].path === p) return i;
        return -1;
      };
      assert.ok(idx("basic.emergency_phone") >= 0, "缺少 emergency_phone 规则");
      assert.ok(
        idx("basic.emergency_phone") < idx("basic.phone"),
        "emergency_phone 必须在 phone 之前，否则会被抢走"
      );
      assert.ok(idx("basic.emergency_name") < idx("basic.name"), "emergency_name 必须在 name 之前");
    });

    test("DEFAULT_PROFILE: 结构完整", () => {
      const p = core.DEFAULT_PROFILE;
      const keys = ["basic", "education", "intent", "skills", "campus", "qa"];
      for (const key of keys) {
        assert.ok(p[key] && typeof p[key] === "object", "缺少 " + key);
      }
      assert.ok(Array.isArray(p.work) && p.work.length >= 1, "work 至少要有 1 条模板");
      assert.ok(Array.isArray(p.projects) && p.projects.length >= 1, "projects 至少要有 1 条模板");
      assert.equal(typeof p.self_eval_short, "string");
    });

    test("DEFAULT_PROFILE: 必须是空模板（隐私守卫）", () => {
      const ALLOWED = { 是: 1, 否: 1, 全职: 1, 实习: 1, 兼职: 1 };
      const walk = (obj, trail) => {
        for (const k of Object.keys(obj)) {
          const v = obj[k];
          const where = trail ? trail + "." + k : k;
          if (typeof v === "string") {
            assert.ok(v === "" || ALLOWED[v], where + " 不应有非空内容: " + JSON.stringify(v));
          } else if (v && typeof v === "object") {
            walk(v, where);
          }
        }
      };
      walk(core.DEFAULT_PROFILE, "");
    });
  };
});
