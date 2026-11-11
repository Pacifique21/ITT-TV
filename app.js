
"use strict";

const $ = s => document.querySelector(s);

const FEEDS = {
  world:"https://feeds.bbci.co.uk/news/world/rss.xml",
  africa:"https://feeds.bbci.co.uk/news/world/africa/rss.xml",
  business:"https://feeds.bbci.co.uk/news/business/rss.xml",
  technology:"https://feeds.bbci.co.uk/news/technology/rss.xml",
  sports:"https://feeds.bbci.co.uk/sport/rss.xml"
};

const NEWS_PER_PAGE = 10;

const TV_CHANNELS = [
  {name:"RBA TV",country:"Rwanda",website:"https://www.rba.co.rw/tv",logo:"https://www.google.com/s2/favicons?domain=rba.co.rw&sz=128",streamUrl:""},
  {name:"Flash TV",country:"Rwanda",website:"https://flash.rw/flash-tv-live/",logo:"https://www.google.com/s2/favicons?domain=flash.rw&sz=128",streamUrl:""},
  {name:"TV10",country:"Rwanda",website:"https://radiotv10.rw/tvpage/",logo:"https://www.google.com/s2/favicons?domain=radiotv10.rw&sz=128",streamUrl:""}
];

const RADIO_STATIONS = [
  {name:"Radio 10",country:"Rwanda",website:"https://radiotv10.rw/radio/",logo:"https://www.google.com/s2/favicons?domain=radiotv10.rw&sz=128",streamUrl:""},
  {name:"KT Radio",country:"Rwanda",website:"https://ktradio.rw/",logo:"https://www.google.com/s2/favicons?domain=ktradio.rw&sz=128",streamUrl:""},
  {name:"Isango Star",country:"Rwanda",website:"https://isangostar.rw/",logo:"https://www.google.com/s2/favicons?domain=isangostar.rw&sz=128",streamUrl:""},
  {name:"Flash Radio",country:"Rwanda",website:"https://flash.rw/",logo:"https://www.google.com/s2/favicons?domain=flash.rw&sz=128",streamUrl:""}
];

const MOVIES = [
  {title:"Big Buck Bunny",year:2008,category:"Animation",description:"Open animated comedy film.",image:"https://peach.blender.org/wp-content/uploads/title_anouncement.jpg",youtubeId:"aqz-KE-bpKQ"},
  {title:"Sintel",year:2010,category:"Animation",description:"Open animated fantasy adventure.",image:"https://durian.blender.org/wp-content/uploads/2010/06/sintel_poster.jpg",youtubeId:"eRsGyueVLvQ"},
  {title:"Tears of Steel",year:2012,category:"Science Fiction",description:"Open science-fiction short film.",image:"https://mango.blender.org/wp-content/uploads/2013/05/tears_of_steel_poster.jpg",youtubeId:"R6MlUcmOul8"}
];

const WORDS = {
  en:["Home","News","Sports","Live TV","Radio","Movies"],
  rw:["Ahabanza","Amakuru","Imikino","TV","Radio","Filime"],
  fr:["Accueil","Actualités","Sports","Télévision","Radio","Films"],
  sw:["Mwanzo","Habari","Michezo","TV","Redio","Filamu"],
  es:["Inicio","Noticias","Deportes","TV","Radio","Películas"],
  pt:["Início","Notícias","Desporto","TV","Rádio","Filmes"],
  ar:["الرئيسية","الأخبار","الرياضة","التلفزيون","الراديو","الأفلام"],
  zh:["首页","新闻","体育","电视","广播","电影"],
  hi:["होम","समाचार","खेल","टीवी","रेडियो","फिल्में"],
  de:["Startseite","Nachrichten","Sport","TV","Radio","Filme"],
  it:["Home","Notizie","Sport","TV","Radio","Film"],
  ja:["ホーム","ニュース","スポーツ","テレビ","ラジオ","映画"]
};

let allNews = [];
let filteredNews = [];
let currentPage = 1;
let currentFeed = "world";
let hlsInstance = null;

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function safeDescription(value) {
  const div = document.createElement("div");
  div.innerHTML = value || "";
  return (div.textContent || "").trim().slice(0,180);
}

/* NEWS */

async function loadNews(feed="world") {
  currentFeed = feed;
  currentPage = 1;
  allNews = [];
  filteredNews = [];
  $("#newsGrid").innerHTML = "";
  $("#newsPagination").innerHTML = "";
  $("#newsStatus").textContent = "Loading news...";

  try {
    const url = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(FEEDS[feed]);
    const response = await fetch(url);
    if (!response.ok) throw new Error("News service unavailable");
    const data = await response.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) throw new Error("Invalid feed");

    allNews = data.items.map(item => ({
      title:item.title || "News story",
      description:safeDescription(item.description),
      link:item.link,
      image:item.thumbnail || (item.enclosure && item.enclosure.link) || "https://placehold.co/600x350?text=ITT+NEWS",
      source:data.feed?.title || "News"
    })).filter(item => item.link && validUrl(item.link));

    filteredNews = allNews.slice();
    renderNews();
    $("#newsStatus").textContent = `${allNews.length} stories loaded.`;
  } catch(error) {
    console.error(error);
    $("#newsStatus").textContent = "News could not load. Please try again later.";
    $("#newsGrid").innerHTML = '<div class="empty-state">News provider is temporarily unavailable.</div>';
  }
}

function renderNews() {
  const grid = $("#newsGrid");
  const pagination = $("#newsPagination");
  grid.innerHTML = "";
  pagination.innerHTML = "";

  if (!filteredNews.length) {
    grid.innerHTML = '<div class="empty-state">No stories found.</div>';
    return;
  }

  const pages = Math.ceil(filteredNews.length / NEWS_PER_PAGE);
  const items = filteredNews.slice((currentPage-1)*NEWS_PER_PAGE,currentPage*NEWS_PER_PAGE);

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "news-card";
    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.title;
    img.loading = "lazy";
    img.onerror = () => { img.src = "https://placehold.co/600x350?text=ITT+NEWS"; };

    const content = document.createElement("div");
    content.className = "news-content";
    const source = document.createElement("small");
    source.className = "accent";
    source.textContent = item.source;
    const title = document.createElement("h3");
    title.textContent = item.title;
    const description = document.createElement("p");
    description.textContent = item.description;
    const link = document.createElement("a");
    link.className = "read-link";
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Read full story ↗";
    content.append(source,title,description,link);
    card.append(img,content);
    grid.append(card);
  });

  for(let p=1;p<=pages;p++) {
    const button = document.createElement("button");
    button.className = "page-button" + (p===currentPage ? " active" : "");
    button.textContent = p;
    button.addEventListener("click",() => {
      currentPage=p;
      renderNews();
      $("#news").scrollIntoView({behavior:"smooth"});
    });
    pagination.append(button);
  }
}

$("#newsCategories").addEventListener("click",event => {
  const button = event.target.closest("[data-feed]");
  if(!button) return;
  document.querySelectorAll(".category").forEach(b=>b.classList.remove("active"));
  button.classList.add("active");
  loadNews(button.dataset.feed);
});

$("#refreshNews").addEventListener("click",()=>loadNews(currentFeed));

$("#sportsNewsButton").addEventListener("click",()=>{
  document.querySelector('[data-feed="sports"]').click();
  $("#news").scrollIntoView({behavior:"smooth"});
});

$("#globalSearch").addEventListener("input",event=>{
  const q=event.target.value.toLowerCase().trim();
  filteredNews=allNews.filter(item=>(item.title+" "+item.description).toLowerCase().includes(q));
  currentPage=1;
  renderNews();
});

/* CHANNEL CARDS */

function renderChannels(container,channels,type) {
  container.innerHTML="";
  channels.forEach(channel=>{
    const card=document.createElement("div");
    card.className="channel-card";
    const logo=document.createElement("img");
    logo.className="channel-logo";
    logo.src=channel.logo;
    logo.alt=channel.name;
    const info=document.createElement("div");
    info.className="channel-info";
    const name=document.createElement("strong");
    name.textContent=channel.name;
    const country=document.createElement("div");
    country.className="muted";
    country.textContent=channel.country;
    info.append(name,country);
    const button=document.createElement("button");
    button.textContent="Play";
    button.addEventListener("click",()=>type==="tv"?playTV(channel):playRadio(channel));
    card.append(logo,info,button);
    container.append(card);
  });
}

function stopTV() {
  const player=$("#tvPlayer");
  if(hlsInstance){hlsInstance.destroy();hlsInstance=null;}
  player.pause();
  player.removeAttribute("src");
  player.load();
}

function playTV(channel) {
  const player=$("#tvPlayer");
  const frame=$("#tvOfficialFrame");
  const message=$("#tvPlayerMessage");
  stopTV();
  player.hidden=true;
  frame.hidden=false;
  frame.src="about:blank";
  $("#tvNowPlaying").textContent=channel.name+" — "+channel.country;

  if(channel.streamUrl && validUrl(channel.streamUrl)) {
    frame.hidden=true;
    player.hidden=false;
    if(/\.m3u8($|\?)/i.test(channel.streamUrl) && window.Hls && Hls.isSupported()) {
      hlsInstance=new Hls();
      hlsInstance.loadSource(channel.streamUrl);
      hlsInstance.attachMedia(player);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED,()=>player.play().catch(()=>{}));
    } else {
      player.src=channel.streamUrl;
      player.play().catch(()=>{});
    }
    message.textContent="Loading authorized stream...";
    return;
  }

  if(!validUrl(channel.website)) {
    message.textContent="No official channel page available.";
    return;
  }
  frame.src=channel.website;
  message.textContent="Trying to display the broadcaster's official player here. If embedding is blocked, use the official website.";
}

function playRadio(station) {
  const player=$("#radioPlayer");
  const frame=$("#radioOfficialFrame");
  const message=$("#radioPlayerMessage");
  player.pause();
  player.removeAttribute("src");
  player.load();
  player.hidden=true;
  frame.hidden=false;
  frame.src="about:blank";
  $("#radioNowPlaying").textContent=station.name+" — "+station.country;

  if(station.streamUrl && validUrl(station.streamUrl)) {
    frame.hidden=true;
    player.hidden=false;
    player.src=station.streamUrl;
    player.play().catch(()=>{message.textContent="Press Play to start.";});
    message.textContent="Loading authorized audio stream...";
    return;
  }

  if(!validUrl(station.website)) {
    message.textContent="No official radio page available.";
    return;
  }
  frame.src=station.website;
  message.textContent="Trying to display the official radio player here. If embedding is blocked, use the official website.";
}

/* MOVIES */

function renderMovies() {
  const q=$("#movieSearch").value.toLowerCase().trim();
  const category=$("#movieCategory").value;
  const grid=$("#movieGrid");
  grid.innerHTML="";
  const list=MOVIES.filter(m=>(m.title+" "+m.description).toLowerCase().includes(q)&&(category==="all"||m.category===category));

  if(!list.length) {
    grid.innerHTML='<div class="empty-state">No movies found.</div>';
    return;
  }

  list.forEach(movie=>{
    const card=document.createElement("article");
    card.className="movie-card";
    const image=document.createElement("img");
    image.src=movie.image;
    image.alt=movie.title;
    image.onerror=()=>{image.src="https://placehold.co/600x350?text=Movie";};
    const info=document.createElement("div");
    info.className="movie-info";
    const title=document.createElement("h3");
    title.textContent=movie.title;
    const details=document.createElement("p");
    details.textContent=movie.year+" • "+movie.category;
    const description=document.createElement("p");
    description.textContent=movie.description;
    const button=document.createElement("button");
    button.className="primary";
    button.textContent="▶ Watch movie";
    button.addEventListener("click",()=>openMovie(movie));
    info.append(title,details,description,button);
    card.append(image,info);
    grid.append(card);
  });
}

function openMovie(movie) {
  const frame=$("#movieFrame");
  frame.innerHTML="";
  const iframe=document.createElement("iframe");
  iframe.src="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(movie.youtubeId)+"?autoplay=1";
  iframe.title=movie.title;
  iframe.allow="autoplay; encrypted-media; picture-in-picture";
  iframe.allowFullscreen=true;
  frame.append(iframe);
  $("#movieViewerTitle").textContent=movie.title;
  $("#movieViewerDescription").textContent=movie.description;
  $("#movieViewer").hidden=false;
  $("#movieViewer").scrollIntoView({behavior:"smooth"});
}

$("#movieSearch").addEventListener("input",renderMovies);
$("#movieCategory").addEventListener("change",renderMovies);
$("#closeMovie").addEventListener("click",()=>{
  $("#movieFrame").innerHTML="";
  $("#movieViewer").hidden=true;
});

/* LANGUAGES */

$("#languageSelect").addEventListener("change",event=>{
  const lang=event.target.value;
  const labels=WORDS[lang]||WORDS.en;
  document.querySelectorAll(".nav a").forEach((link,index)=>{
    link.textContent=labels[index];
  });
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
});

/* START */

document.addEventListener("DOMContentLoaded",()=>{
  $("#currentYear").textContent=new Date().getFullYear();
  renderChannels($("#tvChannels"),TV_CHANNELS,"tv");
  renderChannels($("#radioChannels"),RADIO_STATIONS,"radio");
  renderMovies();
  loadNews("world");
  $("#tickerText").textContent="Welcome to ITT NEWS — world news and entertainment.";
  console.log("ITT NEWS loaded.");
});
