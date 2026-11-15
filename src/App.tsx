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

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="d-flex flex-column min-vh-100">
        <Header />
        <SyncStatusBar />
        <main className="flex-grow-1 bg-body-tertiary">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/batches/:id" element={<BatchDetail />} />
            <Route path="/share" element={<Share />} />
          </Routes>
        </main>
        <Footer />
      </div>
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
