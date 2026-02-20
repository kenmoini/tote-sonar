'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Package, Box, MapPin, ArrowRight } from 'lucide-react';

interface SearchResultItem {
  id: number;
  tote_id: string;
  name: string;
  description: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  tote_name: string;
  tote_location: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (!res.ok) throw new Error('Search failed');
      const json = await res.json();
      setResults(json.data.items || []);
      setTotal(json.data.total || 0);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run search on initial load if query param exists
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Update URL with search query without full navigation
      const url = `/search?q=${encodeURIComponent(query.trim())}`;
      window.history.pushState({}, '', url);
      performSearch(query.trim());
    }
  };

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim() || !text) return <>{text}</>;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="search-highlight">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Search Items</h1>
          <p>Search across all items by name and description.</p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-wrapper">
          <Search size={20} className="search-input-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item name or description..."
            className="search-input"
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Results */}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Searching...</p>
        </div>
      )}

      {!loading && hasSearched && (
        <div className="search-results-section">
          <div className="search-results-header">
            <span className="search-results-count">
              {total === 0 ? 'No results found' : `${total} result${total !== 1 ? 's' : ''} found`}
              {query.trim() && <span className="search-results-query"> for &ldquo;{query.trim()}&rdquo;</span>}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="empty-state-small">
              <Search size={32} className="empty-icon" />
              <p>No items match your search. Try different keywords.</p>
            </div>
          ) : (
            <div className="search-results-list">
              {results.map((item) => (
                <Link
                  key={item.id}
                  href={`/totes/${item.tote_id}`}
                  className="search-result-card"
                >
                  <div className="search-result-main">
                    <div className="search-result-icon">
                      <Package size={20} />
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-name">
                        {highlightMatch(item.name, query)}
                      </span>
                      {item.description && (
                        <span className="search-result-desc">
                          {highlightMatch(item.description, query)}
                        </span>
                      )}
                      <div className="search-result-meta">
                        <span className="search-result-tote">
                          <Box size={14} />
                          <span className="search-result-tote-name">{item.tote_name}</span>
                          <span className="search-result-tote-id">({item.tote_id})</span>
                        </span>
                        <span className="search-result-location">
                          <MapPin size={14} />
                          {item.tote_location}
                        </span>
                        {item.quantity > 1 && (
                          <span className="search-result-qty">Qty: {item.quantity}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="search-result-arrow" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial state - no search yet */}
      {!loading && !hasSearched && (
        <div className="empty-state">
          <Search size={48} className="empty-icon" />
          <h2>Find Your Items</h2>
          <p>Enter a search term above to find items across all totes.</p>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <main className="page-container">
      <Suspense fallback={
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading search...</p>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </main>
  );
}
