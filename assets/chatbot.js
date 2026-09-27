/* ============================================================
   SCHULKÜCHE MARKERSDORF — Chatbot-Widget (Frontend)
   Kein Framework, keine Dependencies. Vanilla JS.
   ------------------------------------------------------------
   Konfiguration: vor diesem Script setzen, z.B.
   <script>
     window.SK_CHAT_CONFIG = {
       workerUrl: 'https://schulkueche-chatbot.example.workers.dev',
       datenschutzUrl: 'datenschutz.html',
     };
   </script>
   <script defer src="assets/chatbot.js"></script>
   ============================================================ */

(function () {
  'use strict';

  const CONFIG = Object.assign(
    {
      workerUrl: 'http://localhost:8787', // im Live-Betrieb überschreiben
      datenschutzUrl: 'datenschutz.html',
      consentKey: 'sk-chat-consent-v2',
      sessionKey: 'sk-chat-session-v1',
      historyKey: 'sk-chat-history-v1',
      // S9/Q4: Version des Zustimmungstexts -- bei inhaltlicher Änderung erhöhen, damit
      // alte Zustimmungen nicht stillschweigend weitergelten.
      consentVersion: '2026-09-26',
      // S9/Q4: Zustimmung gilt 6 Monate.
      consentValidityMs: 1000 * 60 * 60 * 24 * 30 * 6,
      whatsappUrl: 'https://wa.me/4935829139993',
      contactEmail: 'schulkuechemarkersdorf@web.de',
      greeting:
        'Hallo! Ich bin die digitale Helferin der Schulküche. Frag mich gern nach dem Speiseplan, den Zeiten oder wie das mit dem Ab- und Anmelden läuft.',
      quickReplies: [
        { label: 'Speiseplan', text: 'Was gibt es diese Woche zu essen?' },
        { label: 'Zeiten', text: 'Wann gibt es bei euch Mittagessen?' },
        { label: 'Essen abmelden', text: 'Wie melde ich mein Kind vom Essen ab?' },
        { label: 'Catering', text: 'Ich hätte gern Catering für eine Feier.' },
      ],
    },
    window.SK_CHAT_CONFIG || {}
  );

  // Q6: Client-Timeout fürs Warten auf die Antwort.
  const CLIENT_TIMEOUT_MS = 25_000;

  // -- Hilfs-Funktionen --------------------------------------------------------
  function el(tag, attrs = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) {
      if (k == null || k === false) continue;
      node.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
    }
    return node;
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'sk-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function sessionId() {
    let id = sessionStorage.getItem(CONFIG.sessionKey);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(CONFIG.sessionKey, id);
    }
    return id;
  }

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(CONFIG.historyKey) || '[]');
    } catch {
      return [];
    }
  }
  function saveHistory(hist) {
    try {
      sessionStorage.setItem(CONFIG.historyKey, JSON.stringify(hist.slice(-30)));
    } catch {}
  }

  // -- Consent-Speicher ----------------------------------------------------------
  // S9/Q4: Zustimmung mit Zeitstempel + Version, 6 Monate gültig. Zwei getrennte
  // Häkchen: Chat (notwendig) und Protokoll zur Verbesserung (freiwillig, 30 Tage).
  function loadConsent() {
    try {
      const raw = JSON.parse(localStorage.getItem(CONFIG.consentKey) || 'null');
      if (!raw || raw.chat !== true || typeof raw.ts !== 'number') return null;
      return raw;
    } catch {
      return null;
    }
  }

  function consentIsValid(consent) {
    if (!consent) return false;
    if (consent.version !== CONFIG.consentVersion) return false;
    const age = Date.now() - consent.ts;
    return age >= 0 && age <= CONFIG.consentValidityMs;
  }

  function saveConsent(logAllowed) {
    const consent = { chat: true, log: Boolean(logAllowed), version: CONFIG.consentVersion, ts: Date.now() };
    try {
      localStorage.setItem(CONFIG.consentKey, JSON.stringify(consent));
    } catch {}
    return consent;
  }

  function clearConsent() {
    try {
      localStorage.removeItem(CONFIG.consentKey);
    } catch {}
  }

  function clearChatState() {
    try {
      sessionStorage.removeItem(CONFIG.historyKey);
      sessionStorage.removeItem(CONFIG.sessionKey);
    } catch {}
    history = [];
    body.innerHTML = '';
    started = false;
  }

  // -- DOM-Aufbau --------------------------------------------------------------
  const root = el('div', { class: 'sk-chat-root' });

  const fab = el(
    'button',
    {
      class: 'sk-chat-fab',
      type: 'button',
      'aria-label': 'Chat öffnen',
      'aria-expanded': 'false',
    },
    el('span', { class: 'sk-fab-label' }, 'Chat mit uns'),
    el('span', {
      class: 'sk-fab-icon',
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2zm2 4v2h12V8H6zm0 4v2h8v-2H6z"/></svg>',
    })
  );

  const closeBtn = el(
    'button',
    {
      class: 'sk-chat-close',
      type: 'button',
      'aria-label': 'Chat schließen',
    },
    el('span', {
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.71 12 12.01l-6.29-6.3-1.42 1.42 6.3 6.29-6.3 6.29 1.42 1.42L12 14.84l6.29 6.3 1.42-1.42-6.3-6.29 6.3-6.29z"/></svg>',
    })
  );

  const head = el(
    'div',
    { class: 'sk-chat-head' },
    el('div', { class: 'sk-avatar' }, 'S'),
    el(
      'div',
      { class: 'sk-titel' },
      el('strong', {}, 'Schulküche'),
      el('span', {}, 'wir helfen gern')
    ),
    closeBtn
  );

  const body = el('div', {
    class: 'sk-chat-body',
    role: 'log',
    'aria-live': 'polite',
    'aria-label': 'Chatverlauf',
  });

  const chipsBar = el('div', { class: 'sk-chips' });

  const input = el('textarea', {
    class: 'sk-chat-input',
    rows: '1',
    placeholder: 'Schreib uns… (bitte keine Namen oder Gesundheitsdaten eingeben)',
    'aria-label': 'Deine Nachricht (bitte keine Namen oder Gesundheitsdaten eingeben)',
    maxlength: '2000',
  });

  const sendBtn = el(
    'button',
    {
      class: 'sk-chat-send',
      type: 'submit',
      'aria-label': 'Nachricht senden',
    },
    el('span', {
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>',
    })
  );

  const form = el(
    'form',
    {
      class: 'sk-chat-form',
      onsubmit: (e) => {
        e.preventDefault();
        sendUserMessage(input.value);
      },
    },
    input,
    sendBtn
  );

  const revokeBtn = el(
    'button',
    {
      class: 'sk-chat-revoke',
      type: 'button',
      onclick: () => revokeConsent(),
    },
    'Einwilligung widerrufen & Chat löschen'
  );

  const foot = el(
    'div',
    { class: 'sk-chat-foot' },
    el(
      'div',
      {},
      'Chat wird KI-gestützt beantwortet · ',
      el('a', { href: CONFIG.datenschutzUrl, target: '_blank', rel: 'noopener' }, 'Datenschutz')
    ),
    revokeBtn
  );

  const win = el(
    'div',
    {
      class: 'sk-chat-window',
      role: 'dialog',
      'aria-label': 'Chat mit der Schulküche',
      'aria-modal': 'false',
    },
    head,
    body,
    chipsBar,
    form,
    foot
  );

  root.appendChild(fab);
  root.appendChild(win);
  document.body.appendChild(root);

  // -- State -------------------------------------------------------------------
  let history = loadHistory();
  let sending = false;
  let started = false;
  let activeConsent = null;

  // -- Eingabe sperren/entsperren (S9: bis zur Zustimmung inert) ----------------
  function lockChatInput() {
    input.setAttribute('disabled', '');
    sendBtn.setAttribute('disabled', '');
    try {
      form.setAttribute('inert', '');
      chipsBar.setAttribute('inert', '');
    } catch {}
  }
  function unlockChatInput() {
    input.removeAttribute('disabled');
    sendBtn.removeAttribute('disabled');
    form.removeAttribute('inert');
    chipsBar.removeAttribute('inert');
  }
  lockChatInput();

  // -- Nachrichten-Rendering ---------------------------------------------------
  function pushMessage(role, content, opts = {}) {
    const msg = el('div', { class: `sk-msg sk-msg-${role}` }, content);
    body.appendChild(msg);
    scrollToBottom();
    if (!opts.skipHistory && (role === 'user' || role === 'bot')) {
      history.push({ role: role === 'bot' ? 'assistant' : 'user', content });
      saveHistory(history);
    }
    return msg;
  }

  function pushSystem(text) {
    body.appendChild(el('div', { class: 'sk-msg sk-msg-system' }, text));
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  function showTyping() {
    const t = el(
      'div',
      { class: 'sk-typing', 'aria-label': 'Tippt' },
      el('span'),
      el('span'),
      el('span')
    );
    body.appendChild(t);
    scrollToBottom();
    return t;
  }

  function renderQuickReplies() {
    chipsBar.innerHTML = '';
    CONFIG.quickReplies.forEach((q) => {
      chipsBar.appendChild(
        el(
          'button',
          {
            class: 'sk-chip',
            type: 'button',
            onclick: () => {
              chipsBar.innerHTML = '';
              sendUserMessage(q.text);
            },
          },
          q.label
        )
      );
    });
  }

  // -- Backend-Calls -----------------------------------------------------------
  async function fetchJson(path, payload) {
    const controller = new AbortController();
    // Q6: Client-Timeout -- hängt der Request, bricht er nach CLIENT_TIMEOUT_MS ab.
    const timeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(CONFIG.workerUrl.replace(/\/$/, '') + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const ct = res.headers.get('Content-Type') || '';
      const data = ct.includes('application/json') ? await res.json() : { ok: false, error: await res.text() };
      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  async function sendUserMessage(text) {
    text = (text || '').trim();
    if (!text || sending) return;
    if (!consentIsValid(activeConsent)) {
      showConsentIfNeeded();
      return;
    }
    input.value = '';
    chipsBar.innerHTML = '';
    sending = true;
    sendBtn.disabled = true;

    pushMessage('user', text);
    const typing = showTyping();

    try {
      const { ok, data } = await fetchJson('/api/chat', {
        sessionId: sessionId(),
        messages: history,
        consent: {
          chat: true,
          log: Boolean(activeConsent.log),
          version: activeConsent.version,
          ts: activeConsent.ts,
        },
      });
      typing.remove();

      if (!ok) {
        if (data.error === 'consent_required') {
          clearConsent();
          activeConsent = null;
          lockChatInput();
          showConsentIfNeeded();
          return;
        }
        pushMessage('bot', data.message || 'Uff, da ist was schiefgegangen — versuch es bitte nochmal oder ruf uns kurz an.');
        return;
      }

      if (data.reply) pushMessage('bot', data.reply);
    } catch (err) {
      typing.remove();
      if (err && err.name === 'AbortError') {
        pushMessage('bot', 'Das hat zu lange gedauert – bitte nochmal versuchen.');
      } else {
        pushMessage('bot', 'Ich erreiche unseren Server gerade nicht. Magst du es gleich nochmal probieren?');
      }
    } finally {
      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // -- Kontaktwege bei Ablehnung -------------------------------------------------
  function renderKontaktwege() {
    return el(
      'div',
      { class: 'sk-kontaktwege' },
      el('p', {}, 'Kein Problem — dann erreichst du uns direkt:'),
      el(
        'ul',
        {},
        el('li', {}, el('a', { href: CONFIG.whatsappUrl, target: '_blank', rel: 'noopener' }, 'WhatsApp')),
        el('li', {}, el('a', { href: `mailto:${CONFIG.contactEmail}` }, CONFIG.contactEmail))
      )
    );
  }

  // -- Consent-Overlay (DSGVO) -------------------------------------------------
  // S9/Q4: Eingabe bleibt inert, solange der Dialog offen ist; Fokus bleibt im Dialog.
  function showConsentIfNeeded() {
    activeConsent = loadConsent();
    if (consentIsValid(activeConsent)) {
      lockChatInput(); // wird gleich wieder freigegeben
      unlockChatInput();
      return false;
    }

    lockChatInput();
    let logCheckbox;

    const overlay = el(
      'div',
      { class: 'sk-consent', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Zustimmung zum Chat' },
      el('div', {}, [
        el('h3', {}, 'Bevor wir loslegen'),
        el(
          'p',
          {},
          'Unser Chatbot wird von einer KI (Claude von Anthropic) beantwortet. Deine Nachricht wird dafür an Anthropic in die USA geschickt. Wir speichern deinen Chatverlauf nur in deinem Browser (sessionStorage), nicht bei uns. Mehr dazu in der ',
          el('a', { href: CONFIG.datenschutzUrl, target: '_blank', rel: 'noopener' }, 'Datenschutzerklärung'),
          '.'
        ),
        el(
          'p',
          { class: 'sk-consent-hinweis' },
          'Bitte gib im Chat keine Namen (auch nicht die deines Kindes) oder Gesundheitsdaten ein.'
        ),
        el(
          'label',
          { class: 'sk-consent-checkbox' },
          (logCheckbox = el('input', { type: 'checkbox' })),
          ' Ich bin außerdem einverstanden, dass unser Gespräch pseudonymisiert 30 Tage zur Verbesserung des Bots gespeichert wird (freiwillig).'
        ),
        el(
          'div',
          { class: 'sk-consent-buttons' },
          el(
            'button',
            {
              class: 'sk-btn sk-btn-primary',
              type: 'button',
              onclick: () => {
                activeConsent = saveConsent(logCheckbox.checked);
                overlay.remove();
                unlockChatInput();
                startConversation();
                input.focus();
              },
            },
            'Einverstanden — Chat öffnen'
          ),
          el(
            'button',
            {
              class: 'sk-btn sk-btn-secondary',
              type: 'button',
              onclick: () => {
                overlay.remove();
                body.innerHTML = '';
                chipsBar.innerHTML = '';
                pushSystem('Du hast dem Chat nicht zugestimmt. Der Chat bleibt geschlossen.');
                body.appendChild(renderKontaktwege());
                lockChatInput();
              },
            },
            'Lieber nicht'
          )
        ),
      ])
    );

    win.appendChild(overlay);

    // Fokus im Dialog halten (einfacher Tab-Trap zwischen Checkbox und den beiden Buttons).
    const focusables = overlay.querySelectorAll('input, button');
    if (focusables.length) focusables[0].focus();
    overlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    return true;
  }

  // -- Widerruf ------------------------------------------------------------------
  function revokeConsent() {
    clearConsent();
    activeConsent = null;
    clearChatState();
    closeChat();
    pushSystem('Deine Einwilligung wurde widerrufen, der Chatverlauf ist gelöscht.');
    lockChatInput();
  }

  // -- Open / Close ------------------------------------------------------------
  function openChat() {
    win.classList.add('sk-offen');
    fab.setAttribute('aria-expanded', 'true');
    const consentShown = showConsentIfNeeded();
    if (!consentShown) startConversation();
    setTimeout(() => {
      if (!consentShown) input.focus();
    }, 320);
  }
  function closeChat() {
    win.classList.remove('sk-offen');
    fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  }
  fab.addEventListener('click', () => {
    if (win.classList.contains('sk-offen')) closeChat();
    else openChat();
  });
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && win.classList.contains('sk-offen')) closeChat();
  });

  // -- Erst-Konversation -------------------------------------------------------
  function startConversation() {
    if (started) return;
    started = true;

    if (history.length === 0) {
      pushMessage('bot', CONFIG.greeting, { skipHistory: true });
      renderQuickReplies();
    } else {
      // History aus sessionStorage wiederherstellen
      history.forEach((m) => {
        if (m.role === 'user') {
          body.appendChild(el('div', { class: 'sk-msg sk-msg-user' }, m.content));
        } else if (m.role === 'assistant') {
          body.appendChild(el('div', { class: 'sk-msg sk-msg-bot' }, m.content));
        }
      });
      scrollToBottom();
    }
  }

  // -- Auto-Resize Textarea ----------------------------------------------------
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage(input.value);
    }
  });
})();
