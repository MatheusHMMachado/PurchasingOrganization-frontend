import { Card, Row, Col } from 'react-bootstrap';
import { FiPackage, FiClock, FiDollarSign, FiTrendingDown } from 'react-icons/fi';
import type { DashboardSummary } from '../../types';

interface Props {
  summary: DashboardSummary;
}

export default function SummaryCards({ summary }: Props) {
  const cards = [
    {
      title: 'Remessas Ativas',
      value: `${summary.active_batches} / ${summary.total_batches}`,
      icon: <FiPackage size={28} />,
      color: 'primary',
    },
    {
      title: 'Itens Pendentes',
      value: `${summary.pending_items} / ${summary.total_items}`,
      icon: <FiClock size={28} />,
      color: 'warning',
    },
    {
      title: 'Melhor Preço',
      value: summary.best_price > 0 ? `R$ ${summary.best_price.toFixed(2)}` : '—',
      icon: <FiDollarSign size={28} />,
      color: 'success',
    },
    {
      title: 'Economia Potencial',
      value: summary.potential_savings > 0 ? `R$ ${summary.potential_savings.toFixed(2)}` : '—',
      icon: <FiTrendingDown size={28} />,
      color: 'info',
    },
  ];

  return (
    <Row className="g-3 mb-4">
      {cards.map((card, idx) => (
        <Col xs={6} lg={3} key={idx}>
          <Card className={`border-0 shadow-sm border-start border-4 border-${card.color}`}>
            <Card.Body className="d-flex align-items-center gap-3">
              <div className={`text-${card.color} opacity-75`}>{card.icon}</div>
              <div>
                <div className="text-muted small">{card.title}</div>
                <div className="fw-bold fs-5">{card.value}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

