import * as THREE from 'three';

const scene = new THREE.Scene();

// Camara
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 25); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 0, 50);
scene.add(directionalLight);

//paredes
const geometry4 = new THREE.BoxGeometry(1, 19, 1);
const material4 = new THREE.MeshBasicMaterial({color: 0x00ff00});

const cube3 = new THREE.Mesh(geometry4, material4);
scene.add(cube3);
cube3.position.x = -10;

const paredDerecha = new THREE.Mesh(geometry4, material4);
paredDerecha.position.x = 10;
scene.add(paredDerecha);

const paredSuperior = new THREE.Mesh(geometry4, material4);
paredSuperior.rotation.z = Math.PI / 2; 
paredSuperior.position.set(0, 10, 0);
scene.add(paredSuperior);

const paredInferior = new THREE.Mesh(geometry4, material4);
paredInferior.rotation.z = Math.PI / 2; 
paredInferior.position.set(0, -10, 0);
scene.add(paredInferior);

//pelota
const geometry3 = new THREE.SphereGeometry(1,30,16);
const material3 = new THREE.MeshBasicMaterial({color: 0x00ff00});
const sphere3 = new THREE.Mesh(geometry3, material3);
scene.add(sphere3);
sphere3.position.set(0, 5, 0); 

//animacion de la pelota
let v = [0.1, 0, 0]; 
let a = [0, -0.01, 0]; 

function animate() {
    requestAnimationFrame(animate);

    v[1] += a[1];
    sphere3.position.y += v[1];
    sphere3.position.x += v[0];

    // Rebote Suelo
    if(sphere3.position.y <= -8.5){
        v[1] = -v[1];
        sphere3.position.y = -8.5; 
    }

    // Rebote Paredes
    if(sphere3.position.x >= 8.5){
        v[0] = -v[0];
        sphere3.position.x = 8.5;
    }

    if(sphere3.position.x <= -8.5){
        v[0] = -v[0];
        sphere3.position.x = -8.5;
    }

    renderer.render(scene, camera);
}

animate();