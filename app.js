
/* =====================================================
   ITT-TV COMPLETE APP.JS
   News | Sports | Live TV | Radio | Movies | Languages
===================================================== */

"use strict";

/* ---------------- CONFIGURATION ---------------- */

const CONFIG = {
  newsPerPage: 10,
  newsApi: "https://api.rss2json.com/v1/api.json?rss_url=",
  feeds: {
    world: "https://feeds.bbci.co.uk/news/world/rss.xml",
    africa: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    business: "https://feeds.bbci.co.uk/news/business/rss.xml",
    technology: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    sports: "https://feeds.bbci.co.uk/sport/rss.xml"
  }
};

const state = {
  news: [],
  filteredNews: [],
  newsPage: 1,
  newsCategory: "world",
  search: "",
  currentHls: null,
  currentLanguage: "en"
};

/* ---------------- TV CHANNELS ---------------- */

const tvChannels = [
  {
    name: "RBA TV",
    country: "Rwanda",
    category: "News",
    streamUrl: "",
    officialUrl: "https://www.rba.co.rw/tv"
  },
  {
    name: "TV10",
    country: "Rwanda",
    category: "News",
    streamUrl: "",
    officialUrl: "https://radiotv10.rw/tvpage/"
  },
  {
    name: "Flash TV",
    country: "Rwanda",
    category: "News",
    streamUrl: "",
    officialUrl: "https://flash.rw/flash-tv-live/"
  }
];

/* ---------------- RADIO CHANNELS ---------------- */

const radioChannels = [
  {
    name: "Radio 10",
    country: "Rwanda",
    streamUrl:
      "https://radio10rwanda-atunwadigital.streamguys1.com/Radio10Rwanda",
    officialUrl: "https://radiotv10.rw/radio/"
  },
  {
    name: "KT Radio",
    country: "Rwanda",
    streamUrl: "",
    officialUrl: "https://ktradio.rw/"
  },
  {
    name: "Isango Star",
    country: "Rwanda",
    streamUrl: "",
    officialUrl: "https://isangostar.rw/"
  },
  {
    name: "Flash Radio",
    country: "Rwanda",
    streamUrl: "",
    officialUrl: "https://flash.rw/"
  },
  {
    name: "Radio Rwanda",
    country: "Rwanda",
    streamUrl: "",
    officialUrl: "https://www.rba.co.rw/"
  }
];

/* ---------------- FREE MOVIES ----------------
   These are examples of films made available online.
   YouTube owners may change or disable embedding.
------------------------------------------------ */

const movies = [
  {
    title: "Big Buck Bunny",
    year: "2008",
    type: "Animation",
    image: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    video: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ"
  },
  {
    title: "Sintel",
    year: "2010",
    type: "Animation",
    image: "https://i.ytimg.com/vi/eRsGyueVLvQ/hqdefault.jpg",
    video: "https://www.youtube-nocookie.com/embed/eRsGyueVLvQ"
  },
  {
    title: "Tears of Steel",
    year: "2012",
    type: "Science Fiction",
    image: "https://i.ytimg.com/vi/R6MlUcmOul8/hqdefault.jpg",
    video: "https://www.youtube-nocookie.com/embed/R6MlUcmOul8"
  }
];

/* ---------------- 12 LANGUAGES ---------------- */

const translations = {
  en: {
    home: "Home", news: "News", sports: "Sports",
    tv: "Live TV", radio: "Radio", movies: "Movies"
  },
  rw: {
    home: "Ahabanza", news: "Amakuru", sports: "Imikino",
    tv: "Televiziyo", radio: "Radiyo", movies: "Filime"
  },
  fr: {
    home: "Accueil", news: "Actualités", sports: "Sports",
    tv: "Télévision", radio: "Radio", movies: "Films"
  },
  sw: {
    home: "Nyumbani", news: "Habari", sports: "Michezo",
    tv: "Televisheni", radio: "Redio", movies: "Filamu"
  },
  es: {
    home: "Inicio", news: "Noticias", sports: "Deportes",
    tv: "Televisión", radio: "Radio", movies: "Películas"
  },
  pt: {
    home: "Início", news: "Notícias", sports: "Desporto",
    tv: "Televisão", radio: "Rádio", movies: "Filmes"
  },
  ar: {
    home: "الرئيسية", news: "الأخبار", sports: "رياضة",
    tv: "التلفزيون", radio: "راديو", movies: "أفلام"
  },
  de: {
    home: "Startseite", news: "Nachrichten", sports: "Sport",
    tv: "Fernsehen", radio: "Radio", movies: "Filme"
  },
  it: {
    home: "Home", news: "Notizie", sports: "Sport",
    tv: "Televisione", radio: "Radio", movies: "Film"
  },
  zh: {
    home: "首页", news: "新闻", sports: "体育",
    tv: "电视", radio: "广播", movies: "电影"
  },
  hi: {
    home: "होम", news: "समाचार", sports: "खेल",
    tv: "टीवी", radio: "रेडियो", movies: "फिल्में"
  },
  ja: {
    home: "ホーム", news: "ニュース", sports: "スポーツ",
    tv: "テレビ", radio: "ラジオ", movies: "映画"
  }
};

/* ---------------- HELPERS ---------------- */

function getElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(container, message) {
  if (!container) return;
  container.innerHTML =
    `<p class="empty-message">${safeText(message)}</p>`;
}

/* ---------------- NEWS ---------------- */

async function loadNews(category = "world") {
  state.newsCategory = category;

  const container = getElement("newsGrid", "newsContainer");
  if (container) showMessage(container, "Loading latest news...");

  const feed = CONFIG.feeds[category] || CONFIG.feeds.world;

  try {
    const response = await fetch(
      CONFIG.newsApi + encodeURIComponent(feed)
    );

    if (!response.ok) {
      throw new Error("News service unavailable");
    }

    const result = await response.json();

    if (result.status !== "ok" || !Array.isArray(result.items)) {
      throw new Error("No news returned");
    }

    state.news = result.items.map(item => ({
      title: item.title || "Untitled news",
      description: item.description || "",
      image: item.thumbnail || item.enclosure?.link || "",
      link: item.link || "",
      date: item.pubDate || "",
      author: item.author || "News source",
      category
    }));

    applyNewsFilters();

  } catch (error) {
    console.error("News error:", error);
    showMessage(
      container,
      "Amakuru ntashoboye kwinjira ubu. Ongera ugerageze nyuma."
    );
  }
}

function applyNewsFilters() {
  const search = state.search.toLowerCase();

  state.filteredNews = state.news.filter(item =>
    item.title.toLowerCase().includes(search) ||
    item.description.toLowerCase().includes(search)
  );

  state.newsPage = 1;
  renderNews();
}

function renderNews() {
  const container = getElement("newsGrid", "newsContainer");
  if (!container) return;

  const start = (state.newsPage - 1) * CONFIG.newsPerPage;
  const pageItems = state.filteredNews.slice(
    start,
    start + CONFIG.newsPerPage
  );

  if (!pageItems.length) {
    showMessage(container, "Nta makuru abonetse.");
    renderNewsPagination();
    return;
  }

  container.innerHTML = pageItems.map(item => `
    <article class="news-card">
      ${item.image ? `
        <img
          src="${safeText(item.image)}"
          alt="${safeText(item.title)}"
          loading="lazy"
          onerror="this.style.display='none'"
        >
      ` : ""}
      <div class="news-content">
        <small>${safeText(item.category.toUpperCase())}</small>
        <h3>${safeText(item.title)}</h3>
        <p>${safeText(item.description.replace(/<[^>]*>/g, "").slice(0, 220))}</p>
        <small>${safeText(item.date)}</small>
        <a href="${safeText(item.link)}"
           target="_blank"
           rel="noopener noreferrer">
          Read full story
        </a>
      </div>
    </article>
  `).join("");

  renderNewsPagination();
}

function renderNewsPagination() {
  const container = getElement(
    "newsPagination",
    "pagination"
  );

  if (!container) return;

  const totalPages = Math.ceil(
    state.filteredNews.length / CONFIG.newsPerPage
  );

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <button id="previousNewsPage"
      ${state.newsPage === 1 ? "disabled" : ""}>
      Previous
    </button>
    <span>Page ${state.newsPage} of ${totalPages}</span>
    <button id="nextNewsPage"
      ${state.newsPage >= totalPages ? "disabled" : ""}>
      Next
    </button>
  `;

  getElement("previousNewsPage")?.addEventListener("click", () => {
    if (state.newsPage > 1) {
      state.newsPage--;
      renderNews();
    }
  });

  getElement("nextNewsPage")?.addEventListener("click", () => {
    if (state.newsPage < totalPages) {
      state.newsPage++;
      renderNews();
    }
  });
}

/* ---------------- SPORTS ---------------- */

function loadSports() {
  loadNews("sports");

  const container = getElement("sportsGrid", "sportsContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="sports-info">
      <h3>Latest Sports News</h3>
      <p>Find sports updates in the News section under Sports.</p>
      <button id="openSportsNews">View Sports News</button>
    </div>
  `;

  getElement("openSportsNews")?.addEventListener("click", () => {
    loadNews("sports");
    showSection("news");
  });
}

/* ---------------- TV ---------------- */

function renderTV() {
  const container = getElement("tvChannels", "tvGrid");
  if (!container) return;

  container.innerHTML = tvChannels.map((channel, index) => `
    <article class="channel-card">
      <h3>${safeText(channel.name)}</h3>
      <p>${safeText(channel.country)} · ${safeText(channel.category)}</p>
      <button data-tv="${index}">Watch TV</button>
      <a href="${safeText(channel.officialUrl)}"
         target="_blank"
         rel="noopener noreferrer">
        Official website
      </a>
    </article>
  `).join("");

  container.querySelectorAll("[data-tv]").forEach(button => {
    button.addEventListener("click", () => {
      playTV(Number(button.dataset.tv));
    });
  });
}

function playTV(index) {
  const channel = tvChannels[index];
  if (!channel) return;

  const player = getElement("tvPlayer");
  const frame = getElement("tvOfficialFrame");
  const title = getElement("tvNowPlaying", "tvTitle");

  stopTV();

  if (title) title.textContent = channel.name;

  if (channel.streamUrl && player) {
    player.hidden = false;
    player.src = channel.streamUrl;
    player.controls = true;
    player.play().catch(error => {
      console.warn("TV playback error:", error);
    });

    if (frame) {
      frame.hidden = true;
      frame.src = "about:blank";
    }
    return;
  }

  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
    player.hidden = true;
  }

  if (frame) {
    frame.hidden = false;
    frame.src = channel.officialUrl;
  }
}

function stopTV() {
  const player = getElement("tvPlayer");
  const frame = getElement("tvOfficialFrame");

  if (state.currentHls) {
    state.currentHls.destroy();
    state.currentHls = null;
  }

  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
  }

  if (frame) {
    frame.src = "about:blank";
  }
}

/* ---------------- RADIO ---------------- */

function renderRadio() {
  const container = getElement("radioChannels", "radioGrid");
  if (!container) return;

  container.innerHTML = radioChannels.map((channel, index) => `
    <article class="channel-card">
      <h3>${safeText(channel.name)}</h3>
      <p>${safeText(channel.country)}</p>
      <button data-radio="${index}">Listen Now</button>
      <a href="${safeText(channel.officialUrl)}"
         target="_blank"
         rel="noopener noreferrer">
        Official website
      </a>
    </article>
  `).join("");

  container.querySelectorAll("[data-radio]").forEach(button => {
    button.addEventListener("click", () => {
      playRadio(Number(button.dataset.radio));
    });
  });
}

function playRadio(index) {
  const channel = radioChannels[index];
  if (!channel) return;

  const player = getElement("radioPlayer");
  const frame = getElement("radioOfficialFrame");
  const title = getElement("radioNowPlaying", "radioTitle");

  if (title) title.textContent = channel.name;

  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
  }

  if (frame) {
    frame.src = "about:blank";
    frame.hidden = true;
  }

  if (channel.streamUrl && player) {
    player.hidden = false;
    player.src = channel.streamUrl;
    player.load();

    player.play().catch(error => {
      console.error("Radio playback error:", error);
      showMessage(
        getElement("radioStatus"),
        "Radio ntangiye. Reba niba browser yemera iyi stream."
      );
    });
    return;
  }

  if (player) player.hidden = true;

  if (frame) {
    frame.hidden = false;
    frame.src = channel.officialUrl;
  }
}

/* ---------------- MOVIES ---------------- */

function renderMovies() {
  const container = getElement("movieGrid", "moviesGrid");
  if (!container) return;

  container.innerHTML = movies.map((movie, index) => `
    <article class="movie-card">
      <img
        src="${safeText(movie.image)}"
        alt="${safeText(movie.title)}"
        loading="lazy"
      >
      <h3>${safeText(movie.title)}</h3>
      <p>${safeText(movie.year)} · ${safeText(movie.type)}</p>
      <button data-movie="${index}">Watch Movie</button>
    </article>
  `).join("");

  container.querySelectorAll("[data-movie]").forEach(button => {
    button.addEventListener("click", () => {
      playMovie(Number(button.dataset.movie));
    });
  });
}

function playMovie(index) {
  const movie = movies[index];
  const viewer = getElement("movieViewer", "moviePlayer");

  if (!movie || !viewer) return;

  viewer.innerHTML = `
    <h3>${safeText(movie.title)}</h3>
    <iframe
      src="${safeText(movie.video)}"
      title="${safeText(movie.title)}"
      width="100%"
      height="450"
      allow="accelerometer; autoplay; clipboard-write;
      encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy">
    </iframe>
  `;

  viewer.scrollIntoView({ behavior: "smooth" });
}

/* ---------------- NAVIGATION ---------------- */

function showSection(sectionName) {
  const sections = document.querySelectorAll(
    "main section, .page-section"
  );

  sections.forEach(section => {
    section.hidden = true;
  });

  const target = document.getElementById(sectionName);

  if (target) {
    target.hidden = false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.querySelectorAll("[data-section]").forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.section === sectionName
    );
  });

  if (sectionName === "tv") renderTV();
  if (sectionName === "radio") renderRadio();
  if (sectionName === "movies") renderMovies();
  if (sectionName === "sports") loadSports();
}

function setupNavigation() {
  document.querySelectorAll("[data-section]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });
}

/* ---------------- LANGUAGES ---------------- */

function setupLanguages() {
  const select = getElement("languageSelect", "language");

  if (!select) return;

  select.innerHTML = `
    <option value="en">English</option>
    <option value="rw">Kinyarwanda</option>
    <option value="fr">Français</option>
    <option value="sw">Kiswahili</option>
    <option value="es">Español</option>
    <option value="pt">Português</option>
    <option value="ar">العربية</option>
    <option value="de">Deutsch</option>
    <option value="it">Italiano</option>
    <option value="zh">中文</option>
    <option value="hi">हिन्दी</option>
    <option value="ja">日本語</option>
  `;

  select.value = state.currentLanguage;

  select.addEventListener("change", () => {
    state.currentLanguage = select.value;
    translateNavigation();
  });
}

function translateNavigation() {
  const words = translations[state.currentLanguage] || translations.en;

  document.querySelectorAll("[data-translate]").forEach(element => {
    const key = element.dataset.translate;
    if (words[key]) element.textContent = words[key];
  });
}

/* ---------------- SEARCH ---------------- */

function setupSearch() {
  const search = getElement("newsSearch", "searchNews");

  if (!search) return;

  search.addEventListener("input", () => {
    state.search = search.value;
    applyNewsFilters();
  });
}

/* ---------------- NEWS CATEGORY BUTTONS ---------------- */

function setupNewsCategories() {
  document.querySelectorAll("[data-news-category]").forEach(button => {
    button.addEventListener("click", () => {
      const category = button.dataset.newsCategory;
      if (CONFIG.feeds[category]) {
        loadNews(category);
      }
    });
  });
}

/* ---------------- REFRESH ---------------- */

function setupRefresh() {
  getElement("refreshNews")?.addEventListener("click", () => {
    loadNews(state.newsCategory);
  });
}

/* ---------------- INITIALIZE APP ---------------- */

function initializeApp() {
  console.log("ITT-TV application started.");

  setupNavigation();
  setupLanguages();
  setupSearch();
  setupNewsCategories();
  setupRefresh();

  renderTV();
  renderRadio();
  renderMovies();

  loadNews("world");

  const home = getElement("home");
  if (home) {
    document.querySelectorAll(
      "main section, .page-section"
    ).forEach(section => {
      section.hidden = section.id !== "home";
    });
  }

  translateNavigation();
}

/* ---------------- START ---------------- */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
