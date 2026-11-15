import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FiShoppingCart, FiBarChart2, FiPackage, FiLogOut, FiUsers } from 'react-icons/fi';
import ThemeToggle from '../../theme/ThemeToggle';
import { logout } from '../../auth/auth';
import { useOutbox } from '../../hooks/useOutbox';

/*
 * Phones/tablets: [menu][theme]   Organização de Compras   [spacer]
 *   The spacer has the same width as the buttons, so the title is truly centered and
 *   can never slide under the buttons (it truncates on very narrow screens instead).
 * Desktop:        [theme] Organização de Compras ............ Dashboard  Remessas
 * Layout rules live in App.css (.app-header-*).
 */
export default function Header() {
  const location = useLocation();
  const { pending } = useOutbox();

  const handleLogout = () => {
    // Queued writes stay on the device and are sent after the next login
    const msg =
      pending > 0
        ? `Há ${pending} alteração(ões) ainda não enviada(s). Elas ficam guardadas neste aparelho e serão enviadas no próximo login. Sair mesmo assim?`
        : 'Deseja sair?';
    if (window.confirm(msg)) void logout();
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm mb-0">
      <Container>
        <div className="app-header-side d-flex align-items-center gap-1">
          <Navbar.Toggle aria-label="Abrir menu" />
          <ThemeToggle />
        </div>

        <Navbar.Brand as={Link} to="/" className="app-header-brand d-flex align-items-center gap-2 fw-bold">
          <FiShoppingCart size={22} className="flex-shrink-0 d-none d-sm-inline" aria-hidden="true" />
          <span className="text-truncate">Organização de Compras</span>
        </Navbar.Brand>

        <div className="app-header-side d-lg-none" aria-hidden="true" />

        <Navbar.Collapse>
          <Nav className="ms-auto">
            <Nav.Link
              as={Link}
              to="/"
              active={location.pathname === '/'}
              className="d-flex align-items-center gap-1"
            >
              <FiBarChart2 size={16} aria-hidden="true" /> Dashboard
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/batches"
              active={location.pathname.startsWith('/batches')}
              className="d-flex align-items-center gap-1"
            >
              <FiPackage size={16} aria-hidden="true" /> Remessas
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/users"
              active={location.pathname.startsWith('/users')}
              className="d-flex align-items-center gap-1"
            >
              <FiUsers size={16} aria-hidden="true" /> Usuários
            </Nav.Link>
            <Nav.Link as="button" type="button" onClick={handleLogout} className="d-flex align-items-center gap-1">
              <FiLogOut size={16} aria-hidden="true" /> Sair
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
