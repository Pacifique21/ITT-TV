
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const TV_API = "https://iptv-org.github.io/api";
  const RADIO_API = "https://all.api.radio-browser.info/json";
  const PAGE_SIZE = 40;

  const state = {
    tv: [],
    radio: [],
    tvLimit: PAGE_SIZE,
    radioLimit: PAGE_SIZE,
    hls: null
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  async function getJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Request failed: " + response.status);
    }

    return response.json();
  }

  // NAVIGATION
  function navigate(page) {
    document.querySelectorAll(".page").forEach(section => {
      section.classList.toggle("active", section.id === page);
    });

    document.querySelectorAll(".nav-btn").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      navigate(button.dataset.page);
    });
  });

  // SELECT OPTIONS
  function fillSelect(id, values, label) {
    const select = $(id);
    const oldValue = select.value;

    const unique = [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    select.innerHTML =
      `<option value="">${label}</option>` +
      unique.map(value =>
        `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
      ).join("");

    if (unique.includes(oldValue)) {
      select.value = oldValue;
    }
  }

  // -----------------------------
  // TELEVISION DIRECTORY
  // -----------------------------

  async function loadTV() {
    $("tvStatus").textContent = "Loading worldwide TV channels...";

    try {
      const [channels, streams, countries] = await Promise.all([
        getJSON(`${TV_API}/channels.json`),
        getJSON(`${TV_API}/streams.json`),
        getJSON(`${TV_API}/countries.json`)
      ]);

      const countryNames = new Map(
        countries.map(country => [
          country.code,
          country.name
        ])
      );

      const streamMap = new Map();

      streams.forEach(stream => {
        if (!stream.channel || !stream.url) return;

        if (!streamMap.has(stream.channel)) {
          streamMap.set(stream.channel, []);
        }

        streamMap.get(stream.channel).push(stream);
      });

      state.tv = channels
        .filter(channel =>
          channel &&
          channel.name &&
          channel.is_nsfw !== true
        )
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          country: channel.country || "",
          countryName:
            countryNames.get(channel.country) ||
            channel.country ||
            "Unknown country",
          categories: Array.isArray(channel.categories)
            ? channel.categories
            : [],
          logo: channel.logo
            ? `https://iptv-org.github.io/api/logos/${encodeURIComponent(channel.logo)}`
            : "",
          streams: streamMap.get(channel.id) || []
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      fillSelect(
        "tvCountry",
        state.tv.map(channel => channel.countryName),
        "All countries"
      );

      fillSelect(
        "tvCategory",
        state.tv.flatMap(channel => channel.categories),
        "All categories"
      );

      $("tvCount").textContent =
        state.tv.length.toLocaleString();

      renderTV();

    } catch (error) {
      console.error("TV loading error:", error);

      $("tvStatus").textContent =
        "TV directory could not load.";

      $("tvGrid").innerHTML =
        `<p class="channel-meta">
          TV channels could not be loaded.
          Check your internet connection and refresh the page.
        </p>`;
    }
  }

  function renderTV() {
    const query = $("tvSearch").value
      .trim()
      .toLowerCase();

    const country = $("tvCountry").value;
    const category = $("tvCategory").value;

    const filtered = state.tv.filter(channel => {
      const searchable = [
        channel.name,
        channel.countryName,
        ...channel.categories
      ].join(" ").toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (!country || channel.countryName === country) &&
        (!category || channel.categories.includes(category))
      );
    });

    $("tvStatus").textContent =
      `${filtered.length.toLocaleString()} TV channels found`;

    const visible = filtered.slice(0, state.tvLimit);

    $("tvGrid").innerHTML = visible.map(channel => {
      const logo = channel.logo
        ? `<img class="channel-logo"
             src="${escapeHTML(channel.logo)}"
             alt=""
             loading="lazy"
             onerror="this.style.display='none'">`
        : "";

      return `
        <article class="channel-card">
          ${logo}

          <strong>${escapeHTML(channel.name)}</strong>

          <div class="channel-meta">
            ${escapeHTML(channel.countryName)}<br>
            ${escapeHTML(channel.categories.join(", ") || "General TV")}<br>
            ${channel.streams.length} listed stream(s)
          </div>

          <button
            data-watch="${escapeHTML(channel.id)}"
            ${channel.streams.length ? "" : "disabled"}>
            ${channel.streams.length ? "Watch TV" : "No stream listed"}
          </button>
        </article>
      `;
    }).join("") || `
      <p class="channel-meta">
        No TV channels found. Try another search.
      </p>
    `;

    $("tvMore").hidden =
      state.tvLimit >= filtered.length;
  }

  // PLAY TV
  function watchTV(channelId) {
    const channel = state.tv.find(
      item => item.id === channelId
    );

    if (!channel || !channel.streams.length) return;

    const stream = channel.streams[0];
    const video = $("tvPlayer");
    const url = stream.url;

    $("tvTitle").textContent = channel.name;
    $("tvMessage").textContent = "Connecting to TV stream...";

    if (state.hls) {
      state.hls.destroy();
      state.hls = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (
      window.Hls &&
      Hls.isSupported() &&
      /\.m3u8($|\?)/i.test(url)
    ) {
      state.hls = new Hls();

      state.hls.loadSource(url);
      state.hls.attachMedia(video);

      state.hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {
          video.play()
            .then(() => {
              $("tvMessage").textContent = "Playing live TV.";
            })
            .catch(() => {
              $("tvMessage").textContent =
                "Press Play to start watching.";
            });
        }
      );

      state.hls.on(
        Hls.Events.ERROR,
        (_, data) => {
          if (data.fatal) {
            $("tvMessage").textContent =
              "This TV stream is unavailable. Try another channel.";
          }
        }
      );

    } else {
      video.src = url;

      video.play()
        .then(() => {
          $("tvMessage").textContent = "Playing live TV.";
        })
        .catch(() => {
          $("tvMessage").textContent =
            "Press Play or try another channel.";
        });
    }
  }

  $("tvGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-watch]");

    if (button) {
      watchTV(button.dataset.watch);
    }
  });

  // -----------------------------
  // RADIO DIRECTORY
  // -----------------------------

  async function loadRadio() {
    $("radioStatus").textContent =
      "Loading worldwide radio stations...";

    try {
      const stations = await getJSON(
        `${RADIO_API}/stations/search?hidebroken=true&order=clickcount&reverse=true&limit=1000`
      );

      state.radio = stations
        .filter(station =>
          station &&
          station.name &&
          station.url_resolved
        )
        .map(station => ({
          id: station.stationuuid,
          name: station.name,
          country: station.country || "",
          language: (station.language || "")
            .split(",")[0]
            .trim(),
          tags: station.tags || "",
          codec: station.codec || "",
          bitrate: station.bitrate || 0,
          logo: station.favicon || "",
          url: station.url_resolved
        }));

      fillSelect(
        "radioCountry",
        state.radio.map(station => station.country),
        "All countries"
      );

      fillSelect(
        "radioLanguage",
        state.radio.map(station => station.language),
        "All languages"
      );

      $("radioCount").textContent =
        state.radio.length.toLocaleString();

      renderRadio();

    } catch (error) {
      console.error("Radio loading error:", error);

      $("radioStatus").textContent =
        "Radio directory could not load.";

      $("radioGrid").innerHTML =
        `<p class="channel-meta">
          Radio stations could not be loaded.
          Check your internet connection and refresh the page.
        </p>`;
    }
  }

  function renderRadio() {
    const query = $("radioSearch").value
      .trim()
      .toLowerCase();

    const country = $("radioCountry").value;
    const language = $("radioLanguage").value;

    const filtered = state.radio.filter(station => {
      const searchable = [
        station.name,
        station.country,
        station.language,
        station.tags
      ].join(" ").toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (!country || station.country === country) &&
        (!language || station.language === language)
      );
    });

    $("radioStatus").textContent =
      `${filtered.length.toLocaleString()} radio stations found`;

    const visible = filtered.slice(0, state.radioLimit);

    $("radioGrid").innerHTML = visible.map(station => {
      const logo = station.logo
        ? `<img class="channel-logo"
             src="${escapeHTML(station.logo)}"
             alt=""
             loading="lazy"
             onerror="this.style.display='none'">`
        : "";

      return `
        <article class="channel-card">
          ${logo}

          <strong>${escapeHTML(station.name)}</strong>

          <div class="channel-meta">
            ${escapeHTML(station.country || "Unknown country")}<br>
            ${escapeHTML(station.language || "Language not listed")}<br>
            ${escapeHTML(station.codec || "Audio")}
            ${station.bitrate ? " · " + station.bitrate + " kbps" : ""}
          </div>

          <button data-listen="${escapeHTML(station.id)}">
            Listen
          </button>
        </article>
      `;
    }).join("") || `
      <p class="channel-meta">
        No radio stations found. Try another search.
      </p>
    `;

    $("radioMore").hidden =
      state.radioLimit >= filtered.length;
  }

  // PLAY RADIO
  function listenRadio(stationId) {
    const station = state.radio.find(
      item => item.id === stationId
    );

    if (!station) return;

    const player = $("radioPlayer");

    player.pause();
    player.src = station.url;

    $("radioTitle").textContent = station.name;

    $("radioMessage").textContent =
      `${station.country || "Unknown country"} · ` +
      `${station.language || "Language not listed"}`;

    player.play().catch(() => {
      $("radioMessage").textContent =
        "Press Play or try another station. This stream may be unavailable.";
    });
  }

  $("radioGrid").addEventListener("click", event => {
    const button = event.target.closest("[data-listen]");

    if (button) {
      listenRadio(button.dataset.listen);
    }
  });

  // SEARCH AND FILTERS
  ["tvSearch", "tvCountry", "tvCategory"].forEach(id => {
    $(id).addEventListener("input", () => {
      state.tvLimit = PAGE_SIZE;
      renderTV();
    });
  });

  ["radioSearch", "radioCountry", "radioLanguage"].forEach(id => {
    $(id).addEventListener("input", () => {
      state.radioLimit = PAGE_SIZE;
      renderRadio();
    });
  });

  // LOAD MORE
  $("tvMore").addEventListener("click", () => {
    state.tvLimit += PAGE_SIZE;
    renderTV();
  });

  $("radioMore").addEventListener("click", () => {
    state.radioLimit += PAGE_SIZE;
    renderRadio();
  });

  // GLOBAL SEARCH
  $("globalSearch").addEventListener("keydown", event => {
    if (event.key !== "Enter") return;

    const query = event.target.value.trim();

    navigate("tv");

    $("tvSearch").value = query;
    $("radioSearch").value = query;

    state.tvLimit = PAGE_SIZE;
    state.radioLimit = PAGE_SIZE;

    renderTV();
    renderRadio();
  });

  // YEAR
  $("year").textContent = new Date().getFullYear();

  // START
  loadTV();
  loadRadio();

})();
