import { useEffect, useRef, useState } from 'react';
import { Modal, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import { FiLink, FiShoppingBag, FiCheck } from 'react-icons/fi';
import type { Offer, OfferFormData } from '../../types';
import {
  ECOMMERCE_OPTIONS,
  detectEcommerce,
  isHttpUrl,
  parsePrice,
  safeHostname,
} from '../../utils/ecommerce';

interface Props {
  show: boolean;
  itemName: string;
  /** When provided, the modal edits this offer instead of creating a new one */
  offer?: Offer | null;
  /** Pre-fills the link for a new offer (e.g. a link shared from another app) */
  initialLink?: string;
  onHide: () => void;
  onSubmit: (data: OfferFormData) => Promise<void>;
}

export default function OfferModal({ show, itemName, offer, initialLink, onHide, onSubmit }: Props) {
  const [link, setLink] = useState('');
  const [ecommerce, setEcommerce] = useState('');
  const [price, setPrice] = useState('');
  const [ecommerceTouched, setEcommerceTouched] = useState(false);
  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(offer);

  useEffect(() => {
    if (!show) return;
    const startLink = offer?.link ?? initialLink ?? '';
    setLink(startLink);
    setEcommerce(offer?.ecommerce ?? (startLink ? detectEcommerce(startLink) ?? (safeHostname(startLink) ? 'Outro' : '') : ''));
    setPrice(offer ? String(Number(offer.price).toFixed(2)).replace('.', ',') : '');
    setEcommerceTouched(Boolean(offer));
    setValidated(false);
    setSaving(false);
  }, [show, offer, initialLink]);

  const handleLinkChange = (value: string) => {
    setLink(value);
    if (!ecommerceTouched) {
      const detected = detectEcommerce(value);
      if (detected) setEcommerce(detected);
      else if (safeHostname(value)) setEcommerce('Outro');
    }
  };

  const linkValid = isHttpUrl(link) && link.trim().length <= 2048;
  const parsedPrice = parsePrice(price);
  const formValid = linkValid && Boolean(ecommerce) && parsedPrice !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidated(true);
    if (!formValid || parsedPrice === null) return;

    setSaving(true);
    try {
      await onSubmit({ link: link.trim(), ecommerce, price: parsedPrice });
      onHide();
    } catch {
      // Error toast is handled by the caller; keep the modal open so data isn't lost
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered onEntered={() => (link ? priceRef : linkRef).current?.focus()}>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">
            {isEdit ? 'Editar promoção' : 'Registrar promoção'}
            <div className="fs-6 fw-normal text-muted mt-1">{itemName}</div>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="d-grid gap-3">
          <Form.Group controlId="offer-link">
            <Form.Label className="fw-medium">Link da promoção</Form.Label>
            <InputGroup hasValidation>
              <InputGroup.Text><FiLink /></InputGroup.Text>
              <Form.Control
                ref={linkRef}
                type="url"
                inputMode="url"
                placeholder="Cole aqui o link do produto"
                value={link}
                onChange={(e) => handleLinkChange(e.target.value)}
                isInvalid={validated && !linkValid}
                required
              />
              <Form.Control.Feedback type="invalid">
                Informe um link válido (começando com http:// ou https://).
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          <div className="row g-3">
            <Form.Group className="col-sm-6" controlId="offer-ecommerce">
              <Form.Label className="fw-medium">E-commerce</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text><FiShoppingBag /></InputGroup.Text>
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
                  {/* Keep legacy values that are not in the list */}
                  {ecommerce && !ECOMMERCE_OPTIONS.includes(ecommerce as never) && (
                    <option value={ecommerce}>{ecommerce}</option>
                  )}
                </Form.Select>
                <Form.Control.Feedback type="invalid">Selecione a loja.</Form.Control.Feedback>
              </InputGroup>
              {!ecommerceTouched && ecommerce && (
                <Form.Text className="text-success">Detectado pelo link</Form.Text>
              )}
            </Form.Group>

            <Form.Group className="col-sm-6" controlId="offer-price">
              <Form.Label className="fw-medium">Valor encontrado</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text>R$</InputGroup.Text>
                <Form.Control
                  ref={priceRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  isInvalid={validated && parsedPrice === null}
                  required
                />
                <Form.Control.Feedback type="invalid">Informe um valor válido.</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? (
              <Spinner size="sm" animation="border" className="me-1" />
            ) : (
              <FiCheck className="me-1" />
            )}
            {isEdit ? 'Salvar alterações' : 'Salvar promoção'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
