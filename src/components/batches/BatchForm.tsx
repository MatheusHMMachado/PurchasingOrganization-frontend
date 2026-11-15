import { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import type { Batch, BatchFormData } from '../../types';

interface Props {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: BatchFormData) => void;
  batch?: Batch | null;
}

export default function BatchForm({ show, onHide, onSubmit, batch }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (batch) {
      setName(batch.name);
      setDescription(batch.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [batch, show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() || undefined });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{batch ? 'Editar Remessa' : 'Nova Remessa'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome da Remessa *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ex: Compras de Novembro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Descrição</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Descrição opcional..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>
            {batch ? 'Salvar' : 'Criar'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

