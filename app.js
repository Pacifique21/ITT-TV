
  /* ===================== TV — OPTIMIZED ===================== */

  function loadTV() {
    state.tv = TV_CHANNELS.map((channel, index) => ({
      ...channel,
      id: `tv-${index}`
    }));

    populateCountries("tvCountry", state.tv);
    renderTV();

    setText("tvCount", `${state.tv.length} channels`);
    showStatus("tvMessage", "Hitamo TV ushaka kureba.");
  }

  function renderTV() {
    const list = $("tvList");
    if (!list) return;

    const query = ($("tvSearch")?.value || "").toLowerCase().trim();
    const country = $("tvCountry")?.value || "all";

    const channels = state.tv.filter(channel => {
      const matchesCountry =
        country === "all" || channel.country === country;

      const matchesSearch =
        !query ||
        `${channel.name} ${channel.country}`.toLowerCase().includes(query);

      return matchesCountry && matchesSearch;
    });

    list.replaceChildren();

    channels.forEach(channel => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "channel-item";

      button.innerHTML = `
        <span class="channel-logo">▶</span>
        <span class="channel-info">
          <strong>${escapeHTML(channel.name)}</strong>
          <small>${escapeHTML(channel.country)}</small>
        </span>
        <span class="channel-live">WATCH</span>
      `;

      button.addEventListener("click", () => playTV(channel, button));
      list.appendChild(button);
    });
  }

  function stopTV() {
    const video = $("tvVideo");

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.classList.add("hidden");
    }

    const frame = $("tvEmbed");

    if (frame) {
      frame.src = "about:blank";
      frame.classList.add("hidden");
    }

    $("tvPlaceholder")?.classList.remove("hidden");
  }

  function playTV(channel, selectedButton) {
    stopTV();

    setText("tvNowPlaying", channel.name);

    const external = $("tvExternal");
    if (external) {
      external.href = safeURL(channel.page || channel.home);
      external.target = "_blank";
      external.rel = "noopener noreferrer";
      external.classList.remove("hidden");
    }

    $("tvList")?.querySelectorAll(".channel-item").forEach(button => {
      button.classList.toggle("active", button === selectedButton);
    });

    const frame = $("tvEmbed");
    if (!frame) {
      showStatus("tvMessage", "TV player ntiyabonetse.");
      return;
    }

    $("tvPlaceholder")?.classList.add("hidden");
    frame.classList.remove("hidden");

    frame.setAttribute("loading", "lazy");
    frame.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    frame.src = safeURL(channel.page);

    showStatus(
      "tvMessage",
      `${channel.name} iragerageza gufunguka. Niba idakinze, kanda Official broadcaster.`
    );
  }

  function initTV() {
    $("refreshTV")?.addEventListener("click", loadTV);
    $("tvSearch")?.addEventListener("input", renderTV);
    $("tvCountry")?.addEventListener("change", renderTV);
  }
