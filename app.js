"use strict";

/* =====================================================
   ITT NEWS - COMPLETE APP
   Sections: HOME / NEWS / LIVE TV / LIVE RADIO / MOVIES
===================================================== */

const $ = id => document.getElementById(id);

const state = {
  news: [],
  newsPage: 1,
  newsFiltered: [],
  radio: [],
  radioOffset: 0,
  radioCountry: "Rwanda",
  tv: [],
  movies: [],
  movieOffset: 0,
  movieQuery: "",
  movieRegion: "all",
  tvHls: null,
  movieHls: null
};

const CONFIG = {
  radioApi: "https://de1.api.radio-browser.info",
  rssProxy: "https://api.rss2json.com/v1/api.json?rss_url=",
  newsFeeds: [
    {
      name: "RBA Rwanda",
      region: "rwanda",
      url: "https://www.rba.co.rw/rss.php"
    },
    {
      name: "The New Times",
      region: "rwanda",
      url: "https://www.newtimes.co.rw/rss"
    },
    {
      name: "BBC World",
      region: "world",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml"
    },
    {
      name: "Al Jazeera",
      region: "world",
      url: "https://www.aljazeera.com/xml/rss/all.xml"
    },
    {
      name: "DW English",
      region: "world",
      url: "https://rss.dw.com/rdf/rss-en-all"
    }
  ]
};

const TV_CHANNELS = [
  {
    name: "Rwanda TV / RTV",
    country: "Rwanda",
    kind: "page",
    url: "https://www.rba.co.rw/tv",
    description: "Rwanda Broadcasting Agency official television page."
  },
  {
    name: "ZACU TV",
    country: "Rwanda",
    kind: "page",
    url: "https://www.canalplus.com/rw/chaines/zacu-tv",
    description: "ZACU TV official provider page. Subscription may be required."
  },
  {
    name: "RADIOTV10",
    country: "Rwanda",
    kind: "page",
    url: "https://radiotv10.rw/",
    description: "RADIOTV10 official website."
  },
  {
    name: "Al Jazeera English Live",
    country: "International",
    kind: "page",
    url: "https://www.aljazeera.com/video/live",
    description: "Al Jazeera official live broadcast."
  },
  {
    name: "France 24",
    country: "International",
    kind: "page",
    url: "https://www.france24.com/en/live",
    description: "France 24 official live news page."
  },
  {
    name: "DW News",
    country: "International",
    kind: "page",
    url: "https://www.dw.com/en/live-tv/s-100825",
    description: "Deutsche Welle official live TV page."
  },
  {
    name: "NASA TV",
    country: "International",
    kind: "page",
    url: "https://www.nasa.gov/nasatv/",
    description: "NASA official live video page."
  }
];

const MOVIE_SOURCES = [
  {
    name: "Amashusho – Rwanda Films & Series",
    region: "rwanda",
    description: "Rwandan creator video platform. Availability and access depend on each creator.",
    url: "https://amashusho.com/"
  },
  {
    name: "ZACU Entertainment",
    region: "rwanda",
    description: "Rwandan entertainment provider official website.",
    url: "https://www.zacuentertainment.com/"
  },
  {
    name: "RBA Videos",
    region: "rwanda",
    description: "Official Rwanda Broadcasting Agency programmes and videos.",
    url: "https://www.rba.co.rw/tv"
  },
  {
    name: "Library of Congress – National Screening Room",
    region: "archive",
    description: "Historic films. Check the rights and viewing conditions for each film.",
    url: "https://www.loc.gov/collections/national-screening-room/"
  },
  {
    name: "Internet Archive – Feature Films",
    region: "archive",
    description: "Film archive. Check the rights information on each title before reuse.",
    url: "https://archive.org/details/feature_films"
  }
];


/* -------------------------
   SMALL UTILITIES
------------------------- */

function text(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function setStatus(id, message) {
  const el = $(id);
  if (el) el.textContent = message;
}

function dateText(value) {
  if (!value) return "Date unknown";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) :
    d.toLocaleString();
}

async function fetchJson(url, timeoutMs = 16000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}


/* -------------------------
   NAVIGATION
------------------------- */

const validPages = ["home", "news", "tv", "radio", "movies"];

function openPage(page) {
  if (!validPages.includes(page)) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("mainNav").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (page === "news" && !state.news.length) loadNews();
  if (page === "tv") renderTV();
  if (page === "radio" && !state.radio.length) searchRadio(true);
  if (page === "movies" && !state.movies.length) renderMovies();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    openPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.go));
});

$("menuBtn").addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

$("year").textContent = new Date().getFullYear();


/* =====================================================
   NEWS
   RSS is fetched through RSS2JSON.
   The website displays feed summaries and source links.
===================================================== */

async function loadOneFeed(feed) {
  const url = CONFIG.rssProxy + encodeURIComponent(feed.url);
  const data = await fetchJson(url);

  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error("Feed not available: " + feed.name);
  }

  return data.items.map(item => ({
    title: item.title || "News",
    description: item.description || item.content || "",
    link: item.link || feed.url,
    image: item.thumbnail || item.enclosure?.link || "",
    date: item.pubDate || "",
    source: feed.name,
    region: feed.region
  }));
}

async function loadNews() {
  setStatus("newsStatus", "Turimo kuzana amakuru mashya...");

  const results = await Promise.allSettled(
    CONFIG.newsFeeds.map(loadOneFeed)
  );

  state.news = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value)
    .filter(item => validUrl(item.link));

  const unique = new Map();
  state.news.forEach(item => {
    const key = item.link;
    if (!unique.has(key)) unique.set(key, item);
  });

  state.news = [...unique.values()].sort((a, b) =>
    new Date(b.date || 0) - new Date(a.date || 0)
  );

  if (!state.news.length) {
    setStatus(
      "newsStatus",
      "Amakuru ntiyabonetse ubu. RSS provider ishobora kuba iri guhura n'ikibazo. Gerageza Refresh nyuma."
    );
  } else {
    setStatus(
      "newsStatus",
      `${state.news.length} news items loaded. Feed summaries are displayed inside ITT NEWS.`
    );
  }

  state.newsPage = 1;
  applyNewsFilter();
}

function applyNewsFilter() {
  const search = $("newsSearch").value.trim().toLowerCase();
  const region = $("newsRegion").value;

  state.newsFiltered = state.news.filter(item => {
    const matchesRegion = region === "all" || item.region === region;
    const matchesText =
      !search ||
      item.title.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.source.toLowerCase().includes(search);

    return matchesRegion && matchesText;
  });

  renderNews();
}

function renderNews() {
  const amount = state.newsPage * 12;
  const items = state.newsFiltered.slice(0, amount);

  if (!items.length) {
    $("newsList").innerHTML =
      '<p class="status">Nta nkuru ihuye n\'ibyo washakishije.</p>';
    $("moreNews").hidden = true;
    return;
  }

  $("newsList").innerHTML = items.map((item, index) => `
    <article class="item-card">
      <div class="meta">${text(item.source)} • ${text(item.region.toUpperCase())}</div>
      <h3>${text(item.title)}</h3>
      <p>${text(stripHtml(item.description)).slice(0, 230)}...</p>
      <p class="muted">${text(dateText(item.date))}</p>
      <div class="card-actions">
        <button class="btn red" data-read-news="${index}">SOMA HANO</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-read-news]").forEach(button => {
    button.addEventListener("click", () => {
      const item = items[Number(button.dataset.readNews)];
      openNewsReader(item);
    });
  });

  $("moreNews").hidden = amount >= state.newsFiltered.length;
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = String(html || "");
  return div.textContent || div.innerText || "";
}

function openNewsReader(item) {
  $("newsReader").hidden = false;
  $("readerTitle").textContent = item.title;
  $("readerMeta").textContent =
    `${item.source} • ${dateText(item.date)}`;
  $("readerBody").textContent =
    stripHtml(item.description) ||
    "Iyi feed ntiyatanze umwirondoro w'inkuru. Fungura official source kugira ngo usome inkuru yuzuye.";
  $("readerSource").href = item.link;
  $("newsReader").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("closeReader").addEventListener("click", () => {
  $("newsReader").hidden = true;
});

$("refreshNews").addEventListener("click", loadNews);
$("newsSearch").addEventListener("input", applyNewsFilter);
$("newsRegion").addEventListener("change", applyNewsFilter);

$("moreNews").addEventListener("click", () => {
  state.newsPage += 1;
  renderNews();
});


/* =====================================================
   PLAYER ENGINE: VIDEO / HLS / YOUTUBE
===================================================== */

function youtubeEmbed(url) {
  try {
    const parsed = new URL(url);
    let id = "";

    if (parsed.hostname === "youtu.be") {
      id = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v") || "";
      if (parsed.pathname.startsWith("/live/")) id = parsed.pathname.split("/")[2];
      if (parsed.pathname.startsWith("/embed/")) id = parsed.pathname.split("/")[2];
    }

    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
  } catch {
    return "";
  }
}

function stopVideo(videoId, frameId, hlsKey) {
  const video = $(videoId);
  const frame = $(frameId);

  if (state[hlsKey]) {
    state[hlsKey].destroy();
    state[hlsKey] = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();
  video.style.display = "none";

  frame.src = "about:blank";
  frame.style.display = "none";
}

function playMedia(url, options) {
  const {
    videoId, frameId, hlsKey, statusId
  } = options;

  const video = $(videoId);
  const frame = $(frameId);

  if (!validUrl(url)) {
    setStatus(statusId, "URL ntabwo yemewe.");
    return;
  }

  stopVideo(videoId, frameId, hlsKey);

  const yt = youtubeEmbed(url);

  if (yt) {
    frame.src = yt;
    frame.style.display = "block";
    setStatus(statusId, "YouTube player yafunguwe. Nyirayo ashobora kuba yarabujije embedding.");
    return;
  }

  if (/\.m3u8($|\?)/i.test(url)) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.style.display = "block";
      video.play().catch(() => {
        setStatus(statusId, "Kanda Play kuri video player.");
      });
      return;
    }

    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });

      state[hlsKey] = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      video.style.display = "block";

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          setStatus(statusId, "Stream yabonetse. Kanda Play.");
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setStatus(statusId, "Stream ntiyashoboye gukina. Ishobora kuba itari gukora cyangwa ibuza access.");
          hls.destroy();
          state[hlsKey] = null;
        }
      });
      return;
    }

    setStatus(statusId, "Browser yawe ntishyigikira HLS stream.");
    return;
  }

  if (/\.(mp4|webm|ogg|mp3|aac)($|\?)/i.test(url)) {
    video.src = url;
    video.style.display = "block";
    video.play().catch(() => {
      setStatus(statusId, "Kanda Play. Niba itakinnye, stream ishobora kuba itaboneka.");
    });
    return;
  }

  // Other links may be embeddable, but provider policy can block iframe.
  frame.src = url;
  frame.style.display = "block";
  setStatus(statusId, "Turagerageza gufungura player. Provider ashobora kubuza iframe.");
}


/* =====================================================
   LIVE TV
===================================================== */

state.tv = [...TV_CHANNELS];

function renderTV() {
  const query = $("tvSearch").value.trim().toLowerCase();
  const region = $("tvRegion").value;

  const list = state.tv.filter(channel => {
    const regionOK = region === "all" || channel.country === region;
    const queryOK = !query ||
      channel.name.toLowerCase().includes(query) ||
      channel.country.toLowerCase().includes(query);

    return regionOK && queryOK;
  });

  $("tvList").innerHTML = list.map(channel => {
    const index = state.tv.indexOf(channel);
    return `
      <article class="item-card">
        <div class="meta">${text(channel.country)} • OFFICIAL SOURCE</div>
        <h3>${text(channel.name)}</h3>
        <p>${text(channel.description)}</p>
        <div class="card-actions">
          <button class="btn blue" data-tv-play="${index}">PLAY / OPEN</button>
        </div>
      </article>`;
  }).join("") || '<p class="status">Nta TV ibonetse.</p>';

  document.querySelectorAll("[data-tv-play]").forEach(button => {
    button.addEventListener("click", () => {
      selectTV(state.tv[Number(button.dataset.tvPlay)]);
    });
  });
}

function selectTV(channel) {
  stopVideo("tvPlayer", "tvFrame", "tvHls");
  $("tvNow").textContent = channel.name;
  $("tvOfficialLink").href = channel.url;
  $("tvOfficialLink").hidden = false;

  if (channel.stream) {
    playMedia(channel.stream, {
      videoId: "tvPlayer",
      frameId: "tvFrame",
      hlsKey: "tvHls",
      statusId: "tvStatus"
    });
    return;
  }

  // Official page is attempted inside the player first.
  // If the provider blocks embedding, use the official link button.
  $("tvFrame").src = channel.url;
  $("tvFrame").style.display = "block";
  setStatus("tvStatus", "Turagerageza gufungura official live page muri player. Niba itagaragaye, kanda OFFICIAL WEBSITE.");
}

$("tvSearch").addEventListener("input", renderTV);
$("tvRegion").addEventListener("change", renderTV);

$("stopTV").addEventListener("click", () => {
  stopVideo("tvPlayer", "tvFrame", "tvHls");
  setStatus("tvStatus", "STOPPED");
});

$("addTV").addEventListener("click", () => {
  const name = $("tvCustomName").value.trim() || "My TV Stream";
  const url = $("tvCustomUrl").value.trim();

  if (!validUrl(url)) {
    setStatus("tvStatus", "Shyiramo URL itangira na https:// cyangwa http://");
    return;
  }

  const channel = {
    name,
    country: "Custom",
    kind: "stream",
    stream: url,
    url,
    description: "User added stream"
  };

  state.tv.unshift(channel);
  renderTV();
  selectTV(channel);
  $("tvCustomName").value = "";
  $("tvCustomUrl").value = "";
});


/* =====================================================
   LIVE RADIO - RADIO BROWSER
===================================================== */

async function searchRadio(reset = true) {
  const country = $("radioCountry").value;
  const query = $("radioSearch").value.trim();

  if (reset) {
    state.radio = [];
    state.radioOffset = 0;
  }

  setStatus("radioStatusList", "Turimo gushakisha radio...");

  const params = new URLSearchParams({
    limit: "36",
    offset: String(state.radioOffset),
    hidebroken: "true",
    order: "votes",
    reverse: "true"
  });

  if (country) params.set("country", country);
  if (query) params.set("name", query);

  const url = `${CONFIG.radioApi}/json/stations/search?${params.toString()}`;

  try {
    const stations = await fetchJson(url);

    const usable = stations.filter(station =>
      station.url_resolved || station.url
    );

    state.radio = reset ? usable : state.radio.concat(usable);
    state.radioOffset += usable.length;

    renderRadio();

    setStatus(
      "radioStatusList",
      `${state.radio.length} radio stations found. Hitamo imwe uyumve.`
    );
  } catch (error) {
    setStatus(
      "radioStatusList",
      "Radio directory ntisubije ubu. Reba internet wongere ugerageze."
    );
    $("radioList").innerHTML = "";
  }
}

function renderRadio() {
  if (!state.radio.length) {
    $("radioList").innerHTML =
      '<p class="status">Nta radio ibonetse. Gerageza guhindura igihugu cyangwa izina.</p>';
    $("moreRadio").hidden = true;
    return;
  }

  $("radioList").innerHTML = state.radio.map((station, index) => `
    <article class="item-card">
      <div class="meta">${text(station.country || "International")}</div>
      <h3>${text(station.name || "Radio Station")}</h3>
      <p>${text(station.tags || station.language || "Live broadcast")}</p>
      <p>${text(station.codec || "Audio")} ${station.bitrate ? " • " + text(station.bitrate) + " kbps" : ""}</p>
      <div class="card-actions">
        <button class="btn green" data-radio-play="${index}">▶ UMVA LIVE</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-radio-play]").forEach(button => {
    button.addEventListener("click", () => {
      playRadio(state.radio[Number(button.dataset.radioPlay)]);
    });
  });

  $("moreRadio").hidden = state.radio.length < 36;
}

async function playRadio(station) {
  if (!station) return;

  const stream = station.url_resolved || station.url;
  if (!validUrl(stream)) {
    setStatus("radioStatus", "Stream URL ntabwo yemewe.");
    return;
  }

  const player = $("radioPlayer");
  player.pause();
  player.src = stream;
  player.load();

  $("radioNow").textContent = station.name || "Live Radio";
  $("radioDetails").textContent =
    `${station.country || ""} • ${station.language || ""} • ${station.codec || ""}`;
  setStatus("radioStatus", "CONNECTING...");

  // Count a station click as requested by Radio Browser API.
  if (station.stationuuid) {
    fetch(`${CONFIG.radioApi}/json/url/${encodeURIComponent(station.stationuuid)}`)
      .catch(() => {});
  }

  try {
    await player.play();
    setStatus("radioStatus", "PLAYING LIVE");
  } catch {
    setStatus(
      "radioStatus",
      "Stream yatoranyijwe. Kanda Play kuri audio player. Niba itakinnye, station ishobora kuba offline cyangwa itemerera browser."
    );
  }
}

$("searchRadio").addEventListener("click", () => searchRadio(true));
$("radioCountry").addEventListener("change", () => searchRadio(true));

$("radioSearch").addEventListener("keydown", event => {
  if (event.key === "Enter") searchRadio(true);
});

$("moreRadio").addEventListener("click", () => searchRadio(false));

document.querySelectorAll(".radio-preset").forEach(button => {
  button.addEventListener("click", () => {
    $("radioCountry").value = button.dataset.country;
    searchRadio(true);
  });
});

$("stopRadio").addEventListener("click", () => {
  $("radioPlayer").pause();
  $("radioPlayer").removeAttribute("src");
  $("radioPlayer").load();
  setStatus("radioStatus", "STOPPED");
  $("radioNow").textContent = "Hitamo radio";
});


/* =====================================================
   MOVIES
   Rwanda sources + archive catalogue + authorised links.
===================================================== */

function renderMovies() {
  const query = $("movieSearch").value.trim().toLowerCase();
  const region = $("movieRegion").value;

  const list = MOVIE_SOURCES.filter(movie => {
    const regionOK = region === "all" || movie.region === region;
    const queryOK = !query ||
      movie.name.toLowerCase().includes(query) ||
      movie.description.toLowerCase().includes(query);

    return regionOK && queryOK;
  });

  $("movieList").innerHTML = list.map(movie => `
    <article class="item-card">
      <div class="meta">${text(movie.region.toUpperCase())} • OFFICIAL SOURCE</div>
      <h3>${text(movie.name)}</h3>
      <p>${text(movie.description)}</p>
      <div class="card-actions">
        <a class="btn pink" href="${text(movie.url)}" target="_blank" rel="noopener">OPEN SOURCE ↗</a>
      </div>
    </article>
  `).join("");

  if (region === "all" || region === "archive") {
    loadArchiveMovies(query);
  }
}

async function loadArchiveMovies(query = "") {
  setStatus("movieStatusList", "Turimo gushaka films zo mu bubiko...");

  const terms = query
    ? `collection:prelinger AND title:(${encodeURIComponent(query)})`
    : "collection:prelinger";

  const url =
    "https://archive.org/advancedsearch.php?q=" +
    encodeURIComponent(terms) +
    "&fl[]=identifier&fl[]=title&fl[]=year&fl[]=description&rows=18&page=1&output=json";

  try {
    const data = await fetchJson(url);
    const docs = data.response?.docs || [];

    if (!docs.length) {
      setStatus("movieStatusList", "Nta film ibonetse muri archive kuri ubu.");
      return;
    }

    const archiveCards = docs.map(movie => `
      <article class="item-card">
        <div class="meta">ARCHIVE COLLECTION • ${text(movie.year || "Year unknown")}</div>
        <h3>${text(movie.title || movie.identifier)}</h3>
        <p>${text(stripHtml(movie.description || "Archive film item. Check its licence and access conditions." )).slice(0,180)}</p>
        <div class="card-actions">
          <button class="btn pink" data-archive-play="${text(movie.identifier)}" data-archive-title="${text(movie.title || movie.identifier)}">
            OPEN PLAYER
          </button>
          <a class="card-link" href="https://archive.org/details/${encodeURIComponent(movie.identifier)}" target="_blank" rel="noopener">View rights & details ↗</a>
        </div>
      </article>
    `).join("");

    $("movieList").insertAdjacentHTML("beforeend", archiveCards);

    document.querySelectorAll("[data-archive-play]").forEach(button => {
      button.addEventListener("click", () => {
        const identifier = button.dataset.archivePlay;
        const title = button.dataset.archiveTitle;
        playArchiveMovie(identifier, title);
      });
    });

    setStatus(
      "movieStatusList",
      "Archive films loaded. Reba rights/licence kuri buri film mbere yo kuyongera kuri website yawe."
    );
  } catch {
    setStatus(
      "movieStatusList",
      "Movie archive ntisubije ubu. Reba official sources ziri hejuru."
    );
  }
}

function playArchiveMovie(identifier, title) {
  if (!identifier) return;

  stopVideo("moviePlayer", "movieFrame", "movieHls");

  $("movieNow").textContent = title;
  $("movieOfficialLink").href =
    `https://archive.org/details/${encodeURIComponent(identifier)}`;
  $("movieOfficialLink").hidden = false;

  // Internet Archive's own item player, not a copied movie file.
  $("movieFrame").src =
    `https://archive.org/embed/${encodeURIComponent(identifier)}`;
  $("movieFrame").style.display = "block";

  setStatus(
    "movieStatus",
    "Archive player yafunguwe. Access n'uburenganzira bigenwa n'iyo film."
  );
}

$("movieSearch").addEventListener("input", () => {
  renderMovies();
});

$("movieRegion").addEventListener("change", renderMovies);
$("searchMovies").addEventListener("click", renderMovies);

$("stopMovie").addEventListener("click", () => {
  stopVideo("moviePlayer", "movieFrame", "movieHls");
  setStatus("movieStatus", "STOPPED");
});

$("addMovie").addEventListener("click", () => {
  const name = $("movieCustomName").value.trim() || "My Movie";
  const url = $("movieCustomUrl").value.trim();

  if (!validUrl(url)) {
    setStatus("movieStatus", "Shyiramo URL yemewe.");
    return;
  }

  $("movieNow").textContent = name;
  $("movieOfficialLink").href = url;
  $("movieOfficialLink").hidden = false;

  playMedia(url, {
    videoId: "moviePlayer",
    frameId: "movieFrame",
    hlsKey: "movieHls",
    statusId: "movieStatus"
  });

  $("movieCustomName").value = "";
  $("movieCustomUrl").value = "";
});


/* =====================================================
   ERROR HANDLING & STARTUP
===================================================== */

window.addEventListener("online", () => {
  setStatus("newsStatus", "Internet connection restored. Refresh news if needed.");
});

window.addEventListener("offline", () => {
  setStatus("newsStatus", "Internet ntihari. Live services ntizikora offline.");
});

$("tvPlayer").addEventListener("error", () => {
  setStatus("tvStatus", "TV stream ntiyakinye. Reba official link cyangwa gerageza indi stream.");
});

$("moviePlayer").addEventListener("error", () => {
  setStatus("movieStatus", "Movie stream ntiyakinye. Reba link cyangwa uburenganzira bwo kuyireba.");
});

$("radioPlayer").addEventListener("error", () => {
  setStatus("radioStatus", "Radio stream ntiyakinye. Gerageza indi station.");
});

// Initial screen
renderTV();
renderMovies();
loadNews();
