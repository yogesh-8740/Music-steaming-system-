import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { SERVER_ROOT } from "../services/api";
import api from "../services/api";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState("off"); // off | one | all
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [radioMode, setRadioMode] = useState(false); // Unique feature: AI Smart Radio (Task 4)

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  // ---- Web Audio API setup for the live waveform visualizer (Unique feature: Task 4) ----
  // Lazily initialized on first user-triggered play (browsers block AudioContext
  // creation before a user gesture). Safe to call repeatedly - only wires up once.
  const ensureAudioGraph = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const audio = audioRef.current;
      audio.crossOrigin = "anonymous";
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      // If this fails (e.g. already connected, or browser restriction),
      // playback still works fine - only the visualizer is affected.
      console.warn("Audio visualizer graph could not be initialized:", e);
    }
  }, []);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => handleSongEnd();

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, queue, repeatMode, shuffle, radioMode]);

  const playSongAtIndex = useCallback((index, newQueue = null) => {
    const targetQueue = newQueue || queue;
    if (index < 0 || index >= targetQueue.length) return;

    if (newQueue) setQueue(newQueue);
    setCurrentIndex(index);

    const song = targetQueue[index];
    const audio = audioRef.current;
    audio.src = `${SERVER_ROOT}/api/v1/stream/${song.id}`;
    ensureAudioGraph();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [queue, ensureAudioGraph]);

  const playQueue = useCallback((songs, startIndex = 0) => {
    setRadioMode(false);
    playSongAtIndex(startIndex, songs);
  }, [playSongAtIndex]);

  // ---- AI Smart Radio (Unique feature: Task 4) ----
  // Starts an endless, personalized queue seeded from the recommendation
  // engine. When the queue runs out, more recommended songs are fetched
  // and appended automatically so playback never has to stop.
  const startRadio = useCallback(async (seedSong) => {
    try {
      const { data } = await api.get("/recommendations?limit=15");
      let radioQueue = data.filter((s) => !seedSong || s.id !== seedSong.id);
      if (seedSong) radioQueue = [seedSong, ...radioQueue];
      if (radioQueue.length === 0) return;
      setRadioMode(true);
      playSongAtIndex(0, radioQueue);
    } catch (e) {
      console.warn("Could not start radio:", e);
    }
  }, [playSongAtIndex]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!currentSong) return;
    ensureAudioGraph();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, currentSong, ensureAudioGraph]);

  const handleSongEnd = useCallback(() => {
    if (repeatMode === "one") {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    playNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeatMode, radioMode]);

  const playNext = useCallback(async () => {
    if (queue.length === 0) return;
    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === "all") {
          nextIndex = 0;
        } else if (radioMode) {
          // Queue exhausted in radio mode: fetch more recommendations and keep going
          try {
            const { data } = await api.get("/recommendations?limit=10");
            const existingIds = new Set(queue.map((s) => s.id));
            const fresh = data.filter((s) => !existingIds.has(s.id));
            if (fresh.length > 0) {
              const extended = [...queue, ...fresh];
              setQueue(extended);
              playSongAtIndex(queue.length, extended);
              return;
            }
          } catch (e) {
            // fall through to stopping if recommendations fail
          }
          setIsPlaying(false);
          return;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }
    playSongAtIndex(nextIndex);
  }, [queue, currentIndex, shuffle, repeatMode, radioMode, playSongAtIndex]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    // if more than 3s into song, restart it instead of going back
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = currentIndex - 1 < 0 ? 0 : currentIndex - 1;
    playSongAtIndex(prevIndex);
  }, [queue, currentIndex, playSongAtIndex]);

  const seek = useCallback((time) => {
    audioRef.current.currentTime = time;
    setProgress(time);
  }, []);

  const changeVolume = useCallback((v) => {
    setVolume(v);
    audioRef.current.volume = v;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"));
  }, []);

  const addToQueue = useCallback((song) => {
    setQueue((q) => [...q, song]);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue, currentIndex, currentSong, isPlaying, progress, duration, volume,
        shuffle, repeatMode, isFullScreen, radioMode,
        playQueue, togglePlayPause, playNext, playPrevious, seek, changeVolume,
        toggleShuffle, cycleRepeat, addToQueue, setIsFullScreen,
        startRadio, getAnalyser,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
