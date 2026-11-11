
"use strict";

/* =========================================
   ITT NEWS - COMPLETE MEDIA APPLICATION
========================================= */

const $ = id => document.getElementById(id);

const state = {
  news: [],
  tv: [],
  radio: [],
  movies: [],
  newsLimit: 12,
  tvLimit: 24,
  radioLimit: 24,
  movieLimit: 20,
  hls: null
};

const NEWS_FEEDS = [
  {name:"RBA Rwanda", region:"Rwanda", url:"https://www.rba.co.rw/news"},
  {name:"The New Times Rwanda", region:"Rwanda", url:"https://www.newtimes.co.rw/rssFeed/14"},
  {name:"Kigali Today", region:"Rwanda", url:"https://www.kigalitoday.com/spip.php?page=backend"},
  {name:"BBC World", region:"World", url:"https://feeds.bbci.co.uk/news/world/rss.xml"},
  {name:"Al Jazeera", region:"World", url:"https://www.aljazeera.com/xml/rss/all.xml"},
  {name:"DW News", region:"World", url:"https://rss.dw.com/rdf/rss-en-all"}
];

const OFFICIAL_LINKS = {
  "Rwanda TV":"https://www.rba.co.rw/",
  "TV10":"https://www.radiotv10.rw/",
  "Radio 10":"https://radiotv10.rw/radio/",
  "KT Radio":"https://www.ktradio.rw/",
  "RBA":"https://www.rba.co.rw/"
};

function escapeHTML(value="") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  })[c]);
}

function setStatus(id, message) {
  $(id).textContent = message;
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Request failed: " + response.status);
  return response.json();
}

function showEmpty(id, message) {
  $(id).innerHTML = `<div class="empty">${escapeHTML(message)}</div>`;
}

/* =============== NAVIGATION =============== */

function showPage(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  $("mainNav").classList.remove("open");
  window.scrollTo({top:0, behavior:"smooth"});
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

/* =============== NEWS =============== */

async function loadNews() {
  setStatus("newsStatus", "Loading Rwanda and international news...");
  $("newsGrid").innerHTML = "";

  const results = [];

  for (const feed of NEWS_FEEDS) {
    try {
      const proxy = "https://api.rss2json.com/v1/api.json?rss_url=" +
        encodeURIComponent(feed.url);

      const data = await getJSON(proxy);

      if (Array.isArray(data.items)) {
        data.items.forEach(item => {
          results.push({
            title: item.title || "News",
            description: (item.description || item.content || "")
              .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
            link: item.link || feed.url,
            date: item.pubDate || "",
            source: feed.name,
            region: feed.region
          });
        });
      }
    } catch (error) {
      console.warn("News feed unavailable:", feed.name, error);
    }
  }

  const seen = new Set();
  state.news = results.filter(item => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  state.news.sort((a,b) => new Date(b.date) - new Date(a.date));
  state.newsLimit = 12;
  renderNews();

  setStatus(
    "newsStatus",
    state.news.length
      ? `${state.news.length} news stories loaded.`
      : "News feeds did not respond. Check your internet and try Refresh."
  );
}

function renderNews() {
  const query = $("newsSearch").value.toLowerCase().trim();
  const category = $("newsCategory").value;

  const filtered = state.news.filter(item =>
    (item.title + " " + item.description + " " + item.source)
      .toLowerCase().includes(query) &&
    (category === "all" || item.region === category)
  );

  const visible = filtered.slice(0, state.newsLimit);

  $("newsGrid").innerHTML = visible.map(item => `
    <article class="news-card">
      <span class="source">${escapeHTML(item.region)} • ${escapeHTML(item.source)}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.description.slice(0,190))}</p>
      <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer">
        Read full story ↗
      </a>
    </article>
  `).join("");

  if (!visible.length) showEmpty("newsGrid", "No news found. Try another search.");
  $("moreNews").hidden = visible.length >= filtered.length;
}

$("newsSearch").addEventListener("input", renderNews);
$("newsCategory").addEventListener("change", renderNews);
$("moreNews").addEventListener("click", () => {
  state.newsLimit += 12;
  renderNews();
});
$("refreshNews").addEventListener("click", loadNews);

/* =============== LIVE TV =============== */

async function loadTV() {
  setStatus("tvStatus", "Searching live TV channels...");
  $("tvGrid").innerHTML = "";

  try {
    const [channels, streams] = await Promise.all([
      getJSON("https://iptv-org.github.io/api/channels.json"),
      getJSON("https://iptv-org.github.io/api/streams.json")
    ]);

    const channelMap = new Map(channels.map(channel => [channel.id, channel]));

    state.tv = streams
      .filter(stream => stream.channel && stream.url)
      .map(stream => {
        const channel = channelMap.get(stream.channel) || {};
        return {
          id: stream.channel,
          name: channel.name || stream.channel,
          country: channel.country || "",
          logo: channel.logo || "",
          url: stream.url,
          website: channel.website || ""
        };
      });

    state.tv.sort((a,b) => {
      const aRwanda = a.country === "RW" ? 0 : 1;
      const bRwanda = b.country === "RW" ? 0 : 1;
      return aRwanda - bRwanda || a.name.localeCompare(b.name);
    });

    state.tvLimit = 24;
    renderTV();

    setStatus("tvStatus", `${state.tv.length} channels found. Rwanda channels are shown first.`);
  } catch (error) {
    console.error(error);
    setStatus("tvStatus", "Could not connect to the TV channel directory.");
    showEmpty("tvGrid", "TV list unavailable. Check your connection and press Refresh.");
  }
}

function renderTV() {
  const query = $("tvSearch").value.toLowerCase().trim();
  const region = $("tvRegion").value;

  const filtered = state.tv.filter(channel =>
    (channel.name + " " + channel.country).toLowerCase().includes(query) &&
    (region === "all" || channel.country === region)
  );

  const visible = filtered.slice(0, state.tvLimit);

  $("tvGrid").innerHTML = visible.map(channel => {
    const originalIndex = state.tv.indexOf(channel);
    const logo = channel.logo
      ? `<img src="${escapeHTML(channel.logo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : "📺";

    return `
      <article class="media-card">
        <div class="media-thumb">${logo}</div>
        <h3>${escapeHTML(channel.name)}</h3>
        <p>${channel.country === "RW" ? "🇷🇼 Rwanda" : escapeHTML(channel.country || "International")}</p>
        <button class="card-action" data-tv="${originalIndex}">▶ Watch here</button>
      </article>
    `;
  }).join("");

  if (!visible.length) showEmpty("tvGrid", "No channels found for this search.");

  $("moreTV").hidden = visible.length >= filtered.length;

  document.querySelectorAll("[data-tv]").forEach(button => {
    button.addEventListener("click", () => {
      playTV(state.tv[Number(button.dataset.tv)]);
    });
  });
}

function stopHLS() {
  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }
}

function playTV(channel) {
  if (!channel) return;

  const player = $("tvPlayer");
  stopHLS();

  player.pause();
  player.removeAttribute("src");
  player.load();

  $("tvNow").textContent = channel.name;
  setStatus("tvStatus", "Connecting to " + channel.name + "...");

  const fallback = channel.website ||
    OFFICIAL_LINKS[channel.name] || "";

  $("tvExternal").hidden = !fallback;
  if (fallback) $("tvExternal").href = fallback;

  const url = channel.url;

  player.onerror = () => {
    setStatus("tvStatus", "This stream could not play in the browser. Try the broadcaster website link.");
  };

  if (url.includes(".m3u8") && window.Hls && Hls.isSupported()) {
    state.hls = new Hls({
      enableWorker:true,
      lowLatencyMode:true
    });

    state.hls.loadSource(url);
    state.hls.attachMedia(player);

    state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      player.play().then(() => {
        setStatus("tvStatus", "Playing " + channel.name);
      }).catch(() => {
        setStatus("tvStatus", "Press Play in the video player.");
      });
    });

    state.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        setStatus("tvStatus", "The channel stream is unavailable or blocked.");
      }
    });

  } else {
    player.src = url;
    player.play().then(() => {
      setStatus("tvStatus", "Playing " + channel.name);
    }).catch(() => {
      setStatus("tvStatus", "Press Play. This stream may not support browser playback.");
    });
  }
}

$("tvSearch").addEventListener("input", renderTV);
$("tvRegion").addEventListener("change", renderTV);
$("moreTV").addEventListener("click", () => {
  state.tvLimit += 24;
  renderTV();
});
$("refreshTV").addEventListener("click", loadTV);

/* =============== RADIO =============== */

async function loadRadio() {
  setStatus("radioStatus", "Searching radio stations...");
  $("radioGrid").innerHTML = "";

  try {
    const countryCode = $("radioRegion").value;
    const endpoint = countryCode === "RW"
      ? "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/RW?limit=300&hidebroken=true&order=clickcount&reverse=true"
      : "https://de1.api.radio-browser.info/json/stations/search?limit=300&hidebroken=true&order=clickcount&reverse=true";

    const stations = await getJSON(endpoint);

    state.radio = stations
      .filter(station => station.url_resolved || station.url)
      .map(station => ({
        name: station.name || "Radio station",
        country: station.country || "International",
        language: station.language || "",
        logo: station.favicon || "",
        url: station.url_resolved || station.url,
        homepage: station.homepage || ""
      }));

    state.radioLimit = 24;
    renderRadio();

    setStatus("radioStatus", `${state.radio.length} radio stations found.`);
  } catch (error) {
    console.error(error);
    setStatus("radioStatus", "Radio directory could not be reached. Try Refresh.");
    showEmpty("radioGrid", "Radio list unavailable.");
  }
}

function renderRadio() {
  const query = $("radioSearch").value.toLowerCase().trim();

  const filtered = state.radio.filter(station =>
    (station.name + " " + station.country + " " + station.language)
      .toLowerCase().includes(query)
  );

  const visible = filtered.slice(0, state.radioLimit);

  $("radioGrid").innerHTML = visible.map(station => {
    const index = state.radio.indexOf(station);
    const logo = station.logo
      ? `<img src="${escapeHTML(station.logo)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : "📻";

    return `
      <article class="media-card">
        <div class="media-thumb">${logo}</div>
        <h3>${escapeHTML(station.name)}</h3>
        <p>${escapeHTML(station.country)} ${station.language ? "• " + escapeHTML(station.language) : ""}</p>
        <button class="card-action" data-radio="${index}">▶ Listen here</button>
      </article>
    `;
  }).join("");

  if (!visible.length) showEmpty("radioGrid", "No stations found.");

  $("moreRadio").hidden = visible.length >= filtered.length;

  document.querySelectorAll("[data-radio]").forEach(button => {
    button.addEventListener("click", () => {
      playRadio(state.radio[Number(button.dataset.radio)]);
    });
  });
}

function playRadio(station) {
  if (!station) return;

  const player = $("radioPlayer");
  player.pause();
  player.src = station.url;
  player.load();

  $("radioNow").textContent = station.name;
  setStatus("radioStatus", "Connecting to " + station.name + "...");

  $("radioExternal").hidden = !station.homepage;
  if (station.homepage) $("radioExternal").href = station.homepage;

  player.play().then(() => {
    setStatus("radioStatus", "Now playing: " + station.name);
  }).catch(() => {
    setStatus("radioStatus", "Press Play. If it still fails, the station may be offline or block browser playback.");
  });
}

$("radioSearch").addEventListener("input", renderRadio);
$("radioRegion").addEventListener("change", loadRadio);
$("moreRadio").addEventListener("click", () => {
  state.radioLimit += 24;
  renderRadio();
});
$("refreshRadio").addEventListener("click", loadRadio);

/* =============== MOVIES =============== */

async function loadMovies() {
  setStatus("movieStatus", "Searching movie library...");
  $("movieGrid").innerHTML = "";

  try {
    const searchTerm =
      'mediatype:movies AND collection:classic_cinema';

    const url =
      "https://archive.org/advancedsearch.php?q=" +
      encodeURIComponent(searchTerm) +
      "&fl[]=identifier&fl[]=title&fl[]=description&rows=80&page=1&output=json";

    const data = await getJSON(url);

    state.movies = (data.response?.docs || []).map(movie => ({
      id:movie.identifier,
      title:movie.title || movie.identifier,
      description:typeof movie.description === "string"
        ? movie.description
        : "Film from the Internet Archive collection.",
      image:"https://archive.org/services/img/" +
        encodeURIComponent(movie.identifier)
    }));

    state.movieLimit = 20;
    renderMovies();

    setStatus("movieStatus", `${state.movies.length} film entries found.`);
  } catch (error) {
    console.error(error);
    setStatus("movieStatus", "Movie library could not be reached. Try Refresh.");
    showEmpty("movieGrid", "Movies are currently unavailable.");
  }
}

function renderMovies() {
  const query = $("movieSearch").value.toLowerCase().trim();

  const filtered = state.movies.filter(movie =>
    movie.title.toLowerCase().includes(query)
  );

  const visible = filtered.slice(0, state.movieLimit);

  $("movieGrid").innerHTML = visible.map(movie => {
    const index = state.movies.indexOf(movie);

    return `
      <article class="media-card">
        <div class="media-thumb">
          <img src="${escapeHTML(movie.image)}" alt="" loading="lazy"
            onerror="this.style.display='none'">
        </div>
        <h3>${escapeHTML(movie.title)}</h3>
        <p>${escapeHTML(movie.description.slice(0,110))}</p>
        <button class="card-action" data-movie="${index}">▶ Play movie</button>
      </article>
    `;
  }).join("");

  if (!visible.length) showEmpty("movieGrid", "No movies found.");

  $("moreMovies").hidden = visible.length >= filtered.length;

  document.querySelectorAll("[data-movie]").forEach(button => {
    button.addEventListener("click", () => {
      playMovie(state.movies[Number(button.dataset.movie)]);
    });
  });
}

async function playMovie(movie) {
  if (!movie) return;

  const player = $("moviePlayer");
  $("movieNow").textContent = movie.title;
  setStatus("movieStatus", "Checking available video files...");

  player.pause();
  player.removeAttribute("src");
  player.load();

  try {
    const metadata = await getJSON(
      "https://archive.org/metadata/" + encodeURIComponent(movie.id)
    );

    const files = metadata.files || [];

    const playable = files.find(file =>
      /\.(mp4|m4v|webm)$/i.test(file.name || "") &&
      Number(file.size || 0) > 500000
    );

    if (!playable) {
      setStatus("movieStatus", "No browser-compatible video file was found. Try another movie.");
      return;
    }

    const filePath = playable.name.split("/")
      .map(part => encodeURIComponent(part)).join("/");

    player.src = "https://archive.org/download/" +
      encodeURIComponent(movie.id) + "/" + filePath;

    player.load();

    player.play().then(() => {
      setStatus("movieStatus", "Movie is playing.");
    }).catch(() => {
      setStatus("movieStatus", "Press Play in the video player.");
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

/* =============== START =============== */

function startITTNews() {
  showPage("home");

  loadNews();
  loadTV();
  loadRadio();
  loadMovies();
}

startITTNews();
