// Bar chart drawn with plain SVG, so no chart library is needed.

const WIDTH = 760;
const HEIGHT = 260;
const PAD = { top: 14, right: 12, bottom: 30, left: 56 };

const money = (value) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

// Round the top of the y-axis up to a tidy number (1, 2, 5 x 10^n).
function niceMax(value) {
    if (value <= 0) return 100;

    const power = 10 ** Math.floor(Math.log10(value));
    const fraction = value / power;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

    return nice * power;
}

// 'YYYY-MM-DD' or 'YYYY-MM' -> a short axis label.
function bucketLabel(key, unit, long = false) {
    const [year, month, day = '1'] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (unit === 'month') {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            year: long ? 'numeric' : '2-digit',
        });
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

export default function SalesChart({ series, unit }) {
    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;

    const maxValue = niceMax(Math.max(0, ...series.map((point) => point.revenue)));
    const ticks = [0, 1, 2, 3, 4].map((index) => (maxValue / 4) * index);

    const slot = innerWidth / series.length;
    const barWidth = Math.max(2, slot * 0.68);
    const labelEvery = Math.ceil(series.length / 7);

    const total = series.reduce((sum, point) => sum + point.revenue, 0);

    return (
        <svg
            className="sales-chart"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Bar chart of sales per ${unit}. Total ${money(total)}.`}
        >
            {ticks.map((tick) => {
                const y = PAD.top + innerHeight - (tick / maxValue) * innerHeight;

                return (
                    <g key={tick}>
                        <line
                            className="sales-chart-grid"
                            x1={PAD.left}
                            x2={WIDTH - PAD.right}
                            y1={y}
                            y2={y}
                        />
                        <text
                            className="sales-chart-label"
                            x={PAD.left - 8}
                            y={y + 4}
                            textAnchor="end"
                        >
                            {money(tick)}
                        </text>
                    </g>
                );
            })}

            {series.map((point, index) => {
                const height = (point.revenue / maxValue) * innerHeight;
                const x = PAD.left + slot * index + (slot - barWidth) / 2;
                const y = PAD.top + innerHeight - height;

                return (
                    <g key={point.key}>
                        <rect
                            className="sales-chart-bar"
                            x={x}
                            y={point.revenue > 0 ? y : PAD.top + innerHeight - 1}
                            width={barWidth}
                            height={point.revenue > 0 ? Math.max(height, 2) : 1}
                            rx={Math.min(3, barWidth / 2)}
                        >
                            <title>
                                {`${bucketLabel(point.key, unit, true)}: ${money(
                                    point.revenue
                                )} from ${point.orders} order${
                                    point.orders === 1 ? '' : 's'
                                }`}
                            </title>
                        </rect>

                        {index % labelEvery === 0 && (
                            <text
                                className="sales-chart-label"
                                x={x + barWidth / 2}
                                y={HEIGHT - 9}
                                textAnchor="middle"
                            >
                                {bucketLabel(point.key, unit)}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
