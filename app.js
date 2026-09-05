/* Шанхай-навигатор: логика PWA */
(function(){
  const D = window.SH_DATA;
  if(!D){ document.body.innerHTML = "<p style='padding:20px'>Не загрузились данные (data.js).</p>"; return; }

  const byId = {};
  D.locations.forEach(l => byId[l.id] = l);

  // ---- состояние «посетил» (localStorage) ----
  const LS = "sh_visited_v1";
  let visited = [];
  try { visited = JSON.parse(localStorage.getItem(LS) || "[]"); } catch(e){ visited = []; }
  const saveVisited = () => localStorage.setItem(LS, JSON.stringify(visited));
  const isDone = id => visited.includes(id);
  const toggleDone = id => {
    const i = visited.indexOf(id);
    if(i >= 0) visited.splice(i,1); else visited.push(id);
    saveVisited(); renderAll();
  };

  // ---- утилиты ----
  const $ = s => document.querySelector(s);
  const esc = s => String(s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  // geo.js: пересчёт WGS-84 -> GCJ-02/BD-09 и построение ссылок на карты.
  const G = window.SH_GEO;
  const distKm = (a,b) => {
    if(G) return G.haversineKm(a.lat,a.lon,b.lat,b.lon);
    const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180;
    const la=a.lat*Math.PI/180, lb=b.lat*Math.PI/180;
    const h=Math.sin(dLat/2)**2 + Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  };
  // В Китае Google Maps / 高德 / 百度 рисуют карту в GCJ-02 (и BD-09), а не в WGS-84.
  // Если скормить им «честную» GPS-координату, маркер уедет на ~500 м — этим и
  // занимается geo.js. OpenStreetMap и наша Leaflet-карта получают WGS-84 как есть.
  const osmLink      = l => G ? G.osmLink(l)
      : `https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lon}#map=18/${l.lat}/${l.lon}`;
  const gmapLink     = l => G ? G.googleLink(l)
      : `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lon}`;
  const gmapDirLink  = l => G ? G.googleDirLink(l) : gmapLink(l);
  const gmapNameLink = l => G ? G.googleNameLink(l) : gmapLink(l);
  const amapLink     = l => G ? G.amapLink(l) : "";
  const baiduLink    = l => G ? G.baiduLink(l) : "";
  const coordText    = l => `${Number(l.lat).toFixed(6)}, ${Number(l.lon).toFixed(6)}`;
  const near = l => D.locations
      .filter(x => x.id !== l.id)
      .map(x => ({x, d: distKm(l,x)}))
      .filter(o => o.d <= 2.5)
      .sort((a,b)=>a.d-b.d);

  // ---- счётчик прогресса ----
  function progress(){
    const total = D.locations.length, done = visited.length;
    const pct = Math.round(done/total*100);
    $("#tripSub").textContent = D.trip;
    $("#progLine").textContent = `Посещено ${done} из ${total}`;
    $("#progFill").style.width = pct + "%";
  }

  // ---- шаблоны ----
  function locCard(l, opts){
    opts = opts||{};
    const done = isDone(l.id);
    const chips = [];
    if(l.day) chips.push(`<span class="chip day">День ${l.day}</span>`);
    if(l.cost) chips.push(`<span class="chip cost">${esc(l.cost)}</span>`);
    if(done) chips.push(`<span class="badge-done">✓ посетил</span>`);
    return `<div class="card loc ${done?'done':''}" data-id="${l.id}">
      <div class="em">${l.emoji||'📍'}</div>
      <div class="bd">
        <div class="nm">${esc(l.name)}</div>
        ${l.zh ? `<div class="zh">${esc(l.zh)}</div>`:''}
        ${l.short ? `<div class="mt">${esc(l.short)}</div>`:''}
        <div class="mt muted">🚇 ${esc(l.metro)}${l.exit ? ' · '+esc(l.exit) : ''}</div>
        ${chips.length?`<div class="row">${chips.join('')}</div>`:''}
      </div>
    </div>`;
  }

  function openSheet(l){
    const n = near(l);
    $("#sheet").innerHTML = `
      <button class="close" onclick="closeSheet()">✕</button>
      <div class="hero">${l.photo ? `<img src="photos/${esc(l.photo)}" alt="">` : (l.emoji||'📍')}</div>
      <h3>${esc(l.name)}</h3>
      <div class="zh">${esc(l.zh||'')}</div>
      <div class="kv">
        <div class="k">Адрес</div><div class="v">${esc(l.addr)}</div>
        <div class="k">Метро</div><div class="v">${esc(l.metro)}${l.exit ? ' · '+esc(l.exit):''}</div>
        ${l.line ? `<div class="k">Линия</div><div class="v">${esc(l.line)}</div>`:''}
        <div class="k">Стоимость</div><div class="v">${esc(l.cost||'—')}</div>
        ${l.short ? `<div class="k">Что это</div><div class="v">${esc(l.short)}</div>`:''}
      </div>
      <div class="actions">
        <button class="btn" onclick="toggleDoneById('${l.id}')">${isDone(l.id)?'↩ Отменить «посетил»':'✓ Отметить «посетил»'}</button>
        <a class="btn" href="${gmapLink(l)}" target="_blank" rel="noopener">Google Maps ↗</a>
      </div>
      <div class="actions">
        <a class="btn ghost sm" href="${osmLink(l)}" target="_blank" rel="noopener">OSM ↗</a>
        ${amapLink(l) ? `<a class="btn ghost sm" href="${amapLink(l)}" target="_blank" rel="noopener">高德 ↗</a>` : ''}
        ${baiduLink(l) ? `<a class="btn ghost sm" href="${baiduLink(l)}" target="_blank" rel="noopener">百度 ↗</a>` : ''}
        <a class="btn ghost sm" href="${gmapDirLink(l)}" target="_blank" rel="noopener">🧭 Маршрут</a>
        <a class="btn ghost sm" href="${gmapNameLink(l)}" target="_blank" rel="noopener">🔎 Google по 汉字</a>
        <button class="btn ghost sm" onclick="focusOnMap('${l.id}')">🗺️ На нашей карте</button>
      </div>
      <div class="kv">
        <div class="k">Координаты WGS-84 (GPS)</div>
        <div class="v">
          <button class="copy" onclick="copyText(this)" data-copy="${coordText(l)}" title="Скопировать">${coordText(l)}</button>
          ${l.approx ? '<span class="warnchip">≈ приблизительные</span>' : ''}
        </div>
      </div>
      <div class="hint">Google Maps, 高德 и 百度 в Китае работают в системе координат GCJ-02 — в ссылках выше координаты уже пересчитаны, поэтому маркер встанет на место. OSM и GPS-навигаторы понимают WGS-84 — это значение можно копировать.</div>
      ${n.length?`<div class="near"><h4>Что рядом (≤2.5 км)</h4>
        ${n.map(o=>`<div class="item" onclick="openById('${o.x.id}')">
          <span class="em">${o.x.emoji||'📍'}</span>
          <span class="nm">${esc(o.x.name)}</span>
          <span class="dist">${o.d<1?Math.round(o.d*1000)+' м':o.d.toFixed(1)+' км'}</span>
        </div>`).join('')}</div>`:''}
    `;
    $("#overlay").classList.add("on");
  }
  window.closeSheet = () => $("#overlay").classList.remove("on");
  window.openById = id => openSheet(byId[id]);
  window.toggleDoneById = id => { toggleDone(id); openSheet(byId[id]); };

  // копирование координат в буфер (для вставки в любой навигатор)
  window.copyText = btn => {
    const txt = btn.dataset.copy || btn.textContent;
    const ok = () => { const t = btn.textContent; btn.textContent = "✓ скопировано"; btn.classList.add("done");
      setTimeout(()=>{ btn.textContent = t; btn.classList.remove("done"); }, 1200); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(ok).catch(()=>fallback());
    } else fallback();
    function fallback(){
      const ta = document.createElement("textarea");
      ta.value = txt; ta.style.position="fixed"; ta.style.opacity="0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch(e){}
      document.body.removeChild(ta);
    }
  };

  // показать точку на встроенной карте
  window.focusOnMap = id => {
    closeSheet();
    showView("map");
    const m = markers[id];
    if(mapObj && m){
      setTimeout(() => { mapObj.setView(m.getLatLng(), 17); m.openPopup(); }, 250);
    }
  };

  // делегирование кликов по карточкам
  document.addEventListener("click", e => {
    const c = e.target.closest(".loc");
    if(c && c.dataset.id) openSheet(byId[c.dataset.id]);
  });

  // ---- вьюхи ----
  function renderArrival(){
    const a = D.arrival;
    let html = `<h2 class="sec">🛬 ${esc(a.title)}</h2>`;
    html += `<div class="card"><ol class="steps">${a.steps.map((s,i)=>`<li><span class="dot">${i+1}</span>${esc(s)}</li>`).join('')}</ol></div>`;
    html += `<div class="note">💡 Маглев: 07:02–21:42 из аэропорта, ~50 ¥ (с авиабилетом 40 ¥). До 龙阳路 — линия 2, дальше прямо до отеля без пересадок.</div>`;
    const mag = byId['maglev'];
    if(mag) html += locCard(mag);
    html += `<h2 class="sec" style="margin-top:16px">⭐ Обязательные пункты</h2>`;
    ['maglev','zhujiajiao','shanghai_tower','disney','taste_of_china'].forEach(id=>{ if(byId[id]) html += locCard(byId[id]); });
    $("#view-arrival").innerHTML = html;
  }

  function renderDays(){
    let html = `<h2 class="sec">📅 По дням</h2>`;
    for(let d=1; d<=10; d++){
      const day = D.days[d];
      if(!day) continue;
      const ids = day.ids||[];
      const doneCount = ids.filter(isDone).length;
      html += `<div class="card daycard" data-day="${d}">
        <div class="num">${d}</div>
        <div>
          <div class="tt">${esc(day.title)}</div>
          <div class="cnt">${ids.length} мест · посещено ${doneCount}</div>
        </div>
        <div class="chev">›</div>
      </div>`;
    }
    $("#view-days").innerHTML = html;
  }

  function renderDay(d){
    const day = D.days[d];
    let html = `<h2 class="sec">День ${d} · ${esc(day.title)}</h2>`;
    html += `<button class="btn ghost sm" onclick="showView('days')">← Все дни</button><div class="mt8"></div>`;
    const ids = day.ids||[];
    ids.forEach(id => { if(byId[id]) html += locCard(byId[id]); });
    $("#view-days").innerHTML = html;
    window.scrollTo(0,0);
  }

  let placeFilter = "all", placeQuery = "";
  function renderPlaces(){
    let html = `<h2 class="sec">📍 Все места (${D.locations.length})</h2>`;
    const cats = [...new Set(D.locations.map(l=>l.emoji||'📍'))];
    html += `<div class="filters">
      <button data-f="all" class="${placeFilter==='all'?'on':''}">Все</button>
      ${cats.map(c=>`<button data-f="${esc(c)}" class="${placeFilter===c?'on':''}">${c}</button>`).join('')}
    </div>`;
    html += `<input class="search" placeholder="Поиск (название, метро, адрес)…" value="${esc(placeQuery)}">`;
    const q = placeQuery.toLowerCase().trim();
    const list = D.locations.filter(l => {
      const matchFilter = (placeFilter === "all" || l.emoji === placeFilter);
      if(!matchFilter) return false;
      if(!q) return true;
      const haystack = `${l.name} ${l.zh||''} ${l.addr||''} ${l.metro||''} ${l.line||''} ${l.short||''}`.toLowerCase();
      return haystack.includes(q);
    });
    const unassigned = list.filter(l=>!l.day);
    const assigned = list.filter(l=>l.day);
    const draw = arr => arr.map(l=>locCard(l)).join('');
    html += `<div>${draw(assigned)}</div>`;
    if(unassigned.length){ html += `<h2 class="sec mt8">Бонус / свободное время</h2>${draw(unassigned)}`; }
    $("#view-places").innerHTML = html;
  }

  let mapObj = null, mapBuilt = false;
  const markers = {};
  function renderMap(){
    if(!mapBuilt){
      $("#view-map").innerHTML = `<h2 class="sec">🗺️ Карта</h2><div id="map"></div>
        <div class="note">Карта требует интернет. Офлайн — используйте «Открыть в OSM» из карточки места.</div>`;
      if(typeof L === "undefined"){ $("#map").innerHTML = "<p class='muted'>Leaflet не загрузился (нет сети).</p>"; return; }
      mapObj = L.map("map").setView([31.23,121.47],12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:18, attribution:"© OpenStreetMap"}).addTo(mapObj);
      D.locations.forEach(l=>{
        if(l.lat && l.lon){
          const m = L.marker([l.lat,l.lon]).addTo(mapObj);
          m.bindTooltip(`${l.emoji||'📍'} ${esc(l.name)}`, {direction:"top", offset:[0,-30]});
          m.bindPopup(`<b>${esc(l.name)}</b><br>${esc(l.addr)}
            <div class="mt8">
              <a href="${gmapLink(l)}" target="_blank" rel="noopener">Google Maps</a> ·
              <a href="${osmLink(l)}" target="_blank" rel="noopener">OSM</a>
              ${amapLink(l) ? ` · <a href="${amapLink(l)}" target="_blank" rel="noopener">高德</a>` : ''}
            </div>`);
          markers[l.id] = m;
        }
      });
      mapBuilt = true;
    }
    if(mapObj){
      setTimeout(() => { mapObj.invalidateSize(); }, 150);
    }
  }

  // ---- навигация ----
  function showView(v){
    document.querySelectorAll(".view").forEach(x=>x.classList.remove("on"));
    document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active", b.dataset.v===v));
    $("#view-"+v).classList.add("on");
    if(v==="places") renderPlaces();
    if(v==="map") renderMap();
    window.scrollTo(0,0);
  }
  window.showView = showView;

  document.querySelectorAll("nav button").forEach(b=> b.addEventListener("click", ()=>showView(b.dataset.v)));
  $("#view-days").addEventListener("click", e=>{
    const c = e.target.closest(".daycard");
    if(c && c.dataset.day) renderDay(+c.dataset.day);
  });
  $("#view-places").addEventListener("click", e=>{
    const f = e.target.closest(".filters button");
    if(f){ placeFilter = f.dataset.f; renderPlaces(); }
  });
  $("#view-places").addEventListener("input", e=>{
    if(e.target.classList.contains("search")){ placeQuery = e.target.value; renderPlaces(); }
  });

  function renderAll(){
    progress();
    renderArrival();
    renderDays();
    if($("#view-places").classList.contains("on")) renderPlaces();
  }

  // init
  $("#overlay").addEventListener("click", e => {
    if(e.target === $("#overlay")) closeSheet();
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape") closeSheet();
  });

  renderAll();
  showView("arrival");
})();
