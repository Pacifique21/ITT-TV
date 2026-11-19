
"use strict";

/* ITT-TV COMPLETE PLAYER */

const $ = id => document.getElementById(id);

const state = {
  tv: [],
  movieChannels: [],
  radios: [],
  movies: [],
  currentTV: null,
  hls: null,
  tvLimit: 40,
  radioLimit: 40,
  moviePage: 1,
  movieQuery: "",
  movieHasMore: false
};

const saved = key => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
};

const store = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch {}
};

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

function message(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.style.display = "none", 2500);
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === name + "Page");
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  $("sidebar").classList.remove("open");

  if (name === "favorites") renderFavorites();
  if (name === "recent") renderRecent();
  if (name === "home") renderHome();

  window.scrollTo({top:0, behavior:"auto"});
}

/* NAVIGATION */

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
  if (favorite) toggleFavorite(favorite.dataset.favorite);
});

$("menuToggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

/* CARD DESIGN */

function makeCard(item, type, index) {
  const title = safe(item.name || item.title || "Unknown");
  const subtitle = safe(item.country || item.year || item.category || "");
  const logo = item.logo || item.favicon || "";

  let action = "";
  if (type === "tv") action = `data-tv="${safe(item._id)}"`;
  if (type === "radio") action = `data-radio="${index}"`;
  if (type === "movie") action = `data-movie="${safe(item.identifier)}"`;

  const symbol = type === "radio" ? "♫" :
                 type === "movie" ? "🎬" : "▶";

  return `
    <article class="media-card">
      <div class="card-image">
        ${logo
          ? `<img loading="lazy" decoding="async" src="${safe(logo)}" alt="" onerror="this.style.display='none'">`
          : `<span>${symbol}</span>`}
      </div>
      <div class="card-body">
        <h3>${title}</h3>
        <p>${subtitle}</p>
        <div class="card-actions">
          <button ${action}>
            ${type === "radio" ? "Listen" : type === "movie" ? "Watch" : "Play"}
          </button>
          ${type === "tv" ? `<button data-favorite="${safe(item._id)}">♡ Save</button>` : ""}
        </div>
      </div>
    </article>`;
}

/* IPTV PLAYLIST READER */

async function fetchPlaylist(url, country) {
  const response = await fetch(url, {cache:"force-cache"});
  if (!response.ok) throw new Error("Playlist unavailable");

  const content = await response.text();
  const lines = content.split(/\r?\n/);
  const channels = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").slice(1).join(",").trim();
      const logo = (line.match(/tvg-logo="([^"]*)"/) || [])[1] || "";
      const category = (line.match(/group-title="([^"]*)"/) || [])[1] || "General";

      current = {
        name: name || "TV Channel",
        logo,
        country: country || "International",
        category,
        url: "",
        _id: "channel-" + channels.length + "-" + Math.random().toString(36).slice(2,8)
      };
    } else if (line.trim().startsWith("http") && current) {
      current.url = line.trim();
      channels.push(current);
      current = null;
    }
  }

  return channels;
}

async function loadTV() {
  message("tvResultCount", "Loading television channels...");

  const countries = [
    ["rw","Rwanda"], ["ug","Uganda"], ["ke","Kenya"],
    ["tz","Tanzania"], ["za","South Africa"], ["gb","United Kingdom"],
    ["us","United States"], ["fr","France"], ["in","India"],
    ["ng","Nigeria"], ["gh","Ghana"], ["ca","Canada"]
  ];

  const results = await Promise.allSettled(
    countries.map(([code,name]) =>
      fetchPlaylist(`https://iptv-org.github.io/iptv/countries/${code}.m3u`,name)
    )
  );

  state.tv = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  const seen = new Set();
  state.tv = state.tv.filter(channel => {
    if (!channel.url || seen.has(channel.url)) return false;
    seen.add(channel.url);
    return true;
  });

  $("totalTV").textContent = state.tv.length;
  populateTVFilters();
  renderTV();
  renderHome();

  if (!state.tv.length) {
    message("tvResultCount", "Channels could not load. Check your internet and refresh.");
  }
}

/* MOVIE CHANNELS */

async function loadMovieChannels() {
  message("movieChannelsMessage", "Loading movie TV channels...");

  try {
    const channels = await fetchPlaylist(
      "https://iptv-org.github.io/iptv/categories/movies.m3u",
      "International"
    );

    state.movieChannels = channels;

    const existing = new Set(state.tv.map(x => x.url));

    channels.forEach(channel => {
      if (!existing.has(channel.url)) {
        state.tv.push(channel);
        existing.add(channel.url);
      }
    });

    $("movieChannelsGrid").innerHTML =
      channels.map(channel => makeCard(channel,"tv")).join("") ||
      '<div class="empty">No movie channels available right now.</div>';

    message("movieChannelsMessage", channels.length + " movie TV channels found.");
    $("totalTV").textContent = state.tv.length;
    $("totalMovies").textContent = channels.length;

    populateTVFilters();
    renderTV();
    renderHome();

  } catch {
    message("movieChannelsMessage", "Movie channels are temporarily unavailable.");
    $("movieChannelsGrid").innerHTML =
      '<div class="empty">Could not load movie channels. Try again later.</div>';
  }
}

/* TV FILTERS */

function populateTVFilters() {
  const countries = [...new Set(state.tv.map(x => x.country))].sort();
  const categories = [...new Set(state.tv.map(x => x.category))].sort();

  $("tvCountry").innerHTML =
    '<option value="">All countries</option>' +
    countries.map(x => `<option value="${safe(x)}">${safe(x)}</option>`).join("");

  $("tvCategory").innerHTML =
    '<option value="">All categories</option>' +
    categories.map(x => `<option value="${safe(x)}">${safe(x)}</option>`).join("");
}

function getFilteredTV() {
  const query = $("tvSearch").value.toLowerCase();
  const country = $("tvCountry").value;
  const category = $("tvCategory").value;

  let list = state.tv.filter(channel =>
    channel.name.toLowerCase().includes(query) &&
    (!country || channel.country === country) &&
    (!category || channel.category === category)
  );

  if ($("tvSort").value === "country") {
    list.sort((a,b) => a.country.localeCompare(b.country));
  } else {
    list.sort((a,b) => a.name.localeCompare(b.name));
  }

  return list;
}

function renderTV() {
  const list = getFilteredTV();

  message("tvResultCount", `${list.length} TV channels found`);

  $("tvGrid").innerHTML =
    list.slice(0,state.tvLimit).map(x => makeCard(x,"tv")).join("") ||
    '<div class="empty">No channels found.</div>';

  $("moreChannels").classList.toggle("hidden", list.length <= state.tvLimit);
}

/* TV PLAYER */

function stopHLS() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function playTV(id) {
  const channel = state.tv.find(x => x._id === id);

  if (!channel) {
    toast("Channel not found. Refresh the channel list.");
    return;
  }

  state.currentTV = channel;
  showPage("tv");

  $("tvPlaceholder").classList.add("hidden");
  $("tvNowPlaying").textContent = channel.name;
  message("tvMessage", "Connecting to " + channel.name + "...");

  const video = $("tvVideo");
  stopHLS();

  video.pause();
  video.removeAttribute("src");
  video.load();

  const url = channel.url;

  if (url.includes(".m3u8") && window.Hls && Hls.isSupported()) {
    state.hls = new Hls({
      enableWorker:true,
      lowLatencyMode:true,
      maxBufferLength:15,
      maxMaxBufferLength:30,
      backBufferLength:10
    });

    state.hls.loadSource(url);
    state.hls.attachMedia(video);

    state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().then(() => {
        message("tvMessage", "Playing live.");
      }).catch(() => {
        message("tvMessage", "Stream ready. Press Play to start.");
      });
    });

    state.hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        message("tvMessage", "This channel stream is unavailable or blocked. Try another channel.");
      }
    });

  } else {
    video.src = url;
    video.load();

    video.play().then(() => {
      message("tvMessage", "Playing live.");
    }).catch(() => {
      message("tvMessage", "Press Play. If it fails, this stream may not support browser playback.");
    });
  }

  const history = saved("itt_recent").filter(x => x !== id);
  history.unshift(id);
  store("itt_recent",history.slice(0,30));
  renderRecent();
}

$("tvVideo").addEventListener("error", () => {
  if (state.currentTV) {
    message("tvMessage", "The selected TV stream could not be played. Try another channel.");
  }
});

$("playerFavorite").addEventListener("click", () => {
  if (state.currentTV) toggleFavorite(state.currentTV._id);
});

/* FAVORITES AND HISTORY */

function toggleFavorite(id) {
  const favorites = saved("itt_favorites");
  const updated = favorites.includes(id)
    ? favorites.filter(x => x !== id)
    : [...favorites,id];

  store("itt_favorites",updated);
  toast(updated.includes(id) ? "Saved to favorites" : "Removed from favorites");
  renderFavorites();
}

function renderFavorites() {
  const ids = saved("itt_favorites");
  const list = state.tv.filter(x => ids.includes(x._id));

  $("favoritesGrid").innerHTML =
    list.map(x => makeCard(x,"tv")).join("") ||
    '<div class="empty">Your favorite channels will appear here.</div>';
}

function renderRecent() {
  const ids = saved("itt_recent");
  const list = ids.map(id => state.tv.find(x => x._id === id)).filter(Boolean);

  $("recentGrid").innerHTML =
    list.map(x => makeCard(x,"tv")).join("") ||
    '<div class="empty">You have not watched any channels yet.</div>';
}

function renderHome() {
  $("featuredChannels").innerHTML =
    state.tv.slice(0,8).map(x => makeCard(x,"tv")).join("") ||
    '<div class="empty">TV channels are loading.</div>';

  const recent = saved("itt_recent")
    .map(id => state.tv.find(x => x._id === id))
    .filter(Boolean);

  $("homeRecent").innerHTML =
    recent.slice(0,6).map(x => makeCard(x,"tv")).join("") ||
    '<div class="empty">Recently watched channels will appear here.</div>';

  $("totalTV").textContent = state.tv.length;
  $("totalRadio").textContent = state.radios.length;
}

/* RADIO DIRECTORY */


async function loadRadio() {
  message("radioResultCount", "Turimo gushaka amaradiyo...");

  const servers = [
    "https://de1.api.radio-browser.info",
    "https://fr1.api.radio-browser.info",
    "https://nl1.api.radio-browser.info"
  ];

  let stations = null;

  for (const server of servers) {
    try {
      const params = new URLSearchParams({
        limit: "1000",
        order: "clickcount",
        reverse: "true",
        hidebroken: "true"
      });

      const response = await fetch(
        `${server}/json/stations/search?${params.toString()}`,
        { cache: "no-store" }
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        stations = data;
        break;
      }
    } catch (error) {
      console.warn("Radio server failed:", server);
    }
  }

  if (!stations) {
    message("radioResultCount", "Radio ntizabonetse. Ongera ugerageze.");
    $("radioGrid").innerHTML =
      '<div class="empty">Radio directory is temporarily unavailable.</div>';
    return;
  }

  state.radios = stations.filter(station =>
    station.name &&
    station.url_resolved &&
    station.lastcheckok !== 0
  );

  $("totalRadio").textContent = state.radios.length;

  populateRadioFilters();
  renderRadio();

  message(
    "radioResultCount",
    `${state.radios.length} radio stations found`
  );
}

  message("radioResultCount", "Loading radio stations...");

  try {
    const response = await fetch(
      "https://de1.api.radio-browser.info/json/stations/search",
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          limit:1000,
          order:"clickcount",
          reverse:true,
          hidebroken:true
        })
      }
    );

    if (!response.ok) throw new Error("Radio API unavailable");

    const data = await response.json();

    state.radios = data.filter(station =>
      station.name &&
      station.url_resolved &&
      station.lastcheckok === 1
    );

    $("totalRadio").textContent = state.radios.length;
    populateRadioFilters();
    renderRadio();

  } catch {
    message("radioResultCount", "Radio directory unavailable. Please refresh and try again.");
    $("radioGrid").innerHTML =
      '<div class="empty">Radio stations could not be loaded. Check your internet connection.</div>';
  }
}

function populateRadioFilters() {
  const countries = [...new Set(
    state.radios.map(x => x.country).filter(Boolean)
  )].sort();

  const languages = [...new Set(
    state.radios.flatMap(x => (x.language || "").split(",").map(v => v.trim()))
      .filter(Boolean)
  )].sort();

  $("radioCountry").innerHTML =
    '<option value="">All countries</option>' +
    countries.map(x => `<option value="${safe(x)}">${safe(x)}</option>`).join("");

  $("radioLanguage").innerHTML =
    '<option value="">All languages</option>' +
    languages.slice(0,200).map(x =>
      `<option value="${safe(x)}">${safe(x)}</option>`
    ).join("");
}

function renderRadio() {
  const query = $("radioSearch").value.toLowerCase();
  const country = $("radioCountry").value;
  const language = $("radioLanguage").value;

  const list = state.radios.filter(station =>
    station.name.toLowerCase().includes(query) &&
    (!country || station.country === country) &&
    (!language || (station.language || "").split(",").map(v => v.trim()).includes(language))
  );

  message("radioResultCount", `${list.length} radio stations found`);

  $("radioGrid").innerHTML =
    list.slice(0,state.radioLimit).map(station => {
      const index = state.radios.indexOf(station);
      return makeCard({
        name:station.name,
        country:station.country || station.language || "International",
        logo:station.favicon
      },"radio",index);
    }).join("") ||
    '<div class="empty">No radio stations found.</div>';

  $("moreRadio").classList.toggle("hidden", list.length <= state.radioLimit);
}

function playRadio(index) {
  const station = state.radios[index];

  if (!station) {
    toast("Radio station not found.");
    return;
  }

  showPage("radio");

  $("radioNowPlaying").textContent = station.name;
  $("radioDetails").textContent =
    [station.country,station.language].filter(Boolean).join(" · ") || "Radio station";

  message("radioMessage","Connecting to radio...");

  const audio = $("radioPlayer");
  audio.pause();
  audio.src = station.url_resolved;
  audio.load();

  audio.play().then(() => {
    message("radioMessage","Playing live radio.");
  }).catch(() => {
    message("radioMessage","Press Play, or try another station. This stream may be offline or unsupported.");
  });
}

$("radioPlayer").addEventListener("error", () => {
  message("radioMessage","This radio stream is unavailable. Try another station.");
});

/* MOVIE SEARCH - INTERNET ARCHIVE */

async function searchMovies(reset = true) {
  const query = $("movieSearch").value.trim();

  if (!query) {
    message("movieResultCount","Enter a movie title to search.");
    return;
  }

  if (reset) {
    state.moviePage = 1;
    state.movies = [];
    state.movieQuery = query;
  }

  message("movieResultCount","Searching movie archive...");

  const searchQuery = `mediatype:movies AND title:(${query})`;
  const url =
    "https://archive.org/advancedsearch.php?q=" +
    encodeURIComponent(searchQuery) +
    "&fl[]=identifier&fl[]=title&fl[]=year&rows=24&page=" +
    state.moviePage +
    "&output=json";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Movie search unavailable");

    const data = await response.json();
    const docs = data.response?.docs || [];

    const results = docs.map(item => ({
      identifier:item.identifier,
      title:item.title || item.identifier,
      year:item.year || ""
    }));

    state.movies = reset ? results : [...state.movies,...results];
    state.movieHasMore = docs.length === 24;

    renderMovies();

    $("totalMovies").textContent = state.movies.length;
    message("movieResultCount",`${state.movies.length} archive results found. Select a film to check playback availability.`);

    $("moreMovies").classList.toggle("hidden",!state.movieHasMore);

  } catch {
    message("movieResultCount","Movie archive could not be reached. Please try again.");
  }
}

function renderMovies() {
  $("movieGrid").innerHTML =
    state.movies.map(movie => `
      <article class="media-card">
        <div class="card-image"><span>🎬</span></div>
        <div class="card-body">
          <h3>${safe(movie.title)}</h3>
          <p>${safe(movie.year || "Archive film")}</p>
          <div class="card-actions">
            <button data-movie="${safe(movie.identifier)}">Check & Watch</button>
          </div>
        </div>
      </article>
    `).join("") ||
    '<div class="empty">No films found. Try another title.</div>';
}

async function playMovie(identifier) {
  const movie = state.movies.find(x => x.identifier === identifier);
  if (!movie) return;

  showPage("movies");
  $("moviePlayerPanel").classList.remove("hidden");
  $("movieNowPlaying").textContent = movie.title;
  message("movieMessage","Checking film files and licence information...");

  const video = $("movieVideo");
  video.pause();
  video.removeAttribute("src");
  video.load();

  try {
    const response = await fetch(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}`
    );

    if (!response.ok) throw new Error("Metadata unavailable");

    const metadata = await response.json();
    const files = metadata.files || [];
    const info = metadata.metadata || {};

    const license = String(info.licenseurl || info.rights || "").toLowerCase();

    const allowedLicense =
      license.includes("creativecommons.org") ||
      license.includes("publicdomain") ||
      license.includes("public domain") ||
      license.includes("opensource.org");

    if (!allowedLicense) {
      message("movieMessage","This archive item does not show a recognised open licence. Choose another film.");
      return;
    }

    const candidates = files
      .filter(file => /\.(mp4|webm|ogv)$/i.test(file.name || ""))
      .filter(file => Number(file.size || 0) > 100000)
      .filter(file => !String(file.name).toLowerCase().includes("sample"))
      .sort((a,b) => Number(b.size || 0) - Number(a.size || 0));

    if (!candidates.length) {
      message("movieMessage","No compatible video file was found for this film.");
      return;
    }

    const file = candidates[0];
    const encodedFile = file.name.split("/").map(encodeURIComponent).join("/");
    const videoURL =
      `https://archive.org/download/${encodeURIComponent(identifier)}/${encodedFile}`;

    video.src = videoURL;
    video.load();

    await video.play();
    message("movieMessage","Playing film.");

  } catch {
    message("movieMessage","This film could not be played in your browser. Try another film.");
  }
}

$("movieVideo").addEventListener("error", () => {
  message("movieMessage","Video playback failed. The archive file may be unavailable or unsupported.");
});

/* SEARCH AND FILTER EVENTS */

$("tvSearch").addEventListener("input",renderTV);
$("tvCountry").addEventListener("change",renderTV);
$("tvCategory").addEventListener("change",renderTV);
$("tvSort").addEventListener("change",renderTV);

$("radioSearch").addEventListener("input",renderRadio);
$("radioCountry").addEventListener("change",renderRadio);
$("radioLanguage").addEventListener("change",renderRadio);

$("searchMovies").addEventListener("click",() => searchMovies(true));

$("movieSearch").addEventListener("keydown",event => {
  if (event.key === "Enter") searchMovies(true);
});

$("moreMovies").addEventListener("click",() => {
  state.moviePage++;
  searchMovies(false);
});

$("moreChannels").addEventListener("click",() => {
  state.tvLimit += 40;
  renderTV();
});

$("moreRadio").addEventListener("click",() => {
  state.radioLimit += 40;
  renderRadio();
});

$("globalSearch").addEventListener("keydown",event => {
  if (event.key !== "Enter") return;

  const query = event.target.value.trim();

  $("tvSearch").value = query;
  $("radioSearch").value = query;

  renderTV();
  renderRadio();
  showPage("tv");
});

/* START WEBSITE */

$("year").textContent = new Date().getFullYear();

loadTV();
loadRadio();
loadMovieChannels();
