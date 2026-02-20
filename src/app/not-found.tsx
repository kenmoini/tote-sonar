import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="page-container">
      <div className="error-state">
        <div className="not-found-code">404</div>
        <h2>Page Not Found</h2>
        <p>
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.
        </p>
        <div className="not-found-actions">
          <Link href="/" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/totes" className="btn btn-secondary">
            View Totes
          </Link>
        </div>
      </div>
    </main>
  );
}
