import { FiInbox } from 'react-icons/fi';

interface Props {
  message?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ message = 'Nenhum dado encontrado.', icon }: Props) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
      {icon || <FiInbox size={48} className="mb-3 opacity-50" />}
      <p className="mb-0">{message}</p>
    </div>
  );
}

