// Date-range helpers for the admin sales statistics.

const RANGES = {
  '7d': { days: 7, unit: 'day', label: 'Last 7 days' },
  '30d': { days: 30, unit: 'day', label: 'Last 30 days' },
  '90d': { days: 90, unit: 'day', label: 'Last 90 days' },
  '12m': { months: 12, unit: 'month', label: 'Last 12 months' },
};

export const DEFAULT_RANGE = '30d';

const pad = (number) => String(number).padStart(2, '0');

export function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

// MySQL DATETIME literal for the start of a calendar day.
export function toSqlDate(date) {
  return `${formatDateKey(date)} 00:00:00`;
}

// Work out the current range, the equally long range before it,
// and every bucket (day or month) inside the current range.
// Dates are [start, end): start is included, end is not.
export function resolveRange(requested, now = new Date()) {
  const key = RANGES[requested] ? requested : DEFAULT_RANGE;
  const config = RANGES[key];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let start;
  let end;
  let previousStart;

  if (config.unit === 'day') {
    end = addDays(today, 1);
    start = addDays(end, -config.days);
    previousStart = addDays(start, -config.days);
  } else {
    end = addMonths(today, 1);
    start = addMonths(end, -config.months);
    previousStart = addMonths(start, -config.months);
  }

  const buckets = [];

  for (
    let cursor = start;
    cursor < end;
    cursor = config.unit === 'day' ? addDays(cursor, 1) : addMonths(cursor, 1)
  ) {
    buckets.push(
      config.unit === 'day' ? formatDateKey(cursor) : formatMonthKey(cursor)
    );
  }

  return {
    key,
    label: config.label,
    unit: config.unit,
    start,
    end,
    previousStart,
    previousEnd: start,
    buckets,
  };
}

// Combine database rows with the full bucket list so days or months
// without any sales still appear as zero.
export function fillSeries(buckets, rows) {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));

  return buckets.map((bucket) => {
    const row = byBucket.get(bucket);

    return {
      key: bucket,
      orders: Number(row?.orders) || 0,
      revenue: Number(row?.revenue) || 0,
    };
  });
}

// Percentage change with one decimal. Returns null when there is
// nothing to compare against (previous value was zero but current is not).
export function percentChange(current, previous) {
  if (!previous) return current ? null : 0;

  return Math.round(((current - previous) / previous) * 1000) / 10;
}
