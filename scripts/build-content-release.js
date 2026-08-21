import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";

const sourceByCategory = {
  "basic-military-english": {
    exactUrl: "https://www.youtube.com/@ENGforUARMY",
    title: "ENG for UARMY — user-provided lesson transcripts",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
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

const basicLessonSources = {
  workingDay: {
    exactUrl: "https://www.youtube.com/watch?v=dI2XIEF-IOQ",
    title: "Working Day. Робочий день та щоденні завдання військового. Урок 20",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
  militaryTime: {
    exactUrl: "https://www.youtube.com/watch?v=QcTJKMmQzRM",
    title: "Military Time. Чим цивільний час відрізняється від військового. Урок 5",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
  nationalities: {
    exactUrl: "https://www.youtube.com/watch?v=VeLMJQIVipc",
    title: "Назви національностей від назв країн. Countries and nationalities in English. Урок 11",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
  units: {
    exactUrl: "https://www.youtube.com/watch?v=aJsA5mS3z9k",
    title: "Військові підрозділи НАТО англійською. Урок 9",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
  vehicles: {
    exactUrl: "https://www.youtube.com/watch?v=T-D2essj7dU",
    title: "Наземна військова техніка англійською. Урок 3",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
  protectiveEquipment: {
    exactUrl: "https://www.youtube.com/watch?v=yuOQByzUCbU",
    title: "Захисне спорядження. Personal Protective Equipment. Урок 18",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
  phoneticAlphabet: {
    exactUrl: "https://www.nato.int/cps/en/natohq/declassified_136216.htm",
    title: "The NATO phonetic alphabet — Alfa, Bravo, Charlie",
    publisher: "NATO",
    sourceType: "NATO",
  },
  ammunition: {
    exactUrl: "https://www.youtube.com/watch?v=QLOhkTjpc64",
    title: "Bullet, round, cartridge, shell, case, projectile, shot: difference. Lesson 97",
    publisher: "ENG for UARMY",
    sourceType: "OTHER",
  },
};

const curriculum = [
  {
    slug: "basic-military-english",
    nameUk: "Базова військова англійська",
    nameEn: "Basic military English",
    lessons: [
      [
        "a1-daily-routine",
        "A1 · Щоденний розпорядок",
        "A1 · Daily routine",
        [
          [
            "wake up",
            "прокидатися",
            {
              partOfSpeech: "VERB",
              aliasesUk: ["прокинутися", "прокинутись", "просинатися", "просинатись"],
            },
          ],
          [
            "make the bed",
            "застеляти ліжко",
            {
              partOfSpeech: "VERB",
              aliasesUk: ["застелити ліжко", "застилати ліжко"],
            },
          ],
          [
            "get dressed",
            "одягатися",
            {
              partOfSpeech: "VERB",
              aliasesUk: ["одягатись", "одягтися", "одягтись"],
            },
          ],
          ["take a shower", "приймати душ", { partOfSpeech: "VERB", aliasesUk: ["прийняти душ"] }],
          [
            "shave",
            "голитися",
            {
              partOfSpeech: "VERB",
              aliasesUk: ["голитись", "поголитися", "поголитись"],
            },
          ],
          [
            "attend formation",
            "бути на шикуванні",
            { partOfSpeech: "VERB", aliasesUk: ["прийти на шикування"] },
          ],
          ["roll call", "перекличка"],
          [
            "physical training",
            "фізична підготовка",
            {
              aliasesEn: ["PT"],
              aliasesUk: ["фізичне тренування", "фізичні тренування", "фізпідготовка"],
            },
          ],
          ["mess hall", "їдальня", { aliasesUk: ["військова їдальня"] }],
          ["duty roster", "графік чергувань", { aliasesUk: ["розклад чергувань"] }],
        ],
        { difficulty: 1, source: basicLessonSources.workingDay },
      ],
      [
        "a1-time",
        "A1 · Час і 24-годинний формат",
        "A1 · Time and the 24-hour clock",
        [
          ["o'clock", "рівно (про годину)"],
          ["past", "після (про хвилини після години)", { partOfSpeech: "ADVERB" }],
          ["to", "до (про хвилини до години)", { partOfSpeech: "ADVERB" }],
          ["quarter", "чверть години"],
          ["half", "половина години"],
          ["a.m.", "до полудня", { partOfSpeech: "ABBREVIATION", aliasesEn: ["AM"] }],
          ["p.m.", "після полудня", { partOfSpeech: "ABBREVIATION", aliasesEn: ["PM"] }],
          ["24-hour clock", "24-годинний формат часу"],
          ["military time", "військовий формат часу"],
          ["time zone", "часовий пояс"],
        ],
        { difficulty: 1, source: basicLessonSources.militaryTime },
      ],
      [
        "a2-countries-nationalities",
        "A2 · Країни та національності",
        "A2 · Countries and nationalities",
        [
          ["country", "країна"],
          ["nationality", "національність"],
          ["Ukraine", "Україна", { partOfSpeech: "PROPER_NOUN" }],
          ["Ukrainian", "українець; українка; український", { partOfSpeech: "ADJECTIVE" }],
          ["Poland", "Польща", { partOfSpeech: "PROPER_NOUN" }],
          ["Polish", "поляк; полька; польський", { partOfSpeech: "ADJECTIVE" }],
          ["Britain", "Британія", { partOfSpeech: "PROPER_NOUN" }],
          ["British", "британець; британка; британський", { partOfSpeech: "ADJECTIVE" }],
          [
            "the United States",
            "Сполучені Штати",
            { partOfSpeech: "PROPER_NOUN", aliasesEn: ["the USA", "the US"] },
          ],
          ["American", "американець; американка; американський", { partOfSpeech: "ADJECTIVE" }],
        ],
        { difficulty: 2, source: basicLessonSources.nationalities },
      ],
      [
        "a2-units",
        "A2 · Підрозділи та командування",
        "A2 · Units and command",
        [
          ["unit", "підрозділ"],
          ["subunit", "підрозділ нижчого рівня"],
          ["company", "рота"],
          ["platoon", "взвод"],
          ["section", "секція; відділення"],
          ["fire team", "вогнева група"],
          ["command", "командування"],
          ["commanding officer", "командир підрозділу", { aliasesEn: ["CO"] }],
          ["second-in-command", "заступник командира", { aliasesEn: ["2IC"] }],
          ["personnel", "особовий склад"],
        ],
        { difficulty: 2, source: basicLessonSources.units },
      ],
      [
        "a2-ground-vehicles",
        "A2 · Наземна військова техніка",
        "A2 · Ground military vehicles",
        [
          ["combat vehicle", "бойова машина"],
          ["non-combat vehicle", "небойова машина"],
          ["armoured personnel carrier", "бронетранспортер", { aliasesEn: ["APC"] }],
          ["infantry fighting vehicle", "бойова машина піхоти", { aliasesEn: ["IFV"] }],
          ["main battle tank", "основний бойовий танк", { aliasesEn: ["MBT"] }],
          ["reconnaissance vehicle", "розвідувальна машина"],
          ["military ambulance", "військова машина швидкої допомоги"],
          ["engineering vehicle", "інженерна машина"],
          ["recovery vehicle", "евакуаційна машина"],
          ["military truck", "військова вантажівка"],
        ],
        { difficulty: 2, source: basicLessonSources.vehicles },
      ],
      [
        "b1-protective-equipment",
        "B1 · Захисне спорядження",
        "B1 · Personal protective equipment",
        [
          [
            "personal protective equipment",
            "засоби індивідуального захисту",
            { aliasesEn: ["PPE"] },
          ],
          ["helmet", "шолом"],
          ["body armour", "бронежилет", { aliasesEn: ["body armor"] }],
          ["plate carrier", "плитоноска"],
          ["ballistic plate", "балістична плита"],
          ["eye protection", "захист очей"],
          ["hearing protection", "захист слуху"],
          ["protective gloves", "захисні рукавички"],
          ["combat boots", "тактичні черевики"],
          ["load-bearing equipment", "розвантажувальна система", { aliasesEn: ["LBE"] }],
        ],
        { difficulty: 3, source: basicLessonSources.protectiveEquipment },
      ],
      [
        "b1-phonetic-alphabet-a-i",
        "B1 · Фонетичний алфавіт A–I",
        "B1 · Phonetic alphabet A–I",
        [
          ["phonetic alphabet", "фонетичний алфавіт"],
          [
            "Alfa",
            "кодове слово для літери A",
            { partOfSpeech: "PROPER_NOUN", aliasesEn: ["Alpha"] },
          ],
          ["Bravo", "кодове слово для літери B", { partOfSpeech: "PROPER_NOUN" }],
          ["Charlie", "кодове слово для літери C", { partOfSpeech: "PROPER_NOUN" }],
          ["Delta", "кодове слово для літери D", { partOfSpeech: "PROPER_NOUN" }],
          ["Echo", "кодове слово для літери E", { partOfSpeech: "PROPER_NOUN" }],
          ["Foxtrot", "кодове слово для літери F", { partOfSpeech: "PROPER_NOUN" }],
          ["Golf", "кодове слово для літери G", { partOfSpeech: "PROPER_NOUN" }],
          ["Hotel", "кодове слово для літери H", { partOfSpeech: "PROPER_NOUN" }],
          ["India", "кодове слово для літери I", { partOfSpeech: "PROPER_NOUN" }],
        ],
        { difficulty: 3, source: basicLessonSources.phoneticAlphabet },
      ],
      [
        "b1-phonetic-alphabet-j-r",
        "B1 · Фонетичний алфавіт J–R",
        "B1 · Phonetic alphabet J–R",
        [
          ["code word", "кодове слово"],
          [
            "Juliett",
            "кодове слово для літери J",
            { partOfSpeech: "PROPER_NOUN", aliasesEn: ["Juliet"] },
          ],
          ["Kilo", "кодове слово для літери K", { partOfSpeech: "PROPER_NOUN" }],
          ["Lima", "кодове слово для літери L", { partOfSpeech: "PROPER_NOUN" }],
          ["Mike", "кодове слово для літери M", { partOfSpeech: "PROPER_NOUN" }],
          ["November", "кодове слово для літери N", { partOfSpeech: "PROPER_NOUN" }],
          ["Oscar", "кодове слово для літери O", { partOfSpeech: "PROPER_NOUN" }],
          ["Papa", "кодове слово для літери P", { partOfSpeech: "PROPER_NOUN" }],
          ["Quebec", "кодове слово для літери Q", { partOfSpeech: "PROPER_NOUN" }],
          ["Romeo", "кодове слово для літери R", { partOfSpeech: "PROPER_NOUN" }],
        ],
        { difficulty: 3, source: basicLessonSources.phoneticAlphabet },
      ],
      [
        "b1-phonetic-alphabet-s-z",
        "B1 · Фонетичний алфавіт S–Z",
        "B1 · Phonetic alphabet S–Z",
        [
          ["spell", "називати по літерах", { partOfSpeech: "VERB" }],
          ["radio check", "перевірка радіозв’язку"],
          ["Sierra", "кодове слово для літери S", { partOfSpeech: "PROPER_NOUN" }],
          ["Tango", "кодове слово для літери T", { partOfSpeech: "PROPER_NOUN" }],
          ["Uniform", "кодове слово для літери U", { partOfSpeech: "PROPER_NOUN" }],
          ["Victor", "кодове слово для літери V", { partOfSpeech: "PROPER_NOUN" }],
          ["Whiskey", "кодове слово для літери W", { partOfSpeech: "PROPER_NOUN" }],
          [
            "X-ray",
            "кодове слово для літери X",
            { partOfSpeech: "PROPER_NOUN", aliasesEn: ["Xray"] },
          ],
          ["Yankee", "кодове слово для літери Y", { partOfSpeech: "PROPER_NOUN" }],
          ["Zulu", "кодове слово для літери Z", { partOfSpeech: "PROPER_NOUN" }],
        ],
        { difficulty: 3, source: basicLessonSources.phoneticAlphabet },
      ],
      [
        "b2-ammunition-terms",
        "B2 · Точні назви боєприпасів",
        "B2 · Precise ammunition terms",
        [
          [
            "ammunition",
            "боєприпаси",
            {
              definitionEn:
                "A collective term for cartridges, rounds and other items intended to be fired; it is normally uncountable.",
              definitionUk:
                "Збірна назва для патронів, пострілів та інших предметів, призначених для стрільби; в англійській зазвичай незлічувана.",
            },
          ],
          [
            "bullet",
            "куля",
            {
              definitionEn:
                "The projectile component of a small-arms cartridge, not the complete cartridge.",
              definitionUk: "Метальна частина патрона до стрілецької зброї, а не весь патрон.",
            },
          ],
          [
            "round",
            "одиниця боєприпасу; патрон або постріл",
            {
              definitionEn:
                "One complete item of ammunition ready to be fired; the exact form depends on the weapon context.",
              definitionUk:
                "Одна повна одиниця боєприпасу, готова до пострілу; конкретний вид залежить від контексту зброї.",
            },
          ],
          [
            "cartridge",
            "патрон",
            {
              definitionEn:
                "A complete unit for small arms, typically comprising a case, primer, propellant and bullet.",
              definitionUk:
                "Повна одиниця боєприпасу для стрілецької зброї, що зазвичай містить гільзу, капсуль, метальний заряд і кулю.",
            },
          ],
          [
            "cartridge case",
            "гільза",
            {
              aliasesEn: ["case"],
              definitionEn:
                "The container that holds the primer and propellant and supports the bullet before firing.",
              definitionUk:
                "Корпус патрона, який утримує капсуль і метальний заряд та фіксує кулю до пострілу.",
            },
          ],
          [
            "shell",
            "артилерійський снаряд",
            {
              definitionEn:
                "A projectile, commonly for artillery, that may contain a payload; usage depends on context.",
              definitionUk:
                "Снаряд, зазвичай артилерійський, який може містити корисне спорядження; точне значення залежить від контексту.",
            },
          ],
          [
            "projectile",
            "метальний снаряд; проєктиль",
            {
              definitionEn: "A general term for an object launched through space by a force.",
              definitionUk: "Загальна назва предмета, якому надано рух дією сили.",
            },
          ],
          [
            "shot",
            "постріл",
            {
              definitionEn:
                "The act or result of firing once; in other contexts it can also name small pellets.",
              definitionUk:
                "Один акт або результат стрільби; в інших контекстах слово також може позначати дріб.",
            },
          ],
          [
            "live round",
            "бойовий патрон; бойовий постріл",
            {
              definitionEn:
                "A complete round containing active components and intended for actual firing rather than inert practice.",
              definitionUk:
                "Повна одиниця боєприпасу з активними компонентами, призначена для реального пострілу, а не інертного тренування.",
            },
          ],
          [
            "spent cartridge case",
            "стріляна гільза",
            {
              aliasesEn: ["spent case"],
              definitionEn: "A cartridge case remaining after the round has been fired.",
              definitionUk: "Гільза, що залишається після пострілу.",
            },
          ],
        ],
        { difficulty: 4, source: basicLessonSources.ammunition },
      ],
    ],
  },
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
  const [english, ukrainian, metadata = {}] = pair;
  const externalKey = `${category.slug}:${lesson.slug}:${position + 1}`;
  const partOfSpeech =
    metadata.partOfSpeech ??
    (/^[A-Z]{2,6}$/u.test(english) ? "ABBREVIATION" : english.includes(" ") ? "PHRASE" : "NOUN");
  return {
    externalKey,
    slug: `${category.slug}-${slugify(english)}`,
    lessonSlug: lesson.slug,
    english,
    ukrainian,
    partOfSpeech,
    difficulty: Math.min(5, Math.max(1, lesson.difficulty)),
    cefrLevel: lesson.cefrLevel,
    aliasesEn: metadata.aliasesEn ?? [],
    aliasesUk: metadata.aliasesUk ?? [],
    definitionEn:
      metadata.definitionEn ??
      `The concept denoted by “${english}” in the ${category.nameEn} vocabulary.`,
    definitionUk:
      metadata.definitionUk ??
      `Поняття, позначене терміном «${ukrainian}» у словнику напряму «${category.nameUk}».`,
    exampleEn:
      metadata.exampleEn ??
      `The learner reviews the term “${english}” in a neutral language exercise.`,
    exampleUk:
      metadata.exampleUk ??
      `Користувач опрацьовує термін «${ukrainian}» у нейтральній мовній вправі.`,
    contextNoteEn:
      category.slug === "tactical-medicine"
        ? "Language reference only; this material does not replace certified medical training."
        : "Public terminology for language learning; no operational instruction is provided.",
    contextNoteUk:
      category.slug === "tactical-medicine"
        ? "Лише мовна довідка; матеріал не замінює сертифікованого медичного навчання."
        : "Загальнодоступна термінологія для вивчення мови без оперативних інструкцій.",
    source: {
      ...(lesson.source ?? sourceByCategory[category.slug]),
      verificationStatus: "UNVERIFIED",
    },
    origin: "AI_ASSISTED",
    audioState: "TTS_FALLBACK",
  };
}

const outputDir = path.resolve("prisma/content/v1");
await mkdir(outputDir, { recursive: true });

async function formattedJson(value) {
  return format(JSON.stringify(value), { parser: "json" });
}

const manifest = {
  version: "1.1.0-draft",
  status: "DRAFT_REQUIRES_HUMAN_REVIEW",
  generatedAt: new Date().toISOString(),
  expected: { categories: 5, terms: 300, lessons: 30, termsPerLesson: 10 },
  files: [],
};

for (const category of curriculum) {
  const lessons = category.lessons.map(
    ([slug, titleUk, titleEn, pairs, options = {}], lessonIndex) => {
      const difficulty = options.difficulty ?? Math.min(5, lessonIndex + 1);
      const lesson = {
        slug,
        titleUk,
        titleEn,
        difficulty,
        cefrLevel: ["A1", "A2", "B1", "B2", "C1"][difficulty - 1],
        estimatedMinutes: 12,
        source: options.source,
      };
      const terms = pairs.map((pair, index) => makeTerm(category, lesson, pair, index));
      terms.forEach((term, index) => {
        term.distractorKeys = [1, 2, 3].map(
          (offset) => terms[(index + offset) % terms.length].externalKey,
        );
      });
      return { ...lesson, terms };
    },
  );
  const fileName = `${category.slug}.json`;
  const payload = {
    version: manifest.version,
    category: { slug: category.slug, nameUk: category.nameUk, nameEn: category.nameEn },
    lessons,
  };
  await writeFile(path.join(outputDir, fileName), await formattedJson(payload), "utf8");
  manifest.files.push({
    file: fileName,
    categorySlug: category.slug,
    termCount: lessons.reduce((sum, lesson) => sum + lesson.terms.length, 0),
    lessonCount: lessons.length,
  });
}

await writeFile(path.join(outputDir, "manifest.json"), await formattedJson(manifest), "utf8");
console.log(`Built ${manifest.expected.terms} draft terms in ${outputDir}`);
