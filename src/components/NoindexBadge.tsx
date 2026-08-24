/* Il promemoria del noindex non e' piu' un riquadro fisso: dava fastidio nel
 * posto sbagliato -- su telefono copriva WhatsApp e BOOK NOW -- ed era facile
 * smettere di vederlo.
 *
 * Ora vive in fondo al footer, come riga rossa con un LINK che porta dritto
 * alla pagina dove si spegne. Dare fastidio e' voluto: e' l'unica difesa
 * contro l'errore che non da' nessun sintomo, cioe' mandare il sito in
 * produzione lasciando il noindex acceso. Vedi `Footer`.
 */
export function NoindexBadge() {
  return null;
}
