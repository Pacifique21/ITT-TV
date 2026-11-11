
"use strict";

/* =====================================================
   ITT NEWS - COMPLETE APPLICATION
   Compatible with the new ITT-TV index.html
   News | Sports | TV | Radio | Movies | 12 Languages
===================================================== */

/* ================= CONFIGURATION ================= */

const CONFIG = {
  newsPerPage: 10,
  rssService: "https://api.rss2json.com/v1/api.json?rss_url=",

  feeds: {
    world: "https://feeds.bbci.co.uk/news/world/rss.xml",
    africa: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    business: "https://feeds.bbci.co.uk/news/business/rss.xml",
    technology: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    sports: "https://feeds.bbci.co.uk/sport/rss.xml"
  }
};

/* ================= APP STATE ================= */

const state = {
  news: [],
  filteredNews: [],
  newsPage: 1,
  newsCategory: "world",
  newsSearch: "",
  movieSearch: "",
  movieCategory: "all",
  language: "en",
  currentHls: null
};

/* ================= TV CHANNELS ================= */

const tvChannels = [
  {
    name: "RBA TV",
    country: "Rwanda",
    streamUrl: "",
    officialUrl: "https://www.rba.co.rw/tv"
  },
  {
    name: "TV10",
    country: "Rwanda",
    streamUrl: "",
    officialUrl: "https://radiotv10.rw/tvpage/"
  },
  {
    name: "Flash TV",
    country: "Rwanda",
    streamUrl: "",
    officialUrl: "https://flash.rw/flash-tv-live/"
  }
];

/* ================= RADIO CHANNELS ================= */

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

/* ================= MOVIES ================= */

const movies = [
  {
    title: "Big Buck Bunny",
    year: "2008",
    category: "Animation",
    image: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    video: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
    description: "An animated short film."
  },
  {
    title: "Sintel",
    year: "2010",
    category: "Animation",
    image: "https://i.ytimg.com/vi/eRsGyueVLvQ/hqdefault.jpg",
    video: "https://www.youtube-nocookie.com/embed/eRsGyueVLvQ",
    description: "An animated fantasy short film."
  },
  {
    title: "Tears of Steel",
    year: "2012",
    category: "Science Fiction",
    image: "https://i.ytimg.com/vi/R6MlUcmOul8/hqdefault.jpg",
    video: "https://www.youtube-nocookie.com/embed/R6MlUcmOul8",
    description: "A science-fiction short film."
  }
];

/* ================= TRANSLATIONS ================= */

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

/* ================= HELPERS ================= */

function $(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function cleanDescription(value) {
  const temporary = document.createElement("div");
  temporary.innerHTML = value || "";
  return temporary.textContent || temporary.innerText || "";
}

function setMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

/* =====================================================
   NAVIGATION
===================================================== */

function showSection(sectionName, updateHash = true) {
  const sections = document.querySelectorAll(".page-section");

  sections.forEach(section => {
    section.hidden = section.id !== sectionName;
  });

  const target = $(sectionName);

  if (!target) {
    console.error("Section not found:", sectionName);
    return;
  }

  document.querySelectorAll("[data-section]").forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.section === sectionName
    );
  });

  if (updateHash && location.hash !== "#" + sectionName) {
    history.replaceState(null, "", "#" + sectionName);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (sectionName === "news" && state.news.length === 0) {
    loadNews(state.newsCategory);
  }

  if (sectionName === "sports" && state.newsCategory !== "sports") {
    loadSports();
  }

  if (sectionName === "tv") renderTV();
  if (sectionName === "radio") renderRadio();
  if (sectionName === "movies") renderMovies();
}

function setupNavigation() {
  document.querySelectorAll("[data-section]").forEach(link => {
    link.addEventListener("click", event => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });
}

/* =====================================================
   NEWS
===================================================== */

async function loadNews(category = "world") {
  state.newsCategory = category;

  const grid = $("newsGrid");
  const status = $("newsStatus");

  if (grid) grid.innerHTML = "";
  if (status) status.textContent = "Loading latest news...";

  const feed = CONFIG.feeds[category] || CONFIG.feeds.world;
  const url = CONFIG.rssService + encodeURIComponent(feed);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("News service returned an error.");
    }

    const result = await response.json();

    if (result.status !== "ok" || !Array.isArray(result.items)) {
      throw new Error("No news articles received.");
    }

    state.news = result.items.map(item => ({
      title: item.title || "Untitled article",
      description: cleanDescription(item.description),
      image: item.thumbnail || item.enclosure?.link || "",
      link: item.link || "",
      date: item.pubDate || "",
      category
    }));

    state.newsSearch = $("newsSearch")?.value.trim().toLowerCase() || "";

    applyNewsSearch();

    if (status) {
      status.textContent = state.news.length
        ? `${state.news.length} news articles available.`
        : "No news articles found.";
    }

    if (category === "sports") {
      renderSports();
    }

  } catch (error) {
    console.error("News loading error:", error);

    if (status) {
      status.textContent =
        "Unable to load news right now. Please refresh and try again.";
    }

    if (grid) {
      grid.innerHTML = `
        <p class="muted">
          News service is temporarily unavailable.
        </p>
      `;
    }

    if (category === "sports") {
      const sportsGrid = $("sportsGrid");
      if (sportsGrid) {
        sportsGrid.textContent = "Sports news is temporarily unavailable.";
      }
    }
  }
}

function applyNewsSearch() {
  const search = state.newsSearch;

  state.filteredNews = state.news.filter(item =>
    item.title.toLowerCase().includes(search) ||
    item.description.toLowerCase().includes(search)
  );

  state.newsPage = 1;
  renderNews();
}

function renderNews() {
  const grid = $("newsGrid");
  if (!grid) return;

  const start = (state.newsPage - 1) * CONFIG.newsPerPage;

  const items = state.filteredNews.slice(
    start,
    start + CONFIG.newsPerPage
  );

  if (!items.length) {
    grid.innerHTML = `<p class="muted">No news found.</p>`;
    renderPagination();
    return;
  }

  grid.innerHTML = items.map(item => `
    <article class="news-card">

      ${item.image ? `
        <img
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.title)}"
          loading="lazy"
          onerror="this.style.display='none'"
        >
      ` : ""}

      <div class="news-content">

        <small>${escapeHTML(item.category.toUpperCase())}</small>

        <h3>${escapeHTML(item.title)}</h3>

        <p>
          ${escapeHTML(item.description.slice(0, 220))}
        </p>

        <small>${escapeHTML(item.date)}</small>

        ${item.link ? `
          <a
            href="${escapeHTML(item.link)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read full story
          </a>
        ` : ""}

      </div>
    </article>
  `).join("");

  renderPagination();
}

function renderPagination() {
  const container = $("newsPagination");
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

    <span>
      Page ${state.newsPage} of ${totalPages}
    </span>

    <button id="nextNewsPage"
      ${state.newsPage >= totalPages ? "disabled" : ""}>
      Next
    </button>
  `;

  $("previousNewsPage")?.addEventListener("click", () => {
    if (state.newsPage > 1) {
      state.newsPage--;
      renderNews();
    }
  });

  $("nextNewsPage")?.addEventListener("click", () => {
    if (state.newsPage < totalPages) {
      state.newsPage++;
      renderNews();
    }
  });
}

function setupNewsControls() {
  document.querySelectorAll("[data-news-category]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-news-category]").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");
      loadNews(button.dataset.newsCategory);
    });
  });

  $("newsSearch")?.addEventListener("input", event => {
    state.newsSearch = event.target.value.toLowerCase().trim();
    applyNewsSearch();
  });

  $("refreshNews")?.addEventListener("click", () => {
    loadNews(state.newsCategory);
  });
}

/* =====================================================
   SPORTS
===================================================== */

function renderSports() {
  const container = $("sportsGrid");
  if (!container) return;

  const items = state.news.slice(0, 10);

  if (!items.length) {
    container.innerHTML = `<p class="muted">No sports news available.</p>`;
    return;
  }

  container.innerHTML = items.map(item => `
    <article class="news-card">
      ${item.image ? `
        <img
          src="${escapeHTML(item.image)}"
          alt="${escapeHTML(item.title)}"
          loading="lazy"
        >
      ` : ""}

      <div class="news-content">
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description.slice(0, 180))}</p>
        ${item.link ? `
          <a href="${escapeHTML(item.link)}"
             target="_blank"
             rel="noopener noreferrer">
            Read sports news
          </a>
        ` : ""}
      </div>
    </article>
  `).join("");
}

function loadSports() {
  loadNews("sports");
}

$("openSportsNews")?.addEventListener("click", () => {
  showSection("news");
  loadNews("sports");
});

/* =====================================================
   TV PLAYER
===================================================== */

function stopTV() {
  const player = $("tvPlayer");
  const frame = $("tvOfficialFrame");

  if (state.currentHls) {
    state.currentHls.destroy();
    state.currentHls = null;
  }

  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
    player.hidden = true;
  }

  if (frame) {
    frame.src = "about:blank";
    frame.hidden = true;
  }
}

function renderTV() {
  const container = $("tvChannels");
  if (!container) return;

  container.innerHTML = tvChannels.map((channel, index) => `
    <article class="channel-card">

      <h3>${escapeHTML(channel.name)}</h3>

      <p>${escapeHTML(channel.country)}</p>

      <button type="button" data-tv="${index}">
        Watch TV
      </button>

      <a
        href="${escapeHTML(channel.officialUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
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

  stopTV();

  const player = $("tvPlayer");
  const frame = $("tvOfficialFrame");

  setMessage("tvNowPlaying", channel.name);
  setMessage("tvPlayerMessage", "Opening channel...");

  if (channel.streamUrl && player) {
    player.hidden = false;
    player.src = channel.streamUrl;

    const isHls = channel.streamUrl.includes(".m3u8");

    if (isHls && window.Hls && Hls.isSupported()) {
      state.currentHls = new Hls();
      state.currentHls.loadSource(channel.streamUrl);
      state.currentHls.attachMedia(player);

      state.currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
        player.play().catch(console.warn);
      });

      state.currentHls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setMessage("tvPlayerMessage", "Unable to play this TV stream.");
        }
      });

    } else {
      player.play().catch(error => {
        console.error("TV playback error:", error);
        setMessage("tvPlayerMessage", "TV playback failed.");
      });
    }

    if (frame) frame.hidden = true;
    return;
  }

  if (frame) {
    frame.hidden = false;
    frame.src = channel.officialUrl;
    setMessage(
      "tvPlayerMessage",
      "If the broadcaster blocks embedding, open its official website."
    );
  }
}

/* =====================================================
   RADIO PLAYER
===================================================== */

function renderRadio() {
  const container = $("radioChannels");
  if (!container) return;

  container.innerHTML = radioChannels.map((channel, index) => `
    <article class="channel-card">

      <h3>${escapeHTML(channel.name)}</h3>

      <p>${escapeHTML(channel.country)}</p>

      <button type="button" data-radio="${index}">
        Listen Now
      </button>

      <a
        href="${escapeHTML(channel.officialUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
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

  const player = $("radioPlayer");
  const frame = $("radioOfficialFrame");

  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
    player.hidden = false;
  }

  if (frame) {
    frame.src = "about:blank";
    frame.hidden = true;
  }

  setMessage("radioNowPlaying", channel.name);
  setMessage("radioPlayerMessage", "Connecting to radio...");

  if (channel.streamUrl && player) {
    player.src = channel.streamUrl;
    player.load();

    player.play().then(() => {
      setMessage("radioPlayerMessage", "Radio is playing.");
    }).catch(error => {
      console.error("Radio playback error:", error);

      setMessage(
        "radioPlayerMessage",
        "Playback could not start. Press the play button or check the stream."
      );
    });

    return;
  }

  if (player) player.hidden = true;

  if (frame) {
    frame.hidden = false;
    frame.src = channel.officialUrl;
  }

  setMessage(
    "radioPlayerMessage",
    "This station uses its official website. Embedding may be restricted."
  );
}

/* =====================================================
   MOVIES
===================================================== */

function renderMovies() {
  const container = $("movieGrid");
  if (!container) return;

  const filtered = movies.filter(movie => {
    const matchesSearch = movie.title.toLowerCase()
      .includes(state.movieSearch);

    const matchesCategory =
      state.movieCategory === "all" ||
      movie.category === state.movieCategory;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    container.innerHTML = `<p class="muted">No movies found.</p>`;
    return;
  }

  container.innerHTML = filtered.map(movie => {
    const index = movies.indexOf(movie);

    return `
      <article class="movie-card">

        <img
          src="${escapeHTML(movie.image)}"
          alt="${escapeHTML(movie.title)}"
          loading="lazy"
        >

        <h3>${escapeHTML(movie.title)}</h3>

        <p>
          ${escapeHTML(movie.year)}
          ·
          ${escapeHTML(movie.category)}
        </p>

        <button type="button" data-movie="${index}">
          Watch Movie
        </button>

      </article>
    `;
  }).join("");

  container.querySelectorAll("[data-movie]").forEach(button => {
    button.addEventListener("click", () => {
      playMovie(Number(button.dataset.movie));
    });
  });
}

function playMovie(index) {
  const movie = movies[index];
  if (!movie) return;

  const viewer = $("movieViewer");
  const frame = $("movieFrame");

  if (!viewer || !frame) return;

  $("movieViewerTitle").textContent = movie.title;
  $("movieViewerDescription").textContent = movie.description;

  frame.innerHTML = `
    <iframe
      src="${escapeHTML(movie.video)}"
      title="${escapeHTML(movie.title)}"
      width="100%"
      height="450"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy">
    </iframe>
  `;

  viewer.hidden = false;
  viewer.scrollIntoView({ behavior: "smooth" });
}

function closeMovie() {
  const viewer = $("movieViewer");
  const frame = $("movieFrame");

  if (frame) frame.innerHTML = "";
  if (viewer) viewer.hidden = true;
}

function setupMovieControls() {
  $("movieSearch")?.addEventListener("input", event => {
    state.movieSearch = event.target.value.toLowerCase().trim();
    renderMovies();
  });

  $("movieCategory")?.addEventListener("change", event => {
    state.movieCategory = event.target.value;
    renderMovies();
  });

  $("closeMovie")?.addEventListener("click", closeMovie);
}

/* =====================================================
   LANGUAGES
===================================================== */

function setupLanguages() {
  const select = $("languageSelect");
  if (!select) return;

  select.value = state.language;

  select.addEventListener("change", event => {
    state.language = event.target.value;
    translateNavigation();
  });
}

function translateNavigation() {
  const words = translations[state.language] || translations.en;

  document.querySelectorAll(".nav [data-section]").forEach(link => {
    const key = link.dataset.section;

    if (words[key]) {
      link.textContent = words[key];
    }
  });
}

/* =====================================================
   FOOTER AND TICKER
===================================================== */

function setupFooter() {
  const year = $("currentYear");
  if (year) year.textContent = new Date().getFullYear();
}

function setupTicker() {
  const ticker = $("tickerText");
  if (!ticker) return;

  ticker.textContent = "Welcome to ITT NEWS - World Media.";
}

/* =====================================================
   START APPLICATION
===================================================== */

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

  showSection(
    location.hash.replace("#", "") || "home",
    false
  );

  loadNews("world");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
