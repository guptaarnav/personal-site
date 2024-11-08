import * as THREE from 'three';
import GUI from 'lil-gui';

// Updated initAnimation function with lil-gui controls for rocket position and rotation
function initAnimation() {
  const scene = new THREE.Scene();

  // Set up camera and renderer
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const container = document.getElementById('animation-container');
  container.appendChild(renderer.domElement);

  // Background and stars
  const gradientTexture = createGradientTexture();
  scene.background = gradientTexture;
  const stars = createStars(2000);
  scene.add(stars);

  // Rocket mesh setup
  const rocketTexture = new THREE.TextureLoader().load('textures/starship.png');
  const aspectRatio = 138 / 443;
  const planeHeight = 2;
  const planeWidth = planeHeight * aspectRatio;
  const rocketGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const rocketMaterial = new THREE.MeshBasicMaterial({
    map: rocketTexture,
    transparent: true,
  });
  const rocket = new THREE.Mesh(rocketGeometry, rocketMaterial);
  rocket.position.y = -1.5;
  scene.add(rocket);

  // Plume setup
  const plumeParams = { angle: 0, magnitude: 1 };
  const { plumeParticles, updatePlume } = createPlume(plumeParams);

  // Attach plumeParticles as a child of the rocket
  rocket.add(plumeParticles);

  // Position plumeParticles relative to the rocket
  plumeParticles.position.set(0, -planeHeight / 2, 0);

  // lil-gui setup for controlling parameters
  const gui = new GUI();
  gui.add(plumeParams, 'angle', -15, 15, 0.1).name('Thrust Angle');
  gui.add(plumeParams, 'magnitude', 0, 3, 0.1).name('Thrust Magnitude');

  // Add controls for rocket position and rotation
  const rocketParams = { x: 0, y: -1.5, rotationAngle: 0 };
  gui.add(rocketParams, 'x', -5, 5, 0.1).name('Rocket X Position');
  gui.add(rocketParams, 'y', -5, 5, 0.1).name('Rocket Y Position');
  gui.add(rocketParams, 'rotationAngle', -180, 180, 1).name('Rocket Rotation');

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    animateStars(stars);

    // Update rocket's position and rotation
    rocket.position.set(rocketParams.x, rocketParams.y, 0);
    rocket.rotation.z = THREE.MathUtils.degToRad(rocketParams.rotationAngle);

    // Update plume based on thrust parameters
    updatePlume(plumeParams.angle, plumeParams.magnitude);

    renderer.render(scene, camera);
  }

  animate();
}

// Updated createPlume function to adjust plume length only
function createPlume(plumeParams) {
  const particlesCount = 100;
  const plumeGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particlesCount * 3);

  plumeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const plumeMaterial = new THREE.PointsMaterial({
    color: 0xffa500,
    size: 0.2,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });

  const plumeParticles = new THREE.Points(plumeGeometry, plumeMaterial);

  // Function to update particles based on thrust parameters
  function updatePlume(angle, magnitude) {
    const positions = plumeGeometry.attributes.position.array;
    const angleRad = THREE.MathUtils.degToRad(angle);

    // Direction vector
    const direction = new THREE.Vector2(Math.sin(angleRad), -Math.cos(angleRad));
    const perpendicular = new THREE.Vector2(-direction.y, direction.x);

    // Define a constant spread value for width
    const spreadAmount = 0.23; // Adjust this value to set the plume width

    for (let i = 0; i < particlesCount; i++) {
      const dist = Math.random() * magnitude * 2; // Length scales with magnitude
      const spread = (Math.random() - 0.5) * spreadAmount; // Width is constant

      const x = direction.x * dist + perpendicular.x * spread;
      const y = direction.y * dist + perpendicular.y * spread;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.1; // Small random Z offset
    }

    plumeMaterial.size = 0.2; // Keep size constant or adjust as needed
    plumeGeometry.attributes.position.needsUpdate = true;
  }

  return { plumeParticles, updatePlume };
}

// Function to handle window resize and keep the rocket's aspect ratio
function onWindowResize(renderer, camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Function to create the gradient background texture
function createGradientTexture() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 2;
  canvas.height = 2;

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0.7, '#000000');
  gradient.addColorStop(1, '#000011');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Function to create stars with a smaller maximum size
function createStars(count) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < count; i++) {
    const x = THREE.MathUtils.randFloatSpread(200);
    const y = THREE.MathUtils.randFloatSpread(200);
    const z = THREE.MathUtils.randFloatSpread(200);

    positions.push(x, y, z);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: Math.min(Math.pow(Math.random() * 0.3, 2) + 0.2, 0.2),
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}

// Function to animate stars with a more pronounced twinkling effect
function animateStars(stars) {
  const positions = stars.geometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] += Math.sin(Date.now() * 0.002 + i) * 0.001;
  }

  stars.geometry.attributes.position.needsUpdate = true;
}

export default initAnimation;
