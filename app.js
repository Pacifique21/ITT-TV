
"use strict";

/* =====================================================
   ITT-TV — TV + RWANDA RADIO + INTERNATIONAL RADIO
   Compatible with the ITT-TV HTML structure
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
  radioLimit: 60,
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

function setMessage(id, message) {
  const el = $(id);
  if (el) el.textContent = message;
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
   RWANDA TV
===================================================== */

const RWANDA_TV = [
  {
    name: "Rwanda TV",
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
   RADIO API SOURCES
===================================================== */

const RADIO_SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://all.api.radio-browser.info"
];

/*
  Rwanda stations are requested separately using RW.
  Other countries are loaded afterwards.
*/

async function requestRadioStations(server, endpoint) {
  const response = await fetch(server + endpoint);

  if (!response.ok) {
    throw new Error("Radio server unavailable");
  }

  return response.json();
}

function convertRadioStation(station) {
  return {
    name: station.name || "Rwanda Radio",
    country: station.country || "Rwanda",
    countrycode: station.countrycode || "RW",
    category: station.tags || "Radio",
    logo: station.favicon || "",
    url: station.url_resolved || station.url,
    homepage: station.homepage || "",
    type: "radio"
  };
}

/* =====================================================
   LOAD RWANDA RADIO STATIONS
===================================================== */

async function loadRwandaRadios() {
  const endpoint =
    "/json/stations/bycountrycodeexact/RW" +
    "?hidebroken=true&order=clickcount&reverse=true";

  for (const server of RADIO_SERVERS) {
    try {
      const data = await requestRadioStations(server, endpoint);

      return data
        .map(convertRadioStation)
        .filter(item => item.url);
    } catch (error) {
      console.warn("Rwanda radio source failed:", server);
    }
  }

  return [];
}

/* =====================================================
   LOAD INTERNATIONAL RADIO
===================================================== */

async function loadInternationalRadios() {
  const endpoint =
    "/json/stations/search?limit=400" +
    "&hidebroken=true&order=clickcount&reverse=true";

  for (const server of RADIO_SERVERS) {
    try {
      const data = await requestRadioStations(server, endpoint);

      return data
        .map(convertRadioStation)
        .filter(item => item.url && item.countrycode !== "RW");
    } catch (error) {
      console.warn("International radio source failed:", server);
    }
  }

  return [];
}

/* =====================================================
   LOAD ALL RADIO
===================================================== */

async function loadRadio() {
  setMessage("radioMessage", "Turimo gushaka radio zo mu Rwanda...");

  const [rwanda, international] = await Promise.all([
    loadRwandaRadios(),
    loadInternationalRadios()
  ]);

  state.radios = unique([
    ...rwanda,
    ...international
  ]);

  renderRadio();
  updateStats();

  const rwandaCount = rwanda.length;

  setMessage(
    "radioMessage",
    rwandaCount
      ? `${rwandaCount} radio zo mu Rwanda zabonetse. Hitamo iyo ushaka kumva.`
      : "Nta radio zo mu Rwanda zabonetse kuri directory ubu. Gerageza Refresh Radio."
  );

  renderRwandaRadioPages();
}

/* =====================================================
   OFFICIAL RWANDA RADIO PAGES
   These are backup listening pages, not direct streams.
===================================================== */

const RWANDA_RADIO_PAGES = [
  {
    name: "Radio Rwanda",
    url: "https://www.rba.co.rw/"
  },
  {
    name: "Magic FM",
    url: "https://www.rba.co.rw/radio/7/Magic-Fm"
  },
  {
    name: "Radio 10",
    url: "https://radiotv10.rw/radio/"
  }
];

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
        <p>Rwanda · Official listening page</p>
        <button type="button" data-radio-page="${safe(item.url)}">
          Open official page
        </button>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-radio-page]").forEach(button => {
    button.addEventListener("click", () => {
      window.open(
        button.dataset.radioPage,
        "_blank",
        "noopener,noreferrer"
      );
    });
  });
}

/* =====================================================
   RADIO FILTERS
===================================================== */

function filteredRadio() {
  const search = norm($("radioSearch")?.value || "");
  const country = $("radioCountry")?.value || "";
  const language = norm($("radioLanguage")?.value || "");

  return state.radios.filter(item => {
    const matchesSearch =
      !search ||
      norm(item.name).includes(search) ||
      norm(item.country).includes(search) ||
      norm(item.category).includes(search);

    const matchesCountry =
      !country || norm(item.country) === norm(country);

    const matchesLanguage =
      !language || norm(item.category).includes(language);

    return matchesSearch && matchesCountry && matchesLanguage;
  });
}

function renderRadio() {
  const list = filteredRadio();

  renderCards(
    list.slice(0, state.radioLimit),
    "radioGrid",
    "radio"
  );

  setMessage("radioResultCount", `${list.length} radio stations`);

  const more = $("moreRadio");
  if (more) {
    more.style.display =
      list.length > state.radioLimit ? "block" : "none";
  }

  const select = $("radioCountry");

  if (select) {
    const current = select.value;
    const countries = [...new Set(
      state.radios.map(item => item.country).filter(Boolean)
    )].sort((a, b) => {
      if (norm(a) === "rwanda") return -1;
      if (norm(b) === "rwanda") return 1;
      return a.localeCompare(b);
    });

    select.innerHTML =
      '<option value="">All countries</option>' +
      countries.map(country =>
        `<option value="${safe(country)}">${safe(country)}</option>`
      ).join("");

    select.value = current;
  }
}

/* =====================================================
   RADIO PLAYER
===================================================== */

function playRadio(item) {
  if (!item || !item.url) return;

  stopAllPlayers();

  const audio = $("radioPlayer");

  if (!audio) {
    setMessage("radioMessage", "Radio player ntiyabonetse muri HTML.");
    return;
  }

  state.currentRadio = item;

  audio.src = item.url;
  audio.load();

  audio.play().then(() => {
    setMessage("radioMessage", "Uri kumva: " + item.name);
  }).catch(error => {
    console.warn("Radio playback error:", error);

    setMessage(
      "radioMessage",
      "Iyi stream yanze gukina. Gerageza indi radio cyangwa ufungure official page."
    );
  });

  setMessage("radioNowPlaying", item.name);
  setMessage(
    "radioDetails",
    `${item.country || "Rwanda"} · ${item.category || "Radio"}`
  );

  addRecent({ ...item, type: "radio" });
}

/* =====================================================
   M3U PLAYLIST PARSER
===================================================== */

function parseM3U(text, defaultCountry = "") {
  const lines = text.split(/\r?\n/);
  const channels = [];
  let current = {};

  for (const raw of lines) {
    const line = raw.trim();

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

    if (line.startsWith("#")) continue;

    if (/^https?:\/\//i.test(line)) {
      channels.push({
        name: current.name || "TV Channel",
        country: defaultCountry || current.country || "International",
        category: current.category || "General",
        logo: current.logo || "",
        url: line
      });

      current = {};
    }
  }

  return channels;
}

/* =====================================================
   LOAD TV
===================================================== */

async function loadTV() {
  setMessage("tvMessage", "Loading TV channels...");

  const sources = [
    "https://iptv-org.github.io/iptv/countries/rw.m3u",
    "https://iptv-org.github.io/iptv/index.m3u"
  ];

  let channels = [...RWANDA_TV];

  for (const source of sources) {
    try {
      const text = await getText(source);

      channels.push(...parseM3U(
        text,
        source.includes("/countries/rw.m3u") ? "Rwanda" : ""
      ));
    } catch (error) {
      console.warn("TV source unavailable:", source);
    }
  }

  state.tv = unique(channels);

  renderTV();
  renderFeatured();
  updateStats();

  setMessage("tvMessage", `${state.tv.length} TV channels listed.`);
}

/* =====================================================
   TV FILTERS
===================================================== */

function filteredTV() {
  const search = norm($("tvSearch")?.value || "");
  const country = $("tvCountry")?.value || "";
  const category = norm($("tvCategory")?.value || "");

  return state.tv.filter(item => {
    const matchesSearch =
      !search ||
      norm(item.name).includes(search) ||
      norm(item.country).includes(search);

    const matchesCountry =
      !country || norm(item.country) === norm(country);

    const matchesCategory =
      !category || norm(item.category).includes(category);

    return matchesSearch && matchesCountry && matchesCategory;
  });
}

function renderTV() {
  const list = filteredTV();

  renderCards(list.slice(0, state.tvLimit), "tvGrid", "tv");

  setMessage("tvResultCount", `${list.length} TV channels`);

  const more = $("moreChannels");
  if (more) {
    more.style.display =
      list.length > state.tvLimit ? "block" : "none";
  }
}

/* =====================================================
   VIDEO PLAYERS
===================================================== */

function destroyHLS() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function stopAllPlayers() {
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

function playVideo(item, video, type) {
  if (!item || !video) return;

  stopAllPlayers();

  video.onerror = () => {
    setMessage(
      type === "tv" ? "tvMessage" : "movieMessage",
      "Stream ntishoboye gukina. Gerageza indi."
    );
  };

  if (/\.m3u8($|\?)/i.test(item.url) &&
      window.Hls && Hls.isSupported()) {

    const hls = new Hls();
    state.hls = hls;

    hls.loadSource(item.url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        setMessage(
          type === "tv" ? "tvMessage" : "movieMessage",
          "Stream ntibashije kuboneka."
        );
      }
    });

  } else {
    video.src = item.url;
    video.play().catch(() => {});
  }

  if (type === "tv") {
    state.currentTV = item;
    setMessage("tvNowPlaying", item.name);
  } else {
    state.currentMovie = item;
    setMessage("movieNowPlaying", item.name);
  }

  addRecent({ ...item, type });
}

function playTV(item) {
  playVideo(item, $("tvVideo"), "tv");
}

function playMovie(item) {
  if (item.website) {
    window.open(item.url, "_blank", "noopener,noreferrer");
    return;
  }

  playVideo(item, $("movieVideo"), "movie");
}

/* =====================================================
   CARD RENDERER
===================================================== */

function isFavorite(item) {
  return state.favorites.some(x => x.url === item.url);
}

function renderCards(items, target, type) {
  const grid = $(target);
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = "<p>No stations available.</p>";
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

        <button type="button" data-play-url="${safe(item.url)}">
          ▶ ${item.website ? "Open" : "Play"}
        </button>

        <button type="button" data-fav-url="${safe(item.url)}">
          ${isFavorite(item) ? "❤️" : "♡"}
        </button>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-play-url]").forEach(button => {
    button.addEventListener("click", () => {
      const item = items.find(x => x.url === button.dataset.playUrl);
      if (!item) return;

      if (type === "radio") playRadio(item);
      if (type === "tv") playTV(item);
      if (type === "movie") playMovie(item);
    });
  });

  grid.querySelectorAll("[data-fav-url]").forEach(button => {
    button.addEventListener("click", () => {
      const item = items.find(x => x.url === button.dataset.favUrl);
      if (item) toggleFavorite(item);
    });
  });
}

/* =====================================================
   FAVORITES AND RECENT
===================================================== */

function toggleFavorite(item) {
  if (isFavorite(item)) {
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

function renderFavorites() {
  renderCards(state.favorites, "favoritesGrid", "tv");
}

function renderRecent() {
  renderCards(state.recent, "recentGrid", "tv");
}

function renderHomeRecent() {
  renderCards(state.recent.slice(0, 6), "homeRecent", "tv");
}

/* =====================================================
   MOVIES
===================================================== */

const MOVIE_SOURCE =
  "https://iptv-org.github.io/iptv/categories/movies.m3u";

async function loadMovieChannels() {
  setMessage("movieChannelsMessage", "Loading movie channels...");

  try {
    const text = await getText(MOVIE_SOURCE);
    const channels = parseM3U(text);

    renderCards(channels, "movieChannelsGrid", "tv");

    setMessage(
      "movieChannelsMessage",
      `${channels.length} movie channels listed.`
    );
  } catch {
    setMessage("movieChannelsMessage", "Movie channels unavailable.");
  }
}

async function loadMovies() {
  setMessage("movieMessage", "Loading public movie catalog...");

  try {
    const response = await fetch(
      "https://archive.org/advancedsearch.php?q=collection%3Afeature_films&fl%5B%5D=identifier&fl%5B%5D=title&rows=60&output=json"
    );

    if (!response.ok) throw new Error("Unavailable");

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

    setMessage("movieMessage", `${state.movies.length} titles listed.`);
  } catch {
    setMessage("movieMessage", "Movie catalog unavailable.");
  }
}

function renderMovies() {
  const search = norm($("movieSearch")?.value || "");

  const list = state.movies.filter(item =>
    !search || norm(item.name).includes(search)
  );

  renderCards(list.slice(0, state.movieLimit), "movieGrid", "movie");

  setMessage("movieResultCount", `${list.length} movie titles`);

  const more = $("moreMovies");
  if (more) {
    more.style.display =
      list.length > state.movieLimit ? "block" : "none";
  }
}

/* =====================================================
   FEATURED CHANNELS
===================================================== */

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
   SEARCH AND FILTER EVENTS
===================================================== */

$("tvSearch")?.addEventListener("input", renderTV);
$("tvCountry")?.addEventListener("change", renderTV);
$("tvCategory")?.addEventListener("change", renderTV);

$("radioSearch")?.addEventListener("input", renderRadio);
$("radioCountry")?.addEventListener("change", renderRadio);
$("radioLanguage")?.addEventListener("change", renderRadio);

$("movieSearch")?.addEventListener("input", renderMovies);
$("searchMovies")?.addEventListener("click", renderMovies);

$("moreChannels")?.addEventListener("click", () => {
  state.tvLimit += 48;
  renderTV();
});

$("moreRadio")?.addEventListener("click", () => {
  state.radioLimit += 60;
  renderRadio();
});

$("moreMovies")?.addEventListener("click", () => {
  state.movieLimit += 24;
  renderMovies();
});

$("refreshTV")?.addEventListener("click", loadTV);
$("refreshRadio")?.addEventListener("click", loadRadio);

/* =====================================================
   GLOBAL SEARCH
===================================================== */

$("globalSearch")?.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;

  const query = norm(event.target.value);

  const radio = state.radios.find(
    item => norm(item.name).includes(query)
  );

  const tv = state.tv.find(
    item => norm(item.name).includes(query)
  );

  if (radio) {
    showPage("radio");
    if ($("radioSearch")) $("radioSearch").value = event.target.value;
    renderRadio();
  } else if (tv) {
    showPage("tv");
    if ($("tvSearch")) $("tvSearch").value = event.target.value;
    renderTV();
  } else {
    showPage("movies");
    if ($("movieSearch")) $("movieSearch").value = event.target.value;
    renderMovies();
  }
});

/* =====================================================
   PLAYER FAVORITE BUTTON
===================================================== */

$("playerFavorite")?.addEventListener("click", () => {
  if (state.currentTV) toggleFavorite(state.currentTV);
  else if (state.currentRadio) toggleFavorite(state.currentRadio);
});

/* =====================================================
   STATISTICS
===================================================== */

function updateStats() {
  setMessage("totalTV", state.tv.length);
  setMessage("totalRadio", state.radios.length);
  setMessage("totalMovies", state.movies.length);
}

/* =====================================================
   START APPLICATION
===================================================== */

async function init() {
  setMessage("year", new Date().getFullYear());

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

  console.log("ITT-TV application loaded.");
}

init();
