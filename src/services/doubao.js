/**
 * src/services/doubao.js
 * Doubao Vision API and EVA Prompt Engine (EPE)
 */

const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MODEL_ID = 'ep-20260624154859-k5tdh';

const copyTypeAlias = {
  朋友圈日常版: '朋友圈日常',
  高级质感版: '高级质感',
  老客私域版: '老客私域',
  新品推荐版: '新品推荐',
  搭配推荐版: '搭配推荐',
  小红书种草版: '小红书风格',
};

function normalizeCopyType(value) {
  const copyType = String(value || '朋友圈日常版').trim();
  return copyTypeAlias[copyType] || copyType || '朋友圈日常';
}

function normalizeContentFocus(value) {
  const contentFocus = String(value || 'AI判断').trim();
  return ['讲衣服', '讲搭配', '讲人物', '讲氛围', '讲生活', 'AI判断'].includes(contentFocus) ? contentFocus : 'AI判断';
}

function normalizeCopyLength(value) {
  const copyLength = String(value || '标准').trim();
  return ['一句话', '短文', '标准', '长文'].includes(copyLength) ? copyLength : '标准';
}

function normalizeApiKey(value) {
  return String(value || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .trim();
}

function assertHeaderSafe(value) {
  if (/[\u0100-\uFFFF]/.test(value)) {
    throw new Error('API Key 包含中文或全角字符，请只粘贴火山方舟 API Key，不要包含中文说明、中文引号或其它文字。');
  }

  if (/[\r\n]/.test(value)) {
    throw new Error('API Key 包含换行符，请只粘贴单行 API Key。');
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.map((tag) => String(tag || '').replace(/^#/, '').trim()).filter(Boolean);
}

/**
 * Core engine: EVA Prompt Engine (EPE) V1.4
 * Design goal: unified brand language, temperament, and values.
 *
 * @param {Object} formData
 * @returns {String}
 */
function buildEVAPrompt(formData, options = {}) {
  const infoList = [];
  if (formData.brand) infoList.push(`品牌：${formData.brand}`);
  if (formData.category) infoList.push(`品类：${formData.category}`);
  if (formData.color) infoList.push(`颜色：${formData.color}`);
  if (formData.material) infoList.push(`材质：${formData.material}`);
  if (formData.price) infoList.push(`价格：${formData.price}`);
  if (formData.scene) infoList.push(`适合场景：${formData.scene}`);
  if (formData.activity) infoList.push(`当前动态/活动：${formData.activity}`);

  const productInfo = infoList.length > 0 ? infoList.join(' | ') : '暂无特定补充信息。';
  const realDetail = String(formData.realDetail || '').trim();

  const styleGuides = {
    朋友圈日常: '【朋友圈日常版】：像老板分享生活。真实、自然、不推销。字里行间流露着松弛感。',
    高级质感: '【高级质感版】：像品牌画册。克制、留白、文字少、画面感极强。',
    老客私域:
      '【老客私域版】：像发给熟客看的微信。有温度。可以轻描淡写地提及“到店试穿”、“留了尺码”、“最近想到你”，但绝不硬性销售。',
    新品推荐: '【新品推荐版】：站在专业买手角度，分析为什么值得买、适合谁、适合什么场景。不要罗列参数，要讲体验。',
    搭配推荐: '【搭配推荐版】：重点写搭配逻辑，提升穿搭灵感。建议这件衣服适合配什么鞋、什么包、出席什么场景。',
    小红书风格: '【小红书种草版】：可以稍微活泼一点，但仍必须保持 EVA STUDIO 品牌调性，绝不变成廉价网红账号。',
  };

  const normalizedStyle = normalizeCopyType(formData.style || formData.copyType);
  const targetStyle = styleGuides[normalizedStyle] || styleGuides['朋友圈日常'] || styleGuides['高级质感'];
  const contentFocus = normalizeContentFocus(formData.contentFocus);
  const copyLength = normalizeCopyLength(formData.copyLength);
  const contentFocusGuides = {
    讲衣服:
      '【讲衣服】：重点讲款式、版型、剪裁、面料、颜色、设计亮点、适合人群、适合场景。可以适度讲商品信息，但不能写生活感，也不能直播叫卖。',
    讲搭配:
      '【讲搭配】：重点讲整套 look 的搭配逻辑，包括上下装关系、鞋、包、配饰、颜色关系、风格平衡、场景搭配。如果图片里能看到配饰，可以结合；不确定的信息不要乱猜。',
    讲人物:
      '【讲人物】：重点描述人物状态、气质、情绪和生活方式。衣服只是辅助，用来衬托人的状态，不要做商品说明书。',
    讲氛围:
      '【讲氛围】：重点描述环境、天气、光影、空间、情绪、松弛感和生活方式。不要详细介绍衣服，不要拆解版型材质，只把衣服作为画面和状态的一部分，甚至可以几乎不讲衣服。',
    讲生活:
      '【讲生活】：像老板分享生活。重点讲生活方式、日常片段、审美选择和人的状态。不要详细介绍衣服，不要拆解版型材质，只把衣服作为画面和状态的一部分。',
    AI判断:
      '【AI判断】：先判断这张图片最适合讲衣服、搭配、人物、氛围还是生活，再选择最自然的表达方向。不要平均用力，必须有清晰主线。',
  };
  const copyLengthGuides = {
    一句话: '【一句话】：只输出一句有后劲的文案，适合高级留白。正文不要超过 35 个中文字。',
    短文: '【短文】：约 80 字，适合快速发朋友圈，2 小段以内。',
    标准: '【标准】：约 200 字，默认长度，表达完整但不啰嗦。',
    长文: '【长文】：约 400 字，适合品牌表达，可以更完整地铺开生活方式、审美判断和场景。',
  };

  const angles = [
    '今天的天气',
    '一个生活瞬间',
    '一句感悟',
    '买手心得',
    '城市生活',
    '光影',
    '穿搭体验',
    '客户故事',
    '店内日常',
    '摄影视角',
    '人物状态',
  ];
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];
  const variationRule = options.variation
    ? `
【换一条要求】
这次是重新生成。请换一个表达角度，不要重复上一版，不要只是替换几个词。
请重新寻找新的切入点，例如天气、光影、生活、买手心得、城市、客户故事、店内日常、摄影视角或人物状态。
上一版内容仅供避重复参考，不要照抄：
${options.previousText || '无'}
`
    : '';

  return `
你是 EVA STUDIO 主理人。
品牌背景：无锡本地十年买手店，中高端女性买手品牌（主营 AVVENN、UOOYAA、SHANGYI BY SHANGYI 等）。
你的客群：25~45岁女性，企业主、白领、自由职业者，老客户占比较高，重视生活品质。
品牌气质：小众、有质感、都市通勤、松弛感、留白、高级但克制。不追求流量表达。

【工作流程】（必须严格执行）
第一步（静默分析）：仔细观察图片，识别商品主体、主色调、穿搭风格、情绪氛围、光线与场景。如果材质等信息无法从图片确定，绝对禁止猜测。
第二步（结合生成）：结合图片分析结果、下方商品信息、品牌调性以及指定的【随机切入视角】，生成文案。
注意：请在后台静默完成第一步，不要输出任何分析过程，只输出最终要求的 JSON。

商品及动态信息：${productInfo}
【真实画面与细节】
${realDetail || '（未填写，请结合图片寻找真实瞬间进行表达）'}

写作要求：
如果存在真实细节，必须优先围绕真实细节展开。不要忽略。
不要只介绍衣服。真实细节优先级高于商品介绍。

本次随机切入视角：从【${randomAngle}】切入。
${variationRule}

【文案核心原则】
必须优先服从“内容重心”。
如果内容重心是“讲衣服”，就具体讲款式、剪裁、面料、颜色和适合场景，但保持克制，不要直播叫卖。
如果内容重心不是“讲衣服”，不要把正文写成商品介绍，要让客户看到一种状态、一种生活方式或一种审美判断。
例如：不要只说“这件衬衫很好看”，而是根据本次内容重心，写出它为什么适合此刻、这个人、这个场景。

【品牌语言库】
鼓励使用的词汇：舒服、松弛、自在、刚刚好、留白、生活、陪伴、光影、城市、慢下来、有分寸、日常、自然、质感、安静、平衡。
避免反复使用（太套路）：高级、设计感、精致、轻奢。

【绝对禁止词汇（永久规则）】
闭眼入、冲、爆款、太绝了、拿捏、姐妹们、买它、狠狠爱了、谁懂啊、YYDS、神仙单品、种草神器、赶紧下单。禁止一切直播间语气、夸张营销、制造焦虑或廉价网红表达。

【本次文案类型】
${targetStyle}

【本次内容重心】
${contentFocusGuides[contentFocus] || contentFocusGuides['讲衣服']}

注意：“内容重心”决定这条朋友圈主要写什么；“文案类型”决定这条朋友圈怎么写。两者必须同时遵守。

【本次文案长度】
${copyLengthGuides[copyLength] || copyLengthGuides['标准']}

【核心权重与视角说明】
如果提供了【真实画面与细节】，它是本次文案的第一优先级。
必须先理解这个真实瞬间，再结合图片和商品信息。
不要只介绍衣服。
不要把正文写成商品说明。
文案主角优先是人、动作、场景和当下的感受，衣服只是自然出现的一部分。
不要进行品牌背景介绍，不要教育客户，只做记录、观察和分享。

【输出格式强制要求】
必须且只能输出一段纯净的 JSON 格式数据。不要有任何多余的解释、代码块标记（如 \`\`\`json ）。保证 JSON.parse() 可直接解析。
数据结构：
{
  "title": "文案标题（一句话提炼，克制有诗意）",
  "text": "朋友圈正文内容（合理分段，有呼吸感，可极少量使用基础 Emoji，切忌花哨）",
  "tags": ["#EVASTUDIO", "#适合你的标签"]
}
  `.trim();
}

function parseContent(content) {
  try {
    const parsedData = JSON.parse(content);
    return {
      title: parsedData.title || '生活瞬间',
      text: parsedData.text || '',
      tags: Array.isArray(parsedData.tags) ? parsedData.tags : [],
      isMock: false,
    };
  } catch (error) {
    return {
      title: '生活瞬间',
      text: content,
      tags: [],
      isMock: false,
    };
  }
}

function buildMockContent() {
  return {
    title: '一杯咖啡的留白时间',
    text:
      '有些衣服，不是为了让别人注意，而是让自己舒服一点。\n\n早秋的微凉里，面料的触感代替了语言，包裹着城市的喧嚣。在这个被填满的周五下午，给自己一点恰到好处的分寸感。☕️',
    tags: ['#EVASTUDIO', '#城市通勤', '#松弛感'],
    isMock: true,
  };
}

function parseImageInsights(content) {
  try {
    const parsedData = JSON.parse(content);
    return {
      brand: parsedData.brand || '',
      category: parsedData.category || '',
      color: parsedData.color || '',
      material: parsedData.material || '',
      style: parsedData.style || '',
      person: parsedData.person || '',
      scene: parsedData.scene || '',
      mood: parsedData.mood || '',
      stylingPoint: parsedData.stylingPoint || '',
    };
  } catch (error) {
    return {
      brand: '',
      category: '',
      color: '',
      material: '',
      style: '',
      person: '',
      scene: '',
      mood: '',
      stylingPoint: '',
    };
  }
}

export async function analyzeProductImage({ apiKey, imageBase64 }) {
  const normalizedApiKey = normalizeApiKey(apiKey);
  const trimmedModelId = MODEL_ID.trim();

  if (!normalizedApiKey || normalizedApiKey === 'mock') {
    return {};
  }

  if (!imageBase64) {
    throw new Error('请先上传一张图片。');
  }

  assertHeaderSafe(normalizedApiKey);

  const requestBody = {
    model: trimmedModelId,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `请识别这张图片中适合 EVA STUDIO 朋友圈创作的信息。
只输出纯 JSON，不要解释，不要代码块。
无法确定的信息用空字符串。
结构：
{
  "brand": "",
  "category": "",
  "color": "",
  "material": "",
  "style": "",
  "person": "",
  "scene": "",
  "mood": "",
  "stylingPoint": ""
}`,
          },
          {
            type: 'image_url',
            image_url: { url: imageBase64 },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 500,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${normalizedApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`图片识别失败: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    return {};
  }

  return parseImageInsights(content);
}

/**
 * Generate EVA moments content through Doubao Vision API.
 *
 * @param {Object} params
 */
export async function generateMomentsContent({ apiKey, imageBase64, formData, variation = false, previousText = '' }) {
  const normalizedApiKey = normalizeApiKey(apiKey);
  const trimmedModelId = MODEL_ID.trim();

  if (!normalizedApiKey || normalizedApiKey === 'mock') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(buildMockContent());
      }, 1000);
    });
  }

  if (!trimmedModelId) {
    throw new Error('请输入 Model ID');
  }

  if (!imageBase64) {
    throw new Error('请先上传一张图片。');
  }

  assertHeaderSafe(normalizedApiKey);

  try {
    const requestBody = {
      model: trimmedModelId,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: buildEVAPrompt(formData, { variation, previousText }),
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API 请求失败: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('接口返回成功，但没有生成文案内容。');
    }

    return parseContent(content);
  } catch (error) {
    console.error('豆包接口调用异常:', error);
    throw error;
  }
}

export async function generateMomentsWithDoubao({ form, imageDataUrl, variation = false, previousText = '' }) {
  const result = await generateMomentsContent({
    apiKey: form.apiKey,
    imageBase64: imageDataUrl,
    formData: form,
    variation,
    previousText,
  });

  return {
    status: result.isMock ? 'mock' : 'live',
    title: result.title || '生活瞬间',
    body: result.text || '',
    tags: normalizeTags(result.tags),
    raw: result,
  };
}

export function generateMomentsMock(data) {
  const result = buildMockContent(data);

  return {
    status: 'mock',
    title: result.title,
    body: result.text,
    tags: normalizeTags(result.tags),
  };
}
