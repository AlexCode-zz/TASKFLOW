const PageHeader = ({ title, description, actions }) => (
  <header className="page-header">
    <div>
      <h1 className="page-header-title">{title}</h1>
      {description && <p className="page-header-description">{description}</p>}
    </div>
    {actions && <div className="d-flex gap-2">{actions}</div>}
  </header>
);

export default PageHeader;
