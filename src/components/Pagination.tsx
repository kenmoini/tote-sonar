'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
}

/**
 * Generate page numbers with ellipsis for large ranges.
 * Always shows first, last, and current +/- 1.
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  // Always include first page
  pages.push(1);

  // Ellipsis before range if needed
  if (rangeStart > 2) {
    pages.push('...');
  }

  // Pages around current
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Ellipsis after range if needed
  if (rangeEnd < totalPages - 1) {
    pages.push('...');
  }

  // Always include last page
  pages.push(totalPages);

  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
}: PaginationProps) {
  // Do not render when there are zero results or only one page
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * limit + 1;
  const end = Math.min(currentPage * limit, totalItems);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="pagination">
      <span className="pagination-summary">
        Showing {start}-{end} of {totalItems} result{totalItems !== 1 ? 's' : ''}
      </span>

      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        {pageNumbers.map((pageNum, index) =>
          pageNum === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              className={`pagination-btn${pageNum === currentPage ? ' active' : ''}`}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === currentPage ? 'page' : undefined}
            >
              {pageNum}
            </button>
          )
        )}

        <button
          className="pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
    </div>
  );
}
