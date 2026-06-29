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
  const contentFocus = String(value || '讲衣服').trim();
  return ['讲衣服', '讲搭配', '讲氛围', '讲感悟'].includes(contentFocus) ? contentFocus : '讲衣服';
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
function buildEVAPrompt(formData) {
  const infoList = [];
  if (formData.brand) infoList.push(`品牌：${formData.brand}`);
  if (formData.category) infoList.push(`品类：${formData.category}`);
  if (formData.color) infoList.push(`颜色：${formData.color}`);
  if (formData.material) infoList.push(`材质：${formData.material}`);
  if (formData.price) infoList.push(`价格：${formData.price}`);
  if (formData.scene) infoList.push(`适合场景：${formData.scene}`);
  if (formData.activity) infoList.push(`当前动态/活动：${formData.activity}`);

  const productInfo = infoList.length > 0 ? infoList.join(' | ') : '暂无特定补充信息。';

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
  const contentFocusGuides = {
    讲衣服:
      '【讲衣服】：重点讲款式、版型、面料、颜色、设计亮点、适合人群、适合场景。可以适度讲商品信息，但不能直播叫卖。',
    讲搭配:
      '【讲搭配】：重点讲整套 look 的搭配逻辑，包括上下装关系、鞋包配饰、风格平衡、适合场合。如果图片里能看到配饰，可以结合；不确定的信息不要乱猜。',
    讲氛围:
      '【讲氛围】：重点讲场景、光线、天气、空间、情绪、松弛感和生活方式。不要详细介绍衣服，不要拆解版型材质，只把衣服作为画面和状态的一部分。',
    讲感悟:
      '【讲感悟】：重点讲主理人视角、女性状态、生活态度、审美判断、EVA 的品牌价值观。不要详细介绍衣服，不要拆解版型材质，只把衣服作为画面和状态的一部分。',
  };

  const angles = ['今天的天气', '一个生活瞬间', '一句感悟', '买手心得', '城市生活', '光影', '穿搭体验', '客户故事', '店内日常'];
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];

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
本次随机切入视角：从【${randomAngle}】切入。

【文案核心原则】
不要介绍衣服本身，而是介绍“穿着这件衣服以后，这个人的状态”。
让客户看到一种生活方式，而不是一件商品。
例如：不要说“这件衬衫很好看”，而是写“有些衣服，不是为了让别人注意，而是让自己舒服一点”。

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

/**
 * Generate EVA moments content through Doubao Vision API.
 *
 * @param {Object} params
 */
export async function generateMomentsContent({ apiKey, imageBase64, formData }) {
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
              text: buildEVAPrompt(formData),
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

export async function generateMomentsWithDoubao({ form, imageDataUrl }) {
  const result = await generateMomentsContent({
    apiKey: form.apiKey,
    imageBase64: imageDataUrl,
    formData: form,
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
