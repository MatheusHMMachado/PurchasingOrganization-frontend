import { Row, Col, Form, Button } from 'react-bootstrap';
import { FiFilter, FiX } from 'react-icons/fi';
import type { Batch, DashboardFilters } from '../../types';

interface Props {
  filters: DashboardFilters;
  batches: Batch[];
  onChange: (filters: DashboardFilters) => void;
  onClear: () => void;
}

export default function DashboardFilterBar({ filters, batches, onChange, onClear }: Props) {
  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="bg-body-secondary rounded p-3 mb-4">
      <div className="d-flex align-items-center gap-2 mb-2">
        <FiFilter /> <strong className="small">Filtros</strong>
        {hasFilters && (
          <Button size="sm" variant="outline-secondary" onClick={onClear} className="ms-auto">
            <FiX className="me-1" /> Limpar
          </Button>
        )}
      </div>
      <Row className="g-2">
        <Col md={3}>
          <Form.Select
            size="sm"
            value={filters.batch_id ?? ''}
            onChange={(e) => onChange({ ...filters, batch_id: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">Todas as remessas</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Control
            type="number"
            size="sm"
            placeholder="Preço mín."
            value={filters.min_price ?? ''}
            onChange={(e) => onChange({ ...filters, min_price: e.target.value ? Number(e.target.value) : undefined })}
          />
        </Col>
        <Col md={3}>
          <Form.Control
            type="number"
            size="sm"
            placeholder="Preço máx."
            value={filters.max_price ?? ''}
            onChange={(e) => onChange({ ...filters, max_price: e.target.value ? Number(e.target.value) : undefined })}
          />
        </Col>
      </Row>
    </div>
  );
}

