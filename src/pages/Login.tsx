import { useState } from 'react';
import { Alert, Button, Card, Container, Form, InputGroup, Spinner } from 'react-bootstrap';
import { FiEye, FiEyeOff, FiLock, FiLogIn, FiShoppingCart, FiUser } from 'react-icons/fi';
import { clientType, login } from '../auth/auth';
import { errorMessage, isNetworkError } from '../services/http';
import ThemeToggle from '../theme/ThemeToggle';

interface Props {
  /** The previous session ended on its own (expired or revoked) */
  expired?: boolean;
}

/**
 * Single shared login. Rendered in place of the app (same URL), so after logging in the
 * user lands where they were going, e.g. /share with the link received from another app.
 */
export default function Login({ expired = false }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isPwa = clientType() === 'pwa';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Informe usuário e senha.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(isNetworkError(err) ? 'Sem conexão com o servidor. Tente novamente.' : errorMessage(err));
      setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-body-tertiary">
      <div className="d-flex justify-content-end p-2">
        <div className="bg-dark rounded">
          <ThemeToggle />
        </div>
      </div>

      <Container className="flex-grow-1 d-flex align-items-center justify-content-center pb-5" style={{ maxWidth: 420 }}>
        <Card className="border-0 shadow-sm w-100">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary mb-3"
                style={{ width: 56, height: 56 }}
              >
                <FiShoppingCart size={26} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h1 className="h4 fw-bold mb-1">Organização de Compras</h1>
              <p className="text-muted small mb-0">Entre para acessar suas remessas</p>
            </div>

            {expired && !error && (
              <Alert variant="warning" className="py-2 small">
                Sua sessão expirou. Entre novamente para continuar.
              </Alert>
            )}
            {error && (
              <Alert variant="danger" className="py-2 small" role="alert">
                {error}
              </Alert>
            )}

            <Form noValidate onSubmit={handleSubmit} className="d-grid gap-3">
              <Form.Group controlId="login-username">
                <Form.Label className="fw-medium">Usuário</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FiUser aria-hidden="true" /></InputGroup.Text>
                  <Form.Control
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={100}
                    autoFocus
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group controlId="login-password">
                <Form.Label className="fw-medium">Senha</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FiLock aria-hidden="true" /></InputGroup.Text>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    maxLength={200}
                    required
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                  </Button>
                </InputGroup>
              </Form.Group>

              <Button type="submit" variant="primary" size="lg" disabled={submitting} className="mt-1">
                {submitting ? <Spinner size="sm" className="me-2" /> : <FiLogIn className="me-2" aria-hidden="true" />}
                Entrar
              </Button>
            </Form>          
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
