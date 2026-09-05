/* Тесты geo.js + целостности координат в data.js.
 * Запуск:  npm test   (или: node --test tests/)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = fileURLToPath(new URL("..", import.meta.url));

/** Загружает браузерный скрипт (window.*) в песочницу и возвращает window. */
function loadBrowserScript(rel) {
  const ctx = { window: {}, console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(root, rel), "utf8"), ctx, { filename: rel });
  return ctx.window;
}

const G = loadBrowserScript("geo.js").SH_GEO;
const DATA = loadBrowserScript("data.js").SH_DATA;

/** Разбирает "lat,lon" из параметра ссылки и возвращает числа. */
function pairFrom(url, param) {
  const q = new URL(url).searchParams.get(param); // searchParams уже декодирует %2C и т.п.
  const [a, b] = q.split(",");
  return [Number(a), Number(b)];
}

// Эталонные значения из тестов реализации eviltransform
// (github.com/googollee/eviltransform, go/transform_test.go):
//   {wgsLat, wgsLng, gcjLat, gcjLng}
const VECTORS = [
  [31.1774276, 121.5272106, 31.17530398364597, 121.531541859215], // Шанхай
  [22.543847, 113.912316, 22.540796131694766, 113.9171764808363], // Шэньчжэнь
  [39.911954, 116.377817, 39.91334545536069, 116.38404722455657] // Пекин
];

test("wgs84ToGcj02 совпадает с эталоном eviltransform", () => {
  for (const [wLat, wLon, gLat, gLon] of VECTORS) {
    const g = G.wgs84ToGcj02(wLat, wLon);
    assert.ok(Math.abs(g.lat - gLat) < 1e-9, `lat ${wLat},${wLon} -> ${g.lat}`);
    assert.ok(Math.abs(g.lon - gLon) < 1e-9, `lon ${wLat},${wLon} -> ${g.lon}`);
  }
});

test("gcj02ToWgs84 — обратное преобразование точнее 5 м", () => {
  for (const [wLat, wLon, gLat, gLon] of VECTORS) {
    const w = G.gcj02ToWgs84(gLat, gLon);
    const m = G.haversineKm(w.lat, w.lon, wLat, wLon) * 1000;
    assert.ok(m < 5, `roundtrip ${wLat},${wLon} = ${m.toFixed(2)} м`);
  }
});

test("вне Китая GCJ-02 не применяется", () => {
  assert.equal(G.outOfChina(35.6812, 139.7671), true, "Токио");
  assert.equal(G.outOfChina(31.2304, 121.4737), false, "Шанхай");
  const tokyo = G.wgs84ToGcj02(35.6812, 139.7671);
  assert.equal(tokyo.lat, 35.6812);
  assert.equal(tokyo.lon, 139.7671);
});

test("сдвиг WGS-84 → GCJ-02 в Шанхае — сотни метров (его и надо компенсировать)", () => {
  const loc = DATA.locations.find((l) => l.id === "bund");
  const g = G.wgs84ToGcj02(loc.lat, loc.lon);
  const m = G.haversineKm(loc.lat, loc.lon, g.lat, g.lon) * 1000;
  assert.ok(m > 100 && m < 1000, `сдвиг ${m.toFixed(1)} м`);
});

const bund = {
  id: "bund",
  name: "Набережная Бунд (外滩)",
  zh: "外滩",
  addr: "黄浦区中山东一路",
  lat: 31.2353356,
  lon: 121.487632
};

test("OSM получает WGS-84 без пересчёта", () => {
  const u = G.osmLink(bund);
  assert.ok(u.startsWith("https://www.openstreetmap.org/"), u);
  assert.ok(u.includes("mlat=31.2353356"), u);
  assert.ok(u.includes("mlon=121.487632"), u);
  assert.ok(u.includes("#map=18/31.2353356/121.487632"), u);
});

test("Google Maps: обязательный api=1 и координаты в GCJ-02", () => {
  const u = G.googleLink(bund);
  const g = G.wgs84ToGcj02(bund.lat, bund.lon);
  assert.ok(u.startsWith("https://www.google.com/maps/search/?api=1&query="), u);
  const [lat, lon] = pairFrom(u, "query");
  assert.ok(Math.abs(lat - g.lat) < 2e-6, `lat в ссылке ${lat}, ждём ${g.lat}`);
  assert.ok(Math.abs(lon - g.lon) < 2e-6, `lon в ссылке ${lon}, ждём ${g.lon}`);
  // «сырые» WGS-координаты попасть в ссылку не должны — иначе маркер уедет на ~500 м
  assert.ok(Math.abs(lat - bund.lat) > 1e-4 && Math.abs(lon - bund.lon) > 1e-4, u);
});

test("Google Maps: маршрут и поиск по названию", () => {
  const dir = G.googleDirLink(bund);
  assert.ok(dir.startsWith("https://www.google.com/maps/dir/?api=1&destination="), dir);
  const [lat, lon] = pairFrom(dir, "destination");
  const g = G.wgs84ToGcj02(bund.lat, bund.lon);
  assert.ok(Math.abs(lat - g.lat) < 2e-6 && Math.abs(lon - g.lon) < 2e-6, dir);
  assert.ok(G.googleNameLink(bund).includes(encodeURIComponent("外滩 上海")), G.googleNameLink(bund));
});

test("高德/Amap: position=lon,lat в GCJ-02", () => {
  const u = G.amapLink(bund);
  const g = G.wgs84ToGcj02(bund.lat, bund.lon);
  assert.ok(u.startsWith("https://uri.amap.com/marker?position="), u);
  const [lon, lat] = pairFrom(u, "position"); // у Amap сначала lon
  assert.ok(Math.abs(lat - g.lat) < 2e-6, `lat ${lat} != ${g.lat}`);
  assert.ok(Math.abs(lon - g.lon) < 2e-6, `lon ${lon} != ${g.lon}`);
  assert.ok(u.includes("coordinate=gaode"), u);
  assert.ok(u.includes(`name=${encodeURIComponent("外滩")}`), u);
});

test("百度/Baidu: coord_type=bd09ll и координаты BD-09", () => {
  const u = G.baiduLink(bund);
  const b = G.wgs84ToBd09(bund.lat, bund.lon);
  assert.ok(u.startsWith("https://api.map.baidu.com/marker?location="), u);
  const [lat, lon] = pairFrom(u, "location");
  assert.ok(Math.abs(lat - b.lat) < 2e-6 && Math.abs(lon - b.lon) < 2e-6, u);
  assert.ok(u.includes("coord_type=bd09ll"), u);
  assert.ok(u.includes("output=html"), u);
  // BD-09 отличается и от WGS-84, и от GCJ-02
  const g = G.wgs84ToGcj02(bund.lat, bund.lon);
  assert.ok(Math.abs(b.lat - bund.lat) > 1e-3 && Math.abs(b.lat - g.lat) > 1e-3, u);
});

// ------------------------------------------------------- целостность данных ---
// Координаты, сверенные с OpenStreetMap (Nominatim/Overpass, 2026-09-05).
const EXPECTED = {
  bund: [31.2353356, 121.487632],
  bailian: [31.239143, 121.4787764],        // 百联ZX — здание в OSM (way 160821061)
  popmart_hongyi: [31.239, 121.4801],        // 南京东路299号, у выхода 3 метро 南京东路
  popmart_shimao: [31.2364283, 121.4712143], // 上海世茂广场
  maglev: [31.2046984, 121.5535315],         // станция маглева 龙阳路 (node 9008134438)
  zhujiajiao: [31.1160955, 121.0460128],     // 朱家角古镇旅客中心, 课植园路555号
  junto: [31.2302776, 121.4385781],          // 胶州路273号
  shanghai_tower: [31.2356449, 121.5012495],
  disney: [31.1462523, 121.6562825]
};

// People's Square — центр Шанхая; самый дальний пункт программы — 朱家角 (~41 км).
const CENTER = [31.2304, 121.4737];

test("все локации имеют координаты в пределах Шанхая", () => {
  assert.ok(DATA.locations.length >= 40, `локаций: ${DATA.locations.length}`);
  for (const l of DATA.locations) {
    assert.equal(typeof l.lat, "number", `${l.id}: lat`);
    assert.equal(typeof l.lon, "number", `${l.id}: lon`);
    assert.equal(G.outOfChina(l.lat, l.lon), false, `${l.id}: вне Китая`);
    const km = G.haversineKm(CENTER[0], CENTER[1], l.lat, l.lon);
    assert.ok(km < 60, `${l.id}: ${km.toFixed(1)} км от центра Шанхая`);
  }
});

test("исправленные координаты совпадают со сверенными", () => {
  for (const [id, [lat, lon]] of Object.entries(EXPECTED)) {
    const l = DATA.locations.find((x) => x.id === id);
    assert.ok(l, `нет локации ${id}`);
    assert.equal(l.lat, lat, `${id}: lat`);
    assert.equal(l.lon, lon, `${id}: lon`);
  }
});

test("нет случайно продублированных координат", () => {
  // Единственная легальная пара: Boxing Cat находится внутри 思南公馆.
  const seen = new Map();
  for (const l of DATA.locations) {
    const key = `${l.lat},${l.lon}`;
    if (seen.has(key)) {
      const pair = [seen.get(key), l.id].sort().join("+");
      assert.equal(pair, "boxingcat+sinan", `дубль координат: ${pair}`);
    } else {
      seen.set(key, l.id);
    }
  }
});

test("«что рядом» считает расстояние между точками одного дня адекватно", () => {
  // День 3 — отаку-маршрут по Нанкинской улице: все точки в пределах 2 км.
  const ids = DATA.days["3"].ids;
  const pts = ids.map((id) => DATA.locations.find((l) => l.id === id)).filter(Boolean);
  assert.equal(pts.length, ids.length, "не все точки дня 3 найдены");
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const km = G.haversineKm(pts[i].lat, pts[i].lon, pts[j].lat, pts[j].lon);
      assert.ok(km < 2, `день 3: ${pts[i].id} ↔ ${pts[j].id} = ${km.toFixed(2)} км`);
    }
  }
});

test("ни одна ссылка ни для одной локации не содержит NaN/undefined", () => {
  const builders = ["osmLink", "googleLink", "googleNameLink", "googleDirLink", "amapLink", "baiduLink"];
  for (const l of DATA.locations) {
    for (const fn of builders) {
      const u = G[fn](l);
      assert.ok(u.startsWith("https://"), `${l.id}/${fn}: ${u}`);
      assert.ok(!/NaN|undefined|null/.test(u), `${l.id}/${fn}: ${u}`);
      assert.ok(u.length < 2048, `${l.id}/${fn}: слишком длинная ссылка`);
    }
  }
});
