import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FiPlus, FiPackage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import BatchCard from '../components/batches/BatchCard';
import BatchForm from '../components/batches/BatchForm';
import Loading from '../components/common/Loading';
import EmptyState from '../components/common/EmptyState';
import { getBatches, createBatch, updateBatch, deleteBatch } from '../services/api';
import type { Batch, BatchFormData } from '../types';
import { useRefetchOnSync } from '../hooks/useOutbox';

export default function Batches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBatches();
      setBatches(data);
    } catch (err: any) {
      toast.error('Erro ao carregar remessas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useRefetchOnSync(fetchBatches);

  const handleCreate = async (formData: BatchFormData) => {
    try {
      await createBatch(formData);
      toast.success('Remessa criada com sucesso!');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao criar remessa');
    }
  };

  const handleUpdate = async (formData: BatchFormData) => {
    if (!editingBatch) return;
    try {
      await updateBatch(editingBatch.id, formData);
      toast.success('Remessa atualizada!');
      setEditingBatch(null);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta remessa?')) return;
    try {
      await deleteBatch(id);
      toast.success('Remessa excluída!');
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  if (loading) return <Loading />;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0 d-flex align-items-center gap-2">
          <FiPackage className="text-primary" strokeWidth={1.75} aria-hidden="true" />
          Remessas de Compra
        </h2>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <FiPlus className="me-1" /> Nova Remessa
        </Button>
      </div>

      {batches.length === 0 ? (
        <EmptyState message="Nenhuma remessa criada. Clique em 'Nova Remessa' para começar!" />
      ) : (
        <Row className="g-3">
          {batches.map((batch) => (
            <Col sm={6} lg={4} key={batch.id}>
              <BatchCard
                batch={batch}
                onDelete={handleDelete}
                onEdit={(b) => {
                  setEditingBatch(b);
                  setShowForm(true);
                }}
              />
            </Col>
          ))}
        </Row>
      )}

      <BatchForm
        show={showForm}
        onHide={() => {
          setShowForm(false);
          setEditingBatch(null);
        }}
        onSubmit={editingBatch ? handleUpdate : handleCreate}
        batch={editingBatch}
      />
    </Container>
  );
}

