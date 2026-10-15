import { SORT_OPTIONS } from '../utils/productSort.js';

// Dropdown used on the Shop, Sales and Category pages.
export default function SortSelect({ value, onChange }) {
    return (
        <select
            className="sort-select"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label="Sort products"
        >
            {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
