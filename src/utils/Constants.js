export const PLANETS = [
  { name: 'Sun',     radius: 80,   distance: 0,    color: 0xffaa00, emissive: true,  orbitalSpeed: 0,     rotationSpeed: 0.05,  texture: '/textures/2k_sun.jpg' },
  { name: 'Mercury', radius: 3,    distance: 200,  color: 0xaaaaaa, emissive: false, orbitalSpeed: 0.04,  rotationSpeed: 0.01,  texture: '/textures/2k_mercury.jpg' },
  { name: 'Venus',   radius: 7.5,  distance: 300,  color: 0xe8cda0, emissive: false, orbitalSpeed: 0.035, rotationSpeed: 0.005, texture: '/textures/2k_venus_surface.jpg' },
  { name: 'Earth',   radius: 8,    distance: 400,  color: 0x2266cc, emissive: false, orbitalSpeed: 0.03,  rotationSpeed: 0.3,   texture: '/textures/2k_earth_daymap.jpg',
    moons: [
      { name: 'Moon', radius: 2.2, orbitRadius: 20, orbitSpeed: 0.5, color: 0xbbbbbb, texture: '/textures/2k_moon.jpg' },
    ],
  },
  { name: 'Mars',    radius: 4.3,  distance: 600,  color: 0xcc4422, emissive: false, orbitalSpeed: 0.02,  rotationSpeed: 0.28,  texture: '/textures/2k_mars.jpg' },
  { name: 'Jupiter', radius: 34,   distance: 1200, color: 0xddaa77, emissive: false, orbitalSpeed: 0.01,  rotationSpeed: 0.5,   texture: '/textures/2k_jupiter.jpg',
    moons: [
      { name: 'Io',       radius: 2.3, orbitRadius: 55,  orbitSpeed: 0.8,  color: 0xddcc55, texture: '/textures/io.jpg' },
      { name: 'Europa',   radius: 2.0, orbitRadius: 65,  orbitSpeed: 0.55, color: 0xccddee, texture: '/textures/europa.jpg' },
      { name: 'Ganymede', radius: 3.3, orbitRadius: 80,  orbitSpeed: 0.35, color: 0x998877, texture: '/textures/ganymede.jpg' },
      { name: 'Callisto', radius: 3.0, orbitRadius: 100, orbitSpeed: 0.2,  color: 0x776655, texture: '/textures/callisto.jpg' },
    ],
  },
  { name: 'Saturn',  radius: 30,   distance: 1800, color: 0xccbb88, emissive: false, orbitalSpeed: 0.007, rotationSpeed: 0.45,  rings: true, texture: '/textures/2k_saturn.jpg', ringTexture: '/textures/2k_saturn_ring_alpha.png',
    moons: [
      { name: 'Titan', radius: 3.2, orbitRadius: 80, orbitSpeed: 0.25, color: 0xdd9944 },
    ],
  },
  { name: 'Uranus',  radius: 18,   distance: 2500, color: 0x66ccdd, emissive: false, orbitalSpeed: 0.004, rotationSpeed: 0.4,   texture: '/textures/2k_uranus.jpg' },
  { name: 'Neptune', radius: 17.5, distance: 3200, color: 0x3344bb, emissive: false, orbitalSpeed: 0.003, rotationSpeed: 0.42,  texture: '/textures/2k_neptune.jpg',
    moons: [
      { name: 'Triton', radius: 1.7, orbitRadius: 50, orbitSpeed: 0.3, color: 0xccbbcc, texture: '/textures/triton.jpg' },
    ],
  },
];

// Alpha Centauri barycenter — just beyond Neptune (3200), with a ~600 unit gap
export const ALPHA_CENTAURI_CENTER = { x: 3950, y: 0, z: 0 };

export const ALPHA_CENTAURI_BODIES = [
  // Alpha Centauri A — G2V yellow star, 1.22 solar radii
  {
    name: 'Rigil Kentaurus (α Cen A)', radius: 70, distance: 150,
    color: 0xfff5e0, emissive: true, orbitalSpeed: 0.005,
    rotationSpeed: 0.05, isStar: true,
    lightIntensity: 1800000, lightColor: 0xfff8ee,
  },
  // Alpha Centauri B — K1V orange star, 0.86 solar radii, starts opposite side
  {
    name: 'Toliman (α Cen B)', radius: 50, distance: 150,
    color: 0xffaa55, emissive: true, orbitalSpeed: 0.005,
    rotationSpeed: 0.06, initialAngle: Math.PI, isStar: true,
    lightIntensity: 1200000, lightColor: 0xffcc88,
  },
  // Proxima Centauri — M5.5Ve red dwarf, 0.15 solar radii (scaled from 13000 AU to 800 units)
  {
    name: 'Proxima Centauri (α Cen C)', radius: 10, distance: 500,
    color: 0xff4422, emissive: true, orbitalSpeed: 0.001,
    rotationSpeed: 0.08, isStar: true,
    lightIntensity: 50000, lightColor: 0xff6644,
  },
  // Proxima b — habitable zone rocky world, ~1.17 Earth masses
  {
    name: 'Proxima b', radius: 8.5, distance: 30,
    color: 0x448866, emissive: false, orbitalSpeed: 0.8,
    rotationSpeed: 0.2, parentStar: 'Proxima Centauri (α Cen C)',
  },
  // Proxima d — very close hot world, ~0.26 Earth masses
  {
    name: 'Proxima d', radius: 4, distance: 18,
    color: 0xcc8855, emissive: false, orbitalSpeed: 1.2,
    rotationSpeed: 0.15, parentStar: 'Proxima Centauri (α Cen C)',
  },
  // Proxima c (candidate) — cold super-Earth/mini-Neptune, ~7 Earth masses
  {
    name: 'Proxima c', radius: 12, distance: 80,
    color: 0x6688bb, emissive: false, orbitalSpeed: 0.05,
    rotationSpeed: 0.3, parentStar: 'Proxima Centauri (α Cen C)',
  },
];

// Player
export const PLAYER_SPEED = 150;
export const PLAYER_BOOST_MULTIPLIER = 3;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_FIRE_RATE = 0.15;
export const PLAYER_DRAG = 0.98;
export const PLAYER_ROTATION_SPEED = 0.002;
export const PLAYER_ROLL_SPEED = 2.0;

// Enemies
export const ENEMY_SPEED = 80;
export const ENEMY_FIRE_RATE = 1.5;
export const ENEMY_HEALTH = 30;
export const ENEMY_SPAWN_INTERVAL_MAX = 8;
export const ENEMY_SPAWN_INTERVAL_MIN = 3;
export const MAX_ENEMIES = 8;
export const ENEMY_SPAWN_RADIUS_MIN = 500;
export const ENEMY_SPAWN_RADIUS_MAX = 800;

// Projectiles
export const PROJECTILE_SPEED = 500;
export const PROJECTILE_LIFETIME = 3;
export const PROJECTILE_DAMAGE = 10;

// Camera
export const CAMERA_OFFSET_Y = 6;
export const CAMERA_OFFSET_Z = 22;
export const CAMERA_LERP_FACTOR = 0.001;
