"use strict";

/* =========================================================
   ITT NEWS - MAIN APPLICATION
   News, Sports, Live TV, Radio, Movies and 12 languages
   ========================================================= */

const NEWS_PER_PAGE = 10;
const MAX_NEWS_PAGES = 30;

const NEWS_FEEDS = {
  world: "https://feeds.bbci.co.uk/news/world/rss.xml",
  africa: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
  business: "https://feeds.bbci.co.uk/news/business/rss.xml",
  technology: "https://feeds.bbci.co.uk/news/technology/rss.xml",
  sports: "https://feeds.bbci.co.uk/sport/rss.xml"
};

/*
  IMPORTANT:
  streamUrl must be a direct authorized stream URL.
  For TV, use a compatible HLS .m3u8 URL or MP4 stream.
  For radio, use a direct MP3/AAC audio stream.
  Official website links are not direct stream URLs.
*/

const TV_CHANNELS = [
  {
    name: "RBA TV",
    country: "Rwanda",
    logo: "https://www.google.com/s2/favicons?domain=rba.co.rw&sz=128",
    streamUrl: "",
    website: "https://www.rba.co.rw/tv"
  },
  {
    name: "Flash TV",
    country: "Rwanda",
    logo: "https://www.google.com/s2/favicons?domain=flash.rw&sz=128",
    streamUrl: "",
    website: "https://flash.rw/flash-tv-live/"
  },
  {
    name: "TV10",
    country: "Rwanda",
    logo: "https://www.google.com/s2/favicons?domain=radiotv10.rw&sz=128",
    streamUrl: "",
    website: "https://radiotv10.rw/tvpage/"
  }
];

const RADIO_STATIONS = [
  {
    name: "Radio 10",
    country: "Rwanda",
    logo: "https://www.google.com/s2/favicons?domain=radiotv10.rw&sz=128",
    streamUrl: "",
    website: "https://radiotv10.rw/radio/"
  },
  {
    name: "KT Radio",
    country: "Rwanda",
    logo: "https://www.google.com/s2/favicons?domain=ktradio.rw&sz=128",
    streamUrl: "",
    website: "https://ktradio.rw/"
  },
  {
    name: "Isango Star",
    country: "Rwanda",
    logo: "https://www.google.com/s2/favicons?domain=isangostar.rw&sz=128",
    streamUrl: "",
    website: "https://isangostar.rw/"
  },
  {
    name: "Flash Radio",
    country: "Rwanda",
    logo: "https://www.google.com/s2/favicons?domain=flash.rw&sz=128",
    streamUrl: "",
    website: "https://flash.rw/"
  }
];

/*
  These are publicly viewable open-movie examples.
  The YouTube videos are embedded in the ITT NEWS movie player.
  If a publisher changes or disables an embed, it may stop working.
*/

const MOVIES = [
  {
    title: "Big Buck Bunny",
    year: 2008,
    category: "Animation",
    description: "An animated comedy short film from the Blender open-movie project.",
    image: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg",
    youtubeId: "aqz-KE-bpKQ",
    source: "Blender open movie"
  },
  {
    title: "Sintel",
    year: 2010,
    category: "Animation",
    description: "An animated fantasy adventure from the Blender open-movie project.",
    image: "https://durian.blender.org/wp-content/uploads/2010/06/sintel_poster.jpg",
    youtubeId: "eRsGyueVLvQ",
    source: "Blender open movie"
  },
  {
    title: "Tears of Steel",
    year: 2012,
    category: "Science Fiction",
    description: "A science-fiction short film created by the Blender open-movie team.",
    image: "https://mango.blender.org/wp-content/uploads/2013/05/tears_of_steel_ poster.jpg",
    youtubeId: "R6MlUcmOul8",
    source: "Blender open movie"
  }
];

/* -------------------- LANGUAGE SUPPORT -------------------- */

const TRANSLATIONS = {
  en: {
    home: "Home", news: "News", sports: "Sports",
    tv: "Live TV", radio: "Radio", movies: "Movies",
    latest: "Latest News", search: "Search news, sports, movies...",
    explore: "Explore latest news"
  },
  rw: {
    home: "Ahabanza", news: "Amakuru", sports: "Imikino",
    tv: "Televisiono", radio: "Radio", movies: "Filime",
    latest: "Amakuru agezweho", search: "Shakisha amakuru, imikino, filime...",
    explore: "Reba amakuru agezweho"
  },
  fr: {
    home: "Accueil", news: "Actualités", sports: "Sports",
    tv: "Télévision", radio: "Radio", movies: "Films",
    latest: "Dernières actualités", search: "Rechercher...",
    explore: "Voir les actualités"
  },
  sw: {
    home: "Mwanzo", news: "Habari", sports: "Michezo",
    tv: "Televisheni", radio: "Redio", movies: "Filamu",
    latest: "Habari za hivi karibuni", search: "Tafuta...",
    explore: "Angalia habari"
  },
  es: {
    home: "Inicio", news: "Noticias", sports: "Deportes",
    tv: "Televisión", radio: "Radio", movies: "Películas",
    latest: "Últimas noticias", search: "Buscar...",
    explore: "Ver noticias"
  },
  pt: {
    home: "Início", news: "Notícias", sports: "Desporto",
    tv: "Televisão", radio: "Rádio", movies: "Filmes",
    latest: "Últimas notícias", search: "Pesquisar...",
    explore: "Ver notícias"
  },
  ar: {
    home: "الرئيسية", news: "الأخبار", sports: "الرياضة",
    tv: "التلفزيون", radio: "الراديو", movies: "الأفلام",
    latest: "آخر الأخبار", search: "بحث...",
    explore: "استكشف الأخبار"
  },
  zh: {
    home: "首页", news: "新闻", sports: "体育",
    tv: "电视", radio: "广播", movies: "电影",
    latest: "最新新闻", search: "搜索...",
    explore: "查看新闻"
  },
  hi: {
    home: "होम", news: "समाचार", sports: "खेल",
    tv: "लाइव टीवी", radio: "रेडियो", movies: "फिल्में",
    latest: "ताज़ा समाचार", search: "खोजें...",
    explore: "समाचार देखें"
  },
  de: {
    home: "Startseite", news: "Nachrichten", sports: "Sport",
    tv: "Live-TV", radio: "Radio", movies: "Filme",
    latest: "Neueste Nachrichten", search: "Suchen...",
    explore: "Nachrichten ansehen"
  },
  it: {
    home: "Home", news: "Notizie", sports: "Sport",
    tv: "TV", radio: "Radio", movies: "Film",
    latest: "Ultime notizie", search: "Cerca...",
    explore: "Leggi le notizie"
  },
  ja: {
    home: "ホーム", news: "ニュース", sports: "スポーツ",
    tv: "テレビ", radio: "ラジオ", movies: "映画",
    latest: "最新ニュース", search: "検索...",
    explore: "ニュースを見る"
  }
};

/* -------------------- ELEMENT REFERENCES -------------------- */

const $ = (selector) => document.querySelector(selector);

const newsGrid = $("#newsGrid");
const newsStatus = $("#newsStatus");
const newsPagination = $("#newsPagination");
const globalSearch = $("#globalSearch");

let currentFeed = "world";
let currentPage = 1;
let allNews = [];
let filteredNews = [];
let hlsInstance = null;

/* -------------------- NEWS -------------------- */

function safeText(value) {
  return String(value || "").replace(/[<>]/g, "");
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function getNewsImage(item) {
  if (item.thumbnail && validHttpUrl(item.thumbnail)) {
    return item.thumbnail;
  }

  if (item.enclosure && item.enclosure.link &&
      validHttpUrl(item.enclosure.link)) {
    return item.enclosure.link;
  }

  return "https://placehold.co/700x400/172238/f5b942?text=ITT+NEWS";
}

function getNewsDescription(item) {
  const raw = item.description || item.content || "Open the original story to read more.";
  const clean = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > 160 ? clean.slice(0, 157) + "..." : clean;
}

async function loadNews(feedName = currentFeed) {
  currentFeed = feedName;
  currentPage = 1;
  allNews = [];
  filteredNews = [];

  newsGrid.innerHTML = "";
  newsPagination.innerHTML = "";
  newsStatus.textContent = "Loading news...";

  const feedUrl = NEWS_FEEDS[feedName];

  if (!feedUrl) {
    newsStatus.textContent = "This news category is not available.";
    return;
  }

  try {
    const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent(feedUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("News service returned an error.");
    }

    const data = await response.json();

    if (data.status !== "ok" || !Array.isArray(data.items)) {
      throw new Error("News feed could not be read.");
    }

    allNews = data.items.map((item) => ({
      title: item.title || "Untitled story",
      description: getNewsDescription(item),
      image: getNewsImage(item),
      link: item.link || "",
      date: item.pubDate || "",
      source: data.feed && data.feed.title ? data.feed.title : "News source"
    })).filter((item) => item.link && validHttpUrl(item.link));

    filteredNews = allNews.slice();
    renderNews();

    if (allNews.length === 0) {
      newsStatus.textContent = "No stories were returned by this feed.";
    } else {
      newsStatus.textContent = `${allNews.length} stories loaded.`;
    }
  } catch (error) {
    console.error("News loading error:", error);
    newsStatus.textContent =
      "News could not load right now. Please refresh or try again later.";
    newsGrid.innerHTML =
      '<div class="empty-state">The news provider may be unavailable or may be blocking this request. Please try again later.</div>';
  }
}

function renderNews() {
  newsGrid.innerHTML = "";
  newsPagination.innerHTML = "";

  const totalPages = Math.min(
    MAX_NEWS_PAGES,
    Math.ceil(filteredNews.length / NEWS_PER_PAGE)
  );

  if (!filteredNews.length) {
    newsGrid.innerHTML =
      '<div class="empty-state">No news stories found.</div>';
    return;
  }

  const start = (currentPage - 1) * NEWS_PER_PAGE;
  const pageItems = filteredNews.slice(start, start + NEWS_PER_PAGE);

  pageItems.forEach((item) => {
    const article = document.createElement("article");
    article.className = "news-card";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.title;
    image.loading = "lazy";
    image.onerror = () => {
      image.src = "https://placehold.co/700x400/172238/f5b942?text=ITT+NEWS";
    };

    const content = document.createElement("div");
    content.className = "news-content";

    const source = document.createElement("div");
    source.className = "source-label";
    source.textContent = item.source;

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const description = document.createElement("p");
    description.textContent = item.description;

    const link = document.createElement("a");
    link.className = "read-link";
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Read full story ↗";

    content.append(source, heading, description, link);
    article.append(image, content);
    newsGrid.appendChild(article);
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  newsPagination.innerHTML = "";

  if (totalPages <= 1) return;

  const addPageButton = (page, label = String(page)) => {
    const button = document.createElement("button");
    button.className = "page-button";
    button.textContent = label;

    if (page === currentPage) button.classList.add("active");

    button.addEventListener("click", () => {
      currentPage = page;
      renderNews();
      $("#news").scrollIntoView({ behavior: "smooth" });
    });

    newsPagination.appendChild(button);
  };

  if (currentPage > 1) {
    addPageButton(currentPage - 1, "Previous");
  }

  for (let page = 1; page <= totalPages; page++) {
    if (
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 2
    ) {
      addPageButton(page);
    }
  }

  if (currentPage < totalPages) {
    addPageButton(currentPage + 1, "Next");
  }
}

function searchNews(term) {
  const query = term.trim().toLowerCase();

  if (!query) {
    filteredNews = allNews.slice();
  } else {
    filteredNews = allNews.filter((item) =>
      `${item.title} ${item.description} ${item.source}`
        .toLowerCase()
        .includes(query)
    );
  }

  currentPage = 1;
  renderNews();
}

$("#newsCategories").addEventListener("click", (event) => {
  const button = event.target.closest("[data-feed]");
  if (!button) return;

  document.querySelectorAll(".category-button").forEach((item) => {
    item.classList.remove("active");
  });

  button.classList.add("active");
  loadNews(button.dataset.feed);
});

$("#refreshNews").addEventListener("click", () => loadNews());

globalSearch.addEventListener("input", () => {
  searchNews(globalSearch.value);
});

$("#sportsNewsButton").addEventListener("click", () => {
  document.querySelectorAll(".category-button").forEach((item) => {
    item.classList.remove("active");
  });

  const sportsButton = document.querySelector('[data-feed="sports"]');
  if (sportsButton) sportsButton.classList.add("active");

  loadNews("sports");
  $("#news").scrollIntoView({ behavior: "smooth" });
});

/* -------------------- TV PLAYER -------------------- */

function renderChannels(container, channels, type) {
  container.innerHTML = "";

  channels.forEach((channel) => {
    const card = document.createElement("div");
    card.className = "channel-card";

    const logoBox = document.createElement("div");
    logoBox.className = "channel-logo";

    const logo = document.createElement("img");
    logo.src = channel.logo;
    logo.alt = channel.name + " logo";
    logo.loading = "lazy";
    logo.onerror = () => {
      logo.remove();
      logoBox.textContent = channel.name.slice(0, 2).toUpperCase();
    };

    logoBox.appendChild(logo);

    const info = document.createElement("div");
    info.style.flex = "1";

    const name = document.createElement("strong");
    name.textContent = channel.name;

    const country = document.createElement("div");
    country.className = "small-note";
    country.textContent = channel.country;

    info.append(name, country);

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Select";
    button.addEventListener("click", () => {
      if (type === "tv") {
        playTV(channel);
      } else {
        playRadio(channel);
      }
    });

    card.append(logoBox, info, button);
    container.appendChild(card);
  });
}

function stopTV() {
  const player = $("#tvPlayer");

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  player.pause();
  player.removeAttribute("src");
  player.load();
}

function playTV(channel) {
  const player = $("#tvPlayer");
  const message = $("#tvPlayerMessage");

  stopTV();

  $("#tvNowPlaying").textContent = channel.name + " — " + channel.country;

  if (!channel.streamUrl || !validHttpUrl(channel.streamUrl)) {
    message.textContent =
      "No direct authorized stream has been added for this channel. Use the official website link below.";
    addOfficialLink(message, channel.website);
    return;
  }

  message.textContent = "Loading channel...";

  const stream = channel.streamUrl;
  const isHls = /\.m3u8($|\?)/i.test(stream);

  if (isHls && window.Hls && Hls.isSupported()) {
    hlsInstance = new Hls();
    hlsInstance.loadSource(stream);
    hlsInstance.attachMedia(player);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      player.play().catch(() => {
        message.textContent = "Press Play to start the channel.";
      });
    });

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        message.textContent =
          "This stream could not be played. Check the stream URL or broadcaster permissions.";
      }
    });
  } else if (player.canPlayType("application/vnd.apple.mpegurl") && isHls) {
    player.src = stream;
    player.play().catch(() => {
      message.textContent = "Press Play to start the channel.";
    });
  } else {
    player.src = stream;
    player.play().catch(() => {
      message.textContent = "Press Play to start the channel.";
    });
  }

  addOfficialLink(message, channel.website);
}

function addOfficialLink(container, url) {
  if (!url || !validHttpUrl(url)) return;

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "read-link";
  link.textContent = "Open official channel website ↗";
  container.appendChild(document.createElement("br"));
  container.appendChild(link);
}

/* -------------------- RADIO PLAYER -------------------- */

function playRadio(station) {
  const player = $("#radioPlayer");
  const message = $("#radioPlayerMessage");

  player.pause();
  player.removeAttribute("src");
  player.load();

  $("#radioNowPlaying").textContent =
    station.name + " — " + station.country;

  if (!station.streamUrl || !validHttpUrl(station.streamUrl)) {
    message.textContent =
      "A direct authorized audio stream has not yet been added for this station.";
    addOfficialLink(message, station.website);
    return;
  }

  message.textContent = "Loading radio stream...";
  player.src = station.streamUrl;

  player.play().then(() => {
    message.textContent = "Playing live radio.";
  }).catch((error) => {
    console.warn("Radio playback error:", error);
    message.textContent =
      "The stream did not start. Press Play or check whether the station allows web playback.";
  });

  addOfficialLink(message, station.website);
}

/* -------------------- MOVIES -------------------- */

function renderMovies() {
  const grid = $("#movieGrid");
  const query = $("#movieSearch").value.trim().toLowerCase();
  const category = $("#movieCategory").value;

  grid.innerHTML = "";

  const results = MOVIES.filter((movie) => {
    const matchesQuery =
      `${movie.title} ${movie.description} ${movie.year}`
        .toLowerCase()
        .includes(query);

    const matchesCategory =
      category === "all" || movie.category === category;

    return matchesQuery && matchesCategory;
  });

  if (!results.length) {
    grid.innerHTML =
      '<div class="empty-state">No movies match your search.</div>';
    return;
  }

  results.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";

    const image = document.createElement("img");
    image.src = movie.image;
    image.alt = movie.title;
    image.loading = "lazy";
    image.onerror = () => {
      image.src = "https://placehold.co/600x400/172238/f5b942?text=Movie";
    };

    const info = document.createElement("div");
    info.className = "movie-info";

    const title = document.createElement("h3");
    title.textContent = movie.title;

    const details = document.createElement("p");
    details.textContent =
      `${movie.year} • ${movie.category} • ${movie.source}`;

    const description = document.createElement("p");
    description.textContent = movie.description;

    const playButton = document.createElement("button");
    playButton.className = "primary-button";
    playButton.textContent = "▶ Watch movie";
    playButton.addEventListener("click", () => openMovie(movie));

    info.append(title, details, description, playButton);
    card.append(image, info);
    grid.appendChild(card);
  });
}

function openMovie(movie) {
  const viewer = $("#movieViewer");
  const frame = $("#movieFrame");

  frame.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.src =
    "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(movie.youtubeId) +
    "?autoplay=1&rel=0";

  iframe.title = movie.title;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";

  frame.appendChild(iframe);

  $("#movieViewerTitle").textContent = movie.title;
  $("#movieViewerDescription").textContent =
    movie.description + " Source: " + movie.source + ".";

  viewer.hidden = false;
  viewer.scrollIntoView({ behavior: "smooth" });
}

function closeMovie() {
  $("#movieFrame").innerHTML = "";
  $("#movieViewer").hidden = true;
}

$("#movieSearch").addEventListener("input", renderMovies);
$("#movieCategory").addEventListener("change", renderMovies);
$("#closeMovie").addEventListener("click", closeMovie);

/* -------------------- LANGUAGE SELECTOR -------------------- */

function changeLanguage(language) {
  const words = TRANSLATIONS[language] || TRANSLATIONS.en;

  const navLinks = document.querySelectorAll(".main-nav a");
  const navKeys = ["home", "news", "sports", "tv", "radio", "movies"];

  navLinks.forEach((link, index) => {
    if (words[navKeys[index]]) {
      link.textContent = words[navKeys[index]];
    }
  });

  $("#globalSearch").placeholder = words.search;
  document.documentElement.lang = language;

  if (language === "ar") {
    document.documentElement.dir = "rtl";
  } else {
    document.documentElement.dir = "ltr";
  }
}

$("#languageSelect").addEventListener("change", (event) => {
  changeLanguage(event.target.value);
});

/* -------------------- GLOBAL SEARCH -------------------- */

globalSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    $("#news").scrollIntoView({ behavior: "smooth" });
  }
});

/* -------------------- START APPLICATION -------------------- */

function startApp() {
  $("#currentYear").textContent = new Date().getFullYear();

  renderChannels($("#tvChannels"), TV_CHANNELS, "tv");
  renderChannels($("#radioChannels"), RADIO_STATIONS, "radio");

  renderMovies();
  loadNews("world");

  $("#tickerText").textContent =
    "Welcome to ITT NEWS — world news, sports, TV, radio and movies.";

  console.log("ITT NEWS application started successfully.");
}

document.addEventListener("DOMContentLoaded", startApp);
