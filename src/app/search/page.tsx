'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Package, Box, MapPin, ArrowRight, Filter, X, User } from 'lucide-react';

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
  const initialLocation = searchParams.get('location') || '';
  const initialOwner = searchParams.get('owner') || '';

  const [query, setQuery] = useState(initialQuery);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [ownerFilter, setOwnerFilter] = useState(initialOwner);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(!!initialLocation || !!initialOwner);

  // Available filter options
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableOwners, setAvailableOwners] = useState<string[]>([]);

  // Fetch available filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch('/api/search/filters');
        if (res.ok) {
          const json = await res.json();
          setAvailableLocations(json.data.locations || []);
          setAvailableOwners(json.data.owners || []);
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };
    fetchFilters();
  }, []);

  const performSearch = useCallback(async (searchQuery: string, location: string, owner: string) => {
    if (!searchQuery.trim() && !location.trim() && !owner.trim()) {
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (location.trim()) params.set('location', location.trim());
      if (owner.trim()) params.set('owner', owner.trim());

      const res = await fetch(`/api/search?${params.toString()}`);
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
    if (initialQuery || initialLocation || initialOwner) {
      setQuery(initialQuery);
      setLocationFilter(initialLocation);
      setOwnerFilter(initialOwner);
      performSearch(initialQuery, initialLocation, initialOwner);
    }
  }, [initialQuery, initialLocation, initialOwner, performSearch]);

  const updateUrl = (q: string, loc: string, own: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (loc.trim()) params.set('location', loc.trim());
    if (own.trim()) params.set('owner', own.trim());
    const qs = params.toString();
    const url = `/search${qs ? '?' + qs : ''}`;
    window.history.pushState({}, '', url);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || locationFilter.trim() || ownerFilter.trim()) {
      updateUrl(query, locationFilter, ownerFilter);
      performSearch(query.trim(), locationFilter.trim(), ownerFilter.trim());
    }
  };

  const handleLocationChange = (value: string) => {
    setLocationFilter(value);
    // If there's already a search or other filter active, auto-search
    if (query.trim() || ownerFilter.trim() || value.trim()) {
      updateUrl(query, value, ownerFilter);
      performSearch(query.trim(), value.trim(), ownerFilter.trim());
    }
  };

  const handleOwnerChange = (value: string) => {
    setOwnerFilter(value);
    // If there's already a search or other filter active, auto-search
    if (query.trim() || locationFilter.trim() || value.trim()) {
      updateUrl(query, locationFilter, value);
      performSearch(query.trim(), locationFilter.trim(), value.trim());
    }
  };

  const clearLocationFilter = () => {
    setLocationFilter('');
    if (query.trim() || ownerFilter.trim()) {
      updateUrl(query, '', ownerFilter);
      performSearch(query.trim(), '', ownerFilter.trim());
    } else {
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      updateUrl('', '', ownerFilter);
    }
  };

  const clearOwnerFilter = () => {
    setOwnerFilter('');
    if (query.trim() || locationFilter.trim()) {
      updateUrl(query, locationFilter, '');
      performSearch(query.trim(), locationFilter.trim(), '');
    } else {
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      updateUrl('', locationFilter, '');
    }
  };

  const clearAllFilters = () => {
    setLocationFilter('');
    setOwnerFilter('');
    if (query.trim()) {
      updateUrl(query, '', '');
      performSearch(query.trim(), '', '');
    } else {
      setResults([]);
      setTotal(0);
      setHasSearched(false);
      updateUrl('', '', '');
    }
  };

  const activeFilterCount = (locationFilter.trim() ? 1 : 0) + (ownerFilter.trim() ? 1 : 0);

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
        <button
          type="button"
          className={`btn btn-outline search-filter-toggle ${showFilters ? 'active' : ''} ${activeFilterCount > 0 ? 'has-filters' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Toggle filters"
        >
          <Filter size={18} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Filter Panel */}
      {showFilters && (
        <div className="search-filters-panel">
          <div className="search-filters-header">
            <span className="search-filters-title">
              <Filter size={16} />
              Filter Results
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm search-filters-clear"
                onClick={clearAllFilters}
              >
                Clear all filters
              </button>
            )}
          </div>
          <div className="search-filters-grid">
            <div className="search-filter-group">
              <label className="search-filter-label">
                <MapPin size={14} />
                Location
              </label>
              <div className="search-filter-input-wrapper">
                <select
                  value={locationFilter}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="search-filter-select"
                >
                  <option value="">All locations</option>
                  {availableLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                {locationFilter && (
                  <button
                    type="button"
                    className="search-filter-clear-btn"
                    onClick={clearLocationFilter}
                    title="Clear location filter"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="search-filter-group">
              <label className="search-filter-label">
                <User size={14} />
                Owner
              </label>
              <div className="search-filter-input-wrapper">
                <select
                  value={ownerFilter}
                  onChange={(e) => handleOwnerChange(e.target.value)}
                  className="search-filter-select"
                >
                  <option value="">All owners</option>
                  {availableOwners.map((own) => (
                    <option key={own} value={own}>{own}</option>
                  ))}
                </select>
                {ownerFilter && (
                  <button
                    type="button"
                    className="search-filter-clear-btn"
                    onClick={clearOwnerFilter}
                    title="Clear owner filter"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="search-active-filters">
              {locationFilter && (
                <span className="search-active-filter-tag">
                  <MapPin size={12} />
                  {locationFilter}
                  <button type="button" onClick={clearLocationFilter} className="search-active-filter-remove">
                    <X size={12} />
                  </button>
                </span>
              )}
              {ownerFilter && (
                <span className="search-active-filter-tag">
                  <User size={12} />
                  {ownerFilter}
                  <button type="button" onClick={clearOwnerFilter} className="search-active-filter-remove">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

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
              {activeFilterCount > 0 && (
                <span className="search-results-filters-note"> (filtered)</span>
              )}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="empty-state-small">
              <Search size={32} className="empty-icon" />
              <p>No items match your search{activeFilterCount > 0 ? ' and filters' : ''}. Try different keywords{activeFilterCount > 0 ? ' or adjust your filters' : ''}.</p>
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
          <p className="search-hint">Use the <strong>Filters</strong> button to narrow results by location or owner.</p>
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
