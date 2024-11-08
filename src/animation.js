import * as THREE from 'three';

function initAnimation() {
  const scene = new THREE.Scene();

  // Set up a perspective camera for the general scene (stars and background)
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Set up renderer
  const renderer = new THREE.WebGLRenderer({ alpha: true }); // Enable alpha for transparent backgrounds
  renderer.setSize(window.innerWidth, window.innerHeight);
  const container = document.getElementById('animation-container');
  container.appendChild(renderer.domElement);

  // Set up the gradient background
  const gradientTexture = createGradientTexture();
  scene.background = gradientTexture;

  // Create stars
  const stars = createStars(2000);
  scene.add(stars);

  // Load and add the rocket image using a dedicated OrthographicCamera to avoid squishing
  const rocketTexture = new THREE.TextureLoader().load('textures/starship.png');

  // Get rocket's aspect ratio based on actual image dimensions, e.g., 400 x 1000 pixels
  const rocketWidthInPixels = 600;  // Replace with actual width
  const rocketHeightInPixels = 1000; // Replace with actual height
  const aspectRatio = rocketWidthInPixels / rocketHeightInPixels;

  // Adjust plane size according to aspect ratio
  const planeHeight = 3; // Desired height in scene units
  const planeWidth = planeHeight * aspectRatio; // Adjust width based on aspect ratio

  const rocketGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  const rocketMaterial = new THREE.MeshBasicMaterial({
    map: rocketTexture,
    transparent: true,
  });

  const rocket = new THREE.Mesh(rocketGeometry, rocketMaterial);
  rocket.position.y = -1.5; // Position the rocket lower in the scene
  scene.add(rocket);

  // Resize handling
  window.addEventListener('resize', () => onWindowResize(renderer, camera, rocket, aspectRatio));

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    animateStars(stars);

    // Add a slight oscillation for the rocket to simulate hovering
    rocket.position.y = -1.5 + Math.sin(Date.now() * 0.003) * 0.05;

    renderer.render(scene, camera);
  }

  animate();
}

// Function to handle window resize and keep the rocket's aspect ratio
function onWindowResize(renderer, camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update the camera's aspect ratio and renderer's size
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

  // Lower the transition midpoint so it turns black sooner
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0.1, '#000000');   // Deep black at the top
  gradient.addColorStop(0.6, '#000011'); // Dark blue closer to the bottom
  gradient.addColorStop(1, '#000066');   // Dark blue at the very bottom

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

  // Material for stars with reduced size and slightly varying opacity
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: Math.max(Math.pow(Math.random() * 0.3, 2) + 0.2, 0.3), // Randomize size between 0.1 and 0.4 for smaller stars
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(geometry, material);
  return stars;
}

// Function to animate stars with a more pronounced twinkling effect
function animateStars(stars) {
  const positions = stars.geometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    // Adjust twinkling by modulating the y-position with a stronger amplitude and frequency
    positions[i + 1] += Math.sin(Date.now() * 0.002 + i) * 0.001;
  }

  stars.geometry.attributes.position.needsUpdate = true;
}

export default initAnimation;
