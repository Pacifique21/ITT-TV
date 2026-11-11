"use strict";

/* =========================
   ITT NEWS - MAIN NAVIGATION
========================= */

const $ = (id) => document.getElementById(id);

const pages = ["home", "radio", "tv", "movies"];

function openPage(page) {
  if (!pages.includes(page)) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("mainNav").classList.remove("open");

  if (page === "radio" && !radioLoaded) searchRadios();
  if (page === "tv") renderTV();
  if (page === "movies") renderMovies();

  window.scrollTo({ top: 0, behavior: "smooth" });
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


/* =========================
   SAFE TEXT
========================= */

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}


/* =========================
   RADIO DIRECTORY + PLAYER
========================= */

let radioLoaded = false;
let radioStations = [];

const radioPlayer = $("radioPlayer");

async function searchRadios() {
  const name = $("radioSearch").value.trim();
  const country = $("radioCountry").value;

  $("radioList").innerHTML =
    '<p class="muted">Turimo gushaka amaradiyo...</p>';

  const params = new URLSearchParams({
    limit: "45",
    hidebroken: "true",
    order: "votes",
    reverse: "true"
  });

  if (name) params.set("name", name);
  if (country) params.set("country", country);

  const api =
    "https://de1.api.radio-browser.info/json/stations/search?" +
    params.toString();

  try {
    const response = await fetch(api);

    if (!response.ok) {
      throw new Error("Radio service ntiyashubije.");
    }

    const stations = await response.json();

    radioStations = stations.filter(station =>
      station.url_resolved || station.url
    );

    radioLoaded = true;
    displayRadios();

  } catch (error) {
    $("radioList").innerHTML = `
      <p class="muted">
        Ntibyashobotse kubona radio ubu. Reba internet wongere ugerageze.
        ${safeText(error.message)}
      </p>`;
  }
}

function displayRadios() {
  if (!radioStations.length) {
    $("radioList").innerHTML =
      '<p class="muted">Nta radio ibonetse. Gerageza irindi zina cyangwa igihugu.</p>';
    return;
  }

  $("radioList").innerHTML = radioStations.map((station, index) => `
    <article class="card">
      <span class="meta">${safeText(station.country || "International")}</span>
      <h3>${safeText(station.name || "Radio station")}</h3>
      <p>${safeText(station.tags || station.language || "Live radio")}</p>
      <p class="muted">
        ${safeText(station.codec || "Audio")}
        ${station.bitrate ? " • " + safeText(station.bitrate) + " kbps" : ""}
      </p>
      <button class="btn red" data-radio-index="${index}">
        ▶ UMVA LIVE
      </button>
    </article>
  `).join("");

  document.querySelectorAll("[data-radio-index]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.radioIndex);
      playRadio(radioStations[index]);
    });
  });
}

function playRadio(station) {
  if (!station) return;

  const stream = station.url_resolved || station.url;

  $("radioNow").textContent = station.name || "Radio";
  $("radioStatus").textContent =
    "Turagerageza gufungura radio. Kanda Play niba idahise itangira.";

  radioPlayer.pause();
  radioPlayer.src = stream;
  radioPlayer.load();

  radioPlayer.play().then(() => {
    $("radioStatus").textContent = "Radio iri gukina LIVE.";
  }).catch(() => {
    $("radioStatus").textContent =
      "Kanda Play kuri player. Niba itakinnye, stream ishobora kuba itari gukora cyangwa itemera browser.";
  });
}

$("radioSearchBtn").addEventListener("click", searchRadios);
$("reloadRadios").addEventListener("click", searchRadios);

$("radioSearch").addEventListener("keydown", event => {
  if (event.key === "Enter") searchRadios();
});

$("radioCountry").addEventListener("change", searchRadios);


/* =========================
   TV CHANNELS
========================= */

const tvChannels = [
  {
    name: "ZACU TV",
    country: "Rwanda",
    type: "official",
    url: "https://www.canalplus.com/rw/chaines/zacu-tv",
    description: "ZACU TV official page. Access may require a subscription."
  },
  {
    name: "Rwanda TV / RTV",
    country: "Rwanda",
    type: "official",
    url: "https://www.rba.co.rw/tv",
    description: "Rwanda Broadcasting Agency official TV page."
  },
  {
    name: "RADIOTV10",
    country: "Rwanda",
    type: "official",
    url: "https://radiotv10.rw/",
    description: "RADIOTV10 official website."
  },
  {
    name: "BBC News",
    country: "International",
    type: "official",
    url: "https://www.bbc.com/news",
    description: "BBC official news website."
  },
  {
    name: "Al Jazeera Live",
    country: "International",
    type: "official",
    url: "https://www.aljazeera.com/live",
    description: "Al Jazeera official live page."
  }
];

function renderTV() {
  $("tvList").innerHTML = tvChannels.map((channel, index) => `
    <article class="card">
      <span class="meta">${safeText(channel.country)}</span>
      <h3>${safeText(channel.name)}</h3>
      <p>${safeText(channel.description)}</p>
      <button class="btn blue" data-tv-index="${index}">
        REBA TV
      </button>
    </article>
  `).join("");

  document.querySelectorAll("[data-tv-index]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.tvIndex);
      openTV(tvChannels[index]);
    });
  });
}

let tvHls = null;

function stopTV() {
  const video = $("tvPlayer");

  if (tvHls) {
    tvHls.destroy();
    tvHls = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();

  $("tvFrame").src = "";
  video.style.display = "none";
  $("tvFrame").style.display = "none";
}

function openTV(channel) {
  stopTV();

  $("tvNow").textContent = channel.name;
  $("tvStatus").textContent =
    "Turafungura urubuga rwemewe rwa televiziyo. Niba ufite official stream URL, ushobora kuyishyira muri TV player iri hasi.";

  // Official pages can block iframe embedding.
  // Do not bypass broadcaster restrictions.
  window.open(channel.url, "_blank", "noopener");
}

function youtubeEmbed(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return "https://www.youtube-nocookie.com/embed/" +
        parsed.pathname.slice(1);
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        const videoId = parsed.searchParams.get("v");
        if (videoId) {
          return "https://www.youtube-nocookie.com/embed/" + videoId;
        }
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function playVideoSource(url, videoId, frameId, titleId, statusId, title) {
  const video = $(videoId);
  const frame = $(frameId);

  if (!url) return;

  stopPlayer(video, frame);

  const youtube = youtubeEmbed(url);

  $(titleId).textContent = title;
  $(statusId).textContent = "Turagerageza gukina stream...";

  if (youtube) {
    frame.src = youtube;
    frame.style.display = "block";
    $(statusId).textContent =
      "YouTube player. Niba video itabonetse, nyirayo ashobora kuba yarabujije embedding.";
    return;
  }

  if (url.endsWith(".m3u8")) {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.style.display = "block";
      video.play().catch(() => {});
      return;
    }

    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      video.style.display = "block";

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      if (videoId === "tvPlayer") tvHls = hls;
      else movieHls = hls;

      return;
    }

    $(statusId).textContent =
      "Browser yawe ntishyigikira iyi HLS stream.";
    return;
  }

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    video.src = url;
    video.style.display = "block";
    video.play().catch(() => {});
    return;
  }

  frame.src = url;
  frame.style.display = "block";
  $(statusId).textContent =
    "Niba provider yemera iframe, content iragaragara hano.";
}

function stopPlayer(video, frame) {
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.style.display = "none";

  frame.src = "";
  frame.style.display = "none";
}

$("playTvUrl").addEventListener("click", () => {
  const url = $("tvStreamUrl").value.trim();

  if (!validURL(url)) {
    $("tvStatus").textContent = "Shyiramo URL itangira na https:// cyangwa http://";
    return;
  }

  playVideoSource(
    url,
    "tvPlayer",
    "tvFrame",
    "tvNow",
    "tvStatus",
    "TV Custom Stream"
  );
});


/* =========================
   MOVIES
========================= */

const movies = [
  {
    name: "ZACU Entertainment",
    region: "rwanda",
    description: "Rwandan films and series from the official content provider.",
    url: "https://www.zacuentertainment.com/"
  },
  {
    name: "ZACU TV",
    region: "rwanda",
    description: "Rwandan entertainment channel on its official provider.",
    url: "https://www.canalplus.com/rw/chaines/zacu-tv"
  },
  {
    name: "RBA Video",
    region: "rwanda",
    description: "Official Rwanda Broadcasting Agency programmes and videos.",
    url: "https://www.rba.co.rw/"
  },
  {
    name: "Library of Congress Films",
    region: "world",
    description: "Film collection provided by the Library of Congress.",
    url: "https://www.loc.gov/collections/national-screening-room/"
  },
  {
    name: "Internet Archive Public Domain Films",
    region: "public",
    description: "Publicly available films. Check the rights information for each title.",
    url: "https://archive.org/details/feature_films"
  },
  {
    name: "Wikimedia Commons Films",
    region: "public",
    description: "Films and videos with licensing information on each item.",
    url: "https://commons.wikimedia.org/wiki/Category:Films"
  }
];

let movieFilter = "all";
let movieHls = null;

function renderMovies() {
  const selected = movies.filter(movie =>
    movieFilter === "all" || movie.region === movieFilter
  );

  $("movieList").innerHTML = selected.map(movie => `
    <article class="card">
      <span class="meta">${safeText(movie.region.toUpperCase())}</span>
      <h3>${safeText(movie.name)}</h3>
      <p>${safeText(movie.description)}</p>
      <a class="btn green"
         href="${safeText(movie.url)}"
         target="_blank"
         rel="noopener">
        OFFICIAL SOURCE ↗
      </a>
    </article>
  `).join("");
}

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    movieFilter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    renderMovies();
  });
});

function playMovie(url) {
  if (!validURL(url)) {
    $("movieStatus").textContent = "URL ntabwo yanditse neza.";
    return;
  }

  if (movieHls) {
    movieHls.destroy();
    movieHls = null;
  }

  playVideoSource(
    url,
    "moviePlayer",
    "movieFrame",
    "movieNow",
    "movieStatus",
    "Movie Player"
  );
}

$("playMovieUrl").addEventListener("click", () => {
  playMovie($("movieUrl").value.trim());
});


/* =========================
   URL CHECK
========================= */

function validURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (error) {
    return false;
  }
}


/* =========================
   INITIAL SETUP
========================= */

renderTV();
renderMovies();
