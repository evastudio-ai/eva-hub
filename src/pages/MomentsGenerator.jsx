import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeProductImage, generateMomentsMock, generateMomentsWithDoubao } from '../services/doubao.js';

const initialForm = {
  brand: '',
  category: '',
  color: '',
  material: '',
  price: '',
  scene: '',
  activity: '',
  realDetail: '',
  copyType: '朋友圈日常版',
  contentFocus: 'AI判断',
  copyLength: '标准',
  apiKey: '',
};

const API_KEY_STORAGE_KEY = 'eva-hub-doubao-api-key';

const copyTypes = [
  '朋友圈日常版',
  '高级质感版',
  '老客私域版',
  '新品推荐版',
  '搭配推荐版',
  '小红书种草版',
];

const contentFocusOptions = ['讲衣服', '讲搭配', '讲人物', '讲氛围', '讲生活', 'AI判断'];
const copyLengthOptions = ['一句话', '短文', '标准', '长文'];
const adjustmentOptions = [
  '更简短一点',
  '更生活一点',
  '更接地气一点',
  '更温柔一点',
  '更治愈一点',
  '更克制一点',
  '更有故事感',
  '更适合朋友圈',
  '更适合小红书',
  '更适合抖音',
  '保留意思重新写',
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败，请重新上传。'));
    reader.readAsDataURL(file);
  });
}

function getStoredApiKey() {
  try {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch (error) {
    return '';
  }
}

function MomentsGenerator() {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    apiKey: getStoredApiKey(),
  }));
  const [preview, setPreview] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [isMockMode, setIsMockMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageInsights, setImageInsights] = useState(null);
  const [result, setResult] = useState(null);
  const [editedBody, setEditedBody] = useState('');
  const [adjustment, setAdjustment] = useState(adjustmentOptions[0]);
  const [copyState, setCopyState] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {
    try {
      const apiKey = form.apiKey.trim();

      if (apiKey) {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch (error) {
      // localStorage may be unavailable in private browsing or restricted contexts.
    }
  }, [form.apiKey]);

  const resultText = useMemo(() => {
    if (!result) {
      return '';
    }

    return `${result.title}

${editedBody}

${result.tags.map((tag) => `#${tag}`).join(' ')}`;
  }, [editedBody, result]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleClearApiKey = () => {
    updateField('apiKey', '');
    setErrorMessage('');
    setCopyState('');

    try {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      // localStorage may be unavailable in private browsing or restricted contexts.
    }
  };

  const applyImageInsights = (insights) => {
    setForm((current) => ({
      ...current,
      brand: current.brand || insights.brand || '',
      category: current.category || insights.category || '',
      color: current.color || insights.color || '',
      material: current.material || insights.material || '',
      scene: current.scene || insights.scene || '',
    }));
  };

  const handleFile = async (event) => {
    const image = event.target.files?.[0];
    if (!image) {
      return;
    }

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setPreview(URL.createObjectURL(image));
    setErrorMessage('');
    setImageInsights(null);

    try {
      const dataUrl = await fileToDataUrl(image);
      setImageDataUrl(dataUrl);

      if (!isMockMode && form.apiKey.trim()) {
        setIsAnalyzing(true);

        try {
          const insights = await analyzeProductImage({ apiKey: form.apiKey, imageBase64: dataUrl });
          setImageInsights(insights);
          applyImageInsights(insights);
        } catch (error) {
          setErrorMessage(error.message || '图片识别失败，可继续手动填写高级设置。');
        } finally {
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      setImageDataUrl('');
      setErrorMessage(error.message);
    }
  };

  const handleGenerate = async ({ variation = false, keepCurrentResult = false } = {}) => {
    setCopyState('');
    setErrorMessage('');
    setIsGenerating(true);

    try {
      const nextResult = isMockMode
        ? generateMomentsMock(form, {
            variation,
            previousText: editedBody,
          })
        : await generateMomentsWithDoubao({
            form,
            imageDataUrl,
            variation,
            previousText: editedBody || resultText,
          });
      setResult(nextResult);
      setEditedBody(nextResult.body || '');
    } catch (error) {
      if (!keepCurrentResult) {
        setResult(null);
        setEditedBody('');
      }

      setErrorMessage(error.message || '生成失败，请检查系统授权码和网络连接。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAdjustment = async () => {
    if (!result || !editedBody.trim()) {
      setErrorMessage('请先生成内容，再继续调整。');
      return;
    }

    setCopyState('');
    setErrorMessage('');
    setIsGenerating(true);

    try {
      const nextResult = isMockMode
        ? generateMomentsMock(form, {
            rewriteInstruction: adjustment,
            previousText: editedBody,
          })
        : await generateMomentsWithDoubao({
            form,
            imageDataUrl,
            rewriteInstruction: adjustment,
            previousText: editedBody,
          });

      setResult((current) => ({
        ...nextResult,
        title: nextResult.title || current?.title || '生活瞬间',
        tags: nextResult.tags?.length ? nextResult.tags : current?.tags || [],
      }));
      setEditedBody(nextResult.body || editedBody);
    } catch (error) {
      setErrorMessage(error.message || '调整失败，请检查系统授权码和网络连接。');
    } finally {
      setIsGenerating(false);
    }
  };

  const fallbackCopy = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      const copied = document.execCommand('copy');
      setCopyState(copied ? '已复制' : '复制失败，请手动选择文案复制');
    } catch (error) {
      setCopyState('复制失败，请手动选择文案复制');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const handleCopy = async () => {
    if (!resultText) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(resultText);
        setCopyState('已复制');
        return;
      } catch (error) {
        fallbackCopy(resultText);
        return;
      }
    }

    fallbackCopy(resultText);
  };

  const handleCopyBody = async () => {
    if (!editedBody) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(editedBody);
        setCopyState('正文已复制');
        return;
      } catch (error) {
        fallbackCopy(editedBody);
        return;
      }
    }

    fallbackCopy(editedBody);
  };

  return (
    <main className="page generator-page">
      <header className="generator-header">
        <button className="ghost-button" type="button" onClick={() => navigate('/')}>
          返回首页
        </button>
        <div>
          <p className="eyebrow">EVA Content Studio</p>
          <h1>EVA 图文内容系统</h1>
          <p className="hero-copy">
            {isMockMode ? '当前为测试模式。' : '上传图片，选择表达方式，生成可直接修改的内容。'}
          </p>
        </div>
      </header>

      <section className="generator-layout">
        <form className="generator-form" onSubmit={(event) => event.preventDefault()}>
          <label className="file-upload">
            <span>上传图片</span>
            <input accept="image/*" type="file" onChange={handleFile} />
          </label>

          {preview ? (
            <div className="preview-wrap">
              <img alt="上传图片预览" src={preview} />
            </div>
          ) : (
            <div className="preview-empty">图片预览</div>
          )}

          {isAnalyzing && <p className="copy-state">正在识别图片...</p>}

          <div className="field-grid primary-options">
            <label>
              内容重点
              <select value={form.contentFocus} onChange={(event) => updateField('contentFocus', event.target.value)}>
                {contentFocusOptions.map((contentFocus) => (
                  <option key={contentFocus} value={contentFocus}>
                    {contentFocus === 'AI判断' ? '自动判断' : contentFocus}
                  </option>
                ))}
              </select>
            </label>
            <label>
              文案类型
              <select value={form.copyType} onChange={(event) => updateField('copyType', event.target.value)}>
                {copyTypes.map((copyType) => (
                  <option key={copyType}>{copyType}</option>
                ))}
              </select>
            </label>
            <label>
              文案长度
              <select value={form.copyLength} onChange={(event) => updateField('copyLength', event.target.value)}>
                {copyLengthOptions.map((copyLength) => (
                  <option key={copyLength}>{copyLength}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            今天想说的一句话 / 真实画面与细节
            <textarea
              rows="3"
              placeholder="比如：今天有位姐姐试穿后，在镜子前看了很久，说自己好像很久没这样打扮过了。"
              value={form.realDetail}
              onChange={(event) => updateField('realDetail', event.target.value)}
            />
          </label>

          <details className="advanced-panel">
            <summary>高级设置 / 修改识别结果</summary>

            {imageInsights && (
              <div className="insight-box">
                <span>图片识别结果</span>
                <p>
                  {[imageInsights.category, imageInsights.color, imageInsights.style, imageInsights.scene, imageInsights.mood]
                    .filter(Boolean)
                    .join(' / ') || '已完成基础识别，可继续修改。'}
                </p>
              </div>
            )}

            <div className="field-grid">
              <label>
                品牌
                <input value={form.brand} onChange={(event) => updateField('brand', event.target.value)} />
              </label>
              <label>
                品类
                <input value={form.category} onChange={(event) => updateField('category', event.target.value)} />
              </label>
              <label>
                颜色
                <input value={form.color} onChange={(event) => updateField('color', event.target.value)} />
              </label>
              <label>
                材质
                <input value={form.material} onChange={(event) => updateField('material', event.target.value)} />
              </label>
              <label>
                价格
                <input value={form.price} onChange={(event) => updateField('price', event.target.value)} />
              </label>
              <label>
                适合场景
                <input value={form.scene} onChange={(event) => updateField('scene', event.target.value)} />
              </label>
            </div>

            <label>
              活动信息
              <textarea
                rows="3"
                value={form.activity}
                onChange={(event) => updateField('activity', event.target.value)}
              />
            </label>

            <label>
              系统授权码
              <input
                type="password"
                value={form.apiKey}
                onChange={(event) => updateField('apiKey', event.target.value)}
              />
            </label>

            <label className="mode-switch">
              <input
                checked={isMockMode}
                type="checkbox"
                onChange={(event) => {
                  setIsMockMode(event.target.checked);
                  setErrorMessage('');
                }}
              />
              <span>测试模式</span>
            </label>
          </details>

          {form.apiKey && (
            <button className="ghost-button" type="button" onClick={handleClearApiKey}>
              清除授权码
            </button>
          )}

          {errorMessage && <p className="error-message">{errorMessage}</p>}

          <button className="primary-button" type="button" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? '正在整理内容...' : '生成内容'}
          </button>
        </form>

        <aside className="result-panel" aria-live="polite">
          {result ? (
            <>
              <div className="result-heading">
                <span>标题</span>
                <h2>{result.title}</h2>
              </div>

              <div className="result-section">
                <span>正文</span>
                <textarea
                  className="editable-result"
                  rows="10"
                  value={editedBody}
                  onChange={(event) => setEditedBody(event.target.value)}
                />
              </div>

              <div className="tag-row" aria-label="标签">
                {result.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>

              <div className="result-actions">
                <button className="secondary-button" type="button" onClick={handleCopyBody}>
                  复制正文
                </button>
                <button className="secondary-button" type="button" onClick={handleCopy}>
                  复制全部
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => handleGenerate({ variation: true, keepCurrentResult: true })}
                  disabled={isGenerating}
                >
                  {isGenerating ? '正在整理内容...' : '换一条'}
                </button>
              </div>

              <div className="adjust-panel">
                <label>
                  继续调整
                  <select value={adjustment} onChange={(event) => setAdjustment(event.target.value)}>
                    {adjustmentOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <button className="secondary-button" type="button" onClick={handleApplyAdjustment} disabled={isGenerating}>
                  {isGenerating ? '正在整理内容...' : '应用调整'}
                </button>
              </div>
              {copyState && <p className="copy-state">{copyState}</p>}
            </>
          ) : (
            <div className="result-empty">
              <span>结果显示</span>
              <p>生成后将在这里展示标题、正文和标签。</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default MomentsGenerator;
