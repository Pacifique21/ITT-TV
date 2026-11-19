
"use strict";

const $ = id => document.getElementById(id);
const state = {
  tv: [], radio: [], movies: [],
  tvShown: 40, radioShown: 40, movieShown: 24,
  currentTV: null, currentMovie: null, hls: null,
  moviePage: 1, movieQuery: ""
};

const getSaved = key => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const toast = message => {
  const el = $("toast");
  el.textContent = message;
  el.style.display = "block";
  setTimeout(() => el.style.display = "none", 2500);
};
const placeholder = (id, message) => {
  $(id).innerHTML = `<div class="empty">${escapeHTML(message)}</div>`;
};

function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = $(name + "Page");
  if (page) page.classList.add("active");
  document.querySelectorAll(".nav").forEach(b =>
    b.classList.toggle("active", b.dataset.page === name));
  $("sidebar").classList.remove("open");
  if (name === "favorites") renderFavorites();
  if (name === "recent") renderRecent();
  if (name === "home") renderHome();
  window.scrollTo({top:0, behavior:"instant"});
}

document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) showPage(pageButton.dataset.page);

  const tvButton = event.target.closest("[data-tv]");
  if (tvButton) playTV(Number(tvButton.dataset.tv));

  const radioButton = event.target.closest("[data-radio]");
  if (radioButton) playRadio(radioButton.dataset.radio);

  const movieButton = event.target.closest("[data-movie]");
  if (movieButton) playMovie(movieButton.dataset.movie);

  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) toggleFavorite(favoriteButton.dataset.favorite);

  const recentButton = event.target.closest("[data-recent]");
  if (recentButton) playTV(Number(recentButton.dataset.recent));
});

$("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));

function card(item, type) {
  const name = escapeHTML(item.name || item.title || "Unknown");
  const image = item.logo
    ? `<img loading="lazy" decoding="async" src="${escapeHTML(item.logo)}" alt="" onerror="this.remove()">`
    : `<span>${type === "radio" ? "♫" : type === "movie" ? "🎬" : "▶"}</span>`;
  const country = escapeHTML(item.country || item.year || "");
  const id = type === "tv" ? item._id : type === "radio" ? item.url : item.identifier;
  const action = type === "tv" ? `data-tv="${id}"` :
                 type === "radio" ? `data-radio="${escapeHTML(id)}"` :
                 `data-movie="${escapeHTML(id)}"`;
  const fav = type === "tv" ? `<button data-favorite="${item._id}">♡ Save</button>` : "";
  return `<article class="media-card">
    <div class="card-image">${image}</div>
    <div class="card-body">
      <h3>${name}</h3><p>${country}</p>
      <div class="card-actions"><button ${action}>${type === "radio" ? "Listen" : type === "movie" ? "Watch" : "Play"}</button>${fav}</div>
    </div></article>`;
}

async function fetchPlaylist(country) {
  const url = `https://iptv-org.github.io/iptv/countries/${country}.m3u`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Playlist unavailable");
  const text = await response.text();
  const lines = text.split(/\r?\n/);
  const result = [];
  let item = null;

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      const name = line.split(",").slice(1).join(",").trim();
      const logo = (line.match(/tvg-logo="([^"]*)"/) || [])[1] || "";
      const group = (line.match(/group-title="([^"]*)"/) || [])[1] || "General";
      item = {
        name: name || "TV Channel", logo,
        country: country.toUpperCase(), category: group,
        url: null, _id: `${country}-${result.length}`
      };
    } else if (line.trim().startsWith("http") && item) {
      item.url = line.trim();
      result.push(item);
      item = null;
    }
  }
  return result;
}

async function loadTV() {
  $("tvResultCount").textContent = "Loading TV channels...";
  const countries = ["rw","ug","ke","tz","za","gb","us","fr","in"];
  const batches = await Promise.allSettled(countries.map(fetchPlaylist));
  state.tv = batches.filter(x => x.status === "fulfilled").flatMap(x => x.value);
  state.tv = state.tv.filter((v,i,a) => a.findIndex(x => x.url === v.url) === i);
  $("totalTV").textContent = state.tv.length;
  populateTVFilters();
  renderTV();
  renderHome();
  if (!state.tv.length) $("tvResultCount").textContent =
    "TV channels could not be loaded. Check your internet connection and try again.";
}

function populateTVFilters() {
  const countries = [...new Set(state.tv.map(x => x.country))].sort();
  const categories = [...new Set(state.tv.map(x => x.category))].sort();
  $("tvCountry").innerHTML = '<option value="">All countries</option>' +
    countries.map(x => `<option>${escapeHTML(x)}</option>`).join("");
  $("tvCategory").innerHTML = '<option value="">All categories</option>' +
    categories.map(x => `<option>${escapeHTML(x)}</option>`).join("");
}

function filteredTV() {
  const q = $("tvSearch").value.toLowerCase();
  const country = $("tvCountry").value;
  const category = $("tvCategory").value;
  const list = state.tv.filter(x =>
    x.name.toLowerCase().includes(q) &&
    (!country || x.country === country) &&
    (!category || x.category === category));
  if ($("tvSort").value === "country") list.sort((a,b) => a.country.localeCompare(b.country));
  else list.sort((a,b) => a.name.localeCompare(b.name));
  return list;
}

function renderTV() {
  const list = filteredTV();
  $("tvResultCount").textContent = `${list.length} channels found`;
  $("tvGrid").innerHTML = list.slice(0,state.tvShown).map(x => card(x,"tv")).join("") ||
    '<div class="empty">No channels found.</div>';
  $("moreChannels").classList.toggle("hidden", list.length <= state.tvShown);
}

function playTV(index) {
  const channel = state.tv.find(x => x._id === index);
  if (!channel) return;
  state.currentTV = channel;
  $("tvNowPlaying").textContent = channel.name;
  $("videoPlaceholder").classList.add("hidden");
  $("tvMessage").textContent = "Connecting to channel...";
  $("tvVideo").classList.remove("hidden");
  stopHLS();

  const video = $("tvVideo");
  video.pause();
  video.removeAttribute("src");
  video.load();

  if (channel.url.includes(".m3u8") && window.Hls && Hls.isSupported()) {
    state.hls = new Hls({
      enableWorker:true,
      lowLatencyMode:true,
      maxBufferLength:20,
      backBufferLength:10
    });
    state.hls.loadSource(channel.url);
    state.hls.attachMedia(video);
    state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
      $("tvMessage").textContent = "Stream loaded. Press play if needed.";
    });
    state.hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) $("tvMessage").textContent = "This channel is unavailable or blocked by its provider.";
    });
  } else {
    video.src = channel.url;
    video.play().then(() => $("tvMessage").textContent = "")
      .catch(() => $("tvMessage").textContent = "Press play, or try another channel.");
  }
  const recent = getSaved("itt_recent").filter(x => x !== channel._id);
  recent.unshift(channel._id);
  save("itt_recent", recent.slice(0,30));
  showPage("tv");
}

function stopHLS() {
  if (state.hls) { state.hls.destroy(); state.hls = null; }
}

function toggleFavorite(id) {
  const favorites = getSaved("itt_favorites");
  const updated = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites,id];
  save("itt_favorites",updated);
  toast(updated.includes(id) ? "Added to favorites" : "Removed from favorites");
  renderFavorites();
}

function renderFavorites() {
  const ids = getSaved("itt_favorites");
  const list = state.tv.filter(x => ids.includes(x._id));
  $("favoritesGrid").innerHTML = list.map(x => card(x,"tv")).join("") ||
    '<div class="empty">No favorite channels saved yet.</div>';
}

function renderRecent() {
  const ids = getSaved("itt_recent");
  const list = ids.map(id => state.tv.find(x => x._id === id)).filter(Boolean);
  $("recentGrid").innerHTML = list.map(x => card(x,"tv")).join("") ||
    '<div class="empty">No recently watched channels yet.</div>';
}

function renderHome() {
  $("featuredChannels").innerHTML = state.tv.slice(0,8).map(x => card(x,"tv")).join("") ||
    '<div class="empty">TV channels are loading.</div>';
  const recent = getSaved("itt_recent").map(id => state.tv.find(x => x._id === id)).filter(Boolean);
  $("homeRecent").innerHTML = recent.slice(0,6).map(x => card(x,"tv")).join("") ||
    '<div class="empty">Your recently watched channels will appear here.</div>';
  $("totalTV").textContent = state.tv.length || "—";
  $("totalRadio").textContent = state.radio.length || "—";
  $("totalMovies").textContent = state.movies.length || "—";
}

async function loadRadio() {
  $("radioResultCount").textContent = "Loading radio stations...";
  try {
    const response = await fetch("https://de1.api.radio-browser.info/json/stations/search", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({limit:250, order:"clickcount", reverse:true, hidebroken:true})
    });
    if (!response.ok) throw new Error("Radio directory unavailable");
    state.radio = await response.json();
    state.radio = state.radio.filter(x => x.url_resolved && x.name);
    $("totalRadio").textContent = state.radio.length;
    populateRadioFilters();
    renderRadio();
    renderHome();
  } catch {
    $("radioResultCount").textContent = "Radio directory is unavailable right now. Please try again later.";
  }
}

function populateRadioFilters() {
  const countries = [...new Set(state.radio.map(x => x.country).filter(Boolean))].sort();
  const languages = [...new Set(state.radio.flatMap(x => (x.language || "").split(",")).filter(Boolean))].sort();
  $("radioCountry").innerHTML = '<option value="">All countries</option>' +
    countries.map(x => `<option>${escapeHTML(x)}</option>`).join("");
  $("radioLanguage").innerHTML = '<option value="">All languages</option>' +
    languages.slice(0,150).map(x => `<option>${escapeHTML(x)}</option>`).join("");
}

function renderRadio() {
  const q = $("radioSearch").value.toLowerCase();
  const country = $("radioCountry").value;
  const language = $("radioLanguage").value;
  const list = state.radio.filter(x =>
    x.name.toLowerCase().includes(q) &&
    (!country || x.country === country) &&
    (!language || (x.language || "").split(",").includes(language)));
  $("radioResultCount").textContent = `${list.length} stations found`;
  $("radioGrid").innerHTML = list.slice(0,state.radioShown).map(x => card({
    name:x.name, country:x.country || x.language, logo:x.favicon, url:x.url_resolved
  },"radio")).join("") || '<div class="empty">No radio stations found.</div>';
  $("moreRadio").classList.toggle("hidden",list.length <= state.radioShown);
}

function playRadio(url) {
  const station = state.radio.find(x => x.url_resolved === url);
  if (!station) return;
  $("radioNowPlaying").textContent = station.name;
  $("radioDetails").textContent = station.country || station.language || "Radio station";
  $("radioMessage").textContent = "Connecting...";
  const player = $("radioPlayer");
  player.pause();
  player.src = url;
  player.load();
  player.play().then(() => $("radioMessage").textContent = "")
    .catch(() => $("radioMessage").textContent = "This station may be offline or unsupported. Try another one.");
  showPage("radio");
}

async function searchMovies(reset = true) {
  const query = $("movieSearch").value.trim();
  if (!query) {
    $("movieResultCount").textContent = "Enter a movie title to search.";
    return;
  }
  if (reset) {
    state.moviePage = 1;
    state.movies = [];
    state.movieQuery = query;
  }
  $("movieResultCount").textContent = "Searching movie archive...";
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://archive.org/advancedsearch.php?q=mediatype%3Amovies%20AND%20licenseurl%3A*%20AND%20${encoded}&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=year&rows=24&page=${state.moviePage}&output=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Movie search failed");
    const data = await response.json();
    const docs = data.response?.docs || [];
    const results = await Promise.all(docs.map(async item => {
      try {
        const metaResponse = await fetch(`https://archive.org/metadata/${encodeURIComponent(item.identifier)}`);
        const meta = await metaResponse.json();
        const files = meta.files || [];
        const videoFile = files.find(f =>
          /\.(mp4|m4v|webm)$/i.test(f.name || "") &&
          Number(f.size || 0) > 100000
        );
        if (!videoFile) return null;
        const license = meta.metadata?.licenseurl || meta.metadata?.rights || "";
        if (!license) return null;
        return {
          identifier:item.identifier,
          title:item.title || item.identifier,
          year:item.year || "",
          license,
          url:`https://archive.org/download/${encodeURIComponent(item.identifier)}/${videoFile.name}`
        };
      } catch { return null; }
    }));
    const valid = results.filter(Boolean);
    state.movies = reset ? valid : [...state.movies,...valid];
    renderMovies();
    $("movieResultCount").textContent = `${state.movies.length} playable results with licence information found.`;
    $("totalMovies").textContent = state.movies.length;
    $("moreMovies").classList.toggle("hidden", docs.length < 24);
  } catch {
    $("movieResultCount").textContent = "Movie archive could not be reached. Check your internet and try again.";
  }
}

function renderMovies() {
  $("movieGrid").innerHTML = state.movies.map(movie => `
    <article class="media-card">
      <div class="card-image">🎬</div>
      <div class="card-body">
        <h3>${escapeHTML(movie.title)}</h3>
        <p>${escapeHTML(movie.year)} · Licence details available</p>
        <div class="card-actions"><button data-movie="${escapeHTML(movie.identifier)}">Watch</button></div>
      </div>
    </article>`).join("") || '<div class="empty">No matching playable movies found.</div>';
}

function playMovie(identifier) {
  const movie = state.movies.find(x => x.identifier === identifier);
  if (!movie) return;
  state.currentMovie = movie;
  $("moviePlayerPanel").classList.remove("hidden");
  $("movieNowPlaying").textContent = movie.title;
  $("movieMessage").textContent = "Loading movie...";
  const player = $("movieVideo");
  player.pause();
  player.src = movie.url;
  player.load();
  player.play().then(() => $("movieMessage").textContent = "")
    .catch(() => $("movieMessage").textContent = "Press play, or try another movie. The source may not support playback in your browser.");
  showPage("movies");
  $("moviePlayerPanel").scrollIntoView({behavior:"smooth",block:"start"});
}

$("tvSearch").addEventListener("input",renderTV);
$("tvCountry").addEventListener("change",renderTV);
$("tvCategory").addEventListener("change",renderTV);
$("tvSort").addEventListener("change",renderTV);
$("radioSearch").addEventListener("input",renderRadio);
$("radioCountry").addEventListener("change",renderRadio);
$("radioLanguage").addEventListener("change",renderRadio);
$("searchMovies").addEventListener("click",() => searchMovies(true));
$("movieSearch").addEventListener("keydown",e => {if(e.key === "Enter") searchMovies(true);});
$("moreMovies").addEventListener("click",() => {state.moviePage++;searchMovies(false);});
$("moreChannels").addEventListener("click",() => {state.tvShown += 40;renderTV();});
$("moreRadio").addEventListener("click",() => {state.radioShown += 40;renderRadio();});
$("globalSearch").addEventListener("keydown",e => {
  if(e.key !== "Enter") return;
  const q = e.target.value.trim();
  $("tvSearch").value = q;
  $("radioSearch").value = q;
  $("movieSearch").value = q;
  renderTV();renderRadio();showPage("tv");
});
$("playerFavorite").addEventListener("click",() => {
  if (state.currentTV) toggleFavorite(state.currentTV._id);
});
$("year").textContent = new Date().getFullYear();

loadTV();
loadRadio();
