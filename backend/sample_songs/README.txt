Drop your own legally-owned MP3 or WAV files in this folder before running
`python seed_songs.py` and they will be used instead of the auto-generated
demo tracks — great for a real panel demo with actual Bollywood songs you
own. The filename (without extension) becomes the song title, e.g.:

    Tum Hi Ho.mp3        -> title: "Tum Hi Ho"
    Kesariya.wav         -> title: "Kesariya"

If this folder is empty, seed_songs.py falls back to generating original
synthetic instrumental demo tracks instead, so the platform is still fully
populated and demoable out of the box.
