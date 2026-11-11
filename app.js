
"use strict";

const $ = id => document.getElementById(id);
const PAGE_SIZE = 24;

const state = {
  tv: [],
  radio: [],
  news: [],
  movies: [],
  tvPage: 1,
  radioPage: 1,
  newsPage: 1,
  moviePage: 1,
  tvSearch: "",
  radioSearch: "",
  newsSearch: "",
  movieSearch: "",
  globalSearch: "",
  tvCountry: "",
  tvCategory: "",
  radioCountry: "",
  radioLanguage: "",
  newsSource: ""
};

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[c]);
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

/* NAVIGATION */

function navigate(page) {
  if (!$ (page)) return;

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  $("mainNav")?.classList.remove("open");
  $("menuToggle")?.setAttribute("aria-expanded", "false");

  window.scrollTo({top:0, behavior:"smooth"});
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    navigate(button.dataset.page);
  });
});

$("menuToggle")?.addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

/* SHARED SELECT */

function fillSelect(id, values, label) {
  const select = $(id);
  if (!select) return;

  const previous = select.value;
  select.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = label;
  select.appendChild(first);

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  if (values.includes(previous)) select.value = previous;
}

/* TV PLAYER */

let hlsPlayer = null;

function stopTV() {
  const video = $("tvPlayer");

  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function playTV(url, name) {
  const video = $("tvPlayer");
  if (!video || !url) return;

  stopTV();

  setText("tvTitle", name);
  setText("tvMessage", "Connecting to TV stream...");

  if (url.includes(".m3u8") && window.Hls && Hls.isSupported()) {
    hlsPlayer = new Hls();
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(video);

    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        setText("tvMessage", "Press Play to start watching.");
      });
    });

    hlsPlayer.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        setText("tvMessage", "This TV stream failed. Try another channel.");
      }
    });
  } else {
    video.src = url;
    video.play().catch(() => {
      setText("tvMessage", "Press Play to start watching.");
    });
  }

  video.onerror = () => {
    setText("tvMessage", "This stream is unavailable or blocks external playback.");
  };
}

/* LOAD TV CHANNELS */

async function loadTV() {
  setText("tvStatus", "Loading TV channels...");

  try {
    const [channelResponse, streamResponse] = await Promise.all([
      fetch("https://iptv-org.github.io/api/channels.json"),
      fetch("https://iptv-org.github.io/api/streams.json")
    ]);

    if (!channelResponse.ok || !streamResponse.ok) {
      throw new Error("TV data unavailable");
    }

    const [channels, streams] = await Promise.all([
      channelResponse.json(),
      streamResponse.json()
    ]);

    const streamMap = new Map();

    streams.forEach(stream => {
      if (stream.channel && stream.url && !streamMap.has(stream.channel)) {
        streamMap.set(stream.channel, stream.url);
      }
    });

    state.tv = channels
      .filter(channel =>
        channel.id &&
        channel.name &&
        channel.is_nsfw !== true &&
        streamMap.has(channel.id)
      )
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        country: channel.country || "Unknown",
        categories: channel.categories || [],
        logo: channel.logo || "",
        url: streamMap.get(channel.id)
      }))
      .sort((a,b) => a.name.localeCompare(b.name));

    fillSelect(
      "tvCountry",
      [...new Set(state.tv.map(x => x.country))].sort(),
      "All countries"
    );

    fillSelect(
      "tvCategory",
      [...new Set(state.tv.flatMap(x => x.categories))].sort(),
      "All categories"
    );

    renderTV();
    setText("tvStatus", `${state.tv.length} TV channels with listed streams found.`);
  } catch (error) {
    console.error(error);
    setText("tvStatus", "TV data could not load. Check internet and refresh.");
  }
}

function renderTV() {
  const grid = $("tvGrid");
  if (!grid) return;

  const query = (
    state.tvSearch + " " + state.globalSearch
  ).toLowerCase().trim();

  const filtered = state.tv.filter(channel => {
    const matchesSearch = !query ||
      `${channel.name} ${channel.country} ${channel.categories.join(" ")}`
        .toLowerCase().includes(query);

    return matchesSearch &&
      (!state.tvCountry || channel.country === state.tvCountry) &&
      (!state.tvCategory || channel.categories.includes(state.tvCategory));
  });

  const shown = filtered.slice(0, state.tvPage * PAGE_SIZE);

  grid.innerHTML = shown.length ? shown.map(channel => `
    <article class="media-card">
      <div class="media-thumb">
        ${channel.logo
          ? `<img src="${safe(channel.logo)}" alt="" loading="lazy" onerror="this.remove()">`
          : "📺"}
      </div>
      <h3>${safe(channel.name)}</h3>
      <p>${safe(channel.country)}</p>
      <p>${safe(channel.categories.join(", "))}</p>
      <button class="card-action" data-tv-id="${safe(channel.id)}">
        ▶ Watch TV
      </button>
    </article>
  `).join("") : '<div class="empty">No TV channels found.</div>';

  grid.querySelectorAll("[data-tv-id]").forEach(button => {
    button.addEventListener("click", () => {
      const channel = state.tv.find(x => x.id === button.dataset.tvId);
      if (channel) {
        navigate("tv");
        playTV(channel.url, channel.name);
      }
    });
  });

  $("tvMore").hidden = shown.length >= filtered.length;
  setText("tvCount", filtered.length);
}

/* RADIO */

async function loadRadio() {
  setText("radioStatus", "Loading radio stations...");

  try {
    const params = new URLSearchParams({
      limit: "1000",
      hidebroken: "true",
      order: "clickcount",
      reverse: "true"
    });

    const response = await fetch(
      "https://all.api.radio-browser.info/json/stations/search?" + params
    );

    if (!response.ok) throw new Error("Radio data unavailable");

    const stations = await response.json();

    state.radio = stations
      .filter(station => station.name && (station.url_resolved || station.url))
      .map(station => ({
        id: station.stationuuid,
        name: station.name,
        country: station.country || "Unknown",
        language: station.language || "Unknown",
        logo: station.favicon || "",
        url: station.url_resolved || station.url
      }));

    fillSelect(
      "radioCountry",
      [...new Set(state.radio.map(x => x.country))].sort(),
      "All countries"
    );

    const languages = [
      ...new Set(
        state.radio.flatMap(x =>
          x.language.split(",").map(y => y.trim())
        ).filter(Boolean)
      )
    ].sort();

    fillSelect("radioLanguage", languages, "All languages");

    renderRadio();
    setText("radioStatus", `${state.radio.length} radio stations found.`);
  } catch (error) {
    console.error(error);
    setText("radioStatus", "Radio stations could not load. Check internet and refresh.");
  }
}

function playRadio(url, name) {
  const audio = $("radioPlayer");
  if (!audio || !url) return;

  audio.pause();
  audio.src = url;
  audio.load();

  setText("radioTitle", name);
  setText("radioMessage", "Connecting to radio...");

  audio.play()
    .then(() => setText("radioMessage", "Radio is playing."))
    .catch(() => setText("radioMessage", "Press Play. This station may be offline."));

  audio.onerror = () => {
    setText("radioMessage", "This station is unavailable. Try another station.");
  };
}

function renderRadio() {
  const grid = $("radioGrid");
  if (!grid) return;

  const query = (
    state.radioSearch + " " + state.globalSearch
  ).toLowerCase().trim();

  const filtered = state.radio.filter(station => {
    const matchesSearch = !query ||
      `${station.name} ${station.country} ${station.language}`
        .toLowerCase().includes(query);

    return matchesSearch &&
      (!state.radioCountry || station.country === state.radioCountry) &&
      (!state.radioLanguage ||
        station.language.toLowerCase().includes(state.radioLanguage.toLowerCase()));
  });

  const shown = filtered.slice(0, state.radioPage * PAGE_SIZE);

  grid.innerHTML = shown.length ? shown.map(station => `
    <article class="media-card">
      <div class="media-thumb">
        ${station.logo
          ? `<img src="${safe(station.logo)}" alt="" loading="lazy" onerror="this.remove()">`
          : "📻"}
      </div>
      <h3>${safe(station.name)}</h3>
      <p>${safe(station.country)}</p>
      <p>${safe(station.language)}</p>
      <button class="card-action" data-radio-id="${safe(station.id)}">
        ▶ Listen Now
      </button>
    </article>
  `).join("") : '<div class="empty">No radio stations found.</div>';

  grid.querySelectorAll("[data-radio-id]").forEach(button => {
    button.addEventListener("click", () => {
      const station = state.radio.find(x => x.id === button.dataset.radioId);
      if (station) {
        navigate("radio");
        playRadio(station.url, station.name);
      }
    });
  });

  $("radioMore").hidden = shown.length >= filtered.length;
  setText("radioCount", filtered.length);
}

/* NEWS */

const NEWS_FEEDS = [
  {name:"BBC World", url:"https://feeds.bbci.co.uk/news/world/rss.xml"},
  {name:"Al Jazeera", url:"https://www.aljazeera.com/xml/rss/all.xml"},
  {name:"DW News", url:"https://rss.dw.com/rdf/rss-en-all"}
];

function stripHTML(value) {
  const doc = new DOMParser().parseFromString(String(value), "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

async function loadNews() {
  setText("newsStatus", "Loading latest news...");

  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async feed => {
      const url =
        "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(feed.url);

      const response = await fetch(url);
      if (!response.ok) throw new Error("News feed unavailable");

      const data = await response.json();
      if (data.status !== "ok") throw new Error("Feed conversion failed");

      return (data.items || []).map(item => ({
        title: item.title || "Untitled story",
        link: item.link || "",
        description: stripHTML(item.description || item.content || "").slice(0,250),
        date: item.pubDate || "",
        source: feed.name
      }));
    })
  );

  state.news = results.flatMap(result =>
    result.status === "fulfilled" ? result.value : []
  );

  state.news.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));

  fillSelect(
    "newsSource",
    [...new Set(state.news.map(x => x.source))].sort(),
    "All sources"
  );

  renderNews();

  setText("homeNewsCount", state.news.length);

  setText(
    "newsStatus",
    state.news.length
      ? `${state.news.length} headlines loaded. Full stories open at their publishers.`
      : "News feeds could not load. Try refreshing later."
  );
}

function renderNews() {
  const grid = $("newsGrid");
  if (!grid) return;

  const query = state.newsSearch.toLowerCase().trim();

  const filtered = state.news.filter(item =>
    (!query || `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(query)) &&
    (!state.newsSource || item.source === state.newsSource)
  );

  const shown = filtered.slice(0, state.newsPage * PAGE_SIZE);

  grid.innerHTML = shown.length ? shown.map(item => `
    <article class="news-card">
      <span class="source">${safe(item.source)}</span>
      <h3>${safe(item.title)}</h3>
      <p>${safe(item.description)}</p>
      <a href="${safe(item.link)}" target="_blank" rel="noopener noreferrer">
        Read full story ↗
      </a>
    </article>
  `).join("") : '<div class="empty">No news stories found.</div>';

  $("newsMore").hidden = shown.length >= filtered.length;
}

/* MOVIES */

async function loadMovies() {
  setText("movieStatus", "Searching for available films...");

  try {
    const params = new URLSearchParams();
    params.set("q", "mediatype:movies AND (collection:feature_films OR collection:opensource_movies)");
    params.append("fl[]", "identifier");
    params.append("fl[]", "title");
    params.append("fl[]", "year");
    params.set("rows", "50");
    params.set("output", "json");

    const response = await fetch(
      "https://archive.org/advancedsearch.php?" + params
    );

    if (!response.ok) throw new Error("Movie search unavailable");

    const data = await response.json();
    const docs = data.response?.docs || [];

    const results = await Promise.allSettled(
      docs.map(async doc => {
        const metaResponse = await fetch(
          "https://archive.org/metadata/" + encodeURIComponent(doc.identifier)
        );

        if (!metaResponse.ok) throw new Error("Metadata unavailable");

        const metadata = await metaResponse.json();

        const file = (metadata.files || []).find(item =>
          /\.(mp4|m4v|webm)$/i.test(item.name || "") &&
          Number(item.size || 0) > 1000000
        );

        if (!file) return null;

        const filePath = file.name.split("/")
          .map(part => encodeURIComponent(part))
          .join("/");

        return {
          id: doc.identifier,
          title: doc.title || doc.identifier,
          year: doc.year || "",
          url: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${filePath}`,
          page: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`
        };
      })
    );

    state.movies = results
      .filter(result => result.status === "fulfilled" && result.value)
      .map(result => result.value);

    renderMovies();
    setText("movieCount", state.movies.length);
    setText("movieStatus", `${state.movies.length} films with playable video files found.`);
  } catch (error) {
    console.error(error);
    setText("movieStatus", "Movies could not load. Check internet and refresh.");
  }
}

function playMovie(movie) {
  const panel = $("moviePlayerPanel");
  const video = $("moviePlayer");

  if (!movie || !video) return;

  panel.hidden = false;
  video.pause();
  video.src = movie.url;
  video.load();

  setText("movieTitle", movie.title);
  setText("movieMessage", "If playback fails, check the source page.");

  video.play().catch(() => {
    setText("movieMessage", "Press Play to start the film.");
  });

  video.onerror = () => {
    setText("movieMessage", "This video file is unavailable in your browser.");
  };

  panel.scrollIntoView({behavior:"smooth"});
}

function renderMovies() {
  const grid = $("movieGrid");
  if (!grid) return;

  const query = state.movieSearch.toLowerCase().trim();

  const filtered = state.movies.filter(movie =>
    `${movie.title} ${movie.year}`.toLowerCase().includes(query)
  );

  const shown = filtered.slice(0, state.moviePage * PAGE_SIZE);

  grid.innerHTML = shown.length ? shown.map(movie => `
    <article class="media-card">
      <div class="media-thumb">🎬</div>
      <h3>${safe(movie.title)}</h3>
      <p>${safe(String(movie.year))}</p>
      <button class="card-action" data-movie-id="${safe(movie.id)}">
        ▶ Play Film
      </button>
      <p><a href="${safe(movie.page)}" target="_blank" rel="noopener noreferrer">Source page ↗</a></p>
    </article>
  `).join("") : '<div class="empty">No playable movies found.</div>';

  grid.querySelectorAll("[data-movie-id]").forEach(button => {
    button.addEventListener("click", () => {
      const movie = state.movies.find(x => x.id === button.dataset.movieId);
      playMovie(movie);
    });
  });

  $("movieMore").hidden = shown.length >= filtered.length;
}

/* SEARCH AND FILTERS */

function bindInput(id, callback) {
  $(id)?.addEventListener("input", event => callback(event.target.value));
}

function bindChange(id, callback) {
  $(id)?.addEventListener("change", event => callback(event.target.value));
}

bindInput("globalSearch", value => {
  state.globalSearch = value;
  state.tvPage = 1;
  state.radioPage = 1;
  renderTV();
  renderRadio();
});

bindInput("tvSearch", value => {
  state.tvSearch = value;
  state.tvPage = 1;
  renderTV();
});

bindInput("radioSearch", value => {
  state.radioSearch = value;
  state.radioPage = 1;
  renderRadio();
});

bindInput("newsSearch", value => {
  state.newsSearch = value;
  state.newsPage = 1;
  renderNews();
});

bindInput("movieSearch", value => {
  state.movieSearch = value;
  state.moviePage = 1;
  renderMovies();
});

bindChange("tvCountry", value => {
  state.tvCountry = value;
  state.tvPage = 1;
  renderTV();
});

bindChange("tvCategory", value => {
  state.tvCategory = value;
  state.tvPage = 1;
  renderTV();
});

bindChange("radioCountry", value => {
  state.radioCountry = value;
  state.radioPage = 1;
  renderRadio();
});

bindChange("radioLanguage", value => {
  state.radioLanguage = value;
  state.radioPage = 1;
  renderRadio();
});

bindChange("newsSource", value => {
  state.newsSource = value;
  state.newsPage = 1;
  renderNews();
});

/* BUTTONS */

$("tvMore")?.addEventListener("click", () => {
  state.tvPage++;
  renderTV();
});

$("radioMore")?.addEventListener("click", () => {
  state.radioPage++;
  renderRadio();
});

$("newsMore")?.addEventListener("click", () => {
  state.newsPage++;
  renderNews();
});

$("movieMore")?.addEventListener("click", () => {
  state.moviePage++;
  renderMovies();
});

$("refreshTV")?.addEventListener("click", loadTV);
$("refreshRadio")?.addEventListener("click", loadRadio);
$("refreshNews")?.addEventListener("click", loadNews);
$("refreshMovies")?.addEventListener("click", loadMovies);

/* START WEBSITE */

document.addEventListener("DOMContentLoaded", () => {
  setText("year", new Date().getFullYear());

  navigate("home");

  loadTV();
  loadRadio();
  loadNews();
  loadMovies();

  console.log("ITT NEWS website started successfully.");
});
