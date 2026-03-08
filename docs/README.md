
#     ** PROYECTO  listo para producción** en Vercel + Supabase, con todo lo que pediste: conexión a Supabase, paginación/infinite scroll (lazy-load por lotes), CMS ligero con auth/roles, estructura de repo + `README.md`, y mejoras de estilo neon. Te doy la **guía completa** + **código listo** para pegar en archivos. Lo dejo todo en pasos concretos y prácticos para que arranques YA.

---



# 1) Estructura recomendada del repo

usa un solo repo y organiza por carpetas. Ejemplo:

```
ozclef-website/
├─ public/                      # archivos estáticos que sirve Vercel (para GitHub Pages usar /)
│  ├─ portafolio/index.html
│  ├─ cv/index.html
│  └─ ...                       # otras páginas "static"
├─ src/
│  ├─ css/
│  │  └─ styles.css
│  ├─ js/
│  │  ├─ supabase.js            # init supabase client
│  │  ├─ app.js                 # lógica principal (SPA, render)
│  │  └─ lazyload.js            # IntersectionObserver / infinite scroll
│  └─ html/
│     └─ plantilla.html          # la plantilla principal (puedes renombrar a index.html)
├─ functions/                    # (opcional) serverless functions (Vercel) para acciones seguras
├─ .env                           # local dev env (no subirlo)
├─ .gitignore
└─ README.md
```

Preferible: en Vercel pon `public` como carpeta pública (o usa root si quieres). Para tu caso, `ozclef.vercel.app/portafolio/index.html` funcionará si despliegas `public/portafolio/index.html`.

---

# 2) Supabase — esquema y políticas RLS (esencial)

## SQL para crear tabla `posts` y `profiles`

Pega esto en SQL Editor de Supabase → New query:

```sql
-- tabla de usuarios (profiles)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  is_admin boolean default false,
  avatar_url text
);

-- tabla de posts (youtube, image, link)
create table posts (
  id uuid primary key default uuid_generate_v4(),
  owner uuid references profiles(id) on delete set null,
  type text not null,           -- 'youtube' | 'image' | 'link'
  url text not null,
  title text,
  description text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- enable uuid function if not present
create extension if not exists "pgcrypto";
```

## Políticas RLS (Row Level Security)

Activa RLS en la tabla `posts` y añade estas políticas:

```sql
-- activar RLS
alter table posts enable row level security;

-- policy: leer para todos (lectura pública)
create policy "public_select_posts" on posts
  for select using (true);

-- policy: insertar solo usuarios autenticados
create policy "insert_posts_auth" on posts
  for insert with check (auth.role() = 'authenticated');

-- policy: update/delete propio o admin
create policy "update_own_or_admin" on posts
  for update using (auth.uid() = owner) with check (auth.uid() = owner OR exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
create policy "delete_own_or_admin" on posts
  for delete using (auth.uid() = owner OR exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));
```

> Nota: para que `profiles.is_admin` funcione, debes poblar `profiles` tras el registro del usuario (ver abajo). También puedes crear una policy admin separada usando `auth.jwt()` claims si prefieres.

---

# 3) Variables de entorno (Vercel & local)

En Supabase creas el proyecto y copias:

* `SUPABASE_URL` (project URL)
* `SUPABASE_ANON_KEY` (public anon key — ok para cliente)

No subas `service_role` al cliente. Para acciones admin usa funciones serverless o edge functions con `service_role` protegido.

En Vercel, ve a Project Settings → Environment Variables y añade:

* `NEXT_PUBLIC_SUPABASE_URL` = tu supabase url
* `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key

(localmente pon en `.env.local` o `.env` pero **no** subas ese archivo)

---

# 4) Código: archivos JS y CSS (copiar/pegar)

### `src/js/supabase.js`

```js
// src/js/supabase.js
// Inicializa el cliente Supabase (usa las env vars en Vercel)
const SUPABASE_URL = window.SUPABASE_URL || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if(!SUPABASE_URL || !SUPABASE_ANON_KEY) console.warn('Supabase vars faltantes.');

const supabase = supabaseJs.createClient
  ? supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// helper
async function getProfile(userId){
  if(!supabase) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}
```

> **IMPORTANTE**: en HTML incluye `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>` antes de este archivo o instala con bundler.

---

### `src/js/app.js` (lógica principal: CRUD + render + auth)

```js
// src/js/app.js
// Dependencias: supabase.js debe estar cargado primero.

const PAGE_SIZE = 6; // posts por "page" (ajusta)
let page = 0;
let loading = false;
let noMore = false;
const feedEl = document.getElementById('feed');

async function loadNextBatch(){
  if(loading || noMore) return;
  loading = true;
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if(error){ console.error(error); loading=false; return; }
  if(!data || data.length === 0){ noMore = true; loading=false; return; }

  data.forEach(p => {
    feedEl.appendChild(makeCard(p));
  });
  page++;
  loading = false;
  lazyloadObserveBatch(); // observa las miniaturas cargadas
}

function makeCard(post){
  const art = document.createElement('article');
  art.className = 'card';
  art.dataset.id = post.id;
  art.innerHTML = `
    <h4>${escapeHtml(post.title || '')}</h4>
    <p>${escapeHtml(post.description || '')}</p>
    <div class="media">
      ${post.type === 'youtube' ? `<img class="thumb" data-video-id="${post.url}" loading="lazy" alt="${escapeHtml(post.title)}">` : ''}
      ${post.type === 'image' ? `<img class="thumb" src="${post.url}" loading="lazy" alt="${escapeHtml(post.title)}">` : ''}
      ${post.type === 'link'  ? `<div class="link-preview"><a href="${post.url}" target="_blank">${post.url}</a></div>` : ''}
    </div>
    <div class="meta"><span>${new Date(post.created_at).toLocaleString()}</span></div>
  `;
  // click en thumb -> cargar iframe
  const thumb = art.querySelector('.thumb[data-video-id]');
  if(thumb) thumb.addEventListener('click', ()=>loadYouTubeInline(art, post.url));
  return art;
}

function loadYouTubeInline(card, id){
  const media = card.querySelector('.media');
  if(!media) return;
  const iframe = document.createElement('iframe');
  iframe.width = '100%';
  iframe.height = '320';
  iframe.src = `https://www.youtube.com/embed/${id}?rel=0&autoplay=1`;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  media.innerHTML = '';
  media.appendChild(iframe);
  // store en localStorage si quieres: videos cargados
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// Auth (registro/login)
async function signUp(email, password, display_name){
  const { user, error } = await supabase.auth.signUp({ email, password });
  if(error) throw error;
  // espera confirmación de correo; luego crea profile row (puedes hacerlo con webhook o aquí)
  return user;
}

async function signIn(email, password){
  const { user, error } = await supabase.auth.signIn({ email, password });
  if(error) throw error;
  return user;
}

async function signOut(){
  await supabase.auth.signOut();
}

// escucha cambios de sesión
supabase.auth.onAuthStateChange((event, session) => {
  // actualizar UI: mostrar usuario, permisos...
});
```

---

### `src/js/lazyload.js` (IntersectionObserver + infinite scroll)

```js
// src/js/lazyload.js
let observerThumbs;
function lazyloadObserveBatch(){
  const main = document.querySelector('main') || document;
  const imgs = document.querySelectorAll('.thumb[data-video-id]');
  if(observerThumbs) observerThumbs.disconnect();
  observerThumbs = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if(en.isIntersecting){
        const img = en.target;
        if(img.dataset.videoId && !img.src){
          img.src = `https://i.ytimg.com/vi/${img.dataset.videoId}/hqdefault.jpg`;
        }
        obs.unobserve(img);
      }
    });
  }, { root: main, rootMargin: '300px' });
  imgs.forEach(i=>observerThumbs.observe(i));
}

// Infinite scroll: disparar loadNextBatch cuando el final esté visible
function setupInfiniteScroll(sentinelId='sentinel'){
  let sentinel = document.getElementById(sentinelId);
  if(!sentinel){
    sentinel = document.createElement('div'); sentinel.id = sentinelId;
    document.body.appendChild(sentinel);
  }
  const io = new IntersectionObserver(entries => {
    if(entries[0].isIntersecting) loadNextBatch();
  }, { root: null, rootMargin: '600px' });
  io.observe(sentinel);
}
```

En `index.html` al final carga los scripts en este orden:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>
<script src="/src/js/supabase.js"></script>
<script src="/src/js/lazyload.js"></script>
<script src="/src/js/app.js"></script>
<script> // init
  loadNextBatch();
  setupInfiniteScroll();
</script>
```

---

### `src/css/styles.css` (extracto — usa tu neon theme)

Incluye los estilos que ya tienes (glassmorphism + neon). Asegúrate de optimizar fuentes y evitar fonts pesadas.

```css
:root{ --bg1:#0f0c29; --bg2:#302b63; --neon1:#00f5ff; --neon2:#ff00c8; --card-bg: rgba(255,255,255,0.03); }
body{ background: linear-gradient(135deg,var(--bg1),var(--bg2)); color:#e9f0ff; font-family:Inter,system-ui; margin:0; }
.app{ max-width:1100px; margin:20px auto; display:grid; grid-template-columns:260px 1fr 300px; gap:18px; }
.card{ background:var(--card-bg); padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06); transition:transform .15s; }
.card:hover{ transform: translateY(-6px) scale(1.02); box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
.thumb{ width:100%; height:220px; object-fit:cover; display:block; cursor:pointer; }
@media(max-width:900px){ .app{ grid-template-columns:1fr; } .left, .right{ display:none; } }
```

---

# 5) Mini-CMS: auth, roles y edición

* Usa Supabase Auth para registro/login (email/password o magic link).
* Al registrarse, crea un `profiles` row. Puedes usar **Supabase Auth Hook** (webhook) o en cliente tras signUp obtener `user.id` y llamar a `profiles` insert.

Ejemplo: crear profile tras registro (cliente):

```js
async function createProfileForUser(user, username){
  await supabase.from('profiles').insert({
    id: user.id,
    username,
    display_name: username,
    is_admin: false
  });
}
```

### Edición de posts (UI)

* En `makeCard()` si `currentUser.id === post.owner` o `currentUser.is_admin` muestra botones `Editar` / `Eliminar`.
* Para editar -> abrir modal con campos -> llamar a Supabase `update`:

```js
await supabase.from('posts').update({ title, description, tags }).eq('id', postId);
```

* Eliminar:

```js
await supabase.from('posts').delete().eq('id', postId);
```

RLS se asegura que sólo el dueño o admin pueda hacerlo.

---

# 6) Paginación / Infinite Scroll — recomendaciones prácticas

* `PAGE_SIZE = 6` o `8` está bien.
* Usa `.range(from,to)` en Supabase para paginar (eficiente).
* Carga thumbnails por lotes (IntersectionObserver) — no iframes.
* Evita cargar iframes hasta que el usuario haga click en la miniatura o abra la publicación.
* Para "previews" en el main, muestra mini-cards (sin iframe) y al expandir carga contenido completo.

---

# 7) Previews / expand (lo que pediste: mini vistas que abren al clic)

Implementa un modal "preview" en `makeCard()`:

```js
card.querySelector('...').addEventListener('click', ()=>{
  // abrir modal con contenido full (iframe o imagen grande)
});
```

Así en la página principal no cargas iframes: solo en modal o cuando el usuario lo decida.

---

# 8) Subpáginas (/portafolio, /cv, /pictures)

* Mantén archivos bajo `public/portafolio/index.html`, `public/cv/index.html`, `public/pictures/index.html`.
* En cada sección puedes incluir la misma `src/js/*` y `src/css/styles.css` para mantener consistencia.
* Para evitar duplicación, si más tarde migras a Next/React puedes convertir estas páginas en rutas.

---

# 9) Optimización adicional (para no quemar RAM ni datos)

1. **Miniaturas**: siempre thumbnails (YouTube thumbnails) y `loading="lazy"`.
2. **Compress images**: subir WebP, generar 200–400px thumbnails.
3. **Cache-control + Service Worker**: cachear assets estáticos y thumbnails.
4. **CDN**: imágenes en Supabase Storage con CDN o Cloudinary.
5. **Limit DOM nodes**: renderiza sólo la página visible, usa virtual scrolling si tienes 1000 posts.
6. **Evita fuentes web pesadas**; usa system fonts.
7. **Debounce búsqueda** y `input` handlers.
8. **No iframes al inicio**: iframes solo bajo demanda.

---

# 10) `README.md` básico (copia y pega)

```md
# ozclef-website

Plantilla Neon Feed — perfil y mini-CMS para compartir videos, fotos y links.
Despliegue: Vercel. Backend: Supabase.

## Estructura
- `public/` → páginas públicas
- `src/css/` → estilos
- `src/js/` → scripts (supabase.js, app.js, lazyload.js)
- `functions/` → serverless functions (opcional)
- `.env` → variables de entorno (no subir)

## Requisitos
- Cuenta Supabase (crear proyecto)
- Variables env:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY

## SQL (crear tablas)
... (pegar SQL de este README)

## Deployment
1. Push al repo en GitHub.
2. Conectar repo en Vercel.
3. Añadir variables de entorno en Vercel.
4. Deploy.

## Notas
- Los iframes de YouTube solo se cargan bajo demanda (click).
- Export/Import JSON via localStorage + export button.
```

---

# 11) Pasos prácticos — qué hacer ahora (ordenado)

1. **Crear proyecto Supabase** → copiar URL y anon key.
2. **Ejecutar SQL** (tablas + RLS) en Supabase.
3. **Configurar variables** en Vercel (NEXT_PUBLIC_SUPABASE_URL / KEY).
4. **Actualizar tu repo** con estructura propuesta (`public/`, `src/`) y subirlo.
5. **Pegar los archivos JS/CSS** que te di en `src/js` y `src/css`.
6. **Probar local**: abre `public/index.html`; revisa consola y network.
7. **Conectar auth**: prueba register/login y crea profile row.
8. **Probar crear post** desde la UI; ver si aparece.
9. **Deploy** a Vercel; prueba desde `ozclef.vercel.app`.

---

# 12) Cosas opcionales que puedo hacer AHORA mismo (elige lo que quieres que te entregue ya):

* A) **Código listo** para `src/js/supabase.js`, `app.js`, `lazyload.js`, `styles.css` completos y pegables (te doy archivos completos).
* B) **Archivo `README.md` completo** con todos los pasos de deploy y SQL (listo para copiar al repo).
* C) **Script de creación de `profiles` en Supabase** (Edge function o trigger) para crear profile al registrarse.
* D) **Ejemplo de Vercel function** para acciones admin (usar service_role) — seguro.
* E) **Convertir plantilla a React + Framer Motion** con animaciones neon (si quieres SPA con mejores efectos).

Dime cuáles quieres *ahora mismo* y te los pego listo para copiar. (Puedo darte todo en un sólo mensaje si quieres —no pregunto nada más— te lo entrego completo).
