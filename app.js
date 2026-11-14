
/* =========================================================
   ITT-TV COMPLETE APP.JS
   Compatible with the supplied index.html
   Features: News, Sports, Live TV, Radio and Movies
========================================================= */

"use strict";

/* ===================== CONFIGURATION ===================== */

const CONFIG = {
  iptvChannels: "https://iptv-org.github.io/api/channels.json",
  iptvStreams: "https://iptv-org.github.io/api/streams.json",

  radioServers: [
    "https://de1.api.radio-browser.info",
    "https://nl1.api.radio-browser.info",
    "https://fr1.api.radio-browser.info"
  ],

  rssProxy: "https://api.rss2json.com/v1/api.json?rss_url=",

  newsFeeds: [
    {
      name: "BBC News",
      category: "World",
      url: "https://feeds.bbci.co.uk/news/rss.xml"
    },
    {
      name: "BBC Africa",
      category: "Africa",
      url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml"
    },
    {
      name: "BBC World",
      category: "World",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml"
    },
    {
      name: "BBC Technology",
      category: "Technology",
      url: "https://feeds.bbci.co.uk/news/technology/rss.xml"
    },
    {
      name: "BBC Business",
      category: "Business",
      url: "https://feeds.bbci.co.uk/news/business/rss.xml"
    },
    {
      name: "BBC Sport",
      category: "Sports",
      url: "https://feeds.bbci.co.uk/sport/rss.xml"
    },
    {
      name: "Google News Rwanda",
      category: "Rwanda",
      url: "https://news.google.com/rss/search?q=Rwanda&hl=en&gl=RW&ceid=RW:en"
    }
  ],

  movies: [
    {
      title: "Big Buck Bunny",
      year: "2008",
      category: "Animation",
      description: "An open animated film from the Blender project.",
      image: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg",
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    {
      title: "Elephants Dream",
      year: "2006",
      category: "Animation",
      description: "An open animated short film from the Blender project.",
      image: "https://orange.blender.org/wp-content/themes/orange/images/media/gallery/s1_proog.jpg",
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    },
    {
      title: "Sintel",
      year: "2010",
      category: "Animation",
      description: "An independently produced open animated film.",
      image: "https://durian.blender.org/wp-content/uploads/2010/06/sintel_poster.jpg",
      video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    }
  ]
};

/* ===================== STATE ===================== */

const state = {
  news: [],
  allNews: [],
  newsCategory: "all",
  newsLimit: 12,

  tv: [],
  filteredTV: [],
  currentTV: null,
  hls: null,

  radios: [],
  filteredRadios: [],
  currentRadio: null,

  movies: [],
  currentMovie: null
};

/* ===================== HELPERS ===================== */

const $ = id => document.getElementById(id);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
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
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function setHTML(id, value) {
  const element = $(id);
  if (element) element.innerHTML = value;
}

function showStatus(id, message) {
  setText(id, message);
}

async function fetchJSON(url, timeout = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function formatDate(date) {
  if (!date) return "Recently";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function uniqueBy(items, keyFunction) {
  const seen = new Set();

  return items.filter(item => {
    const key = keyFunction(item);

    if (!key || seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

/* ===================== NAVIGATION ===================== */

function setupNavigation() {
  setText("year", new Date().getFullYear());

  $("closeAnnouncement")?.addEventListener("click", () => {
    $("announcement")?.classList.add("hidden");
  });

  $("menuToggle")?.addEventListener("click", () => {
    const nav = $("mainNav");
    if (!nav) return;

    nav.classList.toggle("open");

    $("menuToggle").setAttribute(
      "aria-expanded",
      nav.classList.contains("open") ? "true" : "false"
    );
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      $("mainNav")?.classList.remove("open");
      $("menuToggle")?.setAttribute("aria-expanded", "false");

      document.querySelectorAll(".nav-link").forEach(item => {
        item.classList.remove("active");
      });

      link.classList.add("active");
    });
  });

  $("globalSearchToggle")?.addEventListener("click", () => {
    $("globalSearchWrap")?.classList.toggle("hidden");
    $("globalSearch")?.focus();
  });

  $("globalSearchButton")?.addEventListener("click", globalSearch);

  $("globalSearch")?.addEventListener("keydown", event => {
    if (event.key === "Enter") globalSearch();
  });
}

function globalSearch() {
  const query = $("globalSearch")?.value.trim();

  if (!query) return;

  const encoded = encodeURIComponent(query);

  const newsInput = $("newsSearch");
  const tvInput = $("tvSearch");
  const radioInput = $("radioSearch");

  if (newsInput) newsInput.value = query;
  if (tvInput) tvInput.value = query;
  if (radioInput) radioInput.value = query;

  renderNews();
  filterTV();
  filterRadios();

  const firstMatch =
    state.allNews.some(item => item.title.toLowerCase().includes(query.toLowerCase())) ||
    state.tv.some(item => item.name.toLowerCase().includes(query.toLowerCase())) ||
    state.radios.some(item => item.name.toLowerCase().includes(query.toLowerCase()));

  if (!firstMatch) {
    window.open(
      `https://www.google.com/search?q=${encoded}`,
      "_blank",
      "noopener,noreferrer"
    );
  } else {
    $("news")?.scrollIntoView({ behavior: "smooth" });
  }
}

/* ===================== NEWS ===================== */

async function loadNews() {
  showStatus("newsStatus", "Loading latest headlines...");

  const results = await Promise.allSettled(
    CONFIG.newsFeeds.map(async feed => {
      const feedURL = CONFIG.rssProxy + encodeURIComponent(feed.url);
      const data = await fetchJSON(feedURL);

      if (data.status !== "ok" || !Array.isArray(data.items)) {
        throw new Error("Feed unavailable");
      }

      return data.items.map(item => ({
        title: item.title || "Untitled story",
        description: item.description || item.content || "",
        link: safeURL(item.link),
        image: safeURL(
          item.thumbnail ||
          item.enclosure?.link ||
          ""
        ),
        date: item.pubDate || "",
        source: feed.name,
        category: feed.category
      }));
    })
  );

  const articles = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  state.allNews = uniqueBy(
    articles,
    item => item.link || item.title
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!state.allNews.length) {
    showStatus(
      "newsStatus",
      "News feeds could not load. Check your internet connection or try Refresh."
    );

    setHTML("newsGrid", `
      <div class="empty-state">
        <h3>News temporarily unavailable</h3>
        <p>Try refreshing the news later.</p>
        <a href="https://news.google.com/" target="_blank" rel="noopener noreferrer">
          Open Google News
        </a>
      </div>
    `);

    return;
  }

  renderNews();

  showStatus(
    "newsStatus",
    `${state.allNews.length} headlines loaded from available feeds.`
  );

  renderTicker();
  renderSports();
}

function renderNews() {
  const search = ($("newsSearch")?.value || "").toLowerCase();

  let items = state.allNews.filter(item => {
    const categoryMatch =
      state.newsCategory === "all" ||
      item.category.toLowerCase() === state.newsCategory.toLowerCase();

    const searchMatch =
      item.title.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.source.toLowerCase().includes(search);

    return categoryMatch && searchMatch;
  });

  state.news = items;

  const visible = items.slice(0, state.newsLimit);

  if (!visible.length) {
    setHTML("newsGrid", `
      <div class="empty-state">
        <h3>No headlines found</h3>
        <p>Try another category or search term.</p>
      </div>
    `);
    return;
  }

  setHTML("newsGrid", visible.map(item => {
    const image = item.image
      ? `<img src="${escapeHTML(item.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="news-image-placeholder">ITT NEWS</div>`;

    return `
      <article class="news-card">
        <a href="${escapeHTML(item.link || "https://news.google.com/")}"
           target="_blank" rel="noopener noreferrer"
           class="news-card-link">
          ${image}
          <div class="news-card-content">
            <span class="eyebrow">${escapeHTML(item.category)}</span>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(
              item.description.replace(/<[^>]*>/g, "").slice(0, 150)
            )}</p>
            <div class="news-card-meta">
              <span>${escapeHTML(item.source)}</span>
              <span>${escapeHTML(formatDate(item.date))}</span>
            </div>
            <span class="text-link">Read original story ↗</span>
          </div>
        </a>
      </article>
    `;
  }).join(""));
}

function renderTicker() {
  const items = state.allNews.slice(0, 12);

  if (!items.length) return;

  setHTML("tickerTrack", items.map(item => `
    <span>
      ${escapeHTML(item.title)}
      ·
      <a href="${escapeHTML(item.link || "https://news.google.com/")}"
         target="_blank" rel="noopener noreferrer">
        ${escapeHTML(item.source)}
      </a>
    </span>
  `).join(" "));
}

function setupNews() {
  $("refreshNews")?.addEventListener("click", loadNews);

  $("newsSearch")?.addEventListener("input", () => {
    state.newsLimit = 12;
    renderNews();
  });

  $("newsFilters")?.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;

    state.newsCategory = button.dataset.category;

    document.querySelectorAll("#newsFilters [data-category]")
      .forEach(item => item.classList.remove("selected"));

    button.classList.add("selected");
    state.newsLimit = 12;
    renderNews();
  });

  $("loadMoreNews")?.addEventListener("click", () => {
    state.newsLimit += 12;
    renderNews();
  });
}

/* ===================== SPORTS ===================== */

function renderSports() {
  const sports = state.allNews.filter(item =>
    item.category === "Sports"
  );

  if (!sports.length) {
    setHTML("sportsList", `
      <div class="empty-state">
        Sports headlines are not available right now.
        <a href="https://www.bbc.com/sport"
           target="_blank" rel="noopener noreferrer">
          Visit BBC Sport
        </a>
      </div>
    `);
    return;
  }

  setHTML("sportsList", sports.slice(0, 10).map(item => `
    <article class="sports-item">
      <span class="eyebrow">${escapeHTML(item.source)}</span>
      <h3>
        <a href="${escapeHTML(item.link)}"
           target="_blank" rel="noopener noreferrer">
          ${escapeHTML(item.title)}
        </a>
      </h3>
      <p>${escapeHTML(formatDate(item.date))}</p>
    </article>
  `).join(""));
}

/* ===================== LIVE TV ===================== */

async function loadTV() {
  showStatus("tvMessage", "Finding public television streams...");
  setText("tvCount", "Loading channels...");

  try {
    const [channels, streams] = await Promise.all([
      fetchJSON(CONFIG.iptvChannels, 30000),
      fetchJSON(CONFIG.iptvStreams, 30000)
    ]);

    if (!Array.isArray(channels) || !Array.isArray(streams)) {
      throw new Error("Invalid IPTV data");
    }

    const channelMap = new Map(
      channels.map(channel => [channel.id, channel])
    );

    state.tv = uniqueBy(
      streams
        .filter(stream => {
          const url = safeURL(stream.url);

          if (!url || !stream.channel) return false;

          const channel = channelMap.get(stream.channel);

          if (!channel || channel.is_nsfw) return false;

          const labels = stream.labels || [];

          if (labels.includes("Geo-blocked")) return false;

          return true;
        })
        .map(stream => {
          const channel = channelMap.get(stream.channel);

          return {
            name: channel.name || stream.title || "Unknown channel",
            country: channel.country || "Unknown",
            countryName: channel.country || "Unknown",
            code: channel.country || "",
            category: (channel.categories || []).join(", "),
            logo: safeURL(
              channel.logo ||
              ""
            ),
            url: safeURL(stream.url),
            title: stream.title || channel.name || "",
            quality: stream.quality || "",
            website: safeURL(channel.website || ""),
            labels: stream.labels || []
          };
        }),
      item => `${item.name.toLowerCase()}|${item.url}`
    );

    state.tv.sort((a, b) => {
      if (a.country === "RW" && b.country !== "RW") return -1;
      if (b.country === "RW" && a.country !== "RW") return 1;
      return a.name.localeCompare(b.name);
    });

    populateTVCountries();
    filterTV();

    setText(
      "tvCount",
      `${state.tv.length} public streams found`
    );

    showStatus(
      "tvMessage",
      "Choose a channel. Some streams may not play in every country or browser."
    );

  } catch (error) {
    console.error("TV loading error:", error);

    state.tv = [];

    setHTML("tvList", `
      <div class="empty-state">
        <h3>Channels could not load</h3>
        <p>Check your connection and reload the channel list.</p>
        <a href="https://iptv-org.github.io/api/streams.json"
           target="_blank" rel="noopener noreferrer">
          View public stream data
        </a>
      </div>
    `);

    setText("tvCount", "0 channels loaded");
    showStatus("tvMessage", "The public TV directory is temporarily unavailable.");
  }
}

function populateTVCountries() {
  const select = $("tvCountry");
  if (!select) return;

  const previous = select.value || "all";

  const countries = [...new Set(
    state.tv.map(channel => channel.country)
  )].filter(Boolean).sort();

  select.innerHTML = `
    <option value="all">All countries</option>
    ${countries.map(country => `
      <option value="${escapeHTML(country)}">
        ${escapeHTML(country)}
      </option>
    `).join("")}
  `;

  if (countries.includes(previous)) select.value = previous;
}

function filterTV() {
  const search = ($("tvSearch")?.value || "").toLowerCase();
  const country = $("tvCountry")?.value || "all";

  state.filteredTV = state.tv.filter(channel => {
    const matchesSearch =
      channel.name.toLowerCase().includes(search) ||
      channel.country.toLowerCase().includes(search) ||
      channel.category.toLowerCase().includes(search);

    const matchesCountry =
      country === "all" || channel.country === country;

    return matchesSearch && matchesCountry;
  });

  renderTV();
}

function renderTV() {
  if (!state.filteredTV.length) {
    setHTML("tvList", `
      <div class="empty-state">
        No matching public streams were found.
      </div>
    `);
    return;
  }

  setHTML("tvList", state.filteredTV.slice(0, 250).map((channel, index) => `
    <button class="channel-item"
            type="button"
            data-tv-index="${index}">
      <span class="channel-number">${index + 1}</span>
      <span class="channel-info">
        <strong>${escapeHTML(channel.name)}</strong>
        <small>${escapeHTML(channel.country)}</small>
      </span>
      <span class="channel-live">LIVE</span>
    </button>
  `).join(""));

  $("tvList")?.querySelectorAll("[data-tv-index]").forEach(button => {
    button.addEventListener("click", () => {
      const channel = state.filteredTV[
        Number(button.dataset.tvIndex)
      ];

      if (channel) playTV(channel);
    });
  });
}

function stopTV() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  const video = $("tvVideo");

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.classList.remove("hidden");
  }

  $("tvEmbed")?.classList.add("hidden");
}

function playTV(channel) {
  const video = $("tvVideo");
  const external = $("tvExternal");

  if (!video) return;

  const url = safeURL(channel.url);
  if (!url) return;

  stopTV();

  state.currentTV = channel;

  setText("tvNowPlaying", channel.name);
  showStatus(
    "tvMessage",
    "Connecting to public stream..."
  );

  if (external && channel.website) {
    external.href = channel.website;
    external.classList.remove("hidden");
  } else {
    external?.classList.add("hidden");
  }

  $("tvPlaceholder")?.classList.add("hidden");

  video.classList.remove("hidden");

  const isHLS = /\.m3u8($|\?)/i.test(url);

  if (isHLS && window.Hls && window.Hls.isSupported()) {
    state.hls = new window.Hls({
      enableWorker: true,
      lowLatencyMode: false
    });

    state.hls.loadSource(url);
    state.hls.attachMedia(video);

    state.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        showStatus("tvMessage", "Press Play to start the stream.");
      });
    });

    state.hls.on(window.Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        showStatus(
          "tvMessage",
          "This stream could not play. Try another channel or open the broadcaster website."
        );
      }
    });

  } else {
    video.src = url;

    video.play().catch(() => {
      showStatus(
        "tvMessage",
        "Press Play. If playback fails, this stream may not support browser playback."
      );
    });
  }

  video.onerror = () => {
    showStatus(
      "tvMessage",
      "Stream unavailable. Try another channel."
    );
  };

  document.querySelectorAll(".channel-item").forEach(button => {
    button.classList.remove("active");
  });

  const active = [...document.querySelectorAll(".channel-item")]
    .find(button => {
      const item = state.filteredTV[Number(button.dataset.tvIndex)];
      return item === channel;
    });

  active?.classList.add("active");
}

function setupTV() {
  $("tvSearch")?.addEventListener("input", filterTV);
  $("tvCountry")?.addEventListener("change", filterTV);
  $("refreshTV")?.addEventListener("click", loadTV);
}

/* ===================== RADIO ===================== */

async function fetchRadioFromServer(server, path) {
  return fetchJSON(`${server}${path}`, 18000);
}

async function loadRadios() {
  showStatus("radioMessage", "Searching public radio stations...");
  setText("radioCount", "Loading stations...");

  const requests = CONFIG.radioServers.map(async server => {
    const [rwanda, world] = await Promise.all([
      fetchRadioFromServer(
        server,
        "/json/stations/search?countrycode=RW&hidebroken=true&order=clickcount&reverse=true&limit=100"
      ),
      fetchRadioFromServer(
        server,
        "/json/stations/topclick?hidebroken=true&limit=150"
      )
    ]);

    return [...rwanda, ...world];
  });

  try {
    let stations = [];

    for (const request of requests) {
      try {
        stations = await request;
        if (stations.length) break;
      } catch (error) {
        console.warn("Radio server unavailable:", error);
      }
    }

    state.radios = uniqueBy(
      stations
        .filter(station => {
          const url = safeURL(
            station.url_resolved || station.url
          );

          return (
            url &&
            station.lastcheckok === 1 &&
            url.startsWith("https://")
          );
        })
        .map(station => ({
          name: station.name || "Unknown station",
          country: station.country || "Unknown",
          countrycode: station.countrycode || "",
          language: station.language || "",
          tags: station.tags || "",
          url: safeURL(station.url_resolved || station.url),
          homepage: safeURL(station.homepage || ""),
          logo: safeURL(station.favicon || ""),
          codec: station.codec || "",
          bitrate: station.bitrate || "",
          uuid: station.stationuuid
        })),
      station => station.uuid || `${station.name}|${station.url}`
    );

    state.radios.sort((a, b) => {
      if (a.countrycode === "RW" && b.countrycode !== "RW") return -1;
      if (b.countrycode === "RW" && a.countrycode !== "RW") return 1;
      return a.name.localeCompare(b.name);
    });

    populateRadioCountries();
    filterRadios();

    setText(
      "radioCount",
      `${state.radios.length} working-directory stations`
    );

    showStatus(
      "radioMessage",
      "Select a station to listen. Only stations marked online with HTTPS streams are listed."
    );

  } catch (error) {
    console.error("Radio loading error:", error);

    state.radios = [];

    setHTML("radioList", `
      <div class="empty-state">
        <h3>Radio stations unavailable</h3>
        <p>The radio directory could not be reached. Try again later.</p>
        <a href="https://www.radio-browser.info/"
           target="_blank" rel="noopener noreferrer">
          Visit Radio Browser
        </a>
      </div>
    `);

    setText("radioCount", "0 stations loaded");
    showStatus("radioMessage", "Radio directory temporarily unavailable.");
  }
}

function populateRadioCountries() {
  const select = $("radioCountry");
  if (!select) return;

  const previous = select.value || "all";

  const countries = [...new Set(
    state.radios.map(station => station.country)
  )].filter(Boolean).sort();

  select.innerHTML = `
    <option value="all">All countries</option>
    ${countries.map(country => `
      <option value="${escapeHTML(country)}">
        ${escapeHTML(country)}
      </option>
    `).join("")}
  `;

  if (countries.includes(previous)) select.value = previous;
}

function filterRadios() {
  const search = ($("radioSearch")?.value || "").toLowerCase();
  const country = $("radioCountry")?.value || "all";

  state.filteredRadios = state.radios.filter(station => {
    const matchesSearch =
      station.name.toLowerCase().includes(search) ||
      station.country.toLowerCase().includes(search) ||
      station.language.toLowerCase().includes(search) ||
      station.tags.toLowerCase().includes(search);

    const matchesCountry =
      country === "all" || station.country === country;

    return matchesSearch && matchesCountry;
  });

  renderRadios();
}

function renderRadios() {
  if (!state.filteredRadios.length) {
    setHTML("radioList", `
      <div class="empty-state">
        No matching stations were found.
      </div>
    `);
    return;
  }

  setHTML("radioList", state.filteredRadios.slice(0, 200).map((station, index) => `
    <button class="radio-card"
            type="button"
            data-radio-index="${index}">
      <span class="radio-card-art">
        ${station.logo
          ? `<img src="${escapeHTML(station.logo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : "♫"}
      </span>
      <span class="radio-card-info">
        <strong>${escapeHTML(station.name)}</strong>
        <small>${escapeHTML(station.country)}</small>
        <small>${escapeHTML(station.language || "Language not listed")}</small>
      </span>
      <span class="radio-card-play">▶</span>
    </button>
  `).join(""));

  $("radioList")?.querySelectorAll("[data-radio-index]").forEach(button => {
    button.addEventListener("click", () => {
      const station = state.filteredRadios[
        Number(button.dataset.radioIndex)
      ];

      if (station) playRadio(station);
    });
  });
}

async function playRadio(station) {
  const player = $("radioPlayer");

  if (!player) return;

  state.currentRadio = station;

  player.pause();
  player.src = station.url;
  player.load();

  setText("radioNowPlaying", station.name);
  setText(
    "radioMeta",
    `${station.country} · ${station.language || "Language not listed"}`
  );

  showStatus("radioMessage", "Connecting to radio station...");

  try {
    await player.play();

    showStatus(
      "radioMessage",
      "Radio is playing."
    );

    if (station.uuid) {
      const server = CONFIG.radioServers[0];

      fetch(
        `${server}/json/url/${encodeURIComponent(station.uuid)}`
      ).catch(() => {});
    }

  } catch (error) {
    showStatus(
      "radioMessage",
      "Playback failed. This station may have changed its stream address."
    );
  }

  player.onerror = () => {
    showStatus(
      "radioMessage",
      "Radio stream unavailable. Try another station."
    );
  };
}

function setupRadio() {
  $("radioSearch")?.addEventListener("input", filterRadios);
  $("radioCountry")?.addEventListener("change", filterRadios);
  $("refreshRadios")?.addEventListener("click", loadRadios);
}

/* ===================== MOVIES ===================== */

function loadMovies() {
  state.movies = CONFIG.movies;
  renderMovies();
}

function renderMovies() {
  setHTML("movieGrid", state.movies.map((movie, index) => `
    <article class="movie-card">
      <button class="movie-card-button"
              type="button"
              data-movie-index="${index}">
        <div class="movie-poster">
          <img src="${escapeHTML(movie.image)}"
               alt="${escapeHTML(movie.title)}"
               loading="lazy"
               onerror="this.style.display='none'">
          <span class="movie-play">▶</span>
        </div>
        <div class="movie-card-content">
          <span class="eyebrow">${escapeHTML(movie.category)}</span>
          <h3>${escapeHTML(movie.title)}</h3>
          <p>${escapeHTML(movie.year)}</p>
          <small>${escapeHTML(movie.description)}</small>
        </div>
      </button>
    </article>
  `).join(""));

  $("movieGrid")?.querySelectorAll("[data-movie-index]").forEach(button => {
    button.addEventListener("click", () => {
      const movie = state.movies[
        Number(button.dataset.movieIndex)
      ];

      if (movie) playMovie(movie);
    });
  });
}

function playMovie(movie) {
  const player = $("moviePlayer");

  if (!player) return;

  const url = safeURL(movie.video);
  if (!url) return;

  state.currentMovie = movie;

  player.pause();
  player.src = url;
  player.load();

  $("moviePlaceholder")?.classList.add("hidden");

  setText("movieNowPlaying", movie.title);
  showStatus(
    "movieMessage",
    "Loading film..."
  );

  player.play().then(() => {
    showStatus("movieMessage", "Film is playing.");
  }).catch(() => {
    showStatus(
      "movieMessage",
      "Press Play to start this film."
    );
  });

  player.onerror = () => {
    showStatus(
      "movieMessage",
      "This sample film is temporarily unavailable."
    );
  };

  $("movies")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ===================== PLAYER CLEANUP ===================== */

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Do not automatically stop radio or TV.
    // The user controls playback.
  }
});

window.addEventListener("beforeunload", () => {
  if (state.hls) {
    state.hls.destroy();
  }
});

/* ===================== INITIALIZATION ===================== */

async function startITTV() {
  setupNavigation();
  setupNews();
  setupTV();
  setupRadio();
  loadMovies();

  // Load independent sections together.
  await Promise.allSettled([
    loadNews(),
    loadTV(),
    loadRadios()
  ]);

  console.log("ITT-TV initialized successfully.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startITTV);
} else {
  startITTV();
}
