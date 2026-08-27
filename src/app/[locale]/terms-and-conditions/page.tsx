import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';
import { hreflangDi } from '@/lib/schema';
import '@/styles/home.css';
import '@/styles/legale.css';

/* I TERMINI E CONDIZIONI.
 *
 * ── DOVE VA MESSO QUESTO FILE ───────────────────────────────────────
 * `src/app/[locale]/terms-and-conditions/page.tsx`. Indirizzo identico
 * a WordPress: /terms-and-conditions/.
 *
 * ── QUESTO E' UN TRASPORTO, NON UNA RISCRITTURA ─────────────────────
 * A differenza della privacy, i termini attuali sono BUONI: sono
 * specifici, dicono cifre vere (60 euro l'ora di attesa, 30 minuti di
 * franchigia, 24 ore per disdire), citano la polizza UNIPOLSAI e il
 * D.L. 111/95, e sono il contratto su cui l'azienda lavora da anni.
 * Il testo qui sotto e' copiato PAROLA PER PAROLA da
 * prestigerent.com/terms-and-conditions/ -- riscriverlo "meglio"
 * cambierebbe il contratto, e non e' una cosa che si fa mentre si
 * rifa' un sito.
 *
 * Le uniche tre differenze rispetto all'originale:
 *
 *  1. In testa ci sono i DATI SOCIETARI COMPLETI. Sul sito attuale
 *     stanno solo qui dentro, in mezzo al testo; il D.Lgs. 70/2003
 *     art. 7 vuole che siano "facilmente accessibili".
 *  2. E' aggiunta la sezione RIGHT OF WITHDRAWAL. E' un obbligo del
 *     Codice del Consumo che oggi manca del tutto: per i servizi
 *     turistici con data fissa il ripensamento di 14 giorni NON si
 *     applica (art. 59 lett. n), ma va DETTO -- se non lo si dice, il
 *     diritto resta e il cliente puo' disdire a due giorni dal tour.
 *  3. La clausola FACIAL MASKS e' lasciata dov'era ma marcata: e' del
 *     2020, oggi non e' piu' applicabile, e toglierla e' una decisione
 *     del titolare, non una svista da correggere di nascosto.
 */

const AGGIORNATA = '[[DA COMPLETARE: data di entrata in vigore]]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Terms and Conditions — Prestige Rent',
    description:
      'Prices, payment, cancellation and refund terms for tours and transfers operated by Prestige Rent S.r.l., Florence.',
    alternates: hreflangDi(
      (l) =>
        l === DEFAULT_LOCALE ? '/terms-and-conditions/' : `/${l}/terms-and-conditions/`,
      locale
    ),
  };
}

export default async function TerminiCondizioni({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const p = (x: string) => (locale === DEFAULT_LOCALE ? x : `/${locale}${x}`);

  return (
    <main className="lg">
      <header className="lg-hero">
        <h1>Terms and Conditions</h1>
        <p className="lg-lead">
          These are the terms on which we sell and operate every tour and transfer.
          Prestige Rent S.r.l. will be known below as <strong>The Company</strong>.
        </p>
        <p className="lg-date">Last updated: <mark>{AGGIORNATA}</mark></p>
      </header>

      <section className="lg-body">
        <h2>The company</h2>
        <p>
          <strong>Prestige Rent S.r.l.</strong>, a licensed Tour Operator and Travel Agency.
          <br />
          Registered office: Via della Saggina 98, 50145 Florence, Italy.
          <br />
          VAT number 05745220482 &middot; Florence Register of Companies, REA no. FI 571489
          <br />
          Share capital <mark>[[DA COMPLETARE: capitale sociale]]</mark>
          <br />
          Tour operator licence <mark>[[DA COMPLETARE: estremi dell&rsquo;autorizzazione /
          SCIA e Comune o Citta&rsquo; Metropolitana che l&rsquo;ha rilasciata]]</mark>
          <br />
          Telephone <a href="tel:+39055286059">+39 055 286059</a> &middot; Email{' '}
          <a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a>
          <br />
          Certified email (PEC): <mark>[[DA COMPLETARE: indirizzo PEC]]</mark>
        </p>

        <h2>Prices</h2>
        <p>All Prices are quoted in &ldquo;&euro;&rdquo; Euro.</p>
        <p>
          Prices for Private services (Private Tours, Private Cruise Port Tours, Transfers,
          Tours of Italy, etc.) are per party and not per person and varies depending by the
          party size.
        </p>
        <p>
          Prices for Small Group Tours are per person and vary depending on the
          participant&rsquo;s age: adult, youth, child, infant. In any case, on each tour
          page, it is clearly stated the prices and what is included/not included.
        </p>

        <h2>Hire price (customized services)</h2>
        <p>
          Quotations for private customized services are based on the duties outlined by
          clients. Extra journeys or duties requested by clients on the day, if available,
          will be charged at the hourly rate, clearly specified by the driver at the time of
          your request.
        </p>
        <p>
          Any costs incurred on the original quoted journey, such as parking costs and toll
          costs are included in the price of the service. Usually, our prices do not include
          meals, gratuities, or other customer expenses, unless otherwise specified, and
          clearly stated on your confirmation voucher.
        </p>
        <p>
          We guarantee that the price will remain the same as quoted at the time of
          reservation, if no alterations have been made to the itinerary, after the
          reservation has been made. Any alterations made to the journey itinerary, after
          the reservation has been made, will be charged accordingly. In other words, with
          no itinerary changes, the price will remain the same stated on your confirmation
          voucher &mdash; no hidden costs or strange last-minute extras.
        </p>

        <h2>Payment</h2>
        <p>
          Small Group Tours need to be paid in full at the time of reservation, by credit
          card.
        </p>
        <p>
          Private services can be paid by credit card at the time of reservation or directly
          to the driver on the day, cash only, in Euro currency, in which case, at the time
          of reservation, you will be asked to provide us with credit card details as a
          guarantee for the services being booked. We do not charge or put any money on
          hold, on your credit card, unless you incur in late cancellations or no show, as
          specified below.
        </p>

        <h2>Right of withdrawal</h2>
        <p>
          Our tours and transfers are services of leisure and transport provided on a
          specific date or within a specific period. Under Article 59 of the Italian
          Consumer Code (Legislative Decree 206/2005), implementing Article 16 of Directive
          2011/83/EU, the 14-day right of withdrawal for distance contracts{' '}
          <strong>does not apply</strong> to these services. What applies instead is our
          cancellation policy set out immediately below, which lets you cancel free of
          charge up to 24 hours before departure.
        </p>

        <h2>Cancellations by the clients</h2>
        <p>
          No charge will be applied for cancellations made up to 24 hours prior your service
          departure time.
        </p>
        <p>
          Cancellations made less than 24 hours prior departure time, or no show are subject
          to a 100% charge. Cancellations must be made by email or phone and must be
          acknowledged by us to confirm receipt.
        </p>
        <p>
          Special policy for Cruise Port Tours: no penalty if the ship does not dock in
          port, due to weather, itinerary change, or unforeseen circumstances.
        </p>

        <h2>Cancellations by the Company</h2>
        <p>
          If operating requirements or circumstances beyond its control prevent the normal
          running of the tour or when, for Small Group Tours, the minimum number of
          participants is not reached, the Company reserves the right to cancel or reschedule
          any tour or service departure.
        </p>
        <p>
          Whenever due to operational difficulties or reasons beyond its control (weather or
          travel conditions, closure of attractions, changes in opening hours, strikes,
          delays or other problems), Prestige Rent is forced to change the schedule, an
          alternative itinerary will be offered, without any variation to the agreed price,
          and the guest will be informed as soon as possible.
        </p>
        <p>
          If for any reason the Company cancels the tour or service, the client may claim
          refund for the paid amount, only. In any case the Company is not responsible for
          additional expenses that may be incurred by a client due to a canceled tour or
          service (i.e. train tickets, flights, hotels, etc.).
        </p>

        <h2>Refund</h2>
        <p>
          Refunds will be made by credit card or bank transfer or whatever is more convenient
          to the Company.
        </p>

        {/* [[DA COMPLETARE: DECISIONE DEL TITOLARE — la clausola qui sotto e' del 2020.
            Va tolta, o riscritta come "eventuali obblighi sanitari in vigore il giorno del
            servizio". Lasciata com'e' dice al cliente che il sito non si aggiorna dal 2020,
            ed e' lo stesso motivo per cui dal footer e' gia' sparita la riga sul Covid. */}
        <h2>Facial masks</h2>
        <p>
          <mark>[[DA COMPLETARE: clausola obsoleta, da confermare o rimuovere]]</mark> Actually, and until
          new advice, the use of a facial mask is mandatory; guests must bring their own
          masks. The Company reserves the right to refuse travel to any person without facial
          mask. In these circumstances no refund will be issued, and no compensation will be
          paid.
        </p>

        <h2>Accessibility &mdash; walking difficulties &mdash; wheelchair/scooter users</h2>
        <p>
          Private services can be customized to suit specific requests, but it is mandatory
          to specify all your needs at the time of reservation; in case you are traveling
          with a wheelchair or an electric scooter, etc. you need to give us all the specific
          details (weight, dimensions, etc.), in order to be sure the vehicle assigned fits
          your needs.
        </p>
        <p>
          Small group tours are never accessible to people with mobility difficulties or
          wheelchair/scooter users.
        </p>

        <h2>Transfers &mdash; delays, cancellations, changes</h2>
        <p>
          If your arrival flight or train is canceled due to weather or unforeseen
          circumstances, no charge will be made, if we have been advised of it. If you miss
          or change your flight or train, you must advise us as soon as possible.
        </p>
        <p>
          The quoted price includes 30 minutes grace period from the requested pick-up time
          (no extra charge). Our drivers monitor all flights before they leave our garages
          and adjust the time they leave accordingly.
        </p>
        <p>
          If however the flight arrival time is amended due to delays following the
          driver&rsquo;s arrival at the airport, then additional waiting time (after the
          first 30 minutes included in the agreed price) will be charged at our basic hourly
          rate (Euro 60.00 per hour). If, because of extreme delays, the driver is required
          to return to the airport to collect the client, then this will be at our
          convenience.
        </p>
        <p>
          The Company is obliged to carry out other pre-booked reservations and cannot cause
          delays and inconvenience to other clients because of flight delays. If, upon
          arrival at the airport, you cannot find your driver you must contact us as soon as
          possible.
        </p>

        <h2>Transfers &mdash; non-arrival</h2>
        <p>
          If the client fails to arrive on the flight or train detailed at the time of
          reservation, then the driver shall wait for a maximum of 1 hour starting from the
          scheduled pick-up time. If after this time the client fails to arrive, and advise
          us, the driver will leave the airport or station and an extra charge of Euro 60.00
          will be incurred for the additional hour (not included in the price). No refund
          will be issued.
        </p>

        <h2>Cruise port tours &mdash; cruise ship passengers</h2>
        <p>
          If you are on a ship, and your Cruise Company decides to cancel the reserved port
          of call, you must advise us as soon as possible, and no charge will be made. If the
          Cruise Company decides to change the reserved port of call, you must advise us as
          soon as possible, so that according to your needs and our availability we can
          re-schedule the service with all the new details, including the price, that may
          vary due to logistic reasons. If you failed to advise us and you do not arrive, we
          will consider and charge it as a no show.
        </p>

        <h2>Small group tours</h2>
        <p>
          Booking a Small Group Tour, you declare to be able to follow the regular and
          standard pace of the group. None of our Small Group Tours can be joined by people
          with mobility difficulties or wheelchair/scooter users. No refund or compensation
          will be provided to people not able to follow the group, or losing contact with the
          guide, or not rejoining the group at the exact meeting time and place, or not
          completing the tour.
        </p>

        <h2>Small group tours &mdash; meeting point and time</h2>
        <p>
          The meeting point for our Small Group Tours is at Piazzale Montelungo (Montelungo
          Square), in Florence. The meeting time is 15 minutes prior to the tour departure
          time. If you show up late or cannot find the meeting point, for any reason, refunds
          will not be issued. It is not logistically possible to join a Small Group Tour
          after it has started.
        </p>

        <h2>Insurance</h2>
        <p>
          All the vehicles and drivers are fully insured as requested by Italian law. In
          addition to that, the Company being a fully licensed Tour Operator, all the tours
          are covered by third-party insurance for the risks, the indemnity limits and the
          guarantees laid down in D.L. 111/95 under UNIPOLSAI policy no.
          1/72417/319/40177672/1.
        </p>

        <h2>Route</h2>
        <p>
          The route taken is at the driver&rsquo;s discretion. The driver will take the best
          possible route and in the event of heavy traffic congestion he will amend the route
          if necessary and endeavour to deliver passengers to their destination on time. The
          Company does not accept responsibility for any delays or missed appointments or
          travel arrangements. Always allow plenty of time for your journey.
        </p>

        <h2>On board</h2>
        <p>Smoking is strictly prohibited in all our vehicles.</p>
        <p>
          The consumption of alcohol and food is forbidden in all our vehicles, unless
          pre-authorized directly by the driver.
        </p>
        <p>
          Dogs and cats are allowed in our vehicles but must be declared at the time of
          reservation and must be carried in appropriate cages. Exceptions are made for guide
          dogs.
        </p>
        <p>
          According to availability, the Company provides child car seats, if requested at
          the time of booking, along with child details (age, height and weight). The parents
          are responsible for the safety of the child at all times.
        </p>

        <h2>Luggage</h2>
        <p>
          For Italian law, all luggage is to be placed in the luggage compartment provided.
          The driver must agree to any item the client wishes to take into the vehicle with
          them. You must specify the amount of luggage you will be traveling with at the
          time of the booking, so we can confirm the right size vehicle to avoid possible
          problems due to excess luggage. The Company is not responsible for excess of
          luggage not declared at the time of reservation.
        </p>

        <h2>Damage</h2>
        <p>
          If any of our vehicles are damaged or soiled as a result of a passenger&rsquo;s
          actions, we will charge the client named on the contract fully for the amount to
          rectify the vehicle and for time lost while the vehicle was taken out of the
          fleet.
        </p>

        <h2>Vehicles</h2>
        <p>
          The Company aims to provide clients with the vehicle group booked at all times.
          However, we reserve the right to provide a similar (or superior) vehicle if such
          vehicles are not available.
        </p>

        <h2>Public holidays and night service</h2>
        <p>
          Excess charges may be incurred for any private service made on a public holiday or
          during the night (10:00pm &ndash; 7:00am). In any case the exact amount will be
          clearly specified at the time of the reservation. If the date or time of travel
          falls on one of these cases, please make this known to our staff while making the
          reservation and the tariff will be amended accordingly.
        </p>

        <h2>Disorderly behaviour and illegal material</h2>
        <p>
          The Company reserves the right to refuse travel to any person deemed to be a
          nuisance or danger to the driver. In these circumstances no refund will be issued,
          and no compensation will be paid. The carrying or use of any illegal drugs or
          weapons in our vehicles is strictly forbidden.
        </p>

        <h2>Responsibility</h2>
        <p>
          The Company does not accept responsibility for the following: delays due to adverse
          weather conditions; theft or damage of any item belonging to any of the passengers
          traveling in our vehicles; delays caused by road traffic accidents; other traffic
          conditions or acts of God. Any passenger leaving possessions or items in the
          vehicle does so at their own risk.
        </p>

        <h2>Gratuities</h2>
        <p>
          Gratuities are at the client&rsquo;s discretion and are not included in the price.
        </p>

        <h2>Complaints</h2>
        <p>
          If for any reason you are unhappy with an aspect of our services or a member of our
          staff, please call us immediately at the time of the incident, to give us the
          chance to solve the problem straight away. If that is not possible, please send us
          an email to <a href="mailto:usa@prestigerent.com">usa@prestigerent.com</a>{' '}
          detailing the complaint as fully as possible, within and no later than 10 business
          days after the date of the tour. We will endeavour to rectify these matters
          immediately but may take further action if necessary.
        </p>
        <p>
          <mark>[[DA COMPLETARE: se il titolare aderisce a un organismo ADR per le controversie
          con i consumatori, va nominato qui con il suo sito. NOTA: NON va messo il link
          alla piattaforma ODR europea, che ha cessato di funzionare il 20 luglio 2025.]]</mark>
        </p>

        <h2>Compliments and reviews</h2>
        <p>
          If you are happy with our service and would like to comment, please send us an
          email, or write a review on your favorite channel.
        </p>

        <h2>Law and jurisdiction</h2>
        <p>
          These terms and conditions are governed by and construed in accordance with the law
          of Italy. Any disputes will be settled by the Court of Florence, Italy. Where you
          are a consumer resident in the European Union, this does not deprive you of the
          protection of the mandatory rules of the country where you live.
        </p>

        <p>
          How we handle your personal data is set out in our{' '}
          <a href={p('/privacy-policy/')}>Privacy Policy</a> and our{' '}
          <a href={p('/cookie-policy/')}>Cookie Policy</a>.
        </p>

        <p>
          Prestige Rent takes much pride in the service we offer. We wish you the most
          pleasurable experience and journey while traveling with us. Thank you for taking
          the time to read our Terms and Conditions set out above.
        </p>
      </section>
    </main>
  );
}
