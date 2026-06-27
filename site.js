/* ============================================================
   site.js — baut Orientierungsleiste + Footer aus <body data-page="…">
   und steuert Scroll-Reveals, Header-Zustand und Mobile-Menü.
   Reines Vanilla-JS, kein Framework. GitHub-Pages-tauglich.
   ============================================================ */
(function(){
  "use strict";

  var APP_URL = "https://eltern.schulküchemarkersdorf.de/";

  /* ---- Linien-Icons (viewBox 0 0 24 24, stroke currentColor) ---- */
  var I = {
    login:   '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
    burger:  '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close:   '<path d="M18 6 6 18M6 6l12 12"/>',
    arrow:   '<path d="M5 12h14M13 6l6 6-6 6"/>',
    phone:   '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    mail:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    pin:     '<path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11"/><circle cx="12" cy="10" r="2.6"/>',
    chat:    '<path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8.5 10.5h7M8.5 14h4.5"/>',
    send:    '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    spark:   '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="12" cy="12" r="3"/>'
  };
  function svg(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(I[k]||'')+'</svg>';}

  /* ---- Navigation ---- */
  var NAV = [
    ['start',      'Start',      'index.html'],
    ['speiseplan', 'Speiseplan', 'speisekarte.html'],
    ['galerie',    'Galerie',    'galerie.html'],
    ['stories',    'Stories',    'stories.html'],
    ['kontakt',    'Kontakt',    'kontakt.html']
  ];

  function build(){
    var b = document.body;
    document.documentElement.classList.add('js-on');
    var active = b.dataset.page || '';

    /* ---------- Header ---------- */
    var header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML =
      '<div class="wrap">' +
        '<a class="brand" href="index.html" aria-label="Schulküche Markersdorf — Startseite">' +
          '<span class="brand-mark"><img src="assets/bilder/schulkueche-logo.png" alt=""></span>' +
          '<span class="brand-name"><b>Schulküche Markersdorf</b><span>Frisch · Regional · Für Kinder</span></span>' +
        '</a>' +
        '<nav class="nav" aria-label="Hauptnavigation">' +
          NAV.map(function(n){
            return '<a class="nav-link'+(n[0]===active?' active':'')+'" href="'+n[2]+'">'+n[1]+'</a>';
          }).join('') +
          '<a class="btn btn-primary nav-cta" href="'+APP_URL+'">'+svg('login')+'Eltern-App</a>' +
        '</nav>' +
        '<button class="burger" aria-label="Menü öffnen" aria-expanded="false">'+svg('burger')+'</button>' +
      '</div>';
    b.prepend(header);

    /* ---------- Mobile-Overlay ---------- */
    var mm = document.createElement('div');
    mm.className = 'mobile-menu';
    mm.innerHTML =
      '<button class="mm-close" aria-label="Menü schließen">'+svg('close')+'</button>' +
      NAV.map(function(n){
        return '<a class="mm-link'+(n[0]===active?' active':'')+'" href="'+n[2]+'">'+n[1]+'</a>';
      }).join('') +
      '<a class="btn btn-primary btn-lg mm-cta" href="'+APP_URL+'">'+svg('login')+'Zur Eltern-App</a>';
    b.appendChild(mm);

    var burger = header.querySelector('.burger');
    var mmClose = mm.querySelector('.mm-close');
    function setMenu(open){
      mm.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.style.overflow = open ? 'hidden' : '';
    }
    burger.addEventListener('click', function(){ setMenu(!mm.classList.contains('open')); });
    mmClose.addEventListener('click', function(){ setMenu(false); });
    mm.addEventListener('click', function(e){ if(e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') setMenu(false); });

    /* ---------- Footer ---------- */
    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="wrap">' +
        '<div class="f-top">' +
          '<div class="f-brand">' +
            '<div class="brand">' +
              '<span class="brand-mark"><img src="assets/bilder/schulkueche-logo.png" alt=""></span>' +
              '<span class="brand-name"><b>Schulküche Markersdorf</b><span style="color:var(--apple-lt)">Frisch · Regional</span></span>' +
            '</div>' +
            '<p>Frisch gekochtes Mittagessen für Schulen und Kindergärten in und um Markersdorf — jeden Tag mit Liebe zubereitet.</p>' +
          '</div>' +
          '<div class="f-col"><h4>Entdecken</h4>' +
            '<a href="index.html">Start</a><a href="speisekarte.html">Speiseplan</a>' +
            '<a href="galerie.html">Galerie</a><a href="stories.html">Stories</a>' +
          '</div>' +
          '<div class="f-col"><h4>Eltern</h4>' +
            '<a href="'+APP_URL+'">Eltern-App</a><a href="speisekarte.html">Speiseplan ansehen</a>' +
            '<a href="kontakt.html">An- &amp; Abmeldung</a><a href="kontakt.html">Kontakt</a>' +
          '</div>' +
          '<div class="f-col"><h4>Kontakt</h4>' +
            '<p>Schulküche Markersdorf<br>Katrin Lange<br>Kirchstraße 49 · 02829 Markersdorf</p>' +
            '<a href="tel:+4935829139993">035829 139993</a>' +
            '<a href="mailto:schulkuechemarkersdorf@web.de">schulkuechemarkersdorf@web.de</a>' +
            '<a href="https://www.facebook.com/schulkuche.markersdorf.7" target="_blank" rel="noopener">Facebook</a>' +
            '<a href="https://www.instagram.com/schulkueche_markersdorf/" target="_blank" rel="noopener">Instagram</a>' +
          '</div>' +
        '</div>' +
        '<div class="f-bot">' +
          '<span>© '+new Date().getFullYear()+' Schulküche Markersdorf · Katrin Lange</span>' +
          '<span class="f-legal"><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></span>' +
        '</div>' +
      '</div>';
    b.appendChild(footer);

    /* ---------- Chatbot ----------
       Der echte, DSGVO-konforme Chatbot (Cloudflare-Worker + Consent)
       wird über assets/chatbot.js eingebunden — NICHT der Demo-Chat hier.
       buildChat() bleibt ungenutzt erhalten, falls je ein reiner
       Offline-Demo-Modus gebraucht wird. */
    // buildChat(b);

    /* ---------- Header-Zustand bei Scroll ---------- */
    var hasHero = b.classList.contains('has-hero');
    function onScroll(){
      var solid = window.scrollY > (hasHero ? window.innerHeight * 0.6 : 10);
      header.classList.toggle('solid', solid);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});

    /* ---------- Scroll-Reveals ---------- */
    var reveals = document.querySelectorAll('.reveal');
    function revealAll(){ reveals.forEach(function(el){ el.classList.add('in'); }); }
    if('IntersectionObserver' in window && reveals.length){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, {threshold:0.06, rootMargin:'0px 0px -6% 0px'});
      reveals.forEach(function(el){
        // bereits im Viewport? sofort einblenden (z. B. page-hero ganz oben)
        var r = el.getBoundingClientRect();
        if(r.top < window.innerHeight * 0.96) el.classList.add('in');
        else io.observe(el);
      });
      // Sicherheitsnetz: falls der Observer im Scroll-Modell nicht feuert
      var safety = setInterval(function(){
        var hidden = false;
        reveals.forEach(function(el){
          if(!el.classList.contains('in')){
            var r = el.getBoundingClientRect();
            if(r.top < window.innerHeight * 0.96 && r.bottom > 0) el.classList.add('in');
            else hidden = true;
          }
        });
        if(!hidden) clearInterval(safety);
      }, 400);
      window.addEventListener('load', function(){
        // nach 6s definitiv alles zeigen
        setTimeout(revealAll, 6000);
      });
    } else {
      revealAll();
    }
  }

  /* ---------- Chatbot (Button rechts unten + Panel) ---------- */
  function buildChat(b){
    var fab = document.createElement('button');
    fab.className = 'chat-fab';
    fab.setAttribute('aria-label','Chat öffnen');
    fab.innerHTML = '<span class="badge"></span>' +
      '<span class="ic-chat">'+svg('chat')+'</span>' +
      '<span class="ic-close">'+svg('close')+'</span>';

    var panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Chat mit der Schulküche');
    panel.innerHTML =
      '<div class="chat-head">' +
        '<span class="ch-ava">'+svg('spark')+'</span>' +
        '<span><b>Küchen-Chat</b><span><span class="ch-dot"></span>Wir helfen dir weiter</span></span>' +
      '</div>' +
      '<div class="chat-body"></div>' +
      '<div class="chat-quick"></div>' +
      '<form class="chat-input-row">' +
        '<input class="chat-input" type="text" placeholder="Schreib uns eine Nachricht …" aria-label="Nachricht" />' +
        '<button class="chat-send" type="submit" aria-label="Senden">'+svg('send')+'</button>' +
      '</form>';

    b.appendChild(panel);
    b.appendChild(fab);

    var body = panel.querySelector('.chat-body');
    var quick = panel.querySelector('.chat-quick');
    var form = panel.querySelector('.chat-input-row');
    var input = panel.querySelector('.chat-input');
    var started = false;

    function add(text, who){
      var m = document.createElement('div');
      m.className = 'chat-msg ' + who;
      m.innerHTML = text;
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
    }

    function reply(q){
      var t = (q || '').toLowerCase();
      if(/speise|essen|men[uü]|teller|woche/.test(t))
        return 'Unseren aktuellen Speiseplan findest du <a href="speisekarte.html">hier</a> — jeden Tag zwei Gerichte zur Wahl, eines davon vegetarisch.';
      if(/cater|buffet|feier|fest|party|platte/.test(t))
        return 'Ja, wir machen Catering! Buffets, belegte Platten, Fingerfood &amp; Desserts für jeden Anlass. Schreib uns übers <a href="kontakt.html">Kontaktformular</a>, dann melden wir uns mit einem Angebot.';
      if(/preis|kost|teuer|euro|geld/.test(t))
        return 'Pro Mittagessen: Kinderkrippe 3,00&nbsp;€, Kindergarten 3,30&nbsp;€, Schule 4,20&nbsp;€, Erwachsene 5,80&nbsp;€. Mehr dazu auf der <a href="speisekarte.html">Speiseplan-Seite</a>.';
      if(/anmeld|abmeld|krank|app/.test(t))
        return 'An- und Abmeldungen erledigst du in der <a href="'+APP_URL+'">Eltern-App</a> — bis 7:30 Uhr am selben Tag.';
      if(/allerg|unvertr|vegan|vegetar/.test(t))
        return 'Allergien und Unverträglichkeiten hinterlegst du einmal in der Eltern-App, wir berücksichtigen sie bei jeder Bestellung. Es gibt täglich auch eine vegetarische Wahl.';
      if(/kontakt|telefon|anruf|erreich|mail|adresse/.test(t))
        return 'Du erreichst uns telefonisch unter 035829 139993 oder übers <a href="kontakt.html">Kontaktformular</a>. Bürozeiten: Mo–Fr, 7:00–14:00 Uhr.';
      return 'Das schaut sich am besten ein Mensch persönlich an. Schreib uns übers <a href="kontakt.html">Kontaktformular</a> oder ruf an — wir helfen dir gern weiter.';
    }

    function send(q){
      add(q.replace(/</g,'&lt;'), 'user');
      var ans = reply(q);
      setTimeout(function(){ add(ans, 'bot'); }, 420);
    }

    var QUICK = ['Speiseplan','Catering','Preise','Anmeldung'];
    QUICK.forEach(function(label){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', function(){ send(label); });
      quick.appendChild(btn);
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var v = input.value.trim();
      if(!v) return;
      input.value = '';
      send(v);
    });

    function open(o){
      panel.classList.toggle('open', o);
      fab.classList.toggle('open', o);
      fab.setAttribute('aria-label', o ? 'Chat schließen' : 'Chat öffnen');
      if(o){
        if(!started){
          started = true;
          add('Hallo! Ich helfe dir rund um Essen, Preise, Anmeldung und Catering. Was möchtest du wissen?', 'bot');
        }
        setTimeout(function(){ input.focus(); }, 220);
      }
    }
    fab.addEventListener('click', function(){ open(!panel.classList.contains('open')); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') open(false); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
