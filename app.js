
"use strict";

/* =========================================================
   ITT-TV — COMPLETE LIVE TV, MOVIE CHANNELS & RADIO PLAYER
   Public playlists + Radio Browser + HLS.js
   ========================================================= */

const $ = id => document.getElementById(id);

const state = {
  tv: [],
  tvRegular: [],
  movieChannels: [],
  radios: [],
  movies: [],
  currentTV: null,
  currentRadio: null,
  hls: null,
  hlsScriptPromise: null,
  tvLimit: 40,
  radioLimit: 40,
  moviePage: 1,
  movieQuery: "",
  movieHasMore: false,
  radioRequest: 0,
  movieRequest: 0
};

const IPTV_ALL =
  "https://iptv-org.github.io/iptv/index.m3u";

const IPTV_MOVIES =
  "https://iptv-org.github.io/iptv/categories/movies.m3u";

const RADIO_SERVERS = [
  "https://all.api.radio-browser.info",
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];
/* ---------------- BASIC HELPERS ---------------- */

function saved(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Storage unavailable:", error);
  }
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function message(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}

function setHidden(id, hidden) {
  const el = $(id);
  if (el) el.classList.toggle("hidden", hidden);
}

function toast(text) {
  const el = $("toast");
  if (!el) return;

  el.textContent = text;
  el.style.display = "block";

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    el.style.display = "none";
  }, 2800);
}

function makeChannelId(url) {
  let hash = 0;

  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash) + url.charCodeAt(i);
    hash |= 0;
  }

  return "channel-" + Math.abs(hash);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isHLS(url) {
  return /\.m3u8($|\?)/i.test(String(url || ""));
}

/* ---------------- NAVIGATION ---------------- */

function showPage(name) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle(
      "active",
      page.id === name + "Page"
    );
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === name
    );
  });

  $("sidebar")?.classList.remove("open");

  if (name === "favorites") renderFavorites();
  if (name === "recent") renderRecent();
  if (name === "home") renderHome();

  window.scrollTo({ top: 0, behavior: "auto" });
}

document.addEventListener("click", event => {
  const page = event.target.closest("[data-page]");

  if (page) {
    event.preventDefault();
    showPage(page.dataset.page);
    return;
  }

  const tv = event.target.closest("[data-tv]");

  if (tv) {
    playTV(tv.dataset.tv);
    return;
  }

  const radio = event.target.closest("[data-radio]");

  if (radio) {
    playRadio(Number(radio.dataset.radio));
    return;
  }

  const movie = event.target.closest("[data-movie]");

  if (movie) {
    playMovie(movie.dataset.movie);
    return;
  }

  const favorite = event.target.closest("[data-favorite]");

  if (favorite) {
    toggleFavorite(favorite.dataset.favorite);
  }
});

$("menuToggle")?.addEventListener("click", () => {
  $("sidebar")?.classList.toggle("open");
});

/* ---------------- MEDIA CARDS ---------------- */

function makeCard(item, type, index = 0) {
  const title = safe(item.name || item.title || "Unknown");
  const subtitle = safe(
    item.country || item.year || item.category || "International"
  );

  const logo = item.logo || item.favicon || "";

  let action = "";

  if (type === "tv") {
    action = `data-tv="${safe(item._id)}"`;
  }

  if (type === "radio") {
    action = `data-radio="${index}"`;
  }

  if (type === "movie") {
    action = `data-movie="${safe(item.identifier)}"`;
  }

  const symbol =
    type === "radio" ? "♫" :
    type === "movie" ? "🎬" : "▶";

  const favoriteButton = type === "tv"
    ? `<button type="button" data-favorite="${safe(item._id)}">♡ Save</button>`
    : "";

  return `
    <article class="media-card">
      <div class="card-image">
        ${
          logo
            ? `<img loading="lazy"
                    decoding="async"
                    src="${safe(logo)}"
                    alt=""
                    onerror="this.style.display='none'">`
            : `<span>${symbol}</span>`
        }
      </div>

      <div class="card-body">
        <h3>${title}</h3>
        <p>${subtitle}</p>

        <div class="card-actions">
          <button type="button" ${action}>
            ${type === "radio" ? "Listen" : type === "movie" ? "Watch" : "Play"}
          </button>

          ${favoriteButton}
        </div>
      </div>
    </article>
  `;
}

/* ---------------- M3U PLAYLIST READER ---------------- */

function parsePlaylist(content, defaultCountry = "International") {
  const lines = content.split(/\r?\n/);
  const channels = [];

  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").slice(1).join(",").trim();

      const logo =
        (line.match(/tvg-logo="([^"]*)"/i) || [])[1] || "";

      const country =
        (line.match(/tvg-country="([^"]*)"/i) || [])[1] ||
        defaultCountry;

      const language =
        (line.match(/tvg-language="([^"]*)"/i) || [])[1] || "";

      const category =
        (line.match(/group-title="([^"]*)"/i) || [])[1] ||
        "General";

      const tvgId =
        (line.match(/tvg-id="([^"]*)"/i) || [])[1] || "";

      current = {
        name: name || "TV Channel",
        logo,
        country,
        language,
        category,
        tvgId,
        url: "",
        _id: ""
      };

      continue;
    }

    if (line.startsWith("http") && current) {
      current.url = line;
      current._id = makeChannelId(line);

      channels.push(current);
      current = null;
    }
  }

  return channels;
}

async function fetchPlaylist(url, defaultCountry = "International") {
  const response = await fetch(url, {
    cache: "no-cache"
  });

  if (!response.ok) {
    throw new Error("Playlist request failed: " + response.status);
  }

  const content = await response.text();

  return parsePlaylist(content, defaultCountry);
}

/* ---------------- COMBINE TV LISTS ---------------- */

function mergeTVLists() {
  const combined = [
    ...state.tvRegular,
    ...state.movieChannels
  ];

  const seen = new Set();

  state.tv = combined.filter(channel => {
    if (!channel.url || seen.has(channel.url)) {
      return false;
    }

    seen.add(channel.url);
    return true;
  });

  setText("totalTV", state.tv.length);

  populateTVFilters();
  renderTV();
  renderHome();
  renderFavorites();
  renderRecent();
}

/* ---------------- LOAD ALL TV ---------------- */

async function loadTV() {
  message("tvResultCount", "Loading TV channels from around the world...");

  try {
    const channels = await fetchPlaylist(IPTV_ALL);

    state.tvRegular = channels;

    mergeTVLists();

    message(
      "tvResultCount",
      state.tv.length + " TV channels loaded."
    );

  } catch (error) {
    console.error("TV loading failed:", error);

    message(
      "tvResultCount",
      "TV channels could not load. Check your internet and refresh."
    );

    setHTML(
      "tvGrid",
      '<div class="empty">TV channels are temporarily unavailable.</div>'
    );
  }
}

/* ---------------- LOAD MOVIE CHANNELS ---------------- */

async function loadMovieChannels() {
  message("movieChannelsMessage", "Loading movie channels...");

  try {
    const channels = await fetchPlaylist(
      IPTV_MOVIES,
      "International"
    );

    state.movieChannels = channels;

    mergeTVLists();

    setHTML(
      "movieChannelsGrid",
      channels.map(channel => makeCard(channel, "tv")).join("") ||
      '<div class="empty">No movie channels found right now.</div>'
    );

    setText("totalMovies", channels.length);

    message(
      "movieChannelsMessage",
      channels.length + " movie channels found."
    );

  } catch (error) {
    console.error("Movie channel loading failed:", error);

    message(
      "movieChannelsMessage",
      "Movie channels are temporarily unavailable."
    );

    setHTML(
      "movieChannelsGrid",
      '<div class="empty">Could not load movie channels. Try again later.</div>'
    );
  }
}

/* ---------------- TV FILTERS ---------------- */

function populateTVFilters() {
  const countrySelect = $("tvCountry");
  const categorySelect = $("tvCategory");

  if (!countrySelect || !categorySelect) return;

  const oldCountry = countrySelect.value;
  const oldCategory = categorySelect.value;

  const countries = [
    ...new Set(state.tv.map(x => x.country).filter(Boolean))
  ].sort();

  const categories = [
    ...new Set(state.tv.map(x => x.category).filter(Boolean))
  ].sort();

  countrySelect.innerHTML =
    '<option value="">All countries</option>' +
    countries.map(x =>
      `<option value="${safe(x)}">${safe(x)}</option>`
    ).join("");

  categorySelect.innerHTML =
    '<option value="">All categories</option>' +
    categories.map(x =>
      `<option value="${safe(x)}">${safe(x)}</option>`
    ).join("");

  countrySelect.value = countries.includes(oldCountry) ? oldCountry : "";
  categorySelect.value = categories.includes(oldCategory) ? oldCategory : "";
}

function getFilteredTV() {
  const query = normalize($("tvSearch")?.value);
  const country = $("tvCountry")?.value || "";
  const category = $("tvCategory")?.value || "";

  let list = state.tv.filter(channel => {
    const matchesQuery =
      normalize(channel.name).includes(query) ||
      normalize(channel.country).includes(query) ||
      normalize(channel.category).includes(query);

    return matchesQuery &&
      (!country || channel.country === country) &&
      (!category || channel.category === category);
  });

  if ($("tvSort")?.value === "country") {
    list.sort((a, b) => a.country.localeCompare(b.country));
  } else {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return list;
}

function renderTV() {
  const list = getFilteredTV();

  message(
    "tvResultCount",
    `${list.length} TV channels found`
  );

  setHTML(
    "tvGrid",
    list.slice(0, state.tvLimit).map(channel =>
      makeCard(channel, "tv")
    ).join("") ||
    '<div class="empty">No channels found.</div>'
  );

  setHidden(
    "moreChannels",
    list.length <= state.tvLimit
  );
}

/* ---------------- HLS PLAYER ---------------- */

function stopHLS() {
  if (state.hls) {
    try {
      state.hls.destroy();
    } catch (error) {
      console.warn(error);
    }

    state.hls = null;
  }
}

function loadHlsLibrary() {
  if (window.Hls) {
    return Promise.resolve(true);
  }

  if (state.hlsScriptPromise) {
    return state.hlsScriptPromise;
  }

  state.hlsScriptPromise = new Promise(resolve => {
    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/dist/hls.min.js";

    script.async = true;

    script.onload = () => resolve(!!window.Hls);

    script.onerror = () => {
      state.hlsScriptPromise = null;
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return state.hlsScriptPromise;
}

/* ---------------- PLAY LIVE TV ---------------- */

async function playTV(id) {
  const channel = state.tv.find(item => item._id === id);

  if (!channel) {
    toast("Channel not found. Refresh the list.");
    return;
  }

  state.currentTV = channel;

  showPage("tv");

  setHidden("tvPlaceholder", true);

  setText("tvNowPlaying", channel.name);

  message(
    "tvMessage",
    "Connecting to " + channel.name + "..."
  );

  const video = $("tvVideo");

  if (!video) {
    message("tvMessage", "TV video player is missing from index.html.");
    return;
  }

  stopHLS();

  video.pause();
  video.removeAttribute("src");
  video.load();

  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;

  video.onplaying = () => {
    message("tvMessage", "Stream is playing.");
  };

  video.onwaiting = () => {
    message("tvMessage", "Buffering live stream...");
  };

  video.onerror = () => {
    message(
      "tvMessage",
      "This stream could not be played. Try another channel."
    );
  };

  const url = channel.url;

  if (isHLS(url)) {
    await loadHlsLibrary();

    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferLength: 12,
        backBufferLength: 0
      });

      state.hls = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const livePosition = hls.liveSyncPosition;

        if (
          Number.isFinite(livePosition) &&
          livePosition > 0
        ) {
          try {
            video.currentTime = livePosition;
          } catch (error) {
            console.warn("Could not seek to live position:", error);
          }
        }

        video.play().catch(() => {
          message(
            "tvMessage",
            "Stream is ready. Press Play to start."
          );
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          message(
            "tvMessage",
            "Network error. The stream may be offline or blocked."
          );
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          message(
            "tvMessage",
            "This stream has a media playback problem."
          );
        } else {
          message(
            "tvMessage",
            "This channel is unavailable in the browser."
          );
        }

        stopHLS();
      });

    } else if (
      video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      video.src = url;
      video.load();

      video.play().catch(() => {
        message("tvMessage", "Press Play to start the stream.");
      });

    } else {
      message(
        "tvMessage",
        "This browser does not support this HLS stream."
      );
    }

  } else {
    video.src = url;
    video.load();

    video.play().catch(() => {
      message(
        "tvMessage",
        "Press Play. This stream may be unsupported or unavailable."
      );
    });
  }

  const history = saved("itt_recent").filter(x => x !== id);

  history.unshift(id);

  store("itt_recent", history.slice(0, 30));

  renderRecent();
}

$("tvVideo")?.addEventListener("error", () => {
  if (state.currentTV) {
    message(
      "tvMessage",
      "The selected channel could not be played. Try another channel."
    );
  }
});

/* ---------------- TV FAVORITES BUTTON ---------------- */

$("playerFavorite")?.addEventListener("click", () => {
  if (state.currentTV) {
    toggleFavorite(state.currentTV._id);
  }
});

/* ---------------- FAVORITES ---------------- */

function toggleFavorite(id) {
  const favorites = saved("itt_favorites");

  const updated = favorites.includes(id)
    ? favorites.filter(x => x !== id)
    : [...favorites, id];

  store("itt_favorites", updated);

  toast(
    updated.includes(id)
      ? "Saved to favorites"
      : "Removed from favorites"
  );

  renderFavorites();
}

function renderFavorites() {
  const ids = saved("itt_favorites");

  const list = ids
    .map(id => state.tv.find(channel => channel._id === id))
    .filter(Boolean);

  setHTML(
    "favoritesGrid",
    list.map(channel => makeCard(channel, "tv")).join("") ||
    '<div class="empty">Your favorite channels will appear here.</div>'
  );
}

function renderRecent() {
  const ids = saved("itt_recent");

  const list = ids
    .map(id => state.tv.find(channel => channel._id === id))
    .filter(Boolean);

  setHTML(
    "recentGrid",
    list.map(channel => makeCard(channel, "tv")).join("") ||
    '<div class="empty">You have not watched any channels yet.</div>'
  );
}

/* ---------------- HOME PAGE ---------------- */

function renderHome() {
  setHTML(
    "featuredChannels",
    state.tv.slice(0, 8).map(channel =>
      makeCard(channel, "tv")
    ).join("") ||
    '<div class="empty">TV channels are loading.</div>'
  );

  const recent = saved("itt_recent")
    .map(id => state.tv.find(channel => channel._id === id))
    .filter(Boolean);

  setHTML(
    "homeRecent",
    recent.slice(0, 6).map(channel =>
      makeCard(channel, "tv")
    ).join("") ||
    '<div class="empty">Recently watched channels will appear here.</div>'
  );

  setText("totalTV", state.tv.length);
  setText("totalRadio", state.radios.length);
}

/* ---------------- RADIO DIRECTORY ---------------- */


async function loadRadio() {
  const requestNumber = ++state.radioRequest;

  message("radioResultCount", "Loading radio stations...");
  setHTML(
    "radioGrid",
    '<div class="empty">Connecting to radio directory...</div>'
  );

  const params = new URLSearchParams({
    limit: "500",
    order: "clickcount",
    reverse: "true",
    hidebroken: "true"
  });

  let stations = [];

  for (const server of RADIO_SERVERS) {
    if (requestNumber !== state.radioRequest) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {

      if (!response.ok) {
        throw new Error("Radio server returned " + response.status);
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        stations = data;
        break;
      }
    } catch (error) {
      console.warn("Radio server failed:", server, error);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (requestNumber !== state.radioRequest) return;

  state.radios = stations.filter(station =>
    station.name &&
    station.url_resolved &&
    station.lastcheckok !== 0
  );

  if (!state.radios.length) {
    message("radioResultCount", "Radio stations are temporarily unavailable.");
    setHTML(
      "radioGrid",
      '<div class="empty">Could not load radio stations. Check your internet and try again.</div>'
    );
    setText("totalRadio", 0);
    return;
  }

  state.radioLimit = 40;

  populateRadioFilters();
  renderRadio();

  setText("totalRadio", state.radios.length);
  message(
    "radioResultCount",
    state.radios.length + " radio stations found."
  );

  renderHome();
}


      const response = await fetch(
        `${server}/json/stations/search?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) continue;

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
    message(
      "radioResultCount",
      "Radio directory is unavailable. Try again later."
    );

    setHTML(
      "radioGrid",
      '<div class="empty">Radio stations could not be loaded.</div>'
    );

    return;
  }

  state.radios = stations.filter(station =>
    station.name &&
    station.url_resolved &&
    station.lastcheckok !== 0
  );

  setText("totalRadio", state.radios.length);

  populateRadioFilters();
  renderRadio();

  message(
    "radioResultCount",
    state.radios.length + " radio stations found."
  );
}

function populateRadioFilters() {
  const countrySelect = $("radioCountry");
  const languageSelect = $("radioLanguage");

  if (!countrySelect || !languageSelect) return;

  const oldCountry = countrySelect.value;
  const oldLanguage = languageSelect.value;

  const countries = [
    ...new Set(
      state.radios.map(station => station.country).filter(Boolean)
    )
  ].sort();

  const languages = [
    ...new Set(
      state.radios.flatMap(station =>
        (station.language || "")
          .split(",")
          .map(value => value.trim())
          .filter(Boolean)
      )
    )
  ].sort();

  countrySelect.innerHTML =
    '<option value="">All countries</option>' +
    countries.map(country =>
      `<option value="${safe(country)}">${safe(country)}</option>`
    ).join("");

  languageSelect.innerHTML =
    '<option value="">All languages</option>' +
    languages.slice(0, 200).map(language =>
      `<option value="${safe(language)}">${safe(language)}</option>`
    ).join("");

  countrySelect.value = countries.includes(oldCountry) ? oldCountry : "";
  languageSelect.value = languages.includes(oldLanguage) ? oldLanguage : "";
}

function renderRadio() {
  const query = normalize($("radioSearch")?.value);
  const country = $("radioCountry")?.value || "";
  const language = $("radioLanguage")?.value || "";

  const list = state.radios.filter(station => {
    const name = normalize(station.name);
    const countryName = normalize(station.country);
    const languageNames = (station.language || "")
      .split(",")
      .map(value => normalize(value));

    return (
      (name.includes(query) || countryName.includes(query)) &&
      (!country || station.country === country) &&
      (!language || languageNames.includes(normalize(language)))
    );
  });

  message(
    "radioResultCount",
    `${list.length} radio stations found`
  );

  setHTML(
    "radioGrid",
    list.slice(0, state.radioLimit).map(station => {
      const index = state.radios.indexOf(station);

      return makeCard({
        name: station.name,
        country: station.country || station.language || "International",
        logo: station.favicon
      }, "radio", index);

    }).join("") ||
    '<div class="empty">No radio stations found.</div>'
  );

  setHidden(
    "moreRadio",
    list.length <= state.radioLimit
  );
}

/* ---------------- PLAY RADIO ---------------- */

function playRadio(index) {
  const station = state.radios[index];

  if (!station) {
    toast("Radio station not found.");
    return;
  }

  state.currentRadio = station;

  showPage("radio");

  setText("radioNowPlaying", station.name);

  setText(
    "radioDetails",
    [station.country, station.language]
      .filter(Boolean)
      .join(" · ") || "Radio station"
  );

  message("radioMessage", "Connecting to radio...");

  const audio = $("radioPlayer");

  if (!audio) {
    message("radioMessage", "Radio player is missing from index.html.");
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  audio.src = station.url_resolved;
  audio.load();

  audio.play().then(() => {
    message("radioMessage", "Radio stream is playing.");
  }).catch(() => {
    message(
      "radioMessage",
      "Press Play. This radio stream may be offline or unsupported."
    );
  });
}

$("radioPlayer")?.addEventListener("error", () => {
  message(
    "radioMessage",
    "This radio stream is unavailable. Try another station."
  );
});

/* ---------------- MOVIE SEARCH ---------------- */

async function searchMovies(reset = true) {
  const input = $("movieSearch");
  const query = input?.value.trim() || "";

  if (!query) {
    message("movieResultCount", "Enter a movie title to search.");
    return;
  }

  const requestNumber = ++state.movieRequest;

  if (reset) {
    state.moviePage = 1;
    state.movies = [];
    state.movieQuery = query;
  }

  message("movieResultCount", "Searching movie archive...");

  const searchQuery =
    `mediatype:movies AND title:(${query})`;

  const url =
    "https://archive.org/advancedsearch.php?q=" +
    encodeURIComponent(searchQuery) +
    "&fl[]=identifier&fl[]=title&fl[]=year&rows=24&page=" +
    state.moviePage +
    "&output=json";

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Movie search unavailable");
    }

    const data = await response.json();

    if (requestNumber !== state.movieRequest) return;

    const docs = data.response?.docs || [];

    const results = docs.map(item => ({
      identifier: item.identifier,
      title: item.title || item.identifier,
      year: item.year || ""
    }));

    state.movies = reset
      ? results
      : [...state.movies, ...results];

    state.movieHasMore = docs.length === 24;

    renderMovies();

    setText("totalMovies", state.movies.length);

    message(
      "movieResultCount",
      `${state.movies.length} archive results found. Check the rights information before watching.`
    );

    setHidden("moreMovies", !state.movieHasMore);

  } catch (error) {
    console.error("Movie search failed:", error);

    message(
      "movieResultCount",
      "Movie archive could not be reached. Try again."
    );
  }
}

function renderMovies() {
  setHTML(
    "movieGrid",
    state.movies.map(movie => `
      <article class="media-card">
        <div class="card-image">
          <span>🎬</span>
        </div>

        <div class="card-body">
          <h3>${safe(movie.title)}</h3>
          <p>${safe(movie.year || "Archive film")}</p>

          <div class="card-actions">
            <button type="button" data-movie="${safe(movie.identifier)}">
              Check & Watch
            </button>
          </div>
        </div>
      </article>
    `).join("") ||
    '<div class="empty">No films found. Try another title.</div>'
  );
}

/* ---------------- PLAY ARCHIVE MOVIE ---------------- */

async function playMovie(identifier) {
  const movie = state.movies.find(
    item => item.identifier === identifier
  );

  if (!movie) {
    toast("Movie not found. Search again.");
    return;
  }

  showPage("movies");

  setHidden("moviePlayerPanel", false);

  setText("movieNowPlaying", movie.title);

  message("movieMessage", "Checking movie information...");

  const video = $("movieVideo");

  if (!video) {
    message("movieMessage", "Movie video player is missing.");
    return;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();

  try {
    const response = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}`
    );

    if (!response.ok) {
      throw new Error("Movie metadata unavailable");
    }

    const metadata = await response.json();
    const files = metadata.files || [];
    const info = metadata.metadata || {};

    const license = String(
      info.licenseurl || info.rights || ""
    ).toLowerCase();

    const allowedLicense =
      license.includes("creativecommons.org") ||
      license.includes("publicdomain") ||
      license.includes("public domain") ||
      license.includes("opensource.org");

    if (!allowedLicense) {
      message(
        "movieMessage",
        "No recognised open licence is shown for this item. Choose another film."
      );
      return;
    }

    const candidates = files
      .filter(file => /\.(mp4|webm|ogv)$/i.test(file.name || ""))
      .filter(file => Number(file.size || 0) > 100000)
      .filter(file =>
        !String(file.name).toLowerCase().includes("sample")
      )
      .sort((a, b) =>
        Number(b.size || 0) - Number(a.size || 0)
      );

    if (!candidates.length) {
      message(
        "movieMessage",
        "No compatible video file was found."
      );
      return;
    }

    const file = candidates[0];

    const encodedFile = file.name
      .split("/")
      .map(encodeURIComponent)
      .join("/");

    const videoURL =
      `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedFile}`;

    video.src = videoURL;
    video.load();

    await video.play();

    message(
      "movieMessage",
      "Playing archive film. Please check its rights information."
    );

  } catch (error) {
    console.error("Movie playback failed:", error);

    message(
      "movieMessage",
      "This film could not be played. Try another film."
    );
  }
}

$("movieVideo")?.addEventListener("error", () => {
  message(
    "movieMessage",
    "Video playback failed. The file may be unavailable or unsupported."
  );
});

/* ---------------- SEARCH & FILTER EVENTS ---------------- */

$("tvSearch")?.addEventListener("input", renderTV);
$("tvCountry")?.addEventListener("change", renderTV);
$("tvCategory")?.addEventListener("change", renderTV);
$("tvSort")?.addEventListener("change", renderTV);

$("radioSearch")?.addEventListener("input", renderRadio);
$("radioCountry")?.addEventListener("change", renderRadio);
$("radioLanguage")?.addEventListener("change", renderRadio);

$("searchMovies")?.addEventListener("click", () => {
  searchMovies(true);
});

$("movieSearch")?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchMovies(true);
  }
});

$("moreMovies")?.addEventListener("click", () => {
  if (!state.movieHasMore) return;

  state.moviePage++;
  searchMovies(false);
});

$("moreChannels")?.addEventListener("click", () => {
  state.tvLimit += 40;
  renderTV();
});

$("moreRadio")?.addEventListener("click", () => {
  state.radioLimit += 40;
  renderRadio();
});

$("globalSearch")?.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;

  const query = event.target.value.trim();

  if ($("tvSearch")) $("tvSearch").value = query;
  if ($("radioSearch")) $("radioSearch").value = query;

  renderTV();
  renderRadio();

  showPage("tv");
});

/* ---------------- START WEBSITE ---------------- */

setText("year", new Date().getFullYear());

renderHome();

Promise.allSettled([
  loadTV(),
  loadRadio(),
  loadMovieChannels()
]).then(() => {
  renderHome();
  renderFavorites();
  renderRecent();

  console.log("ITT-TV initial loading finished.");
});
