
(() => {
  "use strict";

  /* =====================================================
     ITT-TV — COMPLETE APP.JS
     News | Sports | TV | Radio | Movies | 12 Languages
     ===================================================== */

  if (window.ITTTV_INITIALIZED) return;
  window.ITTTV_INITIALIZED = true;

  const $ = id => document.getElementById(id);

  const state = {
    news: [],
    newsShown: 9,
    category: "all",
    tv: [],
    radios: [],
    hls: null,
    hlsScriptPromise: null,
    activeTV: null,
    activeRadio: null,
    newsLoading: false,
    lastNewsLoad: 0
  };

  /* ===================== NEWS FEEDS ===================== */

  const NEWS_FEEDS = [
    {
      category: "Rwanda",
      url: "https://news.google.com/rss/search?q=Rwanda&hl=en-RW&gl=RW&ceid=RW:en"
    },
    {
      category: "Africa",
      url: "https://news.google.com/rss/headlines/section/topic/WORLD_AFRICA?hl=en&gl=US&ceid=US:en"
    },
    {
      category: "World",
      url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en&gl=US&ceid=US:en"
    },
    {
      category: "Business",
      url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en&gl=US&ceid=US:en"
    },
    {
      category: "Technology",
      url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en&gl=US&ceid=US:en"
    },
    {
      category: "Sports",
      url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en&gl=US&ceid=US:en"
    }
  ];

  /* ===================== TV CHANNELS ===================== */

  /*
    stream: direct video stream URL, only when verified.
    page: official broadcaster page.
    Do not put an ordinary website URL in stream.
  */

  const TV_CHANNELS = [
    {
      name: "Rwanda TV (RTV)",
      country: "Rwanda",
      page: "https://www.rba.co.rw/tv",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "ISIBO TV",
      country: "Rwanda",
      page: "https://isibomedia.com/listen/tv",
      home: "https://isibomedia.com/"
    },
    {
      name: "BTN TV",
      country: "Rwanda",
      page: "https://v2.btnrwanda.com/page/live/",
      home: "https://www.btnrwanda.com/"
    },
    {
      name: "TV10 Rwanda",
      country: "Rwanda",
      page: "https://radiotv10.rw/",
      home: "https://radiotv10.rw/"
    },
    {
      name: "ZACU TV",
      country: "Rwanda",
      page: "https://www.zacutv.com/",
      home: "https://www.zacutv.com/"
    },
    {
      name: "TV1 Rwanda",
      country: "Rwanda",
      page: "https://tv1.rw/",
      home: "https://tv1.rw/"
    },
    {
      name: "Flash TV",
      country: "Rwanda",
      page: "https://flash.rw/home/",
      home: "https://flash.rw/"
    },
    {
      name: "Al Jazeera English",
      country: "International",
      page: "https://www.aljazeera.com/live/",
      home: "https://www.aljazeera.com/"
    },
    {
      name: "BBC News",
      country: "United Kingdom",
      page: "https://www.bbc.com/news",
      home: "https://www.bbc.com/"
    },
    {
      name: "France 24",
      country: "France",
      page: "https://www.france24.com/en/live",
      home: "https://www.france24.com/"
    },
    {
      name: "DW News",
      country: "Germany",
      page: "https://www.dw.com/en/live-tv/s-100825",
      home: "https://www.dw.com/"
    },
    {
      name: "NHK World",
      country: "Japan",
      page: "https://www3.nhk.or.jp/nhkworld/en/live/",
      home: "https://www3.nhk.or.jp/nhkworld/"
    },
    {
      name: "Africanews",
      country: "International",
      page: "https://www.africanews.com/live/",
      home: "https://www.africanews.com/"
    }
  ];

  /* ===================== RADIO STATIONS ===================== */

  /*
    stream: direct audio stream URL, only when verified.
    page: official broadcaster page.
  */

  const RADIO_STATIONS = [
    {
      name: "Radio Rwanda",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "Magic FM",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio/2/Magic-Fm",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "Radio Rubavu",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "Radio Nyagatare",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "Radio Inteko",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "Radio Huye",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "Radio Musanze",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "Radio Rusizi",
      country: "Rwanda",
      page: "https://www.rba.co.rw/radio",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "ISIBO Radio",
      country: "Rwanda",
      page: "https://isibomedia.com/listen/radio",
      home: "https://isibomedia.com/"
    },
    {
      name: "Radio 10",
      country: "Rwanda",
      page: "https://radiotv10.rw/radio/",
      home: "https://radiotv10.rw/"
    },
    {
      name: "KISS FM",
      country: "Rwanda",
      page: "https://kissfm.rw/",
      home: "https://kissfm.rw/"
    },
    {
      name: "Flash FM",
      country: "Rwanda",
      page: "https://flash.rw/home/",
      home: "https://flash.rw/"
    },
    {
      name: "BBC World Service",
      country: "United Kingdom",
      page: "https://www.bbc.com/sounds/play/live:bbc_world_service",
      home: "https://www.bbc.com/sounds"
    },
    {
      name: "RFI",
      country: "France",
      page: "https://www.rfi.fr/en/",
      home: "https://www.rfi.fr/"
    },
    {
      name: "VOA",
      country: "United States",
      page: "https://www.voaafrica.com/live/audio",
      home: "https://www.voaafrica.com/"
    },
    {
      name: "Radio France Internationale",
      country: "France",
      page: "https://www.rfi.fr/",
      home: "https://www.rfi.fr/"
    }
  ];

  /* ===================== MOVIES ===================== */

  const MOVIES = [
    {
      title: "Big Buck Bunny",
      year: "2008",
      description: "Open animated film from the Blender project.",
      url: "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
      poster: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg"
    },
    {
      title: "Sintel",
      year: "2010",
      description: "Open short film created by the Blender Institute.",
      url: "https://download.blender.org/durian/movies/sintel-1024-surround.mp4",
      poster: "https://durian.blender.org/wp-content/uploads/2010/06/sintel_poster.jpg"
    },
    {
      title: "Tears of Steel",
      year: "2012",
      description: "Open movie produced by the Blender Foundation.",
      url: "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov",
      poster: "https://mango.blender.org/wp-content/uploads/2013/05/tears_of_steel.jpg"
    }
  ];

  /* ===================== LANGUAGES ===================== */

  const translations = {
    rw: {
      news: "Amakuru", sports: "Siporo", tv: "Televiziyo",
      radio: "Radiyo", movies: "Filime", about: "Ibyerekeye",
      search: "Shaka", refresh: "Ongera ushyashye"
    },
    en: {
      news: "News", sports: "Sports", tv: "Television",
      radio: "Radio", movies: "Movies", about: "About",
      search: "Search", refresh: "Refresh"
    },
    fr: {
      news: "Actualités", sports: "Sports", tv: "Télévision",
      radio: "Radio", movies: "Films", about: "À propos",
      search: "Rechercher", refresh: "Actualiser"
    },
    sw: {
      news: "Habari", sports: "Michezo", tv: "Televisheni",
      radio: "Redio", movies: "Filamu", about: "Kuhusu",
      search: "Tafuta", refresh: "Onyesha upya"
    },
    ar: {
      news: "الأخبار", sports: "الرياضة", tv: "التلفزيون",
      radio: "الراديو", movies: "الأفلام", about: "حول",
      search: "بحث", refresh: "تحديث"
    },
    es: {
      news: "Noticias", sports: "Deportes", tv: "Televisión",
      radio: "Radio", movies: "Películas", about: "Acerca de",
      search: "Buscar", refresh: "Actualizar"
    },
    pt: {
      news: "Notícias", sports: "Desporto", tv: "Televisão",
      radio: "Rádio", movies: "Filmes", about: "Sobre",
      search: "Pesquisar", refresh: "Atualizar"
    },
    de: {
      news: "Nachrichten", sports: "Sport", tv: "Fernsehen",
      radio: "Radio", movies: "Filme", about: "Über uns",
      search: "Suchen", refresh: "Aktualisieren"
    },
    zh: {
      news: "新闻", sports: "体育", tv: "电视",
      radio: "广播", movies: "电影", about: "关于",
      search: "搜索", refresh: "刷新"
    },
    hi: {
      news: "समाचार", sports: "खेल", tv: "टेलीविजन",
      radio: "रेडियो", movies: "फिल्में", about: "परिचय",
      search: "खोजें", refresh: "रिफ्रेश"
    },
    ja: {
      news: "ニュース", sports: "スポーツ", tv: "テレビ",
      radio: "ラジオ", movies: "映画", about: "概要",
      search: "検索", refresh: "更新"
    },
    ru: {
      news: "Новости", sports: "Спорт", tv: "Телевидение",
      radio: "Радио", movies: "Фильмы", about: "О проекте",
      search: "Поиск", refresh: "Обновить"
    }
  };

  /* ===================== HELPERS ===================== */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function safeURL(value) {
    try {
      const url = new URL(value, window.location.href);
      return ["http:", "https:"].includes(url.protocol)
        ? url.href
        : "";
    } catch {
      return "";
    }
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function showStatus(id, message) {
    setText(id, message);
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  function stripHTML(value) {
    const element = document.createElement("div");
    element.innerHTML = String(value || "");

    return (element.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString();
  }

  async function fetchWithTimeout(url, timeout = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        cache: "no-cache",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchJSON(url) {
    const response = await fetchWithTimeout(url);
    return response.json();
  }

  function createExternalLink(url, label) {
    const link = document.createElement("a");

    link.href = safeURL(url) || "#";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "btn btn-primary";
    link.textContent = label;

    return link;
  }

  /* ===================== LANGUAGE ===================== */

  function setLanguage(language) {
    const words = translations[language] || translations.rw;

    document.documentElement.lang = language;

    $("mainNav")?.querySelectorAll("a").forEach(link => {
      const section = link.getAttribute("href")?.replace("#", "");

      if (words[section]) {
        link.textContent = words[section];
      }
    });

    document.querySelectorAll("[data-i18n]").forEach(element => {
      const key = element.dataset.i18n;

      if (words[key]) {
        element.textContent = words[key];
      }
    });
  }

  /* ===================== HEADER ===================== */

  function initHeader() {
    setText("year", new Date().getFullYear());

    $("closeAnnouncement")?.addEventListener("click", () => {
      $("announcement")?.classList.add("hidden");
    });

    $("menuToggle")?.addEventListener("click", () => {
      $("mainNav")?.classList.toggle("open");
    });

    $("mainNav")?.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        $("mainNav")?.classList.remove("open");
      });
    });

    $("language")?.addEventListener("change", event => {
      setLanguage(event.target.value);
    });

    setLanguage($("language")?.value || "rw");
  }

  /* ===================== NEWS ===================== */

  async function loadOneFeed(feed) {
    const proxy =
      "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent(feed.url);

    const data = await fetchJSON(proxy);

    if (data.status !== "ok" || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map(item => ({
      title: item.title || "News story",
      link: safeURL(item.link),
      description: item.description || item.content || "",
      image: safeURL(item.thumbnail || item.enclosure?.link || ""),
      date: item.pubDate || "",
      category: feed.category,
      source: item.author || "News publisher"
    })).filter(item => item.link);
  }

  async function loadNews() {
    if (state.newsLoading) return;

    state.newsLoading = true;

    showStatus("newsStatus", "Turimo gushaka amakuru mashya...");

    try {
      const results = await Promise.allSettled(
        NEWS_FEEDS.map(loadOneFeed)
      );

      const combined = results.flatMap(result =>
        result.status === "fulfilled" ? result.value : []
      );

      const seen = new Set();

      state.news = combined
        .filter(item => {
          if (seen.has(item.link)) return false;

          seen.add(item.link);
          return true;
        })
        .sort((a, b) =>
          new Date(b.date || 0) - new Date(a.date || 0)
        );

      state.newsShown = 9;
      state.lastNewsLoad = Date.now();

      renderNews();
      renderTicker();
      renderSports();

      showStatus(
        "newsStatus",
        state.news.length
          ? `${state.news.length} headlines loaded.`
          : "Amakuru ntaraboneka. Ongera ugerageze nyuma."
      );
    } catch (error) {
      console.error("News loading error:", error);
      showStatus("newsStatus", "Ntibyashobotse kubona amakuru.");
    } finally {
      state.newsLoading = false;
    }
  }

  function renderNews() {
    const grid = $("newsGrid");
    if (!grid) return;

    const query = ($("newsSearch")?.value || "")
      .toLowerCase()
      .trim();

    const items = state.news.filter(item => {
      const categoryMatch =
        state.category === "all" ||
        item.category === state.category;

      const searchMatch =
        !query ||
        `${item.title} ${item.description} ${item.source}`
          .toLowerCase()
          .includes(query);

      return categoryMatch && searchMatch;
    });

    grid.replaceChildren();

    items.slice(0, state.newsShown).forEach(item => {
      const card = document.createElement("article");
      card.className = "news-card";

      card.innerHTML = `
        ${item.image ? `
          <a class="news-image"
             href="${escapeHTML(item.link)}"
             target="_blank"
             rel="noopener noreferrer">
            <img src="${escapeHTML(item.image)}"
                 alt=""
                 loading="lazy">
          </a>` : ""}

        <div class="news-card-body">
          <span class="eyebrow">
            ${escapeHTML(item.category)}
            · ${escapeHTML(formatDate(item.date))}
          </span>

          <h3>
            <a href="${escapeHTML(item.link)}"
               target="_blank"
               rel="noopener noreferrer">
              ${escapeHTML(item.title)}
            </a>
          </h3>

          <p>
            ${escapeHTML(stripHTML(item.description).slice(0, 180))}
          </p>

          <a class="text-link"
             href="${escapeHTML(item.link)}"
             target="_blank"
             rel="noopener noreferrer">
            Soma inkuru yose ↗
          </a>
        </div>
      `;

      grid.appendChild(card);
    });

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nta makuru ahuye n'ibyo washakishije.";

      grid.appendChild(empty);
    }

    $("loadMoreNews")?.classList.toggle(
      "hidden",
      items.length <= state.newsShown
    );
  }

  function renderTicker() {
    const track = $("tickerTrack");
    if (!track) return;

    track.replaceChildren();

    const headlines = state.news.slice(0, 15);

    if (!headlines.length) {
      const span = document.createElement("span");
      span.textContent = "Welcome to ITT-TV — World Media";
      track.appendChild(span);
      return;
    }

    [...headlines, ...headlines].forEach(item => {
      const span = document.createElement("span");
      span.textContent = item.title;
      track.appendChild(span);
    });
  }

  function initNews() {
    $("refreshNews")?.addEventListener("click", loadNews);

    $("loadMoreNews")?.addEventListener("click", () => {
      state.newsShown += 9;
      renderNews();
    });

    $("newsSearch")?.addEventListener("input", renderNews);

    $("newsFilters")?.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;

      state.category = button.dataset.category || "all";

      $("newsFilters")
        .querySelectorAll(".filter-pill")
        .forEach(item => {
          item.classList.toggle("selected", item === button);
        });

      renderNews();
    });
  }

  /* ===================== SPORTS ===================== */

  function renderSports() {
    const list = $("sportsList");
    if (!list) return;

    list.replaceChildren();

    const sports = state.news
      .filter(item => item.category === "Sports")
      .slice(0, 10);

    if (!sports.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent =
        "Amakuru ya siporo ntaraboneka. Ongera ugerageze.";

      list.appendChild(empty);

      showStatus(
        "sportsStatus",
        "Sports headlines are not available yet."
      );

      return;
    }

    showStatus(
      "sportsStatus",
      `${sports.length} sports headlines loaded.`
    );

    sports.forEach(item => {
      const card = document.createElement("article");
      card.className = "sports-item";

      card.innerHTML = `
        <span class="eyebrow">
          ${escapeHTML(formatDate(item.date))}
        </span>

        <h3>
          <a href="${escapeHTML(item.link)}"
             target="_blank"
             rel="noopener noreferrer">
            ${escapeHTML(item.title)}
          </a>
        </h3>

        <a class="text-link"
           href="${escapeHTML(item.link)}"
           target="_blank"
           rel="noopener noreferrer">
          Read story ↗
        </a>
      `;

      list.appendChild(card);
    });
  }

  /* ===================== COUNTRY FILTERS ===================== */

  function populateCountries(selectId, items) {
    const select = $(selectId);
    if (!select) return;

    const previous = select.value || "all";

    const countries = [
      ...new Set(items.map(item => item.country).filter(Boolean))
    ].sort();

    select.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Ibihugu byose / All countries";

    select.appendChild(allOption);

    countries.forEach(country => {
      const option = document.createElement("option");

      option.value = country;
      option.textContent = country;

      select.appendChild(option);
    });

    select.value = countries.includes(previous) ? previous : "all";
  }

  /* ===================== TV PLAYER ===================== */

  function loadTV() {
    state.tv = TV_CHANNELS.map((channel, index) => ({
      ...channel,
      id: `tv-${index}`
    }));

    populateCountries("tvCountry", state.tv);
    renderTV();

    setText("tvCount", `${state.tv.length} channels`);

    showStatus(
      "tvMessage",
      "Hitamo TV ushaka kureba."
    );
  }

  function renderTV() {
    const list = $("tvList");
    if (!list) return;

    const query = ($("tvSearch")?.value || "")
      .toLowerCase()
      .trim();

    const country = $("tvCountry")?.value || "all";

    const channels = state.tv.filter(channel => {
      const countryMatch =
        country === "all" || channel.country === country;

      const searchMatch =
        !query ||
        `${channel.name} ${channel.country}`
          .toLowerCase()
          .includes(query);

      return countryMatch && searchMatch;
    });

    list.replaceChildren();

    if (!channels.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nta muyoboro wabonetse.";

      list.appendChild(empty);
      return;
    }

    channels.forEach(channel => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "channel-item";

      button.innerHTML = `
        <span class="channel-logo">▶</span>

        <span class="channel-info">
          <strong>${escapeHTML(channel.name)}</strong>
          <small>${escapeHTML(channel.country)}</small>
        </span>

        <span class="channel-live">WATCH</span>
      `;

      button.addEventListener("click", () => {
        playTV(channel, button);
      });

      list.appendChild(button);
    });
  }

  function stopTV() {
    if (state.hls) {
      state.hls.destroy();
      state.hls = null;
    }

    const video = $("tvVideo");

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.classList.add("hidden");
    }

    const frame = $("tvEmbed");

    if (frame) {
      frame.onload = null;
      frame.src = "about:blank";
      frame.classList.add("hidden");
    }

    $("tvPlaceholder")?.classList.remove("hidden");
  }

  function loadHlsLibrary() {
    if (window.Hls) return Promise.resolve(window.Hls);

    if (state.hlsScriptPromise) {
      return state.hlsScriptPromise;
    }

    state.hlsScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js";

      script.async = true;

      script.onload = () => {
        if (window.Hls) resolve(window.Hls);
        else reject(new Error("HLS library unavailable"));
      };

      script.onerror = () => {
        reject(new Error("Could not load HLS library"));
      };

      document.head.appendChild(script);
    });

    return state.hlsScriptPromise;
  }

  async function playTV(channel, selectedButton) {
    stopTV();

    state.activeTV = channel;

    setText("tvNowPlaying", channel.name);

    $("tvList")
      ?.querySelectorAll(".channel-item")
      .forEach(button => {
        button.classList.toggle("active", button === selectedButton);
      });

    const external = $("tvExternal");

    if (external) {
      external.href = safeURL(channel.page || channel.home) || "#";
      external.target = "_blank";
      external.rel = "noopener noreferrer";
      external.classList.remove("hidden");
    }

    const video = $("tvVideo");
    const frame = $("tvEmbed");

    $("tvPlaceholder")?.classList.add("hidden");

    /* Direct stream is preferred when one is supplied. */

    if (channel.stream && video) {
      video.classList.remove("hidden");
      video.controls = true;
      video.playsInline = true;
      video.preload = "none";

      const stream = safeURL(channel.stream);

      if (!stream) {
        showStatus("tvMessage", "TV stream URL ntabwo yemewe.");
        return;
      }

      if (stream.includes(".m3u8")) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = stream;
        } else {
          try {
            const Hls = await loadHlsLibrary();

            if (!state.activeTV || state.activeTV.id !== channel.id) {
              return;
            }

            if (Hls.isSupported()) {
              state.hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferLength: 15,
                maxMaxBufferLength: 30
              });

              state.hls.loadSource(stream);
              state.hls.attachMedia(video);

              state.hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                  showStatus(
                    "tvMessage",
                    "TV stream yagize ikibazo. Gerageza indi channel."
                  );
                  stopTV();
                }
              });
            } else {
              showStatus(
                "tvMessage",
                "Browser yawe ntishyigikira iyi TV stream."
              );
              return;
            }
          } catch (error) {
            console.error(error);
            showStatus(
              "tvMessage",
              "Ntibyashobotse gutegura TV player."
            );
            return;
          }
        }
      } else {
        video.src = stream;
      }

      video.onerror = () => {
        showStatus(
          "tvMessage",
          "TV stream ntishoboye gukina. Reba niba URL ikiriho."
        );
      };

      video.play().catch(() => {
        showStatus(
          "tvMessage",
          "TV yiteguye. Kanda Play kuri video kugira ngo itangire."
        );
      });

      showStatus("tvMessage", `Turimo gutegura ${channel.name}.`);
      return;
    }

    /* No direct stream: use official broadcaster page. */

    if (frame && channel.page) {
      frame.classList.remove("hidden");
      frame.loading = "lazy";
      frame.title = `${channel.name} official page`;
      frame.setAttribute(
        "allow",
        "autoplay; fullscreen; picture-in-picture"
      );
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.src = safeURL(channel.page) || "about:blank";

      showStatus(
        "tvMessage",
        "Turagerageza gufungura official page. Niba itagaragara, broadcaster ishobora kubuza iframe. Koresha Official broadcaster link."
      );

      return;
    }

    showStatus("tvMessage", "Nta TV player iboneka kuri iyi channel.");
  }

  function initTV() {
    $("refreshTV")?.addEventListener("click", loadTV);
    $("tvSearch")?.addEventListener("input", renderTV);
    $("tvCountry")?.addEventListener("change", renderTV);

    $("tvVideo")?.addEventListener("error", () => {
      showStatus("tvMessage", "TV video ntiyabashije gukina.");
    });
  }

  /* ===================== RADIO PLAYER ===================== */

  function loadRadios() {
    state.radios = RADIO_STATIONS.map((station, index) => ({
      ...station,
      id: `radio-${index}`
    }));

    populateCountries("radioCountry", state.radios);
    renderRadios();

    setText("radioCount", `${state.radios.length} stations`);

    showStatus(
      "radioMessage",
      "Hitamo radiyo ushaka kumva."
    );
  }

  function renderRadios() {
    const list = $("radioList");
    if (!list) return;

    const query = ($("radioSearch")?.value || "")
      .toLowerCase()
      .trim();

    const country = $("radioCountry")?.value || "all";

    const stations = state.radios.filter(station => {
      const countryMatch =
        country === "all" || station.country === country;

      const searchMatch =
        !query ||
        `${station.name} ${station.country}`
          .toLowerCase()
          .includes(query);

      return countryMatch && searchMatch;
    });

    list.replaceChildren();

    if (!stations.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nta radiyo yabonetse.";

      list.appendChild(empty);
      return;
    }

    stations.forEach(station => {
      const card = document.createElement("article");
      card.className = "radio-card";

      card.innerHTML = `
        <span class="eyebrow">${escapeHTML(station.country)}</span>

        <h3>${escapeHTML(station.name)}</h3>

        <p>Radio station</p>

        <button class="btn btn-primary" type="button">
          ▶ Listen
        </button>

        <a class="text-link radio-external hidden"
           target="_blank"
           rel="noopener noreferrer">
          Open station website ↗
        </a>
      `;

      card.querySelector("button").addEventListener("click", () => {
        playRadio(station, card);
      });

      list.appendChild(card);
    });
  }

  function stopRadio() {
    const audio = $("radioPlayer");

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.classList.add("hidden");
    }

    const frameWrap = $("ittRadioFrameWrap");

    if (frameWrap) {
      frameWrap.replaceChildren();
      frameWrap.classList.add("hidden");
    }

    state.activeRadio = null;
  }

  function playRadio(station, selectedCard) {
    stopRadio();

    state.activeRadio = station;

    setText("radioNowPlaying", station.name);
    setText("radioMeta", `${station.country} · ${station.name}`);

    document.querySelectorAll(".radio-card").forEach(card => {
      card.style.borderColor =
        card === selectedCard ? "var(--accent)" : "var(--border)";
    });

    const audio = $("radioPlayer");
    const frameWrap = $("ittRadioFrameWrap");

    /*
      Only direct audio streams are played in the audio player.
      An ordinary webpage is not an audio stream.
    */

    if (station.stream && audio) {
      const stream = safeURL(station.stream);

      if (!stream) {
        showStatus("radioMessage", "Radio stream URL ntabwo yemewe.");
        return;
      }

      audio.preload = "none";
      audio.controls = true;
      audio.src = stream;
      audio.classList.remove("hidden");

      audio.onerror = () => {
        showStatus(
          "radioMessage",
          "Radio stream ntiyabashije gukina. Gerageza indi."
        );
      };

      audio.play().then(() => {
        showStatus("radioMessage", `Urumva ${station.name}.`);
      }).catch(() => {
        showStatus(
          "radioMessage",
          "Kanda Play kuri radio player kugira ngo utangire kumva."
        );
      });

      return;
    }

    if (frameWrap) {
      frameWrap.replaceChildren();

      const link = createExternalLink(
        station.page || station.home,
        `Fungura ${station.name}`
      );

      frameWrap.appendChild(link);
      frameWrap.classList.remove("hidden");
    }

    const external = selectedCard?.querySelector(".radio-external");

    if (external) {
      external.href = safeURL(station.page || station.home) || "#";
      external.classList.remove("hidden");
    }

    showStatus(
      "radioMessage",
      `${station.name} nta direct audio stream yemejwe ifite muri ITT-TV. Kanda kuri link kugira ngo uyumve kuri broadcaster.`
    );
  }

  function initRadio() {
    $("refreshRadios")?.addEventListener("click", loadRadios);
    $("radioSearch")?.addEventListener("input", renderRadios);
    $("radioCountry")?.addEventListener("change", renderRadios);

    $("radioPlayer")?.addEventListener("error", () => {
      showStatus("radioMessage", "Radio player yagize ikibazo.");
    });
  }

  /* ===================== MOVIES ===================== */

  function loadMovies() {
    const grid = $("movieGrid");
    if (!grid) return;

    grid.replaceChildren();

    MOVIES.forEach((movie, index) => {
      const card = document.createElement("article");
      card.className = "movie-card";

      card.innerHTML = `
        <div class="movie-poster">
          <img src="${escapeHTML(movie.poster)}"
               alt="${escapeHTML(movie.title)}"
               loading="lazy">
        </div>

        <div class="movie-card-body">
          <span class="eyebrow">
            OPEN MOVIE · ${escapeHTML(movie.year)}
          </span>

          <h3>${escapeHTML(movie.title)}</h3>

          <p>${escapeHTML(movie.description)}</p>

          <button class="btn btn-outline" type="button">
            ▶ Watch film
          </button>
        </div>
      `;

      card.querySelector("button").addEventListener("click", () => {
        playMovie(index);
      });

      grid.appendChild(card);
    });
  }

  function playMovie(index) {
    const movie = MOVIES[index];
    const player = $("moviePlayer");

    if (!movie || !player) return;

    player.pause();
    player.src = movie.url;
    player.controls = true;
    player.preload = "metadata";
    player.load();

    player.classList.remove("hidden");

    $("moviePlaceholder")?.classList.add("hidden");

    setText("movieNowPlaying", movie.title);

    showStatus(
      "movieMessage",
      "Filime irimo kwitegura. Kanda Play niba idahise itangira."
    );

    player.play().catch(() => {
      showStatus(
        "movieMessage",
        "Kanda Play kuri video kugira ngo utangire kureba."
      );
    });
  }

  function initMoviePlayer() {
    $("moviePlayer")?.addEventListener("error", () => {
      showStatus(
        "movieMessage",
        "Iyi filime ntiyabashije gufunguka. Gerageza indi."
      );
    });
  }

  /* ===================== ONLINE EVENTS ===================== */

  function initOnlineEvents() {
    window.addEventListener("online", () => {
      showToast("Internet connection restored.");

      if (Date.now() - state.lastNewsLoad > 60000) {
        loadNews();
      }
    });

    window.addEventListener("offline", () => {
      showToast("Internet connection lost.");
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        const video = $("tvVideo");
        const audio = $("radioPlayer");

        video?.pause();
        audio?.pause();
      }
    });
  }

  /* ===================== CLEANUP ===================== */

  function initCleanup() {
    window.addEventListener("pagehide", () => {
      stopTV();
      stopRadio();

      const movie = $("moviePlayer");
      movie?.pause();
    });
  }

  /* ===================== START APPLICATION ===================== */

  function init() {
    initHeader();

    initNews();
    initTV();
    initRadio();
    initMoviePlayer();

    loadTV();
    loadRadios();
    loadMovies();

    initOnlineEvents();
    initCleanup();

    loadNews();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {
      once: true
    });
  } else {
    init();
  }

})();
