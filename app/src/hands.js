// Scene setup
const scene = new THREE.Scene();
scene.background = null;
const loader = new THREE.TextureLoader();
loader.load(
    './img/mx_mechanical.jpg',
    (texture) => {
        // This function is called when the image is successfully loaded
        scene.background = texture;
    },
    undefined, // onProgress callback (optional)
    (err) => {
        // This function is called if there's an error loading the image
        console.error('An error happened while loading the background image.', err);
    }
);

const rendererSize = { w: 640, h: 480 };
const camera = new THREE.PerspectiveCamera(75, rendererSize.w / rendererSize.h, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(rendererSize.w, rendererSize.h);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(6, 5, 15);
directionalLight.castShadow = true;
// Adjust the shadow camera frustum for better performance and quality
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.camera.left = -15;
directionalLight.shadow.camera.right = 15;
directionalLight.shadow.camera.top = 15;
directionalLight.shadow.camera.bottom = -15;
// Increase shadow map resolution for sharper shadows
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Create an invisible plane to receive shadows, placed behind the hand.
// This plane will only render the shadows cast upon it.
const shadowReceiverPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100), // Large enough to cover the view
    new THREE.ShadowMaterial({ opacity: 0.3 }) // Controls the shadow's darkness
);
shadowReceiverPlane.receiveShadow = true;
shadowReceiverPlane.position.z = -0.1; // Place it behind the hand
scene.add(shadowReceiverPlane);

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
        const segmentLength = name === 'thumb' ? 0.5 : 0.6;
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
        this.joints['palm_0'] = this.root;

        // Create fingers
        const thumb = this.createFinger('thumb', 2, new THREE.Vector3(-0.6, -0.2, 0.4), Math.PI / 4);
        const index = this.createFinger('index', 3, new THREE.Vector3(-0.4, 0.1, 0.6));
        const middle = this.createFinger('middle', 3, new THREE.Vector3(0, 0.2, 0.7));
        const ring = this.createFinger('ring', 3, new THREE.Vector3(0.4, 0.1, 0.6));
        const pinky = this.createFinger('pinky', 3, new THREE.Vector3(0.7, -0.3, 0.4));

        this.root.add(thumb, index, middle, ring, pinky);
    }

    setJointRotation(jointName, ax, ay = 0, az = 0, px = 0, py = 0, pz = 0) {
        if (this.joints[jointName]) {
            this.joints[jointName].rotation.x = THREE.MathUtils.degToRad(ax);
            this.joints[jointName].rotation.y = THREE.MathUtils.degToRad(ay);
            this.joints[jointName].rotation.z = THREE.MathUtils.degToRad(az);
            this.joints[jointName].position.x = px;
            this.joints[jointName].position.y = py;
            this.joints[jointName].position.z = pz;
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
const fingers = ['palm', 'thumb', 'index', 'middle', 'ring', 'pinky'];
const jointCounts = { palm: 1, thumb: 2, index: 3, middle: 3, ring: 3, pinky: 3 };

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

function updateBoundingBox(rootGroup, canvas) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Ensure world matrices are up to date
    rootGroup.updateMatrixWorld(true);

    // Use traverse to visit the group and all its descendants
    rootGroup.traverse(node => {
        // Check if the node is a Mesh and has geometry with positions
        if (node.isMesh && node.geometry?.attributes.position) {
            const positions = node.geometry.attributes.position;

            for (let i = 0; i < positions.count; i++) {
                // Create a vector for the current vertex
                const vertex = new THREE.Vector3().fromBufferAttribute(positions, i);

                // Transform the local vertex position to world coordinates.
                // node.matrixWorld is used as it's the final transform matrix.
                vertex.applyMatrix4(node.matrixWorld);

                // Project the world coordinate to screen space (NDC)
                vertex.project(camera);

                // Convert Normalized Device Coordinates (NDC) to screen pixels
                const x = (vertex.x * 0.5 + 0.5) * canvas.width;
                const y = (vertex.y * -0.5 + 0.5) * canvas.height;

                // Update the min and max screen coordinates
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    });

    // Calculate width and height of the bounding box
    const width = maxX - minX;
    const height = maxY - minY;

    // Check if the calculated values are finite and positive.
    // This prevents errors if the object is off-screen.
    if (isFinite(width) && isFinite(height) && width > 0 && height > 0) {
        // Update the CSS for the bounding box div
        boundingBox.style.left = `${minX}px`;
        boundingBox.style.top = `${minY}px`;
        boundingBox.style.width = `${width}px`;
        boundingBox.style.height = `${height}px`;
        boundingBox.style.display = 'block'; // Make it visible
        return [minX, minY, width, height];
    } else {
        // Hide the box if the object is off-screen or has no size
        boundingBox.style.display = 'none';
    }
    return [];
}

// Initial camera setup
updateCamera();
let saveImage = true;
let totalFrames = 0;
let frame = 0;
const maxFrames = 2;
const deltaAnglePI = Math.PI / maxFrames;
const deltaAngle2PI = Math.PI * 2 / maxFrames;
const maxXpos = 7;
const maxYpos = 7;
const maxZpos = 3;
let handYpos = -maxYpos;
let handZpos = -maxZpos;
const delayInMilliseconds = 100;
const annotations = {};
let annotationsSaved = false;

function saveJsonStringAsFile(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`; // This is the filename the user will be prompted with.
    document.body.appendChild(link); // The link needs to be in the document to be clickable.
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Frees up memory by releasing the object URL.
}
function saveImageToDisk(filename) {
    const image = renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function animateHand() {
    const periodicValuePI = Math.sin(frame * deltaAnglePI);
    const periodicValue2PI = Math.sin(frame * deltaAngle2PI);
    const angle = 90 * periodicValuePI;
    ['thumb', 'index', 'middle', 'ring', 'pinky'].forEach(finger => {
        for (let i = 0; i < jointCounts[finger]; i++) {
            hand.setJointRotation(`${finger}_${i}`, -angle);
        }
    });

    hand.setJointRotation(`palm_0`, 45 * periodicValue2PI, 45 * periodicValue2PI, 45 * periodicValue2PI, maxXpos * periodicValue2PI, handYpos, handZpos);

    if (frame < maxFrames) {
        frame++;
    } else if (handYpos < maxYpos) {
        frame = 0;
        handYpos++;
    } else if (handZpos < maxZpos) {
        frame = 0;
        handYpos = -maxYpos;
        handZpos++;
    }

    if (handZpos < maxZpos) {
        const imageName = `frame-${totalFrames}`;
        const bb = updateBoundingBox(hand.root, renderer.domElement);
        const bbArray = [];
        bbArray.push(bb);
        annotations[imageName] = bbArray;
        totalFrames++;
        if (saveImage) {
            saveImageToDisk(imageName); // Use frame number for filename
        }
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, delayInMilliseconds);
    } else if (!annotationsSaved) {
        saveJsonStringAsFile(annotations, `annotations`);
        annotationsSaved = true;
    }
}

// Animation loop
function animate() {
    renderer.render(scene, camera);
    animateHand();

}

animate();

// Handle window resize
window.addEventListener('resize', () => {
});
