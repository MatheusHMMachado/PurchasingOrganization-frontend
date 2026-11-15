import { useSyncExternalStore } from 'react';
import { Button } from 'react-bootstrap';
import { FiMoon, FiSun } from 'react-icons/fi';
import { themeStore, toggleTheme } from './theme';

export default function ThemeToggle() {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot);
  const label = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <Button
      variant="outline-light"
      size="sm"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="d-flex align-items-center justify-content-center border-0"
      style={{ width: 36, height: 36 }}
    >
      {theme === 'dark' ? <FiSun size={18} aria-hidden="true" /> : <FiMoon size={18} aria-hidden="true" />}
    </Button>
  );
}
