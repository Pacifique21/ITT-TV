
"use strict";

/* ============================================================
   ITT-TV APPLICATION
   RWANDA TV + WORLD TV
   RADIO + MOVIES + FAVORITES + RECENT
   ============================================================ */

const $ = id => document.getElementById(id);

const state = {
  tv: [],
  radios: [],
  movies: [],
  movieChannels: [],
  favorites: [],
  recent: [],

  currentTV: null,
  currentRadio: null,
  currentMovie: null,

  hls: null,
  hlsScript: null,

  tvLimit: 48,
  radioLimit: 48,
  movieLimit: 24,

  country: "",
  category: ""
};

const SOURCES = {
  worldTV: "https://iptv-org.github.io/iptv/index.m3u",
  rwandaTV: "https://iptv-org.github.io/iptv/countries/rw.m3u",
  movieTV: "https://iptv-org.github.io/iptv/categories/movies.m3u"
};

const RADIO_SERVERS = [
  "https://all.api.radio-browser.info",
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];

const STORAGE = {
  favorites: "itt-tv-favorites-final",
  recent: "itt-tv-recent-final"
};

/* ========================= HELPERS ========================= */

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function safe(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeID(type, name, index) {
  return type + "-" + index + "-" +
    normalize(name).replace(/[^a-z0-9]+/g, "-").slice(0, 35);
}

function unique(items, key) {
  const seen = new Set();

  return items.filter(item => {
    const value = key(item);

    if (!value || seen.has(value)) return false;

    seen.add(value);
    return true;
  });
}

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function message(id, text) {
  if ($(id)) $(id).textContent = text;
}

function notify(text) {
  const el = $("toast");
  if (!el) return;

  el.textContent = text;
  el.classList.add("show");

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

function countryName(code) {
  if (!code) return "Unknown";

  if (normalize(code) === "rwanda" || normalize(code) === "rw") {
    return "Rwanda";
  }

  try {
    return new Intl.DisplayNames(["en"], {
      type: "region"
    }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function updateCounts() {
  if ($("totalTV")) $("totalTV").textContent = state.tv.length;
  if ($("totalRadio")) $("totalRadio").textContent = state.radios.length;
  if ($("totalMovies")) {
    $("totalMovies").textContent = state.movieChannels.length;
  }
}

function setPage(page) {
  document.querySelectorAll(".page").forEach(el => {
    el.classList.remove("active");
  });

  const target = $(page + "Page");
  if (target) target.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  $("sidebar")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPage(page) {
  setPage(page);
}

/* ========================= FAVORITES ========================= */

state.favorites = readStorage(STORAGE.favorites);
state.recent = readStorage(STORAGE.recent);

function favorite(item) {
  return state.favorites.some(x => x.id === item.id);
}

function toggleFavorite(item) {
  if (!item) return;

  if (favorite(item)) {
    state.favorites = state.favorites.filter(x => x.id !== item.id);
    notify("Removed from favorites");
  } else {
    state.favorites.unshift(item);
    notify("Added to favorites");
  }

  saveStorage(STORAGE.favorites, state.favorites);

  renderFavorites();
  renderRecent();
  renderHomeRecent();
  updatePlayerFavorite();
}

function updatePlayerFavorite() {
  const button = $("playerFavorite");
  const item =
    state.currentTV ||
    state.currentRadio ||
    state.currentMovie;

  if (!button || !item) return;

  button.textContent = favorite(item) ? "★" : "☆";
}

function addRecent(item) {
  if (!item) return;

  state.recent = [
    item,
    ...state.recent.filter(x => x.id !== item.id)
  ].slice(0, 50);

  saveStorage(STORAGE.recent, state.recent);

  renderRecent();
  renderHomeRecent();
}

function renderFavorites() {
  renderCards("favoritesGrid", state.favorites);
}

function renderRecent() {
  renderCards("recentGrid", state.recent);
}

/* ========================= CARDS ========================= */

function cardHTML(item) {
  return `
    <article class="media-card" data-id="${safe(item.id)}">

      <div class="media-card-image">
        ${
          item.image
            ? `<img src="${safe(item.image)}"
                    loading="lazy"
                    alt="${safe(item.name)}"
                    onerror="this.style.display='none'">`
            : `<div class="card-placeholder">▶</div>`
        }

        <button class="card-favorite"
                data-fav="${safe(item.id)}"
                aria-label="Favorite">
          ${favorite(item) ? "★" : "☆"}
        </button>
      </div>

      <div class="media-card-info">
        <h3>${safe(item.name)}</h3>
        <p>${safe(item.country || item.category || item.language || "")}</p>
      </div>
    </article>
  `;
}

function findItem(id) {
  return [
    ...state.tv,
    ...state.radios,
    ...state.movieChannels,
    ...state.movies,
    ...state.favorites,
    ...state.recent
  ].find(item => item.id === id);
}

function renderCards(id, items) {
  const grid = $(id);
  if (!grid) return;

  grid.innerHTML = items.length
    ? items.map(cardHTML).join("")
    : `<div class="empty-state">Nothing to show yet.</div>`;

  grid.querySelectorAll(".media-card").forEach(card => {
    card.addEventListener("click", event => {
      if (event.target.closest("[data-fav]")) return;

      const item = findItem(card.dataset.id);
      if (item) playItem(item);
    });
  });

  grid.querySelectorAll("[data-fav]").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();

      const item = findItem(btn.dataset.fav);
      if (item) toggleFavorite(item);
    });
  });
}

/* ========================= PLAYLIST PARSER ========================= */

function parseM3U(text, type, forceCountry = "") {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").slice(1).join(",").trim();

      const logo = line.match(/tvg-logo="([^"]*)"/i);
      const country = line.match(/tvg-country="([^"]*)"/i);
      const group = line.match(/group-title="([^"]*)"/i);
      const id = line.match(/tvg-id="([^"]*)"/i);

      current = {
        name: name || "TV Channel",
        image: logo?.[1] || "",
        country: forceCountry || country?.[1] || "",
        category: group?.[1] || "",
        externalID: id?.[1] || "",
        type
      };
    } else if (line && !line.startsWith("#") && current) {
      // Remove obvious VOD URLs only. Remaining streams are not
      // guaranteed to be live; their source must be verified.
      const vod =
        /\/movie\/|\/vod\/|\/series\/|\/recorded\/|catchup=|timeshift=/i;

      if (!vod.test(line)) {
        current.url = line;
        current.id = makeID(type, current.name, items.length);
        items.push(current);
      }

      current = null;
    }
  }

  return items;
}

/* ========================= TV LOADER ========================= */

async function getText(url) {
  const response = await fetch(url, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  return response.text();
}

async function loadTV() {
  message("tvMessage", "Loading TV channels...");

  const results = await Promise.allSettled([
    getText(SOURCES.rwandaTV),
    getText(SOURCES.worldTV)
  ]);

  const rwText =
    results[0].status === "fulfilled" ? results[0].value : "";

  const worldText =
    results[1].status === "fulfilled" ? results[1].value : "";

  const rwanda = rwText
    ? parseM3U(rwText, "tv", "Rwanda")
    : [];

  const world = worldText
    ? parseM3U(worldText, "tv")
    : [];

  state.tv = unique(
    [...rwanda, ...world],
    x => x.url
  );

  state.tv.sort((a, b) => {
    const ar = normalize(a.country) === "rwanda";
    const br = normalize(b.country) === "rwanda";

    if (ar && !br) return -1;
    if (!ar && br) return 1;

    return a.name.localeCompare(b.name);
  });

  populateCountryFilter();
  populateCategoryFilter();
  renderTV();
  renderFeatured();
  updateCounts();

  message(
    "tvMessage",
    `Rwanda channels: ${rwanda.length} | Total channels: ${state.tv.length}`
  );

  if (!state.tv.length) {
    message("tvMessage", "TV channels failed to load. Check your internet.");
  }
}

/* ========================= COUNTRY FILTER ========================= */

function populateCountryFilter() {
  const select = $("tvCountry");
  if (!select) return;

  const countries = [...new Set(
    state.tv.map(x => x.country).filter(Boolean)
  )].sort((a, b) => {
    if (normalize(a) === "rwanda") return -1;
    if (normalize(b) === "rwanda") return 1;
    return countryName(a).localeCompare(countryName(b));
  });

  select.innerHTML =
    `<option value="">🌍 All countries</option>` +
    countries.map(country =>
      `<option value="${safe(country)}">${safe(countryName(country))}</option>`
    ).join("");
}

function populateCategoryFilter() {
  const select = $("tvCategory");
  if (!select) return;

  const categories = [...new Set(
    state.tv.map(x => x.category).filter(Boolean)
  )].sort();

  select.innerHTML =
    `<option value="">All categories</option>` +
    categories.map(category =>
      `<option value="${safe(category)}">${safe(category)}</option>`
    ).join("");
}

function getFilteredTV() {
  const search = normalize($("tvSearch")?.value);
  const country = $("tvCountry")?.value || "";
  const category = $("tvCategory")?.value || "";

  let items = state.tv.filter(item => {
    const matchSearch =
      !search ||
      normalize(item.name).includes(search) ||
      normalize(item.country).includes(search) ||
      normalize(item.category).includes(search);

    const matchCountry =
      !country || item.country === country;

    const matchCategory =
      !category || item.category === category;

    return matchSearch && matchCountry && matchCategory;
  });

  const sort = $("tvSort")?.value || "name";

  if (sort === "name") {
    items.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "country") {
    items.sort((a, b) => a.country.localeCompare(b.country));
  }

  return items;
}

function renderTV() {
  const items = getFilteredTV();

  renderCards("tvGrid", items.slice(0, state.tvLimit));

  if ($("tvResultCount")) {
    $("tvResultCount").textContent = items.length + " channels";
  }

  if ($("moreChannels")) {
    $("moreChannels").style.display =
      items.length > state.tvLimit ? "" : "none";
  }

  renderCountryChips();
}

/* ========================= COUNTRY BUTTONS ========================= */

/*
  Automatically creates clickable country chips.
  Clicking a country shows TV channels from that country.
*/

function renderCountryChips() {
  const select = $("tvCountry");
  const grid = $("tvGrid");
  if (!select || !grid) return;

  let chipArea = $("countryChips");

  if (!chipArea) {
    chipArea = document.createElement("div");
    chipArea.id = "countryChips";
    chipArea.className = "country-chips";

    const filters = document.querySelector("#tvPage .filter-section");
    if (filters) filters.insertAdjacentElement("afterend", chipArea);
  }

  const countries = [...new Set(
    state.tv.map(x => x.country).filter(Boolean)
  )].sort((a, b) => {
    if (normalize(a) === "rwanda") return -1;
    if (normalize(b) === "rwanda") return 1;
    return countryName(a).localeCompare(countryName(b));
  });

  const chosen = select.value;

  chipArea.innerHTML = `
    <button class="country-chip ${!chosen ? "selected" : ""}"
            data-country="">
      🌍 All
    </button>

    ${countries.map(country => `
      <button class="country-chip ${chosen === country ? "selected" : ""}"
              data-country="${safe(country)}">
        ${normalize(country) === "rwanda" ? "🇷🇼" : "🌐"}
        ${safe(countryName(country))}
      </button>
    `).join("")}
  `;

  chipArea.querySelectorAll("[data-country]").forEach(button => {
    button.addEventListener("click", () => {
      select.value = button.dataset.country;
      state.tvLimit = 48;
      renderTV();
    });
  }
}

/* ========================= HLS PLAYER ========================= */

function loadHLS() {
  if (window.Hls) return Promise.resolve();
  if (state.hlsScript) return state.hlsScript;

  state.hlsScript = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.async = true;

    script.onload = resolve;
    script.onerror = () => {
      state.hlsScript = null;
      reject(new Error("HLS library unavailable"));
    };

    document.head.appendChild(script);
  });

  return state.hlsScript;
}

function destroyPlayer() {
  if (state.hls) {
    try {
      state.hls.destroy();
    } catch {}
    state.hls = null;
  }

  const videoElements = [$("tvVideo"), $("movieVideo")];

  videoElements.filter(Boolean).forEach(video => {
    try {
      video.pause();
      video.removeAttribute("src");
      video.load();
    } catch {}
  });

  const radio = $("radioPlayer");

  if (radio) {
    try {
      radio.pause();
      radio.removeAttribute("src");
      radio.load();
    } catch {}
  }
}

async function playStream(video, url, item) {
  if (!video || !url) return;

  destroyPlayer();

  video.style.display = "block";
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;

  if (/\.m3u8($|\?)/i.test(url)) {
    try {
      await loadHLS();

      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,

          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          maxLiveSyncPlaybackRate: 1.05,

          backBufferLength: 15,
          maxBufferLength: 20,

          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 5
        });

        state.hls = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (!data.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
            state.hls = null;
            notify("This stream is unavailable.");
          }
        });

        return;
      }
    } catch (error) {
      console.warn("HLS playback error:", error);
    }
  }

  video.src = url;

  video.play().catch(() => {
    notify("Press Play to start.");
  });
}

/* ========================= TV PLAYBACK ========================= */

async function playTV(item) {
  state.currentTV = item;
  state.currentRadio = null;
  state.currentMovie = null;

  if ($("tvPlaceholder")) {
    $("tvPlaceholder").style.display = "none";
  }

  if ($("tvVideo")) {
    $("tvVideo").style.display = "block";
  }

  message("tvNowPlaying", item.name);
  message("tvMessage", "Connecting to stream...");

  addRecent(item);
  updatePlayerFavorite();

  await playStream($("tvVideo"), item.url, item);

  message("tvMessage", "Stream connection started.");
}

/* ========================= RADIO ========================= */

async function radioRequest(path) {
  for (const server of RADIO_SERVERS) {
    try {
      const response = await fetch(server + path);

      if (!response.ok) throw new Error("Radio API failed");

      return await response.json();
    } catch (error) {
      console.warn("Trying another radio server...");
    }
  }

  return [];
}

function convertRadio(station, index) {
  return {
    id: makeID("radio", station.name, index),
    name: station.name || "Radio",
    url: station.url_resolved || station.url,
    image: station.favicon || "",
    country: station.country || "",
    language: station.language || "",
    category: station.tags || "",
    type: "radio"
  };
}

async function loadRadio() {
  message("radioMessage", "Loading radio stations...");

  const [rwanda, world] = await Promise.all([
    radioRequest(
      "/json/stations/bycountryexact/Rwanda?limit=500&order=clickcount&reverse=true&hidebroken=true"
    ),
    radioRequest(
      "/json/stations/search?limit=500&order=clickcount&reverse=true&hidebroken=true"
    )
  ]);

  state.radios = unique(
    [
      ...rwanda.map((x, i) => convertRadio(x, i)),
      ...world.map((x, i) => convertRadio(x, i))
    ].filter(x => x.url),
    x => x.url
  );

  renderRadio();
  updateCounts();

  message(
    "radioMessage",
    `Rwanda stations: ${rwanda.length} • Total: ${state.radios.length}`
  );
}

function getFilteredRadio() {
  const search = normalize($("radioSearch")?.value);
  const country = $("radioCountry")?.value || "";
  const language = $("radioLanguage")?.value || "";

  return state.radios.filter(item => {
    const matchSearch =
      !search ||
      normalize(item.name).includes(search) ||
      normalize(item.country).includes(search) ||
      normalize(item.language).includes(search);

    const matchCountry = !country || item.country === country;

    const matchLanguage =
      !language || normalize(item.language).includes(normalize(language));

    return matchSearch && matchCountry && matchLanguage;
  });
}

function populateRadioFilters() {
  const countries = [...new Set(
    state.radios.map(x => x.country).filter(Boolean)
  )].sort();

  const languages = [...new Set(
    state.radios.flatMap(x =>
      (x.language || "").split(",").map(y => y.trim())
    ).filter(Boolean)
  )].sort();

  if ($("radioCountry")) {
    $("radioCountry").innerHTML =
      `<option value="">All countries</option>` +
      countries.map(country =>
        `<option value="${safe(country)}">${safe(country)}</option>`
      ).join("");
  }

  if ($("radioLanguage")) {
    $("radioLanguage").innerHTML =
      `<option value="">All languages</option>` +
      languages.map(language =>
        `<option value="${safe(language)}">${safe(language)}</option>`
      ).join("");
  }
}

function renderRadio() {
  populateRadioFilters();

  const items = getFilteredRadio();

  renderCards("radioGrid", items.slice(0, state.radioLimit));

  if ($("radioResultCount")) {
    $("radioResultCount").textContent = items.length + " stations";
  }

  if ($("moreRadio")) {
    $("moreRadio").style.display =
      items.length > state.radioLimit ? "" : "none";
  }
}

async function playRadio(item) {
  destroyPlayer();

  state.currentRadio = item;
  state.currentTV = null;
  state.currentMovie = null;

  const player = $("radioPlayer");
  if (!player) return;

  player.style.display = "block";
  player.src = item.url;
  player.controls = true;

  message("radioNowPlaying", item.name);

  if ($("radioDetails")) {
    $("radioDetails").textContent =
      [item.country, item.language].filter(Boolean).join(" • ");
  }

  addRecent(item);
  updatePlayerFavorite();

  try {
    await player.play();
  } catch {
    notify("Press Play to listen.");
  }
}

/* ========================= MOVIE CHANNELS ========================= */

async function loadMovieChannels() {
  message("movieChannelsMessage", "Loading movie channels...");

  try {
    const text = await getText(SOURCES.movieTV);

    state.movieChannels = parseM3U(text, "movie-channel");

    renderCards("movieChannelsGrid", state.movieChannels.slice(0, 48));

    message(
      "movieChannelsMessage",
      state.movieChannels.length + " movie channels"
    );

    updateCounts();
  } catch (error) {
    message("movieChannelsMessage", "Movie channels unavailable.");
  }
}

/* ========================= MOVIES ========================= */

async function loadMovies() {
  message("movieMessage", "Loading movie catalog...");

  try {
    const url =
      "https://archive.org/advancedsearch.php" +
      "?q=mediatype%3Amovie+AND+collection%3Afeature_films" +
      "&fl%5B%5D=identifier&fl%5B%5D=title" +
      "&rows=100&page=1&output=json";

    const response = await fetch(url);
    if (!response.ok) throw new Error("Catalog unavailable");

    const data = await response.json();

    state.movies = (data.response?.docs || []).map((x, i) => ({
      id: makeID("movie", x.identifier, i),
      name: x.title || x.identifier,
      identifier: x.identifier,
      image: "https://archive.org/services/img/" + encodeURIComponent(x.identifier),
      category: "Movie",
      type: "movie"
    }));

    renderMovies();
    updateCounts();

    message("movieMessage", state.movies.length + " movies loaded");
  } catch (error) {
    message("movieMessage", "Unable to load movies.");
  }
}

function renderMovies() {
  const search = normalize($("movieSearch")?.value);

  const items = state.movies.filter(x =>
    !search || normalize(x.name).includes(search)
  );

  renderCards("movieGrid", items.slice(0, state.movieLimit));

  if ($("movieResultCount")) {
    $("movieResultCount").textContent = items.length + " movies";
  }

  if ($("moreMovies")) {
    $("moreMovies").style.display =
      items.length > state.movieLimit ? "" : "none";
  }
}

async function playMovie(item) {
  state.currentMovie = item;
  state.currentTV = null;
  state.currentRadio = null;

  if ($("moviePlayerPanel")) {
    $("moviePlayerPanel").style.display = "block";
  }

  message("movieNowPlaying", item.name);
  message("movieMessage", "Loading video...");

  addRecent(item);
  updatePlayerFavorite();

  try {
    const response = await fetch(
      "https://archive.org/metadata/" + encodeURIComponent(item.identifier)
    );

    if (!response.ok) throw new Error("Metadata unavailable");

    const data = await response.json();

    const files = (data.files || []).filter(file => {
      return /\.(mp4|webm|ogv)$/i.test(file.name || "");
    });

    files.sort((a, b) => {
      if (/\.mp4$/i.test(a.name)) return -1;
      if (/\.mp4$/i.test(b.name)) return 1;
      return 0;
    });

    if (!files.length) {
      message("movieMessage", "No compatible video file found.");
      return;
    }

    const url =
      "https://archive.org/download/" +
      encodeURIComponent(item.identifier) +
      "/" + encodeURIComponent(files[0].name);

    const video = $("movieVideo");
    if (!video) return;

    destroyPlayer();

    video.style.display = "block";
    video.src = url;
    video.controls = true;

    video.play().catch(() => notify("Press Play to start."));

    message("movieMessage", "Video ready.");
  } catch (error) {
    message("movieMessage", "Unable to play this movie.");
  }
}

/* ========================= ITEM ROUTING ========================= */

function playItem(item) {
  if (!item) return;

  if (item.type === "radio") return playRadio(item);
  if (item.type === "movie") return playMovie(item);
  if (item.type === "movie-channel") return playMovieChannel(item);

  return playTV(item);
}

async function playMovieChannel(item) {
  state.currentMovie = item;
  state.currentTV = null;
  state.currentRadio = null;

  if ($("moviePlayerPanel")) {
    $("moviePlayerPanel").style.display = "block";
  }

  message("movieNowPlaying", item.name);
  message("movieMessage", "Connecting...");

  addRecent(item);
  updatePlayerFavorite();

  await playStream($("movieVideo"), item.url, item);
}

/* ========================= HOME ========================= */

function renderFeatured() {
  renderCards("featuredChannels", state.tv.slice(0, 12));
}

function renderHomeRecent() {
  renderCards("homeRecent", state.recent.slice(0, 8));
}

/* ========================= SEARCH ========================= */

function globalSearch(query) {
  const q = normalize(query);
  if (!q) return;

  const items = [
    ...state.tv,
    ...state.radios,
    ...state.movies,
    ...state.movieChannels
  ];

  const results = items.filter(item =>
    normalize(item.name).includes(q) ||
    normalize(item.country).includes(q) ||
    normalize(item.category).includes(q)
  );

  if (!results.length) {
    notify("No results found.");
    return;
  }

  const first = results[0];

  if (first.type === "radio") {
    setPage("radio");
    $("radioSearch").value = query;
    renderRadio();
  } else if (first.type === "movie") {
    setPage("movies");
    $("movieSearch").value = query;
    renderMovies();
  } else {
    setPage("tv");
    $("tvSearch").value = query;
    renderTV();
  }
}

/* ========================= EVENTS ========================= */

function bindEvents() {
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => setPage(button.dataset.page));
  });

  $("menuToggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });

  $("globalSearch")?.addEventListener("keydown", event => {
    if (event.key === "Enter") globalSearch(event.target.value);
  });

  $("tvSearch")?.addEventListener("input", () => {
    state.tvLimit = 48;
    renderTV();
  });

  $("tvCountry")?.addEventListener("change", () => {
    state.tvLimit = 48;
    renderTV();
  });

  $("tvCategory")?.addEventListener("change", renderTV);
  $("tvSort")?.addEventListener("change", renderTV);

  $("moreChannels")?.addEventListener("click", () => {
    state.tvLimit += 48;
    renderTV();
  });

  $("radioSearch")?.addEventListener("input", () => {
    state.radioLimit = 48;
    renderRadio();
  });

  $("radioCountry")?.addEventListener("change", renderRadio);
  $("radioLanguage")?.addEventListener("change", renderRadio);

  $("moreRadio")?.addEventListener("click", () => {
    state.radioLimit += 48;
    renderRadio();
  });

  $("movieSearch")?.addEventListener("input", () => {
    state.movieLimit = 24;
    renderMovies();
  });

  $("searchMovies")?.addEventListener("click", renderMovies);

  $("moreMovies")?.addEventListener("click", () => {
    state.movieLimit += 24;
    renderMovies();
  });

  $("playerFavorite")?.addEventListener("click", () => {
    const item =
      state.currentTV ||
      state.currentRadio ||
      state.currentMovie;

    if (item) toggleFavorite(item);
  });
}

/* ========================= INIT ========================= */

async function init() {
  if ($("year")) {
    $("year").textContent = new Date().getFullYear();
  }

  bindEvents();

  renderFavorites();
  renderRecent();
  renderHomeRecent();

  await Promise.allSettled([
    loadTV(),
    loadRadio(),
    loadMovies(),
    loadMovieChannels()
  ]);

  renderFeatured();
  renderHomeRecent();
  renderFavorites();
  renderRecent();
  updateCounts();

  console.log("ITT-TV ready.");
}

document.addEventListener("DOMContentLoaded", init);
