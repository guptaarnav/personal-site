import * as THREE from "three";
import GUI from "lil-gui";

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
  const container = document.getElementById("animation-container");
  container.appendChild(renderer.domElement);

  // Background and stars
  const gradientTexture = createGradientTexture();
  scene.background = gradientTexture;
  const stars = createStars(2000);
  scene.add(stars);

  // Rocket mesh setup
  const rocketTexture = new THREE.TextureLoader().load("textures/starship.png");
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
  const plumeParams = {
    angle: 0,
    magnitude: 1,
    dragCoefficient: 0.99,
    // turbulence is now calculated
  };
  const { plumeParticles, updatePlume } = createPlume(plumeParams, planeHeight);

  // Add plumeParticles directly to the scene
  scene.add(plumeParticles);

  // lil-gui setup for controlling parameters
  const gui = new GUI();
  gui.add(plumeParams, "angle", -15, 15, 0.1).name("Thrust Angle");
  gui.add(plumeParams, "magnitude", 0, 1, 0.01).name("Thrust Magnitude");
  gui
    .add(plumeParams, "dragCoefficient", 0.9, 1.0, 0.001)
    .name("Drag Coefficient");
  // Removed turbulence control

  // Add controls for rocket position and rotation
  const rocketParams = { x: 0, y: -1.5, rotationAngle: 0 };
  gui.add(rocketParams, "x", -5, 5, 0.001).name("Rocket X Position");
  gui.add(rocketParams, "y", -5, 5, 0.001).name("Rocket Y Position");
  gui
    .add(rocketParams, "rotationAngle", -180, 180, 0.01)
    .name("Rocket Rotation");

  // Animation loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    animateStars(stars);

    const deltaTime = clock.getDelta();

    // Update rocket's position and rotation
    rocket.position.set(rocketParams.x, rocketParams.y, 0);
    rocket.rotation.z = THREE.MathUtils.degToRad(rocketParams.rotationAngle);

    // Update the rocket's world matrix
    rocket.updateMatrixWorld();

    // Get the rocket's bottom position in world space
    const localBottomPosition = new THREE.Vector3(0, -planeHeight / 2, 0);
    const rocketBottomPosition = localBottomPosition.applyMatrix4(
      rocket.matrixWorld
    );

    // Get the rocket's world quaternion
    const rocketQuaternion = new THREE.Quaternion();
    rocket.getWorldQuaternion(rocketQuaternion);

    // Update plume based on thrust parameters and rocket's current state
    updatePlume(
      plumeParams.angle,
      plumeParams.magnitude,
      deltaTime,
      rocketBottomPosition,
      rocketQuaternion
    );

    renderer.render(scene, camera);
  }

  animate();
}

// Function to create the plume
function createPlume(plumeParams, planeHeight) {
  const particlesCount = 1000;
  const plumeGeometry = new THREE.BufferGeometry();

  // Attributes
  const positions = new Float32Array(particlesCount * 3);
  const velocities = new Float32Array(particlesCount * 3);
  const ages = new Float32Array(particlesCount);
  const lifespans = new Float32Array(particlesCount);
  const sizes = new Float32Array(particlesCount);
  const colors = new Float32Array(particlesCount * 3);

  // Initialize attributes
  for (let i = 0; i < particlesCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;

    ages[i] = Math.random() * 2.0;
    lifespans[i] = 1.0 + Math.random() * 1.5;

    sizes[i] = 0.0; // Start with size zero since we're not emitting yet

    colors[i * 3] = 1.0;
    colors[i * 3 + 1] = 1.0;
    colors[i * 3 + 2] = 1.0;
  }

  plumeGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  plumeGeometry.setAttribute(
    "velocity",
    new THREE.BufferAttribute(velocities, 3)
  );
  plumeGeometry.setAttribute("age", new THREE.BufferAttribute(ages, 1));
  plumeGeometry.setAttribute(
    "lifespan",
    new THREE.BufferAttribute(lifespans, 1)
  );
  plumeGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  plumeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // Load a circle texture for particles
  const textureLoader = new THREE.TextureLoader();
  const particleTexture = textureLoader.load("textures/particle.png");

  // Shader material
  const plumeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      particleTexture: { value: particleTexture },
    },
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const plumeParticles = new THREE.Points(plumeGeometry, plumeMaterial);

  // Flag to track if there are active particles
  let plumeHasActiveParticles = false;

  // Function to update particles
  function updatePlume(
    angle,
    magnitude,
    deltaTime,
    emissionPosition,
    rocketQuaternion
  ) {
    // If magnitude is zero and no active particles, skip updating
    if (magnitude === 0 && !plumeHasActiveParticles) {
      return;
    }

    const shouldEmit = magnitude > 0;
    let activeParticles = 0;

    // Calculate turbulence based on magnitude (parabolic relationship)
    const maxTurbulence = 0.25;
    const turbulence = maxTurbulence * magnitude * magnitude;

    for (let i = 0; i < particlesCount; i++) {
      // Update age
      ages[i] += deltaTime;

      if (ages[i] >= lifespans[i]) {
        if (shouldEmit) {
          // Respawn particle
          ages[i] = 0;
          lifespans[i] = 1.0 + Math.random() * 1.5;

          // Set initial position to rocket's bottom position
          positions[i * 3] = emissionPosition.x;
          positions[i * 3 + 1] = emissionPosition.y;
          positions[i * 3 + 2] = emissionPosition.z;

          // Compute initial thrust direction in rocket's local space
          const angleRad = THREE.MathUtils.degToRad(angle);
          const localThrustDirection = new THREE.Vector3(
            Math.sin(angleRad),
            -Math.cos(angleRad),
            0
          );

          // Transform thrust direction to world space
          const thrustDirection = localThrustDirection.applyQuaternion(
            rocketQuaternion.clone()
          );

          // Speed with some randomness
          const speed = magnitude * (1.0 + Math.random() * 0.5);

          // Initial velocity
          const velocity = thrustDirection.multiplyScalar(speed);

          // Add initial turbulence
          velocity.x += (Math.random() - 0.5) * turbulence;
          velocity.y += (Math.random() - 0.5) * turbulence;
          velocity.z += (Math.random() - 0.5) * turbulence;

          // Store velocity
          velocities[i * 3] = velocity.x;
          velocities[i * 3 + 1] = velocity.y;
          velocities[i * 3 + 2] = velocity.z;

          // Reset size
          sizes[i] = 10.0;

          // Reset color (will transition in shader)
          colors[i * 3] = 1.0;
          colors[i * 3 + 1] = 1.0;
          colors[i * 3 + 2] = 1.0;

          // Increment active particles counter
          activeParticles++;
        } else {
          // Particle is dead and we're not emitting new ones
          sizes[i] = 0; // Hide the particle
          velocities[i * 3] = 0;
          velocities[i * 3 + 1] = 0;
          velocities[i * 3 + 2] = 0;
        }
      } else {
        // Particle is alive, update it
        activeParticles++;

        // Apply drag to velocity
        const drag = Math.pow(plumeParams.dragCoefficient, deltaTime);
        velocities[i * 3] *= drag;
        velocities[i * 3 + 1] *= drag;
        velocities[i * 3 + 2] *= drag;

        // Add turbulence
        velocities[i * 3] += (Math.random() - 0.5) * turbulence * deltaTime;
        velocities[i * 3 + 1] += (Math.random() - 0.5) * turbulence * deltaTime;
        velocities[i * 3 + 2] += (Math.random() - 0.5) * turbulence * deltaTime;

        // Update positions
        positions[i * 3] += velocities[i * 3] * deltaTime;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
      }
    }

    // Update the plume active flag
    plumeHasActiveParticles = activeParticles > 0;

    // Only update geometry if there are active particles
    if (plumeHasActiveParticles) {
      // Update geometry attributes
      plumeGeometry.attributes.position.needsUpdate = true;
      plumeGeometry.attributes.age.needsUpdate = true;
      plumeGeometry.attributes.lifespan.needsUpdate = true;
      plumeGeometry.attributes.size.needsUpdate = true;
      plumeGeometry.attributes.color.needsUpdate = true;

      // Update material uniform
      plumeMaterial.uniforms.time.value += deltaTime;
    }
  }

  return { plumeParticles, updatePlume };
}

// Vertex Shader
const vertexShaderSource = `
  attribute float age;
  attribute float lifespan;
  attribute float size;
  varying float vAge;
  varying float vLifespan;

  void main() {
    vAge = age;
    vLifespan = lifespan;

    // Calculate point size based on age
    float lifeProgress = vAge / vLifespan;
    float pointSize = size * (1.0 - lifeProgress);

    // Set the point size
    gl_PointSize = pointSize;

    // Transform position
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment Shader
const fragmentShaderSource = `
  uniform sampler2D particleTexture;
  varying float vAge;
  varying float vLifespan;

  void main() {
    // Calculate life progress
    float lifeProgress = vAge / vLifespan;

    // Color transitions from fire to smoke
    vec3 fireColor = vec3(1.0, 0.5, 0.0); // Orange
    vec3 smokeColor = vec3(0.2, 0.2, 0.2); // Dark gray

    // Interpolate color based on life progress
    vec3 color = mix(fireColor, smokeColor, lifeProgress);

    // Fetch alpha from texture
    float alpha = texture2D(particleTexture, gl_PointCoord).a;

    // Fade out over time
    alpha *= (1.0 - lifeProgress);

    // Output final color
    gl_FragColor = vec4(color, alpha);
  }
`;
// Function to create the gradient background texture
function createGradientTexture() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 2;
  canvas.height = 2;

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0.7, "#000000");
  gradient.addColorStop(1, "#000011");
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

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

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
