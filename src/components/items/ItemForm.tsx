import { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import type { Item, ItemFormData } from '../../types';

interface Props {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: ItemFormData) => void;
  item?: Item | null;
}

export default function ItemForm({ show, onHide, onSubmit, item }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category || '');
    } else {
      setName('');
      setCategory('');
    }
  }, [item, show]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), category: category.trim() || undefined });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{item ? 'Editar Item' : 'Novo Item'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome do Produto *</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Categoria</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ex: Eletrônicos, Alimentos..."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>Salvar</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

