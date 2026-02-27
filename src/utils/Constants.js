export const STAR_SYSTEMS = [
  {
    name: 'SOLAR SYSTEM',
    center: { x: 0, y: 0, z: 0 },
    boundaryRadius: 3200,
    bodies: [
      { name: 'Sun',     radius: 80,   distance: 0,    color: 0xffaa00, emissive: true,  orbitalSpeed: 0,     rotationSpeed: 0.05,  texture: '/textures/2k_sun.jpg',
        isStar: true, lightIntensity: 2500000, lightColor: 0xffffff, labelColor: '#ffcc66', minimapOrbitalPath: false, bloomScale: 2.0 },
      { name: 'Mercury', radius: 3,    distance: 200,  color: 0xaaaaaa, emissive: false, orbitalSpeed: 0.04,  rotationSpeed: 0.01,  texture: '/textures/2k_mercury.jpg',
        labelColor: '#bbbbcc', minimapOrbitalPath: true },
      { name: 'Venus',   radius: 7.5,  distance: 300,  color: 0xe8cda0, emissive: false, orbitalSpeed: 0.035, rotationSpeed: 0.005, texture: '/textures/2k_venus_surface.jpg',
        labelColor: '#e8d8a8', minimapOrbitalPath: true },
      { name: 'Earth',   radius: 8,    distance: 400,  color: 0x2266cc, emissive: false, orbitalSpeed: 0.03,  rotationSpeed: 0.3,   texture: '/textures/2k_earth_daymap.jpg',
        labelColor: '#66aaff', minimapOrbitalPath: true,
        moons: [
          { name: 'Moon', radius: 2.2, orbitRadius: 20, orbitSpeed: 0.5, color: 0xbbbbbb, texture: '/textures/2k_moon.jpg' },
        ],
      },
      { name: 'Mars',    radius: 4.3,  distance: 600,  color: 0xcc4422, emissive: false, orbitalSpeed: 0.02,  rotationSpeed: 0.28,  texture: '/textures/2k_mars.jpg',
        labelColor: '#ff8866', minimapColorOverride: '#dd8855', minimapOrbitalPath: true },
      { name: 'Jupiter', radius: 34,   distance: 1200, color: 0xddaa77, emissive: false, orbitalSpeed: 0.01,  rotationSpeed: 0.5,   texture: '/textures/2k_jupiter.jpg',
        labelColor: '#eebb88', minimapOrbitalPath: true,
        moons: [
          { name: 'Io',       radius: 2.3, orbitRadius: 55,  orbitSpeed: 0.8,  color: 0xddcc55, texture: '/textures/io.jpg' },
          { name: 'Europa',   radius: 2.0, orbitRadius: 65,  orbitSpeed: 0.55, color: 0xccddee, texture: '/textures/europa.jpg' },
          { name: 'Ganymede', radius: 3.3, orbitRadius: 80,  orbitSpeed: 0.35, color: 0x998877, texture: '/textures/ganymede.jpg' },
          { name: 'Callisto', radius: 3.0, orbitRadius: 100, orbitSpeed: 0.2,  color: 0x776655, texture: '/textures/callisto.jpg' },
        ],
      },
      { name: 'Saturn',  radius: 30,   distance: 1800, color: 0xccbb88, emissive: false, orbitalSpeed: 0.007, rotationSpeed: 0.45,  rings: true, texture: '/textures/2k_saturn.jpg', ringTexture: '/textures/2k_saturn_ring_alpha.png',
        labelColor: '#ddcc88', minimapOrbitalPath: true,
        moons: [
          { name: 'Titan', radius: 3.2, orbitRadius: 80, orbitSpeed: 0.25, color: 0xdd9944 },
        ],
      },
      { name: 'Uranus',  radius: 18,   distance: 2500, color: 0x66ccdd, emissive: false, orbitalSpeed: 0.004, rotationSpeed: 0.4,   texture: '/textures/2k_uranus.jpg',
        labelColor: '#88ddee', minimapOrbitalPath: true },
      { name: 'Neptune', radius: 17.5, distance: 3200, color: 0x3344bb, emissive: false, orbitalSpeed: 0.003, rotationSpeed: 0.42,  texture: '/textures/2k_neptune.jpg',
        labelColor: '#7788ee', minimapOrbitalPath: true,
        moons: [
          { name: 'Triton', radius: 1.7, orbitRadius: 50, orbitSpeed: 0.3, color: 0xccbbcc, texture: '/textures/triton.jpg' },
        ],
      },
    ],
    asteroidBelt: {
      innerRadius: 650,
      outerRadius: 1150,
      count: 400,
      minSize: 0.8,
      maxSize: 4.5,
      beltThickness: 30,
      orbitalSpeed: 0.005,
      color: 0x887766,
    },
  },
  {
    name: 'ALPHA CENTAURI',
    center: { x: 5300, y: 0, z: 0 },
    boundaryRadius: 1100,
    bodies: [
      // Alpha Centauri A — G2V yellow star, 1.22 solar radii, 1.52 L☉
      {
        name: 'Rigil Kentaurus (Alpha Cen A)', radius: 98, distance: 270,
        color: 0xfff4ea, emissive: true, orbitalSpeed: 0.04,
        rotationSpeed: 0.05, initialAngle: 0, isStar: true,
        eccentricity: 0.5179,
        lightIntensity: 3800000, lightColor: 0xfff4ea,
        labelColor: '#fff5aa', minimapOrbitalPath: true, bloomScale: 0.94,
      },
      // Alpha Centauri B — K1V orange star, 0.86 solar radii, 0.50 L☉, opposite side of barycenter
      {
        name: 'Toliman (Alpha Cen B)', radius: 69, distance: 330,
        color: 0xffd8a8, emissive: true, orbitalSpeed: 0.04,
        rotationSpeed: 0.06, initialAngle: 0, orbitReversed: true, isStar: true,
        eccentricity: 0.5179,
        lightIntensity: 1250000, lightColor: 0xffd8a8,
        labelColor: '#ffd8a8', minimapOrbitalPath: true, bloomScale: 1.18,
      },
      // Proxima Centauri — M5.5Ve red dwarf, 0.15 solar radii, 0.0017 L☉, inclined orbit
      {
        name: 'Proxima Centauri (Alpha Cen C)', radius: 12, distance: 700,
        color: 0xff6633, emissive: true, orbitalSpeed: 0.005,
        rotationSpeed: 0.08, isStar: true,
        orbitalTilt: 0.52,
        lightIntensity: 4250, lightColor: 0xff6633,
        labelColor: '#ff7744', minimapOrbitalPath: true, bloomScale: 2.8,
      },
      // Proxima b — habitable zone rocky world, ~1.17 Earth masses
      {
        name: 'Proxima b', radius: 8.5, distance: 70,
        color: 0x448866, emissive: false, orbitalSpeed: 0.6,
        rotationSpeed: 0.2, parentStar: 'Proxima Centauri (Alpha Cen C)',
        labelColor: '#66cc88', minimapOrbitalPath: false,
      },
      // Proxima d — very close hot world, ~0.26 Earth masses
      {
        name: 'Proxima d', radius: 4, distance: 45,
        color: 0xcc8855, emissive: false, orbitalSpeed: 1.2,
        rotationSpeed: 0.15, parentStar: 'Proxima Centauri (Alpha Cen C)',
        labelColor: '#cc9966', minimapOrbitalPath: false,
      },
      // Proxima c (candidate) — cold super-Earth/mini-Neptune, ~7 Earth masses
      {
        name: 'Proxima c', radius: 12, distance: 300,
        color: 0x6688bb, emissive: false, orbitalSpeed: 0.015,
        rotationSpeed: 0.3, parentStar: 'Proxima Centauri (Alpha Cen C)',
        labelColor: '#8899cc', minimapOrbitalPath: false,
      },
    ],
  },
];
export const INTERSTELLAR_SPACE_NAME = 'INTERSTELLAR SPACE';

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

// Collision / Bounce
export const PLAYER_BOUNCE_RESTITUTION = 0.5;
export const COLLISION_SEPARATION_BUFFER = 1.0;

// Camera
export const CAMERA_OFFSET_Y = 6;
export const CAMERA_OFFSET_Z = 22;
export const CAMERA_LERP_FACTOR = 0.001;

// Asteroid Belt
export const ASTEROID_BELT_COLLISION_MARGIN = 50;
