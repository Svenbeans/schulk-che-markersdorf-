/* ============================================================
   SCHULKÜCHE MARKERSDORF — Webseiten-Interaktionen
   ============================================================ */

(function () {
  'use strict';

  /* --- STICKY NAV --- */
  const nav = document.querySelector('.nav');
  if (nav && !nav.classList.contains('fest')) {
    const navObserver = () => {
      if (window.scrollY > 60) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', navObserver, { passive: true });
    navObserver();
  }

  /* --- MOBILE MENU --- */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const offen = navLinks.classList.toggle('offen');
      navToggle.classList.toggle('aktiv');
      navToggle.setAttribute('aria-expanded', offen ? 'true' : 'false');
      document.body.style.overflow = offen ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('offen');
        navToggle.classList.remove('aktiv');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* --- REVEAL ON SCROLL --- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');

  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('sichtbar');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('sichtbar'));
  }

  /* --- LIGHTBOX (Galerie) --- */
  const lightbox = document.querySelector('.lightbox');
  const galerieKarten = document.querySelectorAll('.galerie-karte');

  if (lightbox && galerieKarten.length) {
    const lbBild = lightbox.querySelector('.lightbox-bild');
    const lbFallback = lightbox.querySelector('.lightbox-fallback');
    const lbTitel = lightbox.querySelector('.lightbox-titel');
    const lbDatum = lightbox.querySelector('.lightbox-datum');
    const lbLink = lightbox.querySelector('.lightbox-link');
    const lbClose = lightbox.querySelector('.lightbox-close');
    const lbPrev = lightbox.querySelector('.lightbox-prev');
    const lbNext = lightbox.querySelector('.lightbox-next');

    let aktuell = 0;
    const eintraege = Array.from(galerieKarten).map((k) => ({
      bild: k.dataset.bild || '',
      titel: k.dataset.titel || '',
      datum: k.dataset.datum || '',
      link: k.dataset.link || '#',
      fallback: k.dataset.fallback || '🍽️',
    }));

    const oeffnen = (index) => {
      aktuell = index;
      const e = eintraege[index];
      if (lbTitel) lbTitel.textContent = e.titel;
      if (lbDatum) lbDatum.textContent = e.datum;
      if (lbLink) lbLink.href = e.link;

      if (e.bild) {
        lbBild.style.display = 'block';
        lbFallback.style.display = 'none';
        lbBild.onerror = () => {
          lbBild.style.display = 'none';
          lbFallback.style.display = 'flex';
          lbFallback.textContent = e.fallback;
        };
        lbBild.src = e.bild;
        lbBild.alt = e.titel;
      } else {
        lbBild.style.display = 'none';
        lbFallback.style.display = 'flex';
        lbFallback.textContent = e.fallback;
      }

      lightbox.classList.add('aktiv');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      lbClose.focus();
    };

    const schliessen = () => {
      lightbox.classList.remove('aktiv');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    const blaettern = (richtung) => {
      const neu = (aktuell + richtung + eintraege.length) % eintraege.length;
      oeffnen(neu);
    };

    galerieKarten.forEach((k, i) => {
      k.addEventListener('click', (ev) => {
        ev.preventDefault();
        oeffnen(i);
      });
      k.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          oeffnen(i);
        }
      });
    });

    if (lbClose) lbClose.addEventListener('click', schliessen);
    if (lbPrev) lbPrev.addEventListener('click', () => blaettern(-1));
    if (lbNext) lbNext.addEventListener('click', () => blaettern(1));

    lightbox.addEventListener('click', (ev) => {
      if (ev.target === lightbox) schliessen();
    });

    document.addEventListener('keydown', (ev) => {
      if (!lightbox.classList.contains('aktiv')) return;
      if (ev.key === 'Escape') schliessen();
      if (ev.key === 'ArrowLeft') blaettern(-1);
      if (ev.key === 'ArrowRight') blaettern(1);
    });
  }

  /* --- BILD-FALLBACK (allgemein) --- */
  document.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener('error', () => {
      const fb = img.dataset.fallback;
      const wrap = img.parentElement;
      if (!wrap || wrap.querySelector('.emoji-fallback')) return;
      const ersatz = document.createElement('div');
      ersatz.className = 'emoji-fallback';
      ersatz.textContent = fb;
      wrap.appendChild(ersatz);
      img.style.display = 'none';
    });
  });

  /* --- FORMULAR: HONEYPOT --- */
  const formular = document.querySelector('form[data-schutz]');
  if (formular) {
    formular.addEventListener('submit', (ev) => {
      const honig = formular.querySelector('.honig input');
      if (honig && honig.value !== '') {
        ev.preventDefault();
        return false;
      }
    });
  }
})();
