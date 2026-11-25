
"use strict";

/* =====================================================
   ITT-TV — LIVE STREAMING APPLICATION
   Compatible with the new index.html
===================================================== */

const $ = id => document.getElementById(id);

const state = {
  tv: [],
  radios: [],
  movies: [],
  favorites: load("itt_favorites"),
  recent: load("itt_recent"),
  currentTV: null,
  currentRadio: null,
  currentMovie: null,
  hls: null,
  tvLimit: 48,
  radioLimit: 48,
  movieLimit: 24
};

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem("itt_favorites", JSON.stringify(state.favorites));
  localStorage.setItem("itt_recent", JSON.stringify(state.recent));
}

function norm(value = "") {
  return String(value).toLowerCase().trim();
}

function safe(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function msg(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

/* =====================================================
   RWANDA TV STREAMS
===================================================== */

const RWANDA_TV = [
  {
    name: "Rwanda TV (RTV)",
    country: "Rwanda",
    category: "General",
    url: "https://5c46fa289c89f.streamlock.net/rtv25/rtv/playlist.m3u8"
  },
  {
    name: "Isango TV",
    country: "Rwanda",
    category: "General",
    url: "http://80.241.215.175:1935/isangostar/isangostar/playlist.m3u8"
  },
  {
    name: "TV10 Rwanda",
    country: "Rwanda",
    category: "General",
    url: "https://5c46fa289c89f.streamlock.net/pub1live/mystream/playlist.m3u8"
  },
  {
    name: "TV1 Rwanda",
    country: "Rwanda",
    category: "General",
    url: "https://live.tv1.rw/index.m3u8"
  },
  {
    name: "BTN TV",
    country: "Rwanda",
    category: "General",
    url: "https://tv.btnrwanda.com:3973/live/btnv2live.m3u8"
  },
  {
    name: "Isibo TV",
    country: "Rwanda",
    category: "General",
    url: "https://5c46fa289c89f.streamlock.net/pub2live/myStream/playlist.m3u8"
  }
];

/* =====================================================
   RWANDA RADIO OFFICIAL WEBSITES
   These are listening pages, not direct audio streams.
===================================================== */

const RWANDA_RADIO_PAGES = [
  {
    name: "Radio Rwanda",
    country: "Rwanda",
    category: "News",
    url: "https://www.rba.co.rw/"
  },
  {
    name: "Magic FM",
    country: "Rwanda",
    category: "Music",
    url: "https://www.rba.co.rw/radio/7/Magic-Fm"
  },
  {
    name: "Radio 10",
    country: "Rwanda",
    category: "News",
    url: "https://radiotv10.rw/radio/"
  }
];

/* =====================================================
   INTERNATIONAL SOURCES
===================================================== */

const TV_SOURCES = [
  "https://iptv-org.github.io/iptv/index.m3u",
  "https://iptv-org.github.io/iptv/countries/rw.m3u"
];

const RADIO_SERVERS = [
  "https://all.api.radio-browser.info",
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info"
];

const MOVIE_SOURCE =
  "https://iptv-org.github.io/iptv/categories/movies.m3u";

/* =====================================================
   NAVIGATION
===================================================== */

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => {
    el.classList.remove("active");
  });

  $(page + "Page")?.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("sidebar")?.classList.remove("open");

  if (page === "tv") renderTV();
  if (page === "radio") renderRadio();
  if (page === "movies") renderMovies();
  if (page === "favorites") renderFavorites();
  if (page === "recent") renderRecent();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

$("menuToggle")?.addEventListener("click", () => {
  $("sidebar")?.classList.toggle("open");
});

/* =====================================================
   FAVORITES AND RECENT
===================================================== */

function favorite(item) {
  return state.favorites.some(x => x.url === item.url);
}

function toggleFavorite(item) {
  if (favorite(item)) {
    state.favorites = state.favorites.filter(x => x.url !== item.url);
  } else {
    state.favorites.unshift(item);
  }

  save();
  renderFavorites();
  renderTV();
  renderRadio();
  renderMovies();
}

function addRecent(item) {
  state.recent = [
    item,
    ...state.recent.filter(x => x.url !== item.url)
  ].slice(0, 30);

  save();
  renderRecent();
  renderHomeRecent();
}

/* =====================================================
   PLAYER CONTROL
===================================================== */

function destroyHLS() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function stopAll() {
  destroyHLS();

  ["tvVideo", "movieVideo"].forEach(id => {
    const video = $(id);
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  });

  const audio = $("radioPlayer");

  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
}

async function playVideo(url, video, item, type) {
  if (!url || !video) return;

  stopAll();

  video.controls = true;
  video.playsInline = true;

  video.onerror = () => {
    msg(
      type === "tv" ? "tvMessage" : "movieMessage",
      "Stream ntiyabashije gukina. Gerageza indi channel."
    );
  };

  if (url.toLowerCase().includes(".m3u8")) {
    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8
      });

      state.hls = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          msg("tvMessage", "Kanda Play kugira ngo utangire kureba.");
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          msg(
            type === "tv" ? "tvMessage" : "movieMessage",
            "Server ya stream ntiyashoboye gusubiza."
          );
        }
      });
    } else {
      video.src = url;
      video.play().catch(() => {});
    }
  } else {
    video.src = url;
    video.play().catch(() => {});
  }

  if (type === "tv") {
    state.currentTV = item;
    msg("tvNowPlaying", item.name);
  }

  if (type === "movie") {
    state.currentMovie = item;
    msg("movieNowPlaying", item.name);
  }
}

function playTV(item) {
  state.currentTV = item;
  addRecent(item);

  playVideo(item.url, $("tvVideo"), item, "tv");
}

function playMovie(item) {
  state.currentMovie = item;
  addRecent(item);

  if (item.website) {
    window.open(item.url, "_blank", "noopener,noreferrer");
    return;
  }

  playVideo(item.url, $("movieVideo"), item, "movie");
}

/* =====================================================
   RADIO PLAYER
===================================================== */

function playRadio(item) {
  if (item.website) {
    window.open(item.url, "_blank", "noopener,noreferrer");
    return;
  }

  stopAll();

  const audio = $("radioPlayer");

  if (!audio) {
    msg("radioMessage", "Radio player ntiyabonetse.");
    return;
  }

  state.currentRadio = item;

  audio.src = item.url;
  audio.load();

  audio.play().catch(() => {
    msg("radioMessage", "Radio yanze gukina. Gerageza indi.");
  });

  msg("radioNowPlaying", item.name);
  msg("radioDetails", item.country || "International");

  addRecent({ ...item, type: "radio" });
}

/* =====================================================
   CARD RENDERER
===================================================== */

function renderCards(items, target, type) {
  const grid = $(target);
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = "<p>No channels available.</p>";
    return;
  }

  grid.innerHTML = items.map(item => `
    <article class="channel-card">
      <div class="card-image">
        ${
          item.logo
            ? `<img src="${safe(item.logo)}" alt=""
                 onerror="this.style.display='none'">`
            : `<span class="card-placeholder">${
                type === "radio" ? "📻" :
                type === "movie" ? "🎬" : "📺"
              }</span>`
        }
      </div>

      <div class="card-info">
        <h3>${safe(item.name)}</h3>
        <p>${safe(item.country || "International")}</p>

        <button data-play="${safe(item.url)}">
          ▶ ${item.website ? "Open" : "Play"}
        </button>

        <button data-favorite="${safe(item.url)}">
          ${favorite(item) ? "❤️" : "♡"}
        </button>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-play]").forEach(button => {
    button.addEventListener("click", () => {
      const item = items.find(x => x.url === button.dataset.play);
      if (!item) return;

      if (type === "tv") playTV(item);
      if (type === "radio") playRadio(item);
      if (type === "movie") playMovie(item);
    });
  });

  grid.querySelectorAll("[data-favorite]").forEach(button => {
    button.addEventListener("click", () => {
      const item = items.find(x => x.url === button.dataset.favorite);
      if (item) toggleFavorite(item);
    });
  });
}

/* =====================================================
   M3U PARSER
===================================================== */

function parseM3U(text, overrideCountry = "") {
  const lines = text.split(/\r?\n/);
  const result = [];
  let current = {};

  for (const lineRaw of lines) {
    const line = lineRaw.trim();

    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const comma = line.lastIndexOf(",");

      current.name = comma >= 0
        ? line.slice(comma + 1).trim()
        : "TV Channel";

      current.logo =
        line.match(/tvg-logo="([^"]*)"/i)?.[1] || "";

      current.country =
        line.match(/tvg-country="([^"]*)"/i)?.[1] || "";

      current.category =
        line.match(/group-title="([^"]*)"/i)?.[1] || "General";

      continue;
    }

    if (line.startsWith("#") || !line) continue;

    if (/^https?:\/\//i.test(line)) {
      if (/\/movie\/|\/vod\/|\/series\/|\/recorded\//i.test(line)) {
        current = {};
        continue;
      }

      result.push({
        name: current.name || "TV Channel",
        country: overrideCountry || current.country || "International",
        category: current.category || "General",
        logo: current.logo || "",
        url: line
      });

      current = {};
    }
  }

  return result;
}

function unique(items) {
  const seen = new Set();

  return items.filter(item => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function getText(url) {
  const response = await fetch(url);

  if (!response.ok) throw new Error("Source unavailable");

  return response.text();
}

/* =====================================================
   TV LOADING
===================================================== */

async function loadTV() {
  msg("tvMessage", "Loading TV channels...");

  let channels = [...RWANDA_TV];

  for (const source of TV_SOURCES) {
    try {
      const text = await getText(source);

      channels.push(...parseM3U(
        text,
        source.includes("/countries/rw.m3u") ? "Rwanda" : ""
      ));
    } catch (error) {
      console.warn("TV source error:", source);
    }
  }

  state.tv = unique(channels);

  renderTV();
  renderFeatured();
  updateStats();

  msg(
    "tvMessage",
    state.tv.length + " channels listed. Availability depends on each broadcaster."
  );
}

function filteredTV() {
  const search = norm($("tvSearch")?.value || "");
  const country = $("tvCountry")?.value || "";
  const category = $("tvCategory")?.value || "";

  return state.tv.filter(item => {
    const matchesSearch =
      !search ||
      norm(item.name).includes(search) ||
      norm(item.country).includes(search);

    const matchesCountry =
      !country || norm(item.country) === norm(country);

    const matchesCategory =
      !category || norm(item.category).includes(norm(category));

    return matchesSearch && matchesCountry && matchesCategory;
  });
}

function renderTV() {
  const list = filteredTV();

  renderCards(list.slice(0, state.tvLimit), "tvGrid", "tv");

  msg("tvResultCount", list.length + " TV channels");

  $("moreChannels").style.display =
    list.length > state.tvLimit ? "block" : "none";

  renderCountryChips();
}

function renderCountryChips() {
  const area = $("countryChips");
  const select = $("tvCountry");

  if (!area || !select) return;

  const countries = [...new Set(
    state.tv.map(item => item.country).filter(Boolean)
  )].sort((a, b) => {
    if (norm(a) === "rwanda") return -1;
    if (norm(b) === "rwanda") return 1;
    return a.localeCompare(b);
  });

  area.innerHTML = `
    <button class="country-chip ${!select.value ? "selected" : ""}"
      data-country="">🌍 All</button>
    ${countries.map(country => `
      <button class="country-chip ${
        norm(select.value) === norm(country) ? "selected" : ""
      }" data-country="${safe(country)}">
        ${norm(country) === "rwanda" ? "🇷🇼" : "🌐"}
        ${safe(country)}
      </button>
    `).join("")}
  `;

  area.querySelectorAll("[data-country]").forEach(button => {
    button.addEventListener("click", () => {
      select.value = button.dataset.country;
      renderTV();
    });
  });
}

$("tvSearch")?.addEventListener("input", renderTV);
$("tvCountry")?.addEventListener("change", renderTV);
$("tvCategory")?.addEventListener("change", renderTV);

$("tvSort")?.addEventListener("change", () => {
  const sort = $("tvSort").value;

  if (sort === "az") {
    state.tv.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "country") {
    state.tv.sort((a, b) => a.country.localeCompare(b.country));
  }

  renderTV();
});

$("moreChannels")?.addEventListener("click", () => {
  state.tvLimit += 48;
  renderTV();
});

$("refreshTV")?.addEventListener("click", loadTV);

/* =====================================================
   RADIO DIRECTORY
===================================================== */

async function loadRadioBrowser() {
  for (const server of RADIO_SERVERS) {
    try {
      const response = await fetch(
        server +
        "/json/stations/search?limit=500&hidebroken=true&order=clickcount&reverse=true"
      );

      if (!response.ok) continue;

      const data = await response.json();

      return data.map(station => ({
        name: station.name || "Radio",
        country: station.country || "International",
        category: station.tags || "Radio",
        logo: station.favicon || "",
        url: station.url_resolved || station.url,
        type: "radio"
      })).filter(item => item.url);
    } catch (error) {
      console.warn("Radio API error:", server);
    }
  }

  return [];
}

function renderRwandaRadioPages() {
  const grid = $("rwandaRadioLinks");
  if (!grid) return;

  grid.innerHTML = RWANDA_RADIO_PAGES.map(item => `
    <article class="channel-card">
      <div class="card-image">
        <span class="card-placeholder">📻</span>
      </div>
      <div class="card-info">
        <h3>${safe(item.name)}</h3>
        <p>Rwanda · Official website</p>
        <button data-open="${safe(item.url)}">Open listening page</button>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
      window.open(button.dataset.open, "_blank", "noopener,noreferrer");
    });
  });
}

async function loadRadio() {
  msg("radioMessage", "Loading radio stations...");

  renderRwandaRadioPages();

  state.radios = unique(await loadRadioBrowser());

  renderRadio();
  updateStats();

  msg(
    "radioMessage",
    state.radios.length
      ? state.radios.length + " playable radio stream entries found."
      : "Radio directory unavailable. Use the official Rwanda listening pages above."
  );
}

function filteredRadio() {
  const search = norm($("radioSearch")?.value || "");
  const country = $("radioCountry")?.value || "";
  const genre = norm($("radioLanguage")?.value || "");

  return state.radios.filter(item => {
    const matchesSearch =
      !search ||
      norm(item.name).includes(search) ||
      norm(item.country).includes(search) ||
      norm(item.category).includes(search);

    const matchesCountry =
      !country || norm(item.country) === norm(country);

    const matchesGenre =
      !genre || norm(item.category).includes(genre);

    return matchesSearch && matchesCountry && matchesGenre;
  });
}

function renderRadio() {
  const list = filteredRadio();

  renderCards(
    list.slice(0, state.radioLimit),
    "radioGrid",
    "radio"
  );

  msg("radioResultCount", list.length + " radio streams");

  $("moreRadio").style.display =
    list.length > state.radioLimit ? "block" : "none";

  const select = $("radioCountry");

  if (select) {
    const current = select.value;
    const countries = [...new Set(
      state.radios.map(x => x.country).filter(Boolean)
    )].sort();

    select.innerHTML =
      '<option value="">All countries</option>' +
      countries.map(c =>
        `<option value="${safe(c)}">${safe(c)}</option>`
      ).join("");

    select.value = current;
  }
}

$("radioSearch")?.addEventListener("input", renderRadio);
$("radioCountry")?.addEventListener("change", renderRadio);
$("radioLanguage")?.addEventListener("change", renderRadio);

$("moreRadio")?.addEventListener("click", () => {
  state.radioLimit += 48;
  renderRadio();
});

$("refreshRadio")?.addEventListener("click", loadRadio);

/* =====================================================
   MOVIE CHANNELS
===================================================== */

async function loadMovieChannels() {
  msg("movieChannelsMessage", "Loading movie channels...");

  try {
    const text = await getText(MOVIE_SOURCE);
    const channels = parseM3U(text);

    renderCards(
      channels,
      "movieChannelsGrid",
      "tv"
    );

    msg(
      "movieChannelsMessage",
      channels.length + " movie channels listed."
    );
  } catch {
    msg("movieChannelsMessage", "Movie channels unavailable.");
  }
}

/* =====================================================
   MOVIE CATALOG
===================================================== */

async function loadMovies() {
  msg("movieMessage", "Loading public movie catalog...");

  try {
    const response = await fetch(
      "https://archive.org/advancedsearch.php?q=collection%3Afeature_films&fl%5B%5D=identifier&fl%5B%5D=title&rows=60&output=json"
    );

    if (!response.ok) throw new Error("Movie catalog unavailable");

    const data = await response.json();

    state.movies = (data.response?.docs || []).map(movie => ({
      name: movie.title || movie.identifier,
      country: "Public Archive",
      category: "Movie",
      url: "https://archive.org/details/" +
        encodeURIComponent(movie.identifier),
      website: true
    }));

    renderMovies();
    updateStats();

    msg("movieMessage", state.movies.length + " public archive titles listed.");
  } catch {
    msg("movieMessage", "Movie catalog unavailable.");
  }
}

function renderMovies() {
  const search = norm($("movieSearch")?.value || "");

  const list = state.movies.filter(movie =>
    !search || norm(movie.name).includes(search)
  );

  renderCards(
    list.slice(0, state.movieLimit),
    "movieGrid",
    "movie"
  );

  msg("movieResultCount", list.length + " movie titles");

  $("moreMovies").style.display =
    list.length > state.movieLimit ? "block" : "none";
}

$("movieSearch")?.addEventListener("input", renderMovies);
$("searchMovies")?.addEventListener("click", renderMovies);

$("moreMovies")?.addEventListener("click", () => {
  state.movieLimit += 24;
  renderMovies();
});

/* =====================================================
   FAVORITES AND RECENT PAGES
===================================================== */

function renderFavorites() {
  renderCards(state.favorites, "favoritesGrid", "tv");
}

function renderRecent() {
  renderCards(state.recent, "recentGrid", "tv");
}

function renderHomeRecent() {
  renderCards(
    state.recent.slice(0, 6),
    "homeRecent",
    "tv"
  );
}

function renderFeatured() {
  const channels = state.tv.filter(
    item => norm(item.country) === "rwanda"
  );

  renderCards(
    channels.slice(0, 12),
    "featuredChannels",
    "tv"
  );
}

/* =====================================================
   GLOBAL SEARCH
===================================================== */

$("globalSearch")?.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;

  const query = norm(event.target.value);

  const tv = state.tv.find(x => norm(x.name).includes(query));
  const radio = state.radios.find(x => norm(x.name).includes(query));

  if (tv) {
    showPage("tv");
    $("tvSearch").value = event.target.value;
    renderTV();
  } else if (radio) {
    showPage("radio");
    $("radioSearch").value = event.target.value;
    renderRadio();
  } else {
    showPage("movies");
    $("movieSearch").value = event.target.value;
    renderMovies();
  }
});

/* =====================================================
   FAVORITE PLAYER BUTTON
===================================================== */

$("playerFavorite")?.addEventListener("click", () => {
  if (state.currentTV) toggleFavorite(state.currentTV);
});

/* =====================================================
   STATISTICS
===================================================== */

function updateStats() {
  msg("totalTV", state.tv.length);
  msg("totalRadio", state.radios.length);
  msg("totalMovies", state.movies.length);
}

/* =====================================================
   INITIALIZATION
===================================================== */

async function init() {
  msg("year", new Date().getFullYear());

  renderRwandaRadioPages();

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
  updateStats();

  console.log("ITT-TV ready.");
}

init();
