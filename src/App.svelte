<script>
  import { afterUpdate } from "svelte";
  import yaml from "js-yaml";
  import translationData from "./translation.json";

  const surahs = [
    { id: 1, name: "Al-Fatiha", ayahs: 7 },
    { id: 2, name: "Al-Baqarah", ayahs: 286 },
    { id: 3, name: "Al-Imran", ayahs: 200 },
    { id: 4, name: "An-Nisa", ayahs: 176 },
    { id: 5, name: "Al-Maidah", ayahs: 120 },
    { id: 6, name: "Al-Anam", ayahs: 165 },
    { id: 7, name: "Al-Araf", ayahs: 206 },
    { id: 8, name: "Al-Anfal", ayahs: 75 },
    { id: 9, name: "At-Tawbah", ayahs: 129 },
    { id: 10, name: "Yunus", ayahs: 109 },
    { id: 11, name: "Hud", ayahs: 123 },
    { id: 12, name: "Yusuf", ayahs: 111 },
    { id: 13, name: "Ar-Rad", ayahs: 43 },
    { id: 14, name: "Ibrahim", ayahs: 52 },
    { id: 15, name: "Al-Hijr", ayahs: 99 },
    { id: 16, name: "An-Nahl", ayahs: 128 },
    { id: 17, name: "Al-Isra", ayahs: 111 },
    { id: 18, name: "Al-Kahf", ayahs: 110 },
    { id: 19, name: "Maryam", ayahs: 98 },
    { id: 20, name: "Ta-Ha", ayahs: 135 },
    { id: 21, name: "Al-Anbiya", ayahs: 112 },
    { id: 22, name: "Al-Hajj", ayahs: 78 },
    { id: 23, name: "Al-Muminun", ayahs: 118 },
    { id: 24, name: "An-Nur", ayahs: 64 },
    { id: 25, name: "Al-Furqan", ayahs: 77 },
    { id: 26, name: "Ash-Shuara", ayahs: 227 },
    { id: 27, name: "An-Naml", ayahs: 93 },
    { id: 28, name: "Al-Qasas", ayahs: 88 },
    { id: 29, name: "Al-Ankabut", ayahs: 69 },
    { id: 30, name: "Ar-Rum", ayahs: 60 },
    { id: 31, name: "Luqman", ayahs: 34 },
    { id: 32, name: "As-Sajda", ayahs: 30 },
    { id: 33, name: "Al-Ahzab", ayahs: 73 },
    { id: 34, name: "Saba", ayahs: 54 },
    { id: 35, name: "Fatir", ayahs: 45 },
    { id: 36, name: "Ya-Sin", ayahs: 83 },
    { id: 37, name: "As-Saffat", ayahs: 182 },
    { id: 38, name: "Sad", ayahs: 88 },
    { id: 39, name: "Az-Zumar", ayahs: 75 },
    { id: 40, name: "Ghafir", ayahs: 85 },
    { id: 41, name: "Fussilat", ayahs: 54 },
    { id: 42, name: "Ash-Shura", ayahs: 53 },
    { id: 43, name: "Az-Zukhruf", ayahs: 89 },
    { id: 44, name: "Ad-Dukhan", ayahs: 59 },
    { id: 45, name: "Al-Jathiya", ayahs: 37 },
    { id: 46, name: "Al-Ahqaf", ayahs: 35 },
    { id: 47, name: "Muhammad", ayahs: 38 },
    { id: 48, name: "Al-Fath", ayahs: 29 },
    { id: 49, name: "Al-Hujurat", ayahs: 18 },
    { id: 50, name: "Qaf", ayahs: 45 },
    { id: 51, name: "Adh-Dhariyat", ayahs: 60 },
    { id: 52, name: "At-Tur", ayahs: 49 },
    { id: 53, name: "An-Najm", ayahs: 62 },
    { id: 54, name: "Al-Qamar", ayahs: 55 },
    { id: 55, name: "Ar-Rahman", ayahs: 78 },
    { id: 56, name: "Al-Waqia", ayahs: 96 },
    { id: 57, name: "Al-Hadid", ayahs: 29 },
    { id: 58, name: "Al-Mujadila", ayahs: 22 },
    { id: 59, name: "Al-Hashr", ayahs: 24 },
    { id: 60, name: "Al-Mumtahina", ayahs: 13 },
    { id: 61, name: "As-Saff", ayahs: 14 },
    { id: 62, name: "Al-Jumuah", ayahs: 11 },
    { id: 63, name: "Al-Munafiqun", ayahs: 11 },
    { id: 64, name: "At-Taghabun", ayahs: 18 },
    { id: 65, name: "At-Talaq", ayahs: 12 },
    { id: 66, name: "At-Tahrim", ayahs: 12 },
    { id: 67, name: "Al-Mulk", ayahs: 30 },
    { id: 68, name: "Al-Qalam", ayahs: 52 },
    { id: 69, name: "Al-Haqqah", ayahs: 52 },
    { id: 70, name: "Al-Maarij", ayahs: 44 },
    { id: 71, name: "Nuh", ayahs: 28 },
    { id: 72, name: "Al-Jinn", ayahs: 28 },
    { id: 73, name: "Al-Muzzammil", ayahs: 20 },
    { id: 74, name: "Al-Muddathir", ayahs: 56 },
    { id: 75, name: "Al-Qiyamah", ayahs: 40 },
    { id: 76, name: "Al-Insan", ayahs: 31 },
    { id: 77, name: "Al-Mursalat", ayahs: 50 },
    { id: 78, name: "An-Naba", ayahs: 40 },
    { id: 79, name: "An-Naziath", ayahs: 46 },
    { id: 80, name: "Abasa", ayahs: 42 },
    { id: 81, name: "At-Takwir", ayahs: 29 },
    { id: 82, name: "Al-Infitar", ayahs: 19 },
    { id: 83, name: "Al-Mutaffifin", ayahs: 36 },
    { id: 84, name: "Al-Inshiqaq", ayahs: 25 },
    { id: 85, name: "Al-Burooj", ayahs: 22 },
    { id: 86, name: "At-Tariq", ayahs: 17 },
    { id: 87, name: "Al-Ala", ayahs: 19 },
    { id: 88, name: "Al-Ghashiyah", ayahs: 26 },
    { id: 89, name: "Al-Fajr", ayahs: 30 },
    { id: 90, name: "Al-Balad", ayahs: 20 },
    { id: 91, name: "Ash-Shams", ayahs: 15 },
    { id: 92, name: "Al-Lail", ayahs: 21 },
    { id: 93, name: "Ad-Duha", ayahs: 11 },
    { id: 94, name: "Ash-Sharh", ayahs: 8 },
    { id: 95, name: "At-Tin", ayahs: 8 },
    { id: 96, name: "Al-Alaq", ayahs: 19 },
    { id: 97, name: "Al-Qadr", ayahs: 5 },
    { id: 98, name: "Al-Bayyinah", ayahs: 8 },
    { id: 99, name: "Az-Zalzalah", ayahs: 8 },
    { id: 100, name: "Al-Adiyat", ayahs: 11 },
    { id: 101, name: "Al-Qariah", ayahs: 11 },
    { id: 102, name: "At-Takathur", ayahs: 8 },
    { id: 103, name: "Al-Asr", ayahs: 3 },
    { id: 104, name: "Al-Humazah", ayahs: 9 },
    { id: 105, name: "Al-Fil", ayahs: 5 },
    { id: 106, name: "Quraish", ayahs: 4 },
    { id: 107, name: "Al-Maun", ayahs: 7 },
    { id: 108, name: "Al-Kawthar", ayahs: 3 },
    { id: 109, name: "Al-Kafirun", ayahs: 6 },
    { id: 110, name: "An-Nasr", ayahs: 3 },
    { id: 111, name: "Al-Masad", ayahs: 5 },
    { id: 112, name: "Al-Ikhlas", ayahs: 4 },
    { id: 113, name: "Al-Falaq", ayahs: 5 },
    { id: 114, name: "An-Nas", ayahs: 6 },
  ];

  let selectedSurah;
  let selectedAyah;
  let videoData;
  let translatedAyah;

  fetch("/videos.yaml")
    .then((response) => response.text())
    .then((data) => {
      videoData = yaml.load(data);
    });

  $: translatedAyah =
    translationData[(selectedSurah + 1).toString()][
      (selectedAyah + 1).toString()
    ];

  $: {
    const queryParams = new URLSearchParams(window.location.search);
    selectedSurah = parseInt(queryParams.get("surah")) - 1 || 0;
    selectedAyah = parseInt(queryParams.get("ayah")) - 1 || 0;
  }

  function onSurahChange(event) {
    selectedAyah = 0;
  }

  function updateQueryParams() {
    const queryParams = new URLSearchParams();
    queryParams.set("surah", selectedSurah + 1);
    queryParams.set("ayah", selectedAyah + 1);
    const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
    window.history.replaceState(null, null, newUrl);
  }

  let selectedVideos = [];
  $: {
    selectedVideos = [];
    if (videoData) {
      for (const video of videoData.videos) {
        const surah = video.verses.split(":")[0];
        const [startAyah, endAyah] = video.verses.split(":")[1].split("-");
        if (
          selectedSurah + 1 == parseInt(surah) &&
          selectedAyah + 1 >= parseInt(startAyah) &&
          selectedAyah + 1 <= parseInt(endAyah)
        ) {
          const urlParams = new URL(video.url).searchParams;
          const videoID = urlParams.get("v");
          selectedVideos.push({
            url: "https://www.youtube.com/embed/" + videoID,
            verses: surahs[surah - 1].name + ": " + startAyah + "-" + endAyah,
            speaker: video.speaker,
            firstVerseURL: "?surah=" + surah + "&ayah=" + startAyah,
          });
        }
      }
    }
  }

  afterUpdate(updateQueryParams);
</script>

<main>
  <div class="sidebar">
    <h2>Tafseer Tube</h2>
    <select bind:value={selectedSurah} on:change={onSurahChange}>
      {#each surahs as surah, i}
        <option value={i}>{i + 1}. {surah.name}</option>
      {/each}
    </select>
    <select bind:value={selectedAyah}>
      {#if selectedSurah !== ""}
        {#each Array.from({ length: surahs[selectedSurah].ayahs }) as _, i}
          <option value={i}>Ayah {i + 1}</option>
        {/each}
      {:else}
        <option disabled value="">Select a Surah first</option>
      {/if}
    </select>
  </div>

  <div class="content">
    <div class="translation">
      {translatedAyah}
      <span style="color: #258c91"
        >({surahs[selectedSurah].name}: {selectedAyah + 1})</span
      >
    </div>
    <hr />
    <div class="grid-container">
      {#if selectedVideos}
        {#each selectedVideos as video}
          <div class="video-container">
            <iframe
              width="560"
              height="315"
              src={video.url}
              title="YouTube video player"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
            <div class="badge speaker">{video.speaker}</div>
            <a href={video.firstVerseURL}>
              <div class="badge verses">{video.verses}</div></a
            >
          </div>
        {/each}
      {:else}
        <p>No video available for the selected Surah and Ayah.</p>
      {/if}
    </div>
  </div>
</main>

<style>
  /* Add your custom styles here */
  main {
    display: flex;
    flex-direction: column;
  }

  .translation {
    line-height: 1.5;
    font-size: large;
  }

  .sidebar {
    background-color: #ebf9fa;
    padding: 20px;
    color: #258c91;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(
      2,
      1fr
    ); /* Two columns per row on large screens */
    grid-gap: 20px; /* Adjust the gap between iframes as needed */
  }

  .video-container {
    background-color: #f8f8f8;
    padding: 10px;
  }

  @media screen and (max-width: 768px) {
    .grid-container {
      grid-template-columns: 1fr; /* One column per row on smaller screens */
    }
  }

  iframe {
    width: 100%;
  }

  .content {
    padding: 20px;
  }

  .speaker {
    background-color: gray;
    color: white;
    float: left;
  }
  .verses {
    color: #ebf9fa;
    background-color: #258c91;
    float: right;
  }

  .badge {
    margin-top: 10px;
    padding: 4px 8px;
    border-radius: 5px;
    width: fit-content;
  }

  a {
    text-decoration: none;
  }
  a:hover {
    opacity: 0.9;
  }

  hr {
    display: block;
    height: 1px;
    border: 0;
    border-top: 1px solid #ccc;
    margin: 1em 0;
    padding: 0;
  }
</style>
