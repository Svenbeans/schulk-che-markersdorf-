(function () {
  'use strict';

  const ALLERGENE = {
    a: 'Milch',
    b: 'Spuren von Ei',
    c: 'Sellerie',
    d: 'Soja',
    e: 'Nüsse',
    f: 'Gluten (Weizenmehl)'
  };

  const ZUSATZSTOFFE = {
    1: 'Konservierungsstoffe',
    2: 'Geschmacksverstärker',
    3: 'Farbstoffe',
    4: 'Süßungsmittel',
    5: 'Phosphat'
  };

  const popover = document.getElementById('allergen-popover');
  if (!popover) return;
  const inner = popover.querySelector('.popover-inner');
  const closeBtn = popover.querySelector('.popover-close');

  const optionen = document.querySelectorAll('.essen-option');

  optionen.forEach(opt => {
    const code = (opt.dataset.allergene || '').trim();
    if (code) {
      opt.classList.add('has-info');
    }
    opt.setAttribute('role', 'button');
    opt.setAttribute('tabindex', '0');
    opt.setAttribute('aria-haspopup', 'dialog');

    opt.addEventListener('click', e => {
      e.stopPropagation();
      oeffneFuer(opt);
    });
    opt.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        oeffneFuer(opt);
      }
    });
  });

  function oeffneFuer(opt) {
    const code = (opt.dataset.allergene || '').trim();
    const titelEl = opt.querySelector('.opt-inhalt strong');
    const zusatzEl = opt.querySelector('.opt-zusatz');
    const wunschEl = opt.querySelector('.wunsch-label');

    const titel = titelEl ? titelEl.textContent.trim() : 'Gericht';
    const zusatz = zusatzEl ? zusatzEl.textContent.trim() : '';
    const wunsch = wunschEl ? wunschEl.textContent.trim() : '';

    const codes = code ? code.split(',').map(c => c.trim()).filter(Boolean) : [];
    const allergene = codes.filter(c => ALLERGENE[c]);
    const zusatzstoffe = codes.filter(c => ZUSATZSTOFFE[c]);

    let html = '';
    if (wunsch) {
      html += `<div class="popover-zusatz">${escape(wunsch)}</div>`;
    }
    html += `<div class="popover-titel">${escape(titel)}</div>`;
    if (zusatz) {
      html += `<div class="popover-zusatz">${escape(zusatz)}</div>`;
    }

    if (allergene.length === 0 && zusatzstoffe.length === 0) {
      html += '<p class="popover-leer">Keine besonderen Allergene oder Zusatzstoffe hinterlegt. Bei Unverträglichkeiten bitte direkt nachfragen.</p>';
    } else {
      if (allergene.length) {
        html += '<div class="popover-gruppe-titel">Allergene</div><ul>';
        allergene.forEach(c => {
          html += `<li><span class="legende-code">${escape(c)}</span> ${escape(ALLERGENE[c])}</li>`;
        });
        html += '</ul>';
      }
      if (zusatzstoffe.length) {
        html += '<div class="popover-gruppe-titel">Zusatzstoffe</div><ul>';
        zusatzstoffe.forEach(c => {
          html += `<li><span class="legende-code zusatz">${escape(c)}</span> ${escape(ZUSATZSTOFFE[c])}</li>`;
        });
        html += '</ul>';
      }
    }

    inner.innerHTML = html;
    positioniere(opt);
    popover.classList.add('offen');
    popover.setAttribute('aria-hidden', 'false');
    aktuellesElement = opt;
  }

  function positioniere(opt) {
    const r = opt.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    popover.style.visibility = 'hidden';
    popover.style.display = 'block';
    popover.classList.add('offen');
    const popW = popover.offsetWidth;
    const popH = popover.offsetHeight;
    popover.classList.remove('offen');
    popover.style.display = '';
    popover.style.visibility = '';

    let top = r.bottom + scrollY + 8;
    let left = r.left + scrollX + (r.width / 2) - (popW / 2);

    const vw = document.documentElement.clientWidth;
    if (left < 12 + scrollX) left = 12 + scrollX;
    if (left + popW > scrollX + vw - 12) left = scrollX + vw - popW - 12;

    const vh = window.innerHeight;
    if (r.bottom + popH + 16 > vh && r.top > popH + 16) {
      top = r.top + scrollY - popH - 8;
    }

    popover.style.top = top + 'px';
    popover.style.left = left + 'px';
  }

  let aktuellesElement = null;

  function schliesse() {
    popover.classList.remove('offen');
    popover.setAttribute('aria-hidden', 'true');
    aktuellesElement = null;
  }

  closeBtn.addEventListener('click', schliesse);
  document.addEventListener('click', e => {
    if (!popover.contains(e.target) && !e.target.closest('.essen-option')) {
      schliesse();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') schliesse();
  });
  window.addEventListener('resize', () => {
    if (aktuellesElement) positioniere(aktuellesElement);
  });
  window.addEventListener('scroll', () => {
    if (aktuellesElement) positioniere(aktuellesElement);
  }, { passive: true });

  function escape(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
