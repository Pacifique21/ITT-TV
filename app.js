"use strict";

/* =================================
   ITT NEWS - APP.JS
================================= */

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function safeURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (_) {}
  return "";
}

function isVideoFile(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function isHLS(url) {
  return /\.m3u8(\?.*)?$/i.test(url);
}

function openExternal(url) {
  const safe = safeURL(url);
  if (safe) window.open(safe, "_blank", "noopener,noreferrer");
}

/* =================================
   NAVIGATION
================================= */

function showPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === pageName);
  });

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  $("mainNav").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

$("menuToggle").addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

$("year").textContent = new Date().getFullYear();

/* =================================
   NEWS - RSS FEEDS
   Uses RSS2JSON to read publisher feeds.
================================= */

const NEWS_FEEDS = [
  {
    name: "The New Times - Rwanda",
    category: "Rwanda",
    url: "https://www.newtimes.co.rw/rssFeed/14"
  },
  {
    name: "RBA - Rwanda",
    category: "Rwanda",
    url: "https://www.rba.co.rw/rss.php"
  },
  {
    name: "BBC World News",
    category: "World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml"
  },
  {
    name: "Al Jazeera",
    category: "World",
    url: "https://www.aljazeera.com/xml/rss/all.xml"
  }
];

let allNews = [];

async function getRSSFeed(feed) {
  const apiURL =
    "https://api.rss2json.com/v1/api.json?rss_url=" +
    encodeURIComponent(feed.url);

  const response = await fetch(apiURL);

  if (!response.ok) {
    throw new Error("RSS service unavailable");
  }

  const data = await response.json();

  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error("Could not read this feed");
  }

  return data.items.map((item) => ({
    title: item.title || "News update",
    description: (item.description || item.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 230),
    link: safeURL(item.link),
    date: item.pubDate || "",
    source: feed.name,
    category: feed.category
  })).filter((item) => item.link);
}

async function loadNews() {
  $("newsStatus").textContent = "Loading the latest headlines...";
  $("newsGrid").innerHTML =
    `<p class="empty-message">Connecting to news publishers...</p>`;

  const results = await Promise.allSettled(
    NEWS_FEEDS.map(getRSSFeed)
  );

  allNews = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  // Remove duplicate headlines.
  const seen = new Set();
  allNews = allNews.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  allNews.sort((a, b) => {
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  renderNews();

  const successfulFeeds = results.filter(
    (result) => result.status === "fulfilled"
  ).length;

  if (allNews.length) {
    $("newsStatus").textContent =
      `${allNews.length} headlines loaded from ${successfulFeeds} publisher feeds.`;
  } else {
    $("newsStatus").textContent =
      "News feeds could not be loaded. Use the publisher links below.";
  }
}

function renderNews() {
  const search = $("newsSearch").value.toLowerCase().trim();
  const category = $("newsCategory").value;

  const filtered = allNews.filter((item) => {
    const matchesText =
      `${item.title} ${item.description} ${item.source}`
        .toLowerCase().includes(search);

    const matchesCategory =
      category === "all" || item.category === category;

    return matchesText && matchesCategory;
  });

  $("newsGrid").innerHTML = filtered.length
    ? filtered.map((item) => `
      <article class="content-card">
        <span class="card-tag">${escapeHTML(item.category)} • ${escapeHTML(item.source)}</span>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description || "Open the publisher to read this story.")}</p>
        <p class="small-note">${escapeHTML(item.date)}</p>
        <div class="card-actions">
          <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer">
            Read full story
          </a>
        </div>
      </article>
    `).join("")
    : `<p class="empty-message">No matching headlines. Try another search or category.</p>`;
}

$("newsSearch").addEventListener("input", renderNews);
$("newsCategory").addEventListener("change", renderNews);
$("refreshNews").addEventListener("click", loadNews);

loadNews();

/* =================================
   LIVE RADIO - RADIO BROWSER
================================= */

let radioStations = [];
let radioLimit = 24;
let radioLoading = false;

const radioPlayer = $("radioPlayer");

async function loadRadio() {
  if (radioLoading) return;

  radioLoading = true;
  $("radioStatus").textContent = "Searching for live radio stations...";
  $("radioGrid").innerHTML =
    `<p class="empty-message">Loading radio stations...</p>`;

  const region = $("radioRegion").value;
  const search = $("radioSearch").value.trim();

  const params = new URLSearchParams({
    limit: "300",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true"
  });

  if (search) params.set("name", search);

  let endpoint;

  if (region === "RW") {
    endpoint =
      "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/RW";
  } else {
    endpoint =
      "https://de1.api.radio-browser.info/json/stations/search";
  }

  try {
    const response = await fetch(
      `${endpoint}?${params.toString()}`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) {
      throw new Error(`Radio service error: ${response.status}`);
    }

    const data = await response.json();

    radioStations = Array.isArray(data)
      ? data.filter((station) =>
          station.url_resolved &&
          Number(station.lastcheckok) === 1
        )
      : [];

    radioLimit = 24;
    renderRadio();

    $("radioStatus").textContent = radioStations.length
      ? `${radioStations.length} stations found. Choose one to listen.`
      : "No stations found. Try All countries or refresh.";

  } catch (error) {
    console.error("Radio error:", error);
    radioStations = [];
    $("radioGrid").innerHTML = `
      <p class="empty-message">
        Radio directory could not be reached. Check your internet connection
        and try Refresh again.
      </p>`;
    $("radioStatus").textContent = "Could not connect to radio service.";
  } finally {
    radioLoading = false;
  }
}

function renderRadio() {
  const search = $("radioSearch").value.toLowerCase().trim();

  const filtered = radioStations.filter((station) => {
    const words = [
      station.name,
      station.country,
      station.language,
      station.tags
    ].join(" ").toLowerCase();

    return words.includes(search);
  });

  const visible = filtered.slice(0, radioLimit);

  $("radioGrid").innerHTML = visible.length
    ? visible.map((station) => `
      <article class="content-card">
        <span class="card-tag">LIVE RADIO</span>
        <h3>📻 ${escapeHTML(station.name || "Radio station")}</h3>
        <p>Country: ${escapeHTML(station.country || "Unknown")}</p>
        <p>Language: ${escapeHTML(station.language || "Not specified")}</p>
        <div class="card-actions">
          <button type="button" data-radio-id="${escapeHTML(station.stationuuid)}">
            ▶ Listen Live
          </button>
        </div>
      </article>
    `).join("")
    : `<p class="empty-message">No stations match your search.</p>`;

  $("moreRadio").hidden = filtered.length <= radioLimit;

  document.querySelectorAll("[data-radio-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const station = radioStations.find(
        (item) => item.stationuuid === button.dataset.radioId
      );
      if (station) playRadio(station);
    });
  });
}

async function playRadio(station) {
  const stream = safeURL(station.url_resolved);

  if (!stream) {
    $("radioStatus").textContent = "This station has no valid stream.";
    return;
  }

  radioPlayer.pause();
  radioPlayer.src = stream;
  radioPlayer.load();

  $("radioNow").textContent = station.name || "Radio station";
  $("radioDetails").textContent =
    `${station.country || "Unknown country"} • ${station.language || "Unknown language"}`;
  $("radioStatus").textContent = "Connecting to radio...";

  try {
    await radioPlayer.play();
    $("radioStatus").textContent = "Playing live radio.";
  } catch (error) {
    $("radioStatus").textContent =
      "Press Play on the audio player, or try another station.";
  }
}

radioPlayer.addEventListener("playing", () => {
  $("radioStatus").textContent = "Playing live radio.";
});

radioPlayer.addEventListener("error", () => {
  $("radioStatus").textContent =
    "This station could not play. It may be offline or incompatible.";
});

$("radioSearch").addEventListener("input", renderRadio);
$("radioRegion").addEventListener("change", loadRadio);
$("refreshRadio").addEventListener("click", loadRadio);

$("moreRadio").addEventListener("click", () => {
  radioLimit += 24;
  renderRadio();
});

loadRadio();

/* =================================
   LIVE TV
================================= */

const tvChannels = [
  {
    name: "Rwanda Broadcasting Agency - RTV",
    url: "https://www.rba.co.rw/",
    type: "official"
  },
  {
    name: "Rwanda TV - Official",
    url: "https://www.youtube.com/@RwandaTV",
    type: "official"
  },
  {
    name: "BBC News - Official",
    url: "https://www.bbc.com/news",
    type: "official"
  },
  {
    name: "Al Jazeera - Official",
    url: "https://www.aljazeera.com/",
    type: "official"
  }
];

let hlsInstance = null;

function stopTVPlayer() {
  const video = $("tvPlayer");
  const frame = $("tvFrame");

  video.pause();
  video.removeAttribute("src");
  video.load();
  video.classList.remove("playing");

  frame.removeAttribute("src");
  frame.classList.remove("playing");

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
}

function renderTV() {
  $("tvGrid").innerHTML = tvChannels.map((channel, index) => `
    <article class="content-card">
      <span class="card-tag">TV CHANNEL</span>
      <h3>📺 ${escapeHTML(channel.name)}</h3>
      <p>${channel.type === "official"
        ? "Official broadcaster page"
        : "Added stream"}</p>
      <div class="card-actions">
        <button type="button" data-tv-index="${index}">
          ${channel.type === "official" ? "Open Channel" : "Watch Here"}
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-tv-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const channel = tvChannels[Number(button.dataset.tvIndex)];
      if (channel) playTV(channel);
    });
  });
}

function playTV(channel) {
  const url = safeURL(channel.url);

  if (!url) {
    $("tvStatus").textContent = "Invalid TV link.";
    return;
  }

  if (channel.type === "official") {
    $("tvStatus").textContent =
      "Opening the broadcaster's official page in a new tab.";
    openExternal(url);
    return;
  }

  stopTVPlayer();
  $("tvPlaceholder").style.display = "none";

  const video = $("tvPlayer");
  const frame = $("tvFrame");

  if (isVideoFile(url)) {
    video.src = url;
    video.classList.add("playing");
    video.load();
    video.play().catch(() => {
      $("tvStatus").textContent = "Press Play to start the TV stream.";
    });
  } else if (isHLS(url)) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.classList.add("playing");
      video.play().catch(() => {
        $("tvStatus").textContent = "Press Play to start the TV stream.";
      });
    } else if (window.Hls && Hls.isSupported()) {
      hlsInstance = new Hls();
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      video.classList.add("playing");
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          $("tvStatus").textContent = "Press Play to start the TV stream.";
        });
      });
    } else {
      $("tvStatus").textContent = "This browser does not support this HLS stream.";
      return;
    }
  } else {
    frame.src = url;
    frame.classList.add("playing");
  }

  $("tvStatus").textContent = `Selected: ${channel.name}`;
}

$("addTv").addEventListener("click", () => {
  const name = $("tvName").value.trim();
  const url = safeURL($("tvUrl").value.trim());

  if (!name || !url) {
    alert("Enter a channel name and a valid HTTPS or HTTP link.");
    return;
  }

  tvChannels.push({ name, url, type: "custom" });
  $("tvName").value = "";
  $("tvUrl").value = "";
  renderTV();
});

renderTV();

/* =================================
   MOVIES - RECENT RELEASES
   These are discovery cards, not
   unauthorised full-film streams.
================================= */

const movies = [
  {
    title: "The Cat in the Hat",
    year: "2026",
    release: "November 6, 2026",
    description: "A recent animated family film release.",
    trailerSearch: "The Cat in the Hat 2026 official trailer"
  },
  {
    title: "The Odyssey",
    year: "2026",
    release: "November 17, 2026",
    description: "Listed for a November 2026 release.",
    trailerSearch: "The Odyssey 2026 official trailer"
  },
  {
    title: "The Hunger Games: Sunrise on the Reaping",
    year: "2026",
    release: "November 20, 2026",
    description: "A forthcoming film in the Hunger Games series.",
    trailerSearch: "The Hunger Games Sunrise on the Reaping official trailer"
  },
  {
    title: "Hexed",
    year: "2026",
    release: "November 25, 2026",
    description: "An upcoming animated movie release.",
    trailerSearch: "Hexed 2026 official trailer"
  },
  {
    title: "Bad Apples",
    year: "2026",
    release: "November 3, 2026",
    description: "A film listed among November 2026 streaming releases.",
    trailerSearch: "Bad Apples 2026 official trailer"
  }
];

const moviePlayer = $("moviePlayer");
let movieHlsInstance = null;

function renderMovies() {
  const search = $("movieSearch").value.toLowerCase().trim();

  const filtered = movies.filter((movie) =>
    `${movie.title} ${movie.year} ${movie.description}`
      .toLowerCase().includes(search)
  );

  $("movieGrid").innerHTML = filtered.length
    ? filtered.map((movie) => {
        const trailerURL =
          "https://www.youtube.com/results?search_query=" +
          encodeURIComponent(movie.trailerSearch);

        const watchURL =
          "https://www.justwatch.com/us/search?q=" +
          encodeURIComponent(movie.title);

        return `
          <article class="content-card">
            <span class="card-tag">NEW / UPCOMING • ${escapeHTML(movie.year)}</span>
            <h3>🎬 ${escapeHTML(movie.title)}</h3>
            <p>${escapeHTML(movie.description)}</p>
            <p class="small-note">Release: ${escapeHTML(movie.release)}</p>
            <div class="card-actions">
              <a href="${trailerURL}" target="_blank" rel="noopener noreferrer">
                Watch Trailer
              </a>
              <a href="${watchURL}" target="_blank" rel="noopener noreferrer">
                Find Legal Viewing
              </a>
            </div>
          </article>
        `;
      }).join("")
    : `<p class="empty-message">No movies match your search.</p>`;
}

function stopMoviePlayer() {
  moviePlayer.pause();
  moviePlayer.removeAttribute("src");
  moviePlayer.load();
  moviePlayer.classList.remove("playing");

  $("movieFrame").removeAttribute("src");
  $("movieFrame").classList.remove("playing");

  if (movieHlsInstance) {
    movieHlsInstance.destroy();
    movieHlsInstance = null;
  }
}

function playMovie(movie) {
  const url = safeURL(movie.url);

  if (!url) {
    $("movieStatus").textContent = "Invalid movie link.";
    return;
  }

  stopMoviePlayer();
  $("moviePlaceholder").style.display = "none";

  if (isVideoFile(url)) {
    moviePlayer.src = url;
    moviePlayer.classList.add("playing");
    moviePlayer.load();
    moviePlayer.play().catch(() => {
      $("movieStatus").textContent = "Press Play to start the movie.";
    });
  } else if (isHLS(url)) {
    if (moviePlayer.canPlayType("application/vnd.apple.mpegurl")) {
      moviePlayer.src = url;
      moviePlayer.classList.add("playing");
      moviePlayer.play().catch(() => {
        $("movieStatus").textContent = "Press Play to start the movie.";
      });
    } else if (window.Hls && Hls.isSupported()) {
      movieHlsInstance = new Hls();
      movieHlsInstance.loadSource(url);
      movieHlsInstance.attachMedia(moviePlayer);
      moviePlayer.classList.add("playing");
      movieHlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        moviePlayer.play().catch(() => {
          $("movieStatus").textContent = "Press Play to start the movie.";
        });
      });
    } else {
      $("movieStatus").textContent = "This browser cannot play this video.";
      return;
    }
  } else {
    $("movieFrame").src = url;
    $("movieFrame").classList.add("playing");
  }

  $("movieStatus").textContent = `Selected: ${movie.name}`;
}

$("movieSearch").addEventListener("input", renderMovies);

$("addMovie").addEventListener("click", () => {
  const name = $("movieName").value.trim();
  const url = safeURL($("movieUrl").value.trim());

  if (!name || !url) {
    alert("Enter a movie title and a valid video or authorised embed URL.");
    return;
  }

  playMovie({ name, url });
  $("movieName").value = "";
  $("movieUrl").value = "";
});

renderMovies();

/* =================================
   START APP
================================= */

showPage("home");
