const statusLabel = {
  available: '可用',
  link: '外链',
  pending: '开发中',
};

function ModuleCard({ title, description, status, onClick }) {
  return (
    <button className={`module-card ${status}`} type="button" onClick={onClick}>
      <span className="module-status">{statusLabel[status]}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="module-action">
        {status === 'available' ? '点击进入' : status === 'link' ? '查看日报' : '下一阶段开放'}
      </span>
    </button>
  );
}

export default ModuleCard;
