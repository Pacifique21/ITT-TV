"use strict";

/* =========================
   ITT NEWS - MAIN SETTINGS
========================= */

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
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
  return /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(url);
}

/* =========================
   PAGE NAVIGATION
========================= */

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

/* =========================
   NEWS
   Replace starter examples
   with verified news links.
========================= */

const newsItems = [
  {
    title: "Rwanda News",
    category: "Rwanda",
    description: "Visit Rwanda's news publishers for the latest verified reports.",
    source: "Rwanda Broadcasting Agency",
    url: "https://www.rba.co.rw/"
  },
  {
    title: "International News",
    category: "World",
    description: "Explore international headlines and current affairs.",
    source: "BBC News",
    url: "https://www.bbc.com/news"
  },
  {
    title: "World Updates",
    category: "World",
    description: "Read international reports and global developments.",
    source: "Al Jazeera",
    url: "https://www.aljazeera.com/news/"
  },
  {
    title: "Sports News",
    category: "Sports",
    description: "Follow sports reports, competitions and results.",
    source: "BBC Sport",
    url: "https://www.bbc.com/sport"
  },
  {
    title: "Technology News",
    category: "Technology",
    description: "Discover technology reporting and digital developments.",
    source: "The Verge",
    url: "https://www.theverge.com/"
  },
  {
    title: "African News",
    category: "World",
    description: "Read reports about events across Africa.",
    source: "Africanews",
    url: "https://www.africanews.com/"
  }
];

function renderNews() {
  const search = $("newsSearch").value.toLowerCase().trim();
  const category = $("newsCategory").value;

  const filtered = newsItems.filter((item) => {
    const matchesSearch =
      `${item.title} ${item.description} ${item.source} ${item.category}`
        .toLowerCase().includes(search);

    const matchesCategory =
      category === "all" || item.category === category;

    return matchesSearch && matchesCategory;
  });

  $("newsGrid").innerHTML = filtered.length
    ? filtered.map((item) => `
      <article class="content-card">
        <span class="card-tag">${escapeHTML(item.category)}</span>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <p class="small-note">Source: ${escapeHTML(item.source)}</p>
        <div class="card-action">
          <a href="${safeURL(item.url)}" target="_blank" rel="noopener noreferrer">
            Visit publisher
          </a>
        </div>
      </article>
    `).join("")
    : `<p class="empty-message">No news items match your search.</p>`;
}

$("newsSearch").addEventListener("input", renderNews);
$("newsCategory").addEventListener("change", renderNews);
renderNews();

/* =========================
   RADIO LIVE - RADIO BROWSER
========================= */

let radioStations = [];
let radioLimit = 24;
let radioLoading = false;

const radioPlayer = $("radioPlayer");

async function loadRadio() {
  if (radioLoading) return;

  radioLoading = true;
  $("radioStatus").textContent = "Loading radio stations...";
  $("radioGrid").innerHTML =
    `<p class="empty-message">Searching for radio stations...</p>`;

  const region = $("radioRegion").value;
  const search = $("radioSearch").value.trim();

  const params = new URLSearchParams({
    limit: "300",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true"
  });

  if (search) {
    params.set("name", search);
  }

  let endpoint;

  if (region === "RW") {
    endpoint = "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/RW";
  } else {
    endpoint = "https://de1.api.radio-browser.info/json/stations/search";
  }

  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Radio service returned ${response.status}`);
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
      : "No stations found. Try another search or choose all countries.";

  } catch (error) {
    console.error("Radio loading error:", error);
    radioStations = [];
    $("radioGrid").innerHTML = `
      <p class="empty-message">
        Radio stations could not be loaded. Check your internet connection
        and press Refresh to try again.
      </p>`;
    $("radioStatus").textContent = "Could not connect to the radio directory.";
  } finally {
    radioLoading = false;
  }
}

function renderRadio() {
  const search = $("radioSearch").value.toLowerCase().trim();

  const filtered = radioStations.filter((station) => {
    const text = [
      station.name,
      station.country,
      station.language,
      station.tags
    ].join(" ").toLowerCase();

    return text.includes(search);
  });

  const visible = filtered.slice(0, radioLimit);

  $("radioGrid").innerHTML = visible.length
    ? visible.map((station) => {
        const name = escapeHTML(station.name || "Unknown station");
        const country = escapeHTML(station.country || "Unknown country");
        const language = escapeHTML(station.language || "Unknown language");
        const uuid = escapeHTML(station.stationuuid);

        return `
          <article class="content-card">
            <span class="card-tag">LIVE RADIO</span>
            <h3>📻 ${name}</h3>
            <p>Country: ${country}</p>
            <p>Language: ${language}</p>
            <div class="card-action">
              <button type="button" data-radio-id="${uuid}">▶ Listen Live</button>
            </div>
          </article>
        `;
      }).join("")
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
  const streamURL = safeURL(station.url_resolved);

  if (!streamURL) {
    $("radioStatus").textContent = "This station does not have a valid stream URL.";
    return;
  }

  radioPlayer.pause();
  radioPlayer.src = streamURL;
  radioPlayer.load();

  $("radioNow").textContent = station.name || "Radio station";
  $("radioDetails").textContent =
    `${station.country || "Unknown country"} • ${station.language || "Unknown language"}`;
  $("radioStatus").textContent = "Connecting to live radio...";

  try {
    await radioPlayer.play();
    $("radioStatus").textContent = "Playing live radio.";
  } catch (error) {
    console.warn("Radio playback error:", error);
    $("radioStatus").textContent =
      "Playback did not start. Press Play on the audio player or try another station.";
  }
}

radioPlayer.addEventListener("playing", () => {
  $("radioStatus").textContent = "Playing live radio.";
});

radioPlayer.addEventListener("error", () => {
  $("radioStatus").textContent =
    "This station could not play. It may be offline or incompatible with your browser.";
});

$("radioSearch").addEventListener("input", renderRadio);
$("radioRegion").addEventListener("change", loadRadio);
$("refreshRadio").addEventListener("click", loadRadio);

$("moreRadio").addEventListener("click", () => {
  radioLimit += 24;
  renderRadio();
});

/* =========================
   TV CHANNELS
   Add authorised stream URLs
   in the website interface.
========================= */

let tvChannels = [];

function renderTV() {
  $("tvGrid").innerHTML = tvChannels.length
    ? tvChannels.map((channel, index) => `
      <article class="content-card">
        <span class="card-tag">TV CHANNEL</span>
        <h3>📺 ${escapeHTML(channel.name)}</h3>
        <p>Available stream</p>
        <div class="card-action">
          <button type="button" data-tv-index="${index}">Watch TV</button>
        </div>
      </article>
    `).join("")
    : `<p class="empty-message">No TV channels have been added yet. Add an authorised TV stream below.</p>`;

  document.querySelectorAll("[data-tv-index]").forEach((button) => {
    button.addEventListener("click", () => {
      playTV(tvChannels[Number(button.dataset.tvIndex)]);
    });
  });
}

function playTV(channel) {
  if (!channel) return;

  const url = safeURL(channel.url);
  if (!url) {
    $("tvStatus").textContent = "Invalid TV link.";
    return;
  }

  const video = $("tvPlayer");
  const frame = $("tvFrame");

  video.pause();
  video.removeAttribute("src");
  video.classList.remove("playing");
  frame.removeAttribute("src");
  frame.classList.remove("playing");
  $("tvPlaceholder").style.display = "none";

  if (isVideoFile(url)) {
    video.src = url;
    video.classList.add("playing");
    video.load();
    video.play().catch(() => {
      $("tvStatus").textContent = "Press Play to start the TV stream.";
    });
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
    alert("Enter a channel name and a valid http or https link.");
    return;
  }

  tvChannels.push({ name, url });
  $("tvName").value = "";
  $("tvUrl").value = "";
  renderTV();
});

renderTV();

/* =========================
   MOVIES
   Add films you have rights
   to stream or embed.
========================= */

let movies = [];

function renderMovies() {
  const search = $("movieSearch").value.toLowerCase().trim();

  const filtered = movies.filter((movie) =>
    movie.name.toLowerCase().includes(search)
  );

  $("movieGrid").innerHTML = filtered.length
    ? filtered.map((movie) => {
        const index = movies.indexOf(movie);

        return `
          <article class="content-card">
            <span class="card-tag">MOVIE</span>
            <h3>🎬 ${escapeHTML(movie.name)}</h3>
            <p>Available to play</p>
            <div class="card-action">
              <button type="button" data-movie-index="${index}">▶ Watch movie</button>
            </div>
          </article>
        `;
      }).join("")
    : `<p class="empty-message">No movies have been added. Add a film link below.</p>`;

  document.querySelectorAll("[data-movie-index]").forEach((button) => {
    button.addEventListener("click", () => {
      playMovie(movies[Number(button.dataset.movieIndex)]);
    });
  });
}

function playMovie(movie) {
  if (!movie) return;

  const url = safeURL(movie.url);
  if (!url) {
    $("movieStatus").textContent = "Invalid movie link.";
    return;
  }

  const video = $("moviePlayer");
  const frame = $("movieFrame");

  video.pause();
  video.removeAttribute("src");
  video.classList.remove("playing");
  frame.removeAttribute("src");
  frame.classList.remove("playing");
  $("moviePlaceholder").style.display = "none";

  if (isVideoFile(url)) {
    video.src = url;
    video.classList.add("playing");
    video.load();
    video.play().catch(() => {
      $("movieStatus").textContent = "Press Play to start the movie.";
    });
  } else {
    frame.src = url;
    frame.classList.add("playing");
  }

  $("movieStatus").textContent = `Selected: ${movie.name}`;
}

$("addMovie").addEventListener("click", () => {
  const name = $("movieName").value.trim();
  const url = safeURL($("movieUrl").value.trim());

  if (!name || !url) {
    alert("Enter a movie title and a valid http or https link.");
    return;
  }

  movies.push({ name, url });
  $("movieName").value = "";
  $("movieUrl").value = "";
  renderMovies();
});

$("movieSearch").addEventListener("input", renderMovies);
renderMovies();

/* =========================
   START APPLICATION
========================= */

showPage("home");
loadRadio();
