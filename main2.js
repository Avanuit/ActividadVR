import * as THREE from 'three';

// escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); 

// resolucion
const renderWidth = 640, renderHeight = 360;
const aspect = renderWidth / renderHeight;

// camara
const cameraSize = 15;
const camera = new THREE.OrthographicCamera(-cameraSize * aspect, cameraSize * aspect, cameraSize, -cameraSize, 0.1, 1000);
camera.position.set(0, 25, 0); 
camera.lookAt(0, 0, 0);

// render
const renderer = new THREE.WebGLRenderer({ antialias: false }); 
renderer.setSize(renderWidth, renderHeight, false); 
document.body.appendChild(renderer.domElement);

// luces
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); 
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight.position.set(5, 15, 5);
scene.add(directionalLight);

// texturas
function createPixelTexture(size, color, isStripe = false, isCue = false) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext('2d');

    if (isCue) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, size, size);
    } else {
        context.fillStyle = isStripe ? '#ffffff' : color;
        context.fillRect(0, 0, size, size);
        if (isStripe) {
            context.fillStyle = color;
            context.fillRect(0, size/4, size, size/2); 
        }
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(size/2, size/2, size/4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#000000';
        context.fillRect(size/2 - 1, size/2 - 1, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; 
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

// materiales mesa
const feltMat = new THREE.MeshLambertMaterial({ color: 0x006622 }); 
const woodMat = new THREE.MeshLambertMaterial({ color: 0x442200 }); 
const cushionMat = new THREE.MeshLambertMaterial({ color: 0x004411 }); 

// dimensiones
const baseWidth = 20, baseHeight = 10;
const tableWidth = baseWidth * 1.25, tableHeight = baseHeight * 1.25;
const ballRadius = 0.35;

// mesa
const felt = new THREE.Mesh(new THREE.BoxGeometry(tableWidth, 0.5, tableHeight), feltMat);
felt.position.y = -0.25;
scene.add(felt);

// paredes
const cushionSize = 0.6, frameSize = 1.2;
const cushionHalfGeo = new THREE.BoxGeometry(tableWidth / 2 - 0.8, 0.8, cushionSize);
const cushionShortGeo = new THREE.BoxGeometry(cushionSize, 0.8, tableHeight);

const walls = [
    { geo: cushionHalfGeo, pos: [-tableWidth/4 - 0.4, 0.15, -tableHeight/2 - cushionSize/2] },
    { geo: cushionHalfGeo, pos: [tableWidth/4 + 0.4, 0.15, -tableHeight/2 - cushionSize/2] },
    { geo: cushionHalfGeo, pos: [-tableWidth/4 - 0.4, 0.15, tableHeight/2 + cushionSize/2] },
    { geo: cushionHalfGeo, pos: [tableWidth/4 + 0.4, 0.15, tableHeight/2 + cushionSize/2] },
    { geo: cushionShortGeo, pos: [-tableWidth/2 - cushionSize/2, 0.15, 0] },
    { geo: cushionShortGeo, pos: [tableWidth/2 + cushionSize/2, 0.15, 0] }
];
walls.forEach(w => {
    const m = new THREE.Mesh(w.geo, cushionMat);
    m.position.set(...w.pos);
    scene.add(m);
});

// marco
const fLong = new THREE.BoxGeometry(tableWidth + cushionSize*2 + frameSize*2, 1.2, frameSize);
const fShort = new THREE.BoxGeometry(frameSize, 1.2, tableHeight + cushionSize*2);
const frames = [
    { geo: fLong, pos: [0, 0.1, -tableHeight/2 - cushionSize - frameSize/2] },
    { geo: fLong, pos: [0, 0.1, tableHeight/2 + cushionSize + frameSize/2] },
    { geo: fShort, pos: [-tableWidth/2 - cushionSize - frameSize/2, 0.1, 0] },
    { geo: fShort, pos: [tableWidth/2 + cushionSize + frameSize/2, 0.1, 0] }
];
frames.forEach(f => {
    const m = new THREE.Mesh(f.geo, woodMat);
    m.position.set(...f.pos);
    scene.add(m);
});

// agujeros TODO: hacer que funcionen
const holeGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.9, 8); 
const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const holePos = [
    [-tableWidth/2, 0.1, -tableHeight/2], [0, 0.1, -tableHeight/2 - cushionSize/2], [tableWidth/2, 0.1, -tableHeight/2],
    [-tableWidth/2, 0.1, tableHeight/2], [0, 0.1, tableHeight/2 + cushionSize/2], [tableWidth/2, 0.1, tableHeight/2]
];
holePos.forEach(p => {
    const h = new THREE.Mesh(holeGeo, holeMat);
    h.position.set(p[0], p[1], p[2]);
    scene.add(h);
});

// bolas
const ballColors = ['#ddcc00', '#0000dd', '#dd0000', '#440088', '#ff6600', '#00aa00', '#882200', '#111111'];
const ballTextures = [];
for (let i = 1; i <= 15; i++) ballTextures[i] = createPixelTexture(32, ballColors[(i-1)%8], i > 8);
const cueTexture = createPixelTexture(32, '#ffffff', false, true);

const ballGeo = new THREE.IcosahedronGeometry(ballRadius, 1); 
const balls = [];
const triangleOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]; 

function createBall(x, z, tex) {
    const m = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(x, ballRadius, z);
    scene.add(m);
    balls.push({ mesh: m, pos: new THREE.Vector2(x, z), vel: new THREE.Vector2(0, 0) });
}

//triangulo inicial
function setupBalls() {
    createBall(-6, 0, cueTexture);
    const sX = 5, spX = ballRadius * 1.75, spZ = ballRadius * 2.05;
    let idx = 0;
    for (let c = 0; c < 5; c++) {
        for (let r = 0; r <= c; r++) createBall(sX + c * spX, -(c * spZ) / 2 + r * spZ, ballTextures[triangleOrder[idx++]]);
    }
}

setupBalls();

// fisicas
const friction = 0.985, wallB = 0.7, ballB = 0.95;

// interaccion
window.addEventListener('mousedown', () => {
    balls.forEach(b => { b.vel.x = (Math.random() - 0.5) * 3; b.vel.y = (Math.random() - 0.5) * 3; });
});

// reset
const resetBtn = document.getElementById('retro-reset-button');
if(resetBtn) resetBtn.addEventListener('click', () => {
    balls.forEach(b => scene.remove(b.mesh));
    balls.length = 0;
    setupBalls();
});

//framerate
const clock = new THREE.Clock();
const targetFPS = 20; 
let accTime = 0;

// animacion
function animate() {
    requestAnimationFrame(animate);
    accTime += clock.getDelta();
    if (accTime > 1 / targetFPS) {
        balls.forEach((b, i) => {
            if(b.vel.length() < 0.001) return b.vel.set(0,0);
            b.pos.add(b.vel);
            b.vel.multiplyScalar(friction);
            if (Math.abs(b.pos.x) > tableWidth/2 - ballRadius) { b.vel.x *= -wallB; b.pos.x = Math.sign(b.pos.x)*(tableWidth/2 - ballRadius); }
            if (Math.abs(b.pos.y) > tableHeight/2 - ballRadius) { b.vel.y *= -wallB; b.pos.y = Math.sign(b.pos.y)*(tableHeight/2 - ballRadius); }
            for (let j = i + 1; j < balls.length; j++) {
                const bB = balls[j], d = b.pos.clone().sub(bB.pos), dist = d.length();
                if (dist < ballRadius * 2) {
                    const norm = d.normalize(), vRel = b.vel.clone().sub(bB.vel);
                    if (vRel.dot(norm) < 0) {
                        const impulse = norm.multiplyScalar(-(1 + ballB) * vRel.dot(norm) / 2);
                        b.vel.add(impulse); bB.vel.sub(impulse);
                    }
                }
            }
            b.mesh.position.set(b.pos.x, ballRadius, b.pos.y);
            b.mesh.rotation.x += b.vel.y * 2; b.mesh.rotation.z -= b.vel.x * 2;
        });
        accTime = 0;
    }
    renderer.render(scene, camera);
}
animate();