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
