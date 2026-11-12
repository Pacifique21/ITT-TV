
"use strict";

/* =========================================
   ITT NEWS - COMPLETE APPLICATION
   HTML IDs are matched with index.html
========================================= */

const $ = (id) => document.getElementById(id);

/* =========================================
   1. DATE AND NAVIGATION
========================================= */

$("year").textContent = new Date().getFullYear();

function updateClock() {
  $("currentTime").textContent =
    new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).format(new Date());
}

updateClock();
setInterval(updateClock, 30000);

$("menuToggle").addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

document.querySelectorAll("#mainNav a").forEach((link) => {
  link.addEventListener("click", () => {
    $("mainNav").classList.remove("open");
  });
});

/* =========================================
   2. NEWS AND SPORTS
========================================= */

const NEWS_FEEDS = [
  {
    name: "RBA",
    category: "rwanda",
    url: "https://www.rba.co.rw/"
  },
  {
    name: "Radio 10",
    category: "rwanda",
    url: "https://radiotv10.rw/"
  },
  {
    name: "BBC Africa",
    category: "world",
    url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml"
  },
  {
    name: "Al Jazeera",
    category: "world",
    url: "https://www.aljazeera.com/xml/rss/all.xml"
  }
];

const SPORTS_FEEDS = [
  {
    name: "BBC Sport",
    url: "https://feeds.bbci.co.uk/sport/rss.xml"
  },
  {
    name: "ESPN",
    url: "https://www.espn.com/espn/rss/news"
  }
];

let allNews = [];
let visibleNews = [];
let currentNewsFilter = "all";
let newsPage = 1;
const NEWS_PER_PAGE = 9;

function cleanText(value = "") {
  const element = document.createElement("div");
  element.innerHTML = value;
  return (element.textContent || element.innerText || "").trim();
}

function safeImage(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch (error) {
    return "";
  }
  return "";
}

function getNewsImage(item) {
  if (item.enclosure && item.enclosure.link) {
    return safeImage(item.enclosure.link);
  }

  if (item.thumbnail) {
    return safeImage(item.thumbnail);
  }

  if (item.image) {
    return safeImage(item.image);
  }

  const html = item.description || item.content || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);

  return match ? safeImage(match[1]) : "";
}

async function fetchRSS(feedUrl) {
  const endpoint =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(feedUrl);

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error("RSS request failed");
  }

  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error("RSS feed unavailable");
  }

  return data.items || [];
}

function normalizeNews(item, source, category) {
  return {
    title: cleanText(item.title || "Untitled story"),
    description: cleanText(item.description || item.content || "")
      .slice(0, 230),
    link: safeImage(item.link) || item.link || "#",
    image: getNewsImage(item),
    date: item.pubDate || "",
    source,
    category
  };
}

function renderNews() {
  const grid = $("newsGrid");
  grid.innerHTML = "";

  const start = 0;
  const end = newsPage * NEWS_PER_PAGE;
  const items = visibleNews.slice(start, end);

  if (!items.length) {
    grid.innerHTML =
      '<p class="status-message">No news available right now.</p>';
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "news-card";

    const imagePart = item.image
      ? `<img class="news-image" src="${item.image}" alt="" loading="lazy">`
      : '<div class="news-image-placeholder">📰</div>';

    const date = item.date
      ? new Date(item.date).toLocaleDateString()
      : "Latest";

    article.innerHTML = `
      ${imagePart}
      <div class="news-body">
        <span class="news-category">${item.category}</span>
        <h3></h3>
        <p></p>
        <div class="news-meta">${item.source} • ${date}</div>
        <a class="read-link" target="_blank" rel="noopener">Read full story ↗</a>
      </div>
    `;

    article.querySelector("h3").textContent = item.title;
    article.querySelector(".news-body p").textContent =
      item.description;

    const link = article.querySelector(".read-link");
    link.href = item.link;

    grid.appendChild(article);
  });

  $("loadMoreNews").hidden = items.length >= visibleNews.length;
}

function applyNewsFilter(filter) {
  currentNewsFilter = filter;

  visibleNews = filter === "all"
    ? allNews
    : allNews.filter((item) => item.category === filter);

  newsPage = 1;
  renderNews();
}

async function loadNews() {
  $("newsStatus").textContent = "Loading latest news...";

  const tasks = NEWS_FEEDS.map(async (feed) => {
    try {
      const items = await fetchRSS(feed.url);

      return items.map((item) =>
        normalizeNews(item, feed.name, feed.category)
      );
    } catch (error) {
      console.warn("News feed unavailable:", feed.name, error);
      return [];
    }
  });

  const results = await Promise.all(tasks);

  allNews = results.flat();

  const seen = new Set();
  allNews = allNews.filter((item) => {
    const key = item.link || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  allNews.sort((a, b) => {
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  applyNewsFilter(currentNewsFilter);

  $("newsStatus").textContent = allNews.length
    ? `${allNews.length} news stories loaded.`
    : "News feeds are temporarily unavailable. Try refreshing later.";
}

document.querySelectorAll("[data-news-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-news-filter]").forEach((b) => {
      b.classList.remove("active");
    });

    button.classList.add("active");
    applyNewsFilter(button.dataset.newsFilter);
  });
});

$("refreshNews").addEventListener("click", loadNews);

$("loadMoreNews").addEventListener("click", () => {
  newsPage++;
  renderNews();
});

async function loadSports() {
  $("sportsStatus").textContent = "Loading sports news...";
  const grid = $("sportsGrid");
  grid.innerHTML = "";

  const results = await Promise.all(
    SPORTS_FEEDS.map(async (feed) => {
      try {
        const items = await fetchRSS(feed.url);
        return items.map((item) =>
          normalizeNews(item, feed.name, "sports")
        );
      } catch (error) {
        console.warn("Sports feed unavailable:", feed.name);
        return [];
      }
    })
  );

  const sports = results.flat().slice(0, 12);

  if (!sports.length) {
    $("sportsStatus").textContent =
      "Sports news is temporarily unavailable.";
    return;
  }

  $("sportsStatus").textContent =
    `${sports.length} sports stories available.`;

  sports.forEach((item) => {
    const card = document.createElement("article");
    card.className = "news-card";

    card.innerHTML = `
      <div class="news-image-placeholder">⚽</div>
      <div class="news-body">
        <span class="news-category">SPORTS</span>
        <h3></h3>
        <p></p>
        <div class="news-meta"></div>
        <a class="read-link" target="_blank" rel="noopener">Read story ↗</a>
      </div>
    `;

    card.querySelector("h3").textContent = item.title;
    card.querySelector("p").textContent = item.description;
    card.querySelector(".news-meta").textContent = item.source;
    card.querySelector("a").href = item.link;

    grid.appendChild(card);
  });
}

$("refreshSports").addEventListener("click", loadSports);

/* =========================================
   3. LIVE TV
========================================= */

/*
  NOTE:
  - stream must be a direct, authorized stream URL.
  - embedUrl must be an official page that permits embedding.
  - A normal website URL is not automatically a video stream.
*/

const TV_CHANNELS = [
  {
    name: "Rwanda Television (RTV)",
    country: "Rwanda",
    type: "HLS",
    url: "https://www.rba.co.rw/tv",
    stream:
      "https://5c46fa289c89f.streamlock.net/rtv25/rtv/playlist.m3u8"
  },
  {
    name: "ISIBO TV",
    country: "Rwanda",
    type: "Official Live Page",
    url: "https://isibomedia.com/listen/tv",
    embedUrl: "https://isibomedia.com/listen/tv"
  },
  {
    name: "BTN TV",
    country: "Rwanda",
    type: "Official Live Page",
    url: "https://v2.btnrwanda.com/page/live/",
    embedUrl: "https://v2.btnrwanda.com/page/live/"
  },
  {
    name: "TV10 Rwanda",
    country: "Rwanda",
    type: "Official Website",
    url: "https://radiotv10.rw/"
  },
  {
    name: "TV1 Rwanda",
    country: "Rwanda",
    type: "Official Website",
    url: "https://tv1.rw/"
  },
  {
    name: "ZACU TV",
    country: "Rwanda",
    type: "Official Website",
    url: "https://www.canalplus.com/rw/chaines/zacu-tv"
  },
  {
    name: "Magic Sports TV",
    country: "Rwanda",
    type: "Official Website",
    url: "https://www.rba.co.rw/"
  },
  {
    name: "KC2",
    country: "Rwanda",
    type: "Official Website",
    url: "https://www.rba.co.rw/"
  }
];

let activeHls = null;
let activeTVButton = null;

function tvMessage(message) {
  $("tvMessage").textContent = message;
}

function resetTVPlayer() {
  const video = $("tvVideo");
  const frame = $("tvFrame");

  video.pause();

  if (activeHls) {
    activeHls.destroy();
    activeHls = null;
  }

  video.removeAttribute("src");
  video.load();

  frame.src = "about:blank";

  video.classList.remove("show");
  frame.classList.remove("show");

  $("tvPlaceholder").style.display = "flex";
}

function setTVExternal(channel) {
  const link = $("tvExternal");

  link.href = channel.url || "#";
  link.hidden = !channel.url;
}

function openOfficialTV(channel) {
  if (!channel.embedUrl) {
    tvMessage(
      channel.name +
      " has no confirmed direct stream or embeddable player. Use the official website link."
    );
    return;
  }

  $("tvFrame").src = channel.embedUrl;
  $("tvFrame").classList.add("show");
  $("tvPlaceholder").style.display = "none";

  tvMessage(
    "Loading the official player. If it does not appear, the broadcaster may block embedding."
  );
}

function playHLS(channel) {
  const video = $("tvVideo");

  $("tvPlaceholder").style.display = "none";
  video.classList.add("show");

  tvMessage("Connecting to " + channel.name + "...");

  if (window.Hls && Hls.isSupported()) {
    activeHls = new Hls({
      enableWorker: true,
      lowLatencyMode: true
    });

    activeHls.loadSource(channel.stream);
    activeHls.attachMedia(video);

    activeHls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().then(() => {
        tvMessage("Playing " + channel.name);
      }).catch(() => {
        tvMessage("Press Play to start the channel.");
      });
    });

    activeHls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        resetTVPlayer();

        tvMessage(
          "The direct stream could not play. It may be offline, blocked, or restricted. Try the official page."
        );

        openOfficialTV(channel);
      }
    });

    return;
  }

  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = channel.stream;

    video.play().catch(() => {
      tvMessage("Press Play to start the TV stream.");
    });

    return;
  }

  resetTVPlayer();
  tvMessage("Your browser does not support this HLS stream.");
}

function openTV(channel) {
  if (!channel) return;

  resetTVPlayer();

  $("tvNowPlaying").textContent = channel.name;
  setTVExternal(channel);

  if (activeTVButton) {
    activeTVButton.classList.remove("active");
  }

  const button = [...document.querySelectorAll(".channel-button")]
    .find((item) => item.dataset.channel === channel.name);

  if (button) {
    button.classList.add("active");
    activeTVButton = button;
  }

  if (channel.stream) {
    playHLS(channel);
    return;
  }

  if (channel.embedUrl) {
    openOfficialTV(channel);
    return;
  }

  tvMessage(
    channel.name +
    " does not currently have a confirmed direct stream in this app."
  );
}

function renderTVChannels() {
  const list = $("tvList");
  list.innerHTML = "";

  TV_CHANNELS.forEach((channel) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "channel-button";
    button.dataset.channel = channel.name;

    button.innerHTML = `
      <span class="channel-icon">📺</span>
      <span>
        <strong></strong>
        <small></small>
      </span>
      <span>▶</span>
    `;

    button.querySelector("strong").textContent = channel.name;
    button.querySelector("small").textContent = channel.type;

    button.addEventListener("click", () => openTV(channel));

    list.appendChild(button);
  });

  $("tvCount").textContent = TV_CHANNELS.length + " channels";
}

$("tvVideo").addEventListener("error", () => {
  tvMessage(
    "TV playback error. The stream may be offline or blocked by the provider."
  );
});

renderTVChannels();

/* =========================================
   4. LIVE RADIO
========================================= */

const radioPlayer = $("radioPlayer");

const RADIO_FALLBACKS = [
  {
    name: "Radio 10 Rwanda",
    city: "Kigali",
    url: "https://radio10rwanda-atunwadigital.streamguys1.com/Radio10Rwanda"
  }
];

let radioStations = [];
let activeRadioButton = null;

function playRadio(station) {
  if (!station || !station.url) return;

  radioPlayer.pause();
  radioPlayer.src = station.url;
  radioPlayer.load();

  $("radioNowPlaying").textContent = station.name;
  $("radioMessage").textContent = "Connecting...";

  radioPlayer.play().then(() => {
    $("radioMessage").textContent = "Now playing live.";
  }).catch(() => {
    $("radioMessage").textContent =
      "Press Play. If it fails, this station may be offline or its stream may be restricted.";
  });

  if (activeRadioButton) {
    activeRadioButton.classList.remove("active");
  }

  const selected = [...document.querySelectorAll(".radio-button")]
    .find((button) => button.dataset.station === station.name);

  if (selected) {
    selected.classList.add("active");
    activeRadioButton = selected;
  }
}

radioPlayer.addEventListener("error", () => {
  $("radioMessage").textContent =
    "Radio stream is unavailable. Try another station.";
});

function renderRadios() {
  const list = $("radioList");
  list.innerHTML = "";

  if (!radioStations.length) {
    list.innerHTML =
      '<p class="status-message">No stations found. Try again later.</p>';
    return;
  }

  radioStations.forEach((station) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "radio-button";
    button.dataset.station = station.name;

    button.innerHTML = `
      <span class="channel-icon">📻</span>
      <span>
        <strong></strong>
        <small></small>
      </span>
      <span>▶</span>
    `;

    button.querySelector("strong").textContent = station.name;
    button.querySelector("small").textContent =
      station.city || "Rwanda";

    button.addEventListener("click", () => playRadio(station));

    list.appendChild(button);
  });

  $("radioCount").textContent =
    radioStations.length + " stations";
}

async function loadRadios() {
  $("radioMessage").textContent = "Finding Rwanda radio stations...";
  $("radioList").innerHTML =
    '<p class="status-message">Searching radio directory...</p>';

  try {
    const response = await fetch(
      "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/RW"
    );

    if (!response.ok) throw new Error("Radio directory unavailable");

    const data = await response.json();

    const stations = data
      .filter((station) =>
        station.url_resolved &&
        station.name &&
        station.lastcheckok === 1
      )
      .map((station) => ({
        name: station.name,
        city: station.state || station.language || "Rwanda",
        url: station.url_resolved
      }));

    const unique = new Map();

    stations.forEach((station) => {
      if (!unique.has(station.name)) {
        unique.set(station.name, station);
      }
    });

    radioStations = [...unique.values()];
  } catch (error) {
    console.warn("Radio directory failed:", error);
    radioStations = [];
  }

  RADIO_FALLBACKS.forEach((station) => {
    if (!radioStations.some((item) => item.name === station.name)) {
      radioStations.unshift(station);
    }
  });

  renderRadios();

  $("radioMessage").textContent = radioStations.length
    ? "Choose a station to listen."
    : "No radio stations available right now.";
}

$("refreshRadios").addEventListener("click", loadRadios);

/* =========================================
   5. MOVIES
========================================= */

/*
  These are openly shared sample/trailer videos.
  Add full films only when their owners permit public playback.
*/

const MOVIES = [
  {
    title: "Big Buck Bunny",
    genre: "animation",
    type: "Open movie",
    year: "2008",
    description: "An animated short film from the Blender Foundation.",
    video:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  },
  {
    title: "Sintel Trailer",
    genre: "adventure",
    type: "Open movie trailer",
    year: "2010",
    description: "A fantasy animation project by the Blender Foundation.",
    video:
      "https://media.w3.org/2010/05/sintel/trailer.mp4"
  },
  {
    title: "Tears of Steel",
    genre: "short",
    type: "Open movie project",
    year: "2012",
    description: "A science-fiction short film project.",
    video:
      "https://media.w3.org/2010/05/bunny/trailer.mp4"
  }
];

function playMovie(movie) {
  const player = $("moviePlayer");

  player.pause();
  player.src = movie.video;
  player.load();

  $("movieNowPlaying").textContent = movie.title;
  $("movieMessage").textContent = movie.description;
  $("moviePlaceholder").style.display = "none";

  player.classList.add("show");

  player.play().catch(() => {
    $("movieMessage").textContent =
      "Press Play to start the movie.";
  });
}

function renderMovies(genre = "all") {
  const grid = $("movieGrid");
  grid.innerHTML = "";

  const movies = genre === "all"
    ? MOVIES
    : MOVIES.filter((movie) => movie.genre === genre);

  movies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";
    card.tabIndex = 0;

    card.innerHTML = `
      <div class="movie-poster">🎬</div>
      <div class="movie-details">
        <h3></h3>
        <p></p>
        <span class="movie-play-label">▶ Play in ITT Movies</span>
      </div>
    `;

    card.querySelector("h3").textContent = movie.title;
    card.querySelector("p").textContent =
      `${movie.type} • ${movie.year}`;

    card.addEventListener("click", () => playMovie(movie));

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") playMovie(movie);
    });

    grid.appendChild(card);
  });

  if (!movies.length) {
    grid.innerHTML =
      '<p class="status-message">No films in this category yet.</p>';
  }
}

document.querySelectorAll("[data-genre]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-genre]").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    renderMovies(button.dataset.genre);
  });
});

$("moviePlayer").addEventListener("error", () => {
  $("movieMessage").textContent =
    "This video is currently unavailable. Try another film.";
});

renderMovies();

/* =========================================
   6. START APPLICATION
========================================= */

loadNews();
loadSports();
loadRadios();

console.log("ITT NEWS application started successfully.");
