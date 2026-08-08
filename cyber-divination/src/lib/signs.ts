// 每日一签：按本机时间、时区、粗略地点与本地签筒盐确定性取签。

import type { DailySign } from "./types";

// 签库：每签包含签诗/解释/宜忌/幸运信息。序号文案沿用六十签格式，签库可继续扩充。
const SIGNS: Omit<DailySign, "id" | "number">[] = [
  { level: "上上", title: "云开月明", poem: ["云开见月明", "静待风自清"], meaning: "今日运势平稳向好，此前困扰之事渐有转机。宜沉心做事，不宜急于求成。", yi: ["签约", "出行", "学习"], ji: ["冲动决策", "与人争执"], luckyColor: "玄青 #2c3e50", luckyDirection: "东方", luckyNumber: 7, advice: "沉住气，把眼前的事一件件做完，自然会有结果。", avoid: "别在情绪上头时做决定，也不要在深夜刷手机到天亮。", smallThing: "给一位久未联系的朋友发条问候消息。" },
  { level: "上吉", title: "柳暗花明", poem: ["山重水复疑无路", "柳暗花明又一村"], meaning: "看似困顿的局面将迎来转机，今日适合主动出击，不必过度担忧。", yi: ["拜访", "求财", "沟通"], ji: ["半途而废", "轻信他人"], luckyColor: "鎏金 #c9a227", luckyDirection: "西南方", luckyNumber: 3, advice: "主动一点，机会往往藏在多问一句里。", avoid: "别把别人的评价看得太重，专注自己的节奏。", smallThing: "整理一下桌面或房间，清理长期不用的东西。" },
  { level: "中吉", title: "循序渐进", poem: ["欲速则不达", "步步自安然"], meaning: "今日宜稳扎稳打，不宜冒进。积累与耐心将带来回报。", yi: ["复盘", "整理", "养生"], ji: ["投机", "熬夜"], luckyColor: "黛绿 #4a6b5a", luckyDirection: "北方", luckyNumber: 5, advice: "把大目标拆成小步骤，今天先完成最小的一步。", avoid: "别幻想一夜暴富，也别跟别人比速度。", smallThing: "喝一杯温水，做几个深呼吸，照顾好自己的身体。" },
  { level: "中平", title: "静观其变", poem: ["风来疏竹", "风过竹不留"], meaning: "今日以静制动为佳，避免因外界噪音而乱了自己节奏。", yi: ["独处", "阅读", "冥想"], ji: ["争执", "冲动消费"], luckyColor: "凝灰 #5a5a66", luckyDirection: "东南方", luckyNumber: 2, advice: "今天适合把注意力收回来，少看少说多思考。", avoid: "别被一句气话带偏，也别下单买不需要的东西。", smallThing: "写下今天最想感谢的三件小事。" },
  { level: "上吉", title: "贵人相助", poem: ["他日若遂凌云志", "敢笑黄巢不丈夫"], meaning: "今日易得贵人提携，适合主动求助与建立联结。", yi: ["社交", "请教", "合作"], ji: ["骄傲自满", "独断专行"], luckyColor: "暖橙 #d4873a", luckyDirection: "南方", luckyNumber: 9, advice: "该开口时别犹豫，真诚的求助本身就是一种能力。", avoid: "别把功劳全揽在自己身上，也别忘了感谢。", smallThing: "主动向一位前辈请教一个问题。" },
  { level: "中吉", title: "厚积薄发", poem: ["十年磨一剑", "霜刃未曾试"], meaning: "今日能量在积累，成果未必立刻显现，但方向正确。", yi: ["学习", "练习", "规划"], ji: ["急于求成", "心态失衡"], luckyColor: "靛蓝 #3b5b8a", luckyDirection: "西北方", luckyNumber: 8, advice: "把今天当作长期主义的一砖，踏实做就有分量。", avoid: "别因为没有即时反馈就怀疑自己的方向。", smallThing: "把最近学到的东西用自己的话复述一遍。" },
  { level: "下下", title: "守正待时", poem: ["行到水穷处", "坐看云起时"], meaning: "今日运势偏弱，宜保守行事，不宜冒险决策。低谷亦是蓄力。", yi: ["休整", "复盘", "储蓄"], ji: ["投资", "跳槽", "大额支出"], luckyColor: "苍灰 #6b6b76", luckyDirection: "西方", luckyNumber: 1, advice: "今天不求打胜仗，只求不伤元气，守住底线就是赢。", avoid: "别在状态差的时候做重大决定，也别硬扛着不休息。", smallThing: "给自己留一段完全不被打扰的独处时间。" },
  { level: "上吉", title: "拨云见日", poem: ["守得云开见月明", "静待花开终有时"], meaning: "今日运势回升，此前停滞之事有望破局，宜主动推进。", yi: ["谈判", "表白", "启动"], ji: ["犹豫不决", "过度承诺"], luckyColor: "杏黄 #e0b84a", luckyDirection: "北方", luckyNumber: 6, advice: "把今天想推进的事列出来，挑最重要的一件先做。", avoid: "别同时开太多头，专注才能破局。", smallThing: "把拖延已久的一件事做出第一个动作。" },
  { level: "中吉", title: "心诚则灵", poem: ["精诚所至", "金石为开"], meaning: "今日真诚是最大的武器，以诚待人将收获信任与回应。", yi: ["表达", "道歉", "和解"], ji: ["欺骗", "敷衍"], luckyColor: "朱砂 #d4a574", luckyDirection: "南方", luckyNumber: 4, advice: "想说什么就真诚地说，别绕弯子，也别藏着掖着。", avoid: "别用敷衍应付真心，也别让误会过夜。", smallThing: "向关心你的人表达一次真实的感谢。" },
  { level: "中平", title: "顺其自然", poem: ["宠辱不惊", "看庭前花开花落"], meaning: "今日宜放平心态，不强求结果，反而容易收获惊喜。", yi: ["散步", "放空", "艺术"], ji: ["较劲", "攀比"], luckyColor: "藕荷 #9a7a9a", luckyDirection: "东北方", luckyNumber: 11, advice: "把期待值放低一点，把感受放重一点。", avoid: "别跟别人较劲，也别跟自己过不去。", smallThing: "出门走一走，看一眼天空或路边的树。" },
  { level: "上上", title: "五福临门", poem: ["福无双至今日至", "祸不单行昨日行"], meaning: "今日运势极佳，诸事顺遂，宜把握机会大胆行动。", yi: ["签约", "求婚", "出行"], ji: ["得意忘形", "贪得无厌"], luckyColor: "正红 #c0392b", luckyDirection: "东南方", luckyNumber: 12, advice: "今天的好运要用行动接住，别光在心里高兴。", avoid: "别因为顺遂就贪多，见好就收是智慧。", smallThing: "把一件对自己重要的事在今天真正启动。" },
  { level: "中吉", title: "破茧成蝶", poem: ["不经一番寒彻骨", "怎得梅花扑鼻香"], meaning: "今日适合突破舒适区，改变虽带阵痛，但值得。", yi: ["尝试", "学习", "改变"], ji: ["因循守旧", "畏首畏尾"], luckyColor: "黛青 #3e5b6b", luckyDirection: "东方", luckyNumber: 10, advice: "今天迈出那一步，改变往往从别扭开始。", avoid: "别让恐惧替你做决定，也别回头。", smallThing: "做一件平时不敢做的小尝试。" },
  { level: "中平", title: "随遇而安", poem: ["此心安处", "便是吾乡"], meaning: "今日宜安顿内心，不为外物所扰，平和即是福气。", yi: ["读书", "内省", "居家"], ji: ["奔波", "焦虑"], luckyColor: "暖白 #e8e6e0", luckyDirection: "西方", luckyNumber: 14, advice: "把心放回当下，今天不需要证明什么。", avoid: "别为还没发生的事焦虑，也别过度规划。", smallThing: "给身心做个简单的放松，比如泡个脚或拉伸。" },
  { level: "上吉", title: "乘风破浪", poem: ["长风破浪会有时", "直挂云帆济沧海"], meaning: "今日行动力强，适合推进大计划，宜乘势而上。", yi: ["创业", "出差", "考试"], ji: ["畏难", "半途而废"], luckyColor: "海蓝 #3a6ea5", luckyDirection: "东南方", luckyNumber: 15, advice: "今天气势正好，把最想做成的事往前推一大步。", avoid: "别因为路远就停下，行百里者半九十。", smallThing: "把目标写下来，贴在自己看得见的地方。" },
  { level: "中吉", title: "和而不同", poem: ["和光同尘", "与时舒卷"], meaning: "今日人际关系融洽，宜求同存异，合作共赢。", yi: ["团队", "倾听", "协作"], ji: ["固执己见", "言语伤人"], luckyColor: "竹青 #7a9a6a", luckyDirection: "南方", luckyNumber: 16, advice: "先听对方把话说完，再表达自己的立场。", avoid: "别为了赢而吵，也别把分歧变成对抗。", smallThing: "记住一位同事或朋友最近提到的小事。" },
  { level: "下下", title: "潜龙勿用", poem: ["潜龙勿用", "待时而动"], meaning: "今日宜低调蓄力，不宜出风头或争强，静待时机。", yi: ["独处", "提升", "储蓄"], ji: ["张扬", "争辩", "投资"], luckyColor: "玄灰 #3a3a44", luckyDirection: "北方", luckyNumber: 18, advice: "今天最好的策略是低调，把力气用在刀刃上。", avoid: "别在气头上争吵，也别逞强做超出能力的事。", smallThing: "给自己充个电，学一点新东西。" },
  { level: "上吉", title: "喜从天降", poem: ["踏破铁鞋无觅处", "得来全不费工夫"], meaning: "今日有意外之喜，久寻不得之物或答案可能不期而至。", yi: ["等待", "发现", "收礼"], ji: ["强求", "患得患失"], luckyColor: "桃红 #d46a7a", luckyDirection: "西南方", luckyNumber: 19, advice: "保持好奇和开放，惊喜往往出现在放松的时候。", avoid: "别刻意去找，越放松越容易遇到。", smallThing: "留意身边的小确幸，并记下来。" },
  { level: "中平", title: "厚德载物", poem: ["地势坤", "君子以厚德载物"], meaning: "今日宜以包容与稳重立身，善待他人即是善待自己。", yi: ["助人", "感恩", "整理"], ji: ["刻薄", "计较"], luckyColor: "大地棕 #7a5a3a", luckyDirection: "西南方", luckyNumber: 20, advice: "多给一点善意，世界会以意想不到的方式回馈你。", avoid: "别对小错斤斤计较，也别苛责他人。", smallThing: "帮一个陌生人或同事一个小忙。" },
  { level: "中吉", title: "水滴石穿", poem: ["锲而不舍", "金石可镂"], meaning: "今日宜坚持，重复与专注终将带来突破。", yi: ["练习", "坚持", "复盘"], ji: ["三分钟热度", "放弃"], luckyColor: "墨蓝 #2c3e6b", luckyDirection: "东方", luckyNumber: 21, advice: "今天不需要超常发挥，只需要不中断。", avoid: "别因为今天平淡就松懈，坚持最贵。", smallThing: "把坚持最久的一件事连起来，至少七天。" },
  { level: "上上", title: "鸿运当头", poem: ["紫气东来", "瑞气盈门"], meaning: "今日运势大旺，宜主动出击，把握良机，大事可成。", yi: ["开张", "升迁", "表白"], ji: ["守成", "退缩"], luckyColor: "鎏金 #e8c96a", luckyDirection: "东方", luckyNumber: 23, advice: "今天的势头难得，别再犹豫，把最重要的决定做了。", avoid: "别因为谨慎错过机会，时机稍纵即逝。", smallThing: "把最想做的事在今天更近一步。" },
  { level: "中平", title: "安之若素", poem: ["不以物喜", "不以己悲"], meaning: "今日宜保持平常心，得失看淡，内心自得安宁。", yi: ["静心", "整理", "散步"], ji: ["大喜大悲", "患得患失"], luckyColor: "月白 #d8d8e0", luckyDirection: "西北方", luckyNumber: 24, advice: "把今天过成平常的一天，反而最安稳。", avoid: "别让情绪大起大落，也别过分期待。", smallThing: "做一顿简单的饭，或认真吃一顿。" },
  { level: "上吉", title: "否极泰来", poem: ["山穷水尽处", "风帆正起时"], meaning: "今日是转机之日，低谷已过，运势开始回升。", yi: ["重启", "道歉", "计划"], ji: ["沉溺过去", "自怨自艾"], luckyColor: "青碧 #52a57a", luckyDirection: "南方", luckyNumber: 25, advice: "把过去翻篇，今天开始都来得及。", avoid: "别沉浸在过去的不顺里，也别自我否定。", smallThing: "重新规划一件曾经放弃的事。" },
  { level: "中吉", title: "众志成城", poem: ["二人同心", "其利断金"], meaning: "今日宜合作，团队与伙伴的力量将放大你的能力。", yi: ["团队", "结盟", "求助"], ji: ["单打独斗", "猜疑"], luckyColor: "群青 #4a5a9a", luckyDirection: "东南方", luckyNumber: 26, advice: "别一个人扛，学会借力是智慧。", avoid: "别把团队功劳据为己有，也别无端猜疑。", smallThing: "主动提出一次协作，或给人搭把手。" },
  { level: "下下", title: "风浪渐起", poem: ["风起于青萍之末", "浪成于微澜之间"], meaning: "今日需留意小隐患，防微杜渐，不宜冒进决策。", yi: ["检查", "储蓄", "修养"], ji: ["扩张", "冒险", "口舌"], luckyColor: "烟灰 #4a4a54", luckyDirection: "西方", luckyNumber: 27, advice: "今天把细节检查到位，别让小问题变大。", avoid: "别无视小苗头，也别把话说到绝处。", smallThing: "检查一遍最近容易忽略的细节。" },
  { level: "上吉", title: "天作之合", poem: ["在天愿作比翼鸟", "在地愿为连理枝"], meaning: "今日情感与人缘俱佳，宜珍惜眼前人，宜表达心意。", yi: ["约会", "表白", "团聚"], ji: ["冷落", "敷衍"], luckyColor: "玫瑰红 #c96a7a", luckyDirection: "南方", luckyNumber: 28, advice: "把爱意说出口，别让重要的人等你太久。", avoid: "别因为忙而忽略身边人，也别把话憋在心里。", smallThing: "给亲近的人一个具体的夸奖。" },
  { level: "中平", title: "宠辱不惊", poem: ["去留无意", "看天上云卷云舒"], meaning: "今日宜淡泊，无论顺逆，保持内心从容即是上策。", yi: ["冥想", "读书", "独处"], ji: ["计较", "攀比"], luckyColor: "淡金 #c9b27a", luckyDirection: "北方", luckyNumber: 29, advice: "把注意力放回自己身上，别被外界牵着走。", avoid: "别为别人的看法改变步伐，也别过度自省。", smallThing: "放下手机，享受一段安静的时光。" },
  { level: "中吉", title: "一鸣惊人", poem: ["不飞则已", "一飞冲天"], meaning: "今日不宜张扬，但一旦出手便要干脆利落，可一战成名。", yi: ["提案", "展示", "考试"], ji: ["高调", "拖沓"], luckyColor: "亮金 #eed27a", luckyDirection: "东南方", luckyNumber: 30, advice: "平时沉住气，关键时刻出手要快、准、稳。", avoid: "别急躁冒进，也别一直藏而不练。", smallThing: "准备一个能展示自己的小作品或方案。" },
  { level: "上上", title: "福至心灵", poem: ["心之所向", "素履以往"], meaning: "今日直觉敏锐，跟随内心指引，常有神来之笔。", yi: ["创意", "决策", "灵感"], ji: ["违背本心", "犹豫"], luckyColor: "青金 #3a6a8a", luckyDirection: "东方", luckyNumber: 31, advice: "相信你的第一直觉，它往往是对的。", avoid: "别用太多理性权衡，反而错过最佳答案。", smallThing: "把灵感随手记下来，别让它溜走。" },
];

// 签序号（第 1 签 … 第 60 签），用于签库扩充时保持显示格式稳定。
const NUMBERS = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
  "卅一", "卅二", "卅三", "卅四", "卅五", "卅六", "卅七", "卅八", "卅九", "四十",
  "四一", "四二", "四三", "四四", "四五", "四六", "四七", "四八", "四九", "五十",
  "五一", "五二", "五三", "五四", "五五", "五六", "五七", "五八", "五九", "六十",
];

function signByIndex(index: number): DailySign {
  const idx = ((index % SIGNS.length) + SIGNS.length) % SIGNS.length;
  return { ...SIGNS[idx], id: idx, number: `第 ${NUMBERS[idx]} 签` };
}

function hashSeed(seedText: string): number {
  let seed = 7;
  for (let i = 0; i < seedText.length; i++) {
    seed = (seed * 131 + seedText.charCodeAt(i)) % 2147483647;
  }
  return seed;
}

/** 按日期确定性取签：保留给不需要地点/设备种子的兜底入口。 */
export function dailySignByDate(dateStr: string): DailySign {
  return signByIndex(hashSeed(dateStr));
}

/** 按完整推算种子取签：用于每日一签页面，避免所有用户同日同签。 */
export function dailySignBySeed(seedText: string): DailySign {
  return signByIndex(hashSeed(seedText));
}

/** 今日签（按本地日期，一天内固定） */
export function todaySign(): DailySign {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dailySignByDate(dateStr);
}

// 首页「每日一签」小卡：用户在每日一签页求签后，把当天签存到 localStorage，
// 首页据此显示「今天已求签」的迷你信息（签号+签名+今日一句），点卡片回看。
const TODAY_SIGN_KEY = "cyber-divination-today-sign";

export function saveTodaySign(sign: DailySign): void {
  try {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    localStorage.setItem(TODAY_SIGN_KEY, JSON.stringify({ dateStr, sign }));
  } catch {
    // 存储禁用时静默，首页不显示
  }
}

/** 今天已求过的签（跨天自动过期）。未求过返回 null。 */
export function getTodaySign(): { dateStr: string; sign: DailySign } | null {
  try {
    const raw = localStorage.getItem(TODAY_SIGN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { dateStr: string; sign: DailySign };
    if (!data || typeof data.dateStr !== "string" || !data.sign) return null;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (data.dateStr !== today) return null; // 跨天过期
    return data;
  } catch {
    return null;
  }
}
