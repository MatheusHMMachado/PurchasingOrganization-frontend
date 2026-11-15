import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Registers the service worker and offers to reload when a new version is ready. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Long-lived installed apps rarely reload; poll for new deploys
      if (registration) setInterval(() => void registration.update(), CHECK_INTERVAL_MS);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast.success('Aplicativo pronto para uso offline.', { id: 'offline-ready' });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    toast(
      (t) => (
        <div className="d-flex align-items-center gap-3">
          <span>Nova versão disponível.</span>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              toast.dismiss(t.id);
              void updateServiceWorker(true);
            }}
          >
            Atualizar
          </button>
          <button
            type="button"
            className="btn btn-sm btn-link text-secondary"
            onClick={() => {
              toast.dismiss(t.id);
              setNeedRefresh(false);
            }}
          >
            Depois
          </button>
        </div>
      ),
      { id: 'sw-update', duration: Infinity },
    );
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
