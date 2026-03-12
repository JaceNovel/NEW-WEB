const desktopMessages = [
  "PRIME Gaming",
  "Recharge instantanee",
  "Traitement automatique",
  "Activation securisee 24/7",
  "Livraison rapide",
];

const mobileMessages = [
  "Sponsor officiel",
  "Recharge instantanee",
  "Traitement rapide",
];

export default function SponsorTicker() {
  const desktopItems = [...desktopMessages, ...desktopMessages];
  const mobileItems = [...mobileMessages, ...mobileMessages];

  return (
    <section className="tp-sponsor-shell" aria-label="Annonce sponsor PRIME Gaming">
      <div className="tp-sponsor-frame">
        <div className="tp-sponsor-glow tp-sponsor-glow-left" aria-hidden="true" />
        <div className="tp-sponsor-glow tp-sponsor-glow-right" aria-hidden="true" />
        <div className="tp-sponsor-shine" aria-hidden="true" />
        <div className="tp-sponsor-kicker">Sponsor officiel</div>

        <div className="tp-sponsor-marquee" aria-hidden="true">
          <div className="tp-sponsor-track tp-sponsor-track-desktop">
            {desktopItems.map((message, index) => (
              <span key={`${message}-${index}`} className="tp-sponsor-pill">
                <span className="tp-sponsor-pill-dot" />
                <span>{message}</span>
              </span>
            ))}
          </div>

          <div className="tp-sponsor-track tp-sponsor-track-mobile">
            {mobileItems.map((message, index) => (
              <span key={`${message}-${index}-mobile`} className="tp-sponsor-mobile-item">
                {message}
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
            width="18"
            height="18"
            className="tp-sponsor-visit-icon"
          />
          <span className="tp-sponsor-visit-label">Visiter</span>
        </a>
      </div>
    </section>
  );
}