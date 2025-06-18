// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Hand structure
class Hand {
    constructor() {
        this.root = new THREE.Group();
        this.joints = {};
        this.createHand();
        scene.add(this.root);
    }

    createCapsule(radius, height, color) {
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 8);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    createFinger(name, segments, startPos, baseRotation = 0) {
        const fingerGroup = new THREE.Group();
        fingerGroup.position.copy(startPos);
        fingerGroup.rotation.z = baseRotation;

        let currentGroup = fingerGroup;
        const segmentLength = name === 'thumb' ? 0.8 : 1.0;
        const segmentRadius = name === 'thumb' ? 0.15 : name === 'pinky' ? 0.1 : 0.12;

        for (let i = 0; i < segments; i++) {
            const jointGroup = new THREE.Group();

            const capsule = this.createCapsule(
                segmentRadius,
                segmentLength,
                0xFFDBB3
            );
            capsule.position.y = segmentLength / 2;

            jointGroup.add(capsule);
            currentGroup.add(jointGroup);

            // Store joint reference
            this.joints[`${name}_${i}`] = jointGroup;

            // Next segment starts at the end of current one
            const nextGroup = new THREE.Group();
            nextGroup.position.y = segmentLength;
            jointGroup.add(nextGroup);
            currentGroup = nextGroup;
        }

        return fingerGroup;
    }

    createHand() {
        // Palm
        const palm = this.createCapsule(0.8, 0.6, 0xFFE4C4);
        palm.rotation.x = Math.PI / 2;
        palm.position.y = -0.5;
        palm.position.z = 0.6;
        this.root.add(palm);

        // Create fingers
        const thumb = this.createFinger('thumb', 2, new THREE.Vector3(-0.6, -0.2, 0.4), Math.PI / 4);
        const index = this.createFinger('index', 3, new THREE.Vector3(-0.4, 0.1, 0.6));
        const middle = this.createFinger('middle', 3, new THREE.Vector3(0, 0.2, 0.7));
        const ring = this.createFinger('ring', 3, new THREE.Vector3(0.4, 0.1, 0.6));
        const pinky = this.createFinger('pinky', 3, new THREE.Vector3(0.7, -0.3, 0.4));

        this.root.add(thumb, index, middle, ring, pinky);
    }

    setJointRotation(jointName, angle) {
        if (this.joints[jointName]) {
            this.joints[jointName].rotation.x = THREE.MathUtils.degToRad(angle);
        }
    }
}

// Create hand
const hand = new Hand();

// Camera controls (basic mouse controls)
let mouseDown = false;
let mouseX = 0;
let mouseY = 0;
let cameraDistance = 8;
let cameraAngleX = 0;
let cameraAngleY = 0;

function updateCamera() {
    camera.position.x = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
    camera.position.y = cameraDistance * Math.sin(cameraAngleX);
    camera.position.z = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
    camera.lookAt(0, 0, 0);
}

renderer.domElement.addEventListener('mousedown', (e) => {
    mouseDown = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
});

renderer.domElement.addEventListener('mouseup', () => {
    mouseDown = false;
});

renderer.domElement.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;

    const deltaX = e.clientX - mouseX;
    const deltaY = e.clientY - mouseY;

    cameraAngleY -= deltaX * 0.01;
    cameraAngleX += deltaY * 0.01;
    cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX));

    mouseX = e.clientX;
    mouseY = e.clientY;

    updateCamera();
});

renderer.domElement.addEventListener('wheel', (e) => {
    cameraDistance -= e.deltaY * 0.01;
    cameraDistance = Math.max(3, Math.min(15, cameraDistance));
    updateCamera();
});

// Setup UI controls
const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
const jointCounts = { thumb: 2, index: 3, middle: 3, ring: 3, pinky: 3 };

fingers.forEach(finger => {
    for (let i = 0; i < jointCounts[finger]; i++) {
        const slider = document.getElementById(`${finger}_${i}`);
        const span = slider.nextElementSibling;

        slider.addEventListener('input', (e) => {
            const angle = parseFloat(e.target.value);
            span.textContent = `${angle}°`;
            hand.setJointRotation(`${finger}_${i}`, angle);
        });
    }
});

// Initial camera setup
updateCamera();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
