import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import toast from 'react-hot-toast';
import SummaryCards from '../components/dashboard/SummaryCards';
import PriceComparisonChart from '../components/dashboard/PriceComparisonChart';
import PriceTrendChart from '../components/dashboard/PriceTrendChart';
import EcommerceDistributionChart from '../components/dashboard/EcommerceDistributionChart';
import DashboardFilterBar from '../components/dashboard/DashboardFilters';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import { getDashboard, getBatches } from '../services/api';
import type { DashboardData, DashboardFilters, Batch } from '../types';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, batchList] = await Promise.all([
        getDashboard(filters),
        getBatches(),
      ]);
      setData(dashboardData);
      setBatches(batchList);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <Loading message="Carregando dashboard..." />;

  if (!data) return <EmptyState message="Erro ao carregar os dados do dashboard." />;

  return (
    <Container className="py-4">
      <h2 className="fw-bold mb-4">📊 Dashboard</h2>

      <DashboardFilterBar
        filters={filters}
        batches={batches}
        onChange={setFilters}
        onClear={() => setFilters({})}
      />

      <SummaryCards summary={data.summary} />

      <Row className="g-3 mb-3">
        <Col lg={8}>
          <PriceComparisonChart data={data.price_by_ecommerce} />
        </Col>
        <Col lg={4}>
          <EcommerceDistributionChart data={data.ecommerce_distribution} />
        </Col>
      </Row>

      <Row className="g-3">
        <Col xs={12}>
          <PriceTrendChart data={data.price_trend} />
        </Col>
      </Row>
    </Container>
  );
}

