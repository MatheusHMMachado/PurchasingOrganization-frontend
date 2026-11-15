import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import Batches from './pages/Batches';
import BatchDetail from './pages/BatchDetail';
import Share from './pages/Share';
import SyncStatusBar from './components/pwa/SyncStatusBar';
import UpdatePrompt from './components/pwa/UpdatePrompt';
import Loading from './components/common/Loading';
import Login from './pages/Login';
import Users from './pages/Users';
import { useAuth } from './hooks/useAuth';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const auth = useAuth();

  return (
    <BrowserRouter>
      {auth.status === 'checking' ? (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary">
          <Loading />
        </div>
      ) : auth.status === 'anonymous' ? (
        // Same URL: after logging in the requested page (e.g. /share?url=...) opens
        <Login expired={auth.expired} />
      ) : (
        <div className="d-flex flex-column min-vh-100">
          <Header />
          <SyncStatusBar />
          <main className="flex-grow-1 bg-body-tertiary">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/batches/:id" element={<BatchDetail />} />
              <Route path="/share" element={<Share />} />
              <Route path="/users" element={<Users />} />
            </Routes>
          </main>
          <Footer />
        </div>
      )}
      <UpdatePrompt />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          // Theme variables so toasts follow light/dark mode
          style: {
            borderRadius: '8px',
            fontSize: '14px',
            background: 'var(--bs-body-bg)',
            color: 'var(--bs-body-color)',
            border: '1px solid var(--bs-border-color)',
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
