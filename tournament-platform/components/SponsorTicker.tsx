const sponsorMessages = [
  "Sponsor PRIME Gaming",
  "Rechargez votre compte instantanement",
  "Rien de manuel",
  "Traitement rapide et automatique",
  "Activation securisee 24/7",
  "Paiement et livraison fluides",
  "Experience premium automatisee",
];

export default function SponsorTicker() {
  const marqueeItems = [...sponsorMessages, ...sponsorMessages];

  return (
    <section className="tp-sponsor-shell" aria-label="Annonce sponsor PRIME Gaming">
      <div className="tp-sponsor-frame">
        <div className="tp-sponsor-glow tp-sponsor-glow-left" aria-hidden="true" />
        <div className="tp-sponsor-glow tp-sponsor-glow-right" aria-hidden="true" />
        <div className="tp-sponsor-shine" aria-hidden="true" />
        <div className="tp-sponsor-kicker">Sponsor officiel</div>

        <div className="tp-sponsor-marquee" aria-hidden="true">
          <div className="tp-sponsor-track">
            {marqueeItems.map((message, index) => (
              <span key={`${message}-${index}`} className="tp-sponsor-pill">
                <span className="tp-sponsor-pill-dot" />
                <span>{message}</span>
              </span>
            ))}
          </div>
        </div>

        <a
          href="https://primegaming.space"
          target="_blank"
          rel="noreferrer"
          className="tp-sponsor-visit"
          aria-label="Visiter PRIME Gaming"
        >
          <img
            src="https://img.icons8.com/?size=100&id=wT7CgwVbjiUF&format=png&color=000000"
            alt="Visiter PRIME Gaming"
            width="20"
            height="20"
            className="tp-sponsor-visit-icon"
          />
          <span>Visiter PRIME Gaming</span>
        </a>
      </div>
    </section>
  );
}