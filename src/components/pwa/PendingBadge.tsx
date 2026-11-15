import { Badge } from 'react-bootstrap';
import { FiUploadCloud } from 'react-icons/fi';

/** Marks records with offline changes not yet confirmed by the server. */
export default function PendingBadge({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <Badge
      bg="secondary-subtle"
      text="secondary-emphasis"
      pill
      className="d-inline-flex align-items-center gap-1 fw-normal ms-1"
      title="Alteração feita offline, será enviada quando houver conexão"
    >
      <FiUploadCloud size={11} /> Pendente de envio
    </Badge>
  );
}
