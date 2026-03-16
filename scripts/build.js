import fs from "fs";
import path from "path";
import yaml from "js-yaml";

const ROOT = path.resolve("docs");
const DATA = path.resolve("data");
const ASSETS = path.resolve("assets");
const TRANSCRIPTS = path.resolve("data", "transcripts");

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------
const surahs = JSON.parse(
  fs.readFileSync(path.join(DATA, "surahs.json"), "utf8"),
);
const translation = JSON.parse(
  fs.readFileSync(path.join(DATA, "translation.json"), "utf8"),
);
const videoData = yaml.load(
  fs.readFileSync(path.join(DATA, "videos.yaml"), "utf8"),
);

// ---------------------------------------------------------------------------
// Build video index: "surah:ayah" -> [video objects]
// ---------------------------------------------------------------------------
function parseVideoId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

function loadTranscript(videoID) {
  const mdPath = path.join(TRANSCRIPTS, `${videoID}.md`);
  if (fs.existsSync(mdPath)) {
    return fs.readFileSync(mdPath, "utf8");
  }
  return null;
}

// Split transcript markdown by <!-- ayah:N --> markers.
// Returns a map: ayahNum -> markdown string for that ayah.
// Content before the first marker (or with no markers) is assigned to ayah 0 (meaning "all").
function splitTranscriptByAyah(md) {
  const sections = {};
  const marker = /<!--\s*ayah:(\d+)\s*-->/g;
  let lastAyah = 0;
  let lastIdx = 0;
  let match;
  while ((match = marker.exec(md)) !== null) {
    const chunk = md.slice(lastIdx, match.index).trim();
    if (chunk) {
      if (!sections[lastAyah]) sections[lastAyah] = "";
      sections[lastAyah] += (sections[lastAyah] ? "\n\n" : "") + chunk;
    }
    lastAyah = parseInt(match[1]);
    lastIdx = match.index + match[0].length;
  }
  const tail = md.slice(lastIdx).trim();
  if (tail) {
    if (!sections[lastAyah]) sections[lastAyah] = "";
    sections[lastAyah] += (sections[lastAyah] ? "\n\n" : "") + tail;
  }
  return sections;
}

function markdownToHtml(md) {
  let html = md;
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  const lines = html.split("\n");
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result.push(""); continue; }
    if (
      trimmed.startsWith("<h") ||
      trimmed.startsWith("<ul") ||
      trimmed.startsWith("<ol") ||
      trimmed.startsWith("<li") ||
      trimmed.startsWith("</") ||
      trimmed.startsWith("<hr") ||
      trimmed.startsWith("<blockquote") ||
      trimmed.startsWith("<p")
    ) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }
  return result.join("\n");
}

const surahOverviewIndex = {};

function buildVideoIndex(videos) {
  const index = {};
  for (const video of videos) {
    const parts = video.verses.toString().split(":");
    const surahNum = parseInt(parts[0]);
    const ayahPart = parts[1];
    let startAyah, endAyah;
    if (ayahPart.includes("-")) {
      [startAyah, endAyah] = ayahPart.split("-").map(Number);
    } else {
      startAyah = endAyah = parseInt(ayahPart);
    }
    const videoID = parseVideoId(video.url);
    if (!videoID) continue;

    const transcriptMd = loadTranscript(videoID);
    const ayahSections = transcriptMd ? splitTranscriptByAyah(transcriptMd) : null;

    const isOverview =
      ayahSections &&
      Object.keys(ayahSections).length === 1 &&
      ayahSections[0] !== undefined;

    if (isOverview) {
      if (!surahOverviewIndex[surahNum]) surahOverviewIndex[surahNum] = [];
      surahOverviewIndex[surahNum].push({
        videoID,
        videoUrl: `https://www.youtube.com/watch?v=${videoID}`,
        embedUrl: `https://www.youtube.com/embed/${videoID}`,
        speaker: video.speaker,
        versesLabel: `${surahs[surahNum - 1].name}: ${startAyah}${startAyah !== endAyah ? "-" + endAyah : ""}`,
        transcriptHtml: markdownToHtml(ayahSections[0]),
      });
    }

    for (let a = startAyah; a <= endAyah; a++) {
      const key = `${surahNum}:${a}`;
      if (!index[key]) index[key] = [];

      let transcriptHtml = null;
      if (!isOverview && ayahSections) {
        const p = [];
        if (ayahSections[0]) p.push(ayahSections[0]);
        if (ayahSections[a] && a !== 0) p.push(ayahSections[a]);
        if (p.length > 0) transcriptHtml = markdownToHtml(p.join("\n\n"));
      }

      index[key].push({
        videoID,
        videoUrl: `https://www.youtube.com/watch?v=${videoID}`,
        embedUrl: `https://www.youtube.com/embed/${videoID}`,
        speaker: video.speaker,
        versesLabel: `${surahs[surahNum - 1].name}: ${startAyah}${startAyah !== endAyah ? "-" + endAyah : ""}`,
        firstAyahUrl: `/surah/${surahNum}/ayah/${startAyah}/`,
        overviewUrl: isOverview ? `/surah/${surahNum}/overview/` : null,
        transcriptHtml,
      });
    }
  }
  return index;
}

const videoIndex = buildVideoIndex(videoData.videos);

// ---------------------------------------------------------------------------
// Surah stats: which surahs have videos, how many ayahs
// ---------------------------------------------------------------------------
function buildSurahStats() {
  const stats = {};
  for (const key of Object.keys(videoIndex)) {
    const [surahNum, ayahNum] = key.split(":").map(Number);
    if (!stats[surahNum]) stats[surahNum] = new Set();
    stats[surahNum].add(ayahNum);
  }
  return stats;
}

const surahStats = buildSurahStats();

// Sorted list of all ayah pages for prev/next navigation
const allAyahPages = Object.keys(videoIndex)
  .map((k) => {
    const [s, a] = k.split(":").map(Number);
    return { surah: s, ayah: a };
  })
  .sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);

function findPrevNext(surahNum, ayahNum) {
  const idx = allAyahPages.findIndex(
    (p) => p.surah === surahNum && p.ayah === ayahNum,
  );
  const prev = idx > 0 ? allAyahPages[idx - 1] : null;
  const next = idx < allAyahPages.length - 1 ? allAyahPages[idx + 1] : null;
  return { prev, next };
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlHead(title, description, extraHead = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="stylesheet" href="/assets/css/main.css">
  ${extraHead}
</head>
<body>`;
}

function htmlFooter() {
  return `
  <footer class="site-footer" style="width:100vw;margin-left:calc(50% - 50vw);">
    <div class="footer-stat">
      <span class="stat-value">TafseerTube</span>
      <span class="stat-subvalue">Curated tafseer videos for the Quran</span>
    </div>
    <div class="footer-disclaimer">
      <p>It is always best to consult with a trusted, local scholar for questions about the Quran.</p>
    </div>
  </footer>`;
}

function topNav() {
  return `
  <nav class="top-nav">
    <a href="/" class="nav-link">Home</a>
  </nav>`;
}

function patternBg() {
  return `<div class="pattern-bg" aria-hidden="true"></div>`;
}

// ---------------------------------------------------------------------------
// Page builders
// ---------------------------------------------------------------------------

function buildHomepage() {
  // Marquee data
  const marqueeCards = videoData.videos.map((video) => {
    const parts = video.verses.toString().split(":");
    const surahNum = parseInt(parts[0]);
    const ayahPart = parts[1];
    let startAyah;
    if (ayahPart.includes("-")) {
      startAyah = parseInt(ayahPart.split("-")[0]);
    } else {
      startAyah = parseInt(ayahPart);
    }
    const surahName = surahs[surahNum - 1].name;
    const trans =
      translation[surahNum] && translation[surahNum][startAyah]
        ? translation[surahNum][startAyah].substring(0, 120) +
          (translation[surahNum][startAyah].length > 120 ? "..." : "")
        : "";
    return { surahName, surahNum, ayahPart, startAyah, speaker: video.speaker, translation: trans };
  });

  // Surahs with videos (for browse section)
  const browseSurahs = Object.keys(surahStats)
    .map(Number)
    .sort((a, b) => a - b)
    .map((num) => ({
      id: num,
      name: surahs[num - 1].name,
      count: surahStats[num].size,
    }));

  // Search data (inline JSON for client-side search)
  const searchData = browseSurahs.map((s) => ({
    id: s.id,
    name: s.name,
    count: s.count,
  }));

  const marqueeHtml = marqueeCards
    .map(
      (v) => `
          <a class="video-card" href="/surah/${v.surahNum}/ayah/${v.startAyah}/">
            <span class="video-card-surah">${escapeHtml(v.surahName)} &middot; Ayah ${v.ayahPart}</span>
            <p class="video-card-title">${escapeHtml(v.translation)}</p>
            <div class="video-card-footer">
              <span class="video-card-speaker">${escapeHtml(v.speaker)}</span>
            </div>
          </a>`,
    )
    .join("");

  const chipsHtml = browseSurahs
    .map(
      (s) => `
          <a class="surah-chip" href="/surah/${s.id}/">
            ${escapeHtml(s.name)}
            <span class="chip-count">${s.count}</span>
          </a>`,
    )
    .join("");

  return `${htmlHead(
    "TafseerTube - Quranic Video Commentary",
    "Watch curated tafseer videos for every ayah of the Quran, from scholars like Nouman Ali Khan, Yasir Qadhi, Mufti Menk, and more.",
  )}
${patternBg()}
<main class="landing">
  ${topNav()}
  <section class="hero">
    <div class="bismillah" aria-hidden="true">&#1576;&#1587;&#1605; &#1575;&#1604;&#1604;&#1607; &#1575;&#1604;&#1585;&#1581;&#1605;&#1606; &#1575;&#1604;&#1585;&#1581;&#1610;&#1605;</div>
    <p class="eyebrow">Quranic video commentary</p>
    <h1 class="site-title">Tafseer<em>Tube</em></h1>
    <p class="site-tagline">Watch curated tafseer videos for every ayah of the Quran, from scholars like Nouman Ali Khan, Yasir Qadhi, and more.</p>
    <div class="search-wrap">
      <div class="search-box">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="9" cy="9" r="5.5"></circle>
          <path d="M14 14L17.5 17.5"></path>
        </svg>
        <input class="search-input" type="text" placeholder="Search a surah, e.g. Al-Fatiha, Baqarah, 36..." autocomplete="off" spellcheck="false" id="searchInput">
      </div>
      <div class="results" id="searchResults" style="display:none"></div>
    </div>
  </section>

  ${
    marqueeCards.length > 0
      ? `
  <section class="recent-section">
    <p class="ornament" aria-hidden="true">&#10022; &#10022; &#10022;</p>
    <p class="recent-label">Available tafseer videos</p>
    <div class="marquee-wrap">
      <div class="marquee-track">
        ${marqueeHtml}${marqueeHtml}
      </div>
    </div>
  </section>`
      : ""
  }

  <section class="browse-section">
    <p class="ornament" aria-hidden="true">&#10022; &#10022; &#10022;</p>
    <p class="browse-label">Browse surahs with tafseer</p>
    <div class="surah-chips">
      ${chipsHtml}
    </div>
  </section>

  ${htmlFooter()}
</main>

<script>
var SEARCH_DATA = ${JSON.stringify(searchData)};
</script>
<script src="/assets/js/search.js"></script>
</body>
</html>`;
}

function buildSurahOverviewPage(surahNum) {
  const surah = surahs[surahNum - 1];
  const overviewVideos = surahOverviewIndex[surahNum] || [];
  const ayahNums = surahStats[surahNum] ? [...surahStats[surahNum]].sort((a, b) => a - b) : [];
  const firstAyah = ayahNums[0];

  const videosHtml = overviewVideos
    .map((v) => `
        <div class="transcript-item">
          <div class="transcript-header">
            <span class="video-speaker-badge">${escapeHtml(v.speaker)}</span>
            <span class="video-verses-badge">${escapeHtml(v.versesLabel)}</span>
            <a href="${v.videoUrl}" target="_blank" rel="noopener" class="video-link-badge">Watch Video</a>
          </div>
          <div class="transcript-body">
            ${v.transcriptHtml}
          </div>
        </div>`)
    .join("");

  return `${htmlHead(
    `${surah.name} Overview - TafseerTube`,
    `Surah ${surah.name} overview and introduction — tafseer commentary by ${overviewVideos.map((v) => v.speaker).join(", ")}.`,
  )}
${patternBg()}
<main class="page">
  ${topNav()}
  <div class="breadcrumb">
    <a href="/">Home</a>
    <span class="breadcrumb-sep">&rsaquo;</span>
    <a href="/surah/${surahNum}/">${escapeHtml(surah.name)}</a>
    <span class="breadcrumb-sep">&rsaquo;</span>
    Overview
  </div>

  <div class="verse-header">
    <p class="verse-header-surah">Surah ${surahNum} &middot; ${escapeHtml(surah.name)}</p>
    <h1 class="verse-header-title">Overview</h1>
    <p class="verse-header-translation">Surah-level introduction and commentary</p>
    ${firstAyah ? `<div class="verse-nav-arrows"><a class="verse-nav-btn" href="/surah/${surahNum}/ayah/${firstAyah}/">Go to Ayah ${firstAyah} &rarr;</a></div>` : ""}
  </div>

  <div class="videos-section">
    <p class="videos-heading">${overviewVideos.length} Overview Commentar${overviewVideos.length !== 1 ? "ies" : "y"}</p>
    <div class="commentary-list">
      ${videosHtml}
    </div>
  </div>

  <footer class="site-footer" style="width:100vw;margin-left:calc(50% - 50vw);">
    <div class="footer-stat">
      <span class="stat-value">TafseerTube</span>
      <span class="stat-subvalue">Curated tafseer videos for the Quran</span>
    </div>
    <div class="footer-disclaimer">
      <p>It is always best to consult with a trusted, local scholar for questions about the Quran.</p>
    </div>
  </footer>
</main>
</body>
</html>`;
}

function buildSurahPage(surahNum) {
  const surah = surahs[surahNum - 1];
  const ayahNums = [...surahStats[surahNum]].sort((a, b) => a - b);
  const hasOverview = !!surahOverviewIndex[surahNum];

  const overviewCardHtml = hasOverview
    ? `
        <a class="ayah-card overview-card" href="/surah/${surahNum}/overview/">
          <div class="ayah-card-header">
            <span class="ayah-card-num">Overview</span>
            <span class="ayah-card-count">${surahOverviewIndex[surahNum].length} video${surahOverviewIndex[surahNum].length !== 1 ? "s" : ""}</span>
          </div>
          <p class="ayah-card-translation">Surah-level introduction and commentary</p>
          <div class="ayah-card-speakers">${[...new Set(surahOverviewIndex[surahNum].map((v) => v.speaker))].map((s) => `<span class="speaker-tag">${escapeHtml(s)}</span>`).join("")}</div>
        </a>`
    : "";

  const ayahCardsHtml = ayahNums
    .map((ayahNum) => {
      const videos = videoIndex[`${surahNum}:${ayahNum}`] || [];
      const trans = translation[surahNum] && translation[surahNum][ayahNum]
        ? translation[surahNum][ayahNum]
        : "";
      const truncated =
        trans.length > 150 ? trans.substring(0, 150) + "..." : trans;
      const speakers = [...new Set(videos.map((v) => v.speaker))];
      return `
        <a class="ayah-card" href="/surah/${surahNum}/ayah/${ayahNum}/">
          <div class="ayah-card-header">
            <span class="ayah-card-num">Ayah ${ayahNum}</span>
            <span class="ayah-card-count">${videos.length} video${videos.length !== 1 ? "s" : ""}</span>
          </div>
          <p class="ayah-card-translation">${escapeHtml(truncated)}</p>
          <div class="ayah-card-speakers">${speakers.map((s) => `<span class="speaker-tag">${escapeHtml(s)}</span>`).join("")}</div>
        </a>`;
    })
    .join("");

  return `${htmlHead(
    `${surah.name} - TafseerTube`,
    `Watch tafseer videos for Surah ${surah.name} (${ayahNums.length} ayahs with commentary)`,
  )}
${patternBg()}
<main class="page">
  ${topNav()}
  <div class="breadcrumb">
    <a href="/">Home</a>
    <span class="breadcrumb-sep">&rsaquo;</span>
    ${escapeHtml(surah.name)}
  </div>

  <div class="verse-header">
    <p class="verse-header-surah">Surah ${surahNum}</p>
    <h1 class="verse-header-title">${escapeHtml(surah.name)}</h1>
    <p class="verse-header-translation">${ayahNums.length} ayah${ayahNums.length !== 1 ? "s" : ""} with tafseer commentary <span style="font-weight:400;font-size:14px;color:var(--text-dim)">(${surah.ayahs} ayahs total)</span></p>
  </div>

  <div class="ayah-grid">
    ${overviewCardHtml}
    ${ayahCardsHtml}
  </div>

  ${htmlFooter()}
</main>
</body>
</html>`;
}

function buildAyahPage(surahNum, ayahNum) {
  const surah = surahs[surahNum - 1];
  const videos = videoIndex[`${surahNum}:${ayahNum}`] || [];
  const trans =
    translation[surahNum] && translation[surahNum][ayahNum]
      ? translation[surahNum][ayahNum]
      : "";
  const { prev, next } = findPrevNext(surahNum, ayahNum);

  const videosHtml = videos
    .map(
      (v) => {
        if (v.transcriptHtml) {
          return `
        <div class="transcript-item">
          <div class="transcript-header">
            <span class="video-speaker-badge">${escapeHtml(v.speaker)}</span>
            <a href="${v.firstAyahUrl}" class="video-verses-badge">${escapeHtml(v.versesLabel)}</a>
            <a href="${v.videoUrl}" target="_blank" rel="noopener" class="video-link-badge">Watch Video</a>
          </div>
          <div class="transcript-body">
            ${v.transcriptHtml}
          </div>
        </div>`;
        }
        if (v.overviewUrl) {
          return `
        <div class="transcript-item">
          <div class="transcript-header">
            <span class="video-speaker-badge">${escapeHtml(v.speaker)}</span>
            <span class="video-verses-badge">${escapeHtml(v.versesLabel)}</span>
            <a href="${v.videoUrl}" target="_blank" rel="noopener" class="video-link-badge">Watch Video</a>
          </div>
          <div class="transcript-body overview-notice">
            <p>This video covers the full passage. <a href="${v.overviewUrl}">Read the overview commentary &rarr;</a></p>
          </div>
        </div>`;
        }
        return `
        <div class="video-item">
          <iframe src="${v.embedUrl}" title="YouTube video player" loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen></iframe>
          <div class="video-item-meta">
            <span class="video-speaker-badge">${escapeHtml(v.speaker)}</span>
            <a href="${v.firstAyahUrl}" class="video-verses-badge">${escapeHtml(v.versesLabel)}</a>
          </div>
        </div>`;
      },
    )
    .join("");

  const prevBtn = prev
    ? `<a class="verse-nav-btn" href="/surah/${prev.surah}/ayah/${prev.ayah}/">&larr; ${surahs[prev.surah - 1].name} ${prev.ayah}</a>`
    : `<span class="verse-nav-btn disabled">&larr; Previous</span>`;
  const nextBtn = next
    ? `<a class="verse-nav-btn" href="/surah/${next.surah}/ayah/${next.ayah}/">${surahs[next.surah - 1].name} ${next.ayah} &rarr;</a>`
    : `<span class="verse-nav-btn disabled">Next &rarr;</span>`;

  return `${htmlHead(
    `${surah.name} Ayah ${ayahNum} - TafseerTube`,
    `Watch tafseer videos for ${surah.name}, Ayah ${ayahNum}: ${trans.substring(0, 160)}`,
  )}
${patternBg()}
<main class="page">
  ${topNav()}
  <div class="breadcrumb">
    <a href="/">Home</a>
    <span class="breadcrumb-sep">&rsaquo;</span>
    <a href="/surah/${surahNum}/">${escapeHtml(surah.name)}</a>
    <span class="breadcrumb-sep">&rsaquo;</span>
    Ayah ${ayahNum}
  </div>

  <div class="verse-header">
    <p class="verse-header-surah">Surah ${surahNum} &middot; ${escapeHtml(surah.name)}</p>
    <h1 class="verse-header-title">Ayah ${ayahNum} <span style="font-weight:400;font-size:18px;color:var(--text-dim)">of ${surah.ayahs}</span></h1>
    <p class="verse-header-translation">${escapeHtml(trans)}</p>
    <div class="verse-nav-arrows">
      ${prevBtn}
      ${nextBtn}
    </div>
  </div>

  ${
    videos.length > 0
      ? `
  <div class="videos-section">
    <p class="videos-heading">${videos.length} Tafseer${videos.length > 1 ? " Commentaries" : " Commentary"}</p>
    <div class="commentary-list">
      ${videosHtml}
    </div>
  </div>`
      : ""
  }

  <footer class="site-footer" style="width:100vw;margin-left:calc(50% - 50vw);">
    <div class="footer-stat">
      <span class="stat-value">TafseerTube</span>
      <span class="stat-subvalue">Curated tafseer videos for the Quran</span>
    </div>
    <div class="footer-disclaimer">
      <p>It is always best to consult with a trusted, local scholar for questions about the Quran.</p>
    </div>
  </footer>
</main>
</body>
</html>`;
}

function buildSitemap() {
  const urls = ["/"];
  for (const surahNum of Object.keys(surahStats).map(Number).sort((a, b) => a - b)) {
    urls.push(`/surah/${surahNum}/`);
    if (surahOverviewIndex[surahNum]) urls.push(`/surah/${surahNum}/overview/`);
    for (const ayahNum of [...surahStats[surahNum]].sort((a, b) => a - b)) {
      urls.push(`/surah/${surahNum}/ayah/${ayahNum}/`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemapindex.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>https://tafseertube.com${u}</loc></url>`).join("\n")}
</urlset>`;
  return xml;
}

// ---------------------------------------------------------------------------
// Clean & build
// ---------------------------------------------------------------------------

// Clean generated content but preserve CNAME, favicon.png
function cleanDocs() {
  const preserve = new Set(["CNAME", "favicon.png"]);
  if (fs.existsSync(ROOT)) {
    for (const entry of fs.readdirSync(ROOT)) {
      if (preserve.has(entry)) continue;
      const p = path.join(ROOT, entry);
      fs.rmSync(p, { recursive: true, force: true });
    }
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build() {
  console.log("Cleaning docs/...");
  cleanDocs();

  console.log("Copying assets...");
  copyDir(ASSETS, path.join(ROOT, "assets"));

  console.log("Building homepage...");
  fs.writeFileSync(path.join(ROOT, "index.html"), buildHomepage());

  // Build surah & ayah pages
  const surahNums = Object.keys(surahStats)
    .map(Number)
    .sort((a, b) => a - b);

  let pageCount = 0;
  for (const surahNum of surahNums) {
    console.log(`Building surah ${surahNum} (${surahs[surahNum - 1].name})...`);
    const surahDir = path.join(ROOT, "surah", surahNum.toString());
    fs.mkdirSync(surahDir, { recursive: true });
    fs.writeFileSync(path.join(surahDir, "index.html"), buildSurahPage(surahNum));

    if (surahOverviewIndex[surahNum]) {
      const overviewDir = path.join(surahDir, "overview");
      fs.mkdirSync(overviewDir, { recursive: true });
      fs.writeFileSync(path.join(overviewDir, "index.html"), buildSurahOverviewPage(surahNum));
    }

    const ayahNums = [...surahStats[surahNum]].sort((a, b) => a - b);
    for (const ayahNum of ayahNums) {
      const ayahDir = path.join(surahDir, "ayah", ayahNum.toString());
      fs.mkdirSync(ayahDir, { recursive: true });
      fs.writeFileSync(
        path.join(ayahDir, "index.html"),
        buildAyahPage(surahNum, ayahNum),
      );
      pageCount++;
    }
  }

  console.log("Building sitemap...");
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), buildSitemap());

  console.log(
    `Done! Built ${surahNums.length} surah pages and ${pageCount} ayah pages.`,
  );
}

build();
