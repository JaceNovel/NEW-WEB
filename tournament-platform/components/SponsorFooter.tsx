export default function SponsorFooter() {
  return (
    <footer className="tp-sponsor-footer-shell">
      <div className="tp-sponsor-footer-frame">
        <div className="tp-sponsor-footer-orb tp-sponsor-footer-orb-left" aria-hidden="true" />
        <div className="tp-sponsor-footer-orb tp-sponsor-footer-orb-right" aria-hidden="true" />
        <div className="tp-sponsor-footer-copy">
          <span className="tp-sponsor-footer-label">Partenaire recharge</span>
          <span className="tp-sponsor-footer-badge">Acces premium sur desktop et mobile</span>
          <p className="tp-sponsor-footer-text">PRIME Gaming recharge votre compte instantanement, automatiquement et sans intervention manuelle.</p>
        </div>

        <a
          href="https://primegaming.space"
          target="_blank"
          rel="noreferrer"
          className="tp-sponsor-footer-link"
          aria-label="Visiter PRIME Gaming depuis le footer"
        >
          <img
            src="https://img.icons8.com/?size=100&id=wT7CgwVbjiUF&format=png&color=000000"
            alt="Visiter PRIME Gaming"
            width="20"
            height="20"
            className="tp-sponsor-footer-icon"
          />
          <span>Primegaming.space</span>
        </a>
      </div>
    </footer>
  );
}