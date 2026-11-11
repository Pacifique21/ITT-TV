
"use strict";

const $ = id => document.getElementById(id);

const state = {
  page: "home",
  news: [],
  tv: [],
  radio: [],
  movies: [],
  limits: { news: 12, tv: 20, radio: 20, movies: 12 },
  hls: null,
  loaded: {}
};

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

function status(id, message) {
  $(id).textContent = message;
}

function empty(id, message) {
  $(id).innerHTML = `<div class="empty">${esc(message)}</div>`;
}

/* NAVIGATION */
function navigate(page) {
  if (!$(page)) return;

  state.page = page;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("mainNav").classList.remove("open");
  $("menuToggle").setAttribute("aria-expanded", "false");

  if (!state.loaded[page]) {
    state.loaded[page] = true;

    if (page === "news") loadNews();
    if (page === "tv") loadTV();
    if (page === "radio") loadRadio();
    if (page === "movies") loadMovies();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => navigate(button.dataset.go));
});

$("menuToggle").addEventListener("click", () => {
  const open = $("mainNav").classList.toggle("open");
  $("menuToggle").setAttribute("aria-expanded", String(open));
});

/* NEWS */
const feeds = [
  { name:"BBC", url:"https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name:"Al Jazeera", url:"https://www.aljazeera.com/xml/rss/all.xml" },
  { name:"DW", url:"https://rss.dw.com/rdf/rss-en-all" }
];

async function loadNews() {
  status("newsStatus", "Loading news...");
  empty("newsGrid", "Loading headlines...");

  const results = await Promise.allSettled(
    feeds.map(async feed => {
      const api = "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(feed.url);

      const response = await fetch(api);
      if (!response.ok) throw new Error("News request failed");

      const data = await response.json();
      if (data.status !== "ok") throw new Error("Feed unavailable");

      return (data.items || []).map(item => ({
        title: item.title || "News story",
        link: item.link || "#",
        description: (item.description || "")
          .replace(/<[^>]*>/g, " ")
          .trim()
          .slice(0, 200),
        date: item.pubDate || "",
        source: feed.name
      }));
    })
  );

  state.news = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  state.limits.news = 12;
  renderNews();

  status(
    "newsStatus",
    state.news.length
      ? `${state.news.length} headlines loaded.`
      : "News could not load. Check your internet connection or try again."
  );
}

function renderNews() {
  const query = $("newsSearch").value.toLowerCase().trim();
  const source = $("newsSource").value;

  const items = state.news.filter(item =>
    (source === "all" || item.source === source) &&
    (item.title.toLowerCase().includes(query) ||
     item.description.toLowerCase().includes(query))
  );

  const shown = items.slice(0, state.limits.news);

  $("newsGrid").innerHTML = shown.map(item => `
    <article class="news-card">
      <span class="source">${esc(item.source)}</span>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.description)}</p>
      <a href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">
        Read full story ↗
      </a>
    </article>
  `).join("");

  if (!shown.length) empty("newsGrid", "No matching news found.");

  $("moreNews").hidden = items.length <= state.limits.news;
}

$("newsSearch").addEventListener("input", renderNews);
$("newsSource").addEventListener("change", renderNews);
$("moreNews").addEventListener("click", () => {
  state.limits.news += 12;
  renderNews();
});
$("refreshNews").addEventListener("click", loadNews);

/* LIVE TV */
async function loadTV() {
  status("tvLoadStatus", "Loading TV channels...");
  empty("tvGrid", "Loading channels...");

  try {
    const [channelResponse, streamResponse] = await Promise.all([
      fetch("https://iptv-org.github.io/api/channels.json"),
      fetch("https://iptv-org.github.io/api/streams.json")
    ]);

    if (!channelResponse.ok || !streamResponse.ok) {
      throw new Error("TV directory unavailable");
    }

    const [channels, streams] = await Promise.all([
      channelResponse.json(),
      streamResponse.json()
    ]);

    const channelMap = new Map(channels.map(channel => [
      channel.id, channel
    ]));

    state.tv = streams
      .filter(stream => stream.url && channelMap.has(stream.channel))
      .map(stream => {
        const channel = channelMap.get(stream.channel);

        return {
          name: channel.name || channel.id,
          country: channel.country || "",
          logo: channel.logo || "",
          language: (channel.languages || []).join(" "),
          url: stream.url
        };
      });

    state.tv.sort((a, b) => a.name.localeCompare(b.name));

    const countries = [...new Set(
      state.tv.map(channel => channel.country).filter(Boolean)
    )].sort();

    $("tvCountry").innerHTML =
      '<option value="">All countries</option>' +
      countries.map(country =>
        `<option value="${esc(country)}">${esc(country)}</option>`
      ).join("");

    state.limits.tv = 20;
    renderTV();

    status("tvLoadStatus", `${state.tv.length} TV streams listed.`);
  } catch (error) {
    status("tvLoadStatus", "TV channels failed to load. Try Reload.");
    empty("tvGrid", "TV directory is temporarily unavailable.");
  }
}

function renderTV() {
  const query = $("tvSearch").value.toLowerCase().trim();
  const country = $("tvCountry").value;

  const items = state.tv.filter(channel =>
    (!country || channel.country === country) &&
    (
      channel.name.toLowerCase().includes(query) ||
      channel.country.toLowerCase().includes(query) ||
      channel.language.toLowerCase().includes(query)
    )
  );

  const shown = items.slice(0, state.limits.tv);

  $("tvGrid").innerHTML = shown.map(channel => `
    <article class="media-card">
      <div class="media-thumb">
        ${channel.logo
          ? `<img src="${esc(channel.logo)}" alt="" loading="lazy"
               onerror="this.remove()">`
          : "📺"}
      </div>
      <h3>${esc(channel.name)}</h3>
      <p>${esc(channel.country || "Country unavailable")}</p>
      <button class="card-action"
        data-tv-index="${state.tv.indexOf(channel)}">
        ▶ Watch here
      </button>
    </article>
  `).join("");

  if (!shown.length) empty("tvGrid", "No channels found.");

  $("moreTV").hidden = items.length <= state.limits.tv;
}

function playTV(channel) {
  const video = $("tvPlayer");

  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();

  $("tvNowTitle").textContent = channel.name;
  status("tvStatus", "Connecting to TV stream...");

  if (
    window.Hls &&
    Hls.isSupported() &&
    /\.m3u8($|\?)/i.test(channel.url)
  ) {
    state.hls = new Hls();
    state.hls.loadSource(channel.url);
    state.hls.attachMedia(video);

    state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        status("tvStatus", "Press Play to start the channel.");
      });
    });

    state.hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        status("tvStatus", "This stream is unavailable. Try another channel.");
      }
    });
  } else {
    video.src = channel.url;
    video.play().catch(() => {
      status("tvStatus", "Press Play. This stream may not support your browser.");
    });
  }

  video.scrollIntoView({ behavior:"smooth", block:"center" });
}

$("tvGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-tv-index]");
  if (!button) return;

  playTV(state.tv[Number(button.dataset.tvIndex)]);
});

$("tvSearch").addEventListener("input", renderTV);
$("tvCountry").addEventListener("change", renderTV);
$("moreTV").addEventListener("click", () => {
  state.limits.tv += 20;
  renderTV();
});
$("refreshTV").addEventListener("click", loadTV);

/* RADIO */
async function loadRadio() {
  status("radioLoadStatus", "Loading radio stations...");
  empty("radioGrid", "Loading radio...");

  try {
    const url =
      "https://de1.api.radio-browser.info/json/stations/search" +
      "?hidebroken=true&limit=300&order=clickcount&reverse=true";

    const response = await fetch(url);
    if (!response.ok) throw new Error("Radio service unavailable");

    const data = await response.json();

    state.radio = data
      .filter(station => station.url_resolved || station.url)
      .map(station => ({
        name: station.name || "Radio station",
        country: station.country || "",
        language: station.language || "",
        url: station.url_resolved || station.url
      }));

    const countries = [...new Set(
      state.radio.map(station => station.country).filter(Boolean)
    )].sort();

    $("radioCountry").innerHTML =
      '<option value="">All countries</option>' +
      countries.map(country =>
        `<option value="${esc(country)}">${esc(country)}</option>`
      ).join("");

    state.limits.radio = 20;
    renderRadio();

    status("radioLoadStatus", `${state.radio.length} radio stations loaded.`);
  } catch (error) {
    status("radioLoadStatus", "Radio stations failed to load. Try Reload.");
    empty("radioGrid", "Radio directory is temporarily unavailable.");
  }
}

function renderRadio() {
  const query = $("radioSearch").value.toLowerCase().trim();
  const country = $("radioCountry").value;

  const items = state.radio.filter(station =>
    (!country || station.country === country) &&
    (
      station.name.toLowerCase().includes(query) ||
      station.country.toLowerCase().includes(query) ||
      station.language.toLowerCase().includes(query)
    )
  );

  const shown = items.slice(0, state.limits.radio);

  $("radioGrid").innerHTML = shown.map(station => `
    <article class="media-card">
      <div class="media-thumb">📻</div>
      <h3>${esc(station.name)}</h3>
      <p>${esc([station.country, station.language].filter(Boolean).join(" • "))}</p>
      <button class="card-action"
        data-radio-index="${state.radio.indexOf(station)}">
        ▶ Listen here
      </button>
    </article>
  `).join("");

  if (!shown.length) empty("radioGrid", "No radio stations found.");

  $("moreRadio").hidden = items.length <= state.limits.radio;
}

$("radioGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-radio-index]");
  if (!button) return;

  const station = state.radio[Number(button.dataset.radioIndex)];

  $("radioNowTitle").textContent = station.name;
  $("radioPlayer").src = station.url;

  status("radioStatus", "Connecting to radio stream...");

  $("radioPlayer").play().catch(() => {
    status("radioStatus", "Press Play. If it fails, try another station.");
  });
});

$("radioSearch").addEventListener("input", renderRadio);
$("radioCountry").addEventListener("change", renderRadio);
$("moreRadio").addEventListener("click", () => {
  state.limits.radio += 20;
  renderRadio();
});
$("refreshRadio").addEventListener("click", loadRadio);

/* MOVIES — Internet Archive */
async function loadMovies() {
  status("movieLoadStatus", "Searching video collection...");
  empty("movieGrid", "Loading videos...");

  try {
    const query = encodeURIComponent(
      'mediatype:movies AND (format:mpeg4 OR format:"h.264")'
    );

    const url =
      `https://archive.org/advancedsearch.php?q=${query}` +
      `&fl[]=identifier,title,description&rows=50&page=1&output=json`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Movie search failed");

    const data = await response.json();
    const docs = data.response?.docs || [];

    const records = await Promise.all(
      docs.slice(0, 30).map(async doc => {
        try {
          const metaResponse = await fetch(
            `https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`
          );

          if (!metaResponse.ok) return null;

          const metadata = await metaResponse.json();

          const files = (metadata.files || []).filter(file =>
            /\.(mp4|m4v|webm)$/i.test(file.name || "") &&
            Number(file.size || 0) > 1000000
          );

          if (!files.length) return null;

          files.sort((a, b) =>
            Number(b.size || 0) - Number(a.size || 0)
          );

          return {
            id: doc.identifier,
            title: doc.title || doc.identifier,
            description: String(doc.description || "")
              .replace(/<[^>]*>/g, " ")
              .slice(0, 180),
            file: files[0].name
          };
        } catch (error) {
          return null;
        }
      })
    );

    state.movies = records.filter(Boolean);
    state.limits.movies = 12;
    renderMovies();

    status(
      "movieLoadStatus",
      `${state.movies.length} playable video files found. Check each item's rights before reuse.`
    );
  } catch (error) {
    status("movieLoadStatus", "Movie collection failed to load. Try Reload.");
    empty("movieGrid", "Video collection is temporarily unavailable.");
  }
}

function renderMovies() {
  const query = $("movieSearch").value.toLowerCase().trim();

  const items = state.movies.filter(movie =>
    movie.title.toLowerCase().includes(query) ||
    movie.description.toLowerCase().includes(query)
  );

  const shown = items.slice(0, state.limits.movies);

  $("movieGrid").innerHTML = shown.map(movie => `
    <article class="media-card">
      <div class="media-thumb">🎬</div>
      <h3>${esc(movie.title)}</h3>
      <p>${esc(movie.description)}</p>
      <button class="card-action" data-movie-id="${esc(movie.id)}">
        ▶ Play here
      </button>
      <p>
        <a href="https://archive.org/details/${encodeURIComponent(movie.id)}"
           target="_blank" rel="noopener noreferrer">Item details ↗</a>
      </p>
    </article>
  `).join("");

  if (!shown.length) empty("movieGrid", "No videos match your search.");

  $("moreMovies").hidden = items.length <= state.limits.movies;
}

$("movieGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-movie-id]");
  if (!button) return;

  const movie = state.movies.find(item => item.id === button.dataset.movieId);
  if (!movie) return;

  const videoURL =
    `https://archive.org/download/${encodeURIComponent(movie.id)}/` +
    encodeURIComponent(movie.file);

  $("movieNowTitle").textContent = movie.title;
  $("moviePlayer").src = videoURL;

  status("movieStatus", "Connecting to video...");

  $("moviePlayer").play().catch(() => {
    status("movieStatus", "Press Play. This video may not support browser playback.");
  });

  $("moviePlayer").scrollIntoView({
    behavior:"smooth",
    block:"center"
  });
});

$("movieSearch").addEventListener("input", renderMovies);
$("moreMovies").addEventListener("click", () => {
  state.limits.movies += 12;
  renderMovies();
});
$("refreshMovies").addEventListener("click", loadMovies);

/* GLOBAL SEARCH */
$("globalSearch").addEventListener("input", event => {
  const targets = {
    news:"newsSearch",
    tv:"tvSearch",
    radio:"radioSearch",
    movies:"movieSearch"
  };

  const target = targets[state.page];
  if (!target) return;

  $(target).value = event.target.value;
  $(target).dispatchEvent(new Event("input"));
});

/* Initial page */
navigate("home");
