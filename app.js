
"use strict";

const $ = id => document.getElementById(id);

const toast = message => {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
};

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

const safeUrl = value => {
  try {
    const url = new URL(value);
    return ["https:","http:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
};

$("todayDate").textContent =
  new Intl.DateTimeFormat("en", {dateStyle:"medium"}).format(new Date());

$("year").textContent = new Date().getFullYear();

/* NAVIGATION */
function showPage(page) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.toggle("active-page", section.id === page);
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  $("mainNav").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});

  if (location.hash !== "#" + page) {
    history.replaceState(null,"","#" + page);
  }
}

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", event => {
    const id = link.getAttribute("href").slice(1);
    const target = $(id);

    if (target && target.classList.contains("page-section")) {
      event.preventDefault();
      showPage(id);
    }
  });
});

$("menuToggle").addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

const firstPage = location.hash.slice(1);
if ($(firstPage)?.classList.contains("page-section")) {
  showPage(firstPage);
}

/* NEWS */
const RSS_API =
  "https://api.rss2json.com/v1/api.json?rss_url=";

const newsFeeds = {
  rwanda: [
    "https://www.newtimes.co.rw/rss.xml"
  ],
  world: [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://www.aljazeera.com/xml/rss/all.xml"
  ],
  sports: [
    "https://feeds.bbci.co.uk/sport/rss.xml",
    "https://www.espn.com/espn/rss/news"
  ]
};

let allNews = [];
let allSports = [];

async function readFeed(url, source) {
  const response = await fetch(
    RSS_API + encodeURIComponent(url)
  );

  if (!response.ok) {
    throw new Error("Feed unavailable");
  }

  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error("Feed unavailable");
  }

  return (data.items || []).map(item => ({
    title: item.title || "Untitled story",
    description: (item.description || item.content || "")
      .replace(/<[^>]*>/g," ")
      .replace(/\s+/g," ")
      .slice(0,190),
    link: safeUrl(item.link),
    image: safeUrl(
      item.thumbnail || item.enclosure?.link || ""
    ),
    date: item.pubDate || "",
    source,
    category: source.toLowerCase()
  })).filter(item => item.link !== "#");
}

function newsCard(item) {
  const image =
    item.image && item.image !== "#"
      ? `<img src="${escapeHTML(item.image)}" alt="" loading="lazy" onerror="this.remove()">`
      : "▤";

  return `
    <article class="news-card">
      <div class="news-image">${image}</div>
      <div class="news-content">
        <span class="news-meta">
          ${escapeHTML(item.source)}
          ${item.date ? " • " + escapeHTML(new Date(item.date).toLocaleDateString()) : ""}
        </span>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener">
          Read at publisher ↗
        </a>
      </div>
    </article>
  `;
}

async function loadNews() {
  $("newsStatus").textContent = "Fetching headlines...";

  $("homeNews").innerHTML =
    '<div class="loading-card">Loading headlines...</div>';

  const tasks = [
    ...newsFeeds.rwanda.map(url => readFeed(url,"Rwanda")),
    ...newsFeeds.world.map(url => readFeed(url,"World"))
  ];

  const results = await Promise.allSettled(tasks);

  allNews = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  allNews = [
    ...new Map(allNews.map(item => [item.link,item])).values()
  ].sort((a,b) => new Date(b.date) - new Date(a.date));

  renderNews();

  $("newsStatus").textContent = allNews.length
    ? `${allNews.length} headlines loaded.`
    : "News feeds are unavailable. Check your connection and try again.";
}

function renderNews() {
  const query = ($("newsSearch").value || "").toLowerCase();
  const region = $("newsRegion").value;

  const list = allNews.filter(item => {
    const matchesRegion =
      region === "all" || item.category === region;

    const matchesQuery =
      (item.title + " " + item.description)
        .toLowerCase().includes(query);

    return matchesRegion && matchesQuery;
  });

  $("newsGrid").innerHTML = list.length
    ? list.map(newsCard).join("")
    : '<div class="empty-card">No matching news found.</div>';

  $("homeNews").innerHTML = allNews.length
    ? allNews.slice(0,3).map(newsCard).join("")
    : '<div class="empty-card">Headlines will appear when feeds are available.</div>';
}

$("newsSearch").addEventListener("input",renderNews);
$("newsRegion").addEventListener("change",renderNews);
$("refreshNews").addEventListener("click",loadNews);

/* SPORTS */
async function loadSports() {
  $("sportsStatus").textContent = "Fetching sports headlines...";

  const results = await Promise.allSettled(
    newsFeeds.sports.map(url => readFeed(url,"Sports"))
  );

  allSports = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value);

  allSports = [
    ...new Map(allSports.map(item => [item.link,item])).values()
  ];

  renderSports();

  $("sportsStatus").textContent = allSports.length
    ? `${allSports.length} sports stories loaded.`
    : "Sports feeds are unavailable right now.";
}

function renderSports() {
  const query = ($("sportsSearch").value || "").toLowerCase();

  const list = allSports.filter(item =>
    (item.title + " " + item.description)
      .toLowerCase().includes(query)
  );

  $("sportsGrid").innerHTML = list.length
    ? list.map(newsCard).join("")
    : '<div class="empty-card">No sports stories available.</div>';
}

$("sportsSearch").addEventListener("input",renderSports);
$("refreshSports").addEventListener("click",loadSports);

/* TV CHANNELS */
const rwandaChannels = [
  {
    name:"Rwanda TV / RTV",
    type:"RBA official live page",
    url:"https://www.rba.co.rw/tv",
    note:"RBA official television page"
  },
  {
    name:"KC2",
    type:"RBA channel",
    url:"https://www.rba.co.rw/",
    note:"Check RBA official channel directory"
  },
  {
    name:"Magic Sports TV",
    type:"RBA channel",
    url:"https://www.rba.co.rw/",
    note:"RBA broadcaster directory"
  },
  {
    name:"TV10 Rwanda",
    type:"Official website",
    url:"https://radiotv10.rw/",
    note:"TV10 official website"
  },
  {
    name:"TV1 Rwanda",
    type:"Official website",
    url:"https://tv1.rw/",
    note:"TV1 official website"
  },
  {
    name:"Isibo TV",
    type:"Official website",
    url:"https://isibo.tv/",
    note:"Isibo TV official website"
  },
  {
    name:"BTN TV",
    type:"Official website",
    url:"https://btn.tv/",
    note:"BTN TV official website"
  },
  {
    name:"ZACU TV",
    type:"Official channel page",
    url:"https://www.canalplus.com/rw/chaines/zacu-tv",
    note:"May require a subscription or provider"
  }
];

const internationalChannels = [
  {
    name:"Al Jazeera English",
    type:"Official live page",
    url:"https://www.aljazeera.com/video/live/"
  },
  {
    name:"France 24 English",
    type:"Official live page",
    url:"https://www.france24.com/en/live"
  },
  {
    name:"DW News",
    type:"Official live page",
    url:"https://www.dw.com/en/live-tv/s-100825"
  },
  {
    name:"BBC News",
    type:"Official website",
    url:"https://www.bbc.com/news"
  },
  {
    name:"Africanews",
    type:"Official website",
    url:"https://www.africanews.com/"
  }
];

function openTV(channel) {
  $("tvNowPlaying").textContent = channel.name;
  $("tvMessage").textContent =
    channel.note || "Opening official broadcaster page.";

  $("tvExternal").href = channel.url;
  $("tvExternal").hidden = false;

  $("tvVideo").pause();
  $("tvVideo").removeAttribute("src");
  $("tvVideo").load();
  $("tvVideo").classList.remove("show");

  $("tvFrame").classList.remove("show");
  $("tvFrame").src = "about:blank";

  $("tvPlaceholder").style.display = "flex";

  $("tvMessage").textContent =
    "This channel has no verified public embeddable stream configured. Use the official channel link.";

  window.open(channel.url,"_blank","noopener");
  toast("Opening the official TV channel page.");
}

function channelButton(channel) {
  return `
    <div class="channel-row">
      <div>
        <strong>${escapeHTML(channel.name)}</strong>
        <small>${escapeHTML(channel.type)}</small>
      </div>
      <button type="button" data-tv="${escapeHTML(channel.name)}">
        Open
      </button>
    </div>
  `;
}

$("rwandaTvList").innerHTML =
  rwandaChannels.map(channelButton).join("");

function renderInternationalTV() {
  const query = ($("tvSearch").value || "").toLowerCase();

  const list = internationalChannels.filter(channel =>
    channel.name.toLowerCase().includes(query)
  );

  $("internationalTvList").innerHTML = list.map(channel => `
    <article class="channel-card">
      <div class="channel-symbol">▣</div>
      <h3>${escapeHTML(channel.name)}</h3>
      <p>${escapeHTML(channel.type)}</p>
      <button class="play-small" data-tv="${escapeHTML(channel.name)}">
        Open official page ↗
      </button>
    </article>
  `).join("");
}

function findTV(name) {
  return [...rwandaChannels,...internationalChannels]
    .find(channel => channel.name === name);
}

document.addEventListener("click",event => {
  const button = event.target.closest("[data-tv]");
  if (!button) return;

  const channel = findTV(button.dataset.tv);
  if (channel) openTV(channel);
});

$("tvSearch").addEventListener("input",renderInternationalTV);
renderInternationalTV();

/* RADIO */
let radioStations = [];
const radioPlayer = $("radioPlayer");

async function loadRadio() {
  $("radioStatus").textContent = "Finding Rwanda radio stations...";

  try {
    const response = await fetch(
      "https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/RW?hidebroken=true&order=clickcount&reverse=true&limit=100"
    );

    if (!response.ok) {
      throw new Error("Radio directory unavailable");
    }

    const stations = await response.json();

    radioStations = stations
      .filter(station => station.url_resolved && station.name)
      .map(station => ({
        name:station.name,
        city:station.state || station.language || "Rwanda",
        url:station.url_resolved,
        codec:station.codec || ""
      }));

    renderRadio();

    $("radioStatus").textContent = radioStations.length
      ? `${radioStations.length} stations found. Select Play.`
      : "No stations are available right now.";

  } catch(error) {
    $("radioStatus").textContent =
      "Could not load radio stations. Check your internet connection.";

    $("radioGrid").innerHTML =
      '<div class="empty-card">Radio directory is unavailable.</div>';
  }
}

function playRadio(station) {
  radioPlayer.pause();
  radioPlayer.src = station.url;
  radioPlayer.load();

  radioPlayer.play().then(() => {
    $("radioNowPlaying").textContent = station.name;
    $("radioDescription").textContent = station.city;
    $("radioStatus").textContent = "Playing: " + station.name;
  }).catch(() => {
    $("radioNowPlaying").textContent = station.name;
    $("radioStatus").textContent =
      "This station may be offline or block browser playback.";

    toast("Station could not play. Try another station.");
  });
}

function renderRadio() {
  const query = ($("radioSearch").value || "").toLowerCase();

  const list = radioStations.filter(station =>
    (station.name + " " + station.city)
      .toLowerCase().includes(query)
  );

  $("radioGrid").innerHTML = list.length
    ? list.map((station,index) => `
      <article class="radio-card">
        <div class="radio-logo">♫</div>
        <div>
          <h3>${escapeHTML(station.name)}</h3>
          <p>${escapeHTML(station.city)}</p>
        </div>
        <button class="play-small" data-radio="${index}">
          Play
        </button>
      </article>
    `).join("")
    : '<div class="empty-card">No matching radio stations.</div>';
}

$("radioGrid").addEventListener("click",event => {
  const button = event.target.closest("[data-radio]");
  if (!button) return;

  const query = ($("radioSearch").value || "").toLowerCase();

  const visible = radioStations.filter(station =>
    (station.name + " " + station.city)
      .toLowerCase().includes(query)
  );

  const station = visible[Number(button.dataset.radio)];
  if (station) playRadio(station);
});

$("radioSearch").addEventListener("input",renderRadio);
$("refreshRadio").addEventListener("click",loadRadio);

/* MOVIES */
const movies = [
  {
    title:"Big Buck Bunny",
    origin:"International",
    genre:["Animation","Comedy","Family"],
    year:"2008",
    description:"Openly licensed animated film by Blender Foundation.",
    embed:"https://archive.org/embed/BigBuckBunny",
    source:"https://peach.blender.org/",
    license:"CC BY 3.0"
  },
  {
    title:"Sintel",
    origin:"International",
    genre:["Animation","Adventure","Drama"],
    year:"2010",
    description:"Fantasy animation from the Blender Foundation.",
    embed:"https://archive.org/embed/sintel-1280-stereo",
    source:"https://durian.blender.org/",
    license:"CC BY 3.0"
  },
  {
    title:"Tears of Steel",
    origin:"International",
    genre:["Science Fiction","Action"],
    year:"2012",
    description:"Science-fiction film from the Blender Foundation.",
    embed:"https://archive.org/embed/tearsofsteel",
    source:"https://mango.blender.org/",
    license:"CC BY 3.0"
  },
  {
    title:"Elephants Dream",
    origin:"International",
    genre:["Animation","Drama"],
    year:"2006",
    description:"Open movie project from Blender Foundation.",
    embed:"https://archive.org/embed/elephantsdream",
    source:"https://orange.blender.org/",
    license:"CC BY 2.5"
  },
  {
    title:"The Adventures of Prince Achmed",
    origin:"International",
    genre:["Animation","Adventure","Family"],
    year:"1926",
    description:"Classic silhouette animation. Check edition rights.",
    embed:"https://archive.org/embed/adventuresofprinceachmed",
    source:"https://archive.org/details/adventuresofprinceachmed",
    license:"Archive listing"
  },
  {
    title:"Gertie the Dinosaur",
    origin:"International",
    genre:["Animation","Comedy","Family"],
    year:"1914",
    description:"Historic animated short film.",
    embed:"https://archive.org/embed/gertiethedinosaur",
    source:"https://archive.org/details/gertiethedinosaur",
    license:"Archive listing"
  },
  {
    title:"The General",
    origin:"International",
    genre:["Comedy","Action","Adventure"],
    year:"1926",
    description:"Silent-era comedy adventure classic.",
    embed:"https://archive.org/embed/TheGeneral1926",
    source:"https://archive.org/",
    license:"Archive listing"
  },
  {
    title:"His Girl Friday",
    origin:"International",
    genre:["Comedy","Drama"],
    year:"1940",
    description:"Classic newsroom comedy.",
    embed:"https://archive.org/embed/his_girl_friday",
    source:"https://archive.org/",
    license:"Archive listing"
  },
  {
    title:"Rwandan Films & Series",
    origin:"Rwanda",
    genre:["Rwandan Cinema","Drama"],
    year:"Various",
    description:"Browse films published by Rwandan creators.",
    source:"https://amashusho.com/"
  },
  {
    title:"Rwandaflix Collection",
    origin:"Rwanda",
    genre:["Rwandan Cinema","Comedy","Drama"],
    year:"Various",
    description:"Explore Kinyarwanda films and productions.",
    source:"https://www.rwandaflix.com/"
  },
  {
    title:"Rwandan Film Stories",
    origin:"Rwanda",
    genre:["Rwandan Cinema","Documentary"],
    year:"Various",
    description:"Discover Rwandan audiovisual stories.",
    source:"https://amashusho.com/"
  }
];

function renderMovies() {
  const query = ($("movieSearch").value || "").toLowerCase();
  const genre = $("movieGenre").value;
  const origin = $("movieOrigin").value;

  const list = movies.filter(movie => {
    const matchesText =
      (movie.title + " " + movie.description + " " + movie.genre.join(" "))
        .toLowerCase().includes(query);

    const matchesGenre =
      genre === "all" || movie.genre.includes(genre);

    const matchesOrigin =
      origin === "all" || movie.origin === origin;

    return matchesText && matchesGenre && matchesOrigin;
  });

  $("movieGrid").innerHTML = list.map(movie => `
    <article class="movie-card">
      <div class="movie-poster">
        <span>${escapeHTML(movie.origin)}</span>
        ▶
      </div>

      <div class="movie-details">
        <h3>${escapeHTML(movie.title)}</h3>
        <p>${escapeHTML(movie.description)}</p>

        <div class="movie-tags">
          ${movie.genre.slice(0,3).map(genre =>
            `<span>${escapeHTML(genre)}</span>`
          ).join("")}
          <span>${escapeHTML(movie.year)}</span>
        </div>

        ${movie.embed
          ? `<button class="btn btn-primary" data-movie="${movies.indexOf(movie)}">Play in Player</button>`
          : `<a class="btn btn-outline" href="${escapeHTML(movie.source)}" target="_blank" rel="noopener">Official Platform ↗</a>`
        }
      </div>
    </article>
  `).join("") || '<div class="empty-card">No movies match your filters.</div>';
}

function playMovie(movie) {
  $("movieNowPlaying").textContent = movie.title;
  $("movieSource").href = movie.source;
  $("movieSource").hidden = false;

  if (movie.embed) {
    $("movieFrame").src = movie.embed;
    $("movieFrame").classList.add("show");
    $("moviePlaceholder").style.display = "none";

    $("movieMessage").textContent =
      `${movie.license || "Publisher playback"}. Content is provided by the source platform.`;

  } else {
    $("movieFrame").src = "about:blank";
    $("movieFrame").classList.remove("show");
    $("moviePlaceholder").style.display = "flex";

    $("movieMessage").textContent =
      "This film opens on its official publisher platform.";

    window.open(movie.source,"_blank","noopener");
  }
}

$("movieGrid").addEventListener("click",event => {
  const button = event.target.closest("[data-movie]");
  if (!button) return;

  const movie = movies[Number(button.dataset.movie)];
  if (movie) playMovie(movie);
});

$("movieSearch").addEventListener("input",renderMovies);
$("movieGenre").addEventListener("change",renderMovies);
$("movieOrigin").addEventListener("change",renderMovies);

/* INITIAL LOAD */
renderMovies();
loadNews();
loadSports();
loadRadio();
