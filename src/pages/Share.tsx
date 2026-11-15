import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Alert, Badge, Button, Container, Form, InputGroup, ListGroup } from 'react-bootstrap';
import { FiSearch, FiLink, FiPlus, FiShare2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import OfferModal from '../components/offers/OfferModal';
import { createItem, createOffer, getBatches, getItems } from '../services/api';
import { safeHostname, formatBRL } from '../utils/ecommerce';
import type { Batch, Item, OfferFormData } from '../types';

/** Android apps put the shared link in `url`, `text` ("Look at this! https://...") or `title`. */
function extractLink(params: URLSearchParams): string {
  for (const key of ['url', 'text', 'title']) {
    const match = params.get(key)?.match(/https?:\/\/\S+/i);
    if (match) return match[0].replace(/[).,;!?]+$/, '');
  }
  return '';
}

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

type Row = { item: Item; batch: Batch };

/**
 * Web Share Target: "Compartilhar → Compras" in any app opens this page with the product
 * link. The user picks which list item the promotion belongs to and saves it.
 */
export default function Share() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sharedLink = useMemo(() => extractLink(params), [params]);
  const sharedTitle = params.get('title') ?? '';

  const [rows, setRows] = useState<Row[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<Row | null>(null);
  const [newItemBatch, setNewItemBatch] = useState<number | ''>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const active = (await getBatches()).filter((b) => b.status === 'active');
      const lists = await Promise.all(active.map((b) => getItems(b.id).catch(() => [] as Item[])));
      setBatches(active);
      setNewItemBatch(active[0]?.id ?? '');
      setRows(
        active.flatMap((batch, i) =>
          lists[i].filter((item) => item.status !== 'purchased').map((item) => ({ item, batch })),
        ),
      );
    } catch {
      toast.error('Não foi possível carregar suas listas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return rows;
    return rows.filter(({ item }) => normalize(`${item.name} ${item.category ?? ''}`).includes(q));
  }, [rows, search]);

  const handleSave = async (data: OfferFormData) => {
    if (!target) return;
    try {
      await createOffer(target.item.id, data);
      toast.success(`Promoção registrada para "${target.item.name}"!`);
      navigate(`/batches/${target.batch.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar promoção');
      throw err;
    }
  };

  const handleCreateItem = async () => {
    const name = search.trim();
    const batch = batches.find((b) => b.id === newItemBatch);
    if (!name || !batch) return;
    try {
      const item = await createItem(batch.id, { name });
      setTarget({ item, batch });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar item');
    }
  };

  if (loading) return <Loading />;

  return (
    <Container className="py-4" style={{ maxWidth: 720 }}>
      <h2 className="fw-bold mb-3 d-flex align-items-center gap-2">
        <FiShare2 /> Registrar promoção compartilhada
      </h2>

      {sharedLink ? (
        <Alert variant="light" className="border d-flex align-items-center gap-2 py-2">
          <FiLink className="flex-shrink-0" />
          <div className="text-truncate">
            {sharedTitle && <div className="fw-medium text-truncate">{sharedTitle}</div>}
            <span className="small text-muted">{safeHostname(sharedLink) ?? sharedLink}</span>
          </div>
        </Alert>
      ) : (
        <Alert variant="warning" className="py-2">
          Nenhum link foi recebido. Você ainda pode escolher o item e colar o link manualmente.
        </Alert>
      )}

      <p className="text-muted mb-2">Para qual item da sua lista é esta promoção?</p>

      <InputGroup className="mb-3">
        <InputGroup.Text className="bg-white"><FiSearch /></InputGroup.Text>
        <Form.Control
          type="search"
          autoFocus
          placeholder="Buscar item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar item"
        />
      </InputGroup>

      {batches.length === 0 ? (
        <EmptyState message="Você não tem remessas ativas. Crie uma remessa primeiro." />
      ) : (
        <>
          {filtered.length > 0 ? (
            <ListGroup className="shadow-sm mb-3">
              {filtered.map(({ item, batch }) => (
                <ListGroup.Item
                  key={`${batch.id}-${item.id}`}
                  action
                  onClick={() => setTarget({ item, batch })}
                  className="d-flex justify-content-between align-items-center gap-2 py-3"
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="fw-medium text-truncate">{item.name}</div>
                    <div className="small text-muted text-truncate">{batch.name}</div>
                  </div>
                  {item.best_price !== null && item.best_price !== undefined ? (
                    <Badge bg="success-subtle" text="success-emphasis" pill className="flex-shrink-0">
                      Melhor: {formatBRL(item.best_price)}
                    </Badge>
                  ) : (
                    <Badge bg="light" text="secondary" pill className="flex-shrink-0">Sem ofertas</Badge>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-muted">Nenhum item encontrado.</p>
          )}

          {search.trim() && (
            <div className="d-flex flex-wrap gap-2 align-items-center border rounded p-2 bg-white">
              <span className="small">Adicionar <strong>"{search.trim()}"</strong> em</span>
              <Form.Select
                size="sm"
                style={{ width: 'auto' }}
                value={newItemBatch}
                onChange={(e) => setNewItemBatch(Number(e.target.value))}
                aria-label="Remessa"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Form.Select>
              <Button size="sm" variant="outline-primary" onClick={handleCreateItem}>
                <FiPlus className="me-1" /> Novo item
              </Button>
            </div>
          )}
        </>
      )}

      <div className="mt-4">
        <Link to="/batches" className="small">Voltar para remessas</Link>
      </div>

      <OfferModal
        show={target !== null}
        itemName={target?.item.name ?? ''}
        initialLink={sharedLink}
        onHide={() => setTarget(null)}
        onSubmit={handleSave}
      />
    </Container>
  );
}
