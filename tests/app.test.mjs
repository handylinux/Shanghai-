/* Смоук-тест app.js: запускаем реальный код приложения в мини-DOM
 * и проверяем, что карточка места отдаёт правильные ссылки на карты.
 * Запуск: npm test
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("..", import.meta.url));

class FakeEl {
  constructor() {
    this._html = "";
    this.textContent = "";
    this.style = {};
    this.dataset = {};
    this.classes = new Set();
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
      toggle: (c, on) => (on ? this.classes.add(c) : this.classes.delete(c)),
      contains: (c) => this.classes.has(c)
    };
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = v; }
  addEventListener() {}
  appendChild() {}
  removeChild() {}
}

/** Поднимает data.js + geo.js + app.js в песочнице с заглушками DOM. */
function boot() {
  const els = new Map();
  const el = (sel) => {
    if (!els.has(sel)) els.set(sel, new FakeEl());
    return els.get(sel);
  };
  const store = {};
  const win = {
    SH_DATA: undefined,
    SH_GEO: undefined,
    scrollTo: () => {},
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); }
    },
    navigator: {},
    setTimeout: () => 0,
    document: {
      querySelector: el,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => new FakeEl(),
      body: new FakeEl()
    }
  };
  win.window = win;
  win.globalThis = win;
  vm.createContext(win);
  for (const f of ["data.js", "geo.js", "app.js"]) {
    vm.runInContext(readFileSync(root + f, "utf8"), win, { filename: f });
  }
  return { win, el };
}

test("app.js стартует и рисует карточки без ошибок", () => {
  const { el } = boot();
  assert.ok(el("#tripSub").textContent.includes("Шанхай"), el("#tripSub").textContent);
  assert.match(el("#progLine").textContent, /Посещено 0 из \d+/);
  assert.ok(el("#view-arrival").innerHTML.includes("маглев") || el("#view-arrival").innerHTML.includes("Маглев"));
});

test("карточка места отдаёт ссылки во всех системах координат", () => {
  const { win, el } = boot();
  const loc = win.SH_DATA.locations.find((l) => l.id === "bailian");
  const G = win.SH_GEO;

  win.openById("bailian");
  const html = el("#sheet").innerHTML;

  // 1) OSM — исходная WGS-84 координата, без пересчёта
  const osm = G.osmLink(loc);
  assert.ok(html.includes(osm), "нет ссылки на OSM");
  assert.ok(osm.includes(`mlat=${loc.lat}`) && osm.includes(`mlon=${loc.lon}`), osm);

  // 2) Google Maps — официальный Maps URLs API и координаты в GCJ-02
  const g = G.wgs84ToGcj02(loc.lat, loc.lon);
  assert.ok(html.includes("https://www.google.com/maps/search/?api=1&query="), "нет api=1");
  const gUrl = new URL(G.googleLink(loc));
  const [gLat, gLon] = gUrl.searchParams.get("query").split(",").map(Number);
  assert.ok(Math.abs(gLat - g.lat) < 2e-6 && Math.abs(gLon - g.lon) < 2e-6, "Google получил не GCJ-02");
  assert.ok(Math.abs(gLat - loc.lat) > 1e-4, "Google получил сырую WGS-84 — маркер уедет");

  // 3) 高德 и 百度 тоже присутствуют
  assert.ok(html.includes("https://uri.amap.com/marker?position="), "нет ссылки на 高德");
  assert.ok(html.includes("https://api.map.baidu.com/marker?location="), "нет ссылки на 百度");

  // 4) координаты видны пользователю и копируются
  assert.ok(html.includes(`${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}`), "координаты не показаны");
  assert.ok(html.includes('onclick="copyText(this)"'), "нет кнопки копирования");

  // 5) кнопка «на нашей карте»
  assert.ok(html.includes(`onclick="focusOnMap('bailian')"`), "нет кнопки «на нашей карте»");
});

test("координаты 百联ZX больше не уводят маркер к Бунду", () => {
  const { win } = boot();
  const G = win.SH_GEO;
  const bailian = win.SH_DATA.locations.find((l) => l.id === "bailian");
  const bund = win.SH_DATA.locations.find((l) => l.id === "bund");
  // До исправления точка стояла на 汉口路 у Бунда — в ~530 м от молла.
  assert.ok(G.haversineKm(bailian.lat, bailian.lon, bund.lat, bund.lon) > 0.4,
    "百联ZX снова прилип к Бунду");
  // И она обязана быть рядом с другими магазинами Нанкинской улицы (день 3).
  const popmart = win.SH_DATA.locations.find((l) => l.id === "popmart_hongyi");
  assert.ok(G.haversineKm(bailian.lat, bailian.lon, popmart.lat, popmart.lon) < 0.3,
    "百联ZX и POP MART 宏伊 должны быть в одном квартале");
});
