import { Card } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PriceTrend } from '../../types';

interface Props {
  data: PriceTrend[];
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function PriceTrendChart({ data }: Props) {
  if (!data.length) return null;

  // Group by date and pivot ecommerce into columns
  const ecommerces = [...new Set(data.map((d) => d.ecommerce))];
  const dateMap = new Map<string, Record<string, number>>();

  data.forEach((d) => {
    if (!dateMap.has(d.date)) {
      dateMap.set(d.date, { date: d.date } as any);
    }
    const entry = dateMap.get(d.date)!;
    (entry as any)[d.ecommerce] = Number(d.avg_price);
  });

  const chartData = Array.from(dateMap.values());

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white fw-semibold">
        Evolução de Preços
      </Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(v) => `R$${v}`} />
            <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
            <Legend />
            {ecommerces.map((ec, i) => (
              <Line
                key={ec}
                type="monotone"
                dataKey={ec}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
}

