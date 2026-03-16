#!/usr/bin/env python3
"""YouTube helper for TafseerTube - search scholar channels and fetch transcripts."""

import sys
import json
import os
import subprocess
import urllib.parse
import glob
import html
from datetime import datetime, timezone

# Scholar channels
CHANNELS = {
    "Nouman Ali Khan": "UCpSmAyeBpRJSFIzfMPqz4fQ",
    "Yasir Qadhi": "UClUa7-iHJNKEM2e_zWYSPQg",
    "Omar Suleiman": "UCxr1Q4DxDlS8AxpGLch2x5A",
}


def _load_env():
    """Load .env file from project root if env vars not already set."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _api_key():
    _load_env()
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        print("Error: YOUTUBE_API_KEY not set. Add it to .env or export it.", file=sys.stderr)
        sys.exit(1)
    return key


def _yt_get(endpoint, params):
    params["key"] = _api_key()
    url = f"https://www.googleapis.com/youtube/v3/{endpoint}?{urllib.parse.urlencode(params)}"
    result = subprocess.run(["curl", "-s", url], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: curl failed: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def _project_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _normalize_text(text):
    return " ".join(html.unescape(text).replace("\n", " ").split()).strip()


def _cookies_file():
    """Return path to a Netscape cookies file if one exists, else None."""
    _load_env()
    explicit = os.environ.get("YT_COOKIES_FILE", "")
    if explicit and os.path.exists(explicit):
        return explicit
    default = os.path.expanduser("~/.yt-cookies.txt")
    if os.path.exists(default):
        return default
    return None


def _requests_session_with_cookies(cookies_path):
    """Build a requests.Session pre-loaded with cookies from a Netscape cookie file."""
    try:
        import requests
    except ImportError:
        return None
    session = requests.Session()
    with open(cookies_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 7:
                continue
            domain, _, path, secure, _expires, name, value = parts[:7]
            session.cookies.set(name, value, domain=domain, path=path)
    return session


def _save_transcript_outputs(video_id, snippets):
    text = " ".join(s["text"] for s in snippets)
    project_root = _project_root()
    tmp_dir = os.path.join(project_root, "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    path = os.path.join(tmp_dir, f"transcript_{video_id}.txt")
    words = text.split()
    with open(path, "w") as f:
        for i in range(0, len(words), 150):
            f.write(" ".join(words[i : i + 150]) + "\n\n")
    ts_path = os.path.join(tmp_dir, f"transcript_{video_id}_ts.json")
    with open(ts_path, "w") as f:
        json.dump(snippets, f, indent=2)
    print(path)
    print(ts_path)


def _fetch_transcript_via_api(video_id):
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError as exc:
        raise RuntimeError("youtube-transcript-api is not installed") from exc
    try:
        cookies_path = _cookies_file()
        if cookies_path:
            session = _requests_session_with_cookies(cookies_path)
            api = YouTubeTranscriptApi(http_client=session) if session else YouTubeTranscriptApi()
        else:
            api = YouTubeTranscriptApi()
        t = api.fetch(video_id, languages=["en"])
        return [{"text": _normalize_text(s.text), "start": s.start, "duration": s.duration} for s in t]
    except (TypeError, AttributeError):
        t = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
        return [{"text": _normalize_text(s["text"]), "start": s["start"], "duration": s["duration"]} for s in t]


def _fetch_transcript_via_ytdlp(video_id):
    output_base = os.path.join(_project_root(), "tmp", f"ytdlp_{video_id}")
    os.makedirs(output_base, exist_ok=True)
    output_template = os.path.join(output_base, f"{video_id}.%(ext)s")
    url = f"https://www.youtube.com/watch?v={video_id}"
    cookies_path = _cookies_file()
    cmd = [
        "yt-dlp",
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        "en.*",
        "--sub-format",
        "json3",
        "-o",
        output_template,
    ]
    if cookies_path:
        cmd += ["--cookies", cookies_path]
    cmd += [url]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "yt-dlp failed").strip()
        raise RuntimeError(msg)
    subtitle_files = sorted(glob.glob(os.path.join(output_base, f"{video_id}*.json3")))
    if not subtitle_files:
        raise RuntimeError("yt-dlp completed but no English subtitle file was produced")
    with open(subtitle_files[0]) as f:
        data = json.load(f)
    snippets = []
    for event in data.get("events", []):
        segs = event.get("segs") or []
        text = _normalize_text("".join(seg.get("utf8", "") for seg in segs))
        if not text:
            continue
        start = (event.get("tStartMs") or 0) / 1000.0
        duration = (event.get("dDurationMs") or 0) / 1000.0
        snippets.append({"text": text, "start": start, "duration": duration})
    if not snippets:
        raise RuntimeError("yt-dlp subtitle file did not contain usable transcript events")
    return snippets


def cmd_search(channel_id=None, query="", max_results=10):
    """Search a specific channel or all scholar channels for videos."""
    channels_to_search = {}
    if channel_id:
        # Find scholar name for this channel
        for name, cid in CHANNELS.items():
            if cid == channel_id:
                channels_to_search[name] = cid
                break
        if not channels_to_search:
            channels_to_search["Unknown"] = channel_id
    else:
        channels_to_search = CHANNELS

    all_results = []
    for scholar_name, cid in channels_to_search.items():
        params = {
            "part": "snippet",
            "channelId": cid,
            "type": "video",
            "maxResults": max_results,
            "order": "relevance",
        }
        if query:
            params["q"] = query
        data = _yt_get("search", params)
        for item in data.get("items", []):
            vid = item["id"].get("videoId")
            if not vid:
                continue
            all_results.append(
                {
                    "videoId": vid,
                    "title": item["snippet"]["title"],
                    "description": item["snippet"]["description"],
                    "publishedAt": item["snippet"]["publishedAt"][:10],
                    "scholar": scholar_name,
                    "channelId": cid,
                }
            )

    print(json.dumps({"results": all_results}, indent=2))


def cmd_video_info(video_id):
    """Fetch metadata for a specific video."""
    data = _yt_get("videos", {"part": "snippet", "id": video_id})
    if not data.get("items"):
        print(json.dumps({"error": "Video not found"}))
        return
    item = data["items"][0]["snippet"]
    # Try to match channel to a known scholar
    channel_id = item.get("channelId", "")
    scholar = "Unknown"
    for name, cid in CHANNELS.items():
        if cid == channel_id:
            scholar = name
            break
    print(
        json.dumps(
            {
                "title": item["title"],
                "publishedAt": item["publishedAt"][:10],
                "channelTitle": item.get("channelTitle", ""),
                "channelId": channel_id,
                "scholar": scholar,
                "description": item.get("description", ""),
            },
            indent=2,
        )
    )


def cmd_transcript(video_id):
    """Fetch captions for a YouTube video and save to tmp/."""
    api_error = None
    try:
        snippets = _fetch_transcript_via_api(video_id)
    except Exception as exc:
        api_error = exc
        snippets = None

    if snippets is None:
        try:
            snippets = _fetch_transcript_via_ytdlp(video_id)
        except FileNotFoundError:
            snippets = None
            ytdlp_error = "yt-dlp is not installed"
        except Exception as exc:
            snippets = None
            ytdlp_error = str(exc)
        else:
            ytdlp_error = None
    else:
        ytdlp_error = None

    if snippets is None:
        api_error_msg = str(api_error) if api_error else "unknown error"
        if ytdlp_error:
            print(
                f"Error: transcript fetch failed for {video_id}. "
                f"youtube-transcript-api: {api_error_msg}. yt-dlp fallback: {ytdlp_error}",
                file=sys.stderr,
            )
        else:
            print(
                f"Error: transcript fetch failed for {video_id}. "
                f"youtube-transcript-api: {api_error_msg}.",
                file=sys.stderr,
            )
        sys.exit(3)

    _save_transcript_outputs(video_id, snippets)


def main():
    usage = (
        "Usage:\n"
        "  yt.py search [query] [max_results] [--channel CHANNEL_ID]\n"
        "  yt.py video-info <video_id>\n"
        "  yt.py transcript <video_id>\n"
    )
    if len(sys.argv) < 2:
        print(usage)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "search":
        query = ""
        max_results = 10
        channel_id = None
        args = sys.argv[2:]
        i = 0
        while i < len(args):
            if args[i] == "--channel" and i + 1 < len(args):
                channel_id = args[i + 1]
                i += 2
            elif not query:
                query = args[i]
                i += 1
            else:
                max_results = int(args[i])
                i += 1
        cmd_search(channel_id=channel_id, query=query, max_results=max_results)
    elif cmd == "video-info":
        if len(sys.argv) < 3:
            print("Error: video_id required", file=sys.stderr)
            sys.exit(1)
        cmd_video_info(sys.argv[2])
    elif cmd == "transcript":
        if len(sys.argv) < 3:
            print("Error: video_id required", file=sys.stderr)
            sys.exit(1)
        cmd_transcript(sys.argv[2])
    else:
        print(f"Unknown command: {cmd}\n{usage}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
