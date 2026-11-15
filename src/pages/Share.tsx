import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Alert, Button, Card, Container, Form, InputGroup, ListGroup, Spinner } from 'react-bootstrap';
import { FiLink, FiPackage, FiPlus, FiShare2, FiShoppingBag, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Loading from '../components/common/Loading';
import { createBatch, createItem, createOffer, getBatches, getItems } from '../services/api';
import { ECOMMERCE_OPTIONS, detectEcommerce, isHttpUrl, parsePrice, safeHostname } from '../utils/ecommerce';
import { parseSharedProduct } from '../utils/share';
import type { Batch, Item } from '../types';

const NEW_BATCH = 'new';
const NEW_ITEM = 'new';

const storeFor = (link: string) => (link ? detectEcommerce(link) ?? (safeHostname(link) ? 'Outro' : '') : '');

/**
 * Web Share Target: "Compartilhar → Compras" in Amazon, Mercado Livre, the browser... opens
 * this page with the product link. Name, store (and price, when the app sends it) are
 * pre-filled; the user picks the batch (or creates one) and the product + offer are saved.
 */
export default function Share() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shared = useMemo(() => parseSharedProduct(params), [params]);

  // Product / offer
  const [name, setName] = useState(shared.name);
  const [link, setLink] = useState(shared.link);
  const [ecommerce, setEcommerce] = useState(storeFor(shared.link));
  const [ecommerceTouched, setEcommerceTouched] = useState(false);
  const [price, setPrice] = useState(shared.priceText);

  // Destination
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchChoice, setBatchChoice] = useState<string>('');
  const [newBatchName, setNewBatchName] = useState('');
  const [batchItems, setBatchItems] = useState<Item[]>([]);
  const [itemChoice, setItemChoice] = useState<string>(NEW_ITEM);

  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  // If a step fails after the batch/item was created, a retry reuses them instead of duplicating
  const created = useRef<{ batch?: Batch; item?: Item }>({});
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getBatches()
      .then((all) => {
        const active = all.filter((b) => b.status === 'active');
        setBatches(active);
        setBatchChoice(active.length === 1 ? String(active[0].id) : active.length === 0 ? NEW_BATCH : '');
      })
      .catch(() => {
        toast.error('Não foi possível carregar suas remessas');
        setBatchChoice(NEW_BATCH);
      })
      .finally(() => setLoading(false));
  }, []);

  // Items of the chosen batch, so the offer can go to a product already on the list
  useEffect(() => {
    setItemChoice(NEW_ITEM);
    setBatchItems([]);
    created.current.item = undefined; // an item created by a failed attempt belongs to the old batch
    if (!batchChoice || batchChoice === NEW_BATCH) return;
    let cancelled = false;
    getItems(Number(batchChoice))
      .then((items) => !cancelled && setBatchItems(items.filter((i) => i.status !== 'purchased')))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [batchChoice]);

  // Name and link usually come filled: start at the price
  useEffect(() => {
    if (!loading && shared.link && !shared.priceText) priceRef.current?.focus();
  }, [loading, shared.link, shared.priceText]);

  const handleLinkChange = (value: string) => {
    setLink(value);
    if (!ecommerceTouched) setEcommerce(storeFor(value.trim()));
  };

  const existingItem = batchItems.find((i) => String(i.id) === itemChoice);
  const parsedPrice = parsePrice(price);
  const linkValid = isHttpUrl(link) && link.trim().length <= 2048;
  const nameValid = Boolean(existingItem) || name.trim().length > 0;
  const batchValid = batchChoice === NEW_BATCH ? newBatchName.trim().length > 0 : Boolean(batchChoice);
  const formValid = nameValid && linkValid && Boolean(ecommerce) && parsedPrice !== null && batchValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidated(true);
    if (!formValid || parsedPrice === null) return;

    setSaving(true);
    try {
      let batch = batchChoice === NEW_BATCH
        ? created.current.batch
        : batches.find((b) => String(b.id) === batchChoice);
      if (!batch) {
        batch = await createBatch({ name: newBatchName.trim() });
        created.current.batch = batch;
      }

      let item = existingItem ?? created.current.item;
      if (!item) {
        item = await createItem(batch.id, { name: name.trim() });
        created.current.item = item;
      }

      await createOffer(item.id, { link: link.trim(), ecommerce, price: parsedPrice });

      toast.success(`"${item.name}" adicionado em ${batch.name}`);
      navigate(`/batches/${batch.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Não foi possível salvar. Tente novamente.');
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Container className="py-4" style={{ maxWidth: 720 }}>
      <h2 className="fw-bold mb-3 d-flex align-items-center gap-2">
        <FiShare2 className="text-primary" strokeWidth={1.75} aria-hidden="true" />
        Adicionar produto compartilhado
      </h2>

      {!shared.link && (
        <Alert variant="warning" className="py-2">
          Nenhum link foi recebido. Você pode colar o link do produto abaixo.
        </Alert>
      )}

      <Form noValidate onSubmit={handleSubmit} className="d-grid gap-3">
        {/* 1. Product and offer, pre-filled from the shared data */}
        <Card className="border-0 shadow-sm">
          <Card.Body className="d-grid gap-3">
            <Form.Group controlId="share-name">
              <Form.Label className="fw-medium">Produto</Form.Label>
              <Form.Control
                value={existingItem ? existingItem.name : name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do produto"
                disabled={Boolean(existingItem)}
                isInvalid={validated && !nameValid}
                maxLength={255}
                required
              />
              <Form.Control.Feedback type="invalid">Informe o nome do produto.</Form.Control.Feedback>
            </Form.Group>

            <Form.Group controlId="share-link">
              <Form.Label className="fw-medium">Link</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text><FiLink aria-hidden="true" /></InputGroup.Text>
                <Form.Control
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  placeholder="https://..."
                  isInvalid={validated && !linkValid}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  Informe um link válido (começando com http:// ou https://).
                </Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <div className="row g-3">
              <Form.Group className="col-sm-6" controlId="share-ecommerce">
                <Form.Label className="fw-medium">Loja</Form.Label>
                <InputGroup hasValidation>
                  <InputGroup.Text><FiShoppingBag aria-hidden="true" /></InputGroup.Text>
                  <Form.Select
                    value={ecommerce}
                    onChange={(e) => {
                      setEcommerce(e.target.value);
                      setEcommerceTouched(true);
                    }}
                    isInvalid={validated && !ecommerce}
                    required
                  >
                    <option value="">Selecione...</option>
                    {ECOMMERCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">Selecione a loja.</Form.Control.Feedback>
                </InputGroup>
              </Form.Group>

              <Form.Group className="col-sm-6" controlId="share-price">
                <Form.Label className="fw-medium">Preço</Form.Label>
                <InputGroup hasValidation>
                  <InputGroup.Text>R$</InputGroup.Text>
                  <Form.Control
                    ref={priceRef}
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0,00"
                    isInvalid={validated && parsedPrice === null}
                    required
                  />
                  <Form.Control.Feedback type="invalid">Informe o preço encontrado.</Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
            </div>
          </Card.Body>
        </Card>

        {/* 2. Which batch */}
        <div>
          <div className="fw-medium mb-2">Em qual remessa?</div>
          <ListGroup className="shadow-sm">
            {batches.map((b) => (
              <ListGroup.Item key={b.id} as="label" action className="d-flex align-items-center gap-2 py-3">
                <Form.Check
                  type="radio"
                  name="share-batch"
                  checked={batchChoice === String(b.id)}
                  onChange={() => setBatchChoice(String(b.id))}
                  aria-label={b.name}
                />
                <FiPackage className="text-muted flex-shrink-0" aria-hidden="true" />
                <span className="text-truncate">{b.name}</span>
                <span className="ms-auto small text-muted flex-shrink-0">
                  {b.item_count ?? 0} {(b.item_count ?? 0) === 1 ? 'item' : 'itens'}
                </span>
              </ListGroup.Item>
            ))}
            <ListGroup.Item as="label" action className="d-flex align-items-center gap-2 py-3">
              <Form.Check
                type="radio"
                name="share-batch"
                checked={batchChoice === NEW_BATCH}
                onChange={() => setBatchChoice(NEW_BATCH)}
                aria-label="Nova remessa"
              />
              <FiPlus className="text-primary flex-shrink-0" aria-hidden="true" />
              <span>Nova remessa</span>
            </ListGroup.Item>
          </ListGroup>
          {validated && !batchChoice && (
            <div className="small text-danger mt-1">Escolha a remessa.</div>
          )}

          {batchChoice === NEW_BATCH && (
            <Form.Group controlId="share-new-batch" className="mt-2">
              <Form.Control
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="Nome da nova remessa"
                isInvalid={validated && !newBatchName.trim()}
                maxLength={255}
                autoFocus
                required
              />
              <Form.Control.Feedback type="invalid">Informe o nome da remessa.</Form.Control.Feedback>
            </Form.Group>
          )}

          {/* Avoid duplicates: the product may already be on that batch's list */}
          {batchItems.length > 0 && (
            <Form.Group controlId="share-item" className="mt-3">
              <Form.Label className="small text-muted mb-1 d-flex align-items-center gap-1">
                <FiTag aria-hidden="true" /> O produto já está na lista desta remessa?
              </Form.Label>
              <Form.Select value={itemChoice} onChange={(e) => setItemChoice(e.target.value)}>
                <option value={NEW_ITEM}>Não, adicionar como novo produto</option>
                {batchItems.map((i) => (
                  <option key={i.id} value={i.id}>Sim: {i.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <Link to="/batches" className="small">Cancelar</Link>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-2" /> : <FiPlus className="me-1" aria-hidden="true" />}
            Adicionar à remessa
          </Button>
        </div>
      </Form>
    </Container>
  );
}
