import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FiShoppingCart, FiBarChart2, FiPackage } from 'react-icons/fi';
import ThemeToggle from '../../theme/ThemeToggle';

export default function Header() {
  const location = useLocation();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm mb-0">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 fw-bold">
          <FiShoppingCart size={22} />
          <span>Organização de Compras</span>
        </Navbar.Brand>
        {/* Outside the collapse so the theme button stays visible on phones */}
        <div className="d-flex align-items-center gap-2 ms-auto ms-lg-3 order-lg-last">
          <ThemeToggle />
          <Navbar.Toggle />
        </div>
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
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

