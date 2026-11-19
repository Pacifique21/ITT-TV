
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const state = {
    news: [],
    newsShown: 9,
    category: "all",
    tv: [],
    radios: [],
    hls: null,
    currentTV: null
  };

  /* =====================================
     1. LIVE TV CHANNELS
  ===================================== */

  const TV_CHANNELS = [
    {
      name: "NASA TV Public",
      country: "USA",
      type: "hls",
      stream: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
      home: "https://www.nasa.gov/nasatv/"
    },
    {
      name: "NASA TV Media",
      country: "USA",
      type: "hls",
      stream: "https://ntv2.akamaized.net/hls/live/2013923/NASA-NTV2-HLS/master.m3u8",
      home: "https://www.nasa.gov/nasatv/"
    },
    {
      name: "Al Jazeera English",
      country: "Qatar",
      type: "hls",
      stream: "https://live-hls-web-aje.getaj.net/AJE/index.m3u8",
      home: "https://www.aljazeera.com/live/"
    },
    {
      name: "Rwanda TV (RTV)",
      country: "Rwanda",
      type: "page",
      page: "https://www.rba.co.rw/tv",
      home: "https://www.rba.co.rw/"
    },
    {
      name: "ISIBO TV",
      country: "Rwanda",
      type: "page",
      page: "https://isibomedia.com/listen/tv",
      home: "https://isibomedia.com/"
    },
    {
      name: "BTN TV",
      country: "Rwanda",
      type: "page",
      page: "https://v2.btnrwanda.com/page/live/",
      home: "https://www.btnrwanda.com/"
    },
    {
      name: "TV10 Rwanda",
      country: "Rwanda",
      type: "page",
      page: "https://radiotv10.rw/",
      home: "https://radiotv10.rw/"
    },
    {
      name: "ZACU TV",
      country: "Rwanda",
      type: "page",
      page: "https://www.zacutv.com/",
      home: "https://www.zacutv.com/"
    },
    {
      name: "TV1 Rwanda",
      country: "Rwanda",
      type: "page",
      page: "https://tv1.rw/",
      home: "https://tv1.rw/"
    },
    {
      name: "France 24",
      country: "France",
      type: "page",
      page: "https://www.france24.com/en/live",
      home: "https://www.france24.com/"
    },
    {
      name: "BBC News",
      country: "United Kingdom",
      type: "page",
      page: "https://www.bbc.com/news",
      home: "https://www.bbc.com/"
    },
    {
      name: "DW News",
      country: "Germany",
      type: "page",
      page: "https://www.dw.com/en/live-tv/s-100825",
      home: "https://www.dw.com/"
    },
    {
      name: "NHK World",
      country: "Japan",
      type: "page",
      page: "https://www3.nhk.or.jp/nhkworld/en/live/",
      home: "https://www3.nhk.or.jp/nhkworld/"
    }
  ];

  /* =====================================
     2. RADIO STATIONS
  ===================================== */

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
      home: "https://www.bbc.com/sounds/"
    },
    {
      name: "RFI",
      country: "France",
      page: "https://www.rfi.fr/en/",
      home: "https://www.rfi.fr/"
    },
    {
      name: "VOA Africa",
      country: "USA",
      page: "https://www.voaafrica.com/live/audio",
      home: "https://www.voaafrica.com/"
    }
  ];

  /* =====================================
     3. NEWS FEEDS
  ===================================== */

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

  /* =====================================
     4. MOVIES
  ===================================== */

  const MOVIES = [
    {
      title: "Big Buck Bunny",
      year: "2008",
      description: "Open animated film.",
      url: "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4",
      poster: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg"
    },
    {
      title: "Sintel",
      year: "2010",
      description: "Open animated short film.",
      url: "https://download.blender.org/durian/movies/sintel-1024-surround.mp4",
      poster: "https://durian.blender.org/wp-content/uploads/2010/06/sintel_poster.jpg"
    },
    {
      title: "Tears of Steel",
      year: "2012",
      description: "Open movie from Blender Foundation.",
      url: "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov",
      poster: "https://mango.blender.org/wp-content/uploads/2013/05/tears_of_steel.jpg"
    }
  ];

  /* =====================================
     5. HELPERS
  ===================================== */

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function status(id, message) {
    setText(id, message);
  }

  function safeURL(value) {
    try {
      const url = new URL(value, location.href);
      return ["https:", "http:"].includes(url.protocol)
        ? url.href
        : "";
    } catch {
      return "";
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function stripHTML(value) {
    const el = document.createElement("div");
    el.innerHTML = String(value || "");
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString();
  }

  async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network error");
    return response.json();
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  /* =====================================
     6. LANGUAGE
  ===================================== */

  const translations = {
    rw: {
      news: "Amakuru",
      sports: "Siporo",
      tv: "Televiziyo",
      radio: "Radiyo",
      movies: "Filime",
      about: "Ibyerekeye"
    },
    en: {
      news: "News",
      sports: "Sports",
      tv: "Television",
      radio: "Radio",
      movies: "Movies",
      about: "About"
    },
    fr: {
      news: "Actualités",
      sports: "Sports",
      tv: "Télévision",
      radio: "Radio",
      movies: "Films",
      about: "À propos"
    },
    sw: {
      news: "Habari",
      sports: "Michezo",
      tv: "Televisheni",
      radio: "Redio",
      movies: "Filamu",
      about: "Kuhusu"
    },
    ar: {
      news: "الأخبار",
      sports: "الرياضة",
      tv: "التلفزيون",
      radio: "الراديو",
      movies: "الأفلام",
      about: "حول"
    },
    es: {
      news: "Noticias",
      sports: "Deportes",
      tv: "Televisión",
      radio: "Radio",
      movies: "Películas",
      about: "Acerca de"
    },
    pt: {
      news: "Notícias",
      sports: "Desporto",
      tv: "Televisão",
      radio: "Rádio",
      movies: "Filmes",
      about: "Sobre"
    },
    de: {
      news: "Nachrichten",
      sports: "Sport",
      tv: "Fernsehen",
      radio: "Radio",
      movies: "Filme",
      about: "Über uns"
    },
    zh: {
      news: "新闻",
      sports: "体育",
      tv: "电视",
      radio: "广播",
      movies: "电影",
      about: "关于"
    },
    hi: {
      news: "समाचार",
      sports: "खेल",
      tv: "टेलीविजन",
      radio: "रेडियो",
      movies: "फिल्में",
      about: "परिचय"
    },
    ja: {
      news: "ニュース",
      sports: "スポーツ",
      tv: "テレビ",
      radio: "ラジオ",
      movies: "映画",
      about: "概要"
    },
    ru: {
      news: "Новости",
      sports: "Спорт",
      tv: "Телевидение",
      radio: "Радио",
      movies: "Фильмы",
      about: "О проекте"
    }
  };

  function setLanguage(language) {
    const words = translations[language] || translations.rw;

    document.documentElement.lang = language;

    document.querySelectorAll("#mainNav a").forEach(link => {
      const key = link.getAttribute("href")?.replace("#", "");
      if (words[key]) link.textContent = words[key];
    });

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (words[key]) el.textContent = words[key];
    });
  }

  /* =====================================
     7. HEADER
  ===================================== */

  function initHeader() {
    setText("year", new Date().getFullYear());

    $("menuToggle")?.addEventListener("click", () => {
      $("mainNav")?.classList.toggle("open");
    });

    $("mainNav")?.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        $("mainNav")?.classList.remove("open");
      });
    });

    $("closeAnnouncement")?.addEventListener("click", () => {
      $("announcement")?.classList.add("hidden");
    });

    $("language")?.addEventListener("change", event => {
      setLanguage(event.target.value);
    });

    setLanguage($("language")?.value || "rw");
  }

  /* =====================================
     8. NEWS
  ===================================== */

  async function loadOneFeed(feed) {
    const proxy =
      "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent(feed.url);

    const data = await fetchJSON(proxy);

    if (data.status !== "ok" || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map(item => ({
      title: item.title || "News",
      link: safeURL(item.link),
      description: item.description || item.content || "",
      image: safeURL(item.thumbnail || item.enclosure?.link || ""),
      date: item.pubDate || "",
      category: feed.category,
      source: item.author || "News publisher"
    })).filter(item => item.link);
  }

  async function loadNews() {
    status("newsStatus", "Turimo gushaka amakuru mashya...");

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
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    state.newsShown = 9;

    renderNews();
    renderTicker();
    renderSports();

    status(
      "newsStatus",
      state.news.length
        ? `${state.news.length} headlines loaded.`
        : "Amakuru ntaraboneka. Ongera ugerageze."
    );
  }

  function renderNews() {
    const grid = $("newsGrid");
    if (!grid) return;

    const query = ($("newsSearch")?.value || "").toLowerCase();

    const items = state.news.filter(item => {
      const categoryMatch =
        state.category === "all" ||
        item.category === state.category;

      const searchMatch =
        !query ||
        `${item.title} ${item.description} ${item.source}`
          .toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });

    grid.replaceChildren();

    items.slice(0, state.newsShown).forEach(item => {
      const card = document.createElement("article");
      card.className = "news-card";

      card.innerHTML = `
        ${item.image ? `
          <a class="news-image" href="${escapeHTML(item.link)}"
             target="_blank" rel="noopener noreferrer">
            <img src="${escapeHTML(item.image)}" alt="" loading="lazy">
          </a>` : ""}
        <div class="news-card-body">
          <span class="eyebrow">
            ${escapeHTML(item.category)} · ${escapeHTML(formatDate(item.date))}
          </span>
          <h3>
            <a href="${escapeHTML(item.link)}" target="_blank"
               rel="noopener noreferrer">${escapeHTML(item.title)}</a>
          </h3>
          <p>${escapeHTML(stripHTML(item.description).slice(0, 180))}</p>
          <a class="text-link" href="${escapeHTML(item.link)}"
             target="_blank" rel="noopener noreferrer">Soma inkuru yose ↗</a>
        </div>
      `;

      grid.appendChild(card);
    });

    if (!items.length) {
      grid.innerHTML = '<div class="empty-state">Nta makuru ahari.</div>';
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

    const items = state.news.slice(0, 15);

    if (!items.length) {
      track.textContent = "Welcome to ITT-TV World Media";
      return;
    }

    [...items, ...items].forEach(item => {
      const span = document.createElement("span");
      span.textContent = item.title;
      track.appendChild(span);
    });
  }

  function initNews() {
    $("refreshNews")?.addEventListener("click", loadNews);

    $("newsSearch")?.addEventListener("input", renderNews);

    $("loadMoreNews")?.addEventListener("click", () => {
      state.newsShown += 9;
      renderNews();
    });

    $("newsFilters")?.addEventListener("click", event => {
      const button = event.target.closest("[data-category]");
      if (!button) return;

      state.category = button.dataset.category || "all";

      $("newsFilters").querySelectorAll(".filter-pill").forEach(item => {
        item.classList.toggle("selected", item === button);
      });

      renderNews();
    });
  }

  /* =====================================
     9. SPORTS
  ===================================== */

  function renderSports() {
    const list = $("sportsList");
    if (!list) return;

    list.replaceChildren();

    const items = state.news
      .filter(item => item.category === "Sports")
      .slice(0, 10);

    if (!items.length) {
      list.innerHTML =
        '<div class="empty-state">Amakuru ya siporo ntaraboneka.</div>';
      status("sportsStatus", "Sports news not available yet.");
      return;
    }

    status("sportsStatus", `${items.length} sports headlines loaded.`);

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "sports-item";

      card.innerHTML = `
        <span class="eyebrow">${escapeHTML(formatDate(item.date))}</span>
        <h3>
          <a href="${escapeHTML(item.link)}" target="_blank"
             rel="noopener noreferrer">${escapeHTML(item.title)}</a>
        </h3>
        <a class="text-link" href="${escapeHTML(item.link)}"
           target="_blank" rel="noopener noreferrer">Read story ↗</a>
      `;

      list.appendChild(card);
    });
  }

  /* =====================================
     10. COUNTRY FILTER
  ===================================== */

  function populateCountries(selectId, items) {
    const select = $(selectId);
    if (!select) return;

    const previous = select.value || "all";

    const countries = [
      ...new Set(items.map(item => item.country))
    ].sort();

    select.innerHTML =
      '<option value="all">All countries / Ibihugu byose</option>';

    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      select.appendChild(option);
    });

    select.value = countries.includes(previous) ? previous : "all";
  }

  /* =====================================
     11. TV PLAYER
  ===================================== */

  function stopTV() {
    if (state.hls) {
      state.hls.destroy();
      state.hls = null;
    }

    const video = $("tvVideo");
    const frame = $("tvEmbed");

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.classList.add("hidden");
    }

    if (frame) {
      frame.src = "about:blank";
      frame.classList.add("hidden");
    }

    $("tvPlaceholder")?.classList.remove("hidden");
  }

  function playTV(channel, selectedButton) {
    stopTV();

    state.currentTV = channel;

    setText("tvNowPlaying", channel.name);

    const external = $("tvExternal");

    if (external) {
      external.href = channel.home || channel.page || "#";
      external.classList.remove("hidden");
    }

    $("tvList")?.querySelectorAll(".channel-item").forEach(button => {
      button.classList.toggle("active", button === selectedButton);
    });

    const video = $("tvVideo");
    const frame = $("tvEmbed");

    $("tvPlaceholder")?.classList.add("hidden");

    if (channel.type === "hls" && channel.stream && video) {
      playHLS(channel, video);
      return;
    }

    if (frame && channel.page) {
      frame.src = safeURL(channel.page);
      frame.classList.remove("hidden");

      status(
        "tvMessage",
        "Turimo gufungura official TV page. Niba itagaragara hano, koresha Official broadcaster."
      );
      return;
    }

    status("tvMessage", "Iyi channel nta stream URL ifite.");
  }

  function playHLS(channel, video) {
    const stream = safeURL(channel.stream);

    if (!stream) {
      status("tvMessage", "Stream URL ntiyemewe.");
      return;
    }

    video.classList.remove("hidden");
    video.poster = "";
    video.controls = true;
    video.playsInline = true;
    video.preload = "auto";

    status("tvMessage", `Connecting to ${channel.name}...`);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream;
      video.load();

      video.play()
        .then(() => status("tvMessage", `Now live: ${channel.name}`))
        .catch(() => status(
          "tvMessage",
          "Kanda Play kuri video kugira ngo utangire kureba."
        ));

      return;
    }

    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 20,
        maxBufferLength: 20,
        maxMaxBufferLength: 30,
        startLevel: -1
      });

      state.hls = hls;

      hls.loadSource(stream);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play()
          .then(() => status("tvMessage", `Now live: ${channel.name}`))
          .catch(() => status(
            "tvMessage",
            "Stream yiteguye. Kanda Play kugira ngo urebe."
          ));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data.fatal) return;

        status(
          "tvMessage",
          "Stream ntiyafungutse. Ishobora kuba itaboneka cyangwa ibuza playback."
        );

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
          state.hls = null;
        }
      });

      return;
    }

    status(
      "tvMessage",
      "Browser yawe ntishyigikira HLS. Gerageza Chrome igezweho."
    );
  }

  function renderTV() {
    const list = $("tvList");
    if (!list) return;

    const query = ($("tvSearch")?.value || "").toLowerCase().trim();
    const country = $("tvCountry")?.value || "all";

    const channels = state.tv.filter(channel => {
      const countryMatch =
        country === "all" || channel.country === country;

      const searchMatch =
        !query ||
        `${channel.name} ${channel.country}`
          .toLowerCase().includes(query);

      return countryMatch && searchMatch;
    });

    list.replaceChildren();

    if (!channels.length) {
      list.innerHTML =
        '<div class="empty-state">Nta muyoboro wabonetse.</div>';
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
        <span class="channel-live">
          ${channel.type === "hls" ? "LIVE" : "PAGE"}
        </span>
      `;

      button.addEventListener("click", () => playTV(channel, button));

      list.appendChild(button);
    });
  }

  function loadTV() {
    state.tv = TV_CHANNELS;
    populateCountries("tvCountry", state.tv);
    renderTV();

    setText("tvCount", `${state.tv.length} channels`);

    status(
      "tvMessage",
      "Hitamo channel. LIVE channels zikinira muri video player."
    );
  }

  function initTV() {
    $("refreshTV")?.addEventListener("click", loadTV);
    $("tvSearch")?.addEventListener("input", renderTV);
    $("tvCountry")?.addEventListener("change", renderTV);
  }

  /* =====================================
     12. RADIO PLAYER
  ===================================== */

  function playRadio(station, selectedCard) {
    const audio = $("radioPlayer");
    const frameWrap = $("ittRadioFrameWrap");

    setText("radioNowPlaying", station.name);
    setText("radioMeta", `${station.country} · Radio`);

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.classList.add("hidden");
    }

    if (frameWrap) {
      frameWrap.replaceChildren();

      const frame = document.createElement("iframe");
      frame.title = `${station.name} official radio player`;
      frame.src = safeURL(station.page);
      frame.allow = "autoplay";
      frame.loading = "eager";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.className = "itt-official-player";

      frameWrap.appendChild(frame);
      frameWrap.classList.remove("hidden");
    }

    document.querySelectorAll(".radio-card").forEach(card => {
      card.classList.toggle("active", card === selectedCard);
    });

    status(
      "radioMessage",
      "Turagerageza gufungura radiyo yemewe. Niba player itagaragara, kanda Official website."
    );
  }

  function renderRadios() {
    const list = $("radioList");
    if (!list) return;

    const query = ($("radioSearch")?.value || "").toLowerCase().trim();
    const country = $("radioCountry")?.value || "all";

    const stations = state.radios.filter(station => {
      const countryMatch =
        country === "all" || station.country === country;

      const searchMatch =
        !query ||
        `${station.name} ${station.country}`
          .toLowerCase().includes(query);

      return countryMatch && searchMatch;
    });

    list.replaceChildren();

    if (!stations.length) {
      list.innerHTML =
        '<div class="empty-state">Nta radiyo yabonetse.</div>';
      return;
    }

    stations.forEach(station => {
      const card = document.createElement("article");
      card.className = "radio-card";

      card.innerHTML = `
        <span class="eyebrow">${escapeHTML(station.country)}</span>
        <h3>${escapeHTML(station.name)}</h3>
        <p>Official radio player</p>
        <button class="btn btn-primary" type="button">
          ▶ Listen
        </button>
        <a class="text-link" href="${escapeHTML(station.home)}"
           target="_blank" rel="noopener noreferrer">
          Official website ↗
        </a>
      `;

      card.querySelector("button").addEventListener("click", () => {
        playRadio(station, card);
      });

      list.appendChild(card);
    });
  }

  function loadRadios() {
    state.radios = RADIO_STATIONS;
    populateCountries("radioCountry", state.radios);
    renderRadios();

    setText("radioCount", `${state.radios.length} stations`);
  }

  function initRadio() {
    $("refreshRadios")?.addEventListener("click", loadRadios);
    $("radioSearch")?.addEventListener("input", renderRadios);
    $("radioCountry")?.addEventListener("change", renderRadios);
  }

  /* =====================================
     13. MOVIES
  ===================================== */

  function playMovie(index) {
    const movie = MOVIES[index];
    const player = $("moviePlayer");

    if (!movie || !player) return;

    player.pause();
    player.src = movie.url;
    player.load();
    player.classList.remove("hidden");

    $("moviePlaceholder")?.classList.add("hidden");
    setText("movieNowPlaying", movie.title);

    status("movieMessage", "Filime irimo kwitegura...");

    player.play().catch(() => {
      status("movieMessage", "Kanda Play kugira ngo utangire kureba.");
    });
  }

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
               alt="${escapeHTML(movie.title)}" loading="lazy">
        </div>
        <div class="movie-card-body">
          <span class="eyebrow">OPEN MOVIE · ${escapeHTML(movie.year)}</span>
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

  function initMoviePlayer() {
    $("moviePlayer")?.addEventListener("error", () => {
      status("movieMessage", "Filime ntiyafungutse. Gerageza indi.");
    });
  }

  /* =====================================
     14. INTERNET CONNECTION
  ===================================== */

  function initOnlineEvents() {
    window.addEventListener("online", () => {
      showToast("Internet connection restored.");
      loadNews();
    });

    window.addEventListener("offline", () => {
      showToast("Internet connection lost.");
    });
  }

  /* =====================================
     15. START ITT-TV
  ===================================== */

  function init() {
    initHeader();

    initNews();
    initTV();
    initRadio();
    initMoviePlayer();

    loadTV();
    loadRadios();
    loadMovies();
    loadNews();

    initOnlineEvents();

    console.log("ITT-TV World Media initialized successfully.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
