function showTime() {
	document.getElementById('currentTime').innerHTML = new Date().toUTCString();
}
showTime();
setInterval(function () {
	showTime();
}, 1000);

(() => {
  'use strict';

  /* --------------------------
     Configuración
  -------------------------- */
  const STORAGE_KEY = 'p2pChat_v1';
  const CHUNK_SIZE = 16 * 1024; // 16 KB
  const ICE_GATHER_TIMEOUT = 1500; // ms (fallback si no llega evento candidato null)
  const BUFFERED_THRESHOLD = 256 * 1024; // 256 KB: umbral para pausa al enviar

  /* --------------------------
     Estado
  -------------------------- */
  let state = {
    profile: { name: '', deviceId: null },
    contacts: [],
    messages: [],
    connection: {
      pc: null,
      dc: null,
      connected: false,
      isInitiator: false,
      localCandidates: [],
      remoteCandidates: []
    },
    incomingFile: { meta: null, chunks: [] }
  };

  /* --------------------------
     Referencias DOM
  -------------------------- */
  const $ = id => document.getElementById(id);

  const chatBox = $('chatBox');
  const messageInput = $('messageInput');
  const sendButton = $('sendButton');
  const fileInput = $('fileInput');
  const sendFileButton = $('sendFileButton');
  const contactList = $('contactList');
  const newContactName = $('newContactName');
  const addContactButton = $('addContactButton');
  const connectionText = $('connectionText');
  const connectButton = $('connectButton');
  const connectionStatus = $('connectionStatus');
  const connectionInfo = $('connectionInfo');
  const qrCode = $('qrCode');

  /* --------------------------
     Utilidades
  -------------------------- */
  function generateDeviceId() {
    return 'dev-' + Math.random().toString(36).slice(2, 10);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function formatDate(dateString) {
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateString;
    }
  }

  /* --------------------------
     Storage
  -------------------------- */
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        // Merge carefully
        state = Object.assign(state, parsed);
        if (!state.profile || !state.profile.deviceId) {
          state.profile = state.profile || {};
          state.profile.deviceId = generateDeviceId();
        }
      } else {
        state.profile.deviceId = generateDeviceId();
      }
      if (!state.profile.name) {
        state.profile.name = 'Usuario ' + state.profile.deviceId.slice(-6);
      }
    } catch (err) {
      console.warn('Error loadState:', err);
      state.profile.deviceId = state.profile.deviceId || generateDeviceId();
      state.profile.name = state.profile.name || ('Usuario ' + state.profile.deviceId.slice(-6));
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        profile: state.profile,
        contacts: state.contacts,
        messages: state.messages
      }));
    } catch (err) {
      console.warn('Error saveState:', err);
    }
  }

  /* --------------------------
     UI Render
  -------------------------- */
  function renderChat() {
    chatBox.innerHTML = '';
    state.messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'message ' + (msg.isSent ? 'sent' : 'received');
      if (msg.type === 'system') {
        div.className = 'system-message';
        div.textContent = msg.text;
      } else {
        // text or file (file handled as HTML link)
        const content = document.createElement('div');
        content.innerHTML = msg.html || escapeHtml(msg.text || '');
        const ts = document.createElement('span');
        ts.className = 'timestamp';
        ts.textContent = formatDate(msg.timestamp);
        div.appendChild(content);
        div.appendChild(ts);
      }
      chatBox.appendChild(div);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function renderContacts() {
    contactList.innerHTML = '';
    if (!state.contacts || state.contacts.length === 0) {
      contactList.innerHTML = '<p>No hay contactos aún</p>';
      return;
    }
    state.contacts.forEach(c => {
      const item = document.createElement('div');
      item.className = 'contact-item';
      item.innerHTML = `
        <div class="contact-info">
          <div class="contact-name">${escapeHtml(c.name)}</div>
          <div class="contact-id">${escapeHtml(c.deviceId)}</div>
        </div>
        <div class="contact-actions">
          <button class="btn-danger" data-device="${escapeHtml(c.deviceId)}">Eliminar</button>
        </div>
      `;
      const btn = item.querySelector('.contact-actions button');
      btn.addEventListener('click', () => removeContact(c.deviceId));
      contactList.appendChild(item);
    });
  }

  function updateConnectionStatus() {
    if (state.connection.connected) {
      connectionStatus.textContent = 'Conectado';
      connectionStatus.style.color = '#2ecc71';
    } else {
      connectionStatus.textContent = 'Desconectado';
      connectionStatus.style.color = '#e74c3c';
    }
  }

  function addMessage(text, isSent = false, type = 'text', html = null) {
    const msg = {
      id: Date.now().toString(),
      text,
      html,
      isSent,
      type,
      timestamp: nowISO()
    };
    state.messages.push(msg);
    saveState();
    renderChat();
  }

  function addSystemMessage(text) {
    state.messages.push({
      id: 'sys-' + Date.now(),
      text,
      isSent: false,
      type: 'system',
      timestamp: nowISO()
    });
    saveState();
    renderChat();
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }



  function addContact() {
    const name = (newContactName.value || '').trim();
    if (!name) return;
    const contact = {
      name,
      deviceId: generateDeviceId(),
      createdAt: nowISO()
    };
    state.contacts.push(contact);
    saveState();
    renderContacts();
    newContactName.value = '';
  }

  function removeContact(deviceId) {
    state.contacts = state.contacts.filter(c => c.deviceId !== deviceId);
    saveState();
    renderContacts();
  }
  

 /* expone global para botones inline*/

  window.removeContact = removeContact;

  /* --------------------------
     WebRTC / DataChannel
  -------------------------- */

  function createPeerConnection(isInitiator = true) {
    cleanupConnection();

    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);
    state.connection.pc = pc;
    state.connection.isInitiator = !!isInitiator;
    state.connection.localCandidates = [];
    state.connection.remoteCandidates = [];
    state.connection.connected = false;

    pc.onicecandidate = (e) => {
      // e.candidate === null => end of candidates in many browsers
      if (e.candidate) {
        state.connection.localCandidates.push(e.candidate.toJSON());
      } else {
        // nothing: ICE gathering complete - we may use this to emit connection info
      }
      // Update connection info if local description exists
      if (pc.localDescription) {
        showLocalConnectionJson();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        state.connection.connected = true;
        addSystemMessage('Conexión WebRTC establecida');
        updateConnectionStatus();
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        state.connection.connected = false;
        addSystemMessage('Estado ICE: ' + pc.iceConnectionState);
        updateConnectionStatus();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('PC connectionState', pc.connectionState);
      if (pc.connectionState === 'connected') {
        state.connection.connected = true;
        addSystemMessage('Conexión establecida (connectionState connected)');
      } else if (['disconnected','failed','closed'].includes(pc.connectionState)) {
        state.connection.connected = false;
      }
      updateConnectionStatus();
    };

    // Handler canales entrantes
    pc.ondatachannel = (evt) => {
      console.log('ondatachannel', evt.channel.label);
      state.connection.dc = evt.channel;
      setupDataChannel(state.connection.dc);
    };

    if (isInitiator) {
      // Creamos canal y oferta
      const dc = pc.createDataChannel('chat', { ordered: true });
      state.connection.dc = dc;
      setupDataChannel(dc);

      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => waitForIceGathering(pc))
        .then(() => {
          showLocalConnectionJson();
          addSystemMessage('Oferta generada. Comparte el JSON/QR con el otro usuario.');
        })
        .catch(err => {
          console.error('Error creando oferta', err);
          addSystemMessage('Error creando oferta: ' + (err.message || err));
        });
    }

    return pc;
  }

  function setupDataChannel(dc) {
    if (!dc) return;
    dc.binaryType = 'arraybuffer';
    // Buffer control
    try { dc.bufferedAmountLowThreshold = CHUNK_SIZE * 2; } catch (e) {}

    dc.onopen = () => {
      addSystemMessage('Canal de datos abierto');
      state.connection.connected = true;
      updateConnectionStatus();
    };
    dc.onclose = () => {
      addSystemMessage('Canal de datos cerrado');
      state.connection.connected = false;
      updateConnectionStatus();
    };

    dc.onerror = (e) => {
      console.warn('DataChannel error', e);
      addSystemMessage('Error en DataChannel: ' + (e.message || ''));
    };

    dc.onmessage = (evt) => {
      // Distinguir string / binary
      if (typeof evt.data === 'string') {
        try {
          const parsed = JSON.parse(evt.data);
          handleControlMessage(parsed);
        } catch (err) {
          console.warn('No JSON message:', err);
          addMessage(evt.data, false);
        }
      } else if (evt.data instanceof ArrayBuffer || evt.data instanceof Blob) {
        // fragmento de archivo
        handleIncomingFileChunk(evt.data);
      } else {
        console.log('Received unknown data type', evt.data);
      }
    };
  }

  function handleControlMessage(parsed) {
    if (!parsed || !parsed.type) return;
    if (parsed.type === 'chat') {
      addMessage(parsed.text, false);
    } else if (parsed.type === 'file-meta') {
      state.incomingFile.meta = {
        fileName: parsed.fileName,
        size: parsed.size,
        received: 0
      };
      state.incomingFile.chunks = [];
      addSystemMessage(`Preparando recepción de ${parsed.fileName} (${parsed.size} bytes)`);
    } else if (parsed.type === 'file-end') {
      // reconstruir
      if (state.incomingFile.chunks && state.incomingFile.chunks.length > 0) {
        const blob = new Blob(state.incomingFile.chunks);
        const url = URL.createObjectURL(blob);
        const name = (parsed.fileName || (state.incomingFile.meta && state.incomingFile.meta.fileName)) || 'archivo.bin';
        const linkHtml = `<a href="${url}" download="${escapeHtml(name)}">📥 ${escapeHtml(name)}</a>`;
        addMessage(`Archivo recibido: ${name}`, false, 'file', linkHtml);
      } else {
        addSystemMessage('Recepción de archivo finalizada pero no se recibieron chunks');
      }
      state.incomingFile.meta = null;
      state.incomingFile.chunks = [];
    } else {
      console.log('Control message', parsed);
    }
  }

  function handleIncomingFileChunk(data) {
    // arraybuffer o blob
    state.incomingFile.chunks.push(data);
    if (state.incomingFile.meta) {
      state.incomingFile.meta.received += (data.byteLength || data.size || 0);
    }
    // opcional: podrías mostrar progreso
  }

  /* --------------------------
     ICE / Offer/Answer helpers
  -------------------------- */

  function waitForIceGathering(pc) {
    return new Promise((resolve) => {
      if (!pc) return resolve();
      if (pc.iceGatheringState === 'complete') return resolve();

      let resolved = false;
      const finish = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(killer);
          pc.removeEventListener && pc.removeEventListener('icegatheringstatechange', onState);
          resolve();
        }
      };

      function onState() {
        if (pc.iceGatheringState === 'complete') finish();
      }

      pc.addEventListener && pc.addEventListener('icegatheringstatechange', onState);

      // Fallback timeout
      const killer = setTimeout(() => {
        finish();
      }, ICE_GATHER_TIMEOUT);
    });
  }

  function showLocalConnectionJson() {
    try {
      const pc = state.connection.pc;
      if (!pc || !pc.localDescription) return;
      const payload = {
        sdp: pc.localDescription.sdp,
        type: pc.localDescription.type,
        candidates: state.connection.localCandidates || [],
        profile: state.profile
      };
      // mostrar en textarea
      const pretty = JSON.stringify(payload, null, 2);
      connectionInfo.textContent = pretty;
      generateQrFromText(pretty);
    } catch (err) {
      console.warn('showLocalConnectionJson', err);
    }
  }

  function generateQrFromText(text) {
    // cargamos QRCode lib si no existe
    if (!window.QRCode) {
      // cargar dinamicamente desde CDN
      const src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      if (!document.querySelector(`script[src="${src}"]`)) {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => createQr(text);
        s.onerror = () => {
          console.warn('No se pudo cargar librería QR. Mostrando texto en lugar de QR.');
          qrCode.innerHTML = `<pre style="white-space:pre-wrap; max-height:200px; overflow:auto;">${escapeHtml(text)}</pre>`;
        };
        document.head.appendChild(s);
        // también mostrar texto mientras carga
        qrCode.innerHTML = `<pre style="white-space:pre-wrap; max-height:200px; overflow:auto;">${escapeHtml(text)}</pre>`;
      } else {
        // ya existe etiqueta script pero la lib no está lista: esperar un poco
        setTimeout(() => createQr(text), 400);
      }
    } else {
      createQr(text);
    }

    function createQr(t) {
      try {
        qrCode.innerHTML = '';
        // tamaño responsivo según contenedor
        const size = Math.min(260, Math.max(140, Math.floor(Math.min(qrCode.clientWidth || 200, 260))));
        new QRCode(qrCode, { text: t, width: size, height: size });
      } catch (err) {
        console.warn('createQr error', err);
        qrCode.innerHTML = `<pre style="white-space:pre-wrap; max-height:200px; overflow:auto;">${escapeHtml(t)}</pre>`;
      }
    }
  }

  /* --------------------------
     Conectar con JSON pegado (oferta->respuesta)
  -------------------------- */

  function connectWithText() {
    const txt = (connectionText.value || '').trim();
    if (!txt) return;
    let remote;
    try {
      remote = JSON.parse(txt);
    } catch (err) {
      addSystemMessage('Error: JSON inválido');
      console.error('JSON parse', err);
      return;
    }

    // Si remote tiene type === 'offer', actuamos como answerer
    if (!remote.type || !remote.sdp) {
      addSystemMessage('JSON sin sdp/type detectado.');
      return;
    }

    const pc = createPeerConnection(false);

    pc.setRemoteDescription(new RTCSessionDescription({ type: remote.type, sdp: remote.sdp }))
      .then(() => {
        // agregar candidatos remotos si vienen
        if (remote.candidates && Array.isArray(remote.candidates)) {
          remote.candidates.forEach(c => {
            try {
              pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) { console.warn('addIceCandidate failed', e); }
          });
        }
        return pc.createAnswer();
      })
      .then(answer => pc.setLocalDescription(answer))
      .then(() => waitForIceGathering(pc))
      .then(() => {
        // showLocalConnectionJson se encargará de mostrar answer + candidatos
        showLocalConnectionJson();
        addSystemMessage('Respuesta generada. Comparte el JSON/QR con la otra persona.');
      })
      .catch(err => {
        console.error('connectWithText error', err);
        addSystemMessage('Error al conectar: ' + (err.message || err));
      });
  }

  /* --------------------------
     Enviar Mensajes y Archivos
  -------------------------- */

  function sendMessage() {
    const text = (messageInput.value || '').trim();
    if (!text) return;
    if (!state.connection.dc || state.connection.dc.readyState !== 'open') {
      addSystemMessage('No hay conexión establecida.');
      return;
    }
    const payload = { type: 'chat', text, timestamp: nowISO(), from: state.profile.deviceId };
    try {
      state.connection.dc.send(JSON.stringify(payload));
      addMessage(text, true);
      messageInput.value = '';
    } catch (err) {
      console.error('sendMessage error', err);
      addSystemMessage('Error al enviar mensaje: ' + (err.message || err));
    }
  }

  function sendFile() {
    const file = (fileInput.files && fileInput.files[0]) || null;
    if (!file) {
      addSystemMessage('Selecciona un archivo primero');
      return;
    }
    if (!state.connection.dc || state.connection.dc.readyState !== 'open') {
      addSystemMessage('Canal no abierto para enviar archivo.');
      return;
    }

    const dc = state.connection.dc;
    const fileMeta = { type: 'file-meta', fileName: file.name, size: file.size, timestamp: nowISO() };

    try {
      // mandar metadatos
      dc.send(JSON.stringify(fileMeta));
    } catch (err) {
      console.error('Error enviando meta', err);
      addSystemMessage('Error al enviar metadatos: ' + (err.message || err));
      return;
    }

    const reader = new FileReader();
    let offset = 0;

    function readSlice() {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    }

    reader.onload = (e) => {
      try {
        // Control de buffer - no saturar
        const sendChunk = () => {
          if (dc.bufferedAmount > BUFFERED_THRESHOLD) {
            // esperar a bufferedamountlow
            const onLow = () => {
              try {
                dc.removeEventListener && dc.removeEventListener('bufferedamountlow', onLow);
              } catch(e){}
              try { dc.send(e.target.result); } catch(err) { console.warn('send after low fail', err); }
              offset += CHUNK_SIZE;
              if (offset < file.size) readSlice(); else finalize();
            };
            dc.addEventListener && dc.addEventListener('bufferedamountlow', onLow);
            // fallback: small timeout
            setTimeout(() => {
              try { if (dc.bufferedAmount <= BUFFERED_THRESHOLD) onLow(); } catch(e) {}
            }, 200);
          } else {
            dc.send(e.target.result);
            offset += CHUNK_SIZE;
            if (offset < file.size) {
              // leer siguiente
              readSlice();
            } else {
              finalize();
            }
          }
        };
        sendChunk();
      } catch (err) {
        console.error('error sending chunk', err);
        addSystemMessage('Error enviando chunk: ' + (err.message || err));
      }
    };

    reader.onerror = (err) => {
      console.error('FileReader error', err);
      addSystemMessage('Error leyendo archivo: ' + (err.message || err));
    };

    function finalize() {
      try {
        dc.send(JSON.stringify({ type: 'file-end', fileName: file.name, timestamp: nowISO() }));
        addMessage(`📁 Archivo enviado: ${file.name}`, true);
        fileInput.value = '';
      } catch (err) {
        console.error('error finalize', err);
        addSystemMessage('Error al finalizar envío: ' + (err.message || err));
      }
    }

    // comenzar envio
    readSlice();
  }

  /* --------------------------
     Limpieza / reinicio conexión
  -------------------------- */
  function cleanupConnection() {
    try {
      if (state.connection.dc) {
        try { state.connection.dc.close(); } catch(e) {}
        state.connection.dc = null;
      }
      if (state.connection.pc) {
        try { state.connection.pc.close(); } catch(e) {}
        state.connection.pc = null;
      }
    } catch (err) {
      console.warn('cleanupConnection', err);
    }
    state.connection.connected = false;
    updateConnectionStatus();
  }

  /* --------------------------
     Inicialización & eventos
  -------------------------- */
  function bindUI() {
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    sendFileButton.addEventListener('click', sendFile);
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        addSystemMessage(`Seleccionado archivo: ${e.target.files[0].name}`);
      }
    });

    addContactButton.addEventListener('click', addContact);
    newContactName.addEventListener('keypress', (e) => { if (e.key === 'Enter') addContact(); });

    connectButton.addEventListener('click', connectWithText);

    // útil: permitir pegar JSON y auto-trigger con Ctrl+V (opcional)
    // (no activado para no interferir)
  }

  function init() {
    loadState();
    bindUI();
    renderContacts();
    renderChat();
    updateConnectionStatus();

    // Crear una conexión y generar oferta automáticamente (comportamiento previo)
    try {
      createPeerConnection(true);
      addSystemMessage('Inicializando: se generará una oferta automática (copia/pega el JSON o usa el QR).');
    } catch (err) {
      console.error('init createPeerConnection', err);
      addSystemMessage('Error inicializando WebRTC: ' + (err.message || err));
    }
  }

  /* --------------------------
     Inicializar
  -------------------------- */
  init();

  /* --------------------------
     Exponer funciones útiles para debugging
  -------------------------- */
  window.p2pState = state;
  window.p2pSaveState = saveState;
  window.p2pAddContact = addContact;
  window.p2pCreateOffer = function () { createPeerConnection(true); addSystemMessage('Creando nueva oferta...'); };

})(); // fin IIFE


//    < script src="app.js"></script>
  
/*
   justo antes del `</body>`.
3. Si quieres, añade manualmente la librería QR en `p2p.html` (opcional, el script la carga solo):

   ```html
   
   <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
   ```
4. Abrir dos pestañas / dos dispositivos, en una copia el JSON que aparece en `connectionInfo` en la otra y pégalo en el textarea `connectionText` y clic en "Conectar". Repite con la respuesta (la idea es manual-signaling). Si quieres señalización automática veremos Firebase o WebSocket en el siguiente paso.

---

¿Quieres que además te prepare **la versión con señalización automática usando Firebase (Firestore o Realtime DB)** para que no tengas que copiar/pegar nada?
Puedo hacerlo y te doy el `app.js` adaptado y las instrucciones para configurar el proyecto Firebase (es rápido).
