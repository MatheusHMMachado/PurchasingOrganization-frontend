import { Spinner } from 'react-bootstrap';

interface Props {
  message?: string;
}

export default function Loading({ message = 'Carregando...' }: Props) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <Spinner animation="border" variant="primary" />
      <span className="mt-2 text-muted">{message}</span>
    </div>
  );
}

