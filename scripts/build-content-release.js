import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceByCategory = {
  "general-tactical-english": {
    exactUrl: "https://nso.nato.int/natoterm/content/nato/pages/home.html",
    title: "NATOTerm — The Official NATO Terminology Database",
    publisher: "NATO Standardization Office",
    sourceType: "NATO",
  },
  "tactical-medicine": {
    exactUrl: "https://jts.health.mil/index.cfm/committees/cotccc/guidelines",
    title: "Committee on Tactical Combat Casualty Care Guidelines",
    publisher: "Joint Trauma System",
    sourceType: "MEDICAL",
  },
  "drones-uas": {
    exactUrl: "https://www.faa.gov/air_traffic/publications/atpubs/pcg_html/glossary-u.html",
    title: "FAA Pilot/Controller Glossary — U",
    publisher: "Federal Aviation Administration",
    sourceType: "OTHER",
  },
  "sniper-terminology": {
    exactUrl:
      "https://rdl.train.army.mil/catalog-ws/view/100.ATSC/D2B552B4-2D13-4329-99ED-174C12A642D2-1771510672968/GTAx07_10_005.pdf",
    title: "GTA 07-10-005 Sniper Reference Book",
    publisher: "United States Army",
    sourceType: "DOCTRINE",
  },
};

const curriculum = [
  {
    slug: "general-tactical-english",
    nameUk: "Загальна тактична англійська",
    nameEn: "General tactical English",
    lessons: [
      [
        "orientation-labels",
        "Орієнтація й позначення",
        "Orientation and labels",
        [
          ["north", "північ"],
          ["south", "південь"],
          ["east", "схід"],
          ["west", "захід"],
          ["left", "ліворуч"],
          ["right", "праворуч"],
          ["forward", "уперед"],
          ["rear", "тил"],
          ["map", "мапа"],
          ["grid", "координатна сітка"],
        ],
      ],
      [
        "people-units",
        "Люди, ролі та підрозділи",
        "People, roles and units",
        [
          ["team", "команда"],
          ["squad", "відділення"],
          ["platoon", "взвод"],
          ["commander", "командир"],
          ["leader", "керівник"],
          ["operator", "оператор"],
          ["medic", "медик"],
          ["observer", "спостерігач"],
          ["driver", "водій"],
          ["crew", "екіпаж"],
        ],
      ],
      [
        "directions-terrain",
        "Напрямки й місцевість",
        "Directions and terrain",
        [
          ["road", "дорога"],
          ["bridge", "міст"],
          ["building", "будівля"],
          ["entrance", "вхід"],
          ["exit", "вихід"],
          ["checkpoint", "контрольний пункт"],
          ["boundary", "межа"],
          ["route", "маршрут"],
          ["location", "місце розташування"],
          ["distance", "відстань"],
        ],
      ],
      [
        "radio-messages",
        "Радіообмін і повідомлення",
        "Radio communication and messages",
        [
          ["radio", "радіостанція"],
          ["channel", "канал"],
          ["frequency", "частота"],
          ["call sign", "позивний"],
          ["message", "повідомлення"],
          ["repeat", "повторити"],
          ["confirm", "підтвердити"],
          ["stand by", "очікувати"],
          ["signal", "сигнал"],
          ["communication", "зв’язок"],
        ],
      ],
      [
        "equipment-logistics",
        "Спорядження й логістика",
        "Equipment and logistics",
        [
          ["vehicle", "транспортний засіб"],
          ["fuel", "пальне"],
          ["battery", "акумулятор"],
          ["equipment", "спорядження"],
          ["supply", "постачання"],
          ["repair", "ремонт"],
          ["maintenance", "технічне обслуговування"],
          ["transport", "транспорт"],
          ["cargo", "вантаж"],
          ["inventory", "майно за описом"],
        ],
      ],
      [
        "planning-reporting",
        "Планування, звітність і взаємодія",
        "Planning, reporting and coordination",
        [
          ["task", "завдання"],
          ["objective", "мета"],
          ["priority", "пріоритет"],
          ["status", "стан"],
          ["report", "звіт"],
          ["schedule", "розклад"],
          ["coordination", "координація"],
          ["support", "підтримка"],
          ["request", "запит"],
          ["briefing", "інструктаж"],
        ],
      ],
    ],
  },
  {
    slug: "tactical-medicine",
    nameUk: "Тактична медицина / TCCC",
    nameEn: "Tactical medicine / TCCC",
    lessons: [
      [
        "assessment-roles",
        "Оцінювання стану й ролі",
        "Assessment and roles",
        [
          ["casualty", "постраждалий"],
          ["responder", "особа, що надає допомогу"],
          ["medical personnel", "медичний персонал"],
          ["patient", "пацієнт"],
          ["assessment", "оцінювання"],
          ["symptom", "симптом"],
          ["sign", "ознака"],
          ["consciousness", "свідомість"],
          ["pulse", "пульс"],
          ["respiration", "дихання"],
        ],
      ],
      [
        "bleeding-wounds",
        "Кровотечі та рани",
        "Bleeding and wounds",
        [
          ["bleeding", "кровотеча"],
          ["hemorrhage", "геморагія"],
          ["wound", "рана"],
          ["injury", "травма"],
          ["dressing", "перев’язувальний матеріал"],
          ["bandage", "бинт"],
          ["tourniquet", "турнікет"],
          ["pressure", "тиск"],
          ["blood loss", "втрата крові"],
          ["contamination", "забруднення"],
        ],
      ],
      [
        "airway-breathing",
        "Дихальні шляхи й дихання",
        "Airway and breathing",
        [
          ["airway", "дихальні шляхи"],
          ["breathing", "дихання"],
          ["chest", "грудна клітка"],
          ["oxygen", "кисень"],
          ["ventilation", "вентиляція"],
          ["obstruction", "непрохідність"],
          ["respiratory rate", "частота дихання"],
          ["lung", "легеня"],
          ["chest seal", "оклюзійна наліпка"],
          ["recovery position", "стабільне бокове положення"],
        ],
      ],
      [
        "circulation-temperature",
        "Кровообіг, шок і гіпотермія",
        "Circulation, shock and hypothermia",
        [
          ["circulation", "кровообіг"],
          ["shock", "шок"],
          ["hypothermia", "гіпотермія"],
          ["temperature", "температура"],
          ["skin", "шкіра"],
          ["perfusion", "перфузія"],
          ["fluid", "рідина"],
          ["fracture", "перелом"],
          ["pain", "біль"],
          ["monitoring", "спостереження за станом"],
        ],
      ],
      [
        "evacuation-handover",
        "Евакуація, передача та документація",
        "Evacuation, handover and documentation",
        [
          ["evacuation", "евакуація"],
          ["litter", "ноші"],
          ["ambulance", "автомобіль швидкої допомоги"],
          ["handover", "передача пацієнта"],
          ["casualty card", "картка постраждалого"],
          ["medical facility", "медичний заклад"],
          ["evacuation priority", "пріоритет евакуації"],
          ["medical transport", "медичний транспорт"],
          ["documentation", "документація"],
          ["reassessment", "повторне оцінювання"],
        ],
      ],
    ],
  },
  {
    slug: "drones-uas",
    nameUk: "Дрони та UAS",
    nameEn: "Drones and UAS",
    lessons: [
      [
        "platform-components",
        "Типи платформ і компоненти",
        "Platforms and components",
        [
          ["unmanned aircraft", "безпілотне повітряне судно"],
          ["unmanned aircraft system", "безпілотна авіаційна система"],
          ["UAV", "БПЛА"],
          ["airframe", "планер"],
          ["propeller", "пропелер"],
          ["motor", "двигун"],
          ["rotor", "ротор"],
          ["wing", "крило"],
          ["landing gear", "шасі"],
          ["payload", "корисне навантаження"],
        ],
      ],
      [
        "flight-navigation",
        "Стани польоту й навігація",
        "Flight states and navigation",
        [
          ["takeoff", "зліт"],
          ["landing", "посадка"],
          ["altitude", "висота"],
          ["heading", "курс"],
          ["waypoint", "маршрутна точка"],
          ["flight route", "маршрут польоту"],
          ["hover", "зависання"],
          ["climb", "набір висоти"],
          ["descent", "зниження"],
          ["airspace", "повітряний простір"],
        ],
      ],
      [
        "control-telemetry",
        "Канал керування й телеметрія",
        "Control link and telemetry",
        [
          ["ground control station", "наземна станція керування"],
          ["controller", "контролер"],
          ["data link", "канал передавання даних"],
          ["telemetry", "телеметрія"],
          ["antenna", "антена"],
          ["signal strength", "рівень сигналу"],
          ["connection", "з’єднання"],
          ["latency", "затримка"],
          ["command", "команда"],
          ["return to home", "повернення до точки старту"],
        ],
      ],
      [
        "sensors-imaging",
        "Сенсори та зображення",
        "Sensors and imaging",
        [
          ["camera", "камера"],
          ["sensor", "сенсор"],
          ["gimbal", "підвіс камери"],
          ["image", "зображення"],
          ["video feed", "відеопотік"],
          ["resolution", "роздільна здатність"],
          ["zoom", "масштабування"],
          ["infrared", "інфрачервоний діапазон"],
          ["field of view", "поле зору"],
          ["metadata", "метадані"],
        ],
      ],
      [
        "maintenance-safety",
        "Обслуговування, безпека й регулювання",
        "Maintenance, safety and regulation",
        [
          ["flight battery", "польотний акумулятор"],
          ["charging", "заряджання"],
          ["firmware", "вбудоване програмне забезпечення"],
          ["calibration", "калібрування"],
          ["inspection", "огляд"],
          ["scheduled maintenance", "планове обслуговування"],
          ["registration", "реєстрація"],
          ["remote identification", "дистанційна ідентифікація"],
          ["weather", "погода"],
          ["safety", "безпека"],
        ],
      ],
    ],
  },
  {
    slug: "sniper-terminology",
    nameUk: "Снайперська термінологія",
    nameEn: "Sniper terminology",
    lessons: [
      [
        "roles-equipment",
        "Ролі та обладнання",
        "Roles and equipment",
        [
          ["sniper", "снайпер"],
          ["spotter", "спостерігач"],
          ["sniper team", "снайперська група"],
          ["rifle", "гвинтівка"],
          ["optic", "оптичний прилад"],
          ["bipod", "сошки"],
          ["sling", "ремінь"],
          ["magazine", "магазин"],
          ["ammunition", "боєприпаси"],
          ["equipment case", "футляр для спорядження"],
        ],
      ],
      [
        "optics-observation",
        "Оптика й спостереження",
        "Optics and observation",
        [
          ["observation", "спостереження"],
          ["binoculars", "бінокль"],
          ["spotting scope", "зорова труба"],
          ["reticle", "прицільна сітка"],
          ["magnification", "збільшення"],
          ["focus", "фокусування"],
          ["lens", "лінза"],
          ["field of view", "поле зору"],
          ["target description", "опис цілі"],
          ["range card", "картка дальностей"],
        ],
      ],
      [
        "ballistics-weather",
        "Балістика, погода та вимірювання",
        "Ballistics, weather and measurement",
        [
          ["trajectory", "траєкторія"],
          ["ballistics", "балістика"],
          ["wind", "вітер"],
          ["air temperature", "температура повітря"],
          ["atmospheric pressure", "атмосферний тиск"],
          ["humidity", "вологість"],
          ["elevation", "перевищення"],
          ["angle", "кут"],
          ["range", "дальність"],
          ["measurement", "вимірювання"],
        ],
      ],
      [
        "positions-reporting",
        "Позиції та звітність",
        "Positions and reporting",
        [
          ["position", "позиція"],
          ["concealment", "маскування"],
          ["camouflage", "камуфляж"],
          ["cover", "укриття"],
          ["approach route", "маршрут підходу"],
          ["observation sector", "сектор спостереження"],
          ["observation report", "звіт про спостереження"],
          ["team communication", "зв’язок у групі"],
          ["correction", "поправка"],
          ["logbook", "журнал записів"],
        ],
      ],
    ],
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
}

function makeTerm(category, lesson, pair, position) {
  const [english, ukrainian] = pair;
  const externalKey = `${category.slug}:${lesson.slug}:${position + 1}`;
  const partOfSpeech = /^[A-Z]{2,6}$/u.test(english)
    ? "ABBREVIATION"
    : english.includes(" ")
      ? "PHRASE"
      : "NOUN";
  return {
    externalKey,
    slug: `${category.slug}-${slugify(english)}`,
    lessonSlug: lesson.slug,
    english,
    ukrainian,
    partOfSpeech,
    difficulty: Math.min(5, Math.max(1, lesson.difficulty)),
    definitionEn: `The concept denoted by “${english}” in the ${category.nameEn} vocabulary.`,
    definitionUk: `Поняття, позначене терміном «${ukrainian}» у словнику напряму «${category.nameUk}».`,
    exampleEn: `The learner reviews the term “${english}” in a neutral language exercise.`,
    exampleUk: `Користувач опрацьовує термін «${ukrainian}» у нейтральній мовній вправі.`,
    contextNoteEn:
      category.slug === "tactical-medicine"
        ? "Language reference only; this material does not replace certified medical training."
        : "Public terminology for language learning; no operational instruction is provided.",
    contextNoteUk:
      category.slug === "tactical-medicine"
        ? "Лише мовна довідка; матеріал не замінює сертифікованого медичного навчання."
        : "Загальнодоступна термінологія для вивчення мови без оперативних інструкцій.",
    source: { ...sourceByCategory[category.slug], verificationStatus: "UNVERIFIED" },
    origin: "AI_ASSISTED",
    audioState: "TTS_FALLBACK",
  };
}

const outputDir = path.resolve("prisma/content/v1");
await mkdir(outputDir, { recursive: true });

const manifest = {
  version: "1.0.0-draft",
  status: "DRAFT_REQUIRES_HUMAN_REVIEW",
  generatedAt: new Date().toISOString(),
  expected: { categories: 4, terms: 200, lessons: 20, termsPerLesson: 10 },
  files: [],
};

for (const category of curriculum) {
  const lessons = category.lessons.map(([slug, titleUk, titleEn, pairs], lessonIndex) => {
    const lesson = {
      slug,
      titleUk,
      titleEn,
      difficulty: Math.min(5, lessonIndex + 1),
      estimatedMinutes: 12,
    };
    const terms = pairs.map((pair, index) => makeTerm(category, lesson, pair, index));
    terms.forEach((term, index) => {
      term.distractorKeys = [1, 2, 3].map(
        (offset) => terms[(index + offset) % terms.length].externalKey,
      );
    });
    return { ...lesson, terms };
  });
  const fileName = `${category.slug}.json`;
  const payload = {
    version: manifest.version,
    category: { slug: category.slug, nameUk: category.nameUk, nameEn: category.nameEn },
    lessons,
  };
  await writeFile(path.join(outputDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  manifest.files.push({
    file: fileName,
    categorySlug: category.slug,
    termCount: lessons.reduce((sum, lesson) => sum + lesson.terms.length, 0),
    lessonCount: lessons.length,
  });
}

await writeFile(
  path.join(outputDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log(`Built ${manifest.expected.terms} draft terms in ${outputDir}`);
