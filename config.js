/* ITT NEWS configuration.
   IMPORTANT:
   - "page" is an official website, NOT a playable stream.
   - For in-page playback, add a direct, authorized stream URL.
   - TV stream: usually HLS (.m3u8) or a browser-supported video stream.
   - Radio stream: direct MP3/AAC audio stream.
   Do not add private, paid, geo-restricted or unauthorized URLs.
*/
window.ITT_CONFIG = {
  languages: ["en", "rw", "fr", "sw", "es", "pt", "ar", "zh", "hi", "de", "it", "ja"],

  news: [
    { name: "RBA — Rwanda", category: "Rwanda", url: "https://www.rba.co.rw/" },
    { name: "BBC News", category: "International", url: "https://www.bbc.com/news" },
    { name: "Al Jazeera", category: "International", url: "https://www.aljazeera.com/" },
    { name: "DW News", category: "International", url: "https://www.dw.com/en/top-stories/s-9097" },
    { name: "France 24", category: "International", url: "https://www.france24.com/en/" },
    { name: "Reuters", category: "International", url: "https://www.reuters.com/world/" },
    { name: "The Guardian", category: "International", url: "https://www.theguardian.com/international" }
  ],

  sports: [
    { name: "BBC Sport", category: "International", url: "https://www.bbc.com/sport" },
    { name: "ESPN", category: "International", url: "https://www.espn.com/" },
    { name: "CAF", category: "African football", url: "https://www.cafonline.com/" },
    { name: "FIFA", category: "World football", url: "https://www.fifa.com/" },
    { name: "Olympics", category: "International sport", url: "https://olympics.com/" }
  ],

  tv: [
    { name: "Rwanda TV (RTV)", country: "Rwanda", page: "https://www.rba.co.rw/", stream: "", format: "page" },
    { name: "Flash TV", country: "Rwanda", page: "https://flash.rw/", stream: "", format: "page" },
    { name: "TV10 Rwanda", country: "Rwanda", page: "https://radiotv10.rw/", stream: "", format: "page" },
    { name: "BBC News", country: "United Kingdom", page: "https://www.bbc.com/news", stream: "", format: "page" },
    { name: "Al Jazeera English", country: "Qatar", page: "https://www.aljazeera.com/watch/", stream: "", format: "page" },
    { name: "France 24", country: "France", page: "https://www.france24.com/en/live", stream: "", format: "page" },
    { name: "DW English", country: "Germany", page: "https://www.dw.com/en/live-tv/s-100825", stream: "", format: "page" },
    { name: "NHK World", country: "Japan", page: "https://www3.nhk.or.jp/nhkworld/en/live/", stream: "", format: "page" }
  ],

  radio: [
    { name: "Radio Rwanda", country: "Rwanda", page: "https://www.rba.co.rw/", stream: "", format: "page" },
    { name: "Magic FM", country: "Rwanda", page: "https://www.rba.co.rw/", stream: "", format: "page" },
    { name: "Flash FM", country: "Rwanda", page: "https://flash.rw/", stream: "", format: "page" },
    { name: "Radio 10", country: "Rwanda", page: "https://radiotv10.rw/radio/", stream: "", format: "page" },
    { name: "BBC World Service", country: "United Kingdom", page: "https://www.bbc.co.uk/sounds/play/live:bbc_world_service", stream: "", format: "page" },
    { name: "RFI", country: "France", page: "https://www.rfi.fr/en/", stream: "", format: "page" },
    { name: "Voice of America", country: "United States", page: "https://www.voaafrica.com/", stream: "", format: "page" },
    { name: "Radio France Internationale", country: "International", page: "https://www.rfi.fr/", stream: "", format: "page" }
  ],

  movies: [
    {
      name: "Big Buck Bunny",
      description: "Open Blender animated short film",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.720p.vp9.webm",
      license: "Blender open movie; check attribution terms"
    },
    {
      name: "Sintel",
      description: "Open Blender animated short film",
      url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Sintel_movie_4K.webm/Sintel_movie_4K.webm.720p.vp9.webm",
      license: "Blender open movie; check attribution terms"
    },
    {
      name: "Tears of Steel",
      description: "Open Blender science-fiction short film",
      url: "https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov",
      license: "Blender open movie; check attribution terms"
    }
  ]
};
