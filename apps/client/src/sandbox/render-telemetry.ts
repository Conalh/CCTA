export type RgbTuple = readonly [number, number, number];

export type ScenePixelSampleInput = Readonly<{
  backgroundColor: RgbTuple;
  height: number;
  maxSamples?: number;
  pixels: Uint8Array;
  width: number;
}>;

export type ScenePixelSampleSummary = Readonly<{
  distinctColorSamples: number;
  nonBackgroundSamples: number;
  samples: number;
}>;

export function summarizeScenePixelSamples(input: ScenePixelSampleInput): ScenePixelSampleSummary {
  const totalPixels = Math.max(0, input.width * input.height);
  const stridePixels = Math.max(1, Math.floor(totalPixels / (input.maxSamples ?? totalPixels)));
  const distinctColors = new Set<string>();
  let samples = 0;
  let nonBackgroundSamples = 0;

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += stridePixels) {
    const index = pixelIndex * 4;
    const red = input.pixels[index] ?? 0;
    const green = input.pixels[index + 1] ?? 0;
    const blue = input.pixels[index + 2] ?? 0;
    const alpha = input.pixels[index + 3] ?? 0;
    samples += 1;

    if (alpha === 0) {
      continue;
    }

    const colorDistance =
      Math.abs(red - input.backgroundColor[0]) +
      Math.abs(green - input.backgroundColor[1]) +
      Math.abs(blue - input.backgroundColor[2]);

    if (colorDistance > 16) {
      nonBackgroundSamples += 1;
      if (distinctColors.size < 64) {
        distinctColors.add(`${red},${green},${blue}`);
      }
    }
  }

  return {
    distinctColorSamples: distinctColors.size,
    nonBackgroundSamples,
    samples
  };
}

export function isRenderablePixelSampleHealthy(sample: ScenePixelSampleSummary): boolean {
  if (sample.samples < 4) {
    return false;
  }

  const minimumNonBackgroundSamples = Math.max(1, Math.ceil(sample.samples * 0.05));
  return sample.nonBackgroundSamples >= minimumNonBackgroundSamples && sample.distinctColorSamples >= 2;
}
