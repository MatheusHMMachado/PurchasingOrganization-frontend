import { useMemo, useState } from 'react';
import { ListGroup, Badge, Button, ButtonGroup, Form, InputGroup, Nav } from 'react-bootstrap';
import {
  FiPlus, FiEdit2, FiTrash2, FiTag, FiDollarSign, FiCheck, FiSearch, FiList, FiX,
} from 'react-icons/fi';
import type { Item } from '../../types';
import EmptyState from '../common/EmptyState';
import PendingBadge from '../pwa/PendingBadge';
import { formatBRL } from '../../utils/ecommerce';

type StatusFilter = 'all' | Item['status'];

interface Props {
  items: Item[];
  selectedItemId?: number | null;
  onAdd: (name: string, category?: string) => void;
  onEdit: (item: Item) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onSelectItem: (item: Item) => void;
  onRegisterOffer: (item: Item) => void;
}

const statusConfig: Record<Item['status'], { icon: React.ReactNode; variant: string; label: string }> = {
  pending: { icon: <FiSearch size={12} />, variant: 'warning', label: 'Pendente' },
  found: { icon: <FiDollarSign size={12} />, variant: 'info', label: 'Encontrado' },
  purchased: { icon: <FiCheck size={12} />, variant: 'success', label: 'Comprado' },
};

/** Lowercase and strip accents so "cafe" matches "Café". */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function ItemList({
  items, selectedItemId, onAdd, onEdit, onDelete, onStatusChange, onSelectItem, onRegisterOffer,
}: Props) {
  const [newItem, setNewItem] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const counts = useMemo(() => {
    const c = { all: items.length, pending: 0, found: 0, purchased: 0 };
    items.forEach((i) => { c[i.status] += 1; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return normalize(`${item.name} ${item.category ?? ''}`).includes(q);
    });
  }, [items, search, statusFilter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    onAdd(newItem.trim(), newCategory.trim() || undefined);
    setNewItem('');
    setNewCategory('');
  };

  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'found', label: 'Encontrados' },
    { key: 'purchased', label: 'Comprados' },
  ];

  return (
    <div>
      {/* Add item form */}
      <Form onSubmit={handleAdd} className="mb-3">
        <div className="row g-2">
          <div className="col-12 col-md">
            <Form.Control
              type="text"
              placeholder="Nome do produto..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              aria-label="Nome do produto"
            />
          </div>
          <div className="col-8 col-md-3">
            <Form.Control
              type="text"
              placeholder="Categoria (opcional)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              aria-label="Categoria"
            />
          </div>
          <div className="col-4 col-md-auto d-grid">
            <Button type="submit" variant="primary" disabled={!newItem.trim()}>
              <FiPlus className="me-1" /> Adicionar
            </Button>
          </div>
        </div>
      </Form>

      {items.length > 0 && (
        <div className="d-flex flex-column flex-md-row gap-2 align-items-md-center mb-3">
          <InputGroup className="flex-md-grow-1" style={{ maxWidth: 420 }}>
            <InputGroup.Text className="bg-white"><FiSearch /></InputGroup.Text>
            <Form.Control
              type="search"
              placeholder="Buscar item na lista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar item"
            />
            {search && (
              <Button variant="outline-secondary" onClick={() => setSearch('')} title="Limpar busca">
                <FiX />
              </Button>
            )}
          </InputGroup>

          <Nav variant="pills" className="ms-md-auto flex-nowrap overflow-auto small">
            {filters.map((f) => (
              <Nav.Item key={f.key}>
                <Nav.Link
                  active={statusFilter === f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="py-1 px-3 text-nowrap"
                  role="button"
                >
                  {f.label} <span className="opacity-75">({counts[f.key]})</span>
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <EmptyState message="Nenhum item na lista. Adicione produtos acima!" />
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhum item corresponde à busca ou ao filtro." />
      ) : (
        <ListGroup className="shadow-sm">
          {filtered.map((item) => {
            const sc = statusConfig[item.status] ?? statusConfig.pending;
            const offerCount = item.offer_count ?? item.offers?.length ?? 0;
            const hasBest = item.best_price !== null && item.best_price !== undefined;
            const purchased = item.status === 'purchased';

            return (
              <ListGroup.Item
                key={item.id}
                className={`d-flex flex-wrap gap-2 justify-content-between align-items-center py-3 ${
                  selectedItemId === item.id ? 'border-start border-4 border-primary bg-primary-subtle' : ''
                }`}
              >
                <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: 0 }}>
                  <Form.Check
                    type="checkbox"
                    checked={purchased}
                    onChange={() => onStatusChange(item.id, purchased ? 'pending' : 'purchased')}
                    title="Marcar como comprado"
                    aria-label={`Marcar ${item.name} como comprado`}
                  />
                  <div style={{ minWidth: 0 }}>
                    <span
                      className={`fw-medium ${purchased ? 'text-decoration-line-through text-muted' : ''}`}
                      role="button"
                      onClick={() => onSelectItem(item)}
                    >
                      {item.name}
                    </span>
                    {item.category && (
                      <Badge bg="light" text="dark" className="ms-2 fw-normal">
                        <FiTag size={10} className="me-1" />
                        {item.category}
                      </Badge>
                    )}
                    <div className="small text-muted d-flex flex-wrap align-items-center gap-2 mt-1">
                      <Badge bg={sc.variant} pill className="d-inline-flex align-items-center gap-1 fw-normal">
                        {sc.icon} {sc.label}
                      </Badge>
                      <PendingBadge show={item._pending} />
                      {hasBest ? (
                        <span>
                          Melhor: <strong className="text-success">{formatBRL(item.best_price)}</strong>
                          {' · '}
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 align-baseline text-decoration-none"
                            onClick={() => onSelectItem(item)}
                          >
                            {offerCount} {offerCount === 1 ? 'oferta' : 'ofertas'}
                          </button>
                        </span>
                      ) : (
                        <span>Nenhuma oferta ainda</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 ms-auto">
                  {!purchased && (
                    <Button size="sm" variant="success" onClick={() => onRegisterOffer(item)}>
                      <FiPlus className="me-1" />
                      <span className="d-none d-sm-inline">Registrar promoção</span>
                      <span className="d-sm-none">Promoção</span>
                    </Button>
                  )}
                  <ButtonGroup size="sm">
                    <Button variant="outline-primary" onClick={() => onSelectItem(item)} title="Ver ofertas">
                      <FiList />
                    </Button>
                    <Button variant="outline-secondary" onClick={() => onEdit(item)} title="Editar nome/categoria">
                      <FiEdit2 />
                    </Button>
                    <Button variant="outline-danger" onClick={() => onDelete(item.id)} title="Excluir">
                      <FiTrash2 />
                    </Button>
                  </ButtonGroup>
                </div>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      )}
    </div>
  );
}
