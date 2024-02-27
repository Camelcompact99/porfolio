// Variables globales para Three.js
let scene, camera, renderer;
let plane, vertices;
let originalVerticesZ;
let independentVerticesZ; // Nuevas posiciones Z para el movimiento independiente
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Distancia de la cámara al plano (ajústalo según sea necesario)
const cameraDistance = 10;

// Factor para controlar el tamaño general del área de acción del mouse (ajústalo según sea necesario)
const mouseAreaSize = 0.1;

// Factor para controlar la cantidad de aleatoriedad en el área de acción del mouse (ajústalo según sea necesario)
const mouseRandomness = 0;

// Factor para controlar la influencia del movimiento en el eje Z (ajústalo según sea necesario)
const movementAmplitude = -3;


// Velocidad de transición de regreso de los vértices
const transitionSpeed = 0.01;


// Velocidad del movimiento independiente en el eje Z
const independentMovementSpeed = 0.01;

// Factor para controlar la amplitud del movimiento independiente
const independentMovementAmplitude = 0.09;

// Factor para controlar la longitud del desplazamiento independiente
const independentMovementLength = 0.15;

// Cantidad de armónicos en el movimiento independiente
const independentMovementHarmonics = 6;

// Factor para controlar la amplitud del ruido en el desplazamiento independiente
const independentMovementNoiseAmplitude = 0.3;


// Función de ruido Perlin simple
function noise(x, y) {
  const n = x + y * 57;
  return (Math.sin(n) * 43758.5453123) % 1;
}

// Inicialización
function init() {
  // Escena
  scene = new THREE.Scene();

  // Cámara
  camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = cameraDistance;

  // Renderizador
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // Habilitar antialiasing
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // Color de fondo de la escena: negro, 0 (transparente)
  document.body.appendChild(renderer.domElement);

  // Plano
  const geometry = new THREE.PlaneGeometry(2, 2, 150, 10);
    // Carga de la textura de imagen y el mapa de normales
    const textureLoader = new THREE.TextureLoader();
    const normalMapLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('textures/foto.jpg');
    const normalMap = normalMapLoader.load('textures/normales2.png');
  
    const material = new THREE.MeshPhongMaterial({
      map: texture,          // Textura de imagen
      normalMap: normalMap,  // Mapa de normales
      wireframe: false        // Ajusta otras propiedades según tus necesidades
    });
  plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  //LUZ
  const pointLight = new THREE.PointLight(0xffffff, 1.8, 5); // Color, Intensidad, Distancia
  pointLight.position.set(0, 1.5, 1); // Posición de la luz (en coordenadas XYZ)
  scene.add(pointLight);

    // Obtener referencia a los vértices para poder modificarlos más tarde
    vertices = plane.geometry.attributes.position.array;

    // Guardar las posiciones Z originales de los vértices
    originalVerticesZ = vertices.slice();
  
    // Inicializar las nuevas posiciones Z para el movimiento independiente
    independentVerticesZ = originalVerticesZ.slice();

    // Asociar la función onWindowResize al evento resize de la ventana
    window.addEventListener('resize', onWindowResize, false);

  // Eventos de ratón
  document.addEventListener('mousemove', onMouseMove, false);

  // Eventos táctiles
  document.addEventListener('touchmove', onTouchMove, { passive: false });

  // Renderizar la escena
  animate();
}
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
  
    // Actualizar el tamaño del renderizador
    renderer.setSize(window.innerWidth, window.innerHeight);
  
    // Ajustar el tamaño de la cámara para mantener la relación de aspecto correcta
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
      // Volver a calcular la posición de los vértices originales del plano para mantener la forma inicial
  for (let i = 0; i < originalVerticesZ.length; i += 3) {
    originalVerticesZ[i] *= aspect;
  }

  // Redibujar la escena
  handleVertexMove();
  renderer.render(scene, camera);
}
// Función para detectar el movimiento del puntero (ratón)
function onMouseMove(event) {
  event.preventDefault();
  const boundingRect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - boundingRect.left) / boundingRect.width) * 2 - 1;
  mouse.y = -((event.clientY - boundingRect.top) / boundingRect.height) * 2 + 1;
}

// Función para detectar el movimiento del toque (dispositivos táctiles)
function onTouchMove(event) {
  event.preventDefault();
  const boundingRect = renderer.domElement.getBoundingClientRect();
  const touch = event.touches[0];
  mouse.x = ((touch.clientX - boundingRect.left) / boundingRect.width) * 2 - 1;
  mouse.y = -((touch.clientY - boundingRect.top) / boundingRect.height) * 2 + 1;
}

// Función para desplazar los vértices hacia -Z si el ratón está sobre ellos
function handleVertexMoveAndIndependentMovement() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(plane);

  const time = Date.now() * independentMovementSpeed;

  for (let i = 0; i < vertices.length; i += 3) {
    const vertexMouseDistance = Math.sqrt((vertices[i] - mouse.x) ** 2 + (vertices[i + 1] - mouse.y) ** 2);

    if (vertexMouseDistance < mouseAreaSize + noise(vertices[i], vertices[i + 1]) * mouseRandomness) {
      // Si el ratón está sobre el vértice, lo desplazamos hacia -Z usando las posiciones originales
      vertices[i + 2] = originalVerticesZ[i + 2] + movementAmplitude;
    } else {
      // Si el ratón no está sobre el vértice, interpolamos para que vuelva a su posición original suavemente
      vertices[i + 2] = lerp(vertices[i + 2], independentVerticesZ[i + 2], transitionSpeed);
    }

    // Aplicar el movimiento independiente con ruido y armónicos
    independentVerticesZ[i + 2] = originalVerticesZ[i + 2];

    for (let j = 0; j < independentMovementHarmonics; j++) {
      const harmonicNoise = noise(vertices[i] * (j + 1), vertices[i + 1] * (j + 1)) * independentMovementNoiseAmplitude;
      independentVerticesZ[i + 2] += Math.sin(time * (j + 1) * independentMovementLength + vertices[i] + vertices[i + 1]) * (independentMovementAmplitude + harmonicNoise);
    }
  }

  plane.geometry.attributes.position.needsUpdate = true;
}


// Función de interpolación lineal (lerp)
function lerp(a, b, t) {
  return (1 - t) * a + t * b;
}

// Función para renderizar la escena
function animate() {
  handleVertexMoveAndIndependentMovement(); // Actualizamos los vértices en cada frame
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Llamada a la función de inicialización
init();