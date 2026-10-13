# -*- coding: utf-8 -*-
"""gen.py v7.1: places_final.json -> data.js + приложение в shanghai_plan.md (21.11–1.12.2026)."""
import json, io, urllib.parse

PJ = "/home/user/places_final.json"
P = json.load(open(PJ, encoding="utf-8"))

# --- точечные правки выходов (по проверенным данным метро) ---
FIX_EX = {
    "bund": "выход 3 (на восток вдоль Нанкинской, пешком 6–8 мин)",
    "taste_of_china": "выход 2/5/6 (к Middle Henan Rd), пешком ~5 мин на юг; выход 7 может быть закрыт",
}
for p in P:
    if p["id"] in FIX_EX:
        p["ex"] = FIX_EX[p["id"]]

# --- новые места ---
NEW = [
    {
        "id": "ghibli",
        "ru": "Магазин Ghibli — 橡子共和国 (Donguri Republic), Metro City",
        "zh": "橡子共和国",
        "addr": "徐汇区肇嘉浜路1111号 美罗城1F (Metro City)",
        "line": "1/9/11",
        "st": "徐家汇站",
        "color": "красная(1) / бирюзовая(9) / коричневая(11)",
        "ex": "выход 9 — прямо в Metro City",
        "lat": 31.19483,
        "lon": 121.43686,
        "appr": True,
    },
    {
        "id": "chuansha_old",
        "ru": "Старый город Чуаньша (川沙古镇) — рядом с отелем",
        "zh": "川沙古镇",
        "addr": "浦东新区川沙镇新川路",
        "line": "2",
        "st": "川沙站",
        "color": "зелёная(2)",
        "ex": "выход 1; пешком 15–20 мин (автобус 浦东24), отель рядом",
        "lat": 31.23321,
        "lon": 121.69623,
        "appr": True,
    },
]
have = {p["id"] for p in P}
for n in NEW:
    if n["id"] not in have:
        P.append(n)
json.dump(P, open(PJ, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# id -> (day, cost, emoji, short)
M = {
 "maglev":     (1,  "40–50 ¥ (с посадочным 40)", "🚄", "Маглев 431 км/ч: PVG ↔ Longyang Road (8 мин) — по пути в отель"),
 "chuansha_old": (1, "бесплатно", "🏮", "Старый город Чуаньша: минская стена, старые улицы, парк — 5 мин от отеля"),
 "bund":       (1,  "бесплатно", "🌃", "Набережная The Bund: подсветка небоскрёбов (вечер — по силам)"),
 "bailian":    (2,  "бесплатно (шопинг)", "🎴", "Аниме-молл BX ZX: Tamashii Nations, VR ZONE, animate"),
 "popmart_hongyi": (2, "бесплатно (шопинг)", "🧸", "POP MART глобальный флагман: Labubu, Molly, стена блайндов"),
 "popmart_shimao": (2, "бесплатно (шопинг)", "🧸", "POP MART городской флагман (~800 м², DIY-зона)"),
 "new_world":  (2,  "бесплатно (шопинг)", "🛍️", "新世界城 — аниме-этаж"),
 "museum":     (2,  "бесплатно (паспорт)", "🏛️", "Музей Шанхая — бронза, керамика, древнее искусство"),
 "disney":     (3,  "забронировано ✅", "🎢", "Disneyland 23.11 ✅ — рождественский сезон, шаттл отеля"),
 "yuyuan":     (4,  "~40 ¥/чел", "🏯", "Сад Юй Юань — классический сад эпохи Мин"),
 "chenghuangmiao": (4, "~10–15 ¥", "⛩️", "Храм Городских Богов + исторический базар"),
 "taste_of_china": (4, "забронировано ✅ (~850–990 ¥/чел + образ ~200 ¥)", "🎭", "TASTE OF CHINA 24.11 ✅ — образ (ханьфу+макияж) с 16:50, ужин-шоу 19:00–21:00; после — Бунд/круиз"),
 "wukang":     (5,  "бесплатно", "🏛️", "Wukang Building — «плоский дом», колониальные виллы"),
 "bear_cafe":  (5,  "~40–60 ¥ (кофе)", "☕", "13DE MARZO — кофе с плюшевым медвежонком"),
 "sinan":      (5,  "бесплатно", "🏛️", "Sinan Mansions — особняки, дом Сунь Ятсена"),
 "tianzifang": (5,  "бесплатно", "🏘️", "Tianzifang — переулки с арт-лавками и кафе"),
 "xintiandi":  (5,  "бесплатно", "🏘️", "Xintiandi — шикумэни, рестораны"),
 "shonen_jump": (5, "~150–200 ¥/чел", "🍜", "Shonen Jump Café — One Piece/Naruto/Bleach"),
 "boxingcat":  (5,  "~100–150 ¥/чел", "🍺", "Boxing Cat — флагманский крафт-паб (бургеры)"),
 "jingan_temple": (6, "~50 ¥", "⛩️", "Jing'an Temple — древнейший храм (247 г.), золотая кровля"),
 "cathedral":  (6,  "бесплатно", "⛪", "St. Ignatius Cathedral — готика, 60-м шпили (вт–сб 9–16)"),
 "holy_trinity": (6, "бесплатно", "⛪", "Holy Trinity — англиканский, красный кирпич (у Бунда, опц.)"),
 "goose_island": (6, "~100–150 ¥/чел", "🍺", "Goose Island — брюпаб, рёбра/стейк (вечер дня 6)"),
 "beer_temple": (6, "~100–150 ¥/чел", "🍺", "Beer Temple — 500+ сортов, 8 кранов (вечер дня 6)"),
 "zhujiajiao": (7,  "бесплатно (лодка ~40¥)", "🛶", "Водный город «Шанхайская Венеция» (будний день)"),
 "outlet_qingpu": (7, "бесплатно (шопинг)", "🛍️", "百联奥特莱斯 — аутлет 600+ брендов (по пути назад)"),
 "ikea_xuhui": (8,  "бесплатно (шопинг)", "🛋️", "IKEA Xuhui — «вагон всего»: дом, кухня, декор"),
 "ghibli":     (8,  "бесплатно (шопинг)", "🧚", "Магазин Ghibli (Donguri Republic): Тоторо, Кики, «Унесённые призраками»"),
 "loft_metro": (8,  "бесплатно (шопинг)", "🛒", "LOFT — японский разнообразник (~25 000 товаров), тот же молл"),
 "muji_huaihai": (8, "бесплатно (шопинг)", "🛒", "MUJI 淮海755 — флагман, 3 этажа"),
 "uniqlo":     (8,  "бесплатно (шопинг)", "👕", "UNIQLO — глобальный флагман (крупнейший в мире)"),
 "ufotable":   (8,  "~124 ¥/чел", "🍜", "Ufotable Café — аниме-ресторан (Fate/Demon Slayer)"),
 "liquid_laundry": (8, "~100–150 ¥/чел", "🍺", "Liquid Laundry — ресторан-брюпаб (вечер дня 8)"),
 "shanghai_brewery": (8, "~100–150 ¥/чел", "🍺", "Shanghai Brewery — пивоварня + спорт-бар (вечер дня 8)"),
 "m50":        (9,  "бесплатно", "🎨", "M50 — арт-квартал современного искусства"),
 "west_bund":  (9,  "бесплатно (музеи платные)", "🎨", "West Bund — Long/Yuz музеи, набережная"),
 "gubei":      (9,  "бесплатно (еда)", "🍜", "«Маленькая Токио» — рамен, суши, японские магазины"),
 "takashimaya": (9, "бесплатно (шопинг)", "🛍️", "Takashimaya — японский универмаг"),
 "shanghai_tower": (10, "~180–220 ¥/чел", "🏙️", "Shanghai Tower — 118 этаж, вид на Луцзяцзуй"),
 "joy_city":   (10, "бесплатно (Sky Ring ~60¥)", "🎡", "Joy City: аниме-зоны, блайнды, Animate Café, гачапоны"),
 "safari_park": (None, "~130–165 ¥/чел", "🦒", "Сафари-парк: тигры/львы, панды (запасной день, 15 мин от отеля)"),
 "florentia":  (None, "бесплатно (шопинг)", "🛍️", "Florentia Village — люкс-аутлет (у аэропорта/Диснея)"),
 "xuyan":      (None, "~368–498 ¥/чел", "🎭", "Xuyan — иммерсивный банкет эпохи Тан (план Б к TASTE)"),
 "junto":      (None, "~100–150 ¥/чел", "🍺", "Junto — 18 кранов, холодная комната"),
 "lays":       (5,  "~100–150 ¥/чел", "🍟", "Ресторан Lay's (Синьтяньди) — картофельная гастрономия-арт (концепт limited-time: проверить, работает ли)"),
 "niu_new_psq": (2, "~150–200 ¥/чел", "🍲", "Шведский стол: суккияки/хот-пот безлимит (мясо, морепродукты, десерты, мороженое) — на добивку дня 2"),
 "niu_new_xujiahui": (8, "~150–200 ¥/чел", "🍲", "Шведский стол-суккияки у Xujiahui — ужин «на добивку» дня 8"),
 "pearl_buffet": (10, "368 ¥ обед / 418 ¥ ужин (со смотровыми)", "🎡", "Буфет 267 м + вращение + СТЕКЛЯННЫЙ ПОЛ включён — ужин-мотивация дня 10"),
 "xiduowu":    (10, "~200–300 ¥/чел", "🦐", "Морской шведский стол у Lujiazui (крабы/устрицы/лобстеры) — запасной ужин дня 10"),
}

DAY_TITLES = {
 1: "Прилёт 08:55 + маглев + Чуаньша",
 2: "Отаку №1: Нанкинская + Музей Шанхая",
 3: "Disneyland ✅ (23.11)",
 4: "Юй Юань + TASTE OF CHINA ✅ (24.11)",
 5: "Французская концессия (архитектура)",
 6: "Храмы и соборы + крафт-вечер",
 7: "Венеция Чжучяцзяо + аутлет",
 8: "IKEA + Ghibli/LOFT (Metro City) + Хуайхай",
 9: "Арт: M50 + West Bund (+Губэй)",
 10: "Пудон: башни и стеклянный пол + Joy City",
}

out = []
for p in P:
    pid = p["id"]
    day, cost, emo, short = M.get(pid, (None, "", "📍", ""))
    out.append({
        "id": pid,
        "name": p["ru"],
        "zh": p["zh"],
        "addr": p["addr"],
        "metro": f'{p["st"]} — {p["color"]}',
        "line": p["line"],
        "exit": p["ex"],
        "lat": p["lat"],
        "lon": p["lon"],
        "approx": bool(p["appr"]),
        "day": day,
        "cost": cost,
        "emoji": emo,
        "short": short,
        "photo": "",
    })

days = {}
for d in range(1, 11):
    days[str(d)] = {"title": DAY_TITLES[d], "ids": []}
for o in out:
    if isinstance(o["day"], int):
        days[str(o["day"])]["ids"].append(o["id"])

arrival = {
  "title": "Прилёт: маглев → метро → отель (и вылет)",
  "steps": [
    "Прилёт в Пудун (PVG) 21.11 в 08:55. В зоне прилёта T1/T2 — указатели «Maglev 磁悬浮» (эстакада между терминалами).",
    "Маглев до Longyang Road (龙阳路): 06:45–21:42, 8 минут, 431 км/ч. Билет 50 ¥ (с посадочным рейса — 40 ¥).",
    "На Longyang Road НЕ выходить на улицу: внутри станции — метро Line 2 (светло-зелёная).",
    "Line 2 в сторону «Pudong International Airport» до станции Chuansha (川沙), ~25–30 мин, ~6 ¥. Если поезд кончается на Guanglan Road (广兰路) — перейти на ту же платформу на следующий.",
    "Chuansha, выход 1 → отель Shanghai Pudong Rezen select (Miaojing Rd 758), ~690 м / 10 мин. Или бесплатный шаттл отеля — написать в чат накануне.",
    "Итого: ~1 час и ~56 ¥ от самолёта до отеля. Заселение обычно с 14:00 — вещи в камеру хранения.",
    "Нет маглева? Line 2 напрямую из аэропорта до Chuansha (4 станции, ~15 мин, 5 ¥) или такси ~50–70 ¥.",
    "Вылет 1.12 в 09:25 — ранний: быть в PVG к 07:25. Выезд из отеля ~06:15–06:30: бесплатный шаттл отеля (24/7, ~20 мин) или такси ~50–70 ¥. Завтрак-бокс — попросить с вечера 30.11.",
    "Каждый городской день: Line 2 до центра ~45–50 мин; последний поезд из центра ~22:20–22:40 (проверить в «Shanghai Metro»), после — такси 120–180 ¥.",
  ]
}

payload = {
  "version": "2.1",
  "trip": "Шанхай · 21.11–1.12.2026 · 10 дней · отель Chuansha (Rezen)",
  "arrival": arrival,
  "days": days,
  "locations": out,
}

js = "/* Автогенерировано из places_final.json (gen.py v7) — можно править вручную (DeepSeek). */\n"
js += "window.SH_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
io.open("/home/user/shanghai-app/data.js", "w", encoding="utf-8").write(js)

# --- приложение: таблица для shanghai_plan.md ---
lines = []
lines.append("")
lines.append("Координаты — OpenStreetMap (Nominatim). «≈» — нет точного номера дома, координаты по станции/объекту (погрешность ~100 м). «Маршрут» — Google Maps, пешком от текущей позиции (GPS); OSM — запасная карта.")
lines.append("")
lines.append("| # | Место | Адрес (кит., показать таксисту) | Метро (линия, цвет) | Выход | Карты |")
lines.append("|---|------|------|------|------|-----|")
for i, p in enumerate(P, 1):
    mark = " ≈" if p.get("appr") else ""
    osm = f'https://www.openstreetmap.org/?mlat={p["lat"]}&mlon={p["lon"]}#map=17/{p["lat"]}/{p["lon"]}'
    gq = urllib.parse.quote((p.get("zh") or p["ru"]) + " 上海")
    gdir = f'https://www.google.com/maps/dir/?api=1&destination={gq}&travelmode=walking'
    gsearch = f'https://www.google.com/maps/search/?api=1&query={gq}'
    maps = f'[🧭 маршрут]({gdir}) · [Google]({gsearch}) · [OSM (запасная)]({osm})'
    lines.append(f'| {i}{mark} | {p["ru"]} | {p["addr"]} | {p["st"]} — {p["color"]} (л. {p["line"]}) | {p["ex"]} | {maps} |')
lines.append("")
lines.append("### Карточки для таксиста")
lines.append("- Отель: 上海市浦东新区川沙镇妙镜路758号 浦东丽呈别院酒店（上海国际旅游度假区店） · тел. +86-21-50966288")
lines.append("- TASTE OF CHINA: 上海市黄浦区河南中路270号 外滩·老市府 B1层")
lines.append("- Магазин Ghibli: 上海市徐汇区肇嘉浜路1111号 美罗城1楼 橡子共和国")
lines.append("- IKEA Xuhui: 上海市徐汇区漕溪路126号 宜家徐汇商场")
lines.append("- UNIQLO флагман: 上海市黄浦区淮海中路887号 优衣库")
lines.append("- Ресторан Lay's: 上海市黄浦区新天地 (Lay's Potato Restaurant)")
lines.append("- 牛New寿喜烧 (шведский стол): 上海市黄浦区南京东路800号 第一百货商业中心6楼")
MARKER = "## Приложение: адреса, метро и закладки OSM"
plan_text = io.open("/home/user/shanghai_plan.md", encoding="utf-8").read()
idx = plan_text.find(MARKER)
if idx != -1:
    plan_text = plan_text[:idx + len(MARKER)]
else:
    plan_text = plan_text.rstrip() + "\n\n" + MARKER
io.open("/home/user/shanghai_plan.md", "w", encoding="utf-8").write(plan_text.rstrip() + "\n\n" + "\n".join(lines) + "\n")

print("OK: places=%d, data.js written, appendix rebuilt in plan" % len(P))
