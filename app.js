/* =========================================================
   ITT-TV application
   News: Google News RSS via RSS2JSON (external feed service)
   Radio: Radio Browser public API
   TV: public M3U playlist + HLS.js
   Movies: openly available sample films
   ========================================================= */
"use strict";

const CONFIG = {
  newsFeeds: [
    { name: "Rwanda", category: "Rwanda", url: "https://news.google.com/rss/search?q=Rwanda&hl=en&gl=RW&ceid=RW:en" },
    { name: "Africa", category: "Africa", url: "https://news.google.com/rss/headlines/section/topic/WORLD_AFRICA?hl=en&gl=US&ceid=US:en" },
    { name: "World", category: "World", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en&gl=US&ceid=US:en" },
    { name: "Business", category: "Business", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en&gl=US&ceid=US:en" },
    { name: "Technology", category: "Technology", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en&gl=US&ceid=US:en" },
    { name: "Sports", category: "Sports", url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en&gl=US&ceid=US:en" }
  ],
  tvPlaylist: "https://raw.githubusercontent.com/freecasthub/public-iptv/main/playlist.m3u",
  radioApi: "https://de1.api.radio-browser.info/json",
  radioLimit: 120,
  tvLimit: 500
};

const state = {
  news: [],
  newsCategory: "all",
  newsVisible: 12,
  tv: [],
  radio: [],
  selectedTV: null,
  selectedRadio: null,
  selectedMovie: null,
  hls: null
};

const $ = (id) => document.getElementById(id);
const safeText = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const shortDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "Latest";
};
const showToast = (message) => {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
};
const setMessage = (id, message) => {
  const element = $(id);
  if (element) element.textContent = message;
};
const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const timeoutFetch = async (url, options = {}, timeout = 14000) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
  } finally {
    window.clearTimeout(timer);
  }
};

/* ---------------------------------------------------------
   Navigation and shared controls
   --------------------------------------------------------- */
function setupNavigation() {
  const toggle = $("menuToggle");
  const nav = $("mainNav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => nav.classList.remove("open"));
  });
  $("closeAnnouncement")?.addEventListener("click", () => $("announcement")?.remove());
  $("globalSearchToggle")?.addEventListener("click", () => {
    $("globalSearchWrap")?.classList.toggle("hidden");
    $("globalSearch")?.focus();
  });
  $("globalSearchButton")?.addEventListener("click", runGlobalSearch);
  $("globalSearch")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runGlobalSearch();
  });
  $("year").textContent = new Date().getFullYear();
  const sections = [...document.querySelectorAll("main section[id]")];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        document.querySelectorAll(".nav-link").forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px" });
    sections.forEach((section) => observer.observe(section));
  }
}
function runGlobalSearch() {
  const query = $("globalSearch")?.value.trim();
  if (!query) return;
  $("newsSearch").value = query;
  $("tvSearch").value = query;
  $("radioSearch").value = query;
  renderNews();
  renderTV();
  renderRadio();
  $("news").scrollIntoView({ behavior: "smooth" });
}

/* ---------------------------------------------------------
   NEWS — feed loading, filtering and cards
   --------------------------------------------------------- */
async function fetchNewsFeed(feed) {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
  const response = await timeoutFetch(endpoint);
  if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
  const data = await response.json();
  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error(data.message || "News feed is not available");
  }
  return data.items.map((item) => ({
    title: item.title || "Untitled story",
    description: stripHTML(item.description || item.content || "").slice(0, 220),
    link: item.link || "https://news.google.com/",
    image: item.thumbnail || extractImage(item.content || item.description || ""),
    date: item.pubDate || "",
    source: item.author || feed.name,
    category: feed.category
  }));
}
function stripHTML(value) {
  const node = document.createElement("div");
  node.innerHTML = value;
  return (node.textContent || node.innerText || "").replace(/\s+/g, " ").trim();
}
function extractImage(html) {
  const match = String(html).match(/<img[^>]+src=["']([^"']+)/i);
  return match ? match[1] : "";
}
async function loadNews() {
  setMessage("newsStatus", "Loading news from available RSS feeds…");
  $("newsGrid").innerHTML = '<div class="empty-state">Fetching headlines…</div>';
  const results = await Promise.allSettled(CONFIG.newsFeeds.map(fetchNewsFeed));
  const loaded = results.filter((result) => result.status === "fulfilled").flatMap((result) => result.value);
  state.news = uniqueBy(loaded, (item) => item.link || item.title);
  state.newsVisible = 12;
  if (state.news.length) {
    setMessage("newsStatus", `${state.news.length} headlines loaded · Open a story to read it from its publisher.`);
    updateTicker();
    renderNews();
    renderSports();
  } else {
    setMessage("newsStatus", "Live feeds could not be reached. Check your connection and try refreshing.");
    $("newsGrid").innerHTML = '<div class="empty-state">News feeds are temporarily unavailable. Use Refresh News to try again. You can still visit <a class="text-link" href="https://news.google.com/" target="_blank" rel="noopener noreferrer">Google News ↗</a>.</div>';
    $("sportsList").innerHTML = '<div class="empty-state">Sports feed unavailable right now. Try refreshing later.</div>';
  }
}
function getFilteredNews() {
  const query = $("newsSearch").value.trim().toLowerCase();
  return state.news.filter((item) => {
    const categoryMatch = state.newsCategory === "all" || item.category === state.newsCategory;
    const text = `${item.title} ${item.description} ${item.source} ${item.category}`.toLowerCase();
    return categoryMatch && (!query || text.includes(query));
  });
}
function renderNews() {
  const items = getFilteredNews().slice(0, state.newsVisible);
  const grid = $("newsGrid");
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">No matching headlines. Change the filter or search another word.</div>';
    return;
  }
  grid.innerHTML = items.map((item) => `
    <article class="news-card">
      <div class="news-image">
        ${item.image ? `<img src="${safeText(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '<span class="image-placeholder">▤</span>'}
        <span class="news-tag">${safeText(item.category)}</span>
      </div>
      <div class="news-content">
        <div class="news-meta"><span>${safeText(item.source)}</span><span>${safeText(shortDate(item.date))}</span></div>
        <h3>${safeText(item.title)}</h3>
        <p>${safeText(item.description || "Open the original publisher for the full report.")}</p>
        <a class="text-link" href="${safeText(item.link)}" target="_blank" rel="noopener noreferrer">Read full story ↗</a>
      </div>
    </article>`).join("");
  $("loadMoreNews").classList.toggle("hidden", getFilteredNews().length <= state.newsVisible);
}
function updateTicker() {
  const titles = state.news.slice(0, 10).map((item) => safeText(item.title));
  $("tickerTrack").innerHTML = `<span>${titles.join("　 •　 ") || "Welcome to ITT-TV"}</span>`;
}
function renderSports() {
  const items = state.news.filter((item) => item.category === "Sports").slice(0, 5);
  $("sportsList").innerHTML = items.length ? items.map((item) => `
    <a class="sport-row" href="${safeText(item.link)}" target="_blank" rel="noopener noreferrer">
      <span class="sport-row-icon">⚽</span>
      <span><h4>${safeText(item.title)}</h4><small>${safeText(item.source)} · ${safeText(shortDate(item.date))}</small></span>
    </a>`).join("") : '<div class="empty-state">Sports headlines will appear when the sports feed is available.</div>';
}
function setupNewsControls() {
  $("refreshNews").addEventListener("click", loadNews);
  $("newsSearch").addEventListener("input", renderNews);
  $("loadMoreNews").addEventListener("click", () => {
    state.newsVisible += 12;
    renderNews();
  });
  $("newsFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.newsCategory = button.dataset.category;
    $("newsFilters").querySelectorAll("button").forEach((item) => item.classList.toggle("selected", item === button));
    state.newsVisible = 12;
    renderNews();
  });
}

/* ---------------------------------------------------------
   TELEVISION — M3U parsing and HLS playback
   --------------------------------------------------------- */
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let pending = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").slice(1).join(",").trim() || "Unknown channel";
      const attr = (key) => {
        const match = line.match(new RegExp(`${key}="([^"]*)"`, "i"));
        return match ? match[1] : "";
      };
      pending = {
        name: attr("tvg-name") || name,
        logo: attr("tvg-logo"),
        country: attr("tvg-country") || attr("tvg-country-code") || "International",
        group: attr("group-title") || "General",
        language: attr("tvg-language") || "",
        title: name
      };
    } else if (!line.startsWith("#") && pending) {
      if (/^https?:\/\//i.test(line)) {
        channels.push({ ...pending, url: line });
      }
      pending = null;
    }
  }
  return uniqueBy(channels, (channel) => channel.url).slice(0, CONFIG.tvLimit);
}
async function loadTV() {
  setMessage("tvMessage", "Loading public TV playlist…");
  $("tvList").innerHTML = '<div class="empty-state">Loading channels…</div>';
  try {
    const response = await timeoutFetch(CONFIG.tvPlaylist, {}, 20000);
    if (!response.ok) throw new Error(`Playlist returned ${response.status}`);
    const text = await response.text();
    state.tv = parseM3U(text);
    if (!state.tv.length) throw new Error("No public channels found in playlist");
    populateTVCountries();
    renderTV();
    $("tvCount").textContent = `${state.tv.length} public channels`;
    setMessage("tvMessage", "Select a public channel. If playback fails, the broadcaster may have changed or restricted its stream.");
  } catch (error) {
    state.tv = [];
    $("tvList").innerHTML = `<div class="empty-state">Could not load the public playlist. ${safeText(error.message)}. Check the playlist source or try again.</div>`;
    $("tvCount").textContent = "Playlist unavailable";
    setMessage("tvMessage", "No TV playlist is available right now. This does not mean the channel list is empty permanently.");
  }
}
function populateTVCountries() {
  const select = $("tvCountry");
  const countries = [...new Set(state.tv.map((item) => item.country).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All countries</option>' + countries.map((country) => `<option value="${safeText(country)}">${safeText(country)}</option>`).join("");
}
function renderTV() {
  const query = $("tvSearch").value.trim().toLowerCase();
  const country = $("tvCountry").value;
  const items = state.tv.filter((channel) => {
    const matchesText = `${channel.name} ${channel.country} ${channel.group} ${channel.language}`.toLowerCase().includes(query);
    return matchesText && (country === "all" || channel.country === country);
  }).slice(0, 150);
  $("tvList").innerHTML = items.length ? items.map((channel) => {
    const index = state.tv.indexOf(channel);
    return `<button class="channel-item ${state.selectedTV?.url === channel.url ? "selected" : ""}" data-tv-index="${index}">
      <span class="channel-logo">${channel.logo ? `<img src="${safeText(channel.logo)}" alt="" style="width:100%;height:100%;object-fit:contain" onerror="this.remove()">` : "TV"}</span>
      <span><strong>${safeText(channel.name)}</strong><small>${safeText(channel.country)} · ${safeText(channel.group)}</small></span>
    </button>`;
  }).join("") : '<div class="empty-state">No channels match this search.</div>';
}
async function playTV(channel) {
  if (!channel) return;
  state.selectedTV = channel;
  $("tvNowPlaying").textContent = channel.name;
  $("tvPlaceholder").classList.add("hidden");
  $("tvExternal").classList.remove("hidden");
  $("tvExternal").href = channel.url;
  $("tvEmbed").classList.add("hidden");
  $("tvVideo").classList.remove("hidden");
  $("tvVideo").pause();
  $("tvVideo").removeAttribute("src");
  $("tvVideo").load();
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
  renderTV();
  setMessage("tvMessage", "Connecting to stream…");
  const video = $("tvVideo");
  try {
    if (/\.m3u8($|\?)/i.test(channel.url) && window.Hls && Hls.isSupported()) {
      state.hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      state.hls.loadSource(channel.url);
      state.hls.attachMedia(video);
      state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => setMessage("tvMessage", "Press Play to start the stream."));
        setMessage("tvMessage", "Stream loaded. Press Play if it does not start automatically.");
      });
      state.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setMessage("tvMessage", "This stream could not play in the browser. Try another channel or open the broadcaster source.");
      });
    } else {
      video.src = channel.url;
      await video.play().catch(() => {});
      setMessage("tvMessage", "If playback does not start, this format may not be supported by your browser.");
    }
  } catch (error) {
    setMessage("tvMessage", "Playback failed. The source may be offline, restricted or unsupported.");
  }
}
function setupTVControls() {
  $("tvSearch").addEventListener("input", renderTV);
  $("tvCountry").addEventListener("change", renderTV);
  $("tvList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tv-index]");
    if (button) playTV(state.tv[Number(button.dataset.tvIndex)]);
  });
  $("refreshTV").addEventListener("click", loadTV);
}

/* ---------------------------------------------------------
   RADIO — Radio Browser API
   --------------------------------------------------------- */
async function loadRadio() {
  setMessage("radioMessage", "Searching the public radio directory…");
  $("radioList").innerHTML = '<div class="empty-state">Finding stations…</div>';
  try {
    const url = `${CONFIG.radioApi}/stations/search?limit=${CONFIG.radioLimit}&hidebroken=true&order=clickcount&reverse=true`;
    const response = await timeoutFetch(url, { headers: { "User-Agent": "ITT-TV/1.0" } });
    if (!response.ok) throw new Error(`Radio directory returned ${response.status}`);
    const data = await response.json();
    state.radio = uniqueBy(data.filter((station) => station.url_resolved), (station) => station.stationuuid);
    populateRadioCountries();
    renderRadio();
    $("radioCount").textContent = `${state.radio.length} stations found`;
    setMessage("radioMessage", "Choose a station to listen. Some streams may be unavailable in certain locations.");
  } catch (error) {
    state.radio = [];
    $("radioList").innerHTML = `<div class="empty-state">Radio directory is temporarily unavailable. ${safeText(error.message)}. Try again later.</div>`;
    $("radioCount").textContent = "Directory unavailable";
  }
}
function populateRadioCountries() {
  const select = $("radioCountry");
  const current = select.value;
  const countries = [...new Set(state.radio.map((station) => station.country).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">All countries</option>' + countries.map((country) => `<option value="${safeText(country)}">${safeText(country)}</option>`).join("");
  if (countries.includes(current)) select.value = current;
  else if (countries.includes("Rwanda")) select.value = "Rwanda";
}
function getFilteredRadio() {
  const query = $("radioSearch").value.trim().toLowerCase();
  const country = $("radioCountry").value;
  return state.radio.filter((station) => {
    const content = `${station.name} ${station.country} ${station.language} ${station.tags}`.toLowerCase();
    return content.includes(query) && (country === "all" || station.country === country);
  }).slice(0, 80);
}
function renderRadio() {
  const items = getFilteredRadio();
  $("radioList").innerHTML = items.length ? items.map((station) => `
    <button class="radio-card ${state.selectedRadio?.stationuuid === station.stationuuid ? "selected" : ""}" data-radio-id="${safeText(station.stationuuid)}">
      <span class="radio-icon">♫</span>
      <span><strong>${safeText(station.name)}</strong><small>${safeText(station.country || "International")} · ${safeText(station.language || "Radio")}</small></span>
    </button>`).join("") : '<div class="empty-state">No stations match your search. Try another country or name.</div>';
}
async function playRadio(station) {
  if (!station) return;
  state.selectedRadio = station;
  const player = $("radioPlayer");
  player.pause();
  player.src = station.url_resolved;
  $("radioNowPlaying").textContent = station.name;
  $("radioMeta").textContent = [station.country, station.language, station.tags].filter(Boolean).join(" · ");
  renderRadio();
  setMessage("radioMessage", "Connecting to radio stream…");
  try {
    await player.play();
    setMessage("radioMessage", "Now playing. Keep this tab open while listening.");
  } catch (error) {
    setMessage("radioMessage", "The station did not start. Press Play or choose another station; the stream may be offline or restricted.");
  }
}
function setupRadioControls() {
  $("radioSearch").addEventListener("input", renderRadio);
  $("radioCountry").addEventListener("change", renderRadio);
  $("radioList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-radio-id]");
    if (!button) return;
    const station = state.radio.find((item) => item.stationuuid === button.dataset.radioId);
    playRadio(station);
  });
  $("refreshRadios").addEventListener("click", loadRadio);
  $("radioPlayer").addEventListener("error", () => setMessage("radioMessage", "Audio stream error. Try a different station."));
}

/* ---------------------------------------------------------
   MOVIES — publicly available sample films
   --------------------------------------------------------- */
const MOVIES = [
  {
    title: "Big Buck Bunny",
    year: "2008",
    kind: "Open movie",
    icon: "🐰",
    description: "A short animated film released as an open project.",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  },
  {
    title: "Sintel",
    year: "2010",
    kind: "Open movie",
    icon: "🐉",
    description: "An animated fantasy short from the Blender open-movie project.",
    url: "https://media.w3.org/2010/05/sintel/trailer.mp4"
  },
  {
    title: "Tears of Steel",
    year: "2012",
    kind: "Open movie",
    icon: "🎬",
    description: "A science-fiction short made by the Blender Foundation.",
    url: "https://media.w3.org/2010/05/bunny/trailer.mp4"
  },
  {
    title: "For Bigger Escapes",
    year: "Sample",
    kind: "Demo video",
    icon: "🌍",
    description: "A short sample video for testing the website player.",
    url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
  }
];
function renderMovies() {
  $("movieGrid").innerHTML = MOVIES.map((movie, index) => `
    <article class="movie-card" data-movie-index="${index}" tabindex="0" role="button" aria-label="Play ${safeText(movie.title)}">
      <div class="movie-poster">${movie.icon}</div>
      <div class="movie-card-body"><h3>${safeText(movie.title)}</h3><p>${safeText(movie.year)} · ${safeText(movie.kind)}</p><button type="button">▶ Play sample</button></div>
    </article>`).join("");
}
function playMovie(movie) {
  if (!movie) return;
  state.selectedMovie = movie;
  const player = $("moviePlayer");
  player.pause();
  player.src = movie.url;
  player.load();
  $("moviePlaceholder").classList.add("hidden");
  $("movieNowPlaying").textContent = movie.title;
  setMessage("movieMessage", "Loading the selected sample film…");
  player.play().then(() => {
    setMessage("movieMessage", "Playing. Use the video controls to pause or change volume.");
  }).catch(() => {
    setMessage("movieMessage", "Press Play. If this sample is unavailable, choose another title.");
  });
}
function setupMovieControls() {
  $("movieGrid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-movie-index]");
    if (card) playMovie(MOVIES[Number(card.dataset.movieIndex)]);
  });
  $("movieGrid").addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-movie-index]")) {
      event.preventDefault();
      playMovie(MOVIES[Number(event.target.dataset.movieIndex)]);
    }
  });
  $("moviePlayer").addEventListener("error", () => setMessage("movieMessage", "This sample video is currently unavailable. Try another title."));
}

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
function initializeApp() {
  setupNavigation();
  setupNewsControls();
  setupTVControls();
  setupRadioControls();
  setupMovieControls();
  renderMovies();
  loadNews();
  loadTV();
  loadRadio();
}
document.addEventListener("DOMContentLoaded", initializeApp);
