import type { ReactNode } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiPackage, FiClock, FiDollarSign, FiTrendingDown, FiShoppingBag } from 'react-icons/fi';
import { formatBRL } from '../../utils/ecommerce';
import type { DashboardSummary } from '../../types';

interface Props {
  summary: DashboardSummary;
  /** A single batch is selected in the filters */
  batchFiltered?: boolean;
}

interface SummaryCard {
  title: string;
  value: string;
  icon: ReactNode;
  color: string;
  /** When set, the whole card navigates here */
  to?: string;
  /** Small text under the value */
  hint?: string;
  /** Full width on phones (odd card out in the 2-column grid) */
  wideOnMobile?: boolean;
}

export default function SummaryCards({ summary, batchFiltered = false }: Props) {
  const priced = summary.priced_items;
  const cards: SummaryCard[] = [
    {
      title: 'Remessas Ativas',
      value: `${summary.active_batches} / ${summary.total_batches}`,
      icon: <FiPackage size={28} />,
      color: 'primary',
      to: '/batches',
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
    {
      // Sum of each item's best registered price; follows the batch filter
      title: batchFiltered ? 'Total da Remessa' : 'Total das Remessas',
      value: formatBRL(summary.best_price_total),
      icon: <FiShoppingBag size={28} />,
      color: 'dark',
      hint:
        priced !== undefined
          ? `melhor preço de ${priced} de ${summary.total_items} ${summary.total_items === 1 ? 'item' : 'itens'}`
          : undefined,
      wideOnMobile: true,
    },
  ];

  return (
    <Row className="g-3 mb-4">
      {cards.map((card, idx) => (
        <Col xs={card.wideOnMobile ? 12 : 6} md={4} xl key={idx}>
          <Card
            className={`border-0 shadow-sm border-start border-4 border-${card.color}${card.to ? ' hover-shadow transition-all' : ''}`}
          >
            <Card.Body className="d-flex align-items-center gap-3">
              <div className={`text-${card.color} opacity-75`}>{card.icon}</div>
              <div>
                <div className="text-muted small">
                  {card.to ? (
                    // stretched-link: the whole card is clickable
                    <Link to={card.to} className="stretched-link text-reset text-decoration-none">
                      {card.title}
                    </Link>
                  ) : (
                    card.title
                  )}
                </div>
                <div className="fw-bold fs-5">{card.value}</div>
                {card.hint && <div className="text-muted small">{card.hint}</div>}
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

