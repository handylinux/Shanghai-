/* Шанхай-навигатор: системы координат и ссылки на внешние карты.
 *
 * Почему этот файл вообще нужен
 * -----------------------------
 * Координаты в data.js — «честные» WGS-84 (GPS, OpenStreetMap). Но внутри Китая
 * карты работают в других системах:
 *   • GCJ-02 («марсианские координаты») — Google Maps, 高德/Amap, Apple Maps;
 *   • BD-09 — 百度/Baidu (ещё один сдвиг поверх GCJ-02).
 * В Шанхае расхождение WGS-84 → GCJ-02 составляет ~500 м, поэтому WGS-координата,
 * вставленная в ссылку на Google Maps, ставит маркер в соседнем квартале
 * («Гугл ищет не по координатам»). Здесь координаты пересчитываются под каждый
 * сервис, а там, где сервис умеет конвертировать сам (Baidu), система координат
 * передаётся явно в параметре ссылки.
 *
 * Google Maps: используется официальный Maps URLs API —
 * https://developers.google.com/maps/documentation/urls/get-started
 * Параметр api=1 обязателен: без него Google игнорирует все параметры и просто
 * открывает карту (именно так вёл себя старый линк maps.google.com/?q=lat,lon).
 *
 * 高德: https://lbs.amap.com/api/uri-api/guide/mobile-web/point  (coordinate=gaode)
 * 百度: https://lbs.baidu.com/faq/api?title=webapi/uri/web       (coord_type=gcj02)
 */
(function (global) {
  "use strict";

  var PI = Math.PI;
  var A = 6378245.0;               // большая полуось (эллипсоид SK-42)
  var EE = 0.00669342162296594323; // квадрат первого эксцентриситета
  var PI_BD = (PI * 3000.0) / 180.0;

  /** true, если точка за пределами Китая — там GCJ-02 совпадает с WGS-84. */
  function outOfChina(lat, lon) {
    return !(lon > 73.66 && lon < 135.05 && lat > 3.86 && lat < 53.55);
  }

  function transformLat(x, y) {
    var ret =
      -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0;
    return ret;
  }

  function transformLon(x, y) {
    var ret =
      300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0;
    return ret;
  }

  /** WGS-84 → GCJ-02. Возвращает {lat, lon}. */
  function wgs84ToGcj02(lat, lon) {
    lat = Number(lat);
    lon = Number(lon);
    if (outOfChina(lat, lon)) return { lat: lat, lon: lon };
    var dLat = transformLat(lon - 105.0, lat - 35.0);
    var dLon = transformLon(lon - 105.0, lat - 35.0);
    var radLat = (lat / 180.0) * PI;
    var magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
    dLon = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);
    return { lat: lat + dLat, lon: lon + dLon };
  }

  /** GCJ-02 → WGS-84 (обратное приближение, точность ~1–2 м). */
  function gcj02ToWgs84(lat, lon) {
    var g = wgs84ToGcj02(lat, lon);
    return { lat: lat * 2 - g.lat, lon: lon * 2 - g.lon };
  }

  /** GCJ-02 → BD-09 (Baidu). */
  function gcj02ToBd09(lat, lon) {
    var z = Math.sqrt(lon * lon + lat * lat) + 0.00002 * Math.sin(lat * PI_BD);
    var theta = Math.atan2(lat, lon) + 0.000003 * Math.cos(lon * PI_BD);
    return {
      lat: z * Math.sin(theta) + 0.006,
      lon: z * Math.cos(theta) + 0.0065
    };
  }

  /** WGS-84 → BD-09. */
  function wgs84ToBd09(lat, lon) {
    var g = wgs84ToGcj02(lat, lon);
    return gcj02ToBd09(g.lat, g.lon);
  }

  /** Расстояние по формуле гаверсинуса, км. */
  function haversineKm(aLat, aLon, bLat, bLon) {
    var R = 6371;
    var dLat = ((bLat - aLat) * PI) / 180;
    var dLon = ((bLon - aLon) * PI) / 180;
    var la = (aLat * PI) / 180;
    var lb = (bLat * PI) / 180;
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function n6(v) {
    return Number(v).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }

  /** Подпись точки: китайское название для таксистов/поиска. */
  function label(l) {
    return (l && (l.zh || l.name)) || "";
  }

  // ---------------------------------------------------------------- ссылки ---
  // OpenStreetMap работает в WGS-84 — отдаём координаты как есть, без округления.
  function osmLink(l) {
    return (
      "https://www.openstreetmap.org/?mlat=" + l.lat + "&mlon=" + l.lon +
      "#map=18/" + l.lat + "/" + l.lon
    );
  }

  // Google Maps в Китае рисуется в GCJ-02 → координаты пересчитываем.
  function googleLink(l) {
    var g = wgs84ToGcj02(l.lat, l.lon);
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(n6(g.lat) + "," + n6(g.lon))
    );
  }

  // Поиск по китайскому названию — самый надёжный способ в Google Maps.
  function googleNameLink(l) {
    var q = label(l);
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(q + " 上海")
    );
  }

  // Маршрут «откуда я» → точка (GCJ-02).
  function googleDirLink(l) {
    var g = wgs84ToGcj02(l.lat, l.lon);
    return (
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(n6(g.lat) + "," + n6(g.lon))
    );
  }

  // 高德/Amap: нативная система — GCJ-02 (coordinate=gaode), position=lon,lat.
  function amapLink(l) {
    var g = wgs84ToGcj02(l.lat, l.lon);
    return (
      "https://uri.amap.com/marker?position=" + n6(g.lon) + "," + n6(g.lat) +
      "&name=" + encodeURIComponent(label(l)) +
      "&src=shanghai-nav&coordinate=gaode&callnative=1"
    );
  }

  // 百度/Baidu: передаём BD-09 и явно указываем coord_type.
  function baiduLink(l) {
    var b = wgs84ToBd09(l.lat, l.lon);
    return (
      "https://api.map.baidu.com/marker?location=" + n6(b.lat) + "," + n6(b.lon) +
      "&title=" + encodeURIComponent(label(l)) +
      "&content=" + encodeURIComponent((l && l.addr) || "") +
      "&output=html&coord_type=bd09ll&src=webapp.shanghai.nav"
    );
  }

  var SH_GEO = {
    outOfChina: outOfChina,
    wgs84ToGcj02: wgs84ToGcj02,
    gcj02ToWgs84: gcj02ToWgs84,
    gcj02ToBd09: gcj02ToBd09,
    wgs84ToBd09: wgs84ToBd09,
    haversineKm: haversineKm,
    label: label,
    osmLink: osmLink,
    googleLink: googleLink,
    googleNameLink: googleNameLink,
    googleDirLink: googleDirLink,
    amapLink: amapLink,
    baiduLink: baiduLink
  };

  if (typeof module !== "undefined" && module.exports) module.exports = SH_GEO;
  global.SH_GEO = SH_GEO;
})(typeof window !== "undefined" ? window : globalThis);
