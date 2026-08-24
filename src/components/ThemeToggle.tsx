'use client';

import { useEffect, useState } from 'react';

/* Il pulsante chiaro/scuro.
 *
 * Il lavoro vero non lo fa questo componente: lo fa lo script messo nel
 * <head> (vedi `layout.tsx`), che decide il tema PRIMA che il browser
 * disegni. Senza quello si vedrebbe mezzo secondo di pagina bianca prima
 * dello scuro -- il "flash", che di notte da' fastidio davvero.
 *
 * Qui dentro resta solo: leggere lo stato al montaggio, scriverlo al clic,
 * e ricordarlo.
 *
 * Sull'HTML servito il pulsante e' sempre lo stesso -- il disegno di sole o
 * luna lo sceglie il CSS in base a data-theme. Cosi' non c'e' differenza fra
 * quello che React genera sul server e quello che trova nel browser, che e'
 * l'errore classico di ogni interruttore del tema.
 */
export function ThemeToggle() {
  const [scuro, setScuro] = useState(false);

  useEffect(() => {
    setScuro(document.documentElement.dataset.theme === 'dark');
  }, []);

  const cambia = () => {
    const nuovo = scuro ? 'light' : 'dark';
    document.documentElement.dataset.theme = nuovo;
    setScuro(!scuro);
    /* In navigazione privata localStorage puo' lanciare invece di
       rispondere: se succede si perde solo la memoria della scelta, non
       il pulsante. */
    try {
      localStorage.setItem('pr-theme', nuovo);
    } catch {}
  };

  return (
    <button
      type="button"
      className="th-btn"
      onClick={cambia}
      aria-label="Switch between light and dark"
      title="Light / dark"
    >
      <svg className="th-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg className="th-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
