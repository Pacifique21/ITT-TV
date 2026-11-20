"use strict";

/* ============================================================
   ITT-TV — COMPLETE TV, RADIO & MOVIES
   Rwanda Radio + International Radio
   HLS Playback + Live Edge + Retry
   TV | RADIO | MOVIES | FAVORITES | RECENT
   ============================================================ */

const $ = id => document.getElementById(id);

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

  tvLimit: 48,
  radioLimit: 48,
  movieLimit: 24,

  activePage: "home",
  tvSort: "name"
};

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

/* ============================================================
   HELPERS
   ============================================================ */

function safeText(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function uniqueBy(items, keyFunction) {
  const seen = new Set();

  return items.filter(item => {
    const key = keyFunction(item);

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function readStorage(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function toast(message) {
  const el = $("toast");

  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(toast.timeout);

  toast.timeout = setTimeout(() => {
    el.classList.remove("show");
  }, 2800);
}

function setMessage(id, message) {
  const el = $(id);
  if (el) el.textContent = message;
}

function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function showLoading(id, message = "Loading...") {
  setMessage(id, message);
}

function getHost(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function makeID(prefix, name, index = 0) {
  return prefix + "-" + index + "-" +
    normalize(name).replace(/[^a-z0-9]+/g, "-").slice(0, 50);
}

function getCountryName(code) {
  if (!code) return "Unknown";

  try {
    return new Intl.DisplayNames(["en"], { type: "region" })
      .of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function updateCounts() {
  const tv = $("totalTV");
  const radio = $("totalRadio");
  const movies = $("totalMovies");

  if (tv) tv.textContent = state.tv.length.toLocaleString();
  if (radio) radio.textContent = state.radios.length.toLocaleString();
  if (movies) movies.textContent = state.movies.length.toLocaleString();
}

function setActivePage(page) {
  state.activePage = page;

  document.querySelectorAll(".page").forEach(el => {
    el.classList.remove("active");
  });

  const pageEl = $(page + "Page");
  if (pageEl) pageEl.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const sidebar = $("sidebar");
  if (sidebar) sidebar.classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPage(page) {
  setActivePage(page);
}

/* ============================================================
   FAVORITES & RECENT
   ============================================================ */

state.favorites = readStorage(STORAGE.favorites);
state.recent = readStorage(STORAGE.recent);

function isFavorite(item) {
  return state.favorites.some(f => f.id === item.id);
}

function toggleFavorite(item) {
  if (!item) return;

  if (isFavorite(item)) {
    state.favorites = state.favorites.filter(f => f.id !== item.id);
    toast("Removed from favorites");
  } else {
    state.favorites.unshift(item);
    toast("Added to favorites");
  }

  saveStorage(STORAGE.favorites, state.favorites);
  renderFavorites();
  updateFavoriteButton(item);
}

function updateFavoriteButton(item) {
  const button = $("playerFavorite");
  if (!button || !item) return;

  button.textContent = isFavorite(item) ? "★" : "☆";
  button.classList.toggle("favorited", isFavorite(item));
}

function addRecent(item) {
  if (!item) return;

  state.recent = [
    item,
    ...state.recent.filter(r => r.id !== item.id)
  ].slice(0, 60);

  saveStorage(STORAGE.recent, state.recent);
  renderRecent();
}

function renderFavorites() {
  const grid = $("favoritesGrid");
  if (!grid) return;

  if (!state.favorites.length) {
    grid.innerHTML = `<div class="empty-state">No favorites yet.</div>`;
    return;
  }

  grid.innerHTML = state.favorites.map(item => cardHTML(item)).join("");
}

function renderRecent() {
  const grid = $("recentGrid");
  if (!grid) return;

  if (!state.recent.length) {
    grid.innerHTML = `<div class="empty-state">Nothing watched yet.</div>`;
    return;
  }

  grid.innerHTML = state.recent.map(item => cardHTML(item)).join("");
}

/* ============================================================
   UNIVERSAL MEDIA CARD
   ============================================================ */

function cardHTML(item) {
  const favorite = isFavorite(item);
  const logo = item.image || item.logo || "";

  return `
    <article class="media-card" data-id="${safeText(item.id)}">
      <div class="media-card-image">
        ${
          logo
            ? `<img src="${safeText(logo)}"
                 alt="${safeText(item.name)}"
                 loading="lazy"
                 onerror="this.style.display='none'">`
            : `<div class="card-placeholder">▶</div>`
        }

        <button class="card-favorite"
          data-favorite="${safeText(item.id)}"
          title="Favorite">
          ${favorite ? "★" : "☆"}
        </button>
      </div>

      <div class="media-card-info">
        <h3>${safeText(item.name)}</h3>
        <p>${safeText(item.country || item.category || item.type || "")}</p>
      </div>
    </article>
  `;
}

function attachCardEvents(container) {
  if (!container) return;

  container.querySelectorAll(".media-card").forEach(card => {
    card.addEventListener("click", event => {
      if (event.target.closest("[data-favorite]")) return;

      const item = findMedia(card.dataset.id);
      if (item) playItem(item);
    });
  });

  container.querySelectorAll("[data-favorite]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();

      const item = findMedia(button.dataset.favorite);
      if (item) toggleFavorite(item);
    });
  });
}

function findMedia(id) {
  return [
    ...state.tv,
    ...state.radios,
    ...state.movies,
    ...state.movieChannels,
    ...state.favorites,
    ...state.recent
  ].find(item => item.id === id);
}

function renderGrid(containerID, items) {
  const grid = $(containerID);
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">No results found.</div>`;
    return;
  }

  grid.innerHTML = items.map(cardHTML).join("");
  attachCardEvents(grid);
}

/* ============================================================
   PLAYLIST PARSER
   ============================================================ */

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
      const channelID = value.match(/tvg-id="([^"]*)"/i);

      current = {
        name: name || "Channel",
        image: logo?.[1] || "",
        country: country?.[1] || "",
        category: category?.[1] || "",
        externalID: channelID?.[1] || "",
        type
      };
    } else if (value && !value.startsWith("#") && current) {
      const url = value;

      // Remove only URLs clearly identified as VOD/replay.
      // This is not proof that the remaining sources are live.
      const obviousVOD =
        /\/movie\/|\/vod\/|\/series\/|\/recorded\/|catchup=|timeshift=/i;

      if (type !== "tv" || !obviousVOD.test(url)) {
        current.url = url;
        current.id = makeID(type, current.name, result.length);

        result.push(current);
      }

      current = null;
    }
  }

  return result;
}

/* ============================================================
   LOAD TV
   ============================================================ */

async function loadTV() {
  showLoading("tvMessage", "Loading TV channels...");
  showLoading("tvPlaceholder", "Loading channels...");

  try {
    const response = await fetch(PLAYLISTS.tv, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error("Playlist unavailable");
    }

    const text = await response.text();

    state.tv = parsePlaylist(text, "tv");

    // Rwanda first, then other countries.
    state.tv.sort((a, b) => {
      const aRW = normalize(a.country).includes("rw");
      const bRW = normalize(b.country).includes("rw");

      if (aRW && !bRW) return -1;
      if (!aRW && bRW) return 1;

      return a.name.localeCompare(b.name);
    });

    state.tvRegular = state.tv.filter(item =>
      !normalize(item.category).includes("movie")
    );

    renderTV();
    renderFeatured();
    updateCounts();

    setMessage(
      "tvMessage",
      `${state.tv.length.toLocaleString()} channels loaded`
    );
  } catch (error) {
    console.error("TV loading error:", error);

    setMessage(
      "tvMessage",
      "Unable to load TV channels. Check your internet and try again."
    );

    setMessage("tvPlaceholder", "Channels could not be loaded.");
  }
}

function getFilteredTV() {
  const search = normalize($("tvSearch")?.value || "");
  const country = $("tvCountry")?.value || "";
  const category = $("tvCategory")?.value || "";

  let list = state.tv.filter(item => {
    const matchesSearch =
      !search ||
      normalize(item.name).includes(search) ||
      normalize(item.country).includes(search) ||
      normalize(item.category).includes(search);

    const matchesCountry =
      !country || item.country === country;

    const matchesCategory =
      !category || item.category === category;

    return matchesSearch && matchesCountry && matchesCategory;
  });

  if (state.tvSort === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.tvSort === "country") {
    list.sort((a, b) => a.country.localeCompare(b.country));
  }

  return list;
}

function populateTVFilters() {
  const countries = [...new Set(
    state.tv.map(item => item.country).filter(Boolean)
  )].sort();

  const categories = [...new Set(
    state.tv.map(item => item.category).filter(Boolean)
  )].sort();

  const countrySelect = $("tvCountry");
  const categorySelect = $("tvCategory");

  if (countrySelect) {
    countrySelect.innerHTML =
      `<option value="">All countries</option>` +
      countries.map(c =>
        `<option value="${safeText(c)}">${safeText(getCountryName(c))}</option>`
      ).join("");
  }

  if (categorySelect) {
    categorySelect.innerHTML =
      `<option value="">All categories</option>` +
      categories.map(c =>
        `<option value="${safeText(c)}">${safeText(c)}</option>`
      ).join("");
  }
}

function renderTV() {
  populateTVFilters();

  const list = getFilteredTV();
  const visible = list.slice(0, state.tvLimit);

  renderGrid("tvGrid", visible);

  const count = $("tvResultCount");
  if (count) {
    count.textContent = `${list.length.toLocaleString()} channels`;
  }

  const more = $("moreChannels");
  if (more) {
    more.style.display = list.length > state.tvLimit ? "" : "none";
  }
}

/* ============================================================
   HLS PLAYER
   ============================================================ */

function loadHlsScript() {
  if (window.Hls) return Promise.resolve();

  if (state.hlsScriptPromise) return state.hlsScriptPromise;

  state.hlsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => {
      state.hlsScriptPromise = null;
      reject(new Error("HLS.js failed to load"));
    };

    document.head.appendChild(script);
  });

  return state.hlsScriptPromise;
}

function destroyPlayer() {
  if (state.hls) {
    try {
      state.hls.destroy();
    } catch {}
    state.hls = null;
  }

  const videos = [
    $("tvVideo"),
    $("movieVideo")
  ].filter(Boolean);

  videos.forEach(video => {
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

function isHLS(url) {
  return /\.m3u8($|\?)/i.test(url);
}

async function playVideoStream(video, url, item) {
  if (!video || !url) return;

  destroyPlayer();

  video.style.display = "block";
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;

  if (isHLS(url)) {
    try {
      await loadHlsScript();

      if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,

          // Live-stream settings:
          lowLatencyMode: true,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          maxLiveSyncPlaybackRate: 1.05,

          // Keep buffers reasonably small:
          backBufferLength: 15,
          maxBufferLength: 20,
          maxMaxBufferLength: 30,

          // Retry network failures:
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 5,
          manifestLoadingRetryDelay: 1000,
          levelLoadingRetryDelay: 1000,
          fragLoadingRetryDelay: 1000
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
            showPlaybackError(item);
          }
        });

        return;
      }
    } catch (error) {
      console.warn("HLS player issue:", error);
    }
  }

  // Native HLS support (Safari and some mobile browsers).
  video.src = url;

  video.play().catch(() => {
    toast("Press Play to start the stream.");
  });
}

function showPlaybackError(item) {
  toast("This stream may be offline or unavailable.");

  if (item?.type === "radio") {
    setMessage("radioMessage", "Stream unavailable. Try another station.");
  } else if (item?.type === "movie") {
    setMessage("movieMessage", "This video cannot be played.");
  } else {
    setMessage("tvMessage", "Channel unavailable. Try another channel.");
  }
}

/* ============================================================
   PLAY TV
   ============================================================ */

async function playTV(item) {
  if (!item) return;

  state.currentTV = item;
  state.currentRadio = null;
  state.currentMovie = null;

  const placeholder = $("tvPlaceholder");
  const video = $("tvVideo");

  if (placeholder) placeholder.style.display = "none";
  if (video) video.style.display = "block";

  setMessage("tvNowPlaying", item.name);
  setMessage("tvMessage", "Connecting to stream...");

  addRecent(item);
  updateFavoriteButton(item);

  await playVideoStream(video, item.url, item);

  setMessage("tvMessage", "Stream connection started.");
}

/* ============================================================
   RADIO — RWANDA FIRST
   ============================================================ */

async function fetchStationsFromServer(server, path) {
  const url = server + path;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) throw new Error("Radio API error");

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function convertRadio(station, index, type = "radio") {
  return {
    id: makeID(type, station.name, index),
    name: station.name || "Radio station",
    url: station.url_resolved || station.url,
    image: station.favicon || "",
    logo: station.favicon || "",
    country: station.country || "",
    category: station.tags || "",
    language: station.language || "",
    type: "radio"
  };
}

async function loadRwandaRadio() {
  const path =
    "/json/stations/bycountryexact/Rwanda" +
    "?limit=500&order=clickcount&reverse=true&hidebroken=true";

  for (const server of RADIO_SERVERS) {
    try {
      const stations = await fetchStationsFromServer(server, path);

      return uniqueBy(
        stations
          .filter(s => s.url_resolved || s.url)
          .map((s, i) => convertRadio(s, i, "rwanda-radio")),
        item => item.url
      );
    } catch (error) {
      console.warn("Rwanda radio server failed:", server);
    }
  }

  return [];
}

async function loadInternationalRadio() {
  const path =
    "/json/stations/search" +
    "?limit=500&order=clickcount&reverse=true&hidebroken=true";

  for (const server of RADIO_SERVERS) {
    try {
      const stations = await fetchStationsFromServer(server, path);

      return uniqueBy(
        stations
          .filter(s => s.url_resolved || s.url)
          .map((s, i) => convertRadio(s, i, "international-radio")),
        item => item.url
      );
    } catch (error) {
      console.warn("International radio server failed:", server);
    }
  }

  return [];
}

async function loadRadio() {
  showLoading("radioMessage", "Loading Rwanda radio stations...");

  const [rwanda, international] = await Promise.all([
    loadRwandaRadio(),
    loadInternationalRadio()
  ]);

  state.rwandaRadios = rwanda;
  state.internationalRadios = international;

  state.radios = uniqueBy(
    [...rwanda, ...international],
    item => item.url
  );

  renderRadio();
  updateCounts();

  setMessage(
    "radioMessage",
    `${rwanda.length} Rwanda stations • ${international.length} international stations`
  );
}

function getFilteredRadio() {
  const search = normalize($("radioSearch")?.value || "");
  const country = $("radioCountry")?.value || "";
  const language = $("radioLanguage")?.value || "";

  return state.radios.filter(item => {
    const matchesSearch =
      !search ||
      normalize(item.name).includes(search) ||
      normalize(item.country).includes(search) ||
      normalize(item.language).includes(search) ||
      normalize(item.category).includes(search);

    const matchesCountry =
      !country || item.country === country;

    const matchesLanguage =
      !language || normalize(item.language).includes(normalize(language));

    return matchesSearch && matchesCountry && matchesLanguage;
  });
}

function populateRadioFilters() {
  const countries = [...new Set(
    state.radios.map(item => item.country).filter(Boolean)
  )].sort();

  const languages = [...new Set(
    state.radios.flatMap(item =>
      (item.language || "").split(",").map(x => x.trim())
    ).filter(Boolean)
  )].sort();

  const countrySelect = $("radioCountry");
  const languageSelect = $("radioLanguage");

  if (countrySelect) {
    countrySelect.innerHTML =
      `<option value="">All countries</option>` +
      countries.map(country =>
        `<option value="${safeText(country)}">${safeText(country)}</option>`
      ).join("");
  }

  if (languageSelect) {
    languageSelect.innerHTML =
      `<option value="">All languages</option>` +
      languages.slice(0, 300).map(language =>
        `<option value="${safeText(language)}">${safeText(language)}</option>`
      ).join("");
  }
}

function renderRadio() {
  populateRadioFilters();

  const list = getFilteredRadio();
  const visible = list.slice(0, state.radioLimit);

  renderGrid("radioGrid", visible);

  const count = $("radioResultCount");
  if (count) count.textContent = `${list.length} stations`;

  const more = $("moreRadio");
  if (more) more.style.display =
    list.length > state.radioLimit ? "" : "none";
}

async function playRadio(item) {
  if (!item) return;

  state.currentRadio = item;
  state.currentTV = null;
  state.currentMovie = null;

  destroyPlayer();

  const player = $("radioPlayer");
  if (!player) return;

  player.style.display = "block";
  player.src = item.url;
  player.autoplay = true;
  player.controls = true;

  const name = $("radioNowPlaying");
  if (name) name.textContent = item.name;

  const details = $("radioDetails");
  if (details) {
    details.textContent =
      [item.country, item.language].filter(Boolean).join(" • ");
  }

  addRecent(item);
  updateFavoriteButton(item);

  try {
    await player.play();
  } catch {
    toast("Press Play to start the radio.");
  }
}

/* ============================================================
   MOVIES
   ============================================================ */

async function loadMovies() {
  showLoading("movieMessage", "Loading movie catalog...");

  try {
    const response = await fetch(
      "https://archive.org/advancedsearch.php" +
      "?q=mediatype%3Amovie+AND+collection%3Afeature_films" +
      "&fl%5B%5D=identifier&fl%5B%5D=title" +
      "&rows=100&page=1&output=json"
    );

    if (!response.ok) throw new Error("Movie catalog unavailable");

    const data = await response.json();

    const records = data.response?.docs || [];

    state.movies = records.map((movie, index) => ({
      id: makeID("movie", movie.identifier, index),
      name: movie.title || movie.identifier,
      identifier: movie.identifier,
      image:
        `https://archive.org/services/img/${encodeURIComponent(movie.identifier)}`,
      type: "movie",
      category: "Movie",
      country: ""
    }));

    renderMovies();
    updateCounts();

    setMessage("movieMessage", `${state.movies.length} movies loaded`);
  } catch (error) {
    console.error("Movie loading error:", error);
    setMessage("movieMessage", "Movie catalog unavailable.");
  }
}

async function playMovie(item) {
  if (!item) return;

  state.currentMovie = item;
  state.currentTV = null;
  state.currentRadio = null;

  const panel = $("moviePlayerPanel");
  if (panel) panel.style.display = "block";

  setMessage("movieNowPlaying", item.name);
  setMessage("movieMessage", "Finding video...");

  addRecent(item);
  updateFavoriteButton(item);

  try {
    const response = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(item.identifier)}`
    );

    if (!response.ok) throw new Error("Metadata unavailable");

    const data = await response.json();

    const files = data.files || [];

    const playable = files.filter(file => {
      const name = (file.name || "").toLowerCase();
      const format = (file.format || "").toLowerCase();

      return (
        /\.(mp4|webm|ogv)$/i.test(name) ||
        format.includes("mpeg4") ||
        format.includes("webm") ||
        format.includes("ogg")
      );
    });

    playable.sort((a, b) => {
      const aMP4 = /\.mp4$/i.test(a.name) ? 0 : 1;
      const bMP4 = /\.mp4$/i.test(b.name) ? 0 : 1;
      return aMP4 - bMP4;
    });

    if (!playable.length) {
      setMessage("movieMessage", "No compatible video file found.");
      return;
    }

    const file = playable[0];

    const url =
      `https://archive.org/download/${encodeURIComponent(item.identifier)}` +
      `/${encodeURIComponent(file.name)}`;

    const video = $("movieVideo");
    if (!video) return;

    destroyPlayer();

    video.style.display = "block";
    video.src = url;
    video.controls = true;
    video.autoplay = true;

    video.play().catch(() => {
      toast("Press Play to start the movie.");
    });

    setMessage("movieMessage", "Video ready.");
  } catch (error) {
    console.error("Movie player error:", error);
    setMessage("movieMessage", "Unable to play this movie.");
  }
}

function renderMovies() {
  const search = normalize($("movieSearch")?.value || "");

  const list = state.movies.filter(item =>
    !search || normalize(item.name).includes(search)
  );

  renderGrid("movieGrid", list.slice(0, state.movieLimit));

  const count = $("movieResultCount");
  if (count) count.textContent = `${list.length} movies`;

  const more = $("moreMovies");
  if (more) {
    more.style.display =
      list.length > state.movieLimit ? "" : "none";
  }
}

/* ============================================================
   MOVIE CHANNELS
   ============================================================ */

async function loadMovieChannels() {
  try {
    const response = await fetch(
      "https://iptv-org.github.io/iptv/categories/movies.m3u"
    );

    if (!response.ok) throw new Error("Movie channels unavailable");

    const text = await response.text();

    state.movieChannels = parsePlaylist(text, "movie-channel");

    renderGrid("movieChannelsGrid", state.movieChannels.slice(0, 40));

    setMessage(
      "movieChannelsMessage",
      `${state.movieChannels.length} movie channels`
    );
  } catch (error) {
    setMessage("movieChannelsMessage", "Movie channels unavailable.");
  }
}

/* ============================================================
   PLAY ITEM
   ============================================================ */

function playItem(item) {
  if (!item) return;

  switch (item.type) {
    case "radio":
      playRadio(item);
      break;

    case "movie":
      playMovie(item);
      break;

    case "movie-channel":
      playMovieChannel(item);
      break;

    default:
      playTV(item);
      break;
  }
}

async function playMovieChannel(item) {
  const panel = $("moviePlayerPanel");
  const video = $("movieVideo");

  if (panel) panel.style.display = "block";

  setMessage("movieNowPlaying", item.name);
  setMessage("movieMessage", "Connecting...");

  addRecent(item);
  updateFavoriteButton(item);

  await playVideoStream(video, item.url, item);

  setMessage("movieMessage", "Connection started.");
}

/* ============================================================
   FEATURED CHANNELS
   ============================================================ */

function renderFeatured() {
  const container = $("featuredChannels");
  if (!container) return;

  const featured = state.tv.slice(0, 12);

  container.innerHTML = featured.map(cardHTML).join("");
  attachCardEvents(container);
}

function renderHomeRecent() {
  const container = $("homeRecent");
  if (!container) return;

  const items = state.recent.slice(0, 8);

  container.innerHTML = items.map(cardHTML).join("");
  attachCardEvents(container);
}

/* ============================================================
   SEARCH
   ============================================================ */

function searchEverything(query) {
  const q = normalize(query);

  if (!q) return;

  const results = [
    ...state.tv,
    ...state.radios,
    ...state.movies
  ].filter(item =>
    normalize(item.name).includes(q) ||
    normalize(item.country).includes(q) ||
    normalize(item.category).includes(q)
  );

  if (!results.length) {
    toast("No results found.");
    return;
  }

  const first = results[0];

  if (first.type === "radio") {
    setActivePage("radio");
    if ($("radioSearch")) $("radioSearch").value = query;
    renderRadio();
  } else if (first.type === "movie") {
    setActivePage("movies");
    if ($("movieSearch")) $("movieSearch").value = query;
    renderMovies();
  } else {
    setActivePage("tv");
    if ($("tvSearch")) $("tvSearch").value = query;
    renderTV();
  }
}

/* ============================================================
   EVENTS
   ============================================================ */

function bindEvents() {
  // Navigation
  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      setActivePage(button.dataset.page);
    });
  });

  // Sidebar
  $("menuToggle")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });

  // Global search
  $("globalSearch")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      searchEverything(event.target.value);
    }
  });

  // TV search & filters
  $("tvSearch")?.addEventListener("input", () => {
    state.tvLimit = 48;
    renderTV();
  });

  $("tvCountry")?.addEventListener("change", renderTV);
  $("tvCategory")?.addEventListener("change", renderTV);

  $("tvSort")?.addEventListener("change", event => {
    state.tvSort = event.target.value;
    renderTV();
  });

  $("moreChannels")?.addEventListener("click", () => {
    state.tvLimit += 48;
    renderTV();
  });

  // Radio
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

  // Movies
  $("movieSearch")?.addEventListener("input", () => {
    state.movieLimit = 24;
    renderMovies();
  });

  $("searchMovies")?.addEventListener("click", renderMovies);

  $("moreMovies")?.addEventListener("click", () => {
    state.movieLimit += 24;
    renderMovies();
  });

  // Player favorite
  $("playerFavorite")?.addEventListener("click", () => {
    const item =
      state.currentTV ||
      state.currentRadio ||
      state.currentMovie;

    if (item) toggleFavorite(item);
  });

  // Refresh
  $("refreshTV")?.addEventListener("click", loadTV);
  $("refreshRadio")?.addEventListener("click", loadRadio);
  $("refreshMovies")?.addEventListener("click", loadMovies);

  // TV cards
  $("tvGrid")?.addEventListener("click", () => {});
}

/* ============================================================
   INIT
   ============================================================ */

async function init() {
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  bindEvents();

  renderFavorites();
  renderRecent();

  // Load services together
  await Promise.allSettled([
    loadTV(),
    loadRadio(),
    loadMovies(),
    loadMovieChannels()
  ]);

  renderHomeRecent();
  renderFavorites();
  renderRecent();
  updateCounts();

  console.log("ITT-TV initialized.");
}

document.addEventListener("DOMContentLoaded", init);
