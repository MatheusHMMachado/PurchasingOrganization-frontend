import { Card, Table, Button, ButtonGroup, Badge } from 'react-bootstrap';
import { FiPlus, FiTrash2, FiExternalLink, FiAward, FiEdit2, FiX } from 'react-icons/fi';
import type { Offer } from '../../types';
import EmptyState from '../common/EmptyState';
import PendingBadge from '../pwa/PendingBadge';
import { formatBRL, safeHostname } from '../../utils/ecommerce';

interface Props {
  offers: Offer[];
  itemName: string;
  onAddClick: () => void;
  onEdit: (offer: Offer) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export default function OfferList({ offers, itemName, onAddClick, onEdit, onDelete, onClose }: Props) {
  const bestPrice = offers.length > 0 ? Math.min(...offers.map((o) => Number(o.price))) : null;
  const sorted = [...offers].sort((a, b) => Number(a.price) - Number(b.price));

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <h6 className="mb-0">Ofertas para: <strong>{itemName}</strong></h6>
        <div className="d-flex gap-2">
          <Button size="sm" variant="success" onClick={onAddClick}>
            <FiPlus className="me-1" /> Registrar promoção
          </Button>
          <Button size="sm" variant="outline-secondary" onClick={onClose} title="Fechar painel">
            <FiX />
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        {sorted.length === 0 ? (
          <EmptyState message="Nenhuma oferta registrada. Adicione promoções encontradas!" />
        ) : (
          <Table hover responsive className="mb-0 align-middle">
            <thead>
              <tr>
                <th>E-commerce</th>
                <th>Preço</th>
                <th>Link</th>
                <th>Data</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((offer) => {
                const isBest = Number(offer.price) === bestPrice;
                const host = safeHostname(offer.link);
                return (
                  <tr key={offer.id}>
                    <td className="fw-medium">{offer.ecommerce}<PendingBadge show={offer._pending} /></td>
                    <td className="text-nowrap">
                      <span className={`fw-bold ${isBest ? 'text-success' : ''}`}>
                        {formatBRL(offer.price)}
                      </span>
                      {isBest && (
                        <Badge bg="success" className="ms-1" pill>
                          <FiAward size={10} /> Melhor
                        </Badge>
                      )}
                    </td>
                    <td>
                      {host ? (
                        <a
                          href={offer.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-truncate d-inline-block"
                          style={{ maxWidth: 250 }}
                        >
                          <FiExternalLink className="me-1" />
                          {host}
                        </a>
                      ) : (
                        <span className="text-muted small text-truncate d-inline-block" style={{ maxWidth: 250 }} title={offer.link}>
                          {offer.link}
                        </span>
                      )}
                    </td>
                    <td className="text-muted small text-nowrap">
                      {new Date(offer.found_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="text-end">
                      <ButtonGroup size="sm">
                        <Button variant="outline-secondary" onClick={() => onEdit(offer)} title="Editar oferta">
                          <FiEdit2 />
                        </Button>
                        <Button variant="outline-danger" onClick={() => onDelete(offer.id)} title="Excluir oferta">
                          <FiTrash2 />
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
