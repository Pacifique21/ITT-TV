
// ======================================================
// ITT-TV | COMPLETE APP.JS
// TV + RWANDA RADIO + INTERNATIONAL RADIO + MOVIES
// ======================================================
"use strict";

const $ = (id) => document.getElementById(id);

const state = {
  tv: [],
  tvRegular: [],
  movieChannels: [],
  radios: [],
  rwandaRadios: [],
  internationalRadios: [],
  movies: [],
  favorites: [],
  recent: [],
  currentTV: null,
  currentRadio: null,
  currentMovie: null,
  hls: null,
  hlsScriptPromise: null,
  tvLimit: 40,
  radioLimit: 40,
  movieLimit: 24,
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
  favorites: "itt-tv-favorites-v4",
  recent: "itt-tv-recent-v4"
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

function setMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message || "";
}

function setCount(id, number) {
  const element = $(id);
  if (element) element.textContent = Number(number || 0).toLocaleString();
}

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 2500);
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueBy(items, keyFunction) {
  const seen = new Set();

  return items.filter((item) => {
    const key = keyFunction(item);
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
      JSON.stringify(state.recent)
    );
  } catch {}
}

function isFavorite(item) {
  return state.favorites.some(
    (favorite) => favorite.id === item.id && favorite.type === item.type
  );
}

function toggleFavorite(item) {
  if (isFavorite(item)) {
    state.favorites = state.favorites.filter(
      (favorite) => !(favorite.id === item.id && favorite.type === item.type)
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
  renderHome();
}

function addRecent(item) {
  state.recent = [
    item,
    ...state.recent.filter(
      (recent) => !(recent.id === item.id && recent.type === item.type)
    )
  ].slice(0, 30);

  saveRecent();
  renderRecent();
  renderHome();
}

// ======================================================
// NAVIGATION
// ======================================================

function showPage(name) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === name + "Page");
  });

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  $("sidebar")?.classList.remove("open");

  if (name === "tv") renderTV();
  if (name === "radio") renderRadio();
  if (name === "movies") renderMovies();
  if (name === "favorites") renderFavorites();
  if (name === "recent") renderRecent();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  $("menuToggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });
}

// ======================================================
// MEDIA CARDS
// ======================================================

function makeCard(item) {
  const favorite = isFavorite(item);
  const image = safeURL(item.image);

  return `
    <article class="media-card" data-item-id="${safeText(item.id)}">
      <div class="media-card-image">

        ${
          image
            ? `<img src="${safeText(image)}"
                alt="${safeText(item.name)}"
                loading="lazy"
                onerror="this.style.display='none'">`
            : ""
        }

        <div class="card-fallback">
          ${safeText((item.name || "?").charAt(0).toUpperCase())}
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
    container.innerHTML = `<p class="empty-state">No content available.</p>`;
    return;
  }

  container.innerHTML = items.map(makeCard).join("");
}

// ======================================================
// M3U PARSER
// ======================================================

function parsePlaylist(text, type = "tv") {
  const lines = text.split(/\r?\n/);
  const result = [];
  let current = null;

  for (const line of lines) {
    const value = line.trim();

    if (value.startsWith("#EXTINF")) {
      const name = value.split(",").slice(1).join(",").trim();

      const logo = value.match(/tvg-logo="([^"]*)"/i);
      const country = value.match(/tvg-country="([^"]*)"/i);
      const category = value.match(/group-title="([^"]*)"/i);

      current = {
        name: name || "Unknown Channel",
        image: logo ? logo[1] : "",
        country: country ? country[1] : "",
        category: category ? category[1] : "",
        type
      };
    } else if (value && !value.startsWith("#") && current) {
      current.url = value;
      current.id = type + "-" + result.length + "-" +
        normalizeName(current.name).replace(/\s+/g, "-");

      result.push(current);
      current = null;
    }
  }

  return result;
}

async function fetchPlaylist(url, type) {
  const response = await fetchWithTimeout(url, 20000);
  return parsePlaylist(await response.text(), type);
}

// ======================================================
// TV
// ======================================================

async function loadTV() {
  setMessage("tvMessage", "Loading TV channels...");

  try {
    const channels = await fetchPlaylist(PLAYLISTS.tv, "tv");

    state.tvRegular = channels.filter(
      (channel) => !/movie|cinema|film/i.test(channel.category || "")
    );

    state.tv = state.tvRegular;

    populateTVFilters();
    renderTV();
    setCount("totalTV", state.tv.length);

    setMessage("tvMessage", "");
    setMessage("tvPlaceholder", "");
    renderHome();
  } catch (error) {
    console.error("TV error:", error);
    setMessage("tvMessage", "TV channels unavailable. Try again later.");
  }
}

async function loadMovieChannels() {
  setMessage("movieChannelsMessage", "Loading movie channels...");

  try {
    state.movieChannels = await fetchPlaylist(PLAYLISTS.movies, "movie-channel");
    renderMovieChannels();
    setMessage("movieChannelsMessage", "");
  } catch (error) {
    console.error("Movie channels error:", error);
    setMessage("movieChannelsMessage", "Movie channels could not be loaded.");
  }
}

function populateTVFilters() {
  const countrySelect = $("tvCountry");
  const categorySelect = $("tvCategory");

  if (!countrySelect || !categorySelect) return;

  const countries = [...new Set(state.tv.map((x) => x.country).filter(Boolean))].sort();
  const categories = [...new Set(state.tv.map((x) => x.category).filter(Boolean))].sort();

  countrySelect.innerHTML =
    `<option value="">All countries</option>` +
    countries.map((x) => `<option value="${safeText(x)}">${safeText(x)}</option>`).join("");

  categorySelect.innerHTML =
    `<option value="">All categories</option>` +
    categories.map((x) => `<option value="${safeText(x)}">${safeText(x)}</option>`).join("");
}

function getFilteredTV() {
  const query = normalizeName($("tvSearch")?.value);
  const country = $("tvCountry")?.value || "";
  const category = $("tvCategory")?.value || "";
  const sort = $("tvSort")?.value || "name";

  let list = state.tv.filter((channel) => {
    const matchesQuery = normalizeName(channel.name).includes(query);
    const matchesCountry = !country || channel.country === country;
    const matchesCategory = !category || channel.category === category;

    return matchesQuery && matchesCountry && matchesCategory;
  });

  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "country") list.sort((a, b) => (a.country || "").localeCompare(b.country || ""));

  return list;
}

function renderTV() {
  const list = getFilteredTV();

  renderGrid("tvGrid", list.slice(0, state.tvLimit));
  setCount("tvResultCount", list.length);

  const button = $("moreChannels");
  if (button) button.style.display = list.length > state.tvLimit ? "block" : "none";
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
    script.onload = resolve;
    script.onerror = () => reject(new Error("HLS.js failed to load"));
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

  setMessage(messageId, "Connecting...");

  try {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream;
      video.play().catch(() => setMessage(messageId, "Press Play."));
      return;
    }

    await loadHLS();

    if (window.Hls && Hls.isSupported()) {
      state.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });

      state.hls.loadSource(stream);
      state.hls.attachMedia(video);

      state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => setMessage(messageId, "Press Play."));
      });

      state.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setMessage(messageId, "Stream failed. Try another channel.");
          stopHLS();
        }
      });
    } else {
      video.src = stream;
      video.play().catch(() => setMessage(messageId, "Press Play."));
    }
  } catch (error) {
    console.error(error);
    setMessage(messageId, "Stream could not be played.");
  }
}

function playTV(channel) {
  state.currentTV = channel;
  addRecent(channel);

  if ($("tvPlaceholder")) $("tvPlaceholder").style.display = "none";
  if ($("tvVideo")) $("tvVideo").style.display = "block";

  if ($("tvNowPlaying")) $("tvNowPlaying").textContent = channel.name;

  playVideoStream(channel.url, "tvVideo", "tvMessage");

  const favoriteButton = $("playerFavorite");
  if (favoriteButton) {
    favoriteButton.onclick = () => toggleFavorite(channel);
    favoriteButton.textContent = isFavorite(channel) ? "♥" : "♡";
  }
}

// ======================================================
// RADIO - RWANDA FIRST + INTERNATIONAL
// ======================================================

async function fetchStationsFromServer(server, endpoint, timeout = 12000) {
  const response = await fetchWithTimeout(
    server + endpoint,
    timeout
  );
  const data = await response.json();

  if (!Array.isArray(data)) throw new Error("Invalid station list");
  return data;
}

async function loadRwandaRadio() {
  const endpoint =
    "/json/stations/bycountryexact/Rwanda" +
    "?limit=500&order=clickcount&reverse=true&hidebroken=true";

  for (const server of RADIO_SERVERS) {
    try {
      const stations = await fetchStationsFromServer(server, endpoint);
      if (stations.length) return stations;
    } catch (error) {
      console.warn("Rwanda radio server failed:", server);
    }
  }

  return [];
}

async function loadInternationalRadio() {
  const params = new URLSearchParams({
    limit: "500",
    order: "clickcount",
    reverse: "true",
    hidebroken: "true"
  });

  const endpoint = "/json/stations/search?" + params.toString();

  for (const server of RADIO_SERVERS) {
    try {
      const stations = await fetchStationsFromServer(server, endpoint);
      if (stations.length) return stations;
    } catch (error) {
      console.warn("International radio server failed:", server);
    }
  }

  return [];
}

function convertRadio(station, index, prefix = "") {
  return {
    id: "radio-" + prefix + (station.stationuuid || index),
    type: "radio",
    name: station.name || "Unknown Radio",
    url: station.url_resolved || station.url || "",
    image: station.favicon || "",
    country: station.country || "",
    language: station.language || "",
    category: station.tags || "",
    description: station.language || station.country || ""
  };
}

async function loadRadio() {
  const requestNumber = ++state.radioRequest;

  setMessage("radioMessage", "Loading Rwanda radios first...");

  try {
    const [rwandaData, internationalData] = await Promise.all([
      loadRwandaRadio(),
      loadInternationalRadio()
    ]);

    if (requestNumber !== state.radioRequest) return;

    state.rwandaRadios = rwandaData.map((station, index) =>
      convertRadio(station, index, "RW-")
    );

    state.internationalRadios = internationalData.map((station, index) =>
      convertRadio(station, index, "INT-")
    );

    // Rwanda first
    state.radios = uniqueBy(
      [
        ...state.rwandaRadios,
        ...state.internationalRadios
      ].filter((station) => station.url),
      (station) => station.url
    );

    populateRadioFilters();
    renderRadio();
    setCount("totalRadio", state.radios.length);

    if (state.rwandaRadios.length) {
      setMessage("radioMessage", "");
    } else {
      setMessage(
        "radioMessage",
        "Rwanda radios could not be loaded. Other stations may still be available."
      );
    }

    renderHome();
  } catch (error) {
    console.error("Radio loading error:", error);
    setMessage("radioMessage", "Radio stations unavailable. Please retry.");
  }
}

function populateRadioFilters() {
  const countrySelect = $("radioCountry");
  const languageSelect = $("radioLanguage");

  if (!countrySelect || !languageSelect) return;

  const countries = [...new Set(
    state.radios.map((station) => station.country).filter(Boolean)
  )].sort();

  const languages = [...new Set(
    state.radios.map((station) => station.language).filter(Boolean)
  )].sort();

  countrySelect.innerHTML =
    `<option value="">All countries</option>` +
    countries.map((country) =>
      `<option value="${safeText(country)}">${safeText(country)}</option>`
    ).join("");

  languageSelect.innerHTML =
    `<option value="">All languages</option>` +
    languages.map((language) =>
      `<option value="${safeText(language)}">${safeText(language)}</option>`
    ).join("");
}

function getFilteredRadio() {
  const query = normalizeName($("radioSearch")?.value);
  const country = $("radioCountry")?.value || "";
  const language = $("radioLanguage")?.value || "";

  return state.radios.filter((station) => {
    const searchable = normalizeName(
      station.name + " " +
      station.country + " " +
      station.language + " " +
      station.category
    );

    return searchable.includes(query) &&
      (!country || station.country === country) &&
      (!language || station.language === language);
  });
}

function renderRadio() {
  const list = getFilteredRadio();

  renderGrid("radioGrid", list.slice(0, state.radioLimit));
  setCount("radioResultCount", list.length);

  const more = $("moreRadio");
  if (more) more.style.display = list.length > state.radioLimit ? "block" : "none";
}

function playRadio(radio) {
  state.currentRadio = radio;
  addRecent(radio);

  const player = $("radioPlayer");
  if (!player) return;

  const stream = safeURL(radio.url);
  if (!stream) {
    setMessage("radioMessage", "Invalid radio stream.");
    return;
  }

  player.pause();
  player.src = stream;
  player.load();

  const title = $("radioNowPlaying");
  if (title) title.textContent = radio.name;

  const details = $("radioDetails");
  if (details) {
    details.textContent = [radio.country, radio.language]
      .filter(Boolean)
      .join(" • ");
  }

  player.play().catch(() => {
    setMessage("radioMessage", "Press Play or try another station.");
  });
}

// ======================================================
// MOVIES
// ======================================================

async function searchMovies(query = "") {
  const request = ++state.movieRequest;
  state.movieQuery = query.trim();

  setMessage("movieMessage", "Searching movies...");

  const searchTerm = state.movieQuery || "public domain films";

  const params = new URLSearchParams({
    q: `title:(${searchTerm}) AND mediatype:movies`,
    fl: "identifier,title,year,description",
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
      image: "https://archive.org/services/img/" + encodeURIComponent(movie.identifier),
      description: movie.year ? String(movie.year) : "Film",
      identifier: movie.identifier
    }));

    renderMovies();
    setCount("totalMovies", state.movies.length);
    setMessage("movieMessage", "");
  } catch (error) {
    console.error("Movie error:", error);
    setMessage("movieMessage", "Movie search failed. Try again.");
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

  if ($("moviePlayerPanel")) $("moviePlayerPanel").style.display = "block";
  if ($("movieNowPlaying")) $("movieNowPlaying").textContent = movie.name;

  const video = $("movieVideo");
  if (!video) {
    window.open(movie.url, "_blank", "noopener");
    return;
  }

  setMessage("movieMessage", "Loading movie...");

  try {
    const response = await fetchWithTimeout(
      "https://archive.org/metadata/" + encodeURIComponent(movie.identifier),
      15000
    );

    const metadata = await response.json();
    const files = metadata.files || [];

    const playable = files.find((file) =>
      file.format === "h.264" && /\.mp4$/i.test(file.name || "")
    ) || files.find((file) => /\.mp4$/i.test(file.name || ""));

    if (!playable) {
      setMessage("movieMessage", "No playable video found.");
      window.open(movie.url, "_blank", "noopener");
      return;
    }

    const stream =
      "https://archive.org/download/" +
      encodeURIComponent(movie.identifier) +
      "/" +
      playable.name.split("/").map(encodeURIComponent).join("/");

    video.src = stream;
    video.load();

    video.play().catch(() => {
      setMessage("movieMessage", "Press Play to watch.");
    });

    setMessage("movieMessage", "");
  } catch (error) {
    console.error(error);
    setMessage("movieMessage", "Opening movie source...");
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
// FAVORITES & RECENT
// ======================================================

function renderFavorites() {
  renderGrid("favoritesGrid", state.favorites);
}

function renderRecent() {
  renderGrid("recentGrid", state.recent);
}

// ======================================================
// PLAY ITEM
// ======================================================

function playItem(item) {
  if (!item) return;

  if (item.type === "tv") {
    showPage("tv");
    playTV(item);
  }

  if (item.type === "radio") {
    showPage("radio");
    playRadio(item);
  }

  if (item.type === "movie") {
    showPage("movies");
    playMovie(item);
  }

  if (item.type === "movie-channel") {
    showPage("movies");
    playVideoStream(item.url, "movieVideo", "movieMessage");
  }
}

// ======================================================
// CARD EVENTS
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
// SEARCH & FILTERS
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
    const query = event.target.value;

    if ($("tvSearch")) $("tvSearch").value = query;
    if ($("radioSearch")) $("radioSearch").value = query;
    if ($("movieSearch")) $("movieSearch").value = query;

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
// PLAYER EVENTS
// ======================================================

function setupPlayers() {
  $("tvVideo")?.addEventListener("error", () => {
    setMessage("tvMessage", "Channel unavailable. Try another channel.");
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
    setMessage("movieMessage", "Video unavailable.");
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

  Promise.allSettled([
    loadTV(),
    loadMovieChannels(),
    loadRadio(),
    searchMovies("public domain films")
  ]).then(renderHome);
}

document.addEventListener("DOMContentLoaded", init);
