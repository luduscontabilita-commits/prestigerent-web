/* ============================================================
   LE PASSWORD DELLE GUIDE, IN CHIARO E VISIBILI ALL'ADMIN.
   ============================================================

   🔴 QUESTA COLONNA CONTIENE PASSWORD IN CHIARO. E' una decisione
   esplicita della proprieta', presa il 26/09/2026 dopo che il rischio le
   e' stato esposto: «voglio che le password delle guide siano visibili,
   salvate in chiaro sul db, non mi interessa».

   Il rischio, scritto qui perche' chi legge il database fra un anno lo
   sappia senza doverlo dedurre:
     - fino a oggi in questo sistema una password non esisteva in chiaro
       da NESSUNA parte: Supabase ne conserva l'impronta bcrypt, che non
       si riporta indietro. Da adesso esiste, e questa riga e' il posto;
     - il repository di questo progetto e' PUBBLICO, e il sito interroga
       questo database a ogni visita con una chiave che sta nel browser.
       Se un giorno una policy RLS viene scritta male, non si espone «una
       pagina»: si espongono le credenziali di tutte le guide.

   COSA LA PROTEGGE, oggi:
     - `autorizzati` ha UNA SOLA policy, `autorizzati_admin`, che vale per
       ogni operazione e richiede `e_admin()`. Per `anon` questa tabella
       non esiste: nemmeno una riga, nemmeno una colonna. Non e' una
       colonna nascosta -- e' una tabella che il pubblico non vede;
     - nessuna vista e nessuna funzione la espone altrove. Se un domani si
       aggiunge una vista che legge `autorizzati`, va dichiarata
       `security_invoker` o questa colonna esce da qui.

   COSA NON PROTEGGE, e va detto:
     - chi ha la chiave segreta del progetto legge tutto comunque. E'
       sempre stato vero, ma prima non c'erano password da leggere.

   PERCHE' SOLO LE GUIDE. Gli admin non hanno una riga qui con la loro
   password: la loro e' una sola, condivisa, e sta in
   `CREDENZIALI_PANNELLO.md` (gitignorato). Il pannello si rifiuta di
   cambiare la password di un admin, quindi questa colonna per loro
   resterebbe comunque vuota e bugiarda.

   PER TORNARE INDIETRO:
     alter table public.autorizzati drop column if exists password_chiara;
   ============================================================ */

alter table public.autorizzati add column if not exists password_chiara text;

comment on column public.autorizzati.password_chiara is
  '🔴 PASSWORD IN CHIARO della guida, per scelta esplicita della proprieta'' del '
  '26/09/2026: l''admin deve poterla rileggere. Protetta SOLO dalla policy '
  '`autorizzati_admin` (e_admin()), che rende l''intera tabella invisibile a chi non '
  'e'' amministratore. Non esporla mai in una vista senza security_invoker, e non '
  'aggiungerla a nessuna select del sito pubblico. Vuota per gli admin: la loro '
  'password e'' una sola, condivisa, e sta fuori dal database.';

/* Le guide che esistono gia' non hanno la password qui: non si puo'
   ricostruire dall'impronta, e inventarne una sarebbe scrivere una cosa
   falsa. Il pannello mostra «non registrata» finche' l'admin non ne
   assegna una nuova -- che e' un clic, e da quel momento la colonna dice
   il vero. */