
"use strict";

/* ITT NEWS - Main JavaScript */

const $ = (id) => document.getElementById(id);

const state = {
  tv: [],
  radio: [],
  news: [],
  movies: [],
  tvLimit: 24,
  radioLimit: 24,
  newsLimit: 12,
  movieLimit: 20,
  hls: null
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("mainNav").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

$("menuToggle").addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

/* Helper functions */

function setStatus(id, message) {
  $(id).textContent = message;
}

function showEmpty(id, message) {
  $(id).innerHTML = `<div class="empty">${escapeHTML(message)}</div>`;
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Network request failed");
  return response.json();
}

/* ---------------- NEWS ---------------- */

const newsFeeds = [
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "DW", url: "https://rss.dw.com/rdf/rss-en-all" }
];

async function loadNews() {
  setStatus("newsStatus", "Loading latest news...");
  $("newsGrid").innerHTML = "";

  const allNews = [];

  for (const feed of newsFeeds) {
    try {
      const api = "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(feed.url);

      const data = await fetchJSON(api);

      if (data.items) {
        data.items.forEach(item => {
          allNews.push({
            title: item.title || "News story",
            description: item.description || item.content || "",
            link: item.link || "#",
            date: item.pubDate || "",
            source: feed.name,
            image: item.thumbnail || ""
          });
        });
      }
    } catch (error) {
      console.warn("News source unavailable:", feed.name);
    }
  }

  state.news = allNews;
  state.newsLimit = 12;
  renderNews();

  if (allNews.length) {
    setStatus("newsStatus", `${allNews.length} news stories loaded.`);
  } else {
    setStatus("newsStatus", "News feeds could not be reached. Check your internet connection or try again later.");
  }
}

function renderNews() {
  const query = $("newsSearch").value.toLowerCase().trim();
  const source = $("newsSource").value;

  const filtered = state.news.filter(item =>
    item.title.toLowerCase().includes(query) &&
    (source === "all" || item.source === source)
  );

  const visible = filtered.slice(0, state.newsLimit);

  $("newsGrid").innerHTML = visible.map(item => `
    <article class="news-card">
      <span class="source">${escapeHTML(item.source)}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.description.replace(/<[^>]*>/g, "").slice(0, 180))}</p>
      <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener">Read full story ↗</a>
    </article>
  `).join("");

  if (!visible.length) showEmpty("newsGrid", "No news found.");
  $("moreNews").hidden = visible.length >= filtered.length;
}

$("newsSearch").addEventListener("input", renderNews);
$("newsSource").addEventListener("change", renderNews);
$("moreNews").addEventListener("click", () => {
  state.newsLimit += 12;
  renderNews();
});
$("refreshNews").addEventListener("click", loadNews);

/* ---------------- LIVE TV ---------------- */

async function loadTV() {
  setStatus("tvStatus", "Loading TV channels...");
  $("tvGrid").innerHTML = "";

  try {
    const [channels, streams] = await Promise.all([
      fetchJSON("https://iptv-org.github.io/api/channels.json"),
      fetchJSON("https://iptv-org.github.io/api/streams.json")
    ]);

    const channelMap = new Map(channels.map(channel => [channel.id, channel]));

    state.tv = streams
      .filter(stream => stream.channel && stream.url)
      .map(stream => {
        const channel = channelMap.get(stream.channel) || {};
        return {
          name: channel.name || stream.channel,
          country: channel.country || "Unknown",
          logo: channel.logo || "",
          url: stream.url
        };
      });

    state.tvLimit = 24;
    fillCountries();
    renderTV();
    setStatus("tvStatus", `${state.tv.length} TV streams found. Select a channel to play.`);
  } catch (error) {
    console.error(error);
    setStatus("tvStatus", "TV channels could not load. Check your internet connection.");
    showEmpty("tvGrid", "TV list is currently unavailable. Try Refresh.");
  }
}

function fillCountries() {
  const countries = [...new Set(state.tv.map(channel => channel.country))]
    .filter(Boolean).sort();

  $("tvCountry").innerHTML = '<option value="all">All countries</option>' +
    countries.map(country =>
      `<option value="${escapeHTML(country)}">${escapeHTML(country)}</option>`
    ).join("");
}

function renderTV() {
  const query = $("tvSearch").value.toLowerCase().trim();
  const country = $("tvCountry").value;

  const filtered = state.tv.filter(channel =>
    channel.name.toLowerCase().includes(query) &&
    (country === "all" || channel.country === country)
  );

  const visible = filtered.slice(0, state.tvLimit);

  $("tvGrid").innerHTML = visible.map((channel, index) => `
    <article class="media-card">
      <div class="media-thumb">
        ${channel.logo
          ? `<img src="${escapeHTML(channel.logo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : "📺"}
      </div>
      <h3>${escapeHTML(channel.name)}</h3>
      <p>${escapeHTML(channel.country)}</p>
      <button class="card-action" data-tv-index="${state.tv.indexOf(channel)}">▶ Watch</button>
    </article>
  `).join("");

  if (!visible.length) showEmpty("tvGrid", "No channels found.");
  $("moreTV").hidden = visible.length >= filtered.length;

  document.querySelectorAll("[data-tv-index]").forEach(button => {
    button.addEventListener("click", () => {
      playTV(state.tv[Number(button.dataset.tvIndex)]);
    });
  });
}

function playTV(channel) {
  if (!channel) return;

  const video = $("tvPlayer");
  const url = channel.url;

  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();

  $("tvNow").textContent = channel.name;
  setStatus("tvStatus", "Connecting to " + channel.name + "...");

  if (url.includes(".m3u8") && window.Hls && Hls.isSupported()) {
    state.hls = new Hls();
    state.hls.loadSource(url);
    state.hls.attachMedia(video);

    state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        setStatus("tvStatus", "Press the play button to start the channel.");
      });
    });

    state.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) setStatus("tvStatus", "This channel stream is unavailable.");
    });
  } else {
    video.src = url;
    video.play().catch(() => {
      setStatus("tvStatus", "Press Play. This channel may not support browser playback.");
    });
  }
}

$("tvSearch").addEventListener("input", renderTV);
$("tvCountry").addEventListener("change", renderTV);
$("moreTV").addEventListener("click", () => {
  state.tvLimit += 24;
  renderTV();
});
$("refreshTV").addEventListener("click", loadTV);

/* ---------------- RADIO ---------------- */

async function loadRadio() {
  setStatus("radioStatus", "Loading radio stations...");
  $("radioGrid").innerHTML = "";

  try {
    const url = "https://all.api.radio-browser.info/json/stations/search" +
      "?limit=300&hidebroken=true&order=clickcount&reverse=true";

    const stations = await fetchJSON(url);

    state.radio = stations
      .filter(station => station.url_resolved || station.url)
      .map(station => ({
        name: station.name || "Radio Station",
        country: station.country || "International",
        language: station.language || "",
        logo: station.favicon || "",
        url: station.url_resolved || station.url
      }));

    state.radioLimit = 24;
    renderRadio();
    setStatus("radioStatus", `${state.radio.length} radio stations found.`);
  } catch (error) {
    console.error(error);
    setStatus("radioStatus", "Radio stations could not load. Check your internet connection.");
    showEmpty("radioGrid", "Radio list is currently unavailable. Try Refresh.");
  }
}

function renderRadio() {
  const query = $("radioSearch").value.toLowerCase().trim();

  const filtered = state.radio.filter(station =>
    (station.name + " " + station.country + " " + station.language)
      .toLowerCase().includes(query)
  );

  const visible = filtered.slice(0, state.radioLimit);

  $("radioGrid").innerHTML = visible.map(station => `
    <article class="media-card">
      <div class="media-thumb">
        ${station.logo
          ? `<img src="${escapeHTML(station.logo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : "📻"}
      </div>
      <h3>${escapeHTML(station.name)}</h3>
      <p>${escapeHTML(station.country)}</p>
      <button class="card-action" data-radio-url="${escapeHTML(station.url)}" data-radio-name="${escapeHTML(station.name)}">▶ Listen</button>
    </article>
  `).join("");

  if (!visible.length) showEmpty("radioGrid", "No radio stations found.");
  $("moreRadio").hidden = visible.length >= filtered.length;

  document.querySelectorAll("[data-radio-url]").forEach(button => {
    button.addEventListener("click", () => {
      playRadio(button.dataset.radioUrl, button.dataset.radioName);
    });
  });
}

function playRadio(url, name) {
  const player = $("radioPlayer");
  player.pause();
  player.src = url;
  player.load();

  $("radioNow").textContent = name;
  setStatus("radioStatus", "Connecting to radio...");

  player.play().then(() => {
    setStatus("radioStatus", "Now playing.");
  }).catch(() => {
    setStatus("radioStatus", "Press Play to listen. This station may not support browser playback.");
  });
}

$("radioSearch").addEventListener("input", renderRadio);
$("moreRadio").addEventListener("click", () => {
  state.radioLimit += 24;
  renderRadio();
});
$("refreshRadio").addEventListener("click", loadRadio);

/* ---------------- MOVIES ---------------- */

async function loadMovies() {
  setStatus("movieStatus", "Searching movie library...");
  $("movieGrid").innerHTML = "";

  try {
    const searchURL =
      "https://archive.org/advancedsearch.php?q=" +
      encodeURIComponent('mediatype:movies AND (collection:feature_films OR collection:classic_cinema)') +
      "&fl[]=identifier&fl[]=title&fl[]=description&rows=60&page=1&output=json";

    const data = await fetchJSON(searchURL);

    state.movies = (data.response?.docs || []).map(movie => ({
      id: movie.identifier,
      title: movie.title || movie.identifier,
      description: movie.description || "Internet Archive movie",
      image: `https://archive.org/services/img/${encodeURIComponent(movie.identifier)}`
    }));

    state.movieLimit = 20;
    renderMovies();
    setStatus("movieStatus", `${state.movies.length} movie entries found. Choose a film to check playback.`);
  } catch (error) {
    console.error(error);
    setStatus("movieStatus", "Movie library could not load. Try Refresh.");
    showEmpty("movieGrid", "Movies are currently unavailable.");
  }
}

function renderMovies() {
  const query = $("movieSearch").value.toLowerCase().trim();

  const filtered = state.movies.filter(movie =>
    movie.title.toLowerCase().includes(query)
  );

  const visible = filtered.slice(0, state.movieLimit);

  $("movieGrid").innerHTML = visible.map(movie => `
    <article class="media-card">
      <div class="media-thumb">
        <img src="${escapeHTML(movie.image)}" alt="" loading="lazy" onerror="this.style.display='none'">
      </div>
      <h3>${escapeHTML(movie.title)}</h3>
      <p>${escapeHTML(String(movie.description).replace(/<[^>]*>/g, "").slice(0, 100))}</p>
      <button class="card-action" data-movie-id="${escapeHTML(movie.id)}">▶ Play movie</button>
    </article>
  `).join("");

  if (!visible.length) showEmpty("movieGrid", "No movies found.");
  $("moreMovies").hidden = visible.length >= filtered.length;

  document.querySelectorAll("[data-movie-id]").forEach(button => {
    button.addEventListener("click", () => {
      playMovie(button.dataset.movieId);
    });
  });
}

async function playMovie(identifier) {
  const player = $("moviePlayer");
  $("movieNow").textContent = "Loading movie...";
  setStatus("movieStatus", "Finding a playable video file...");

  try {
    const metadata = await fetchJSON(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}`
    );

    const files = metadata.files || [];

    const playable = files.find(file =>
      /\.(mp4|m4v|webm)$/i.test(file.name || "") &&
      Number(file.size || 0) > 1000000
    );

    if (!playable) {
      setStatus("movieStatus", "No compatible video file was found for this movie.");
      return;
    }

    const videoURL = "https://archive.org/download/" +
      encodeURIComponent(identifier) + "/" +
      playable.name.split("/").map(encodeURIComponent).join("/");

    player.src = videoURL;
    player.load();

    const movie = state.movies.find(item => item.id === identifier);
    $("movieNow").textContent = movie ? movie.title : identifier;

    player.play().then(() => {
      setStatus("movieStatus", "Movie is playing.");
    }).catch(() => {
      setStatus("movieStatus", "Press Play to start the movie.");
    });

  } catch (error) {
    console.error(error);
    setStatus("movieStatus", "This movie could not be opened. Try another film.");
  }
}

$("movieSearch").addEventListener("input", renderMovies);
$("moreMovies").addEventListener("click", () => {
  state.movieLimit += 20;
  renderMovies();
});
$("refreshMovies").addEventListener("click", loadMovies);

/* ---------------- START WEBSITE ---------------- */

function startWebsite() {
  showPage("home");

  loadNews();
  loadTV();
  loadRadio();
  loadMovies();
}

document.addEventListener("DOMContentLoaded", startWebsite);
