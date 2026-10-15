import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import SalesChart from './SalesChart.jsx';

const RANGES = [
    { key: '7d', label: '7 days', previous: 'previous 7 days' },
    { key: '30d', label: '30 days', previous: 'previous 30 days' },
    { key: '90d', label: '90 days', previous: 'previous 90 days' },
    { key: '12m', label: '12 months', previous: 'previous 12 months' },
];

const money = (value, digits = 0) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(Number(value) || 0);

const statusLabel = (status) =>
    ({
        pending: 'Pending',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
    })[status] || status || 'Unknown';

// "▲ 12% vs previous 30 days" / "No sales in the previous 30 days".
function ChangeNote({ change, previous }) {
    if (change === null) {
        return <small className="admin-change">New: no sales in the {previous}</small>;
    }

    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '■';

    return (
        <small className={`admin-change ${direction}`}>
            {arrow} {Math.abs(change)}% vs {previous}
        </small>
    );
}

export default function AdminStatistics() {
    const [range, setRange] = useState('30d');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        setLoading(true);
        setError('');

        apiFetch(`/api/admin/statistics?range=${range}`, {
            signal: controller.signal,
        })
            .then(setData)
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    setError(err.message || 'Could not load sales statistics.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [range]);

    const previous = RANGES.find((item) => item.key === range)?.previous;
    const summary = data?.summary;
    const hasSales = (summary?.orders ?? 0) > 0;

    const cards = summary
        ? [
              {
                  label: 'Sales',
                  value: money(summary.revenue),
                  change: data.changes.revenue,
                  tone: 'ink',
                  note: 'Excluding cancelled orders',
              },
              {
                  label: 'Orders',
                  value: summary.orders,
                  change: data.changes.orders,
                  tone: 'blue',
                  note: `${summary.cancelled} cancelled in this period`,
              },
              {
                  label: 'Units sold',
                  value: summary.units,
                  change: data.changes.units,
                  tone: 'sand',
                  note: 'Items across all orders',
              },
              {
                  label: 'Average order',
                  value: money(summary.averageOrder, 2),
                  change: data.changes.averageOrder,
                  tone: 'green',
                  note: 'Sales divided by orders',
              },
          ]
        : [];

    const categoryTotal =
        data?.categories.reduce((sum, item) => sum + item.revenue, 0) || 0;

    return (
        <div className="admin-page-content">
            <div className="admin-page-heading">
                <div>
                    <span className="admin-kicker">SALES</span>
                    <h1>Sales statistics</h1>
                    <p>How the store is performing over time.</p>
                </div>

                <div className="admin-range-tabs" role="group" aria-label="Date range">
                    {RANGES.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={range === item.key ? 'active' : ''}
                            aria-pressed={range === item.key}
                            onClick={() => setRange(item.key)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <p className="form-message form-error" role="alert">
                    {error}
                </p>
            )}

            {loading && !data ? (
                <div className="admin-loading">Loading sales statistics…</div>
            ) : (
                data && (
                    <div className={loading ? 'admin-refreshing' : undefined}>
                        <section className="admin-stat-grid" aria-label="Sales summary">
                            {cards.map((card) => (
                                <div
                                    className={`admin-stat-card ${card.tone}`}
                                    key={card.label}
                                >
                                    <span className="admin-stat-label">{card.label}</span>
                                    <strong>{card.value}</strong>
                                    <ChangeNote
                                        change={card.change}
                                        previous={previous}
                                    />
                                    <small>{card.note}</small>
                                </div>
                            ))}
                        </section>

                        <section className="admin-panel admin-chart-panel">
                            <div className="admin-panel-heading">
                                <div>
                                    <h2>Sales over time</h2>
                                    <p>
                                        {data.range.label}, per{' '}
                                        {data.range.unit}
                                    </p>
                                </div>
                            </div>

                            {hasSales ? (
                                <div className="admin-chart">
                                    <SalesChart
                                        series={data.series}
                                        unit={data.range.unit}
                                    />
                                </div>
                            ) : (
                                <div className="admin-empty-state">
                                    No sales in this period yet.
                                </div>
                            )}
                        </section>

                        {hasSales && (
                            <section className="admin-stats-lower">
                                <div className="admin-panel">
                                    <div className="admin-panel-heading">
                                        <div>
                                            <h2>Top products</h2>
                                            <p>Best sellers by units sold</p>
                                        </div>
                                    </div>

                                    <div className="admin-table-scroll">
                                        <table className="admin-data-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Product</th>
                                                    <th>Units</th>
                                                    <th>Sales</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.topProducts.map((product, index) => (
                                                    <tr key={`${product.product_id}-${index}`}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <span className="admin-table-primary">
                                                                {product.name}
                                                            </span>
                                                        </td>
                                                        <td>{product.units}</td>
                                                        <td>
                                                            <strong>
                                                                {money(product.revenue, 2)}
                                                            </strong>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="admin-stats-stack">
                                    <div className="admin-panel">
                                        <div className="admin-panel-heading">
                                            <div>
                                                <h2>Sales by category</h2>
                                                <p>Share of sales</p>
                                            </div>
                                        </div>

                                        <div className="admin-share-list">
                                            {data.categories.map((item) => {
                                                const share = categoryTotal
                                                    ? Math.round((item.revenue / categoryTotal) * 100)
                                                    : 0;

                                                return (
                                                    <div className="admin-share-row" key={item.name}>
                                                        <div className="admin-share-text">
                                                            <span>{item.name}</span>
                                                            <strong>{money(item.revenue)}</strong>
                                                        </div>
                                                        <div className="admin-share-track">
                                                            <div
                                                                className="admin-share-fill"
                                                                style={{ width: `${share}%` }}
                                                            />
                                                        </div>
                                                        <small>{share}% · {item.units} units</small>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="admin-panel">
                                        <div className="admin-panel-heading">
                                            <div>
                                                <h2>Orders by status</h2>
                                                <p>Everything placed in this period</p>
                                            </div>
                                        </div>

                                        {data.statuses.map((item) => (
                                            <div className="admin-pipeline-row" key={item.status}>
                                                <span>
                                                    <i className={`admin-pipeline-dot status-${item.status}`} />
                                                    {statusLabel(item.status)}
                                                </span>
                                                <strong>
                                                    {item.count} · {money(item.value)}
                                                </strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )
            )}

            <p className="admin-footnote">
                Sales count every order that has not been cancelled, so
                pending and processing orders are included. Changes compare
                with the {previous} before this one.
            </p>
        </div>
    );
}
