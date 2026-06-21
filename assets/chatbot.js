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
      consentKey: 'sk-chat-consent-v1',
      sessionKey: 'sk-chat-session-v1',
      historyKey: 'sk-chat-history-v1',
      greeting:
        'Hallo! Ich bin die digitale Helferin der Schulküche. Frag mich gern nach Speisekarte, Öffnungszeiten oder bestell für morgen vor.',
      quickReplies: [
        { label: 'Speisekarte', text: 'Was habt ihr aktuell auf der Karte?' },
        { label: 'Öffnungszeiten', text: 'Wann habt ihr offen?' },
        { label: 'Vorbestellen', text: 'Ich möchte gern etwas vorbestellen.' },
        { label: 'Catering anfragen', text: 'Ich bräuchte ein Angebot für Catering.' },
      ],
    },
    window.SK_CHAT_CONFIG || {}
  );

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
    placeholder: 'Schreib uns…',
    'aria-label': 'Deine Nachricht',
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

  const foot = el(
    'div',
    { class: 'sk-chat-foot' },
    'Chat wird KI-gestützt beantwortet · ',
    el('a', { href: CONFIG.datenschutzUrl, target: '_blank', rel: 'noopener' }, 'Datenschutz')
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

  // -- Bestellungs-/Catering-Karten --------------------------------------------
  function renderOrderCard(payload) {
    const dishLis =
      (payload.dishes || [])
        .map((d) => `<li>${escape(d.quantity || 1)}× ${escape(d.name)}${d.note ? ` <em>(${escape(d.note)})</em>` : ''}</li>`)
        .join('') || '<li><em>(keine)</em></li>';

    const card = el('div', {
      class: 'sk-card',
      html: `
        <h4>Deine Vorbestellung — bitte bestätigen</h4>
        <dl>
          <dt>Wann</dt><dd>${escape(payload.date)}${payload.time ? ' um ' + escape(payload.time) : ''}</dd>
          <dt>Personen</dt><dd>${escape(payload.guests)}</dd>
          <dt>Bestellung</dt><dd><ul>${dishLis}</ul></dd>
          <dt>Name</dt><dd>${escape(payload.name)}</dd>
          <dt>Telefon</dt><dd>${escape(payload.phone)}</dd>
          ${payload.email ? `<dt>E-Mail</dt><dd>${escape(payload.email)}</dd>` : ''}
          ${payload.notes ? `<dt>Hinweise</dt><dd>${escape(payload.notes)}</dd>` : ''}
        </dl>
      `,
    });
    const actions = el('div', { class: 'sk-card-actions' });
    const confirmBtn = el(
      'button',
      {
        class: 'sk-btn sk-btn-primary',
        type: 'button',
        onclick: () => submitOrder(payload, confirmBtn, cancelBtn),
      },
      'Passt — bestellen'
    );
    const cancelBtn = el(
      'button',
      {
        class: 'sk-btn sk-btn-secondary',
        type: 'button',
        onclick: () => {
          card.remove();
          pushSystem('Bestellung verworfen — sag uns gern, was du ändern willst.');
        },
      },
      'Ändern'
    );
    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);
    body.appendChild(card);
    scrollToBottom();
    return card;
  }

  function renderCateringCard(payload) {
    const card = el('div', {
      class: 'sk-card',
      html: `
        <h4>Deine Catering-Anfrage — bitte bestätigen</h4>
        <dl>
          <dt>Anlass</dt><dd>${escape(payload.occasion)}</dd>
          <dt>Wann</dt><dd>${escape(payload.date)}${payload.time ? ' um ' + escape(payload.time) : ''}</dd>
          <dt>Personen</dt><dd>${escape(payload.guests)}</dd>
          ${payload.cateringType ? `<dt>Art</dt><dd>${escape(payload.cateringType)}</dd>` : ''}
          ${payload.dietaryNotes ? `<dt>Besonderheiten</dt><dd>${escape(payload.dietaryNotes)}</dd>` : ''}
          ${payload.message ? `<dt>Nachricht</dt><dd>${escape(payload.message)}</dd>` : ''}
          <dt>Name</dt><dd>${escape(payload.name)}</dd>
          <dt>Telefon</dt><dd>${escape(payload.phone)}</dd>
          ${payload.email ? `<dt>E-Mail</dt><dd>${escape(payload.email)}</dd>` : ''}
        </dl>
      `,
    });
    const actions = el('div', { class: 'sk-card-actions' });
    const confirmBtn = el(
      'button',
      {
        class: 'sk-btn sk-btn-primary',
        type: 'button',
        onclick: () => submitCatering(payload, confirmBtn, cancelBtn),
      },
      'Anfrage absenden'
    );
    const cancelBtn = el(
      'button',
      {
        class: 'sk-btn sk-btn-secondary',
        type: 'button',
        onclick: () => {
          card.remove();
          pushSystem('Anfrage verworfen — sag uns gern, was du ändern willst.');
        },
      },
      'Ändern'
    );
    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);
    card.appendChild(actions);
    body.appendChild(card);
    scrollToBottom();
    return card;
  }

  function escape(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -- Backend-Calls -----------------------------------------------------------
  async function fetchJson(path, payload) {
    const res = await fetch(CONFIG.workerUrl.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ct = res.headers.get('Content-Type') || '';
    const data = ct.includes('application/json') ? await res.json() : { ok: false, error: await res.text() };
    return { ok: res.ok, status: res.status, data };
  }

  async function sendUserMessage(text) {
    text = (text || '').trim();
    if (!text || sending) return;
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
      });
      typing.remove();

      if (!ok) {
        pushMessage('bot', data.message || 'Uff, da ist was schiefgegangen — versuch es bitte nochmal oder ruf uns kurz an.');
        return;
      }

      if (data.reply) pushMessage('bot', data.reply);

      if (data.toolCall) {
        if (data.toolCall.name === 'submit_lunch_preorder') {
          renderOrderCard(data.toolCall.input || {});
        } else if (data.toolCall.name === 'submit_catering_request') {
          renderCateringCard(data.toolCall.input || {});
        }
      }
    } catch (err) {
      typing.remove();
      pushMessage('bot', 'Ich erreiche unseren Server gerade nicht. Magst du es gleich nochmal probieren?');
    } finally {
      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  async function submitOrder(payload, confirmBtn, cancelBtn) {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.textContent = 'Sende…';
    try {
      const { ok, data } = await fetchJson('/api/order', payload);
      if (ok && data.ok) {
        confirmBtn.textContent = '✓ Bestellt';
        pushMessage('bot', data.message || 'Bestellung aufgenommen — danke!');
        // Tool-Result an Claude zurückgeben, damit es im Verlauf bleibt
        history.push({
          role: 'user',
          content: `(System: Bestellung bestätigt, Ticket ${data.ticketId})`,
        });
        saveHistory(history);
      } else {
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.textContent = 'Passt — bestellen';
        pushMessage('bot', data.message || data.error || 'Da hat etwas nicht geklappt — probier es bitte nochmal.');
      }
    } catch (err) {
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      confirmBtn.textContent = 'Passt — bestellen';
      pushMessage('bot', 'Verbindung zum Server hat geklemmt. Versuch es gleich nochmal.');
    }
  }

  async function submitCatering(payload, confirmBtn, cancelBtn) {
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.textContent = 'Sende…';
    try {
      const { ok, data } = await fetchJson('/api/catering', payload);
      if (ok && data.ok) {
        confirmBtn.textContent = '✓ Gesendet';
        pushMessage('bot', data.message || 'Anfrage gesendet — wir melden uns!');
        history.push({
          role: 'user',
          content: `(System: Catering-Anfrage bestätigt, Ticket ${data.ticketId})`,
        });
        saveHistory(history);
      } else {
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.textContent = 'Anfrage absenden';
        pushMessage('bot', data.message || data.error || 'Da hat etwas nicht geklappt.');
      }
    } catch (err) {
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      confirmBtn.textContent = 'Anfrage absenden';
      pushMessage('bot', 'Verbindung hat geklemmt. Versuch es gleich nochmal.');
    }
  }

  // -- Consent-Overlay (DSGVO) -------------------------------------------------
  function showConsentIfNeeded() {
    if (localStorage.getItem(CONFIG.consentKey) === '1') return false;
    const overlay = el(
      'div',
      { class: 'sk-consent' },
      el('div', {}, [
        el('h3', {}, 'Bevor wir loslegen'),
        el(
          'p',
          {},
          'Unser Chatbot wird von einer KI (Claude von Anthropic) beantwortet. Damit wir den Bot verbessern können, speichern wir deine Nachrichten anonymisiert (ohne IP) für maximal 30 Tage. Mehr dazu in der ',
          el('a', { href: CONFIG.datenschutzUrl, target: '_blank', rel: 'noopener' }, 'Datenschutzerklärung'),
          '.'
        ),
        el(
          'div',
          {},
          el(
            'button',
            {
              class: 'sk-btn sk-btn-primary',
              type: 'button',
              onclick: () => {
                localStorage.setItem(CONFIG.consentKey, '1');
                overlay.remove();
                startConversation();
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
                closeChat();
              },
            },
            'Lieber nicht'
          )
        ),
      ])
    );
    win.appendChild(overlay);
    return true;
  }

  // -- Open / Close ------------------------------------------------------------
  function openChat() {
    win.classList.add('sk-offen');
    fab.setAttribute('aria-expanded', 'true');
    const consentShown = showConsentIfNeeded();
    if (!consentShown) startConversation();
    setTimeout(() => input.focus(), 320);
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
  let started = false;
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
