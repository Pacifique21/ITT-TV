
"use strict";

/* =========================================
   ITT-TV LIVE
   TV: IPTV-Org public playlists
   Radio: Radio Browser public directory
========================================= */

const $ = (id) => document.getElementById(id);

const state = {
  tv: [],
  radios: [],
  selectedTV: null,
  selectedRadio: null,
  hls: null,
  toastTimer: null
};

const TV_PLAYLISTS = [
  ["Rwanda", "https://iptv-org.github.io/iptv/countries/rw.m3u"],
  ["Africa", "https://iptv-org.github.io/iptv/regions/afr.m3u"],
  ["Kenya", "https://iptv-org.github.io/iptv/countries/ke.m3u"],
  ["Uganda", "https://iptv-org.github.io/iptv/countries/ug.m3u"],
  ["Tanzania", "https://iptv-org.github.io/iptv/countries/tz.m3u"],
  ["Burundi", "https://iptv-org.github.io/iptv/countries/bi.m3u"],
  ["DR Congo", "https://iptv-org.github.io/iptv/countries/cd.m3u"],
  ["South Africa", "https://iptv-org.github.io/iptv/countries/za.m3u"],
  ["Nigeria", "https://iptv-org.github.io/iptv/countries/ng.m3u"],
  ["Ghana", "https://iptv-org.github.io/iptv/countries/gh.m3u"],
  ["United States", "https://iptv-org.github.io/iptv/countries/us.m3u"],
  ["United Kingdom", "https://iptv-org.github.io/iptv/countries/gb.m3u"],
  ["France", "https://iptv-org.github.io/iptv/countries/fr.m3u"],
  ["Germany", "https://iptv-org.github.io/iptv/countries/de.m3u"],
  ["India", "https://iptv-org.github.io/iptv/countries/in.m3u"],
  ["Japan", "https://iptv-org.github.io/iptv/countries/jp.m3u"],
  ["Canada", "https://iptv-org.github.io/iptv/countries/ca.m3u"],
  ["Australia", "https://iptv-org.github.io/iptv/countries/au.m3u"],
  ["Qatar", "https://iptv-org.github.io/iptv/countries/qa.m3u"]
];

const RADIO_API = "https://de1.api.radio-browser.info/json";

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function safeText(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function cleanCountry(value) {
  return String(value || "").trim() || "Unknown";
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function setStatus(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

/* =========================================
   TV PLAYLIST LOADER
========================================= */

function parseM3U(text, sourceCountry) {
  const lines = text.split(/\r?\n/);
  const channels = [];
  let info = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      info = line;
      continue;
    }

    if (line.startsWith("#")) continue;

    if (/^https?:\/\//i.test(line)) {
      const nameMatch = info.match(/,(.*)$/);
      const logoMatch = info.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = info.match(/group-title="([^"]*)"/i);
      const countryMatch = info.match(/tvg-country="([^"]*)"/i);

      const name = nameMatch
        ? nameMatch[1].trim()
        : "Unknown channel";

      channels.push({
        name,
        url: line,
        logo: logoMatch ? logoMatch[1] : "",
        category: groupMatch ? groupMatch[1] : "General",
        country: countryMatch ? countryMatch[1] : sourceCountry,
        type: "tv"
      });

      info = "";
    }
  }

  return channels;
}

async function loadOnePlaylist(source) {
  const [country, url] = source;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Playlist not available");
    const text = await response.text();
    return parseM3U(text, country);
  } catch (error) {
    console.warn("TV playlist failed:", country, error);
    return [];
  }
}

async function loadTVChannels() {
  setStatus("tvStatus", "Loading TV playlists...");

  const results = await Promise.all(
    TV_PLAYLISTS.map(source => loadOnePlaylist(source))
  );

  let all = results.flat();

  all = uniqueBy(all, channel => channel.url);

  // Put Rwanda channels first.
  all.sort((a, b) => {
    const aRwanda = /rwanda/i.test(a.country) ? 0 : 1;
    const bRwanda = /rwanda/i.test(b.country) ? 0 : 1;
    return aRwanda - bRwanda || a.name.localeCompare(b.name);
  });

  state.tv = all.slice(0, 1000);

  $("totalChannels").textContent = state.tv.length.toLocaleString();
  $("tvCount").textContent = state.tv.length.toLocaleString();

  fillTVFilters();
  renderTVList();

  setStatus(
    "tvStatus",
    state.tv.length
      ? `${state.tv.length} channels loaded`
      : "TV playlists ntizabonetse. Ongera ugerageze."
  );
}

function fillTVFilters() {
  const countrySelect = $("tvCountry");
  const categorySelect = $("tvCategory");

  const countries = [...new Set(state.tv.map(c => c.country))]
    .filter(Boolean)
    .sort();

  const categories = [...new Set(state.tv.map(c => c.category))]
    .filter(Boolean)
    .sort();

  countrySelect.innerHTML =
    '<option value="">All countries</option>' +
    countries.map(c => `<option value="${safeText(c)}">${safeText(c)}</option>`).join("");

  categorySelect.innerHTML =
    '<option value="">All categories</option>' +
    categories.map(c => `<option value="${safeText(c)}">${safeText(c)}</option>`).join("");
}

function renderTVList() {
  const list = $("tvList");
  const search = $("tvSearch").value.trim().toLowerCase();
  const country = $("tvCountry").value;
  const category = $("tvCategory").value;

  const filtered = state.tv.filter(channel => {
    const matchesSearch =
      channel.name.toLowerCase().includes(search) ||
      channel.country.toLowerCase().includes(search) ||
      channel.category.toLowerCase().includes(search);

    return matchesSearch &&
      (!country || channel.country === country) &&
      (!category || channel.category === category);
  });

  $("tvCount").textContent = filtered.length.toLocaleString();

  if (!filtered.length) {
    list.innerHTML = '<p class="empty-list">Nta channel ibonetse muri ubu bushakashatsi.</p>';
    return;
  }

  list.innerHTML = filtered.map((channel, index) => {
    const selected = state.selectedTV?.url === channel.url ? "selected" : "";
    const logo = channel.logo
      ? `<img src="${safeText(channel.logo)}" alt="" loading="lazy" onerror="this.remove()">`
      : safeText(channel.name.slice(0, 2).toUpperCase());

    return `
      <button class="station ${selected}" type="button" data-tv-index="${index}">
        <span class="station-logo">${logo}</span>
        <span class="station-info">
          <span class="station-name">${safeText(channel.name)}</span>
          <span class="station-meta">${safeText(channel.country)} · ${safeText(channel.category)}</span>
        </span>
        <span class="station-play">▶</span>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-tv-index]").forEach(button => {
    button.addEventListener("click", () => {
      const channel = filtered[Number(button.dataset.tvIndex)];
      playTV(channel);
    });
  });
}

/* =========================================
   TV PLAYER
========================================= */

function stopCurrentHLS() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function playTV(channel) {
  if (!channel) return;

  const video = $("tvVideo");
  const empty = $("tvEmpty");

  stopCurrentHLS();

  video.pause();
  video.removeAttribute("src");
  video.load();

  state.selectedTV = channel;
  empty.classList.add("hidden");

  $("tvNowPlaying").textContent = channel.name;
  $("tvDetails").textContent = `${channel.country} · ${channel.category}`;
  $("tvHomepage").hidden = true;

  setStatus("tvMessage", "Connecting to live TV stream...");
  renderTVList();

  const stream = channel.url;
  const isHLS = /\.m3u8($|\?)/i.test(stream);

  if (isHLS && window.Hls && Hls.isSupported()) {
    state.hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      maxBufferLength: 20,
      backBufferLength: 15
    });

    state.hls.loadSource(stream);
    state.hls.attachMedia(video);

    state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().then(() => {
        setStatus("tvMessage", "LIVE · Stream is playing");
      }).catch(() => {
        setStatus("tvMessage", "Kanda Play kuri video kugira ngo utangire.");
      });
    });

    state.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        setStatus("tvMessage", "Iyi stream yanze gukina. Gerageza indi channel.");
        stopCurrentHLS();
      }
    });

  } else {
    video.src = stream;
    video.play().then(() => {
      setStatus("tvMessage", "LIVE · Stream is playing");
    }).catch(() => {
      setStatus(
        "tvMessage",
        "Iyi stream ntishobora gukinira muri browser cyangwa isaba Play."
      );
    });
  }
}

/* =========================================
   RADIO BROWSER DIRECTORY
========================================= */

async function radioFetch(path) {
  const response = await fetch(`${RADIO_API}${path}`, {
    headers: { "Accept": "application/json" },
    cache: "no-store"
  });

  if (!response.ok) throw new Error("Radio directory unavailable");
  return response.json();
}

function normalizeRadio(station) {
  return {
    id: station.stationuuid,
    name: station.name || "Unknown radio",
    url: station.url_resolved || station.url,
    country: cleanCountry(station.country),
    countrycode: station.countrycode || "",
    language: station.language || "Unknown",
    favicon: station.favicon || "",
    homepage: station.homepage || "",
    codec: station.codec || "",
    bitrate: station.bitrate || 0
  };
}

async function loadRadios() {
  setStatus("radioStatus", "Loading radio stations...");

  try {
    const [rwanda, worldwide] = await Promise.all([
      radioFetch(
        "/stations/search?countrycode=RW&limit=300&hidebroken=true&order=clickcount&reverse=true"
      ),
      radioFetch(
        "/stations?limit=600&hidebroken=true&order=clickcount&reverse=true"
      )
    ]);

    const combined = [
      ...rwanda.map(normalizeRadio),
      ...worldwide.map(normalizeRadio)
    ];

    state.radios = uniqueBy(
      combined.filter(radio => radio.url && /^https?:\/\//i.test(radio.url)),
      radio => radio.id || radio.url
    ).slice(0, 800);

    $("totalRadios").textContent = state.radios.length.toLocaleString();
    $("radioCount").textContent = state.radios.length.toLocaleString();

    fillRadioFilters();
    renderRadioList();

    setStatus(
      "radioStatus",
      `${state.radios.length} radio stations loaded`
    );
  } catch (error) {
    console.error(error);
    setStatus("radioStatus", "Radio directory ntibonetse.");
    $("radioList").innerHTML =
      '<p class="empty-list">Ntibyashobotse kubona amaradiyo. Reba internet wongere ugerageze.</p>';
  }
}

function fillRadioFilters() {
  const countrySelect = $("radioCountry");
  const languageSelect = $("radioLanguage");

  const countries = [...new Set(state.radios.map(r => r.country))]
    .filter(c => c && c !== "Unknown")
    .sort();

  const languages = [...new Set(
    state.radios.flatMap(r => r.language.split(",").map(x => x.trim()))
  )].filter(Boolean).sort();

  countrySelect.innerHTML =
    '<option value="">All countries</option>' +
    countries.map(c => `<option value="${safeText(c)}">${safeText(c)}</option>`).join("");

  languageSelect.innerHTML =
    '<option value="">All languages</option>' +
    languages.map(l => `<option value="${safeText(l)}">${safeText(l)}</option>`).join("");
}

function renderRadioList() {
  const list = $("radioList");
  const search = $("radioSearch").value.trim().toLowerCase();
  const country = $("radioCountry").value;
  const language = $("radioLanguage").value;

  const filtered = state.radios.filter(radio => {
    const matchesSearch =
      radio.name.toLowerCase().includes(search) ||
      radio.country.toLowerCase().includes(search) ||
      radio.language.toLowerCase().includes(search);

    const matchesLanguage = !language ||
      radio.language.split(",").map(x => x.trim()).includes(language);

    return matchesSearch &&
      (!country || radio.country === country) &&
      matchesLanguage;
  });

  $("radioCount").textContent = filtered.length.toLocaleString();

  if (!filtered.length) {
    list.innerHTML = '<p class="empty-list">Nta radio ibonetse.</p>';
    return;
  }

  list.innerHTML = filtered.map((radio, index) => {
    const selected = state.selectedRadio?.id === radio.id ? "selected" : "";
    const logo = radio.favicon
      ? `<img src="${safeText(radio.favicon)}" alt="" loading="lazy" onerror="this.remove()">`
      : safeText(radio.name.slice(0, 2).toUpperCase());

    return `
      <button class="station ${selected}" type="button" data-radio-index="${index}">
        <span class="station-logo">${logo}</span>
        <span class="station-info">
          <span class="station-name">${safeText(radio.name)}</span>
          <span class="station-meta">${safeText(radio.country)} · ${safeText(radio.language)}</span>
        </span>
        <span class="station-play">▶</span>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-radio-index]").forEach(button => {
    button.addEventListener("click", () => {
      const radio = filtered[Number(button.dataset.radioIndex)];
      playRadio(radio);
    });
  });
}

async function countRadioClick(stationUUID) {
  if (!stationUUID) return;
  try {
    await fetch(`${RADIO_API}/url/${encodeURIComponent(stationUUID)}`);
  } catch (error) {
    console.warn("Could not count radio click", error);
  }
}

function playRadio(radio) {
  if (!radio) return;

  const player = $("radioPlayer");
  player.pause();
  player.removeAttribute("src");
  player.load();

  state.selectedRadio = radio;

  $("radioNowPlaying").textContent = radio.name;
  $("radioDetails").textContent =
    `${radio.country} · ${radio.language} · ${radio.codec || "Audio"}`;

  setStatus("radioMessage", "Connecting to radio stream...");
  renderRadioList();

  player.src = radio.url;
  player.play().then(() => {
    setStatus("radioMessage", "LIVE · Radio is playing");
    countRadioClick(radio.id);
  }).catch(() => {
    setStatus(
      "radioMessage",
      "Radio ntiyatangira. Gerageza indi station cyangwa kanda Play."
    );
  });
}

$("radioPlayer").addEventListener("error", () => {
  setStatus("radioMessage", "Iyi radio stream ntikora ubu. Gerageza indi.");
});

/* =========================================
   NAVIGATION AND FILTERS
========================================= */

function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.section;

      document.querySelectorAll(".content-section").forEach(section => {
        section.classList.add("hidden");
      });

      $(target).classList.remove("hidden");

      document.querySelectorAll(".nav-btn").forEach(nav => {
        nav.classList.toggle("active", nav === button);
      });
    });
  });
}

function setupFilters() {
  ["tvSearch", "tvCountry", "tvCategory"].forEach(id => {
    $(id).addEventListener("input", renderTVList);
    $(id).addEventListener("change", renderTVList);
  });

  ["radioSearch", "radioCountry", "radioLanguage"].forEach(id => {
    $(id).addEventListener("input", renderRadioList);
    $(id).addEventListener("change", renderRadioList);
  });
}

/* =========================================
   START APP
========================================= */

function startApp() {
  $("year").textContent = new Date().getFullYear();

  setupNavigation();
  setupFilters();

  loadTVChannels();
  loadRadios();

  // Reload lists when the user returns to the page.
  window.addEventListener("online", () => {
    showToast("Internet yongeye kuboneka.");
    loadTVChannels();
    loadRadios();
  });
}

document.addEventListener("DOMContentLoaded", startApp);
