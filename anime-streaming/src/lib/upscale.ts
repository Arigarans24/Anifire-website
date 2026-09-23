import type { UpscaleMode } from "@/components/player/types";

/**
 * Client-side upscaling.
 *
 * `sharp` is real today: a pure-CSS contrast/edge filter that visibly crisps up
 * sub-1080p sources at zero cost. The `ai-2x` / `ai-4k` modes are scaffolded for
 * a future WebGPU model pass (e.g. Real-ESRGAN / Anime4K compute shaders rendered
 * to a canvas over the <video>); until that lands they fall back to `sharp` and
 * report `available: false` so the UI can label them "soon".
 */

export interface UpscaleStatus {
  available: boolean;
  note: string;
}

export function upscaleStatus(mode: UpscaleMode): UpscaleStatus {
  switch (mode) {
    case "off":
      return { available: true, note: "Источник без обработки." };
    case "sharp":
      return { available: true, note: "Лёгкое повышение резкости (CSS)." };
    case "ai-2x":
      return {
        available: webgpuSupported(),
        note: webgpuSupported()
          ? "Нейросетевой апскейл ×2 — экспериментально."
          : "Требуется WebGPU. Пока используется резкость.",
      };
    case "ai-4k":
      return {
        available: webgpuSupported(),
        note: webgpuSupported()
          ? "Нейросетевой апскейл до 4K — экспериментально."
          : "Требуется WebGPU. Пока используется резкость.",
      };
  }
}

/** CSS filter applied to the <video> for the modes that are live today. */
export function upscaleFilter(mode: UpscaleMode): string {
  switch (mode) {
    case "off":
      return "none";
    case "sharp":
      return "contrast(1.06) saturate(1.04)";
    case "ai-2x":
    case "ai-4k":
      // Until the WebGPU pass exists, approximate with a stronger sharpening look.
      return webgpuSupported()
        ? "contrast(1.08) saturate(1.06)"
        : "contrast(1.07) saturate(1.05)";
  }
}

export function webgpuSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}
