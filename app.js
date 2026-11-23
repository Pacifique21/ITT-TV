
// ============================================================
// ITT-TV | COMPLETE TV + RADIO + MOVIES APP
// TV: IPTV-Org public channel directory
// RADIO: Radio Browser API
// MOVIES: Internet Archive catalog (publicly available content)
// PLAYER: HLS.js + Native HLS
// ============================================================

"use strict";

const $ = (id) => document.getElementById(id);

const state = {
  tv: [],
  tvRegular: [],
  movieChannels: [],
  radios: [],
  movies: [],
  favorites: JSON.parse(localStorage.getItem("itt_favorites") || "[]"),
  recent: JSON.parse(localStorage.getItem("itt_recent") || "[]"),
  currentTV: null,
  currentRadio: null,
  currentMovie: null,
  hls: null,
  movieHls: null,
  tvLimit: 60,
  radioLimit: 60,
  movieLimit: 30,
  tvPage: 0,
  radioPage: 0,
  moviePage: 0,
  loading: false
};

const SOURCES = {
  tv: "https://iptv-org.github.io/iptv/index.m3u",
  radio: "https://de1.api.radio-browser.info/json/stations/search",
  movies: "https://archive.org/advancedsearch.php"
};

// ============================================================
// UTILITIES
// ============================================================

function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter(item => {
    const value = item[key];
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function getEl(...ids) {
  for (const id of ids) {
    const element = $(id);
    if (element) return element;
  }
  return null;
}

function showMessage(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function countryName(code) {
  if (!code) return "International";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase());
  } catch {
    return code.toUpperCase();
  }
}

function persist() {
  localStorage.setItem("itt_favorites", JSON.stringify(state.favorites));
  localStorage.setItem("itt_recent", JSON.stringify(state.recent));
}

function addRecent(item, type) {
  const entry = {
    ...item,
    type,
    watchedAt: Date.now()
  };

  state.recent = [
    entry,
    ...state.recent.filter(x => x.url !== item.url)
  ].slice(0, 50);

  persist();
}

function isFavorite(item) {
  return state.favorites.some(x => x.url === item.url);
}

function toggleFavorite(item, type) {
  const exists = isFavorite(item);

  if (exists) {
    state.favorites = state.favorites.filter(x => x.url !== item.url);
  } else {
    state.favorites.unshift({ ...item, type });
  }

  persist();
  renderFavorites();

  return !exists;
}

function validURL(url) {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function posterFallback(title) {
  return "https://placehold.co/400x225/111827/ffffff?text=" +
    encodeURIComponent(title || "ITT TV");
}

// ============================================================
// PLAYER SYSTEM
// ============================================================

function destroyHLS() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function destroyMovieHLS() {
  if (state.movieHls) {
    state.movieHls.destroy();
    state.movieHls = null;
  }
}

function stopTV() {
  destroyHLS();

  const video = $("tvVideo");
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function stopMovie() {
  destroyMovieHLS();

  const video = $("movieVideo");
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function playVideo(video, url, type = "tv") {
  if (!video || !validURL(url)) return;

  if (type === "tv") destroyHLS();
  else destroyMovieHLS();

  video.pause();
  video.removeAttribute("src");
  video.load();

  const isHLS = /\.m3u8($|\?)/i.test(url);

  if (
    isHLS &&
    video.canPlayType("application/vnd.apple.mpegurl")
  ) {
    video.src = url;
    video.play().catch(() => {});
    return;
  }

  if (isHLS && window.Hls && Hls.isSupported()) {
    const instance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      maxBufferLength: 20,
      liveSyncDurationCount: 3
    });

    if (type === "tv") state.hls = instance;
    else state.movieHls = instance;

    instance.loadSource(url);
    instance.attachMedia(video);

    instance.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    instance.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        instance.destroy();
        if (type === "tv") state.hls = null;
        else state.movieHls = null;
      }
    });

    return;
  }

  video.src = url;
  video.play().catch(() => {});
}

function playTV(channel) {
  state.currentTV = channel;

  const video = $("tvVideo");
  if (!video) return;

  playVideo(video, channel.url, "tv");

  showMessage("tvNowPlaying", channel.name);
  addRecent(channel, "tv");

  const panel = getEl("tvPlayerPanel", "tvPlayer");
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function playRadio(station) {
  state.currentRadio = station;

  const player = $("radioPlayer");
  if (!player) return;

  player.pause();
  player.src = station.url;
  player.load();

  player.play().catch(() => {});

  showMessage("radioNowPlaying", station.name);
  addRecent(station, "radio");
}

function playMovie(movie) {
  state.currentMovie = movie;

  const video = $("movieVideo");
  if (!video) return;

  playVideo(video, movie.url, "movie");

  showMessage("movieNowPlaying", movie.title);
  addRecent(movie, "movie");

  const panel = $("moviePlayerPanel");
  if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
// CARD DESIGN
// ============================================================

function cardHTML(item, type) {
  const title = item.name || item.title || "Untitled";
  const image = item.logo || item.poster || posterFallback(title);
  const favorite = isFavorite(item);

  const action = type === "tv"
    ? `data-tv="${safeText(item.url)}"`
    : type === "radio"
    ? `data-radio="${safeText(item.url)}"`
    : `data-movie="${safeText(item.url)}"`;

  return `
    <article class="itt-card">
      <div class="itt-card-image">
        <img src="${safeText(image)}"
             alt="${safeText(title)}"
             loading="lazy"
             onerror="this.src='${posterFallback(title)}'">
        <button class="itt-fav"
          data-favorite="${safeText(item.url)}"
          aria-label="Favorite">
          ${favorite ? "♥" : "♡"}
        </button>
      </div>

      <div class="itt-card-body">
        <h3>${safeText(title)}</h3>
        <p>${safeText(item.country || item.language || item.category || "")}</p>
        <button class="itt-play" ${action}>
          ▶ Play
        </button>
      </div>
    </article>
  `;
}

function renderCards(id, items, type) {
  const container = $(id);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="itt-empty">
        Nothing found. Try another search.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => cardHTML(item, type)).join("");
}

// ============================================================
// TV PLAYLIST PARSER
// ============================================================

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let current = {};

  for (const line of lines) {
    const value = line.trim();

    if (value.startsWith("#EXTINF:")) {
      const logo = value.match(/tvg-logo="([^"]*)"/i);
      const country = value.match(/tvg-country="([^"]*)"/i);
      const category = value.match(/group-title="([^"]*)"/i);
      const name = value.split(",").pop().trim();

      current = {
        name,
        logo: logo ? logo[1] : "",
        country: country ? country[1].split(",")[0] : "",
        category: category ? category[1] : "General",
        url: ""
      };
    } else if (
      value &&
      !value.startsWith("#") &&
      current.name
    ) {
      current.url = value;

      if (validURL(current.url)) {
        result.push(current);
      }

      current = {};
    }
  }

  return uniqueBy(result, "url");
}

// ============================================================
// LOAD TV
// ============================================================

async function loadTV() {
  showMessage("tvMessage", "Loading live television...");

  try {
    const response = await fetch(SOURCES.tv);

    if (!response.ok) throw new Error("TV list unavailable");

    const text = await response.text();
    const all = parseM3U(text);

    state.tv = all;
    state.tvRegular = all.filter(c =>
      !normalize(c.category).includes("movie")
    );

    state.movieChannels = all.filter(c =>
      normalize(c.category).includes("movie")
    );

    populateTVFilters();
    renderTV();
    renderMovieChannels();

    showMessage("tvMessage", `${state.tv.length} channels loaded`);
  } catch (error) {
    console.error("TV loading error:", error);
    showMessage("tvMessage", "TV channels failed to load. Refresh and try again.");
  }
}

function populateTVFilters() {
  const countrySelect = $("tvCountry");
  const categorySelect = $("tvCategory");

  if (countrySelect) {
    const countries = [...new Set(
      state.tv.map(x => x.country).filter(Boolean)
    )].sort();

    countrySelect.innerHTML =
      `<option value="">All Countries</option>` +
      countries.map(c =>
        `<option value="${safeText(c)}">${safeText(countryName(c))}</option>`
      ).join("");
  }

  if (categorySelect) {
    const categories = [...new Set(
      state.tv.map(x => x.category).filter(Boolean)
    )].sort();

    categorySelect.innerHTML =
      `<option value="">All Categories</option>` +
      categories.map(c =>
        `<option value="${safeText(c)}">${safeText(c)}</option>`
      ).join("");
  }
}

function renderTV() {
  const search = normalize($("tvSearch")?.value);
  const country = $("tvCountry")?.value || "";
  const category = $("tvCategory")?.value || "";
  const sort = $("tvSort")?.value || "";

  let list = state.tvRegular.filter(channel => {
    const matchesSearch =
      !search ||
      normalize(channel.name).includes(search) ||
      normalize(channel.category).includes(search) ||
      normalize(channel.country).includes(search);

    const matchesCountry = !country || channel.country === country;
    const matchesCategory = !category || channel.category === category;

    return matchesSearch && matchesCountry && matchesCategory;
  });

  if (sort === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderCards("tvGrid", list.slice(0, state.tvLimit), "tv");
}

function renderMovieChannels() {
  renderCards(
    "movieChannelsGrid",
    state.movieChannels.slice(0, state.tvLimit),
    "tv"
  );
}

// ============================================================
// RADIO BROWSER
// ============================================================

async function loadRadios() {
  showMessage("radioMessage", "Loading radio stations...");

  try {
    const params = new URLSearchParams({
      limit: "300",
      order: "clickcount",
      reverse: "true",
      hidebroken: "true"
    });

    const response = await fetch(`${SOURCES.radio}?${params}`);

    if (!response.ok) throw new Error("Radio API unavailable");

    const data = await response.json();

    state.radios = uniqueBy(
      data
        .filter(station => station.url_resolved || station.url)
        .map(station => ({
          name: station.name || "Unknown Station",
          url: station.url_resolved || station.url,
          country: station.country || "",
          language: station.language || "",
          logo: station.favicon || "",
          bitrate: station.bitrate || 0
        })),
      "url"
    );

    populateRadioFilters();
    renderRadios();

    showMessage("radioMessage", `${state.radios.length} stations loaded`);
  } catch (error) {
    console.error("Radio loading error:", error);
    showMessage("radioMessage", "Radio stations failed to load. Try again.");
  }
}

function populateRadioFilters() {
  const countrySelect = $("radioCountry");
  const languageSelect = $("radioLanguage");

  if (countrySelect) {
    const countries = [...new Set(
      state.radios.map(x => x.country).filter(Boolean)
    )].sort();

    countrySelect.innerHTML =
      `<option value="">All Countries</option>` +
      countries.map(c =>
        `<option value="${safeText(c)}">${safeText(c)}</option>`
      ).join("");
  }

  if (languageSelect) {
    const languages = [...new Set(
      state.radios.flatMap(x =>
        x.language.split(",").map(v => v.trim()).filter(Boolean)
      )
    )].sort();

    languageSelect.innerHTML =
      `<option value="">All Languages</option>` +
      languages.map(l =>
        `<option value="${safeText(l)}">${safeText(l)}</option>`
      ).join("");
  }
}

function renderRadios() {
  const search = normalize($("radioSearch")?.value);
  const country = $("radioCountry")?.value || "";
  const language = $("radioLanguage")?.value || "";

  const list = state.radios.filter(radio => {
    const matchesSearch =
      !search ||
      normalize(radio.name).includes(search) ||
      normalize(radio.country).includes(search) ||
      normalize(radio.language).includes(search);

    const matchesCountry = !country || radio.country === country;
    const matchesLanguage =
      !language || radio.language.split(",").map(x => x.trim()).includes(language);

    return matchesSearch && matchesCountry && matchesLanguage;
  });

  renderCards("radioGrid", list.slice(0, state.radioLimit), "radio");
}

// ============================================================
// MOVIES: INTERNET ARCHIVE SEARCH
// ============================================================

async function loadMovies(searchTerm = "") {
  showMessage("movieMessage", "Loading movie catalog...");

  try {
    const query = searchTerm
      ? `(${searchTerm.replace(/[^\w\s]/g, " ").trim()}) AND mediatype:movies`
      : "mediatype:movies AND collection:feature_films";

    const params = new URLSearchParams({
      q: query,
      fl: ["identifier", "title", "year"].join(","),
      rows: "40",
      page: "1",
      output: "json"
    });

    const response = await fetch(`${SOURCES.movies}?${params}`);
    if (!response.ok) throw new Error("Movie catalog unavailable");

    const data = await response.json();

    const docs = data.response?.docs || [];

    const movies = docs.map(item => ({
      title: item.title || item.identifier,
      year: item.year || "",
      identifier: item.identifier,
      poster: `https://archive.org/services/img/${item.identifier}`,
      url: `https://archive.org/details/${item.identifier}`
    }));

    state.movies = uniqueBy(movies, "identifier");
    renderMovies();

    showMessage("movieMessage", `${state.movies.length} movies found`);
  } catch (error) {
    console.error("Movie loading error:", error);
    showMessage("movieMessage", "Movie search failed. Try again.");
  }
}

function renderMovies() {
  const search = normalize(
    getEl("movieSearch", "searchMovies")?.value
  );

  const list = state.movies.filter(movie =>
    !search || normalize(movie.title).includes(search)
  );

  renderCards("movieGrid", list.slice(0, state.movieLimit), "movie");
}

// ============================================================
// MOVIE PLAYBACK
// ============================================================

async function getArchiveVideo(identifier) {
  const url = `https://archive.org/metadata/${encodeURIComponent(identifier)}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Movie files unavailable");

  const data = await response.json();
  const files = data.files || [];

  const videoFiles = files.filter(file => {
    const name = normalize(file.name);
    return /\.(mp4|m4v|webm)$/i.test(name);
  });

  videoFiles.sort((a, b) => {
    const aScore = Number(a.height || 0);
    const bScore = Number(b.height || 0);
    return bScore - aScore;
  });

  if (!videoFiles.length) {
    throw new Error("No browser-playable movie file found");
  }

  const file = videoFiles[0];

  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(file.name)}`;
}

async function openMovie(movie) {
  showMessage("movieMessage", `Opening ${movie.title}...`);

  try {
    const videoURL = await getArchiveVideo(movie.identifier);

    const playable = {
      ...movie,
      url: videoURL
    };

    playMovie(playable);
    showMessage("movieMessage", "Movie loaded");
  } catch (error) {
    console.error(error);
    showMessage("movieMessage", "Could not play this movie. Try another title.");
  }
}

// ============================================================
// FAVORITES
// ============================================================

function renderFavorites() {
  const container = $("favoritesGrid");
  if (!container) return;

  if (!state.favorites.length) {
    container.innerHTML = `<p>No favorites yet.</p>`;
    return;
  }

  container.innerHTML = state.favorites.map(item =>
    cardHTML(item, item.type || "tv")
  ).join("");
}

// ============================================================
// RECENT
// ============================================================

function renderRecent() {
  const container = $("recentGrid");
  if (!container) return;

  if (!state.recent.length) {
    container.innerHTML = `<p>Nothing watched yet.</p>`;
    return;
  }

  container.innerHTML = state.recent.map(item =>
    cardHTML(item, item.type || "tv")
  ).join("");
}

// ============================================================
// GLOBAL SEARCH
// ============================================================

function globalSearch(term) {
  if (!term) return;

  const q = normalize(term);

  const tv = state.tvRegular.find(x => normalize(x.name).includes(q));
  const radio = state.radios.find(x => normalize(x.name).includes(q));
  const movie = state.movies.find(x => normalize(x.title).includes(q));

  if (tv) {
    playTV(tv);
    return;
  }

  if (radio) {
    playRadio(radio);
    return;
  }

  if (movie) {
    openMovie(movie);
    return;
  }
}

// ============================================================
// CLICK EVENTS
// ============================================================

document.addEventListener("click", event => {
  const tvButton = event.target.closest("[data-tv]");
  const radioButton = event.target.closest("[data-radio]");
  const movieButton = event.target.closest("[data-movie]");
  const favoriteButton = event.target.closest("[data-favorite]");

  if (tvButton) {
    const channel = state.tv.find(x => x.url === tvButton.dataset.tv);
    if (channel) playTV(channel);
  }

  if (radioButton) {
    const station = state.radios.find(x => x.url === radioButton.dataset.radio);
    if (station) playRadio(station);
  }

  if (movieButton) {
    const movie = state.movies.find(x => x.url === movieButton.dataset.movie);
    if (movie) openMovie(movie);
  }

  if (favoriteButton) {
    const url = favoriteButton.dataset.favorite;
    const item = [...state.tv, ...state.radios, ...state.movies]
      .find(x => x.url === url);

    if (item) {
      toggleFavorite(item, item.title ? "movie" : item.language ? "radio" : "tv");
      renderTV();
      renderRadios();
      renderMovies();
    }
  }
});

// ============================================================
// SEARCH & FILTER EVENTS
// ============================================================

$("tvSearch")?.addEventListener("input", renderTV);
$("tvCountry")?.addEventListener("change", renderTV);
$("tvCategory")?.addEventListener("change", renderTV);
$("tvSort")?.addEventListener("change", renderTV);

$("radioSearch")?.addEventListener("input", renderRadios);
$("radioCountry")?.addEventListener("change", renderRadios);
$("radioLanguage")?.addEventListener("change", renderRadios);

getEl("movieSearch", "searchMovies")?.addEventListener("input", renderMovies);

$("globalSearch")?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    globalSearch(event.target.value);
  }
});

$("moreChannels")?.addEventListener("click", () => {
  state.tvLimit += 60;
  renderTV();
});

$("moreRadio")?.addEventListener("click", () => {
  state.radioLimit += 60;
  renderRadios();
});

$("moreMovies")?.addEventListener("click", () => {
  state.movieLimit += 30;
  renderMovies();
});

// ============================================================
// NAVIGATION
// ============================================================

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    document.querySelectorAll(".page").forEach(p => {
      p.classList.remove("active");
    });

    const target = $(page + "Page");
    if (target) target.classList.add("active");

    document.querySelectorAll("[data-page]").forEach(b => {
      b.classList.remove("active");
    });

    button.classList.add("active");

    if (page === "favorites") renderFavorites();
    if (page === "recent") renderRecent();

    $("sidebar")?.classList.remove("open");
  });
});

$("menuToggle")?.addEventListener("click", () => {
  $("sidebar")?.classList.toggle("open");
});

// ============================================================
// INITIALIZATION
// ============================================================

async function initITTTV() {
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  renderFavorites();
  renderRecent();

  // Load the three services independently
  loadTV();
  loadRadios();
  loadMovies();
}

document.addEventListener("DOMContentLoaded", initITTTV);

// ============================================================
// ITT-TV END
// ============================================================
