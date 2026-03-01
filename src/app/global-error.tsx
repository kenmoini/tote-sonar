'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <main style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div role="alert">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something Went Wrong</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>An unexpected error occurred. Please try again.</p>
            <button
              onClick={reset}
              style={{ padding: '0.5rem 1.5rem', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.375rem' }}
            >
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
