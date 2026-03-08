

#   CATALOGO

Respira 😅 no me enojo, y sí: 


**te ayudo con TODO**.
Lo voy a hacer **ordenado, usable y realista**, para que **copies/pegues** y lo adaptes a **BIO-US / Universe City / Oscar profesional** sin backend por ahora.

Te entrego **3 cosas claras**:

1. **HTML** → un `<div id="formulario">` que puedes incrustar en cualquier página
2. **JS** → lógica tipo *carrito / ticket* (elige servicios, calcula, genera texto)
3. **Salidas** →

   * link automático a **Gmail (mailto)**
   * link automático a **WhatsApp**
   * **PDF del ticket/solicitud** (cliente + contrato resumido)

Todo **100% frontend**, ético, sin hacks raros.

---

## 1️⃣ HTML — FORMULARIO + CARRITO + TICKET

👉 puedes pegar esto **tal cual** dentro de tu página profesional

```html
<div id="formulario" class="card">
  <h2>Solicitud de servicios técnicos</h2>
  <p class="muted">Selecciona los servicios. Se generará un ticket, mensaje y PDF.</p>

  <form id="serviceForm">
    <label>Nombre completo
      <input type="text" id="name" required>
    </label>

    <label>Email
      <input type="email" id="email" required>
    </label>

    <label>Teléfono / WhatsApp
      <input type="tel" id="phone">
    </label>

    <label>Tipo de servicio(s)</label>

    <div class="service">
      <input type="checkbox" value="Vinculación TV ↔ Laptop|350" class="serviceOpt">
      Vinculación TV ↔ Laptop — $350
    </div>

    <div class="service">
      <input type="checkbox" value="Optimización de PC / Laptop|400" class="serviceOpt">
      Optimización y limpieza — $400
    </div>

    <div class="service">
      <input type="checkbox" value="Instalación de software oficial|300" class="serviceOpt">
      Instalación de software oficial — $300
    </div>

    <div class="service">
      <input type="checkbox" value="Asesoría / docencia programación (1h)|200" class="serviceOpt">
      Docencia / asesoría programación (1h) — $200
    </div>

    <div class="service">
      <input type="checkbox" value="Soporte mensual|900" class="serviceOpt">
      Soporte mensual — $900
    </div>

    <label>Comentarios adicionales
      <textarea id="details" rows="3"></textarea>
    </label>

    <div class="check">
      <input type="checkbox" id="accept" required>
      <label for="accept">
        Acepto el contrato de servicio y política ética (software original).
      </label>
    </div>

    <button type="button" class="btn" onclick="generarTicket()">
      Generar ticket
    </button>
  </form>

  <hr>

  <div id="ticket" style="display:none">
    <h3>Ticket de solicitud</h3>
    <pre id="ticketText"></pre>

    <a id="gmailLink" class="btn" target="_blank">Enviar por Gmail</a>
    <a id="waLink" class="btn" target="_blank">Enviar por WhatsApp</a>
    <button class="btn" onclick="generarPDF()">Descargar PDF</button>
  </div>
</div>
```

---

## 2️⃣ JAVASCRIPT — LÓGICA (carrito + mensaje + links)

👉 guárdalo como `formulario.js` o dentro de `<script>`

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

<script>
function generarTicket() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const details = document.getElementById('details').value;

  const services = document.querySelectorAll('.serviceOpt:checked');
  if (services.length === 0) {
    alert("Selecciona al menos un servicio");
    return;
  }

  let total = 0;
  let lista = '';

  services.forEach(s => {
    const [nombre, precio] = s.value.split('|');
    total += Number(precio);
    lista += `- ${nombre} ($${precio})\n`;
  });

  const ticket =
`SOLICITUD DE SERVICIO — BIO-US / Universe City

Cliente: ${name}
Email: ${email}
Teléfono: ${phone}

Servicios solicitados:
${lista}
Total estimado: $${total} MXN

Comentarios:
${details || 'Ninguno'}

Condiciones:
• Software original
• Sin KMS ni cracks
• Trabajo ético y documentado

Fecha: ${new Date().toLocaleString()}
`;

  document.getElementById('ticketText').textContent = ticket;
  document.getElementById('ticket').style.display = 'block';

  // Gmail
  const subject = encodeURIComponent("Solicitud de servicio técnico");
  const body = encodeURIComponent(ticket);
  document.getElementById('gmailLink').href =
    `mailto:TUEMAIL@gmail.com?subject=${subject}&body=${body}`;

  // WhatsApp
  document.getElementById('waLink').href =
    `https://wa.me/52TUNUMERO?text=${body}`;
}

function generarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const text = document.getElementById('ticketText').textContent;

  pdf.setFont("courier");
  pdf.setFontSize(10);
  pdf.text(text, 10, 10, { maxWidth: 190 });

  pdf.save("solicitud_servicio_BIOUS.pdf");
}
</script>
```

🔁 **Solo cambia:**

* `TUEMAIL@gmail.com`
* `52TUNUMERO` (WhatsApp con LADA)

---

## 3️⃣ ¿QUÉ TIENES YA CON ESTO?

✔ formulario profesional
✔ carrito de servicios
✔ ticket automático
✔ contrato implícito
✔ Gmail + WhatsApp
✔ PDF descargable
✔ 100% frontend
✔ listo para crecer a Stripe / backend después

Esto **YA ES VENDIBLE**, usable y ético.

---

## SIGUIENTE NIVEL (cuando quieras)

Puedo ayudarte a:

* 🔐 login de cliente
* 🧾 historial de tickets (localStorage / Supabase)
* 💳 Stripe + OXXO
* 🧠 precios dinámicos
* 📦 paquetes gamer / PC / docencia
* 🌐 convertirlo en landing BIO-US completa

Tú no estás improvisando, oski.
Esto ya es **sistema real**, con alma y cabeza 💙




JAJAJA sí, **buena pregunta** — y tranqui, aquí va la neta, sin humo 👇

## ✅ ¿Vercel puede usar repositorios **privados** de tu GitHub?

**SÍ. TOTALMENTE SÍ.** 😎
No necesitan ser públicos.

---

## 🔐 Cómo funciona en realidad

Cuando conectas **Vercel ↔ GitHub**, tú autorizas a Vercel a:

* Ver repos **públicos**
* Ver repos **privados** (solo los que tú permitas)
* Leer código (NO escribir)

👉 Eso se hace **una sola vez** desde GitHub OAuth.

---

## 🧠 Escenario BIO-US / Universe City (el tuyo)

Puedes tener algo así:

```
github.com/oscar/
├─ bio-us-landing        (repo público)  → Vercel (frontend)
├─ bio-us-formulario     (repo privado)  → Vercel (micro-app)
├─ bio-us-contratos      (repo privado)  → PDF / textos legales
├─ bio-us-config         (repo privado)  → JSON precios / servicios
```

### ¿Y Vercel?

* Cada repo puede ser **un deployment distinto**
* O puedes **importar uno solo** y usar los demás como:

  * submódulos
  * paquetes
  * endpoints serverless
  * o copiar build-time

---

## ⚠️ Importante (reglas reales)

### 1️⃣ Repos privados → OK

✔ funcionan igual que públicos
✔ deployments normales
✔ previews también

### 2️⃣ Vercel **NO expone** repos privados

* El código **NO se vuelve público**
* Solo el **resultado build** (HTML/JS)

### 3️⃣ Repos privados entre sí

Sí puedes:

* importar repos privados desde otro repo privado
* **PERO** necesitas:

  * GitHub token
  * o submodule con permisos

(para frontend puro muchas veces **no hace falta**)

---

## 🧩 Ejemplo práctico (lo tuyo)

### Opción A — más simple (recomendada)

* 1 repo **principal** (landing)
* Copias el `<div id="formulario"> + js`
* Deploy directo → listo

### Opción B — pro / modular

* `bio-us-formulario` (privado)
* Vercel lo despliega como:

  ```
  formulario.bio-us.vercel.app
  ```
* Lo incrustas con `<iframe>` o fetch

### Opción C — ultra pro (cuando escales)

* repo privado con lógica
* Vercel serverless functions
* Stripe / PDF / DB

---

## 🧾 Preguntas rápidas (sí / no)

* ¿Repos privados en Vercel? → **Sí**
* ¿Necesitan ser públicos? → **No**
* ¿Puedo usar varios repos privados? → **Sí**
* ¿Se filtra el código? → **No**
* ¿Gratis? → **Sí** (con límites normales)

---

## 💡 Consejo real (de compa)

Para **ahorita**:
👉 **repo privado + Vercel + frontend puro**
👉 rápido, seguro, cero estrés

Cuando quieras:

* separamos contratos
* migramos PDF a serverless
* metemos Stripe / Supabase

Si quieres, dime:

* ¿1 repo o varios?
* ¿iframe o integrado?
* ¿con o sin backend por ahora?

Y lo dejamos **perfecto para producción**, no demo 😉
