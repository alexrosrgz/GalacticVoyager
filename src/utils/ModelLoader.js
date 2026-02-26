import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const objLoader = new OBJLoader();
const textureLoader = new THREE.TextureLoader();
const cache = new Map();

function loadTexture(path) {
  return new Promise((resolve, reject) => {
    textureLoader.load(path, resolve, undefined, reject);
  });
}

function loadOBJ(path) {
  return new Promise((resolve, reject) => {
    objLoader.load(path, resolve, undefined, reject);
  });
}

export function loadModel(objPath, texturePath, scale = 1) {
  const key = objPath + '|' + texturePath;

  if (cache.has(key)) {
    return cache.get(key).then(original => cloneModel(original, scale));
  }

  const promise = Promise.all([
    loadOBJ(objPath),
    loadTexture(texturePath),
  ]).then(([obj, texture]) => {
    texture.colorSpace = THREE.SRGBColorSpace;

    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshBasicMaterial({
          map: texture,
        });
      }
    });

    return obj;
  });

  cache.set(key, promise);
  return promise.then(original => cloneModel(original, scale));
}

function cloneModel(original, scale) {
  const clone = original.clone();

  // Deep clone materials so each instance is independent
  clone.traverse((child) => {
    if (child.isMesh) {
      child.material = child.material.clone();
    }
  });

  clone.scale.setScalar(scale);
  return clone;
}
