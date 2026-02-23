# GalacticVoyager - 3D Space Combat & Exploration Game

## Context

Build a 3D browser-based game where the player pilots a spacecraft through the solar system in third-person view. Enemy spacecraft spawn and attack; the player must eliminate them while exploring planets. Uses Three.js for rendering, Vite for dev tooling, and vanilla JS modules.

---

## Project Structure

```
GalacticVoyager/
├── index.html                     # Canvas + HUD overlay
├── package.json                   # three + vite
├── vite.config.js                 # @ alias to ./src
├── src/
│   ├── main.js                    # Bootstrap: creates Game, starts loop
│   ├── Game.js                    # Orchestrator: init, game loop, state machine
│   ├── core/
│   │   ├── Renderer.js            # WebGLRenderer setup, resize handling
│   │   ├── Camera.js              # PerspectiveCamera + third-person follow
│   │   ├── InputManager.js        # Keyboard polling + pointer lock + mouse deltas
│   ├── entities/
│   │   ├── Player.js              # Ship mesh, movement physics, firing, health
│   │   ├── Enemy.js               # Enemy mesh, 3-state AI, firing
│   │   ├── EnemyManager.js        # Spawn logic, object pool, update dispatch
│   │   ├── Projectile.js          # Laser bolt mesh, velocity, lifetime
│   │   ├── ProjectileManager.js   # Pool of projectiles, collision checks
│   ├── world/
│   │   ├── SolarSystem.js         # Creates Sun + planets, manages orbits
│   │   ├── CelestialBody.js       # Procedural sphere + material per planet
│   │   ├── Starfield.js           # Background star particles
│   │   ├── Lighting.js            # Sun point light + ambient light
│   ├── ui/
│   │   ├── HUD.js                 # Health bar, score, crosshair, speed
│   │   ├── Minimap.js             # Top-down 2D radar (canvas overlay)
│   │   ├── MenuScreen.js          # Start screen + game over screen
│   ├── utils/
│   │   ├── Constants.js           # Speeds, sizes, distances, planet configs
│   │   ├── MathUtils.js           # clamp, lerp, randomRange, randomPointOnSphere
│   │   ├── ObjectPool.js          # Generic pool for projectiles/enemies
│   ├── styles/
│       └── main.css               # Fullscreen canvas, HUD positioning
```

---

## Implementation Phases

Each phase produces a runnable result.

### Phase 1 — Scaffolding & Render Loop

1. `npm create vite@latest . -- --template vanilla` + `npm install three`
2. Create `vite.config.js` with `@` alias to `./src`
3. `index.html`: `<canvas id="game-canvas">` + `<div id="hud">`
4. `src/main.js`: imports and instantiates `Game`
5. `src/Game.js`: creates Renderer, Scene, Camera, Clock; runs `requestAnimationFrame` loop with delta time
6. `src/core/Renderer.js`: `THREE.WebGLRenderer`, pixel ratio capping, resize listener
7. `src/core/Camera.js`: `THREE.PerspectiveCamera(60, aspect, 0.1, 100000)` at `(0, 10, 30)` looking at origin
8. `src/styles/main.css`: fullscreen canvas, no margin

**Result:** Black screen rendering at 60fps with hot reload working.

### Phase 2 — Solar System & Starfield

1. `Starfield.js`: 8000 random points on a large sphere (radius ~50000) using `THREE.Points`
2. `Lighting.js`: `PointLight` at origin (Sun) + dim `AmbientLight`
3. `Constants.js`: planet config array:
   - Sun (radius 80, distance 0, emissive)
   - Earth (radius 8, distance 400, blue)
   - Mars (radius 6, distance 600, red)
   - Jupiter (radius 30, distance 1200, tan)
   - Saturn (radius 25, distance 1800, gold, with rings)
4. `CelestialBody.js`: `SphereGeometry` + `MeshStandardMaterial` per planet; `MeshBasicMaterial` for Sun; `RingGeometry` for Saturn; slow self-rotation + orbital motion
5. `SolarSystem.js`: creates all bodies, exposes `update(dt)` and `getBodies()`

**Result:** Glowing Sun, 4 orbiting planets, starfield background.

### Phase 3 — Player Spacecraft & Controls

1. `InputManager.js`:
   - Keyboard polling (WASD, Shift, Space) via `keydown`/`keyup` flags
   - Pointer lock on canvas click; accumulate `movementX`/`movementY` for yaw/pitch
   - Mouse button tracking for firing
2. `Player.js`:
   - Ship mesh from primitives: `ConeGeometry` fuselage + `BoxGeometry` wings + `CylinderGeometry` engine, grouped
   - Movement: mouse X → yaw, mouse Y → pitch, A/D → roll, W → forward thrust, S → brake, Shift → boost (3x)
   - Drag: `velocity.multiplyScalar(0.98)` each frame
   - Position update: `position.add(velocity * dt)`
3. `Camera.js` third-person follow:
   - Offset `(0, 6, 22)` rotated by player quaternion
   - Lerp toward desired position for smooth lag
   - LookAt a point ahead of the player

**Result:** Flyable spacecraft with smooth third-person camera, explorable solar system.

### Phase 4 — Shooting Mechanics

1. `ObjectPool.js`: generic `acquire()`/`release()`/`forEach()` pool
2. `Projectile.js`: small cylinder mesh, `MeshBasicMaterial` green, velocity + lifetime tracking
3. `ProjectileManager.js`:
   - `fire(position, direction, speed, source)`: acquire from pool, configure, add to scene
   - `update(dt)`: move projectiles, release expired
   - `checkCollisions(enemies, player)`: sphere-vs-sphere distance checks, returns hit list with source filtering (player projectiles hit enemies, enemy projectiles hit player)
4. Add firing to `Player.js`: left mouse button fires dual lasers (offset left/right) with 0.15s cooldown

**Result:** Player fires green laser bolts that streak forward and expire.

### Phase 5 — Enemies

1. `Enemy.js`:
   - Mesh: `DodecahedronGeometry` with red/orange material (angular alien look)
   - 3-state AI: `approaching` → `attacking` → `evading`
     - Approaching: fly toward player; switch to attacking at distance < 300
     - Attacking: maintain 200-400 range, face player, fire every 1-2s; evade if health < 30%
     - Evading: fly perpendicular for 3s, then back to approaching
   - Smooth steering via velocity lerp toward desired direction
2. `EnemyManager.js`:
   - Spawn every 8s (decreasing to 3s as score rises), max 8 active
   - Spawn at random point on sphere radius 500-800 around player
   - Death handling: flash white, particle burst, release to pool
3. Collision resolution in `Game.js`:
   - Player projectiles → damage enemies → score +100 on kill
   - Enemy projectiles → damage player → game over at health 0

**Result:** Enemies approach, shoot back, and can be destroyed. The game has real combat.

### Phase 6 — HUD & Game State

1. `HUD.js` (DOM overlay): health bar (color-coded), score (top-right), crosshair (CSS), speed indicator
2. `Minimap.js` (200x200 canvas): player dot at center, enemy dots (red), planet circles (white), range circle
3. `MenuScreen.js`: title + "Click to Start"; game over with score + "Play Again"
4. `Game.js` state machine: `menu` → `playing` → `gameover`
   - Menu: cinematic camera orbit around solar system
   - Playing: full game loop
   - Game over: freeze, show score, restart resets everything

**Result:** Complete game loop: start → play → die → restart. Full situational awareness via HUD.

### Phase 7 — Polish

1. Engine trails: fading particle line behind player ship
2. Screen shake on damage: random camera offset for a few frames
3. Planet atmosphere glow: larger semi-transparent sphere with `BackSide` + additive blending
4. Sun bloom: `UnrealBloomPass` post-processing
5. Explosion particles on enemy death: orange point burst that fades
6. Performance: verify object pools work, dispose unused geometries/materials

---

## Key Technical Decisions

- **Custom physics, no engine**: each entity owns a `THREE.Vector3` velocity; drag + thrust model
- **Sphere-vs-sphere collisions**: `distanceTo()` < sum of radii; fast enough for <100 projectiles and <10 enemies
- **Object pooling**: projectiles and enemies are pooled to avoid GC spikes
- **DOM-based HUD**: CSS-styled overlays on top of canvas (not rendered in Three.js)
- **Pointer lock**: essential for mouse-based aiming; requested on first canvas click
- **Compressed solar system scale**: distances 400-1800 units so planets are reachable in under a minute
- **Frame-rate independent**: all velocities/timers multiplied by `dt` from `THREE.Clock`
- **ES modules**: no global state; `Game.js` is the only file that knows about all subsystems

---

## Verification

1. **After each phase**: `npm run dev` and confirm the new features work in browser
2. **Phase 3 test**: fly to each planet, verify camera follows smoothly, test all controls
3. **Phase 4 test**: fire lasers, confirm they travel forward and expire
4. **Phase 5 test**: wait for enemies to spawn, verify they approach and shoot; destroy them
5. **Phase 6 test**: confirm HUD updates in real-time, minimap shows correct positions, game over triggers at 0 health, restart works cleanly
6. **Performance**: open Chrome DevTools → Performance tab, verify steady 60fps with 8 enemies active
