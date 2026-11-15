import { Card, Badge, Button, ButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiEye, FiPackage } from 'react-icons/fi';
import type { Batch } from '../../types';
import PendingBadge from '../pwa/PendingBadge';

interface Props {
  batch: Batch;
  onDelete: (id: number) => void;
  onEdit: (batch: Batch) => void;
}

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: 'Ativa', variant: 'success' },
  completed: { label: 'Concluída', variant: 'primary' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

export default function BatchCard({ batch, onDelete, onEdit }: Props) {
  const status = statusMap[batch.status] || statusMap.active;

  return (
    <Card className="h-100 shadow-sm border-0 hover-shadow transition-all">
      <Card.Body className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title className="mb-0 fw-semibold">
            {batch.name}
            <PendingBadge show={batch._pending} />
          </Card.Title>
          <Badge bg={status.variant} pill>{status.label}</Badge>
        </div>

        {batch.description && (
          <Card.Text className="text-muted small flex-grow-1">
            {batch.description}
          </Card.Text>
        )}

        <div className="d-flex align-items-center text-muted small mb-3">
          <FiPackage className="me-1" />
          <span>{batch.item_count ?? 0} {(batch.item_count ?? 0) === 1 ? 'item' : 'itens'}</span>
        </div>

        <div className="d-flex justify-content-between align-items-center mt-auto">
          <small className="text-muted">
            {new Date(batch.created_at).toLocaleDateString('pt-BR')}
          </small>
          <ButtonGroup size="sm">
            <Button
              as={Link as any}
              to={`/batches/${batch.id}`}
              variant="outline-primary"
              title="Ver detalhes"
            >
              <FiEye />
            </Button>
            <Button
              variant="outline-warning"
              onClick={() => onEdit(batch)}
              title="Editar"
            >
              <FiEdit2 />
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => onDelete(batch.id)}
              title="Excluir"
            >
              <FiTrash2 />
            </Button>
          </ButtonGroup>
        </div>
      </Card.Body>
    </Card>
  );
}

