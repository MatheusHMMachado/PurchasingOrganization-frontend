import { Card } from 'react-bootstrap';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { EcommerceDistribution } from '../../types';

interface Props {
  data: EcommerceDistribution[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function EcommerceDistributionChart({ data }: Props) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    name: d.ecommerce,
    value: d.count,
    percentage: Number(d.percentage),
  }));

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-body fw-semibold">
        Distribuição por E-commerce
      </Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              dataKey="value"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number, name: string) => [`${v} ofertas`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
}

