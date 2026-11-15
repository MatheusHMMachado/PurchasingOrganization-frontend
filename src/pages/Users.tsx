import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Form, ListGroup, Modal, Spinner } from 'react-bootstrap';
import { FiEdit2, FiKey, FiPlus, FiTrash2, FiUser, FiUsers } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Loading from '../components/common/Loading';
import { useAuth } from '../hooks/useAuth';
import {
  changeMyPassword,
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  userErrorMessage,
  type UserAccount,
} from '../services/users';

/** Timestamps come from PostgreSQL in UTC without a zone ("2026-11-15 14:56:15.15"). */
function formatDateTime(value: string | null): string {
  if (!value) return 'Nunca';
  const d = new Date(value.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? '' : 'Z'));
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; user: UserAccount }
  | { kind: 'delete'; user: UserAccount }
  | { kind: 'my-password' }
  | null;

/**
 * Login accounts. All users see the same data; this page only controls who can log in.
 * Every change asks for the logged-in user's current password.
 */
export default function Users() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await getUsers());
    } catch (err) {
      toast.error(userErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading />;

  return (
    <Container className="py-4" style={{ maxWidth: 860 }}>
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <h2 className="fw-bold mb-0 d-flex align-items-center gap-2">
          <FiUsers className="text-primary" strokeWidth={1.75} aria-hidden="true" />
          Usuários
        </h2>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => setDialog({ kind: 'my-password' })}>
            <FiKey className="me-1" aria-hidden="true" /> Alterar minha senha
          </Button>
          <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
            <FiPlus className="me-1" aria-hidden="true" /> Novo usuário
          </Button>
        </div>
      </div>

      <p className="text-muted small">
        Todos os usuários acessam as mesmas remessas. Aqui você controla quem pode entrar.
      </p>

      <ListGroup className="shadow-sm">
        {users.map((u) => {
          const isMe = u.id === session?.user_id;
          return (
            <ListGroup.Item key={u.id} className="d-flex align-items-center gap-3 py-3">
              <FiUser className="text-muted flex-shrink-0" size={20} aria-hidden="true" />
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="fw-medium text-truncate">
                  {u.username}
                  {isMe && <Badge bg="primary-subtle" text="primary-emphasis" className="ms-2 fw-normal">você</Badge>}
                </div>
                <div className="small text-muted">
                  Último acesso: {formatDateTime(u.last_login_at)} · Criado em {formatDateTime(u.created_at)}
                </div>
              </div>
              <div className="d-flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline-warning"
                  onClick={() => setDialog({ kind: 'edit', user: u })}
                  title="Editar"
                  aria-label={`Editar ${u.username}`}
                >
                  <FiEdit2 aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => setDialog({ kind: 'delete', user: u })}
                  disabled={isMe || users.length <= 1}
                  title={isMe ? 'Você não pode excluir o seu próprio usuário' : 'Excluir'}
                  aria-label={`Excluir ${u.username}`}
                >
                  <FiTrash2 aria-hidden="true" />
                </Button>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>

      {dialog?.kind === 'create' && (
        <UserFormModal
          title="Novo usuário"
          onHide={() => setDialog(null)}
          onSubmit={async ({ username, password, current }) => {
            await createUser(username, password, current);
            toast.success(`Usuário "${username}" criado`);
            await load();
          }}
        />
      )}

      {dialog?.kind === 'edit' && (
        <UserFormModal
          title={`Editar ${dialog.user.username}`}
          user={dialog.user}
          isMe={dialog.user.id === session?.user_id}
          onHide={() => setDialog(null)}
          onSubmit={async ({ username, password, current }) => {
            const changes: { username?: string; password?: string } = {};
            if (username !== dialog.user.username) changes.username = username;
            if (password) changes.password = password;
            await updateUser(dialog.user.id, changes, current);
            toast.success('Usuário atualizado');
            await load();
          }}
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmPasswordModal
          title={`Excluir ${dialog.user.username}?`}
          message="Esse usuário não poderá mais entrar, e as sessões abertas dele são encerradas. As remessas continuam."
          confirmLabel="Excluir"
          variant="danger"
          onHide={() => setDialog(null)}
          onConfirm={async (current) => {
            await deleteUser(dialog.user.id, current);
            toast.success(`Usuário "${dialog.user.username}" excluído`);
            await load();
          }}
        />
      )}

      {dialog?.kind === 'my-password' && <MyPasswordModal onHide={() => setDialog(null)} />}
    </Container>
  );
}

// ---------------------------------------------------------------------------

interface UserFormValues {
  username: string;
  password: string;
  current: string;
}

function UserFormModal({
  title,
  user,
  isMe = false,
  onHide,
  onSubmit,
}: {
  title: string;
  user?: UserAccount;
  isMe?: boolean;
  onHide: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(user);
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const usernameValid = /^[A-Za-z0-9._-]{3,50}$/.test(username.trim());
  const passwordRequired = !isEdit;
  const passwordValid = password === '' ? !passwordRequired : password.length >= 10;
  const confirmValid = password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!usernameValid) return setError('O usuário deve ter de 3 a 50 caracteres (letras, números, ponto, hífen ou sublinhado).');
    if (!passwordValid) return setError('A senha deve ter pelo menos 10 caracteres.');
    if (!confirmValid) return setError('A confirmação não confere com a senha.');
    if (!current) return setError('Informe a sua senha atual para confirmar.');
    if (isEdit && username.trim() === user!.username && !password) return setError('Nada foi alterado.');

    setSaving(true);
    try {
      await onSubmit({ username: username.trim(), password, current });
      onHide();
    } catch (err) {
      setError(userErrorMessage(err));
      setCurrent('');
      setSaving(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          {error && <Alert variant="danger" className="py-2 small mb-0">{error}</Alert>}

          <Form.Group controlId="user-username">
            <Form.Label className="fw-medium">Usuário</Form.Label>
            <Form.Control
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={50}
              autoFocus
            />
          </Form.Group>

          <Form.Group controlId="user-password">
            <Form.Label className="fw-medium">{isEdit ? 'Nova senha' : 'Senha'}</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={72}
              placeholder={isEdit ? 'Deixe em branco para manter a atual' : 'Mínimo de 10 caracteres'}
            />
            {isEdit && password && (
              <Form.Text>
                {isMe
                  ? 'Seus outros aparelhos serão desconectados.'
                  : 'Esse usuário será desconectado de todos os aparelhos.'}
              </Form.Text>
            )}
          </Form.Group>

          {password && (
            <Form.Group controlId="user-confirm">
              <Form.Label className="fw-medium">Confirmar senha</Form.Label>
              <Form.Control
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                maxLength={72}
                isInvalid={confirm !== '' && !confirmValid}
              />
            </Form.Group>
          )}

          <hr className="my-1" />
          <Form.Group controlId="user-current">
            <Form.Label className="fw-medium">Sua senha atual</Form.Label>
            <Form.Control
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
            <Form.Text>Para confirmar que é você fazendo a alteração.</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving && <Spinner size="sm" className="me-2" />}
            Salvar
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function ConfirmPasswordModal({
  title,
  message,
  confirmLabel,
  variant,
  onHide,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  variant: string;
  onHide: () => void;
  onConfirm: (currentPassword: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return setError('Informe a sua senha atual para confirmar.');
    setSaving(true);
    setError('');
    try {
      await onConfirm(current);
      onHide();
    } catch (err) {
      setError(userErrorMessage(err));
      setCurrent('');
      setSaving(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          <p className="mb-0">{message}</p>
          {error && <Alert variant="danger" className="py-2 small mb-0">{error}</Alert>}
          <Form.Group controlId="confirm-current">
            <Form.Label className="fw-medium">Sua senha atual</Form.Label>
            <Form.Control
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button type="submit" variant={variant} disabled={saving}>
            {saving && <Spinner size="sm" className="me-2" />}
            {confirmLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function MyPasswordModal({ onHide }: { onHide: () => void }) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!current) return setError('Informe a sua senha atual.');
    if (password.length < 10) return setError('A nova senha deve ter pelo menos 10 caracteres.');
    if (password !== confirm) return setError('A confirmação não confere com a nova senha.');
    if (password === current) return setError('A nova senha deve ser diferente da atual.');

    setSaving(true);
    try {
      await changeMyPassword(current, password);
      toast.success('Senha alterada. Seus outros aparelhos foram desconectados.');
      onHide();
    } catch (err) {
      setError(userErrorMessage(err));
      setCurrent('');
      setSaving(false);
    }
  };

  return (
    <Modal show onHide={onHide} centered>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title as="h5">Alterar minha senha</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          {error && <Alert variant="danger" className="py-2 small mb-0">{error}</Alert>}
          <Form.Group controlId="my-current">
            <Form.Label className="fw-medium">Senha atual</Form.Label>
            <Form.Control type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />
          </Form.Group>
          <Form.Group controlId="my-new">
            <Form.Label className="fw-medium">Nova senha</Form.Label>
            <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={72} placeholder="Mínimo de 10 caracteres" />
          </Form.Group>
          <Form.Group controlId="my-confirm">
            <Form.Label className="fw-medium">Confirmar nova senha</Form.Label>
            <Form.Control
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              maxLength={72}
              isInvalid={confirm !== '' && confirm !== password}
            />
          </Form.Group>
          <Card body className="bg-body-secondary border-0 small text-muted">
            Este aparelho continua conectado. Os outros aparelhos em que você entrou serão desconectados.
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving && <Spinner size="sm" className="me-2" />}
            Alterar senha
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
