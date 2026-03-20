import * as THREE from 'three';

// escena
const scene = new THREE.Scene();

// camara
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 32); 
camera.lookAt(0, 0, 0);

// render
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// luces
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 0, 50);
scene.add(directionalLight);

// materiales
const materialGreen = new THREE.MeshBasicMaterial({color: 0x00ff00});

const verticalWallGeo = new THREE.BoxGeometry(1, 21, 1);
const horizontalWallGeo = new THREE.BoxGeometry(33, 1, 1);

// paredes
const cube1 = new THREE.Mesh(verticalWallGeo, materialGreen);
scene.add(cube1);
cube1.position.x = -16;

const cube2 = new THREE.Mesh(verticalWallGeo, materialGreen);
cube2.position.x = 16;
scene.add(cube2);

const cube3 = new THREE.Mesh(horizontalWallGeo, materialGreen);
cube3.position.set(0, 10, 0);
scene.add(cube3);

const cube4 = new THREE.Mesh(horizontalWallGeo, materialGreen);
cube4.position.set(0, -10, 0);
scene.add(cube4);

// paletas
const paddleGeo = new THREE.BoxGeometry(1, 4, 1);

const paddle1 = new THREE.Mesh(paddleGeo, materialGreen);
paddle1.position.set(-14, 0, 0);
scene.add(paddle1);

const paddle2 = new THREE.Mesh(paddleGeo, materialGreen);
paddle2.position.set(14, 0, 0);
scene.add(paddle2);

// pelota
const geometry3 = new THREE.SphereGeometry(0.5, 30, 16);
const sphere = new THREE.Mesh(geometry3, materialGreen);
scene.add(sphere);

// variables
let v = [0, 0]; 
let p1 = 0, p2 = 0;

// estamina
let stamina1 = 100, stamina2 = 100;
const maxStamina = 100;
const staminaDrain = 40; 
const staminaRegen = 15; 
const normalSpeed = 0.3;
const sprintSpeed = 0.6;

// controles
const keys = { w: false, s: false, ShiftLeft: false, ArrowUp: false, ArrowDown: false, ShiftRight: false };

// ui
const bar1El = document.getElementById('stamina-bar-1');
const bar2El = document.getElementById('stamina-bar-2');

window.addEventListener('keydown', (e) => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    else if (keys.hasOwnProperty(e.key)) keys[e.key] = true; 
});
window.addEventListener('keyup', (e) => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
    else if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// reset
function resetBall() {
    sphere.position.set(0, 0, 0);
    let speedX = 0.12;
    let speedY = 0.12 + (Math.random() * 0.05); 
    v = [(Math.random() > 0.5 ? speedX : -speedX), (Math.random() > 0.5 ? speedY : -speedY)];
}

resetBall();

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const timeScale = delta * 60;

    // estamina jugador 1
    let speedP1 = normalSpeed;
    if (keys.ShiftLeft && stamina1 > 0 && (keys.w || keys.s)) {
        speedP1 = sprintSpeed;
        stamina1 -= staminaDrain * delta;
    } else if (stamina1 < maxStamina) {
        stamina1 += staminaRegen * delta;
    }
    stamina1 = Math.max(0, Math.min(maxStamina, stamina1)); 
    if(bar1El) bar1El.style.height = `${stamina1}%`; 

    // estamina jugador 2
    let speedP2 = normalSpeed;
    if (keys.ShiftRight && stamina2 > 0 && (keys.ArrowUp || keys.ArrowDown)) {
        speedP2 = sprintSpeed;
        stamina2 -= staminaDrain * delta;
    } else if (stamina2 < maxStamina) {
        stamina2 += staminaRegen * delta;
    }
    stamina2 = Math.max(0, Math.min(maxStamina, stamina2)); 
    if(bar2El) bar2El.style.height = `${stamina2}%`; 

    // movimiento
    if (keys.w) paddle1.position.y += speedP1 * timeScale;
    if (keys.s) paddle1.position.y -= speedP1 * timeScale;
    paddle1.position.y = Math.max(-7.5, Math.min(7.5, paddle1.position.y));

    if (keys.ArrowUp) paddle2.position.y += speedP2 * timeScale;
    if (keys.ArrowDown) paddle2.position.y -= speedP2 * timeScale;
    paddle2.position.y = Math.max(-7.5, Math.min(7.5, paddle2.position.y));

    sphere.position.x += v[0] * timeScale;
    sphere.position.y += v[1] * timeScale;

    // colision techo
    if(sphere.position.y >= 9 || sphere.position.y <= -9){
        v[1] = -v[1];
        v[0] *= 0.95;
        v[1] *= 0.95;
        sphere.position.y = sphere.position.y >= 9 ? 9 : -9;
    }

    // colision jugador 1
    if (v[0] < 0 && 
        sphere.position.x <= -13.5 && sphere.position.x >= -15.0 && 
        sphere.position.y <= paddle1.position.y + 2.5 && sphere.position.y >= paddle1.position.y - 2.5) {
        
        v[0] = Math.abs(v[0]) * 1.4;
        v[1] *= 1.4;
        
        if (v[0] > 1.8) v[0] = 1.8;
        if (Math.abs(v[1]) > 1.8) v[1] = Math.sign(v[1]) * 1.8;
        
        sphere.position.x = -13.5; 
    }
    
    // colision jugador 2
    if (v[0] > 0 && 
        sphere.position.x >= 13.5 && sphere.position.x <= 15.0 && 
        sphere.position.y <= paddle2.position.y + 2.5 && sphere.position.y >= paddle2.position.y - 2.5) {
        
        v[0] = -Math.abs(v[0]) * 1.4;
        v[1] *= 1.4;
        
        if (v[0] < -1.8) v[0] = -1.8;
        if (Math.abs(v[1]) > 1.8) v[1] = Math.sign(v[1]) * 1.8;
        
        sphere.position.x = 13.5;
    }

    // punto jugador 1
    if(sphere.position.x >= 15.5){
        p1++;
        document.getElementById('score1').innerText = p1;
        resetBall();
    }

    // punto jugador 2
    if(sphere.position.x <= -15.5){
        p2++;
        document.getElementById('score2').innerText = p2;
        resetBall();
    }

    renderer.render(scene, camera);
}

animate();