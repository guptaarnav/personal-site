import * as THREE from 'three';

function initAnimation() {
  const scene = new THREE.Scene();

  // Set up camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Set up renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Append renderer to the DOM
  const container = document.getElementById('animation-container');
  container.appendChild(renderer.domElement);

  // Set up the gradient background
  const gradientTexture = createGradientTexture();
  scene.background = gradientTexture;

  // Create stars
  const stars = createStars(2000);
  scene.add(stars);

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    animateStars(stars);
    renderer.render(scene, camera);
  }
  
  animate();
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
    size: Math.pow(Math.random() * 0.3, 2) + 0.2, // Randomize size between 0.1 and 0.4 for smaller stars
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
