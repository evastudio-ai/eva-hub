export function generateMomentsMock(data) {
  const brand = data.brand || 'EVA STUDIO';
  const category = data.category || '精选好物';
  const color = data.color || '经典配色';
  const material = data.material || '细腻材质';
  const price = data.price || '到店咨询';
  const scene = data.scene || '日常通勤、聚会和送礼';
  const activity = data.activity || '欢迎到店体验';
  const style = data.style || '高级质感';

  const styleOpening = {
    高级质感: '今天这件真的很有氛围感，第一眼就能看出质感在线。',
    轻松日常: '今天店里来了一个很适合日常的小惊喜，越看越喜欢。',
    种草推荐: '想给大家认真种草这件新品，实物比照片还要耐看。',
    温柔治愈: '这件单品有一种很舒服的温柔感，放在身边就让人心情变好。',
  };

  return {
    status: 'mock',
    title: `${brand}${category}朋友圈文案`,
    body: `${styleOpening[style] || styleOpening['高级质感']}

${color}搭配${material}，整体干净、耐看，也很适合${scene}。价格信息：${price}。

${activity}

喜欢这种${style}风格的朋友，可以来 EVA STUDIO 现场看看实物。`,
    tags: ['EVA STUDIO', brand, category, style].filter(Boolean),
  };
}

function buildPrompt(data) {
  return `请基于上传图片和以下商品信息，为 EVA STUDIO 生成一条朋友圈文案。

品牌：${data.brand || 'EVA STUDIO'}
品类：${data.category || '未填写'}
颜色：${data.color || '未填写'}
材质：${data.material || '未填写'}
价格：${data.price || '未填写'}
适合场景：${data.scene || '都市通勤、日常搭配'}
活动信息：${data.activity || '无'}
文案风格：${data.style || '高级质感'}

整体风格关键词：小众、时尚、有质感、都市通勤、松弛感、设计师品牌。

请只按以下结构输出，不要添加额外解释：
标题：一句吸引人的标题
正文：适合朋友圈直接发布的正文，语气自然、有审美、不夸张
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
  const titleMatch = text.match(/标题[:：]\s*([\s\S]*?)(?=\n\s*正文[:：]|$)/);
  const bodyMatch = text.match(/正文[:：]\s*([\s\S]*?)(?=\n\s*标签[:：]|$)/);
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

export async function generateMomentsWithDoubao({ form, imageDataUrl }) {
  const apiKey = form.apiKey?.trim();
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
