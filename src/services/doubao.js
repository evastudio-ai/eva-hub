export function generateMomentsMock(data) {
  const brand = data.brand || 'EVA STUDIO';
  const category = data.category || '精选好物';
  const color = data.color || '经典配色';
  const material = data.material || '细腻材质';
  const price = data.price || '到店咨询';
  const scene = data.scene || '日常通勤、聚会和送礼';
  const activity = data.activity || '欢迎到店体验';
  const copyType = data.copyType || '朋友圈日常版';

  const copyTypeOpening = {
    朋友圈日常版: '今天店里看到这件，属于不用很用力也能穿出状态的类型。',
    高级质感版: '这件的质感是安静的，不靠夸张设计抢注意力，但细节很经得起看。',
    老客私域版: '给熟悉 EVA STUDIO 风格的朋友留意一下，这件很适合日常衣橱补位。',
    新品推荐版: '新到的一件单品，保留了设计师品牌的轮廓感，也足够适合日常穿着。',
    搭配推荐版: '如果最近想做一套都市通勤感搭配，这件可以作为很稳的视觉重点。',
    小红书种草版: '分享一件最近很喜欢的单品，整体是小众、松弛、但有精致感的方向。',
  };

  return {
    status: 'mock',
    title: `${brand}${category}${copyType}`,
    body: `${copyTypeOpening[copyType] || copyTypeOpening['朋友圈日常版']}

${color}搭配${material}，整体干净、耐看，适合${scene}。价格信息：${price}。

${activity}

喜欢这种小众、有质感、带一点都市松弛感的设计师品牌风格，可以来 EVA STUDIO 现场看看实物。`,
    tags: ['EVA STUDIO', brand, category, copyType].filter(Boolean),
  };
}

const copyTypeGuide = {
  朋友圈日常版: '语气像店主日常分享，亲近、自然、不过度销售，适合朋友圈轻发布。',
  高级质感版: '突出材质、轮廓、色彩和审美克制，语言更安静、更有画面感。',
  老客私域版: '像发给熟悉品牌的老客，强调适合谁、为什么值得试，不要陌生人广告感。',
  新品推荐版: '明确这是新品或新到款，突出新鲜感和到店体验，但不要促销叫卖。',
  搭配推荐版: '重点给出穿搭思路，说明它可以和哪些风格、场景、单品组合。',
  小红书种草版: '保留小红书的分享感和审美描述，但避免网红词和夸张营销。',
};

function buildPrompt(data) {
  const copyType = data.copyType || '朋友圈日常版';

  return `你是 EVA STUDIO 的内容主理人，请先识别上传图片中的商品，再结合用户填写的信息，生成一条可直接发布的中文内容。

任务目标：
为 EVA STUDIO 生成 ${copyType} 的朋友圈文案。

你必须同时参考：
1. 图片内容：识别商品类型、颜色、材质、版型、风格、细节、适合场景。
2. 用户填写的商品字段：如果用户填写了信息，优先使用并融合；如果没有填写，也要尽量根据图片生成。
3. 用户选择的文案类型：${copyType}。
4. EVA STUDIO 品牌调性：小众、时尚、有质感、都市通勤、松弛感、设计师品牌。

用户填写的信息：
品牌：${data.brand || 'EVA STUDIO'}
品类：${data.category || '未填写'}
颜色：${data.color || '未填写'}
材质：${data.material || '未填写'}
价格：${data.price || '未填写'}
适合场景：${data.scene || '都市通勤、日常搭配'}
活动信息：${data.activity || '无'}
文案类型：${copyType}

文案类型写法要求：
${copyTypeGuide[copyType] || copyTypeGuide['朋友圈日常版']}

品牌语言边界：
- 要小众、时尚、有质感、都市通勤、松弛感、设计师品牌。
- 不要直播叫卖感。
- 不要夸张营销词。
- 不要出现“闭眼入”“冲”“爆款”“太绝了”等网红词。
- 不要编造无法从图片或用户字段判断的品牌、材质、价格、折扣。
- 如果图片可见细节较少，用“看起来”“更偏向”这类谨慎表达。

内容差异要求：
不同文案类型必须有明显不同的表达重点和语气。请不要套模板，也不要重复用户字段。

请只按以下结构输出，不要添加额外解释：
标题：一句吸引人的标题
朋友圈正文：适合直接发布，2-4 小段，语气自然、有审美、不夸张
标签：3-6 个中文标签，用 # 开头`;
}

function normalizeTags(tagsText) {
  if (!tagsText) {
    return ['EVA STUDIO', '设计师品牌', '都市通勤'];
  }

  return tagsText
    .split(/[\s,，、]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/^#/, ''))
    .slice(0, 8);
}

function parseMomentsText(content) {
  const text = String(content || '').trim();
  const titleMatch = text.match(/标题[:：]\s*([\s\S]*?)(?=\n\s*(朋友圈正文|正文)[:：]|$)/);
  const bodyMatch = text.match(/(?:朋友圈正文|正文)[:：]\s*([\s\S]*?)(?=\n\s*标签[:：]|$)/);
  const tagsMatch = text.match(/标签[:：]\s*([\s\S]*)$/);

  return {
    status: 'live',
    title: titleMatch?.[1]?.trim() || 'EVA STUDIO 朋友圈文案',
    body: bodyMatch?.[1]?.trim() || text,
    tags: normalizeTags(tagsMatch?.[1]),
    raw: text,
  };
}

async function readErrorMessage(response) {
  const fallback = `请求失败：${response.status} ${response.statusText}`;

  try {
    const data = await response.json();
    return data?.error?.message || data?.message || fallback;
  } catch (error) {
    try {
      const text = await response.text();
      return text || fallback;
    } catch (textError) {
      return fallback;
    }
  }
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

export async function generateMomentsWithDoubao({ form, imageDataUrl }) {
  const apiKey = normalizeApiKey(form.apiKey);
  const modelId = form.modelId?.trim();

  if (!apiKey) {
    throw new Error('请先输入豆包 API Key。');
  }

  if (!modelId) {
    throw new Error('请先输入 Model ID。');
  }

  if (!imageDataUrl) {
    throw new Error('请先上传一张图片。');
  }

  assertHeaderSafe(apiKey);

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
            {
              type: 'text',
              text: buildPrompt(form),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('接口返回成功，但没有生成文案内容。');
  }

  return parseMomentsText(content);
}
