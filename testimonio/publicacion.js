	<script>
  (function(){
    // Helpers
    const $ = id => document.getElementById(id);
    const nowISO = () => new Date().toLocaleString();
    const storageKey = 'uc_testimony_v1';

    // Init UI
    $('uc-time').textContent = nowISO();

    // Compute SHA-256 hex
    async function sha256Hex(str){
      const enc = new TextEncoder().encode(str);
      const hash = await crypto.subtle.digest('SHA-256', enc);
      const bytes = new Uint8Array(hash);
      return Array.from(bytes).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    // Build canonical content
    async function buildContent(){
      const name = $('uc-name').value.trim();
      const text = $('uc-text').value.trim();
      const timestamp = $('uc-time').textContent || nowISO();
      const content = [
        '--- Testimonio — Universe City (registro local) ---',
        'Nombre/Alias: ' + (name || '(sin nombre)'),
        'Marca de tiempo: ' + timestamp,
        '',
        'Declaración:',
        text || '(vacío)',
        '',
        'URLs / repos (añade aquí dentro tu listado):',
        // dejamos espacio para que pegues URLs manualmente dentro del textarea
        '',
        '--- Fin del registro ---'
      ].join('\\n');
      const hash = await sha256Hex(content);
      return { content, hash, timestamp, name };
    }

    // Update hash display live (debounced)
    let debTimer = 0;
    function scheduleHashUpdate(){
      clearTimeout(debTimer);
      debTimer = setTimeout(async () => {
        const { hash } = await buildContent();
        $('uc-hash').textContent = hash;
      }, 300);
    }
    $('uc-text').addEventListener('input', scheduleHashUpdate);
    $('uc-name').addEventListener('input', scheduleHashUpdate);
    scheduleHashUpdate();

    // Save to localStorage (append)
    $('uc-save').addEventListener('click', async () => {
      try{
        const { content, hash, timestamp, name } = await buildContent();
        const entry = { name, timestamp, content, hash };
        const raw = localStorage.getItem(storageKey);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push(entry);
        localStorage.setItem(storageKey, JSON.stringify(arr));
        alert('Guardado localmente ✔ (puedes exportar el .txt)');
      }catch(e){ alert('Error guardando localmente: ' + e.message); }
    });

    // Download .txt
    $('uc-download').addEventListener('click', async () => {
      const { content, hash, timestamp, name } = await buildContent();
      const full = content + '\\nHash: ' + hash + '\\n';
      const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (name || 'testimonio').replace(/[^a-z0-9\\-_]/gi,'_').slice(0,40);
      a.download = safeName + '_' + timestamp.replace(/[^0-9]/g,'').slice(0,14) + '.txt';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // Copy to clipboard
    $('uc-copy').addEventListener('click', async () => {
      const { content, hash } = await buildContent();
      const full = content + '\\nHash: ' + hash;
      try{
        await navigator.clipboard.writeText(full);
        alert('Contenido copiado al portapapeles ✔');
      }catch(e){ alert('No se pudo copiar. Usa descargar o selecciona manualmente.'); }
    });

    // Print (open new window)
    $('uc-print').addEventListener('click', async () => {
      const { content, hash } = await buildContent();
      const win = window.open('', '_blank', 'noopener');
      win.document.write('<pre style="font-family:Inter,Arial,monospace;">' + escapeHtml(content + '\\nHash: ' + hash) + '</pre>');
      win.document.close();
      win.focus();
      win.print();
    });

    // Lock / unlock: make textarea readonly
    function setLocked(v){
      $('uc-text').readOnly = v;
      $('uc-name').readOnly = v;
      localStorage.setItem(storageKey + '_locked', v ? '1' : '0');
      $('uc-lock').textContent = v ? 'Desbloquear' : 'Bloquear';
    }
    $('uc-lock').addEventListener('click', () => {
      const cur = localStorage.getItem(storageKey + '_locked') === '1';
      setLocked(!cur);
    });
    // read initial lock
    setLocked(localStorage.getItem(storageKey + '_locked') === '1');

    // Helper to escape html for print
    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // initialize hash on load
    scheduleHashUpdate();

  })();
</script>
