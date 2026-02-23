export const PLANETS = [
  { name: 'Sun',     radius: 80,   distance: 0,    color: 0xffaa00, emissive: true,  orbitalSpeed: 0,     rotationSpeed: 0.05,  texture: '/textures/2k_sun.jpg' },
  { name: 'Mercury', radius: 3,    distance: 200,  color: 0xaaaaaa, emissive: false, orbitalSpeed: 0.04,  rotationSpeed: 0.01,  texture: '/textures/2k_mercury.jpg' },
  { name: 'Venus',   radius: 7.5,  distance: 300,  color: 0xe8cda0, emissive: false, orbitalSpeed: 0.035, rotationSpeed: 0.005, texture: '/textures/2k_venus_surface.jpg' },
  { name: 'Earth',   radius: 8,    distance: 400,  color: 0x2266cc, emissive: false, orbitalSpeed: 0.03,  rotationSpeed: 0.3,   texture: '/textures/2k_earth_daymap.jpg' },
  { name: 'Mars',    radius: 4.3,  distance: 600,  color: 0xcc4422, emissive: false, orbitalSpeed: 0.02,  rotationSpeed: 0.28,  texture: '/textures/2k_mars.jpg' },
  { name: 'Jupiter', radius: 34,   distance: 1200, color: 0xddaa77, emissive: false, orbitalSpeed: 0.01,  rotationSpeed: 0.5,   texture: '/textures/2k_jupiter.jpg' },
  { name: 'Saturn',  radius: 30,   distance: 1800, color: 0xccbb88, emissive: false, orbitalSpeed: 0.007, rotationSpeed: 0.45,  rings: true, texture: '/textures/2k_saturn.jpg', ringTexture: '/textures/2k_saturn_ring_alpha.png' },
  { name: 'Uranus',  radius: 18,   distance: 2500, color: 0x66ccdd, emissive: false, orbitalSpeed: 0.004, rotationSpeed: 0.4,   texture: '/textures/2k_uranus.jpg' },
  { name: 'Neptune', radius: 17.5, distance: 3200, color: 0x3344bb, emissive: false, orbitalSpeed: 0.003, rotationSpeed: 0.42,  texture: '/textures/2k_neptune.jpg' },
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
