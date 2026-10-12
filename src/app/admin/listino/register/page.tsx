import { redirect } from 'next/navigation';

/* Indirizzo vecchio (fino al 12/10/2026), gia' scritto in email partite:
 * ora la pagina sta in /partners/. */
export default function Spostata() {
  redirect('/partners/');
}
