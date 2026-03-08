

# portafolio






```
🗂️ ESTRUCTURA BASE DEL PROYECTO “FUNNEL ÉTICO”
funnel-etico/
│
├── README.md
├── .gitignore
├── .env.example
│
├── /api/                         ← Backend Node.js
│   ├── package.json
│   ├── server.js
│   ├── email.js
│   ├── /db/
│   │   └── leads.sqlite          ← Base de datos local
│   └── /tests/
│       └── test-subscribe.http   ← Para probar el endpoint
│
├── /web/                         ← Frontend React
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── LandingPage.jsx
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   └── tailwind.config.js
│
├── /docs/                        ← Documentación y guiones
│   ├── scripts-youtube.md
│   ├── logs/
│   │   └── semana1.md
│   └── roadmap.md
│
└── /config/
    ├── firebase-config.js        ← (para conectar más adelante)
    └── vercel.json               ← si despliegas en Vercel

```






#    🧰 ARCHIVOS BASE 📄 .gitignore



Node
node_modules/ .env *.log

Builds
dist/ build/ .cache/

Database
/db/*.sqlite

IDE
.vscode/ .DS_Store Thumbs.db



📄 .env.example PORT=4000 SENDGRID_API_KEY=your_sendgrid_key


Copia este archivo, renómbralo como .env y rellena los valores.



#   📘 README.md


🎯 Funnel Ético
Embudo automatizado con React, Node, SQLite y SendGrid.

🚀 Estructura
/api → Backend y base de datos (SQLite)
/web → Landing Page React + Tailwind
/docs → Guiones, logs y documentación
💾 Instalación
cd api && npm install
node server.js


En otro terminal:

cd web && npm install
npm run dev

🧩 Flujo

Landing → Registro (form) → Guardado SQLite → Email automático (SendGrid)


---

### 📜 `/docs/roadmap.md`
```markdown
# 🌱 Roadmap General

## Semana 1 — Funnel Ético
- Backend funcional con registro y correo.
- Landing conectada al endpoint.
- Primeros leads en base de datos.

## Semana 2 — Estrategia y Mensaje Ético (#2)
- Aprender copywriting responsable.
- Crear anuncios en YouTube Ads.

## Semana 3 — Automatización y Tecnología (#3)
- Configurar CI/CD con GitHub Actions.
- Sincronizar Firebase o Render.

## Semana 4 — Enseñar para Escalar (#5)
- Crear tu primer mini curso (video o texto).
- Grabar y publicar 1 clase en formato beta.
