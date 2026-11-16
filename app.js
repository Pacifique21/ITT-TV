
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const state = {
    news: [],
    newsShown: 9,
    category: "all",
    tv: [],
    radios: [],
    hls: null
  };

  /* ===================== DATA ===================== */

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

  /*
   * These are official broadcaster pages, not invented stream URLs.
   * A broadcaster may prevent its page from loading inside an iframe.
   */
  const TV_CHANNELS = [
    { name: "Rwanda TV (RTV)", country: "Rwanda", page: "https://www.rba.co.rw/tv", home: "https://www.rba.co.rw/" },
    { name: "ISIBO TV", country: "Rwanda", page: "https://isibomedia.com/listen/tv", home: "https://isibomedia.com/" },
    { name: "BTN TV", country: "Rwanda", page: "https://v2.btnrwanda.com/page/live/", home: "https://www.btnrwanda.com/" },
    { name: "TV10 Rwanda", country: "Rwanda", page: "https://radiotv10.rw/", home: "https://radiotv10.rw/" },
    { name: "ZACU TV", country: "Rwanda", page: "https://www.zacutv.com/", home: "https://www.zacutv.com/" },
    { name: "TV1 Rwanda", country: "Rwanda", page: "https://tv1.rw/", home: "https://tv1.rw/" },
    { name: "Flash TV", country: "Rwanda", page: "https://flash.rw/home/", home: "https://flash.rw/" },
    { name: "Al Jazeera English", country: "International", page: "https://www.aljazeera.com/live/", home: "https://www.aljazeera.com/" },
    { name: "BBC News", country: "United Kingdom", page: "https://www.bbc.com/news", home: "https://www.bbc.com/" },
    { name: "France 24", country: "France", page: "https://www.france24.com/en/live", home: "https://www.france24.com/" },
    { name: "DW News", country: "Germany", page: "https://www.dw.com/en/live-tv/s-100825", home: "https://www.dw.com/" },
    { name: "NHK World", country: "Japan", page: "https://www3.nhk.or.jp/nhkworld/en/live/", home: "https://www3.nhk.or.jp/nhkworld/" },
    { name: "Africanews", country: "International", page: "https://www.africanews.com/live/", home: "https://www.africanews.com/" }
  ];

  const RADIO_STATIONS = [
    { name: "Radio Rwanda", country: "Rwanda", page: "https://www.rba.co.rw/radio", home: "https://www.rba.co.rw/" },
    { name: "Magic FM", country: "Rwanda", page: "https://www.rba.co.rw/radio/2/Magic-Fm", home: "https://www.rba.co.rw/" },
    { name: "Radio Rubavu", country: "Rwanda", page: "https://www.rba.co.rw/radio", home: "https://www.rba.co.rw/" },
    { name: "Radio Nyagatare", country: "Rwanda", page: "https://www.rba.co.rw/radio", home: "https://www.rba.co.rw/" },
    { name: "Radio Inteko", country: "Rwanda", page: "https://www.rba.co.rw/radio", home: "https://www.rba.co.rw/" },
    { name: "Radio Huye", country: "Rwanda", page: "https://www.rba.co.rw/radio", home: "https://www.rba.co.rw/" },
    { name: "Radio Musanze", country: "Rwanda", page: "https://www.rba.co.rw/radio", home: "https://www.rba.co.rw/" },
    { name: "Radio Rusizi", country: "Rwanda", page: "https://www.rba.co.rw/radio", home: "https://www.rba.co.rw/" },
    { name: "ISIBO Radio", country: "Rwanda", page: "https://isibomedia.com/listen/radio", home: "https://isibomedia.com/" },
    { name: "Radio 10", country: "Rwanda", page: "https://radiotv10.rw/radio/", home: "https://radiotv10.rw/" },
    { name: "KISS FM", country: "Rwanda", page: "https://kissfm.rw/", home: "https://kissfm.rw/" },
    { name: "Flash FM", country: "Rwanda", page: "https://flash.rw/home/", home: "https://flash.rw/" },
    { name: "BBC World Service", country: "United Kingdom", page: "https://www.bbc.com/sounds/play/live:bbc_world_service", home: "https://www.bbc.com/sounds" },
    { name: "RFI", country: "France", page: "https://www.rfi.fr/en/", home: "https://www.rfi.fr/" },
    { name: "VOA", country: "United States", page: "https://www.voaafrica.com/live/audio", home: "https://www.voaafrica.com/" },
    { name: "Radio France Internationale", country: "France", page: "https://www.rfi.fr/", home: "https://www.rfi.fr/" }
  ];

  /*
   * Publicly released sample films.
   * These are not commercial or subscription movie copies.
   */
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

  /* ===================== LANGUAGE ===================== */

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

  function setLanguage(language) {
    const words = translations[language] || translations.rw;
    document.documentElement.lang = language;

    document.querySelectorAll("#mainNav a").forEach(link => {
      const section = link.getAttribute("href")?.replace("#", "");
      if (words[section]) link.textContent = words[section];
    });

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      if (words[key]) el.textContent = words[key];
    });
  }

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
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
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
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  function stripHTML(value) {
    const element = document.createElement("div");
    element.innerHTML = String(value || "");
    return (element.textContent || "").replace(/\s+/g, " ").trim();
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
  }

  async function fetchJSON(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  /* ===================== HEADER ===================== */

  function initHeader() {
    setText("year", new Date().getFullYear());

    $("closeAnnouncement")?.addEventListener("click", () => {
      $("announcement")?.classList.add("hidden");
    });

    $("menuToggle")?.addEventListener("click", () => {
      const nav = $("mainNav");
      nav?.classList.toggle("open");
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
    const proxy = "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent(feed.url);

    const data = await fetchJSON(proxy);
    if (data.status !== "ok" || !Array.isArray(data.items)) return [];

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
    showStatus("newsStatus", "Turimo gushaka amakuru mashya...");

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
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    state.newsShown = 9;
    renderNews();
    renderTicker();
    renderSports();

    showStatus(
      "newsStatus",
      state.news.length
        ? `${state.news.length} headlines loaded.`
        : "Amakuru ntaraboneka. Ongera ugerageze nyuma."
    );
  }

  function renderNews() {
    const grid = $("newsGrid");
    if (!grid) return;

    const query = ($("newsSearch")?.value || "").toLowerCase().trim();

    const items = state.news.filter(item => {
      const categoryMatch =
        state.category === "all" || item.category === state.category;

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

      $("newsFilters").querySelectorAll(".filter-pill").forEach(item => {
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
      empty.textContent = "Amakuru ya siporo ntaraboneka. Ongera ugerageze.";
      list.appendChild(empty);
      showStatus("sportsStatus", "Sports headlines are not available yet.");
      return;
    }

    showStatus("sportsStatus", `${sports.length} sports headlines loaded.`);

    sports.forEach(item => {
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

  /* ===================== TV ===================== */

  function loadTV() {
    state.tv = TV_CHANNELS.map((channel, index) => ({
      ...channel,
      id: `tv-${index}`,
      type: "official-page"
    }));

    populateCountries("tvCountry", state.tv);
    renderTV();

    setText("tvCount", `${state.tv.length} broadcaster pages`);
    showStatus(
      "tvMessage",
      "Hitamo umuyoboro. Turagerageza gufungura official player muri ITT-TV."
    );
  }

  function populateCountries(selectId, items) {
    const select = $(selectId);
    if (!select) return;

    const previous = select.value || "all";
    const countries = [...new Set(items.map(item => item.country))]
      .filter(Boolean)
      .sort();

    select.innerHTML = '<option value="all">Ibihugu byose / All countries</option>';

    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      select.appendChild(option);
    });

    select.value = countries.includes(previous) ? previous : "all";
  }

  function renderTV() {
    const list = $("tvList");
    if (!list) return;

    const query = ($("tvSearch")?.value || "").toLowerCase().trim();
    const country = $("tvCountry")?.value || "all";

    const channels = state.tv.filter(channel => {
      const countryMatch = country === "all" || channel.country === country;
      const searchMatch =
        !query ||
        `${channel.name} ${channel.country}`.toLowerCase().includes(query);

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
          <small>${escapeHTML(channel.country)} · Official page</small>
        </span>
        <span class="channel-live">PAGE</span>
      `;

      button.addEventListener("click", () => playTV(channel, button));
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
      frame.src = "about:blank";
      frame.classList.add("hidden");
    }

    $("tvPlaceholder")?.classList.remove("hidden");
  }

  function playTV(channel, selectedButton) {
    stopTV();

    setText("tvNowPlaying", channel.name);

    const external = $("tvExternal");
    if (external) {
      external.href = channel.home || channel.page;
      external.classList.remove("hidden");
    }

    $("tvList")?.querySelectorAll(".channel-item").forEach(button => {
      button.classList.toggle("active", button === selectedButton);
    });

    const frame = $("tvEmbed");

    if (!frame) {
      showStatus("tvMessage", "TV player container ntiboneka muri HTML.");
      return;
    }

    $("tvPlaceholder")?.classList.add("hidden");
    frame.classList.remove("hidden");

    frame.src = safeURL(channel.page);

    showStatus(
      "tvMessage",
      "Turagerageza gufungura official player hano. Niba broadcaster ibuza iframe, kanda kuri Official broadcaster."
    );
  }

  function initTV() {
    $("refreshTV")?.addEventListener("click", loadTV);
    $("tvSearch")?.addEventListener("input", renderTV);
    $("tvCountry")?.addEventListener("change", renderTV);
  }

  /* ===================== RADIO ===================== */

  function loadRadios() {
    state.radios = RADIO_STATIONS.map((station, index) => ({
      ...station,
      id: `radio-${index}`,
      type: "official-page"
    }));

    populateCountries("radioCountry", state.radios);
    renderRadios();

    setText("radioCount", `${state.radios.length} radio pages`);
    showStatus(
      "radioMessage",
      "Hitamo radiyo. Official player izageragezwa imbere muri ITT-TV."
    );
  }

  function renderRadios() {
    const list = $("radioList");
    if (!list) return;

    const query = ($("radioSearch")?.value || "").toLowerCase().trim();
    const country = $("radioCountry")?.value || "all";

    const stations = state.radios.filter(station => {
      const countryMatch = country === "all" || station.country === country;
      const searchMatch =
        !query ||
        `${station.name} ${station.country}`.toLowerCase().includes(query);

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
        <p>Official broadcaster player</p>
        <button class="btn btn-primary" type="button">▶ Listen / Fungura</button>
      `;

      card.querySelector("button").addEventListener("click", () => {
        playRadio(station, card);
      });

      list.appendChild(card);
    });
  }

  function playRadio(station, selectedCard) {
    setText("radioNowPlaying", station.name);
    setText("radioMeta", `${station.country} · Official broadcaster page`);

    const audio = $("radioPlayer");
    const frameWrap = $("ittRadioFrameWrap");

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.classList.add("hidden");
    }

    if (!frameWrap) {
      showStatus("radioMessage", "Radio player container ntiboneka.");
      return;
    }

    frameWrap.replaceChildren();

    const frame = document.createElement("iframe");
    frame.className = "itt-official-player";
    frame.title = `${station.name} official radio player`;
    frame.src = safeURL(station.page);
    frame.allow = "autoplay; encrypted-media";
    frame.loading = "eager";
    frame.referrerPolicy = "strict-origin-when-cross-origin";

    frameWrap.appendChild(frame);
    frameWrap.classList.remove("hidden");

    document.querySelectorAll(".radio-card").forEach(card => {
      card.style.borderColor = card === selectedCard
        ? "var(--accent)"
        : "var(--border)";
    });

    showStatus(
      "radioMessage",
      "Turagerageza gufungura radiyo hano. Niba urubuga rwayo rutemera iframe, fungura official website yayo."
    );
  }

  function initRadio() {
    $("refreshRadios")?.addEventListener("click", loadRadios);
    $("radioSearch")?.addEventListener("input", renderRadios);
    $("radioCountry")?.addEventListener("change", renderRadios);
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
          <img src="${escapeHTML(movie.poster)}" alt="" loading="lazy">
        </div>
        <div class="movie-card-body">
          <span class="eyebrow">OPEN MOVIE · ${escapeHTML(movie.year)}</span>
          <h3>${escapeHTML(movie.title)}</h3>
          <p>${escapeHTML(movie.description)}</p>
          <button class="btn btn-outline" type="button">▶ Watch film</button>
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
    player.load();
    player.classList.remove("hidden");

    $("moviePlaceholder")?.classList.add("hidden");
    setText("movieNowPlaying", movie.title);

    showStatus("movieMessage", "Filime irimo kwitegura. Kanda Play niba idahise itangira.");

    player.play().catch(() => {
      showStatus(
        "movieMessage",
        "Kanda Play kuri video. Iyo source ishobora kuba itaboneka by'agateganyo."
      );
    });
  }

  function initMoviePlayer() {
    $("moviePlayer")?.addEventListener("error", () => {
      showStatus("movieMessage", "Iyi filime ntiyabashije gufunguka. Gerageza indi.");
    });
  }

  /* ===================== ONLINE / START ===================== */

  function initOnlineEvents() {
    window.addEventListener("online", () => {
      showToast("Internet connection restored.");
      loadNews();
    });
  }

  function init() {
    initHeader();
    initNews();
    initTV();
    initRadio();
    initMoviePlayer();

    loadNews();
    loadTV();
    loadRadios();
    loadMovies();

    initOnlineEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
