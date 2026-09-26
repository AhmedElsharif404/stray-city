import { CalendarDays, Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';

import { PLACE_CATEGORIES, type PlaceFilters } from '@stray-city/shared';

import { categoryMeta } from '../lib/format';

interface FilterBarProps {
  filters: PlaceFilters;
  boroughs: string[];
  neighborhoods: string[];
  onChange: (filters: PlaceFilters) => void;
}

export function FilterBar({ filters, boroughs, neighborhoods, onChange }: FilterBarProps) {
  const set = <Key extends keyof PlaceFilters>(key: Key, value: PlaceFilters[Key]) =>
    onChange({ ...filters, [key]: value });
  const activeCount =
    filters.categories.length +
    filters.vibeTags.length +
    Number(Boolean(filters.borough)) +
    Number(Boolean(filters.neighborhood)) +
    Number(Boolean(filters.date)) +
    Number(filters.budgetOnly);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 xl:flex-row">
        <label className="search-field flex-1">
          <Search size={18} />
          <input
            value={filters.query}
            onChange={(event) => set('query', event.target.value)}
            placeholder="Search a place, neighborhood, or vibe"
          />
          {filters.query && (
            <button onClick={() => set('query', '')} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <label className="select-chip">
            <span>{filters.borough || 'Borough'}</span>
            <ChevronDown size={15} />
            <select
              value={filters.borough}
              onChange={(event) =>
                onChange({ ...filters, borough: event.target.value, neighborhood: '' })
              }
            >
              <option value="">All boroughs</option>
              {boroughs.map((borough) => (
                <option key={borough}>{borough}</option>
              ))}
            </select>
          </label>
          <label className="select-chip">
            <span>{filters.neighborhood || 'Neighborhood'}</span>
            <ChevronDown size={15} />
            <select
              value={filters.neighborhood}
              onChange={(event) => set('neighborhood', event.target.value)}
            >
              <option value="">All neighborhoods</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood}>{neighborhood}</option>
              ))}
            </select>
          </label>
          <label className="select-chip">
            <CalendarDays size={15} />
            <span>{filters.date || 'Any date'}</span>
            <input
              type="date"
              value={filters.date}
              onChange={(event) => set('date', event.target.value)}
            />
          </label>
          <button
            className={`select-chip ${filters.budgetOnly ? 'filter-active' : ''}`}
            onClick={() => set('budgetOnly', !filters.budgetOnly)}
          >
            <Check size={15} /> Verified budget
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-widest text-ink/45">
          <SlidersHorizontal size={14} /> {activeCount ? `${activeCount} active` : 'Categories'}
        </span>
        {PLACE_CATEGORIES.map((category) => {
          const meta = categoryMeta[category];
          const active = filters.categories.includes(category);
          return (
            <button
              key={category}
              className={`category-chip ${active ? 'category-chip-active' : ''}`}
              style={active ? { backgroundColor: meta.color } : undefined}
              onClick={() =>
                set(
                  'categories',
                  active
                    ? filters.categories.filter((item) => item !== category)
                    : [...filters.categories, category],
                )
              }
            >
              <span>{meta.icon}</span>
              {meta.label}
            </button>
          );
        })}
        {activeCount > 0 && (
          <button
            className="category-chip text-coral"
            onClick={() =>
              onChange({
                borough: '',
                neighborhood: '',
                categories: [],
                date: '',
                budgetOnly: false,
                query: '',
                vibeTags: [],
              })
            }
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
