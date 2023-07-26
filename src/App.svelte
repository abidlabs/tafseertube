<script>
  import { afterUpdate } from "svelte";
  import yaml from "js-yaml";
  import translationData from "./translation.json";
  import surahs from "./surahs.json";
  import { swipe } from "svelte-gestures";

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
  let startAyah;
  let endAyah;

  $: {
    selectedVideos = [];
    if (videoData) {
      for (const video of videoData.videos) {
        const surah = video.verses.split(":")[0];
        if (video.verses.split(":")[1].includes("-")) {
          [startAyah, endAyah] = video.verses.split(":")[1].split("-");
        } else {
          startAyah = video.verses.split(":")[1];
          endAyah = startAyah;
        }
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

  function incrementAyah() {
    if (selectedAyah < surahs[selectedSurah].ayahs - 1) {
      selectedAyah++;
    } else if (selectedSurah < surahs.length - 1) {
      selectedSurah++;
      selectedAyah = 0;
    }
  }

  function decrementAyah() {
    if (selectedAyah > 0) {
      selectedAyah--;
    } else if (selectedSurah > 0) {
      selectedSurah--;
      selectedAyah = surahs[selectedSurah].ayahs - 1;
    }
  }

  function handleSwipe(event) {
    if (event.detail.direction == "right") {
      decrementAyah();
    } else if (event.detail.direction == "left") {
      incrementAyah();
    }
  }

  function handleKeyDown(event) {
    if (event.keyCode === 37) {
      decrementAyah();
    } else if (event.keyCode === 39) {
      incrementAyah();
    }
  }

  afterUpdate(updateQueryParams);
</script>

<svelte:window on:keydown={handleKeyDown} />

<main
  use:swipe={{ timeframe: 300, minSwipeDistance: 60, touchAction: "pan-y" }}
  on:swipe={handleSwipe}
>
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
    {#if selectedVideos.length}
      <div class="grid-container">
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
      </div>
    {:else}
      <div>
        <p>
          No video available for the selected Surah and Ayah. Please contribute
          a YouTube video:
        </p>
      </div>
      <div>
        <form action="https://formspree.io/f/xbjvlwbn" method="POST">
          <input
            type="text"
            name="url"
            placeholder="e.g. https://www.youtube.com/watch?v=nrmaJhRjxp4"
          />
          <br />
          <input
            type="text"
            name="surah_ayah"
            placeholder="Surah & ayah range"
            value="{selectedSurah + 1}:{selectedAyah + 1}-{selectedAyah + 1}"
          />
          <br />
          <!-- your other form fields go here -->
          <button type="submit">Send</button>
        </form>
      </div>
    {/if}
  </div>
</main>

<style>
  /* Add your custom styles here */
  main {
    display: flex;
    flex-direction: column;
  }

  input {
    width: 400px;
    max-width: 100%;
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
