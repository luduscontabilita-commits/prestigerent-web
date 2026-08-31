/* LE CIFRE GROSSE, SCRITTE COME LE LEGGE UNA PERSONA.
 *
 * `Math.round(clienti / 1000) + 'k+'` stava scritto in cinque punti e ha
 * retto finche' i clienti erano 700.000. Il 31/08/2026 sono diventati
 * 1.100.000 e tutti e cinque avrebbero stampato "1100k+", che non e' un
 * numero: e' un errore di conversione lasciato in pagina.
 *
 * Da qui in avanti la regola sta in un posto solo. Sopra il milione si
 * passa alla "M" con un decimale, sotto si resta in "k": e' come le
 * scrive un giornale, ed e' l'unico formato che si legge senza contare
 * gli zeri.
 */

export type Breve = { valore: number; decimali: number; suffisso: string };

/** Scomposta, perche' il contatore animato conta il numero e attacca il
 *  suffisso da se': deve poter salire da 0 a 1,1 e non da 0 a "1.1M+". */
export function inBreve(n: number): Breve {
  if (n >= 1_000_000) {
    return { valore: Math.round(n / 100_000) / 10, decimali: 1, suffisso: 'M+' };
  }
  return { valore: Math.round(n / 1000), decimali: 0, suffisso: 'k+' };
}

/** Gia' pronta da stampare: "1.1M+", "270k+". */
export function testoBreve(n: number): string {
  const b = inBreve(n);
  return `${b.valore.toFixed(b.decimali)}${b.suffisso}`;
}

/** Per esteso, all'inglese: "1,100,000". Nelle frasi lunghe la cifra
 *  intera si legge meglio dell'abbreviazione. */
export function perEsteso(n: number): string {
  return n.toLocaleString('en-US');
}
