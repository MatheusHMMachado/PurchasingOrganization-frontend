import { useEffect, useState } from 'react';
import { Button, Container, ListGroup, Modal, Spinner } from 'react-bootstrap';
import { FiWifiOff, FiUploadCloud, FiAlertTriangle, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useOutbox } from '../../hooks/useOutbox';
import { dismissFailed, onQueued, retryFailed, syncNow } from '../../offline/outbox';
import type { Mutation } from '../../offline/db';

const describe: Record<Mutation['kind'], string> = {
  createBatch: 'Criar remessa',
  updateBatch: 'Editar remessa',
  deleteBatch: 'Excluir remessa',
  createItem: 'Adicionar item',
  updateItem: 'Editar item',
  deleteItem: 'Excluir item',
  createOffer: 'Registrar promoção',
  updateOffer: 'Editar promoção',
  deleteOffer: 'Excluir promoção',
};

function label(m: Mutation): string {
  const data = 'data' in m ? (m.data as Record<string, unknown>) : {};
  const detail = (data.name as string) || (data.ecommerce as string) || '';
  return detail ? `${describe[m.kind]}: ${detail}` : describe[m.kind];
}

/**
 * Thin bar under the header: offline state, writes waiting to sync, and writes the
 * server rejected during sync (with retry / discard).
 */
export default function SyncStatusBar() {
  const { online, serverReachable, pending, failed, syncing } = useOutbox();
  const [showFailed, setShowFailed] = useState(false);
  const offline = !online || !serverReachable;

  // One toast per burst of offline writes, so the user knows nothing was lost
  useEffect(
    () =>
      onQueued(() =>
        toast('Sem conexão: alteração salva no aparelho e será enviada automaticamente.', {
          id: 'queued',
          icon: '📥',
          duration: 4000,
        }),
      ),
    [],
  );

  // Announce newly rejected writes
  const [seenFailed, setSeenFailed] = useState(failed.length);
  useEffect(() => {
    if (failed.length > seenFailed) {
      toast.error('Algumas alterações offline foram recusadas pelo servidor.', { id: 'failed' });
    }
    setSeenFailed(failed.length);
  }, [failed.length, seenFailed]);

  if (!offline && pending === 0 && failed.length === 0) return null;

  const tone = failed.length > 0 ? 'bg-danger-subtle text-danger-emphasis' : offline ? 'bg-warning-subtle text-warning-emphasis' : 'bg-info-subtle text-info-emphasis';

  return (
    <>
      <div className={`${tone} border-bottom small`} role="status" aria-live="polite">
        <Container className="d-flex flex-wrap align-items-center gap-2 py-2">
          {offline ? (
            <span className="d-inline-flex align-items-center gap-2 fw-medium">
              <FiWifiOff /> {online ? 'Servidor indisponível' : 'Você está offline'} · exibindo os últimos dados salvos
            </span>
          ) : syncing ? (
            <span className="d-inline-flex align-items-center gap-2 fw-medium">
              <Spinner size="sm" animation="border" /> Sincronizando alterações...
            </span>
          ) : null}

          {pending > 0 && (
            <span className="d-inline-flex align-items-center gap-1">
              <FiUploadCloud />
              {pending} {pending === 1 ? 'alteração aguardando' : 'alterações aguardando'} envio
            </span>
          )}

          <div className="ms-auto d-flex gap-2">
            {failed.length > 0 && (
              <Button size="sm" variant="outline-danger" onClick={() => setShowFailed(true)}>
                <FiAlertTriangle className="me-1" />
                {failed.length} {failed.length === 1 ? 'falhou' : 'falharam'}
              </Button>
            )}
            {pending > 0 && online && (
              <Button size="sm" variant="outline-secondary" onClick={() => void syncNow()} disabled={syncing}>
                <FiRefreshCw className="me-1" /> Sincronizar agora
              </Button>
            )}
          </div>
        </Container>
      </div>

      <Modal show={showFailed} onHide={() => setShowFailed(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Alterações não sincronizadas</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small">
            O servidor recusou estas alterações feitas offline (por exemplo, o registro já tinha sido
            excluído ou os dados eram inválidos). Tente de novo ou descarte.
          </p>
          {failed.length === 0 ? (
            <p className="mb-0">Nenhuma pendência.</p>
          ) : (
            <ListGroup>
              {failed.map((f) => (
                <ListGroup.Item key={f.key} className="d-flex align-items-start gap-2">
                  <div className="flex-grow-1">
                    <div className="fw-medium">{label(f.mutation)}</div>
                    <div className="small text-danger">{f.error}</div>
                  </div>
                  <Button size="sm" variant="outline-primary" title="Tentar novamente" onClick={() => void retryFailed(f.key!)}>
                    <FiRefreshCw />
                  </Button>
                  <Button size="sm" variant="outline-danger" title="Descartar" onClick={() => void dismissFailed(f.key!)}>
                    <FiTrash2 />
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
