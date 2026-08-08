import React, { useRef, useEffect } from "react";
import { usePlayer } from "../../context/PlayerContext";

/**
 * Unique feature (Task 4): a real-time, audio-reactive waveform visualizer.
 * Reads live frequency data from the Web Audio AnalyserNode wired up in
 * PlayerContext and paints animated bars on a canvas, synced to whatever
 * is actually playing - not a canned animation.
 */
export default function WaveformVisualizer({ className = "", barColor = "#1DB954" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const { getAnalyser, isPlaying } = usePlayer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = getAnalyser();
      const width = canvas.getBoundingClientRect().width;
      const height = canvas.getBoundingClientRect().height;
      ctx.clearRect(0, 0, width, height);

      if (!analyser) {
        // No audio graph yet (nothing has played this session) - draw a flat idle line
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barCount = Math.min(64, bufferLength);
      const barWidth = width / barCount;
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(1, "#ffffff");

      for (let i = 0; i < barCount; i++) {
        const value = isPlaying ? dataArray[i] : dataArray[i] * 0.15;
        const barHeight = (value / 255) * height;
        const x = i * barWidth;
        const y = height - barHeight;
        ctx.fillStyle = gradient;
        const radius = Math.min(3, barWidth / 2 - 1);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x + 1, y, Math.max(1, barWidth - 2), barHeight, radius);
        } else {
          ctx.rect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
        }
        ctx.fill();
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [getAnalyser, isPlaying, barColor]);

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />;
}
