Find new tafseer videos on YouTube from scholars (Nouman Ali Khan, Yasir Qadhi, Omar Suleiman), fetch their transcripts, and add the commentary to the appropriate ayah pages. Videos from multiple scholars can be combined on a single ayah page.

**Optional argument**: The user may provide a YouTube video URL or a specific surah:ayah reference. If a URL is provided, skip Steps 1-4 and go directly to Step 5 using that video. Extract the `videoId` from the URL and run `python3 scripts/yt.py video-info <videoId>` to get metadata.

$ARGUMENTS

## Step 1: Prerequisites

1. Verify `youtube-transcript-api` is installed. If not, run `pip install youtube-transcript-api`.
2. Verify `yt-dlp` is installed for transcript fallback. If not, run `pip install yt-dlp`.
3. Verify the YouTube API key works by running: `python3 scripts/yt.py search "tafseer" 1`

## Step 2: Load Existing Data

Read `data/videos.yaml` and collect all YouTube video URLs into a set of already-indexed video IDs (extract the `v` param from each URL).

## Step 3: Search for New Tafseer Videos

Search across multiple scholar channels for tafseer content. Run these searches in parallel:

```bash
# Nouman Ali Khan (Bayyinah)
python3 scripts/yt.py search "tafseer quran" 10 --channel UCpSmAyeBpRJSFIzfMPqz4fQ
python3 scripts/yt.py search "surah tafsir" 10 --channel UCpSmAyeBpRJSFIzfMPqz4fQ
python3 scripts/yt.py search "ayah explained" 10 --channel UCpSmAyeBpRJSFIzfMPqz4fQ

# Yasir Qadhi
python3 scripts/yt.py search "tafseer quran" 10 --channel UClUa7-iHJNKEM2e_zWYSPQg
python3 scripts/yt.py search "surah tafsir" 10 --channel UClUa7-iHJNKEM2e_zWYSPQg

# Omar Suleiman (Yaqeen Institute)
python3 scripts/yt.py search "quran tafseer" 10 --channel UCxr1Q4DxDlS8AxpGLch2x5A
python3 scripts/yt.py search "surah reflection" 10 --channel UCxr1Q4DxDlS8AxpGLch2x5A
```

Collect all results, deduplicate by `videoId`, and remove any whose `videoId` is already in the indexed set.

**Filter out** videos that are clearly NOT ayah-level tafseer:
- Full-length seerah or history lectures
- Q&A sessions, fatwa videos
- Khutbahs on general topics (unless they focus on specific ayahs)
- YouTube Shorts (#shorts)
- Vlogs, fundraisers, event announcements

**Keep** videos that look like they discuss specific ayahs or surahs of the Quran with tafseer/commentary.

## Step 4: Present Candidates

Show the user a numbered list of candidate videos with title, date, scholar, and videoId. Ask which to process. The user can pick specific numbers, a range, or say "all".

## Step 5: Process Each Selected Video

For each video:

### 5a. Fetch Transcript
```bash
python3 scripts/yt.py transcript <videoId>
```
This saves two files:
- `tmp/transcript_<videoId>.txt` — plain text transcript
- `tmp/transcript_<videoId>_ts.json` — timestamped JSON array where each entry has `{"text": "...", "start": <seconds>, "duration": <seconds>}`

Read both files. If the transcript fetch fails, skip the video and tell the user.

### 5b. Identify the Ayah References

Read the full transcript and the video title carefully. Determine which specific surah and ayah(s) the video is discussing. Look for:
- Explicit mentions like "Surah Al-Baqarah, ayah 255" or "verse 45 of Surah Maryam"
- Arabic verse recitations followed by commentary
- References to surah names and verse numbers in the title or description

If the video covers a **range** of ayahs (e.g., ayahs 1-5 of a surah), use the range format: `surah:startAyah-endAyah`.

If you cannot determine specific ayah references, ask the user to provide them.

### 5c. Get Video Metadata

If not already available from the search results, run:
```bash
python3 scripts/yt.py video-info <videoId>
```

Determine the scholar name. Use consistent names matching existing data:
- "Nouman Ali Khan" (not "NAK" or "Ustadh Nouman")
- "Yasir Qadhi" (not "Sheikh Yasir" or "Dr. Yasir Qadhi")
- "Omar Suleiman" (not "Sheikh Omar" or "Imam Omar Suleiman")

For other scholars found in the video, use their commonly known name.

### 5d. Add to videos.yaml

Append a new entry to `data/videos.yaml` in this format:

```yaml
  - url: https://www.youtube.com/watch?v=<videoId>
    speaker: <Scholar Name>
    verses: "<surah>:<ayah>" or "<surah>:<startAyah>-<endAyah>"
```

**Important**: The `verses` field must be quoted if it starts with a number (YAML parsing). Check existing entries for format reference.

**Combining multiple scholars**: If an ayah already has a video from one scholar, simply add the new entry — the build script already supports multiple videos per ayah and will display all of them on the same page. This naturally combines insights from different scholars.

### 5e. Handle Commentary Content (Future Enhancement)

For now, the site displays embedded YouTube videos directly. The transcript is fetched and available in `tmp/` for future use (e.g., showing written commentary alongside videos).

No additional content files need to be created — the video entry in `videos.yaml` is sufficient.

## Step 6: Rebuild Static Site

Run the build script to regenerate all static HTML pages and sitemap:

```bash
node scripts/build.js
```

This updates the homepage, generates/updates surah pages and ayah pages for all videos, and rebuilds the sitemap.

## Step 7: Summary

Tell the user:
- How many new videos were added
- List each one with: scholar, surah name, ayah reference, and video title
- Note which ayahs now have **multiple scholars** (combined perspectives)
- Remind them to review since ayah references were identified from transcripts/titles
