'use client';

import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Determines if an error is a network/connectivity error.
 */
function isNetworkError(error: string): boolean {
  const networkPatterns = [
    'failed to fetch',
    'network error',
    'networkerror',
    'load failed',
    'fetch failed',
    'err_connection_refused',
    'econnrefused',
    'net::err_',
    'typeerror: failed to fetch',
    'the network connection was lost',
    'the internet connection appears to be offline',
    'a network error occurred',
    'unable to connect',
  ];
  const lowerError = error.toLowerCase();
  return networkPatterns.some(pattern => lowerError.includes(pattern));
}

/**
 * Returns a user-friendly error message and suggestion based on the error type.
 */
function getErrorInfo(error: string): { title: string; message: string; suggestion: string; isNetwork: boolean } {
  if (isNetworkError(error)) {
    return {
      title: 'Unable to Connect',
      message: 'Could not reach the Tote Sonar server. The server may be down or your network connection may have been interrupted.',
      suggestion: 'Check that the server is running and try again.',
      isNetwork: true,
    };
  }

  // Server-side errors (5xx)
  if (error.includes('500') || error.toLowerCase().includes('internal server error')) {
    return {
      title: 'Server Error',
      message: 'The server encountered an unexpected error while processing your request.',
      suggestion: 'Please wait a moment and try again. If the problem persists, check the server logs.',
      isNetwork: false,
    };
  }

  // Generic fallback
  return {
    title: 'Something Went Wrong',
    message: error || 'An unexpected error occurred while loading data.',
    suggestion: 'Please try again. If the issue continues, restart the Tote Sonar server.',
    isNetwork: false,
  };
}

export default function ErrorDisplay({ error, onRetry, retryLabel = 'Try Again' }: ErrorDisplayProps) {
  const { title, message, suggestion, isNetwork } = getErrorInfo(error);

  return (
    <div className="error-state" role="alert">
      <div className="error-icon">
        {isNetwork ? <WifiOff size={48} /> : <AlertTriangle size={48} />}
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      <p className="error-suggestion">{suggestion}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={16} />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
}
