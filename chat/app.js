








// Ejemplo simple (pseudo)
fetch("https://tu-servidor.com/signal", { method: "POST", body: JSON.stringify(offer) })

pc.onicecandidate = (event) => console.log('Candidato ICE:', event.candidate);

let incomingFile = [];
let incomingMeta = null;

dc.onmessage = (event) => {
  if (typeof event.data === "string") {
    const data = JSON.parse(event.data);
    if (data.type === "file-meta") incomingMeta = data;
    if (data.type === "file-end") {
      const blob = new Blob(incomingFile);
      const url = URL.createObjectURL(blob);
      addMessage(`📥 Archivo recibido: <a href="${url}" download="${incomingMeta.fileName}">${incomingMeta.fileName}</a>`, false);
      incomingFile = [];
      incomingMeta = null;
    }
  } else {
    incomingFile.push(event.data);
  }
};

// < script src="https://cdn.jsdelivr.net/npm/qrcodejs/qrcode.min.js"></script>

new QRCode(document.getElementById("qrCode"), JSON.stringify(offerJson));



<script id="config" type="application/json">
{
  "autoLoad": true,
  "repos": ["home", "online", "bius"],
  "mode": "sync"
}
</script>

<script src="main.js"></script>
const config = JSON.parse(document.getElementById('config').textContent);
console.log(config.autoLoad);
