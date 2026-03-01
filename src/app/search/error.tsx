'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function Error({
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
    <main className="page-container">
      <ErrorDisplay
        error={error.message || 'An unexpected error occurred'}
        onRetry={reset}
        retryLabel="Try Again"
      />
    </main>
  );
}
