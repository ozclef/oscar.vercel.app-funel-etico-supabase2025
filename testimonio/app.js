



const app = document.getElementById("app");

async function loadJSON(path){
  const res = await fetch(path);
  return res.json();
}

async function render(){
  const hash = location.hash || "#/feed";
  const [_, route] = hash.split("/");

  const profile = await loadJSON("data/profile.json");

  document.documentElement.className = profile.theme === "light" ? "light" : "";

  let html = `
  <header>
    <div><strong>Oscar Cruz Díaz / Testimonio  </strong></div>
    <nav>
      <a href="#/feed">Feed</a>
      <a href="#/profile">Perfil</a>
      <a href="#/photos">Fotos</a>
      <a href="#/videos">Videos</a>
      <a href="#/settings">Ajustes</a>
    </nav>
  </header>
  <div class="container">
  `;

  if(route === "feed") html += await viewFeed();
  if(route === "profile") html += viewProfile(profile);
  if(route === "photos") html += viewPhotos();
  if(route === "videos") html += viewVideos();
  if(route === "settings") html += viewSettings(profile);

  html += `</div>`;
  app.innerHTML = html;
}

async function viewFeed(){
  const feed = await loadJSON("data/feed.json");
  let out = `<div class="card"><h2>Feed</h2>`;
  feed.forEach(p=>{
    out += `

	<div class="feed-item">
<iframe src="feed.html" width="100%" height="900px">
	</div>
    <div class="feed-item">
	
      <img class="thumb" loading="lazy" src="${p.img}">
      <div>
        <h3>${p.title}</h3>
        <p>${p.text}</p>
        <a class="btn" href="${p.url}">Abrir</a>
      </div>
    </div>`;
  });
  return out + `</div>`;
}

function viewProfile(p){
  return `
  <div class="cover" style="background-image:url('${p.cover}')"></div>
  <div class="card">
    <img class="profile-pic" src="${p.avatar}">
    <h2>${p.name}</h2>
    <p>${p.bio}</p>
  </div>
<div class="card">
 <iframe src="cv/index.html" width="" height="720px">
		 </div>
  
	  `;
}

function viewPhotos(){
  return `
  <div class="card"><h2>Fotos</h2>
    <p>Carpeta /img/</p>
  </div>`;
}

function viewVideos(){
  return `
  <div class="card"><h2>Videos</h2>
  <p>Videos offline local — próximamente.</p>

                  <section>
 <div class="card">
					<p>bruna palessi xD </p>
	<iframe src="https://www.youtube.com/embed/6HF6tRERJNI" title="Engañaron a INFLUENCERS de moda solo con unos zapatos" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
		<p> yo soy el lenard</p>
	<iframe  src="https://www.youtube.com/embed/ofpTVNRm0-0" title="Por favor no te rindas con ella 😅 #shorts" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

22/09/25 7:20 a.m.
<iframe  src="https://www.youtube.com/embed/xRjqSoiH-jA" title="Cómo una empresa envenenó el planeta en secreto" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
<iframe   src="https://www.youtube.com/embed/HuK70ss-Na0" title="TOP: Los 7 casos más perturbadores que existen sobre militares 2" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


</section>
  </div>`;
}

function viewSettings(p){
  return `
  <div class="card"><h2>Ajustes</h2>
    <p>Tema actual: <strong>${p.theme}</strong></p>
    <p>(En próxima versión editable desde UI)</p>
  </div>`;
}

window.addEventListener("hashchange", render);
render();
