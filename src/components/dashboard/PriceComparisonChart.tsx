import { Card } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PriceByEcommerce } from '../../types';

interface Props {
  data: PriceByEcommerce[];
}

export default function PriceComparisonChart({ data }: Props) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    name: d.ecommerce,
    'Preço Médio': Number(d.avg_price),
    'Preço Mín.': Number(d.min_price),
    'Preço Máx.': Number(d.max_price),
  }));

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white fw-semibold">
        Comparação de Preços por E-commerce
      </Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => `R$${v}`} />
            <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="Preço Mín." fill="#22c55e" />
            <Bar dataKey="Preço Médio" fill="#3b82f6" />
            <Bar dataKey="Preço Máx." fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
}

