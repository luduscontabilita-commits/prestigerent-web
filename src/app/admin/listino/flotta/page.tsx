import { redirect } from 'next/navigation';

/* Indirizzo vecchio (fino al 12/10/2026): ora la pagina sta in /admin/partners/flotta/. */
export default function Spostata() {
  redirect('/admin/partners/flotta/');
}
