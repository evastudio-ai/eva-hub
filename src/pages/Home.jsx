import { useNavigate } from 'react-router-dom';
import ModuleCard from '../components/ModuleCard.jsx';

const modules = [
  {
    title: 'AI朋友圈生成器',
    description: '上传商品图并生成适合门店朋友圈发布的中文文案。',
    status: 'available',
  },
  {
    title: 'EVA日报生成器',
    description: '跳转到 EVA 日报系统，生成门店经营日报。',
    status: 'link',
    url: 'https://evastudio-ai.github.io/eva-daily-report/',
  },
  {
    title: '经营分析',
    description: '经营指标、转化效率与门店复盘分析。',
    status: 'pending',
  },
  {
    title: '图文内容系统',
    description: '小红书、朋友圈、海报等图文内容编排。',
    status: 'pending',
  },
  {
    title: '视频脚本系统',
    description: '短视频分镜、口播脚本与拍摄提示。',
    status: 'pending',
  },
  {
    title: '工具中心',
    description: '沉淀门店常用 AI 工具与运营模板。',
    status: 'pending',
  },
];

function Home() {
  const navigate = useNavigate();

  const handleModuleClick = (module) => {
    if (module.status === 'available') {
      navigate('/moments');
      return;
    }

    if (module.status === 'link') {
      window.open(module.url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.alert('该模块将在下一阶段开放。');
  };

  return (
    <main className="page">
      <section className="home-hero">
        <div>
          <p className="eyebrow">EVA STUDIO AI Operating System</p>
          <h1>EVA HUB</h1>
          <p className="hero-copy">EVA STUDIO 门店 AI 运营工作台</p>
        </div>
      </section>

      <section className="module-grid" aria-label="EVA HUB 模块">
        {modules.map((module) => (
          <ModuleCard
            key={module.title}
            title={module.title}
            description={module.description}
            status={module.status}
            onClick={() => handleModuleClick(module)}
          />
        ))}
      </section>
    </main>
  );
}

export default Home;
