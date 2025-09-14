import { useRef, useEffect, useCallback } from "react";

export function useCanvas(
  drawFunction: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
  dependencies: any[] = []
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setupCanvas = useCallback(() => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Get the device pixel ratio, falling back to 1
    const dpr = window.devicePixelRatio || 1;

    // Get the display size (CSS pixels)
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Set the actual size in memory (scaled to account for extra pixel density)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    // Scale the drawing context so everything will work at the higher ratio
    ctx.scale(dpr, dpr);

    // Set the display size (CSS pixels)
    canvas.style.width = displayWidth + "px";
    canvas.style.height = displayHeight + "px";

    return ctx;
  }, []);

  const handleResize = useCallback(() => {
    const ctx = setupCanvas();
    if (ctx && canvasRef.current) {
      drawFunction(ctx, canvasRef.current);
    }
  }, [setupCanvas, drawFunction]);

  useEffect(() => {
    const ctx = setupCanvas();
    if (ctx && canvasRef.current) {
      drawFunction(ctx, canvasRef.current);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [setupCanvas, handleResize, ...dependencies]);

  return canvasRef;
}
