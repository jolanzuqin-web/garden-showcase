// Группировка/подписи декад, категорий и слияние карточек живут в
// garden-logic.js - общем модуле с build-скриптом статических SEO-страниц
// (docs/build/build-region-pages.js), чтобы обе стороны рендерили из одного
// и того же кода, а не по разошедшимся копиям.
const { MONTH_IDS, MONTH_NAMES, MONTH_GENITIVE, SEASONS, seasonForMonth, buildGroupedEntries, dekorGroup, categoryLabel } = GardenLogic;

// Единственный источник дефолтного региона для сборки - docs/build/site-config.js;
// window.SITE_CONFIG - его браузерная копия, генерируется build-region-pages.js
// (см. js/site-config.js, загружается раньше этого файла).
const DEFAULT_REGION_ID = window.SITE_CONFIG.defaultRegionId;

// id культур, у которых есть отдельная страница справочника (docs/plants/<id>.html).
// Список генерируется build-plants.js в js/site-config.js (window.PLANT_PAGES) —
// стикер такой культуры на карточке становится ссылкой на справочник вместо
// открытия выезжающей панели.
const PLANT_PAGES = window.PLANT_PAGES || [];

const MONTH_SHORT = {
  yanvar: 'Янв', fevral: 'Фев', mart: 'Мар', aprel: 'Апр', may: 'Май',
  iyun: 'Июн', iyul: 'Июл', avgust: 'Авг', sentyabr: 'Сен',
  oktyabr: 'Окт', noyabr: 'Ноя', dekabr: 'Дек',
};

// Карточка-заглушка «Гусь-смотритель» — сезонная мини-история по месяцу.
// Полный сценарий и промпты картинок — Garden/TZ_gus-12-scen.md. Декабрь
// замыкается на январь.
const GOOSE = {
  yanvar:   { note: 'считаю семена',      text: 'Каникулы кончились, не успев начаться: вместо отдыха Гусь считает семена — этих хватит на посадку, а перца снова недокупил. Январь весь уходит на опись и замыслы, торопиться некуда. В феврале он первым делом поставит на свет перец и баклажаны: их Гусь сеет раньше всего.' },
  fevral:   { note: 'свечу рассаде',      text: 'За стеклом метель, а Гусь уже развёл весну на подоконнике: караулит первые всходы перца и баклажанов, готовит семена на стратификацию. Солнце уже пригревает в отдельные дни, но зима с весной никак не могут договориться. В марте пойдёт большой сев, и Гусь возьмётся за томаты и капусту. А пока нужно не забыть притенить туи.' },
  mart:     { note: 'точу секатор',       text: 'Гусь считает: обрезать яблоню надо, пока она спит и не заметит обиды. А там и первый в году смотр — «по голубому конусу»: опрыскивание от вредителей, что пересидели зиму в коре, — с ними у Гуся давняя война. В апреле дойдёт черёд до роз — пора снимать укрытие.' },
  aprel:    { note: 'гоню талую воду',    text: 'Розы Гусь освобождает первыми, но телогрейку с плеч не снимает: апрель ещё десять раз передумает. Пока земля подсыхает от талой воды, он успевает порадоваться крокусам у самых лап — единственная его слабость. В мае Гусь высадит рассаду на грядки и впервые за сезон обработает овощи от вредителей.' },
  may:      { note: 'слежу за ночью',     text: 'Днём — яблоня в цвету и шмели, а Гусь косится на термометр и не верит: май обманчив, заморозок ходит по ночам. Оттого и спанбонд под рукой, и сон вполглаза. Рассада на крыльце ждёт: к июню Гусь переселит томаты и огурцы на постоянное место — и клянётся, что кабачков посадит в этом году меньше.' },
  iyun:     { note: 'с утра в грядках',   text: 'С утра до вечера в грядках: опоры для гороха и фасоли, подвязки — и опять этот колорадский жук, давний личный враг, объявился на картошке как ни в чём не бывало. Клубника уже румянится. В июле пойдёт ранний урожай, а Гусь подсеет вторую партию зелени. Кабачков, конечно, снова посадил с запасом.' },
  iyul:     { note: 'прячусь от солнца',  text: 'В самый зной Гусь прячется в тень и мечтает о январском сугробе — вот когда отдых. Настоящие дела ждут прохлады: поливает Гусь только ранним утром, из большой лейки. Смородина и вишня подходят, огурцов уже некуда девать. В августе Гусь выкопает лук и займётся заготовками, а там и обход соседей с кабачками.' },
  avgust:   { note: 'раздаю огурцы и кабачки', text: 'Урожай идёт валом, и Гусь ведёт учёт: свои семена — по тетради, подписанные; кабачки — по соседям, кому ещё не досталось. Между делом последнее в сезоне опрыскивание сада от фитофторы, чтоб труды по огороду за весь сезон не оказались насмарку. В сентябре Гусь начнёт осенние посадки и сбор яблок. А пока продолжается огуречно-кабачковая диета.' },
  sentyabr: { note: 'свожу урожай',       text: 'Сентябрь весь про уборку и про то, что делается загодя: озимый чеснок и тюльпаны Гусь отправляет в землю под будущий год в конце месяца. Яблоки и картошка — по вёдрам, тыква ещё доходит на грядке. В тетради прибавляется галочек. В октябре Гусь возьмётся за побелку и укрытие многолетников — и за разговор с зайцами.' },
  oktyabr:  { note: 'белю яблони',        text: 'Стволы яблонь Гусь готовит к зиме — извёсткой и обвязкой от зайцев, у которых на его сад давние виды. Напоследок обильно проливает деревья: влаги должно хватить на всю зиму. На грядке — последняя капуста. В ноябре Гусь укроет гортензии на дугах и засеет опустевшие грядки под зиму.' },
  noyabr:   { note: 'согреваюсь чаем',    text: 'Первый снег лёг пятнами — Гусь спешит закрыть последнее: гортензии на дугах, молодые туи стянуты шпагатом, чтоб не разъехались, штамбы яблонь обвязаны от зайцев. Инвентарь — под навес до весны. В декабре останется отряхивать снег с веток да сторожить погреб — и ждать каникул.' },
  dekabr:   { note: 'жду каникул',        text: 'Наконец-то тихо. Гусь обходит сад после снегопада, чтоб мокрый снег не обломил ветки, да спускается в погреб — глянуть, как зимуют картошка и клубни георгин. Есть ещё время купить подарки, украсить дом и распланировать наступающие праздники. А в январе Гусь снова сядет за тетрадь — и всё пойдёт по новому кругу.' },
};

function daysInMonth(year, jsMonthIndex) {
  return new Date(year, jsMonthIndex + 1, 0).getDate();
}

// Грубая, приблизительная классификация по координатам (не заменяет проверенные
// границы регионов) - используется только для предзаполнения выбора региона.
function classifyRegionByCoords(lat, lon) {
  if (lon > 60) return 'ural-sibir';
  if (lat < 48) return 'yug';
  if (lat > 58) return 'severo-zapad';
  return DEFAULT_REGION_ID;
}

function app() {
  return {
    regions: [], plants: [], worktypes: [], calendar: [], hvoynyeIds: [],

    regionId: DEFAULT_REGION_ID,
    season: 'summer',
    month: 'iyun',
    selectedWorktypes: [],
    growFilter: 'all',
    categoryFilter: 'all',
    plantQuery: '',
    activePlant: null,
    geoMessage: '',

    // Тумблер темы. Значение уже проставлено инлайн-скриптом в <head>
    // (localStorage 'garden.theme' → иначе prefers-color-scheme), тут только
    // синхронизируем реактивное поле с уже выставленным на <html> атрибутом.
    theme: document.documentElement.getAttribute('data-theme') || 'light',

    actualSeason: 'summer',
    actualMonth: 'iyun',
    actualDay: 1,

    async init() {
      // Статический снимок для роботов (см. build-region-pages.js) больше не
      // нужен, как только Alpine готов взять рендер на себя - иначе он
      // остался бы в DOM рядом с реальным списком и задвоил бы контент.
      document.getElementById('ssr-snapshot')?.remove();

      // Данные встроены в data/bundle.<hash>.js (window.GARDEN_DATA), чтобы сайт
      // работал и при открытии index.html напрямую двойным кликом (file://),
      // без запуска локального сервера - fetch() JSON под file:// браузер блокирует.
      let regions, plants, worktypes, calendar;
      if (window.GARDEN_DATA) {
        ({ regions, plants, worktypes, calendar } = window.GARDEN_DATA);
      } else {
        [regions, plants, worktypes, calendar] = await Promise.all([
          fetch('data/regions.json').then(r => r.json()),
          fetch('data/plants.json').then(r => r.json()),
          fetch('data/worktypes.json').then(r => r.json()),
          fetch('data/calendar.json').then(r => r.json()),
        ]);
      }
      this.regions = regions;
      this.plants = plants;
      // Хвойные вычисляются из group='hvoynye' в Plants (garden-data.xlsx),
      // а не хардкодятся списком id в коде - правки культур (например,
      // добавление ели/сосны) подхватываются без правки app.js.
      this.hvoynyeIds = plants.filter(p => p.group === 'hvoynye').map(p => p.id);
      this.worktypes = worktypes;
      this.calendar = calendar;
      this.selectedWorktypes = worktypes.map(w => w.id);

      const now = new Date();
      this.actualMonth = MONTH_IDS[now.getMonth()];
      this.actualSeason = seasonForMonth(this.actualMonth);
      this.actualDay = now.getDate();
      this.month = this.actualMonth;
      this.season = this.actualSeason;

      // ?region=... в URL (переход со статической SEO-страницы конкретного
      // региона, см. build-region-pages.js) имеет приоритет над сохранённым
      // в localStorage выбором - человек явно пришёл за этим регионом.
      const regionFromUrl = new URLSearchParams(location.search).get('region');
      const savedRegion = localStorage.getItem('garden.regionId');
      this.regionId = (regionFromUrl && regions.some(r => r.id === regionFromUrl))
        ? regionFromUrl
        : (savedRegion || DEFAULT_REGION_ID);

      this.$watch('regionId', v => localStorage.setItem('garden.regionId', v));

      // ?plant=<id> (переход со страницы справочника культуры) — подставляем
      // название культуры в поиск, чтобы календарь сразу открылся отфильтрованным
      // по ней. Совпадение в фильтре и так по подстроке имени.
      const plantFromUrl = new URLSearchParams(location.search).get('plant');
      if (plantFromUrl) {
        const p = plants.find(pl => pl.id === plantFromUrl);
        if (p) this.plantQuery = p.name;
      }

      // Смена системной темы применяется на лету, только пока пользователь не
      // выбрал тему вручную (нет 'garden.theme' в localStorage).
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (localStorage.getItem('garden.theme')) return;
          this.theme = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', this.theme);
        });
      } catch (e) { /* matchMedia недоступен — не критично */ }
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', this.theme);
      try { localStorage.setItem('garden.theme', this.theme); } catch (e) { /* приватный режим */ }
    },

    setSeason(id) {
      this.season = id;
      const s = SEASONS.find(s => s.id === id);
      this.month = s.months[0];
    },

    resetToToday() {
      this.season = this.actualSeason;
      this.month = this.actualMonth;
    },

    detectRegionByGeo() {
      if (!navigator.geolocation) {
        this.geoMessage = 'Геолокация не поддерживается браузером.';
        return;
      }
      this.geoMessage = 'Определяю местоположение...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const id = classifyRegionByCoords(pos.coords.latitude, pos.coords.longitude);
          this.regionId = id;
          const r = this.regions.find(r => r.id === id);
          this.geoMessage = `Регион определён приблизительно: ${r ? r.name : id}. Уточните вручную при необходимости.`;
        },
        () => { this.geoMessage = 'Не удалось получить местоположение — выберите регион вручную.'; },
        { timeout: 8000 }
      );
    },

    toggleWorktype(id) {
      const i = this.selectedWorktypes.indexOf(id);
      if (i === -1) this.selectedWorktypes.push(id);
      else this.selectedWorktypes.splice(i, 1);
    },

    get allWorktypesSelected() {
      return this.selectedWorktypes.length === this.worktypes.length;
    },

    toggleAllWorktypes() {
      this.selectedWorktypes = this.allWorktypesSelected ? [] : this.worktypes.map(w => w.id);
    },

    resetFilters() {
      this.selectedWorktypes = this.worktypes.map(w => w.id);
      this.growFilter = 'all';
      this.categoryFilter = 'all';
      this.plantQuery = '';
    },

    // Возвращает 'listva' | 'hvoya' | 'both' только для category==='dekor';
    // для остальных категорий вызывать не нужно (не имеет смысла).
    dekorGroup(entry) { return dekorGroup(entry, this.hvoynyeIds); },

    // Ярлык категории для карточки растения в боковой панели: классификация
    // "Декоративных" на лиственные/хвойные по тому, хвойное ли это растение.
    plantCategoryLabel(plant, long) {
      if (plant.category !== 'dekor') return categoryLabel(plant.category, long);
      const cat = this.hvoynyeIds.includes(plant.id) ? 'dekor-hvoya' : 'dekor-listva';
      return categoryLabel(cat, long);
    },

    // Ссылка на страницу справочника культуры, если она есть; иначе null
    // (тогда стикер остаётся кнопкой, открывающей панель).
    plantPageHref(id) { return PLANT_PAGES.includes(id) ? `plants/${id}.html` : null; },

    plantById(id) { return this.plants.find(p => p.id === id); },
    worktypeById(id) { return this.worktypes.find(w => w.id === id); },

    get currentRegion() { return this.regions.find(r => r.id === this.regionId); },

    get activeFilterCount() {
      let n = 0;
      if (this.selectedWorktypes.length !== this.worktypes.length) n++;
      if (this.growFilter !== 'all') n++;
      if (this.categoryFilter !== 'all') n++;
      if (this.plantQuery.trim()) n++;
      return n;
    },

    get seasons() { return SEASONS; },
    get monthsOfSeason() {
      const s = SEASONS.find(s => s.id === this.season);
      return s.months.map(id => ({ id, short: MONTH_SHORT[id], name: MONTH_NAMES[id] }));
    },
    get currentMonthName() { return MONTH_NAMES[this.month]; },
    get gooseStory() { return (GOOSE[this.month] || GOOSE.iyun).text; },
    get gooseNote() { return (GOOSE[this.month] || GOOSE.iyun).note; },
    get isToday() { return this.season === this.actualSeason && this.month === this.actualMonth; },
    get todayLabel() { return `${this.actualDay} ${MONTH_GENITIVE[this.actualMonth]}`; },
    // Декада, в которую попадает сегодняшнее число (0/1/2) - используется,
    // только когда isToday, чтобы подсветить актуальный блок среди decada-groups.
    get actualDekada() { return this.actualDay <= 10 ? 0 : this.actualDay <= 20 ? 1 : 2; },
    get isDefaultFilters() {
      return this.allWorktypesSelected && this.categoryFilter === 'all' && this.growFilter === 'all' && !this.plantQuery.trim();
    },

    get seasonProgress() {
      const s = SEASONS.find(s => s.id === this.season);
      const idx = s.months.indexOf(this.month);
      // «мы тут» - указатель позиции, а не полоса выполнения: для просто
      // просматриваемого месяца ставим маркер в СЕРЕДИНУ его трети сезона,
      // поэтому средний месяц оказывается ровно по центру (idx+0.5)/3.
      // Для сегодняшней даты - реальный прогресс по дню месяца.
      let fraction = 0.5;
      if (this.month === this.actualMonth && this.isToday) {
        const now = new Date();
        fraction = (now.getDate() - 1) / daysInMonth(now.getFullYear(), now.getMonth());
      }
      return ((idx + fraction) / 3) * 100;
    },

    get filteredEntries() {
      const q = this.plantQuery.trim().toLowerCase();
      return this.calendar.filter(e => {
        if (e.region !== this.regionId) return false;
        if (e.month !== this.month) return false;
        if (!this.selectedWorktypes.includes(e.workType)) return false;
        if (this.growFilter !== 'all' && !e.growMethod.includes(this.growFilter)) return false;
        if (this.categoryFilter === 'dekor-listva') {
          if (e.category !== 'dekor') return false;
          const g = this.dekorGroup(e);
          if (g !== 'listva' && g !== 'both') return false;
        } else if (this.categoryFilter === 'dekor-hvoya') {
          if (e.category !== 'dekor') return false;
          const g = this.dekorGroup(e);
          if (g !== 'hvoya' && g !== 'both') return false;
        } else if (this.categoryFilter !== 'all' && e.category !== this.categoryFilter) {
          return false;
        }
        if (q) {
          const names = e.plants.map(pid => this.plantById(pid)?.name.toLowerCase() || '');
          if (!names.some(n => n.includes(q))) return false;
        }
        return true;
      });
    },

    get groupedEntries() {
      return buildGroupedEntries(this.filteredEntries, this.hvoynyeIds, (id) => this.worktypeById(id), (id) => this.plantById(id));
    },

    entriesForPlant(plantId) {
      return this.calendar
        .filter(e => e.region === this.regionId && e.plants.includes(plantId))
        .sort((a, b) => MONTH_IDS.indexOf(a.month) - MONTH_IDS.indexOf(b.month));
    },

    openPlant(id) { this.activePlant = this.plantById(id); },
  };
}
