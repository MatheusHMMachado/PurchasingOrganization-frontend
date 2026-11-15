import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FiShoppingCart, FiHome, FiList } from 'react-icons/fi';

export default function Header() {
  const location = useLocation();

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm mb-0">
      <Container>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 fw-bold">
          <FiShoppingCart size={22} />
          <span>PurchasingOrganization</span>
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="ms-auto">
            <Nav.Link
              as={Link}
              to="/"
              active={location.pathname === '/'}
              className="d-flex align-items-center gap-1"
            >
              <FiHome size={16} /> Dashboard
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/batches"
              active={location.pathname.startsWith('/batches')}
              className="d-flex align-items-center gap-1"
            >
              <FiList size={16} /> Remessas
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

