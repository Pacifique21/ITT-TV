
/* =========================================================
   ITT NEWS - COMPLETE APP.JS
   Works with the IDs in the supplied index.html
   ========================================================= */

"use strict";

/* -------------------- CONFIGURATION -------------------- */

const CONFIG = {
  newsPerPage: 10,
  requestTimeout: 15000,

  newsFeeds: {
    world: [
      "https://feeds.bbci.co.uk/news/world/rss.xml"
    ],
    africa: [
      "https://feeds.bbci.co.uk/news/world/africa/rss.xml"
    ],
    business: [
      "https://feeds.bbci.co.uk/news/business/rss.xml"
    ],
    technology: [
      "https://feeds.bbci.co.uk/news/technology/rss.xml"
    ],
    sports: [
      "https://feeds.bbci.co.uk/sport/rss.xml"
    ]
  }
};

/* -------------------- ELEMENT HELPERS -------------------- */

const $ = (id) => document.getElementById(id);

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);

function safeURL(value) {
  try {
    const url = new URL(value);
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

/* -------------------- APPLICATION STATE -------------------- */

const state = {
  currentSection: "home",
  newsCategory: "world",
  news: [],
  sports: [],
  currentPage: 1,
  searchTerm: "",
  language: "en",
  newsRequest: 0,
  activeTV: null,
  activeRadio: null,
  hls: null
};

/* -------------------- LANGUAGE SUPPORT -------------------- */

const translations = {
  en: {
    home: "Home",
    news: "News",
    sports: "Sports",
    tv: "Live TV",
    radio: "Radio",
    movies: "Movies"
  },
  rw: {
    home: "Ahabanza",
    news: "Amakuru",
    sports: "Imikino",
    tv: "Televiziyo",
    radio: "Radiyo",
    movies: "Filime"
  },
  fr: {
    home: "Accueil",
    news: "Actualités",
    sports: "Sports",
    tv: "Télévision",
    radio: "Radio",
    movies: "Films"
  },
  sw: {
    home: "Nyumbani",
    news: "Habari",
    sports: "Michezo",
    tv: "Televisheni",
    radio: "Redio",
    movies: "Filamu"
  },
  es: {
    home: "Inicio",
    news: "Noticias",
    sports: "Deportes",
    tv: "Televisión",
    radio: "Radio",
    movies: "Películas"
  },
  pt: {
    home: "Início",
    news: "Notícias",
    sports: "Desporto",
    tv: "Televisão",
    radio: "Rádio",
    movies: "Filmes"
  },
  de: {
    home: "Startseite",
    news: "Nachrichten",
    sports: "Sport",
    tv: "Fernsehen",
    radio: "Radio",
    movies: "Filme"
  },
  ar: {
    home: "الرئيسية",
    news: "الأخبار",
    sports: "الرياضة",
    tv: "التلفزيون",
    radio: "الراديو",
    movies: "الأفلام"
  },
  zh: {
    home: "首页",
    news: "新闻",
    sports: "体育",
    tv: "电视",
    radio: "广播",
    movies: "电影"
  },
  hi: {
    home: "होम",
    news: "समाचार",
    sports: "खेल",
    tv: "टीवी",
    radio: "रेडियो",
    movies: "फ़िल्में"
  },
  ja: {
    home: "ホーム",
    news: "ニュース",
    sports: "スポーツ",
    tv: "テレビ",
    radio: "ラジオ",
    movies: "映画"
  },
  it: {
    home: "Home",
    news: "Notizie",
    sports: "Sport",
    tv: "Televisione",
    radio: "Radio",
    movies: "Film"
  }
};

/* -------------------- NAVIGATION -------------------- */

function showSection(section, updateURL = true) {
  const allowed = [
    "home",
    "news",
    "sports",
    "tv",
    "radio",
    "movies"
  ];

  if (!allowed.includes(section)) {
    section = "home";
  }

  state.currentSection = section;

  document.querySelectorAll(".page-section").forEach((element) => {
    const active = element.id === section;

    element.hidden = !active;
    element.classList.toggle("active", active);
  });

  document.querySelectorAll("[data-section]").forEach((link) => {
    const active = link.dataset.section === section;

    link.classList.toggle("active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });

  if (updateURL) {
    history.replaceState(null, "", `#${section}`);
  }

  if (section === "news" && state.news.length === 0) {
    loadNews(state.newsCategory);
  }

  if (section === "sports" && state.sports.length === 0) {
    loadNews("sports");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  document.querySelectorAll("[data-section]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const section = link.dataset.section;
      showSection(section);

      if (section === "sports") {
        loadNews("sports");
      }
    });
  });

  window.addEventListener("hashchange", () => {
    const section = location.hash.replace("#", "") || "home";
    showSection(section, false);
  });
}

/* -------------------- NEWS FUNCTIONS -------------------- */

function normalizeNewsItem(item, sourceName = "News") {
  const title = item.title || item.name || "News update";
  const link = safeURL(item.link || item.url || "");
  const description = item.description || item.content || "";
  const image =
    item.thumbnail ||
    item.enclosure?.link ||
    item.image ||
    "";

  return {
    title: String(title).trim(),
    description: String(description).replace(/<[^>]*>/g, "").trim(),
    link,
    image: safeURL(image),
    date: item.pubDate || item.published || item.date || "",
    source: sourceName
  };
}

async function fetchRSS(feedURL) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    CONFIG.requestTimeout
  );

  try {
    const endpoint =
      "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent(feedURL);

    const response = await fetch(endpoint, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`RSS request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.status !== "ok" || !Array.isArray(result.items)) {
      throw new Error("RSS feed did not return valid news.");
    }

    return result.items.map((item) =>
      normalizeNewsItem(item, result.feed?.title || "News")
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function loadNews(category = "world") {
  const requestNumber = ++state.newsRequest;

  state.newsCategory = category;
  state.currentPage = 1;

  const feeds = CONFIG.newsFeeds[category] || CONFIG.newsFeeds.world;

  const grid = category === "sports"
    ? $("sportsGrid")
    : $("newsGrid");

  const status = $("newsStatus");

  if (grid) {
    grid.innerHTML = "<p>Loading news...</p>";
  }

  if (status) {
    status.textContent = "Loading latest news...";
  }

  try {
    const results = await Promise.allSettled(
      feeds.map((url) => fetchRSS(url))
    );

    if (requestNumber !== state.newsRequest) return;

    const articles = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const unique = [];
    const seen = new Set();

    articles.forEach((article) => {
      const key = article.link || article.title;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    });

    if (category === "sports") {
      state.sports = unique;
      renderSports();
    } else {
      state.news = unique;
      renderNews();
    }

    if (status) {
      status.textContent = unique.length
        ? `${unique.length} news stories available.`
        : "No news could be loaded. Please try again.";
    }

  } catch (error) {
    console.error("News loading error:", error);

    if (requestNumber !== state.newsRequest) return;

    if (grid) {
      grid.innerHTML =
        "<p>News could not be loaded. Check your internet connection and try again.</p>";
    }

    if (status) {
      status.textContent = "Unable to load news.";
    }
  }
}

function getFilteredNews() {
  const term = state.searchTerm.toLowerCase();

  return state.news.filter((article) => {
    return (
      article.title.toLowerCase().includes(term) ||
      article.description.toLowerCase().includes(term) ||
      article.source.toLowerCase().includes(term)
    );
  });
}

function newsCard(article) {
  const image = article.image
    ? `<img src="${escapeHTML(article.image)}" alt="" loading="lazy">`
    : "";

  const date = article.date
    ? new Date(article.date).toLocaleDateString()
    : "";

  const link = article.link
    ? `<a href="${escapeHTML(article.link)}" target="_blank" rel="noopener noreferrer">Read full story</a>`
    : "";

  return `
    <article class="news-card">
      ${image}
      <div class="news-card-content">
        <small>${escapeHTML(article.source)} ${date ? "· " + escapeHTML(date) : ""}</small>
        <h3>${escapeHTML(article.title)}</h3>
        <p>${escapeHTML(article.description.slice(0, 240))}</p>
        ${link}
      </div>
    </article>
  `;
}

function renderNews() {
  const grid = $("newsGrid");
  if (!grid) return;

  const filtered = getFilteredNews();
  const start = (state.currentPage - 1) * CONFIG.newsPerPage;
  const pageItems = filtered.slice(start, start + CONFIG.newsPerPage);

  grid.innerHTML = pageItems.length
    ? pageItems.map(newsCard).join("")
    : "<p>No news found.</p>";

  renderPagination(filtered.length);
}

function renderSports() {
  const grid = $("sportsGrid");
  if (!grid) return;

  grid.innerHTML = state.sports.length
    ? state.sports.map(newsCard).join("")
    : "<p>No sports news available at the moment.</p>";
}

function renderPagination(totalItems) {
  const container = $("newsPagination");
  if (!container) return;

  const totalPages = Math.ceil(totalItems / CONFIG.newsPerPage);

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  html += `
    <button type="button" data-page="${state.currentPage - 1}"
      ${state.currentPage === 1 ? "disabled" : ""}>
      Previous
    </button>
  `;

  for (let page = 1; page <= totalPages; page++) {
    html += `
      <button type="button" data-page="${page}"
        ${page === state.currentPage ? 'aria-current="page"' : ""}>
        ${page}
      </button>
    `;
  }

  html += `
    <button type="button" data-page="${state.currentPage + 1}"
      ${state.currentPage === totalPages ? "disabled" : ""}>
      Next
    </button>
  `;

  container.innerHTML = html;

  container.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.page);

      if (page >= 1 && page <= totalPages) {
        state.currentPage = page;
        renderNews();

        $("news")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

/* -------------------- NEWS CONTROLS -------------------- */

function setupNewsControls() {
  $("newsSearch")?.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim();
    state.currentPage = 1;
    renderNews();
  });

  document.querySelectorAll("[data-news-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.newsCategory;

      document.querySelectorAll("[data-news-category]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      loadNews(category);
    });
  });

  $("refreshNews")?.addEventListener("click", () => {
    loadNews(state.newsCategory);
  });

  $("openSportsNews")?.addEventListener("click", () => {
    showSection("sports");
    loadNews("sports");
  });
}

/* -------------------- TV CHANNELS -------------------- */

/*
  Add a real broadcaster-authorized stream URL or embed URL
  when one is available. Do not use a broadcaster homepage
  as if it were a direct video stream.
*/

const tvChannels = [
  {
    name: "RBA TV",
    country: "Rwanda",
    streamUrl: "",
    embedUrl: "",
    website: "https://www.rba.co.rw/"
  },
  {
    name: "TV10 Rwanda",
    country: "Rwanda",
    streamUrl: "",
    embedUrl: "",
    website: "https://www.tv10.rw/"
  },
  {
    name: "Flash TV",
    country: "Rwanda",
    streamUrl: "",
    embedUrl: "",
    website: "https://www.flashfm.rw/"
  }
];

function stopTV() {
  const player = $("tvPlayer");
  const frame = $("tvOfficialFrame");

  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
  }

  if (frame) {
    frame.src = "about:blank";
    frame.hidden = true;
  }

  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function playTV(channel) {
  stopTV();

  state.activeTV = channel;

  const player = $("tvPlayer");
  const frame = $("tvOfficialFrame");
  const message = $("tvPlayerMessage");

  setText("tvNowPlaying", channel.name);

  if (channel.streamUrl && player) {
    player.hidden = false;
    player.src = channel.streamUrl;

    if (
      channel.streamUrl.includes(".m3u8") &&
      window.Hls &&
      Hls.isSupported()
    ) {
      state.hls = new Hls();
      state.hls.loadSource(channel.streamUrl);
      state.hls.attachMedia(player);

      state.hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setText("tvPlayerMessage", "This TV stream is unavailable.");
        }
      });
    } else {
      player.load();
    }

    player.play().catch(() => {
      setText("tvPlayerMessage", "Press play to start this TV stream.");
    });

    if (message) message.textContent = "";
    return;
  }

  if (channel.embedUrl && frame) {
    frame.hidden = false;
    frame.src = channel.embedUrl;

    if (message) {
      message.textContent = "If the broadcaster allows embedding, the TV will play here.";
    }
    return;
  }

  if (message) {
    message.textContent =
      `${channel.name} has no verified direct stream or embed link yet. Visit its official website.`;
  }

  if (channel.website) {
    const link = document.createElement("a");
    link.href = channel.website;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open official TV website";

    message?.appendChild(document.createTextNode(" "));
    message?.appendChild(link);
  }
}

function renderTV() {
  const container = $("tvChannels");
  if (!container) return;

  container.innerHTML = tvChannels.map((channel, index) => `
    <article class="channel-card">
      <h3>${escapeHTML(channel.name)}</h3>
      <p>${escapeHTML(channel.country)}</p>
      <button type="button" data-tv-index="${index}">
        Watch
      </button>
      <a href="${escapeHTML(channel.website)}"
         target="_blank" rel="noopener noreferrer">
        Official website
      </a>
    </article>
  `).join("");

  container.querySelectorAll("[data-tv-index]").forEach((button) => {
    button.addEventListener("click", () => {
      playTV(tvChannels[Number(button.dataset.tvIndex)]);
    });
  });
}

/* -------------------- RADIO CHANNELS -------------------- */

const radioChannels = [
  {
    name: "Radio 10 Rwanda",
    country: "Rwanda",
    streamUrl: "https://radio10rwanda-atunwadigital.streamguys1.com/Radio10Rwanda",
    website: "https://radio10.rw/"
  },
  {
    name: "KISS FM Rwanda",
    country: "Rwanda",
    streamUrl: "",
    website: "https://www.kissfm.rw/"
  },
  {
    name: "Flash FM",
    country: "Rwanda",
    streamUrl: "",
    website: "https://www.flashfm.rw/"
  },
  {
    name: "BBC World Service",
    country: "International",
    streamUrl: "",
    website: "https://www.bbc.com/audio"
  },
  {
    name: "Deutsche Welle",
    country: "International",
    streamUrl: "",
    website: "https://www.dw.com/"
  }
];

function stopRadio() {
  const player = $("radioPlayer");
  if (!player) return;

  player.pause();
  player.removeAttribute("src");
  player.load();
}

function playRadio(channel) {
  stopRadio();

  state.activeRadio = channel;

  const player = $("radioPlayer");
  const frame = $("radioOfficialFrame");
  const message = $("radioPlayerMessage");

  setText("radioNowPlaying", channel.name);

  if (frame) {
    frame.src = "about:blank";
    frame.hidden = true;
  }

  if (channel.streamUrl && player) {
    player.hidden = false;
    player.src = channel.streamUrl;
    player.load();

    player.play().then(() => {
      if (message) message.textContent = "";
    }).catch(() => {
      if (message) {
        message.textContent =
          "This radio stream could not start. The stream may be unavailable or may block playback.";
      }
    });

    return;
  }

  if (message) {
    message.textContent =
      `${channel.name} does not have a verified direct audio stream in this version.`;
  }

  if (channel.website && message) {
    const link = document.createElement("a");
    link.href = channel.website;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open official radio website";
    message.appendChild(document.createTextNode(" "));
    message.appendChild(link);
  }
}

function renderRadio() {
  const container = $("radioChannels");
  if (!container) return;

  container.innerHTML = radioChannels.map((channel, index) => `
    <article class="channel-card">
      <h3>${escapeHTML(channel.name)}</h3>
      <p>${escapeHTML(channel.country)}</p>
      <button type="button" data-radio-index="${index}">
        Listen
      </button>
      <a href="${escapeHTML(channel.website)}"
         target="_blank" rel="noopener noreferrer">
        Official website
      </a>
    </article>
  `).join("");

  container.querySelectorAll("[data-radio-index]").forEach((button) => {
    button.addEventListener("click", () => {
      playRadio(radioChannels[Number(button.dataset.radioIndex)]);
    });
  });
}

/* -------------------- MOVIES -------------------- */

/*
  These are public sample films from the Blender Foundation.
  Replace or add only films that are legally available to embed.
*/

const movies = [
  {
    title: "Big Buck Bunny",
    category: "Animation",
    description: "A public animated short film from the Blender Foundation.",
    video: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ"
  },
  {
    title: "Sintel",
    category: "Adventure",
    description: "An open movie produced by the Blender Foundation.",
    video: "https://www.youtube-nocookie.com/embed/eRsGyueVLvQ"
  },
  {
    title: "Tears of Steel",
    category: "Sci-Fi",
    description: "A science-fiction short film from the Blender Foundation.",
    video: "https://www.youtube-nocookie.com/embed/R6MlUcmOul8"
  }
];

function renderMovies() {
  const container = $("movieGrid");
  if (!container) return;

  const search = $("movieSearch")?.value.toLowerCase().trim() || "";
  const category = $("movieCategory")?.value || "all";

  const filtered = movies.filter((movie) => {
    const matchesSearch =
      movie.title.toLowerCase().includes(search) ||
      movie.description.toLowerCase().includes(search);

    const matchesCategory =
      category === "all" || movie.category === category;

    return matchesSearch && matchesCategory;
  });

  container.innerHTML = filtered.length
    ? filtered.map((movie, index) => `
      <article class="movie-card">
        <div class="movie-thumbnail">
          <span>▶</span>
        </div>
        <div class="movie-card-content">
          <small>${escapeHTML(movie.category)}</small>
          <h3>${escapeHTML(movie.title)}</h3>
          <p>${escapeHTML(movie.description)}</p>
          <button type="button" data-movie-index="${movies.indexOf(movie)}">
            Watch movie
          </button>
        </div>
      </article>
    `).join("")
    : "<p>No movies found.</p>";

  container.querySelectorAll("[data-movie-index]").forEach((button) => {
    button.addEventListener("click", () => {
      openMovie(movies[Number(button.dataset.movieIndex)]);
    });
  });
}

function openMovie(movie) {
  const viewer = $("movieViewer");
  const frame = $("movieFrame");

  if (!viewer || !frame) return;

  setText("movieViewerTitle", movie.title);
  setText("movieViewerDescription", movie.description);

  frame.src = movie.video;
  viewer.hidden = false;

  viewer.scrollIntoView({ behavior: "smooth" });
}

function closeMovie() {
  const viewer = $("movieViewer");
  const frame = $("movieFrame");

  if (frame) {
    frame.src = "about:blank";
  }

  if (viewer) {
    viewer.hidden = true;
  }
}

function setupMovieControls() {
  $("movieSearch")?.addEventListener("input", renderMovies);
  $("movieCategory")?.addEventListener("change", renderMovies);
  $("closeMovie")?.addEventListener("click", closeMovie);
}

/* -------------------- LANGUAGE SELECTOR -------------------- */

function setupLanguages() {
  const selector = $("languageSelect");
  if (!selector) return;

  selector.addEventListener("change", () => {
    state.language = selector.value;
    applyLanguage();
  });

  applyLanguage();
}

function applyLanguage() {
  const dictionary = translations[state.language] || translations.en;

  document.querySelectorAll("[data-section]").forEach((element) => {
    const key = element.dataset.section;

    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });
}

/* -------------------- TICKER -------------------- */

function setupTicker() {
  const ticker = $("tickerText");

  if (ticker) {
    ticker.textContent =
      "ITT NEWS | World News | Africa | Sports | Technology | Business | Entertainment";
  }
}

/* -------------------- FOOTER -------------------- */

function setupFooter() {
  const year = $("currentYear");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

/* -------------------- CLEANUP -------------------- */

window.addEventListener("beforeunload", () => {
  stopTV();
  stopRadio();

  if (state.hls) {
    state.hls.destroy();
  }
});

/* -------------------- INITIALIZATION -------------------- */

function initializeApp() {
  console.log("ITT NEWS application initialized.");

  setupNavigation();
  setupNewsControls();
  setupMovieControls();
  setupLanguages();
  setupFooter();
  setupTicker();

  renderTV();
  renderRadio();
  renderMovies();

  const requestedSection =
    location.hash.replace("#", "") || "home";

  const validSections = [
    "home",
    "news",
    "sports",
    "tv",
    "radio",
    "movies"
  ];

  const section = validSections.includes(requestedSection)
    ? requestedSection
    : "home";

  /*
    Show the requested section without triggering
    another news request from showSection().
  */
  showSection(section, false);

  if (section === "sports") {
    loadNews("sports");
  } else if (section === "news") {
    loadNews(state.newsCategory);
  } else {
    loadNews("world");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
