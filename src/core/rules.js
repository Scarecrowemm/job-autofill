/* ===== 字段匹配规则 =====
 * 字段识别规则表。数组顺序即优先级，越靠前越优先。贡献者新增站点适配时主要改这里。
 * ===== */
const RULES = [
    // —— 最优先：带"紧急"前缀的字段，必须先于通用电话/姓名规则，否则会被抢占 ——
    { path: "basic.emergency_phone", re: /紧急联系.{0,8}(电话|手机|号码)|紧急.{0,4}(电话|手机)/ },
    { path: "basic.emergency_name",  re: /紧急联系人(姓名|名字)?|紧急联络人/ },
    { path: "basic.emergency_relation", re: /与本人关系|与联系?人关系/ },

    // —— 强特征：证件/联系方式 ——
    { path: "basic.id_card",      re: /身份证|证件号码|id\s*card|idcard|证件号/ },
    { path: "basic.phone",        re: /手机|移动电话|联系电话|联系方式|phone|mobile|\btel\b/ },
    { path: "basic.email",        re: /邮箱|电子邮件|e-?mail/ },
    { path: "basic.wechat",       re: /微信|wechat/ },
    { path: "basic.qq",           re: /\bqq\b|qq号/ },
    { path: "basic.postcode",     re: /邮编|邮政编码|postcode|zip/ },
    { path: "basic.address",      re: /通讯地址|联系地址|家庭住址|现居住地|详细地址|address/ },
    { path: "basic.native_place", re: /籍贯|户籍|native\s*place/ },
    { path: "basic.marriage",     re: /婚姻|婚否|marital/ },
    { path: "basic.political",    re: /政治面貌|党派|political/ },
    { path: "basic.nation",       re: /民族(?!族)/ },
    { path: "basic.birth",        re: /出生(年月|日期|时间)?|生日|birth/ },
    { path: "basic.age",          re: /^年龄$|年龄/ },
    { path: "basic.gender",       re: /性别|gender|\bsex\b/ },
    { path: "basic.name",         re: /姓\s*名|真实姓名|real\s*name/ },

    // —— 教育 ——
    { path: "education.cet6",     re: /六级|cet\s*-?\s*6/ },
    { path: "education.cet4",     re: /四级|cet\s*-?\s*4/ },
    { path: "education.gpa",      re: /gpa|绩点|平均分|平均成绩/ },
    { path: "education.rank",     re: /专业排名|年级排名|班级排名|^排名$/ },
    { path: "education.school",   re: /毕业院校|毕业学校|院校名称|学校名称|就读院校|school|university/ },
    { path: "education.major",    re: /所学专业|专业名称|^专业$|major/ },
    { path: "education.college",  re: /院系|学院|所在院系|college|department/ },
    { path: "education.degree",   re: /学位(类别|名称)?|degree/ },
    { path: "education.edu_level", re: /学历|最高学历|education/ },
    { path: "education.start",    re: /入学(时间|年月|日期)?|开始时间|起始时间|起始日期/ },
    { path: "education.end",      re: /毕业(时间|年月|日期)|结束时间|截止时间/ },
    { path: "education.courses",  re: /主修课程|主要课程|专业课程|courses/ },

    // —— 求职意向 ——
    { path: "intent.salary",      re: /期望(薪资|月薪|年薪)|薪资要求|薪酬要求|salary/ },
    { path: "intent.city",        re: /期望(工作地|城市)|意向城市|期望地点|工作地点|期望工作地区/ },
    { path: "intent.position",    re: /应聘职位|应聘岗位|求职意向|期望职位|期望岗位|申请职位|目标岗位|position/ },
    { path: "intent.available_date", re: /到岗时间|可到岗|可入职|最快入职/ },

    // —— 经历 ——
    { path: "work.0.company",     re: /公司名称|工作单位|实习单位|单位名称|company/ },
    { path: "work.0.title",       re: /职位名称|担任职位|职务|job\s*title/ },
    { path: "work.0.description", re: /工作内容|工作描述|实习内容|职责描述|主要职责/, area: true },
    { path: "projects.0.name",    re: /项目名称|项目名/ },
    { path: "projects.0.role",    re: /项目角色|担任角色|项目职责/ },
    { path: "projects.0.description", re: /项目描述|项目内容|项目简介|项目经历/, area: true },

    // —— 主观题 / 大段文本 ——
    { path: "self_eval_short",    re: /自我评价|自我鉴定|个人评价|个人优势|self\s*-?\s*evaluation/, area: true },
    { path: "qa.self_intro",      re: /自我介绍|个人简介|个人陈述/, area: true },
    { path: "qa.career_plan",     re: /职业规划|职业发展|职业目标/, area: true },
    { path: "qa.strength",        re: /(你的|个人)?(优点|优势|长处)/, area: true },
    { path: "qa.weakness",        re: /(你的|个人)?(缺点|不足|劣势|短板)/, area: true },
    { path: "qa.hardest_thing",   re: /(最有|最难忘|最具挑战).{0,8}(一件事|挑战|困难|经历)/, area: true },
    { path: "qa.why_company",     re: /为什么(选择|应聘|加入)|对我司|对公司的了解/, area: true },
    { path: "qa.why_you",         re: /为什么(录用|选择)你|你的竞争力/, area: true },
    { path: "skills.programming", re: /(编程语言|掌握的?技术|技能特长|专业技能)/, area: true }
  ];
