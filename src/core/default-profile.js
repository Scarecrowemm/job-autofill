/* ===== 默认简历数据 =====
 * 空模板。首次使用时由用户在选项页填写，数据存在 chrome.storage.local 的 jaf_profile 键下。
 *
 * 注意：本文件必须保持「空模板」状态，不要提交任何真实个人信息。
 * 用户自己的数据请放在选项页里，或使用 .gitignore 中排除的 简历数据*.json。
 * ===== */
const DEFAULT_PROFILE = {
  basic: {
    name: "",
    gender: "",
    birth: "",
    age: "",
    political: "",
    nation: "",
    native_place: "",
    id_card: "",
    marriage: "",
    phone: "",
    email: "",
    wechat: "",
    qq: "",
    address: "",
    postcode: "",
    emergency_name: "",
    emergency_relation: "",
    emergency_phone: ""
  },
  education: {
    school: "",
    school_en: "",
    college: "",
    major: "",
    degree: "",
    edu_level: "",
    start: "",
    end: "",
    gpa: "",
    rank: "",
    cet4: "",
    cet6: "",
    other_cert: "",
    courses: ""
  },
  intent: {
    position: "",
    position_game: "",
    industry: "",
    city: "",
    salary: "",
    available_date: "",
    accept_relocate: "是",
    accept_overtime: "是",
    job_type: "全职"
  },
  work: [
    {
      company: "",
      department: "",
      title: "",
      start: "",
      end: "",
      city: "",
      description: ""
    }
  ],
  projects: [
    {
      name: "",
      role: "",
      start: "",
      end: "",
      tech: "",
      description: ""
    },
    {
      name: "",
      role: "",
      start: "",
      end: "",
      tech: "",
      description: ""
    }
  ],
  skills: {
    programming: "",
    data: "",
    engineering: "",
    ai: "",
    language: ""
  },
  campus: {
    role: "",
    description: ""
  },
  self_eval_short: "",
  self_eval_long: "",
  qa: {
    self_intro: "",
    why_company: "",
    career_plan: "",
    strength: "",
    weakness: "",
    hardest_thing: "",
    why_you: "",
    salary_expect: "",
    available: ""
  }
};
