
// ======================================================
// ITT-TV | COMPLETE APP.JS
// Clean version - no duplicate functions or syntax errors
// ======================================================
"use strict";

const $ = (id) => document.getElementById(id);

const state = {
  tv: [],
  tvRegular: [],
  movieChannels: [],
  radios: [],
  movies: [],
  favorites: [],
  recent: [],
  currentTV: null,
  currentRadio: null,
  currentMovie: null,
  hls: null,
  tvLimit: 40,
  radioLimit: 40,
  movieLimit: 24,
  moviePage: 1,
  movieQuery: "",
  radioRequest: 0,
  movieRequest: 0
};

// ======================================================
// CONFIG
// ======================================================

const PLAYLISTS = {
  tv: "https://iptv-org.github.io/iptv/index.m3u",
  movies: "https://iptv-org.github.io/iptv/categories/movies.m3u"
};

const RADIO_SERVERS = [
  "https://all.api.radio-browser.info",
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];

const STORAGE = {
  favorites: "itt-tv-favorites-v3",
  recent: "itt-tv-recent-v3"
};

// ======================================================
// UTILITIES
// ======================================================

function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function safeURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {}
  return "";
}

function toast(message) {
  const el = $("toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

function setMessage(id, message) {
  const el = $(id);
  if (el) el.textContent = message;
}

function setCount(id, number) {
  const el = $(id);
  if (el) el.textContent = Number(number || 0).toLocaleString();
}

function safeImage(url) {
  return safeURL(url) || "";
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchWithTimeout(url, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ======================================================
// STORAGE
// ======================================================

function loadStorage() {
  try {
    state.favorites = JSON.parse(
      localStorage.getItem(STORAGE.favorites) || "[]"
    );
  } catch {
    state.favorites = [];
  }

  try {
    state.recent = JSON.parse(
      localStorage.getItem(STORAGE.recent) || "[]"
    );
  } catch {
    state.recent = [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(
      STORAGE.favorites,
      JSON.stringify(state.favorites)
    );
  } catch {}
}

function saveRecent() {
  try {
    localStorage.setItem(
      STORAGE.recent,
      JSON.stringify(state.recent.slice(0, 30))
    );
  } catch {}
}

function isFavorite(item) {
  return state.favorites.some((f) =>
    f.id === item.id && f.type === item.type
  );
}

function toggleFavorite(item) {
  const exists = isFavorite(item);

  if (exists) {
    state.favorites = state.favorites.filter((f) =>
      !(f.id === item.id && f.type === item.type)
    );
    toast("Removed from favorites");
  } else {
    state.favorites.unshift(item);
    toast("Added to favorites");
  }

  saveFavorites();
  renderFavorites();
  renderTV();
  renderRadio();
  renderMovies();
}

function addRecent(item) {
  state.recent = [
    item,
    ...state.recent.filter((r) =>
      !(r.id === item.id && r.type === item.type)
    )
  ].slice(0, 30);

  saveRecent();
  renderRecent();
}

// ======================================================
// NAVIGATION
// ======================================================

function showPage(name) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === name + "Page");
  });

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === name
    );
  });

  const sidebar = $("sidebar");
  if (sidebar) sidebar.classList.remove("open");

  if (name === "tv") renderTV();
  if (name === "radio") renderRadio();
  if (name === "movies") renderMovies();
  if (name === "favorites") renderFavorites();
  if (name === "recent") renderRecent();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  $("menuToggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });
}

// ======================================================
// CARD BUILDER
// ======================================================

function makeCard(item) {
  const favorite = isFavorite(item);
  const image = safeImage(item.image);

  return `
    <article class="media-card" data-item-id="${safeText(item.id)}">
      <div class="media-card-image">
        ${image
          ? `<img src="${safeText(image)}"
               alt="${safeText(item.name)}"
               loading="lazy"
               onerror="this.style.display='none'">`
          : ""}
        <div class="card-fallback">
          ${safeText((item.name || "?").slice(0, 1).toUpperCase())}
        </div>
        <button class="favorite-button ${favorite ? "favorited" : ""}"
                data-favorite="${safeText(item.id)}"
                title="Favorite">
          ${favorite ? "♥" : "♡"}
        </button>
      </div>

      <div class="media-card-info">
        <h3>${safeText(item.name)}</h3>
        <p>${safeText(item.description || item.country || item.category || "")}</p>
        <button class="play-card-button"
                data-play="${safeText(item.id)}"
                data-type="${safeText(item.type)}">
          ▶ Play
        </button>
      </div>
    </article>
  `;
}

function renderGrid(id, items) {
  const container = $(id);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No content found.</p>`;
    return;
  }

  container.innerHTML = items.map(makeCard).join("");
}

// ======================================================
// M3U PLAYLIST PARSER
// ======================================================

function parsePlaylist(text, type = "tv") {
  const lines = text.split(/\r?\n/);
  const result = [];
  let current = {};

  for (const line of lines) {
    const value = line.trim();

    if (value.startsWith("#EXTINF")) {
      current = {};

      const name = value.split(",").slice(1).join(",").trim();
      current.name = name || "Unknown channel";

      const logo = value.match(/tvg-logo="([^"]*)"/i);
      const country = value.match(/tvg-country="([^"]*)"/i);
      const category = value.match(/group-title="([^"]*)"/i);

      current.image = logo ? logo[1] : "";
      current.country = country ? country[1] : "";
      current.category = category ? category[1] : "";
    } else if (
      value &&
      !value.startsWith("#") &&
      current.name
    ) {
      current.url = value;
      current.type = type;
      current.id = type + "-" + result.length + "-" +
        normalizeName(current.name).replace(/\s+/g, "-");

      result.push(current);
      current = {};
    }
  }

  return result;
}

async function fetchPlaylist(url, type) {
  const response = await fetchWithTimeout(url, 20000);
  const text = await response.text();
  return parsePlaylist(text, type);
}

// ======================================================
// TV
// ======================================================

async function loadTV() {
  setMessage("tvMessage", "Loading television channels...");
  setMessage("tvPlaceholder", "Loading TV channels...");

  try {
    const channels = await fetchPlaylist(PLAYLISTS.tv, "tv");

    state.tvRegular = channels.filter((channel) =>
      !/movie|cinema|film/i.test(channel.category || "")
    );

    state.tv = state.tvRegular;
    setCount("totalTV", state.tv.length);
    populateTVFilters();
    renderTV();

    setMessage("tvMessage", "");
    setMessage("tvPlaceholder", "");
    renderHome();
  } catch (error) {
    console.error("TV loading error:", error);
    setMessage("tvMessage", "TV channels could not be loaded. Please retry.");
  }
}

async function loadMovieChannels() {
  setMessage("movieChannelsMessage", "Loading movie channels...");

  try {
    state.movieChannels = await fetchPlaylist(
      PLAYLISTS.movies,
      "movie-channel"
    );

    renderMovieChannels();
    setMessage("movieChannelsMessage", "");
  } catch (error) {
    console.error("Movie channel error:", error);
    setMessage(
      "movieChannelsMessage",
      "Movie channels could not be loaded."
    );
  }
}

function populateTVFilters() {
  const countrySelect = $("tvCountry");
  const categorySelect = $("tvCategory");

  if (!countrySelect || !categorySelect) return;

  const countries = [...new Set(
    state.tv.map((c) => c.country).filter(Boolean)
  )].sort();

  const categories = [...new Set(
    state.tv.map((c) => c.category).filter(Boolean)
  )].sort();

  countrySelect.innerHTML = `<option value="">All countries</option>` +
    countries.map((c) =>
      `<option value="${safeText(c)}">${safeText(c)}</option>`
    ).join("");

  categorySelect.innerHTML = `<option value="">All categories</option>` +
    categories.map((c) =>
      `<option value="${safeText(c)}">${safeText(c)}</option>`
    ).join("");
}

function getFilteredTV() {
  const query = normalizeName($("tvSearch")?.value);
  const country = $("tvCountry")?.value || "";
  const category = $("tvCategory")?.value || "";
  const sort = $("tvSort")?.value || "name";

  let list = state.tv.filter((channel) => {
    const matchesSearch = normalizeName(channel.name).includes(query);
    const matchesCountry = !country || channel.country === country;
    const matchesCategory = !category || channel.category === category;

    return matchesSearch && matchesCountry && matchesCategory;
  });

  if (sort === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "country") {
    list.sort((a, b) => (a.country || "").localeCompare(b.country || ""));
  }

  return list;
}

function renderTV() {
  const list = getFilteredTV();
  const limited = list.slice(0, state.tvLimit);

  renderGrid("tvGrid", limited);
  setCount("tvResultCount", list.length);

  const more = $("moreChannels");
  if (more) more.style.display = list.length > state.tvLimit ? "block" : "none";
}

function renderMovieChannels() {
  renderGrid("movieChannelsGrid", state.movieChannels.slice(0, 60));
}

// ======================================================
// HLS PLAYER
// ======================================================

function loadHLS() {
  if (window.Hls) return Promise.resolve();
  if (state.hlsScriptPromise) return state.hlsScriptPromise;

  state.hlsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("HLS script failed"));
    document.head.appendChild(script);
  });

  return state.hlsScriptPromise;
}

function stopHLS() {
  if (state.hls) {
    try {
      state.hls.destroy();
    } catch {}
    state.hls = null;
  }
}

async function playVideoStream(url, videoId, messageId) {
  const video = $(videoId);
  if (!video) return;

  const stream = safeURL(url);
  if (!stream) {
    setMessage(messageId, "Invalid stream URL.");
    return;
  }

  stopHLS();
  video.pause();
  video.removeAttribute("src");
  video.load();

  setMessage(messageId, "Connecting to stream...");

  try {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream;
    } else {
      await loadHLS();

      if (window.Hls && Hls.isSupported()) {
        state.hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });

        state.hls.loadSource(stream);
        state.hls.attachMedia(video);

        state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {
            setMessage(messageId, "Press Play to start.");
          });
        });

        state.hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            setMessage(messageId, "Stream error. Try another channel.");
            stopHLS();
          }
        });
        return;
      } else {
        video.src = stream;
      }
    }

    video.play().catch(() => {
      setMessage(messageId, "Press Play to start.");
    });
  } catch (error) {
    console.error(error);
    setMessage(messageId, "This stream could not be played.");
  }
}

function playTV(channel) {
  state.currentTV = channel;
  addRecent(channel);

  const panel = $("tvPlaceholder");
  if (panel) panel.style.display = "none";

  const video = $("tvVideo");
  if (video) video.style.display = "block";

  const title = $("tvNowPlaying");
  if (title) title.textContent = channel.name;

  playVideoStream(channel.url, "tvVideo", "tvMessage");

  const fav = $("playerFavorite");
  if (fav) {
    fav.onclick = () => toggleFavorite(channel);
    fav.textContent = isFavorite(channel) ? "♥" : "♡";
  }
}

// ======================================================
// RADIO
// ======================================================

async function loadRadio() {
  const requestNumber = ++state.radioRequest;
  setMessage("radioMessage", "Loading radio stations...");

  const params = new URLSearchParams({
    limit: "500",
    order: "clickcount",
    reverse: "true",
    hidebroken: "true"
  });

  let stations = null;

  for (const server of RADIO_SERVERS) {
    try {
      const response = await fetchWithTimeout(
        `${server}/json/stations/search?${params.toString()}`,
        12000
      );

      const data = await response.json();

      if (Array.isArray(data) && data.length) {
        stations = data;
        break;
      }
    } catch (error) {
      console.warn("Radio server unavailable:", server);
    }
  }

  if (requestNumber !== state.radioRequest) return;

  if (!stations) {
    state.radios = [];
    renderRadio();
    setMessage("radioMessage", "Radio list unavailable. Please try again.");
    return;
  }

  state.radios = uniqueBy(
    stations.filter((station) =>
      station.name &&
      (station.url_resolved || station.url) &&
      station.lastcheckok !== 0
    ).map((station, index) => ({
      id: "radio-" + (station.stationuuid || index),
      type: "radio",
      name: station.name,
      url: station.url_resolved || station.url,
      image: station.favicon || "",
      country: station.country || "",
      language: station.language || "",
      category: station.tags || "",
      description: station.language || station.country || ""
    })),
    (station) => station.url
  );

  populateRadioFilters();
  renderRadio();
  setCount("totalRadio", state.radios.length);
  setMessage("radioMessage", "");
  renderHome();
}

function populateRadioFilters() {
  const countrySelect = $("radioCountry");
  const languageSelect = $("radioLanguage");

  if (!countrySelect || !languageSelect) return;

  const countries = [...new Set(
    state.radios.map((r) => r.country).filter(Boolean)
  )].sort();

  const languages = [...new Set(
    state.radios.map((r) => r.language).filter(Boolean)
  )].sort();

  countrySelect.innerHTML = `<option value="">All countries</option>` +
    countries.map((c) =>
      `<option value="${safeText(c)}">${safeText(c)}</option>`
    ).join("");

  languageSelect.innerHTML = `<option value="">All languages</option>` +
    languages.map((l) =>
      `<option value="${safeText(l)}">${safeText(l)}</option>`
    ).join("");
}

function getFilteredRadio() {
  const query = normalizeName($("radioSearch")?.value);
  const country = $("radioCountry")?.value || "";
  const language = $("radioLanguage")?.value || "";

  return state.radios.filter((radio) => {
    const text = normalizeName(
      radio.name + " " + radio.country + " " +
      radio.language + " " + radio.category
    );

    return text.includes(query) &&
      (!country || radio.country === country) &&
      (!language || radio.language === language);
  });
}

function renderRadio() {
  const list = getFilteredRadio();
  const limited = list.slice(0, state.radioLimit);

  renderGrid("radioGrid", limited);
  setCount("radioResultCount", list.length);

  const more = $("moreRadio");
  if (more) more.style.display = list.length > state.radioLimit ? "block" : "none";
}

function playRadio(radio) {
  state.currentRadio = radio;
  addRecent(radio);

  const player = $("radioPlayer");
  if (!player) return;

  player.src = safeURL(radio.url);
  player.load();

  const name = $("radioNowPlaying");
  if (name) name.textContent = radio.name;

  const details = $("radioDetails");
  if (details) details.textContent =
    [radio.country, radio.language].filter(Boolean).join(" • ");

  player.play().catch(() => {
    setMessage("radioMessage", "Press Play or try another station.");
  });
}

// ======================================================
// MOVIES
// Public-domain / freely available catalog search
// ======================================================

async function searchMovies(query = "") {
  const request = ++state.movieRequest;
  state.movieQuery = query.trim();
  state.moviePage = 1;

  setMessage("movieMessage", "Searching movies...");

  const searchTerm = state.movieQuery || "public domain films";

  const params = new URLSearchParams({
    q: `title:(${searchTerm}) AND mediatype:movies`,
    fl: ["identifier", "title", "year", "description"].join(","),
    rows: "48",
    page: "1",
    output: "json"
  });

  try {
    const response = await fetchWithTimeout(
      "https://archive.org/advancedsearch.php?" + params.toString(),
      20000
    );

    const data = await response.json();

    if (request !== state.movieRequest) return;

    const docs = data.response?.docs || [];

    state.movies = docs.map((movie) => ({
      id: "movie-" + movie.identifier,
      type: "movie",
      name: movie.title || movie.identifier,
      url: "https://archive.org/details/" + encodeURIComponent(movie.identifier),
      image: "https://archive.org/services/img/" +
        encodeURIComponent(movie.identifier),
      description: movie.year ? String(movie.year) : "Film",
      identifier: movie.identifier
    }));

    renderMovies();
    setCount("totalMovies", state.movies.length);
    setMessage("movieMessage", "");
  } catch (error) {
    console.error("Movie search error:", error);
    setMessage("movieMessage", "Movie search failed. Please try again.");
  }
}

function renderMovies() {
  const query = normalizeName($("movieSearch")?.value);

  const list = state.movies.filter((movie) =>
    normalizeName(movie.name + " " + movie.description).includes(query)
  );

  renderGrid("movieGrid", list.slice(0, state.movieLimit));
  setCount("movieResultCount", list.length);

  const more = $("moreMovies");
  if (more) more.style.display = list.length > state.movieLimit ? "block" : "none";
}

async function playMovie(movie) {
  state.currentMovie = movie;
  addRecent(movie);

  const panel = $("moviePlayerPanel");
  if (panel) panel.style.display = "block";

  const title = $("movieNowPlaying");
  if (title) title.textContent = movie.name;

  const video = $("movieVideo");
  if (!video) {
    window.open(movie.url, "_blank", "noopener");
    return;
  }

  setMessage("movieMessage", "Opening movie...");

  try {
    const response = await fetchWithTimeout(
      "https://archive.org/metadata/" +
        encodeURIComponent(movie.identifier),
      15000
    );

    const metadata = await response.json();
    const files = metadata.files || [];

    const playable = files.find((file) =>
      file.format === "h.264" &&
      file.name &&
      /\.mp4$/i.test(file.name)
    ) || files.find((file) =>
      file.name && /\.mp4$/i.test(file.name)
    );

    if (!playable) {
      setMessage("movieMessage", "No browser-playable video found.");
      window.open(movie.url, "_blank", "noopener");
      return;
    }

    const stream = "https://archive.org/download/" +
      encodeURIComponent(movie.identifier) + "/" +
      playable.name.split("/").map(encodeURIComponent).join("/");

    video.src = stream;
    video.load();

    video.play().catch(() => {
      setMessage("movieMessage", "Press Play to watch.");
    });

    setMessage("movieMessage", "");
  } catch (error) {
    console.error(error);
    setMessage("movieMessage", "Unable to play. Opening movie source.");
    window.open(movie.url, "_blank", "noopener");
  }
}

// ======================================================
// HOME
// ======================================================

function renderHome() {
  setCount("totalTV", state.tv.length);
  setCount("totalRadio", state.radios.length);
  setCount("totalMovies", state.movies.length);

  renderGrid("featuredChannels", state.tv.slice(0, 12));
  renderGrid("homeRecent", state.recent.slice(0, 8));
}

// ======================================================
// FAVORITES
// ======================================================

function renderFavorites() {
  renderGrid("favoritesGrid", state.favorites);
}

// ======================================================
// RECENT
// ======================================================

function renderRecent() {
  renderGrid("recentGrid", state.recent);
}

// ======================================================
// PLAY ACTIONS
// ======================================================

function playItem(item) {
  if (!item) return;

  if (item.type === "tv") {
    showPage("tv");
    playTV(item);
  } else if (item.type === "radio") {
    showPage("radio");
    playRadio(item);
  } else if (item.type === "movie") {
    showPage("movies");
    playMovie(item);
  } else if (item.type === "movie-channel") {
    showPage("movies");
    playVideoStream(
      item.url,
      "movieVideo",
      "movieMessage"
    );
  }
}

// ======================================================
// DELEGATED CARD CLICK EVENTS
// ======================================================

function setupCardEvents() {
  document.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-favorite]");

    if (favoriteButton) {
      event.preventDefault();
      event.stopPropagation();

      const id = favoriteButton.dataset.favorite;
      const item = [
        ...state.tv,
        ...state.radios,
        ...state.movies,
        ...state.movieChannels
      ].find((x) => x.id === id);

      if (item) toggleFavorite(item);
      return;
    }

    const playButton = event.target.closest("[data-play]");

    if (playButton) {
      const id = playButton.dataset.play;
      const type = playButton.dataset.type;

      const item = [
        ...state.tv,
        ...state.radios,
        ...state.movies,
        ...state.movieChannels
      ].find((x) => x.id === id && x.type === type);

      if (item) playItem(item);
    }
  });
}

// ======================================================
// SEARCH + FILTERS
// ======================================================

function setupSearch() {
  $("tvSearch")?.addEventListener("input", renderTV);
  $("tvCountry")?.addEventListener("change", renderTV);
  $("tvCategory")?.addEventListener("change", renderTV);
  $("tvSort")?.addEventListener("change", renderTV);

  $("radioSearch")?.addEventListener("input", renderRadio);
  $("radioCountry")?.addEventListener("change", renderRadio);
  $("radioLanguage")?.addEventListener("change", renderRadio);

  $("movieSearch")?.addEventListener("input", renderMovies);

  $("globalSearch")?.addEventListener("input", (event) => {
    const query = event.target.value.trim();
    if (!query) return;

    $("tvSearch").value = query;
    $("radioSearch").value = query;
    $("movieSearch").value = query;

    renderTV();
    renderRadio();
    renderMovies();
  });

  $("searchMovies")?.addEventListener("click", () => {
    searchMovies($("movieSearch")?.value || "");
  });
}

// ======================================================
// LOAD MORE
// ======================================================

function setupLoadMore() {
  $("moreChannels")?.addEventListener("click", () => {
    state.tvLimit += 40;
    renderTV();
  });

  $("moreRadio")?.addEventListener("click", () => {
    state.radioLimit += 40;
    renderRadio();
  });

  $("moreMovies")?.addEventListener("click", () => {
    state.movieLimit += 24;
    renderMovies();
  });
}

// ======================================================
// VIDEO PLAYER EVENTS
// ======================================================

function setupPlayers() {
  $("tvVideo")?.addEventListener("error", () => {
    setMessage("tvMessage", "Channel failed to load. Try another channel.");
  });

  $("tvVideo")?.addEventListener("playing", () => {
    setMessage("tvMessage", "");
  });

  $("radioPlayer")?.addEventListener("error", () => {
    setMessage("radioMessage", "Station unavailable. Try another radio.");
  });

  $("radioPlayer")?.addEventListener("playing", () => {
    setMessage("radioMessage", "");
  });

  $("movieVideo")?.addEventListener("error", () => {
    setMessage("movieMessage", "This video is not playable.");
  });
}

// ======================================================
// INITIALIZE
// ======================================================

function init() {
  loadStorage();

  setupNavigation();
  setupCardEvents();
  setupSearch();
  setupLoadMore();
  setupPlayers();

  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  renderFavorites();
  renderRecent();
  renderHome();

  // Start loading all sections independently
  Promise.allSettled([
    loadTV(),
    loadMovieChannels(),
    loadRadio(),
    searchMovies("public domain films")
  ]).then(() => {
    renderHome();
  });
}

document.addEventListener("DOMContentLoaded", init);
