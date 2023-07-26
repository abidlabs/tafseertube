import json
import yaml

surahs = json.load(open('src/surahs.json'))
videos = yaml.safe_load(open('docs/videos.yaml'))["videos"]

ayahs = 0
ayahs_with_videos = 0

for s, surah in enumerate(surahs):
    for i in range(surah["ayahs"]):
        ayahs += 1
        for video in videos:
            surah = str(video["verses"]).split(":")[0]
            ayah = str(video["verses"]).split(":")[1]
            start_ayah = ayah.split("-")[0]
            end_ayah = ayah.split("-")[1] if len(ayah.split("-")) > 1 else start_ayah
            if surah == str(s + 1) and int(start_ayah) <= i + 1 <= int(end_ayah):
                ayahs_with_videos += 1


print("There are " + str(ayahs) + " ayahs in the Quran.")
print("Of them, " + str(ayahs_with_videos) + " have videos.")
print("That's " + str(round(ayahs_with_videos / ayahs * 100, 2)) + r"% of the Quran.")
