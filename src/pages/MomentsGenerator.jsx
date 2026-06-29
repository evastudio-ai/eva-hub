import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateMomentsMock, generateMomentsWithDoubao } from '../services/doubao.js';

const initialForm = {
  brand: '',
  category: '',
  color: '',
  material: '',
  price: '',
  scene: '',
  activity: '',
  style: '高级质感',
  modelId: '',
  apiKey: '',
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败，请重新上传。'));
    reader.readAsDataURL(file);
  });
}

function MomentsGenerator() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [isMockMode, setIsMockMode] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copyState, setCopyState] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const resultText = useMemo(() => {
    if (!result) {
      return '';
    }

    return `${result.title}

${result.body}

${result.tags.map((tag) => `#${tag}`).join(' ')}`;
  }, [result]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
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

    try {
      setImageDataUrl(await fileToDataUrl(image));
    } catch (error) {
      setImageDataUrl('');
      setErrorMessage(error.message);
    }
  };

  const handleGenerate = async () => {
    setCopyState('');
    setErrorMessage('');
    setIsGenerating(true);

    try {
      const nextResult = isMockMode
        ? generateMomentsMock(form)
        : await generateMomentsWithDoubao({ form, imageDataUrl });
      setResult(nextResult);
    } catch (error) {
      setResult(null);
      setErrorMessage(error.message || '生成失败，请检查 API Key、Model ID 和网络连接。');
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

  return (
    <main className="page generator-page">
      <header className="generator-header">
        <button className="ghost-button" type="button" onClick={() => navigate('/')}>
          返回首页
        </button>
        <div>
          <p className="eyebrow">Moments Generator</p>
          <h1>AI朋友圈生成器</h1>
          <p className="hero-copy">
            {isMockMode ? '当前为 Mock 测试模式，可切换为豆包视觉接入测试。' : '当前为豆包视觉接入测试版。'}
          </p>
        </div>
      </header>

      <section className="generator-layout">
        <form className="generator-form" onSubmit={(event) => event.preventDefault()}>
          <label className="mode-switch">
            <input
              checked={isMockMode}
              type="checkbox"
              onChange={(event) => {
                setIsMockMode(event.target.checked);
                setErrorMessage('');
              }}
            />
            <span>Mock 模式</span>
          </label>

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

          <div className="field-grid">
            <label>
              文案风格
              <select value={form.style} onChange={(event) => updateField('style', event.target.value)}>
                <option>高级质感</option>
                <option>轻松日常</option>
                <option>种草推荐</option>
                <option>温柔治愈</option>
              </select>
            </label>
            <label>
              Model ID
              <input value={form.modelId} onChange={(event) => updateField('modelId', event.target.value)} />
            </label>
            <label>
              豆包 API Key
              <input
                type="password"
                value={form.apiKey}
                onChange={(event) => updateField('apiKey', event.target.value)}
              />
            </label>
          </div>

          {errorMessage && <p className="error-message">{errorMessage}</p>}

          <button className="primary-button" type="button" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? '生成中...' : '生成朋友圈文案'}
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
                <p>{result.body}</p>
              </div>

              <div className="tag-row" aria-label="标签">
                {result.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>

              <button className="secondary-button" type="button" onClick={handleCopy}>
                一键复制
              </button>
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
