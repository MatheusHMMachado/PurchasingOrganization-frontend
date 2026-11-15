import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Badge, Breadcrumb } from 'react-bootstrap';
import toast from 'react-hot-toast';
import ItemList from '../components/items/ItemList';
import { useRefetchOnSync } from '../hooks/useOutbox';
import { resolveId } from '../offline/outbox';
import ItemForm from '../components/items/ItemForm';
import OfferList from '../components/offers/OfferList';
import OfferModal from '../components/offers/OfferModal';
import Loading from '../components/common/Loading';
import {
  getBatch,
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from '../services/api';
import type { Batch, Item, Offer, ItemFormData, OfferFormData } from '../types';

const statusMap: Record<string, { label: string; variant: string }> = {
  active: { label: 'Ativa', variant: 'success' },
  completed: { label: 'Concluída', variant: 'primary' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

export default function BatchDetail() {
  const { id } = useParams<{ id: string }>();
  const batchId = Number(id);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showItemForm, setShowItemForm] = useState(false);
  // Offer modal: which item it belongs to and, when editing, which offer
  const [offerModal, setOfferModal] = useState<{ item: Item; offer: Offer | null } | null>(null);

  // `silent` refreshes keep the list mounted, preserving search/filter state
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [batchData, itemsData] = await Promise.all([
        getBatch(batchId),
        getItems(batchId),
      ]);
      setBatch(batchData);
      setItems(itemsData);
    } catch (err: any) {
      toast.error('Erro ao carregar remessa');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchOffers = useCallback(async (itemId: number) => {
    try {
      const data = await getOffers(itemId);
      setOffers(data);
    } catch {
      toast.error('Erro ao carregar ofertas');
    }
  }, []);

  useEffect(() => {
    if (selectedItem) {
      fetchOffers(selectedItem.id);
    }
  }, [selectedItem, fetchOffers]);

  // Queued offline writes were sent: reload so temp ids and optimistic data become real
  useRefetchOnSync(() => {
    fetchData(true);
    setSelectedItem((prev) => (prev ? { ...prev, id: resolveId(prev.id) } : prev));
  });

  const handleAddItem = async (name: string, category?: string) => {
    try {
      await createItem(batchId, { name, category });
      toast.success('Item adicionado!');
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar item');
    }
  };

  const handleEditItem = async (formData: ItemFormData) => {
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, formData);
      toast.success('Item atualizado!');
      setEditingItem(null);
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Excluir este item e todas as suas ofertas?')) return;
    try {
      await deleteItem(itemId);
      toast.success('Item excluído!');
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
        setOffers([]);
      }
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir item');
    }
  };

  const handleStatusChange = async (itemId: number, status: string) => {
    try {
      await updateItem(itemId, { status });
      fetchData(true);
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    // The panel sits below the list; bring it into view once rendered
    requestAnimationFrame(() =>
      document.getElementById('offers-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  };

  const handleSaveOffer = async (formData: OfferFormData) => {
    if (!offerModal) return;
    const { item, offer } = offerModal;
    try {
      if (offer) {
        await updateOffer(offer.id, formData, item.id);
        toast.success('Promoção atualizada!');
      } else {
        // Backend also marks a pending item as "found"
        await createOffer(item.id, formData);
        toast.success(`Promoção registrada para "${item.name}"!`);
      }
      fetchData(true);
      if (selectedItem?.id === item.id) fetchOffers(item.id);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar promoção');
      throw err; // keeps the modal open
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    if (!selectedItem || !confirm('Excluir esta oferta?')) return;
    try {
      await deleteOffer(offerId, selectedItem.id);
      toast.success('Oferta removida!');
      if (selectedItem) fetchOffers(selectedItem.id);
      fetchData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao remover oferta');
    }
  };

  if (loading) return <Loading />;
  if (!batch) return <div className="text-center py-5 text-danger">Remessa não encontrada.</div>;

  const status = statusMap[batch.status] || statusMap.active;

  return (
    <Container className="py-4">
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/batches' }}>
          Remessas
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{batch.name}</Breadcrumb.Item>
      </Breadcrumb>

      <div className="d-flex align-items-center gap-3 mb-4">
        <h2 className="fw-bold mb-0">{batch.name}</h2>
        <Badge bg={status.variant} pill>{status.label}</Badge>
      </div>

      {batch.description && (
        <p className="text-muted mb-4">{batch.description}</p>
      )}

      {/* Items (ToDo list) */}
      <h5 className="fw-semibold mb-3">🛒 Lista de Itens</h5>
      <ItemList
        items={items}
        onAdd={handleAddItem}
        onEdit={(item) => {
          setEditingItem(item);
          setShowItemForm(true);
        }}
        onDelete={handleDeleteItem}
        onStatusChange={handleStatusChange}
        onSelectItem={handleSelectItem}
        selectedItemId={selectedItem?.id}
        onRegisterOffer={(item) => setOfferModal({ item, offer: null })}
      />

      {/* Offers panel */}
      {selectedItem && (
        <div className="mt-4" id="offers-panel" style={{ scrollMarginTop: 80 }}>
          <OfferList
            offers={offers}
            itemName={selectedItem.name}
            onAddClick={() => setOfferModal({ item: selectedItem, offer: null })}
            onEdit={(offer) => setOfferModal({ item: selectedItem, offer })}
            onDelete={handleDeleteOffer}
            onClose={() => {
              setSelectedItem(null);
              setOffers([]);
            }}
          />
        </div>
      )}

      <OfferModal
        show={offerModal !== null}
        itemName={offerModal?.item.name ?? ''}
        offer={offerModal?.offer}
        onHide={() => setOfferModal(null)}
        onSubmit={handleSaveOffer}
      />

      <ItemForm
        show={showItemForm}
        onHide={() => {
          setShowItemForm(false);
          setEditingItem(null);
        }}
        onSubmit={handleEditItem}
        item={editingItem}
      />
    </Container>
  );
}

