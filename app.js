
"use strict";

const $ = id => document.getElementById(id);

const state = {
  tv: [],
  radios: [],
  currentTV: null,
  currentHls: null,
  favorites: JSON.parse(localStorage.getItem("ittFavorites") || "[]"),
  recent: JSON.parse(localStorage.getItem("ittRecent") || "[]"),
  page: "homePage",
  category: "",
  country: ""
};

const PLAYLISTS = [
  ["Rwanda","https://iptv-org.github.io/iptv/countries/rw.m3u"],
  ["Uganda","https://iptv-org.github.io/iptv/countries/ug.m3u"],
  ["Kenya","https://iptv-org.github.io/iptv/countries/ke.m3u"],
  ["Tanzania","https://iptv-org.github.io/iptv/countries/tz.m3u"],
  ["Burundi","https://iptv-org.github.io/iptv/countries/bi.m3u"],
  ["DR Congo","https://iptv-org.github.io/iptv/countries/cd.m3u"],
  ["South Africa","https://iptv-org.github.io/iptv/countries/za.m3u"],
  ["Nigeria","https://iptv-org.github.io/iptv/countries/ng.m3u"],
  ["Ghana","https://iptv-org.github.io/iptv/countries/gh.m3u"],
  ["United States","https://iptv-org.github.io/iptv/countries/us.m3u"],
  ["United Kingdom","https://iptv-org.github.io/iptv/countries/gb.m3u"],
  ["France","https://iptv-org.github.io/iptv/countries/fr.m3u"],
  ["Germany","https://iptv-org.github.io/iptv/countries/de.m3u"],
  ["India","https://iptv-org.github.io/iptv/countries/in.m3u"],
  ["Japan","https://iptv-org.github.io/iptv/countries/jp.m3u"],
  ["Canada","https://iptv-org.github.io/iptv/countries/ca.m3u"],
  ["Australia","https://iptv-org.github.io/iptv/countries/au.m3u"],
  ["Qatar","https://iptv-org.github.io/iptv/countries/qa.m3u"],
  ["Brazil","https://iptv-org.github.io/iptv/countries/br.m3u"],
  ["Italy","https://iptv-org.github.io/iptv/countries/it.m3u"],
  ["Spain","https://iptv-org.github.io/iptv/countries/es.m3u"],
  ["Japan","https://iptv-org.github.io/iptv/countries/jp.m3u"]
];

const RADIO_API = "https://de1.api.radio-browser.info/json";

const CATEGORIES = [
  ["News","📰"],["Sports","⚽"],["Music","🎵"],
  ["Movies","🎬"],["Kids","🧸"],["Documentary","🌍"],
  ["Education","📚"],["Entertainment","✨"],
  ["Culture","🎭"],["General","📺"]
];

function safe(value) {
  return String(value || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function saveLocal() {
  localStorage.setItem("ittFavorites", JSON.stringify(state.favorites));
  localStorage.setItem("ittRecent", JSON.stringify(state.recent));
}

function isFavorite(url) {
  return state.favorites.some(item => item.url === url);
}

function adultContent(channel) {
  const text = `${channel.name} ${channel.category}`.toLowerCase();
  return /18\+|adult|porn|xxx|erotic|babestation|dorcel|brazzers/i.test(text);
}

/* ---------------- TV DIRECTORY ---------------- */

function parsePlaylist(text, fallbackCountry) {
  const lines = text.split(/\r?\n/);
  const output = [];
  let info = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      info = line;
      continue;
    }

    if (line.startsWith("#") || !/^https?:\/\//i.test(line)) continue;

    const name = info.match(/,(.*)$/)?.[1]?.trim() || "TV Channel";
    const logo = info.match(/tvg-logo="([^"]*)"/i)?.[1] || "";
    const country = info.match(/tvg-country="([^"]*)"/i)?.[1] || fallbackCountry;
    const category = info.match(/group-title="([^"]*)"/i)?.[1] || "General";

    const channel = {name, url:line, logo, country, category};
    if (!adultContent(channel)) output.push(channel);
    info = "";
  }
  return output;
}

async function getPlaylist([country,url]) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Playlist failed");
    return parsePlaylist(await response.text(), country);
  } catch (error) {
    console.warn("Playlist unavailable:", country, error);
    return [];
  }
}

async function loadTV() {
  $("tvResultCount").textContent = "Loading TV channels...";
  const groups = await Promise.all(PLAYLISTS.map(getPlaylist));
  const all = groups.flat();
  const unique = new Map();

  all.forEach(channel => {
    if (!unique.has(channel.url)) unique.set(channel.url, channel);
  });

  state.tv = [...unique.values()].sort((a,b) => {
    const ar = a.country.toLowerCase() === "rwanda" ? 0 : 1;
    const br = b.country.toLowerCase() === "rwanda" ? 0 : 1;
    return ar - br || a.name.localeCompare(b.name);
  });

  $("totalTV").textContent = state.tv.length.toLocaleString();
  $("totalCountries").textContent =
    new Set(state.tv.map(c => c.country)).size;

  fillTVFilters();
  renderHome();
  renderTV();
}

function fillTVFilters() {
  const countries = [...new Set(state.tv.map(c => c.country))].filter(Boolean).sort();
  const categories = [...new Set(state.tv.map(c => c.category))].filter(Boolean).sort();

  $("tvCountry").innerHTML =
    '<option value="">All countries</option>' +
    countries.map(x => `<option value="${safe(x)}">${safe(x)}</option>`).join("");

  $("tvCategory").innerHTML =
    '<option value="">All categories</option>' +
    categories.map(x => `<option value="${safe(x)}">${safe(x)}</option>`).join("");

  $("countryMenu").innerHTML = countries.slice(0,18).map(x =>
    `<button class="side-category" data-country="${safe(x)}">${safe(x)}</button>`
  ).join("");

  $("categoryMenu").innerHTML = CATEGORIES.map(([name,icon]) =>
    `<button class="side-category" data-category="${safe(name)}">${icon} ${safe(name)}</button>`
  ).join("");

  $("homeCategories").innerHTML = CATEGORIES.map(([name,icon]) =>
    `<button class="category-card" data-category="${safe(name)}">
      <span class="category-icon">${icon}</span><strong>${safe(name)}</strong>
    </button>`
  ).join("");
}

function cardHTML(channel) {
  const saved = isFavorite(channel.url);
  const logo = channel.logo
    ? `<img src="${safe(channel.logo)}" loading="lazy" alt="" onerror="this.style.display='none'">`
    : `<span class="channel-initial">${safe(channel.name.slice(0,2).toUpperCase())}</span>`;

  return `<article class="channel-card">
    <div class="channel-thumb">
      ${logo}
      <span class="country-tag">${safe(channel.country)}</span>
    </div>
    <div class="channel-info">
      <h3 title="${safe(channel.name)}">${safe(channel.name)}</h3>
      <p>${safe(channel.category)} · ${safe(channel.country)}</p>
    </div>
    <div class="channel-actions">
      <button class="watch-btn" data-watch="${safe(channel.url)}">▶ Watch</button>
      <button class="heart-btn ${saved ? "saved" : ""}" data-favorite="${safe(channel.url)}" aria-label="Favorite">${saved ? "♥" : "♡"}</button>
    </div>
  </article>`;
}

function renderCards(target, channels, emptyText) {
  const element = $(target);
  if (!channels.length) {
    element.innerHTML = `<div class="empty-state">${safe(emptyText)}</div>`;
    return;
  }
  element.innerHTML = channels.map(cardHTML).join("");
}

function renderTV() {
  const search = $("tvSearch").value.toLowerCase().trim();
  const country = $("tvCountry").value;
  const category = $("tvCategory").value;
  const sort = $("tvSort").value;

  let results = state.tv.filter(c =>
    (!search || `${c.name} ${c.country} ${c.category}`.toLowerCase().includes(search)) &&
    (!country || c.country === country) &&
    (!category || c.category === category)
  );

  results.sort((a,b) => sort === "country"
    ? a.country.localeCompare(b.country)
    : a.name.localeCompare(b.name)
  );

  $("tvResultCount").textContent = `${results.length.toLocaleString()} channels`;
  renderCards("tvGrid", results, "No channels found. Try another search or filter.");
}

function renderHome() {
  renderCards("featuredChannels", state.tv.slice(0,12), "TV channels are loading.");
  renderCards("homeRecent", getRecent(), "Your recently watched channels will appear here.");
  $("totalRadio").textContent = state.radios.length.toLocaleString();
}

function findTV(url) {
  return state.tv.find(c => c.url === url);
}

/* ---------------- PLAYER ---------------- */

function stopHLS() {
  if (state.currentHls) {
    state.currentHls.destroy();
    state.currentHls = null;
  }
}

function addRecent(channel) {
  state.recent = [
    channel,
    ...state.recent.filter(x => x.url !== channel.url)
  ].slice(0,20);
  saveLocal();
  renderHome();
}

function playTV(channel) {
  if (!channel) return;
  state.currentTV = channel;

  $("homePage").classList.add("hidden");
  $("tvPage").classList.add("hidden");
  $("radioPage").classList.add("hidden");
  $("favoritesPage").classList.add("hidden");
  $("recentPage").classList.add("hidden");
  $("playerPage").classList.remove("hidden");
  state.page = "playerPage";

  stopHLS();
  const video = $("tvVideo");
  video.pause();
  video.removeAttribute("src");
  video.load();

  $("videoPlaceholder").classList.add("hidden");
  $("tvNowPlaying").textContent = channel.name;
  $("tvDetails").textContent = `${channel.country} · ${channel.category}`;
  $("tvMessage").textContent = "Connecting to stream...";
  updatePlayerFavorite();
  addRecent(channel);
  renderMoreChannels();

  const url = channel.url;
  if (/\.m3u8($|\?)/i.test(url) && window.Hls && Hls.isSupported()) {
    state.currentHls = new Hls({
      enableWorker:true,
      lowLatencyMode:true,
      maxBufferLength:20
    });

    state.currentHls.loadSource(url);
    state.currentHls.attachMedia(video);

    state.currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().then(() => {
        $("tvMessage").textContent = "LIVE — Playing";
      }).catch(() => {
        $("tvMessage").textContent = "Kanda Play kuri video kugira ngo utangire.";
      });
    });

    state.currentHls.on(Hls.Events.ERROR, (event,data) => {
      if (data.fatal) {
        $("tvMessage").textContent = "Stream ntibonetse. Gerageza indi channel.";
        stopHLS();
      }
    });
  } else {
    video.src = url;
    video.play().then(() => {
      $("tvMessage").textContent = "LIVE — Playing";
    }).catch(() => {
      $("tvMessage").textContent = "Kanda Play cyangwa gerageza indi channel.";
    });
  }

  document.querySelectorAll(".top-link,.side-link").forEach(b => b.classList.remove("active"));
}

function renderMoreChannels() {
  const more = state.tv.filter(c => c.url !== state.currentTV?.url).slice(0,15);
  $("moreChannels").innerHTML = more.map(c => `
    <div class="mini-channel" data-mini="${safe(c.url)}">
      <div class="mini-logo">${c.logo ? `<img src="${safe(c.logo)}" alt="">` : safe(c.name.slice(0,2))}</div>
      <div><strong>${safe(c.name)}</strong><small>${safe(c.country)}</small></div>
    </div>
  `).join("");
}

function updatePlayerFavorite() {
  const saved = state.currentTV && isFavorite(state.currentTV.url);
  $("playerFavorite").classList.toggle("saved", !!saved);
  $("playerFavorite").textContent = saved ? "♥ Saved" : "♡ Save";
}

/* ---------------- FAVORITES & RECENT ---------------- */

function toggleFavorite(channel) {
  if (!channel) return;
  if (isFavorite(channel.url)) {
    state.favorites = state.favorites.filter(x => x.url !== channel.url);
    notify("Removed from favorites");
  } else {
    state.favorites.unshift(channel);
    notify("Added to favorites");
  }
  saveLocal();
  updatePlayerFavorite();
  renderTV();
  renderFavorites();
  renderHome();
}

function getRecent() {
  return state.recent.map(item => findTV(item.url) || item);
}

function renderFavorites() {
  renderCards("favoritesGrid", state.favorites, "You have not saved any channels yet.");
}

function renderRecent() {
  renderCards("recentGrid", getRecent(), "You have not watched any channels yet.");
}

/* ---------------- RADIO DIRECTORY ---------------- */

async function loadRadio() {
  $("radioResultCount").textContent = "Loading radio stations...";
  try {
    const [rw, world] = await Promise.all([
      fetch(`${RADIO_API}/stations/search?countrycode=RW&limit=250&hidebroken=true&order=clickcount&reverse=true`),
      fetch(`${RADIO_API}/stations?limit=500&hidebroken=true&order=clickcount&reverse=true`)
    ]);

    if (!rw.ok || !world.ok) throw new Error("Radio directory error");
    const data = [...await rw.json(), ...await world.json()];
    const unique = new Map();

    data.forEach(r => {
      const url = r.url_resolved || r.url;
      if (url && !unique.has(r.stationuuid)) {
        unique.set(r.stationuuid, {
          id:r.stationuuid,
          name:r.name || "Radio station",
          url,
          country:r.country || "Unknown",
          language:r.language || "Unknown",
          logo:r.favicon || ""
        });
      }
    });

    state.radios = [...unique.values()];
    $("totalRadio").textContent = state.radios.length.toLocaleString();
    fillRadioFilters();
    renderRadio();
  } catch (error) {
    console.error(error);
    $("radioResultCount").textContent = "Radio stations could not be loaded.";
    $("radioGrid").innerHTML = '<div class="empty-state">Check your internet connection and reload the page.</div>';
  }
}

function fillRadioFilters() {
  const countries = [...new Set(state.radios.map(r => r.country))].filter(x => x !== "Unknown").sort();
  const languages = [...new Set(state.radios.flatMap(r => r.language.split(",").map(x => x.trim())))].filter(Boolean).sort();

  $("radioCountry").innerHTML = '<option value="">All countries</option>' +
    countries.map(x => `<option value="${safe(x)}">${safe(x)}</option>`).join("");

  $("radioLanguage").innerHTML = '<option value="">All languages</option>' +
    languages.map(x => `<option value="${safe(x)}">${safe(x)}</option>`).join("");
}

function renderRadio() {
  const search = $("radioSearch").value.toLowerCase().trim();
  const country = $("radioCountry").value;
  const language = $("radioLanguage").value;

  const results = state.radios.filter(r =>
    (!search || `${r.name} ${r.country} ${r.language}`.toLowerCase().includes(search)) &&
    (!country || r.country === country) &&
    (!language || r.language.split(",").map(x => x.trim()).includes(language))
  );

  $("radioResultCount").textContent = `${results.length.toLocaleString()} radio stations`;

  $("radioGrid").innerHTML = results.slice(0,500).map(r => `
    <article class="channel-card">
      <div class="channel-thumb">
        ${r.logo ? `<img src="${safe(r.logo)}" loading="lazy" alt="" onerror="this.style.display='none'">` : '<span class="channel-initial">♫</span>'}
        <span class="country-tag">${safe(r.country)}</span>
      </div>
      <div class="channel-info">
        <h3>${safe(r.name)}</h3>
        <p>${safe(r.language)}</p>
      </div>
      <div class="channel-actions">
        <button class="watch-btn" data-radio="${safe(r.id)}">▶ Listen</button>
      </div>
    </article>
  `).join("");
}

function playRadio(radio) {
  if (!radio) return;
  const player = $("radioPlayer");
  player.pause();
  player.src = radio.url;
  $("radioNowPlaying").textContent = radio.name;
  $("radioDetails").textContent = `${radio.country} · ${radio.language}`;
  $("radioMessage").textContent = "Connecting to radio...";
  player.play().then(() => {
    $("radioMessage").textContent = "LIVE — Radio playing";
  }).catch(() => {
    $("radioMessage").textContent = "Radio ntikinnye. Gerageza indi station.";
  });
}

/* ---------------- NAVIGATION ---------------- */

function showPage(id) {
  document.querySelectorAll(".page-section").forEach(p => p.classList.add("hidden"));
  $(id).classList.remove("hidden");
  state.page = id;

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === id);
  });

  if (id === "favoritesPage") renderFavorites();
  if (id === "recentPage") renderRecent();
}

function setupEvents() {
  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]");
    if (pageButton) showPage(pageButton.dataset.page);

    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      const category = categoryButton.dataset.category;
      showPage("tvPage");
      $("tvCategory").value = category;
      $("tvSearch").value = "";
      renderTV();
    }

    const countryButton = event.target.closest("[data-country]");
    if (countryButton) {
      showPage("tvPage");
      $("tvCountry").value = countryButton.dataset.country;
      renderTV();
    }

    const watchButton = event.target.closest("[data-watch]");
    if (watchButton) playTV(findTV(watchButton.dataset.watch));

    const favButton = event.target.closest("[data-favorite]");
    if (favButton) toggleFavorite(findTV(favButton.dataset.favorite));

    const radioButton = event.target.closest("[data-radio]");
    if (radioButton) playRadio(state.radios.find(r => r.id === radioButton.dataset.radio));

    const miniButton = event.target.closest("[data-mini]");
    if (miniButton) playTV(findTV(miniButton.dataset.mini));
  });

  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  ["tvSearch","tvCountry","tvCategory","tvSort"].forEach(id => {
    $(id).addEventListener("input", renderTV);
    $(id).addEventListener("change", renderTV);
  });

  ["radioSearch","radioCountry","radioLanguage"].forEach(id => {
    $(id).addEventListener("input", renderRadio);
    $(id).addEventListener("change", renderRadio);
  });

  $("globalSearch").addEventListener("input", () => {
    showPage("tvPage");
    $("tvSearch").value = $("globalSearch").value;
    renderTV();
  });

  $("clearTVFilters").addEventListener("click", () => {
    $("tvSearch").value = "";
    $("tvCountry").value = "";
    $("tvCategory").value = "";
    renderTV();
  });

  $("playerFavorite").addEventListener("click", () => {
    toggleFavorite(state.currentTV);
  });

  $("backToChannels").addEventListener("click", () => showPage("tvPage"));

  $("homeLink").addEventListener("click", event => {
    event.preventDefault();
    showPage("homePage");
  });

  $("tvVideo").addEventListener("error", () => {
    $("tvMessage").textContent = "Video ntikinnye. Gerageza indi channel.";
  });

  $("radioPlayer").addEventListener("error", () => {
    $("radioMessage").textContent = "Radio stream ntikora ubu.";
  });
}

/* ---------------- START ---------------- */

async function init() {
  $("year").textContent = new Date().getFullYear();
  setupEvents();
  await Promise.all([loadTV(), loadRadio()]);
  renderFavorites();
  renderRecent();
}

document.addEventListener("DOMContentLoaded", init);
