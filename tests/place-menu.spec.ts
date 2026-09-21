import { describe, expect, it } from 'vitest'
import { placeMenu } from '../src/client/place-menu.ts'

const viewport = { width: 360, height: 780 }

describe('placeMenu', () => {
  it('sits below a top row and stays on-screen', () => {
    const placed = placeMenu(
      { top: 120, bottom: 180, left: 8, right: 352 },
      { width: 280, height: 340 },
      viewport,
    )
    expect(placed.y).toBe(185)
    expect(placed.x).toBeGreaterThanOrEqual(8)
    expect(placed.x + 280).toBeLessThanOrEqual(352)
  })

  it('flips above a bottom row so the full menu stays visible', () => {
    const placed = placeMenu(
      { top: 640, bottom: 700, left: 8, right: 352 },
      { width: 280, height: 340 },
      viewport,
    )
    expect(placed.y).toBe(295)
    expect(placed.y + 340).toBeLessThanOrEqual(772)
  })

  it('shifts the menu into the viewport when it fits neither above nor below the row', () => {
    const placed = placeMenu(
      { top: 300, bottom: 360, left: 8, right: 352 },
      { width: 280, height: 700 },
      viewport,
    )
    expect(placed.y).toBe(72)
    expect(placed.y + 700).toBeLessThanOrEqual(viewport.height - 8)
  })
})
