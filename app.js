(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const config = window.ITT_CONFIG || {};
  const text = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const safeUrl = (value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch (_) {
      return "";
    }
  };

  const translations = {
    en: {home:"Home",news:"News",sports:"Sports",tv:"Live TV",radio:"Radio",movies:"Movies",eyebrow:"RWANDA · AFRICA · THE WORLD",heroTitle:"THE WORLD<br><span>IN ONE PLACE</span>",heroCopy:"Explore news, sports, live television, radio and films from around the world.",exploreNews:"Explore news",watchLive:"Watch live",latestUpdates:"LATEST UPDATES",topNews:"Top News",newsIntro:"Choose a news source to read its latest reports.",sportsNews:"Sports News",sportsIntro:"Visit trusted sports publishers for current scores, fixtures and reports.",liveTelevision:"Live Television",selectTv:"Choose a channel from the list",liveRadio:"Live Radio",movieIntro:"Films listed here are openly published for online viewing. Availability can vary by host.",footerText:"Your world. Your news."},
    rw: {home:"Ahabanza",news:"Amakuru",sports:"Siporo",tv:"TV Live",radio:"Radiyo",movies:"Filime",eyebrow:"URWANDA · AFRIKA · ISI",heroTitle:"ISI YOSE<br><span>AHANTU HAMWE</span>",heroCopy:"Kurikirana amakuru, siporo, televiziyo, radiyo na filime byo hirya no hino ku isi.",exploreNews:"Reba amakuru",watchLive:"Reba Live",latestUpdates:"AMAKURU AGEZWEHO",topNews:"Amakuru y'ingenzi",newsIntro:"Hitamo urubuga rw'amakuru ushaka gusoma.",sportsNews:"Amakuru ya siporo",sportsIntro:"Sura imbuga za siporo zizewe urebe amanota n'andi makuru.",liveTelevision:"Televiziyo ziri Live",selectTv:"Hitamo televiziyo ku rutonde",liveRadio:"Radiyo ziri Live",movieIntro:"Filime ziri hano zashyizwe ahagaragara ku buryo bwemewe. Zishobora kutaboneka igihe cyose.",footerText:"Isi yawe. Amakuru yawe."},
    fr: {home:"Accueil",news:"Actualités",sports:"Sports",tv:"TV en direct",radio:"Radio",movies:"Films",eyebrow:"RWANDA · AFRIQUE · MONDE",heroTitle:"LE MONDE<br><span>EN UN SEUL LIEU</span>",heroCopy:"Découvrez actualités, sports, télévision, radio et films du monde entier.",exploreNews:"Voir les actualités",watchLive:"Regarder en direct",latestUpdates:"DERNIÈRES MISES À JOUR",topNews:"À la une",newsIntro:"Choisissez une source d'information.",sportsNews:"Actualités sportives",sportsIntro:"Consultez les médias sportifs pour les résultats et les nouvelles.",liveTelevision:"Télévision en direct",selectTv:"Choisissez une chaîne",liveRadio:"Radio en direct",movieIntro:"Films publiés pour le visionnage en ligne. Disponibilité variable.",footerText:"Votre monde. Vos actualités."},
    sw: {home:"Mwanzo",news:"Habari",sports:"Michezo",tv:"TV Mubashara",radio:"Redio",movies:"Filamu",eyebrow:"RWANDA · AFRIKA · DUNIA",heroTitle:"DUNIA<br><span>MAHALI PAMOJA</span>",heroCopy:"Habari, michezo, televisheni, redio na filamu kutoka duniani.",exploreNews:"Tazama habari",watchLive:"Tazama mubashara",latestUpdates:"HABARI ZA HIVI PUNDE",topNews:"Habari kuu",newsIntro:"Chagua chanzo cha habari.",sportsNews:"Habari za michezo",sportsIntro:"Tembelea wachapishaji wa michezo kwa matokeo na taarifa.",liveTelevision:"Televisheni mubashara",selectTv:"Chagua kituo",liveRadio:"Redio mubashara",movieIntro:"Filamu zilizowekwa wazi kwa kutazamwa mtandaoni.",footerText:"Dunia yako. Habari zako."}
  };
  const defaultTranslation = translations.en;

  function renderPublisherCards(items, target, icon) {
    if (!target) return;
    target.replaceChildren();
    (items || []).forEach(item => {
      const card = text("article", "info-card");
      card.append(text("span", "card-icon", icon));
      card.append(text("h3", "", item.name));
      card.append(text("p", "", item.category || item.country || ""));
      const link = text("a", "", "Visit official website ↗");
      const href = safeUrl(item.url || item.page);
      if (!href) return;
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      card.append(link);
      target.append(card);
    });
    if (!target.children.length) target.append(text("p", "muted", "No entries are configured yet."));
  }

  function renderStations(items, target, kind) {
    if (!target) return;
    target.replaceChildren();
    (items || []).forEach((item) => {
      const button = text("button", "station-button");
      button.type = "button";
      const details = text("span", "");
      details.append(text("strong", "", item.name));
      details.append(text("small", "", item.country || "International"));
      button.append(details);
      button.append(text("span", "station-action", kind === "tv" ? "WATCH ▶" : "LISTEN ▶"));
      button.addEventListener("click", () => kind === "tv" ? selectTV(item) : selectRadio(item));
      target.append(button);
    });
    if (!target.children.length) target.append(text("p", "muted", "No stations configured."));
  }

  let hlsPlayer = null;
  function stopHls() {
    if (hlsPlayer) {
      hlsPlayer.destroy();
      hlsPlayer = null;
    }
  }

  function selectTV(channel) {
    const video = $("tvVideo");
    const placeholder = $("tvPlaceholder");
    const officialLink = $("tvOfficialLink");
    stopHls();
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.classList.add("hidden");
    placeholder.classList.remove("hidden");
    $("tvNowPlaying").textContent = channel.name;
    officialLink.classList.add("hidden");
    officialLink.removeAttribute("href");

    const stream = safeUrl(channel.stream);
    if (!stream) {
      placeholder.querySelector("p").textContent = "This channel has no verified direct stream configured yet.";
      $("tvStatus").textContent = "For in-page playback, the broadcaster must provide an authorized direct video stream (for example, HLS .m3u8) and allow its use on this website.";
      const page = safeUrl(channel.page);
      if (page) {
        officialLink.href = page;
        officialLink.classList.remove("hidden");
      }
      return;
    }

    placeholder.classList.add("hidden");
    video.classList.remove("hidden");
    const isHls = /\.m3u8(?:$|\?)/i.test(stream);
    if (isHls && window.Hls && Hls.isSupported()) {
      hlsPlayer = new Hls();
      hlsPlayer.loadSource(stream);
      hlsPlayer.attachMedia(video);
      hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
        $("tvStatus").textContent = "Stream loaded. Press Play if playback did not start automatically.";
      });
      hlsPlayer.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          $("tvStatus").textContent = "The stream could not be played. It may be offline, blocked, or not authorized for embedding.";
          stopHls();
          video.classList.add("hidden");
          placeholder.classList.remove("hidden");
        }
      });
    } else {
      video.src = stream;
    }
    video.play().catch(() => {
      $("tvStatus").textContent = "Stream is ready. Press Play. Some browsers require a user action.";
    });
  }

  function selectRadio(station) {
    const audio = $("radioAudio");
    const link = $("radioOfficialLink");
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    $("radioNowPlaying").textContent = station.name;
    $("radioCountry").textContent = station.country || "International";
    link.classList.add("hidden");
    link.removeAttribute("href");

    const stream = safeUrl(station.stream);
    if (!stream) {
      $("radioStatus").textContent = "This station has no verified direct audio stream configured yet. In-page listening cannot work from an ordinary website link.";
      const page = safeUrl(station.page);
      if (page) {
        link.href = page;
        link.classList.remove("hidden");
      }
      return;
    }
    audio.src = stream;
    audio.load();
    audio.play().then(() => {
      $("radioStatus").textContent = "Radio is playing.";
    }).catch(() => {
      $("radioStatus").textContent = "Stream loaded. Press Play on the audio player. The station may restrict playback.";
    });
  }

  function filterList(inputId, original, targetId, kind) {
    const input = $(inputId);
    if (!input) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLocaleLowerCase();
      const filtered = original.filter(item =>
        (item.name + " " + (item.country || "")).toLocaleLowerCase().includes(q)
      );
      renderStations(filtered, $(targetId), kind);
    });
  }

  function renderMovies() {
    const target = $("movieList");
    const video = $("movieVideo");
    target.replaceChildren();
    (config.movies || []).forEach(movie => {
      const button = text("button", "movie-button");
      button.type = "button";
      button.append(text("strong", "", movie.name));
      button.append(text("small", "", movie.description || "Openly published film"));
      button.addEventListener("click", () => {
        const url = safeUrl(movie.url);
        if (!url) {
          $("movieStatus").textContent = "This movie URL is not valid.";
          return;
        }
        video.pause();
        video.src = url;
        video.load();
        $("movieNowPlaying").textContent = movie.name;
        $("movieStatus").textContent = movie.license || "Check the film's license and attribution terms.";
        video.play().catch(() => {
          $("movieStatus").textContent = "Film loaded. Press Play. Playback depends on the video host and browser support.";
        });
      });
      target.append(button);
    });
    if (!target.children.length) target.append(text("p", "muted", "Add authorized movie entries in config.js."));
  }

  function setLanguage(code) {
    const dictionary = translations[code] || defaultTranslation;
    document.documentElement.lang = code;
    document.querySelectorAll("[data-i18n]").forEach(node => {
      const key = node.dataset.i18n;
      if (dictionary[key]) node.innerHTML = dictionary[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(node => {
      const key = node.dataset.i18nPlaceholder;
      if (dictionary[key]) node.placeholder = dictionary[key];
    });
  }

  function init() {
    $("currentYear").textContent = new Date().getFullYear();
    renderPublisherCards(config.news, $("newsGrid"), "📰");
    renderPublisherCards(config.sports, $("sportsGrid"), "⚽");
    renderStations(config.tv, $("tvList"), "tv");
    renderStations(config.radio, $("radioList"), "radio");
    renderMovies();

    filterList("tvSearch", config.tv || [], "tvList", "tv");
    filterList("radioSearch", config.radio || [], "radioList", "radio");

    $("newsSearch").addEventListener("input", () => {
      const q = $("newsSearch").value.toLowerCase().trim();
      const filtered = (config.news || []).filter(item => (item.name + " " + item.category).toLowerCase().includes(q));
      renderPublisherCards(filtered, $("newsGrid"), "📰");
    });

    $("menuToggle").addEventListener("click", () => {
      const nav = $("mainNav");
      const open = nav.classList.toggle("open");
      $("menuToggle").setAttribute("aria-expanded", String(open));
    });
    $("mainNav").querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      $("mainNav").classList.remove("open");
      $("menuToggle").setAttribute("aria-expanded", "false");
    }));

    $("languageSelect").addEventListener("change", event => setLanguage(event.target.value));
    setLanguage("en");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
