// THE NEW — single source of truth for timing, seed and palette.
export const W = 1280
export const H = 720
export const FPS = 30
export const DURATION = 48
export const FRAMES = FPS * DURATION // 1440
export const ASPECT = W / H

// ONE seed drives every random decision in picture and sound.
export const SEED = 0x7e57ab1e

// Score tempo is chosen so beats land on whole frames: 100 BPM = 18 frames per beat.
export const BPM = 100
export const FRAMES_PER_BEAT = (FPS * 60) / BPM // 18

// THE BREAK: midpoint of scene 3 (17–25s) = 21.0s = frame 630 = beat 35. Picture flash and audio impact share it.
export const BREAK_FRAME = 630
export const BREAK_T = BREAK_FRAME / FPS

export const SCENES = [
  { n: 1, id: 'seed', a: 0, b: 8 },
  { n: 2, id: 'self-reading', a: 8, b: 17 },
  { n: 3, id: 'break', a: 17, b: 25 },
  { n: 4, id: 'reweave', a: 25, b: 34 },
  { n: 5, id: 'labs', a: 34, b: 41 },
  { n: 6, id: 'the-new', a: 41, b: 48 },
]

// Camera
export const FOV = 40
export const BREAK_CAM_Z = 9.0 // camera sits at (0,0,Z) looking at origin from 20.6s to 25.4s
export const PLANE_H = 2 * Math.tan(((FOV / 2) * Math.PI) / 180) * BREAK_CAM_Z // world height of z=0 plane at break

// Palette (linear-ish HDR multipliers). Warm ink + ember + bone; phosphor sage for the observers. No blue, no purple.
export const C = {
  ember: [1.0, 0.42, 0.14],
  amber: [1.0, 0.62, 0.26],
  gold: [1.0, 0.78, 0.42],
  bone: [1.0, 0.93, 0.82],
  coral: [1.0, 0.45, 0.38],
  oxblood: [0.55, 0.06, 0.04],
  phosphor: [0.7, 0.96, 0.78],
}
