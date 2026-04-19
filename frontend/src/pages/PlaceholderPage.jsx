export default function PlaceholderPage({ title }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>{title}</h2>
        <p>This page is ready in the React app, but its backend workflow is not implemented yet.</p>
      </div>
      <div className="empty-state">
        Connect a dedicated API for this module whenever you are ready to expand it.
      </div>
    </section>
  );
}
