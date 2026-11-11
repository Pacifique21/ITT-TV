/* =====================================================
   ITT NEWS - COMPLETE APP.JS
   TV + RADIO + NAVIGATION + SEARCH + FILTERS
===================================================== */

"use strict";

/* ---------- SETTINGS ---------- */

const TV_CHANNELS_URL =
  "https://iptv-org.github.io/api/channels.json";

const TV_STREAMS_URL =
  "https://iptv-org.github.io/api/streams.json";

const RADIO_API =
  "https://all.api.radio-browser.info/json/stations/search";

const PAGE_SIZE = 30;

/* ---------- ELEMENT HELPER ---------- */

const $ = (id) => document.getElementById(id);

const state = {
  tv: [],
  radio: [],
  tvPage: 1,
  radioPage: 1,
  tvSearch: "",
  radioSearch: "",
  globalSearch: "",
  tvCountry: "",
  tvCategory: "",
  radioCountry: "",
  radioLanguage: "",
  hls: null
};

/* ---------- SAFE TEXT ---------- */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

/* ---------- STATUS MESSAGES ---------- */

function setText(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function setStatus(id, message) {
  setText(id, message);
}

/* ---------- NAVIGATION ---------- */

function navigate(page) {
  const selectedPage = $(page);

  if (!selectedPage) {
    console.warn("Page not found:", page);
    return;
  }

  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active", section.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.querySelectorAll("[data-page]").forEach(element => {
  element.addEventListener("click", event => {
    event.preventDefault();
    navigate(element.dataset.page);
  });
});

/* ---------- TV PLAYER ---------- */

function stopTV() {
  const video = $("tvPlayer");

  if (state.hls) {
    state.hls.destroy();
    state.hls = null;
  }

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function playTV(url, title) {
  const video = $("tvPlayer");

  if (!video) {
    setText("tvMessage", "TV player ntiyabonetse muri HTML.");
    return;
  }

  stopTV();

  setText("tvTitle", title);
  setText("tvMessage", "Turimo gufungura TV...");

  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;

  const isHLS = url.includes(".m3u8");

  if (
    isHLS &&
    window.Hls &&
    window.Hls.isSupported()
  ) {
    state.hls = new Hls();

    state.hls.loadSource(url);
    state.hls.attachMedia(video);

    state.hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {
        setText(
          "tvMessage",
          "Kanda Play kugira ngo urebe iyi TV."
        );
      });
    });

    state.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        setText(
          "tvMessage",
          "Iyi TV ntishoboye gukina. Gerageza indi channel."
        );
      }
    });

  } else {
    video.src = url;

    video.play().catch(() => {
      setText(
        "tvMessage",
        "Kanda Play kugira ngo utangire kureba."
      );
    });
  }

  video.onerror = () => {
    setText(
      "tvMessage",
      "Stream ntikora cyangwa ntabwo yemera gukinirwa hano."
    );
  };
}

/* ---------- RADIO PLAYER ---------- */

function playRadio(url, title) {
  const audio = $("radioPlayer");

  if (!audio) {
    setText("radioMessage", "Radio player ntiyabonetse muri HTML.");
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  setText("radioTitle", title);
  setText("radioMessage", "Turimo gufungura Radio...");

  audio.src = url;
  audio.controls = true;
  audio.autoplay = true;

  audio.play().then(() => {
    setText("radioMessage", "Radio iri gukina.");
  }).catch(() => {
    setText(
      "radioMessage",
      "Kanda Play kugira ngo wumve iyi Radio."
    );
  });

  audio.onerror = () => {
    setText(
      "radioMessage",
      "Iyi Radio ntikora cyangwa stream yayo ntiboneka."
    );
  };
}

/* ---------- TV DATA ---------- */

async function loadTV() {
  setStatus("tvStatus", "Turimo gushaka TV channels...");

  try {
    const responses = await Promise.all([
      fetch(TV_CHANNELS_URL),
      fetch(TV_STREAMS_URL)
    ]);

    if (!responses[0].ok || !responses[1].ok) {
      throw new Error("TV data ntibonetse.");
    }

    const channels = await responses[0].json();
    const streams = await responses[1].json();

    const streamMap = new Map();

    streams.forEach(stream => {
      if (
        stream.channel &&
        stream.url &&
        !streamMap.has(stream.channel)
      ) {
        streamMap.set(stream.channel, stream.url);
      }
    });

    state.tv = channels
      .filter(channel => {
        return (
          channel.id &&
          channel.name &&
          streamMap.has(channel.id) &&
          channel.is_nsfw !== true
        );
      })
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        country: channel.country || "Unknown",
        categories: channel.categories || [],
        languages: channel.languages || [],
        logo: channel.logo || "",
        url: streamMap.get(channel.id)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    fillTVFilters();
    renderTV();

    setStatus(
      "tvStatus",
      `${state.tv.length} TV channels zabonetse.`
    );

    setText("tvCount", state.tv.length);

  } catch (error) {
    console.error("TV loading error:", error);

    setStatus(
      "tvStatus",
      "TV channels ntizashoboye gufunguka. Reba internet wongere ugerageze."
    );

    setText(
      "tvMessage",
      "TV data ntibonetse. Ongera ufungure website nyuma y'igihe gito."
    );
  }
}

/* ---------- TV FILTERS ---------- */

function fillTVFilters() {
  const countrySelect = $("tvCountry");
  const categorySelect = $("tvCategory");

  if (countrySelect) {
    const countries = [...new Set(
      state.tv.map(channel => channel.country)
    )].filter(Boolean).sort();

    countrySelect.innerHTML =
      '<option value="">All Countries</option>';

    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      countrySelect.appendChild(option);
    });
  }

  if (categorySelect) {
    const categories = [...new Set(
      state.tv.flatMap(channel => channel.categories)
    )].filter(Boolean).sort();

    categorySelect.innerHTML =
      '<option value="">All Categories</option>';

    categories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
  }
}

/* ---------- RENDER TV ---------- */

function renderTV() {
  const grid = $("tvGrid");
  if (!grid) return;

  const search = (
    state.tvSearch + " " + state.globalSearch
  ).toLowerCase().trim();

  const filtered = state.tv.filter(channel => {
    const matchesSearch =
      !search ||
      channel.name.toLowerCase().includes(search) ||
      channel.country.toLowerCase().includes(search) ||
      channel.categories.join(" ").toLowerCase().includes(search);

    const matchesCountry =
      !state.tvCountry ||
      channel.country === state.tvCountry;

    const matchesCategory =
      !state.tvCategory ||
      channel.categories.includes(state.tvCategory);

    return (
      matchesSearch &&
      matchesCountry &&
      matchesCategory
    );
  });

  const visible = filtered.slice(
    0,
    state.tvPage * PAGE_SIZE
  );

  grid.innerHTML = "";

  if (visible.length === 0) {
    grid.innerHTML =
      "<p>Nta TV channel ibonetse. Gerageza guhindura search.</p>";
  }

  visible.forEach(channel => {
    const card = document.createElement("article");
    card.className = "channel-card";

    card.innerHTML = `
      <div class="channel-logo">
        ${
          channel.logo
            ? `<img src="${escapeHTML(channel.logo)}"
                 alt="${escapeHTML(channel.name)}"
                 loading="lazy"
                 onerror="this.style.display='none'">`
            : "📺"
        }
      </div>

      <h3>${escapeHTML(channel.name)}</h3>

      <p>${escapeHTML(channel.country)}</p>

      <p>${escapeHTML(channel.categories.join(", "))}</p>

      <button type="button" class="play-tv">
        ▶ Watch TV
      </button>
    `;

    card.querySelector(".play-tv").addEventListener("click", () => {
      playTV(channel.url, channel.name);
    });

    grid.appendChild(card);
  });

  setText("tvCount", filtered.length);

  const more = $("tvMore");
  if (more) {
    more.style.display =
      visible.length < filtered.length ? "block" : "none";
  }
}

/* ---------- RADIO DATA ---------- */

async function loadRadio() {
  setStatus("radioStatus", "Turimo gushaka Radio stations...");

  try {
    const params = new URLSearchParams({
      limit: "1000",
      hidebroken: "true",
      order: "clickcount",
      reverse: "true"
    });

    const response = await fetch(
      `${RADIO_API}?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Radio API ntisubije neza.");
    }

    const stations = await response.json();

    state.radio = stations
      .filter(station => {
        return (
          station.name &&
          (station.url_resolved || station.url)
        );
      })
      .map(station => ({
        name: station.name,
        country: station.country || "Unknown",
        language: station.language || "Unknown",
        tags: station.tags || "",
        logo: station.favicon || "",
        url: station.url_resolved || station.url,
        codec: station.codec || "",
        bitrate: station.bitrate || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    fillRadioFilters();
    renderRadio();

    setStatus(
      "radioStatus",
      `${state.radio.length} Radio stations zabonetse.`
    );

    setText("radioCount", state.radio.length);

  } catch (error) {
    console.error("Radio loading error:", error);

    setStatus(
      "radioStatus",
      "Radio ntizashoboye gufunguka. Reba internet wongere ugerageze."
    );

    setText(
      "radioMessage",
      "Radio data ntibonetse. Ongera ugerageze nyuma y'igihe gito."
    );
  }
}

/* ---------- RADIO FILTERS ---------- */

function fillRadioFilters() {
  const countrySelect = $("radioCountry");
  const languageSelect = $("radioLanguage");

  if (countrySelect) {
    const countries = [...new Set(
      state.radio.map(station => station.country)
    )].filter(Boolean).sort();

    countrySelect.innerHTML =
      '<option value="">All Countries</option>';

    countries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      countrySelect.appendChild(option);
    });
  }

  if (languageSelect) {
    const languages = [...new Set(
      state.radio.flatMap(station =>
        station.language.split(",").map(language => language.trim())
      )
    )].filter(Boolean).sort();

    languageSelect.innerHTML =
      '<option value="">All Languages</option>';

    languages.forEach(language => {
      const option = document.createElement("option");
      option.value = language;
      option.textContent = language;
      languageSelect.appendChild(option);
    });
  }
}

/* ---------- RENDER RADIO ---------- */

function renderRadio() {
  const grid = $("radioGrid");
  if (!grid) return;

  const search = (
    state.radioSearch + " " + state.globalSearch
  ).toLowerCase().trim();

  const filtered = state.radio.filter(station => {
    const matchesSearch =
      !search ||
      station.name.toLowerCase().includes(search) ||
      station.country.toLowerCase().includes(search) ||
      station.language.toLowerCase().includes(search) ||
      station.tags.toLowerCase().includes(search);

    const matchesCountry =
      !state.radioCountry ||
      station.country === state.radioCountry;

    const matchesLanguage =
      !state.radioLanguage ||
      station.language.toLowerCase().includes(
        state.radioLanguage.toLowerCase()
      );

    return (
      matchesSearch &&
      matchesCountry &&
      matchesLanguage
    );
  });

  const visible = filtered.slice(
    0,
    state.radioPage * PAGE_SIZE
  );

  grid.innerHTML = "";

  if (visible.length === 0) {
    grid.innerHTML =
      "<p>Nta Radio station ibonetse. Gerageza guhindura search.</p>";
  }

  visible.forEach(station => {
    const card = document.createElement("article");
    card.className = "channel-card";

    card.innerHTML = `
      <div class="channel-logo">
        ${
          station.logo
            ? `<img src="${escapeHTML(station.logo)}"
                 alt="${escapeHTML(station.name)}"
                 loading="lazy"
                 onerror="this.style.display='none'">`
            : "📻"
        }
      </div>

      <h3>${escapeHTML(station.name)}</h3>

      <p>${escapeHTML(station.country)}</p>

      <p>${escapeHTML(station.language)}</p>

      <button type="button" class="play-radio">
        ▶ Listen Now
      </button>
    `;

    card.querySelector(".play-radio").addEventListener("click", () => {
      playRadio(station.url, station.name);
    });

    grid.appendChild(card);
  });

  setText("radioCount", filtered.length);

  const more = $("radioMore");
  if (more) {
    more.style.display =
      visible.length < filtered.length ? "block" : "none";
  }
}

/* ---------- SEARCH EVENTS ---------- */

const tvSearch = $("tvSearch");

if (tvSearch) {
  tvSearch.addEventListener("input", event => {
    state.tvSearch = event.target.value;
    state.tvPage = 1;
    renderTV();
  });
}

const radioSearch = $("radioSearch");

if (radioSearch) {
  radioSearch.addEventListener("input", event => {
    state.radioSearch = event.target.value;
    state.radioPage = 1;
    renderRadio();
  });
}

const globalSearch = $("globalSearch");

if (globalSearch) {
  globalSearch.addEventListener("input", event => {
    state.globalSearch = event.target.value;
    state.tvPage = 1;
    state.radioPage = 1;
    renderTV();
    renderRadio();
  });
}

/* ---------- FILTER EVENTS ---------- */

if ($("tvCountry")) {
  $("tvCountry").addEventListener("change", event => {
    state.tvCountry = event.target.value;
    state.tvPage = 1;
    renderTV();
  });
}

if ($("tvCategory")) {
  $("tvCategory").addEventListener("change", event => {
    state.tvCategory = event.target.value;
    state.tvPage = 1;
    renderTV();
  });
}

if ($("radioCountry")) {
  $("radioCountry").addEventListener("change", event => {
    state.radioCountry = event.target.value;
    state.radioPage = 1;
    renderRadio();
  });
}

if ($("radioLanguage")) {
  $("radioLanguage").addEventListener("change", event => {
    state.radioLanguage = event.target.value;
    state.radioPage = 1;
    renderRadio();
  });
}

/* ---------- LOAD MORE BUTTONS ---------- */

if ($("tvMore")) {
  $("tvMore").addEventListener("click", () => {
    state.tvPage++;
    renderTV();
  });
}

if ($("radioMore")) {
  $("radioMore").addEventListener("click", () => {
    state.radioPage++;
    renderRadio();
  });
}

/* ---------- START WEBSITE ---------- */

document.addEventListener("DOMContentLoaded", () => {
  navigate("home");

  loadTV();
  loadRadio();

  const year = $("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  console.log("ITT NEWS is ready.");
});
