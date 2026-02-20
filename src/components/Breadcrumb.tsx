'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="breadcrumb-item-wrapper">
            {index > 0 && (
              <ChevronRight size={14} className="breadcrumb-chevron" />
            )}
            {isLast || !item.href ? (
              <span className="breadcrumb-current">{item.label}</span>
            ) : (
              <Link href={item.href} className="breadcrumb-link">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
