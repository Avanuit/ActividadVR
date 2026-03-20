import * as THREE from 'three';

// escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); 
const renderWidth = 640, renderHeight = 360;
const aspect = renderWidth / renderHeight;

// camara
const cameraSize = 15;
const camera = new THREE.OrthographicCamera(-cameraSize * aspect, cameraSize * aspect, cameraSize, -cameraSize, 0.1, 1000);
camera.position.set(0, 25, 0); 
camera.lookAt(0, 0, 0);

// render
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); 
renderer.setSize(renderWidth, renderHeight, false); 
document.body.appendChild(renderer.domElement);

// luces
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); 
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight.position.set(5, 15, 5);
scene.add(directionalLight);

// aceleracion de tiempo
let timeScale = 1;
window.addEventListener('keydown', (e) => { if(e.code === 'Space') timeScale = 4; });
window.addEventListener('keyup', (e) => { if(e.code === 'Space') timeScale = 1; });

// variables de estado
let cueMode = 'NONE'; 
let power = 0;
let targetRot = 0;
let equipT = 0;
let lockStartPos = new THREE.Vector3();
let lockStartRot = 0;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let intersectPoint = new THREE.Vector3();
let activeCueIdx = -1;
const holeAnims = [];
const returnBalls = [];

// fisicas
const wallB = 0.7;
const ballB = 0.95; 
const clock = new THREE.Clock();
const targetFPS = 30; 
let accTime = 0;

// creador de texturas
function createPixelTexture(size, color, isStripe = false, isCue = false, number = 0) {
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
        
        if (number > 0) {
            context.fillStyle = '#ffffff';
            context.beginPath();
            context.arc(size/2, size/2, size/3.5, 0, Math.PI * 2);
            context.fill();
            
            context.fillStyle = '#000000';
            context.font = 'bold ' + Math.floor(size/2.5) + 'px sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(number.toString(), size/2, size/2 + (size*0.05));
        } else {
            context.fillStyle = '#ffffff';
            context.beginPath();
            context.arc(size/2, size/2, size/3, 0, Math.PI * 2);
            context.fill();
            
            context.fillStyle = '#000000';
            context.fillRect(size/2 - 1, size/2 - 1, 2, 2);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; 
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

// materiales
const feltMat = new THREE.MeshLambertMaterial({ color: 0x006622 }); 
const woodMat = new THREE.MeshLambertMaterial({ color: 0x442200 }); 
const cushionMat = new THREE.MeshLambertMaterial({ color: 0x004411 }); 
const metalMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 }); 
const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

// dimensiones de mesa
const baseWidth = 20, baseHeight = 10;
const tableWidth = baseWidth * 1.25, tableHeight = baseHeight * 1.25;
const ballRadius = 0.35;
const holeRadius = 0.7;

// construccion de la mesa
const felt = new THREE.Mesh(new THREE.BoxGeometry(tableWidth, 0.5, tableHeight), feltMat);
felt.position.y = -0.25;
scene.add(felt);

// paredes de la mesa
const cushionSize = 0.6, frameSize = 1.2;
const cushionHalfGeo = new THREE.BoxGeometry(tableWidth / 2 - 0.8, 0.8, cushionSize);
const cushionShortGeo = new THREE.BoxGeometry(cushionSize, 0.8, tableHeight);

[
    [-tableWidth/4 - 0.4, 0.15, -tableHeight/2 - cushionSize/2],
    [tableWidth/4 + 0.4, 0.15, -tableHeight/2 - cushionSize/2],
    [-tableWidth/4 - 0.4, 0.15, tableHeight/2 + cushionSize/2],
    [tableWidth/4 + 0.4, 0.15, tableHeight/2 + cushionSize/2],
    [-tableWidth/2 - cushionSize/2, 0.15, 0],
    [tableWidth/2 + cushionSize/2, 0.15, 0]
].forEach((p) => {
    const m = new THREE.Mesh(p[0] === -tableWidth/2 - cushionSize/2 || p[0] === tableWidth/2 + cushionSize/2 ? cushionShortGeo : cushionHalfGeo, cushionMat);
    m.position.set(...p);
    scene.add(m);
});

// marco de la mesa
const fLong = new THREE.BoxGeometry(tableWidth + cushionSize*2 + frameSize*2, 1.2, frameSize);
const fShort = new THREE.BoxGeometry(frameSize, 1.2, tableHeight + cushionSize*2);
[
    [0, 0.1, -tableHeight/2 - cushionSize - frameSize/2],
    [0, 0.1, tableHeight/2 + cushionSize + frameSize/2],
    [-tableWidth/2 - cushionSize - frameSize/2, 0.1, 0],
    [tableWidth/2 + cushionSize + frameSize/2, 0.1, 0]
].forEach((p, i) => {
    const m = new THREE.Mesh(i < 2 ? fLong : fShort, woodMat);
    m.position.set(...p);
    scene.add(m);
});

// agujeros
const holePositions = [
    [-tableWidth/2, 0.1, -tableHeight/2], [0, 0.1, -tableHeight/2 - cushionSize/2], [tableWidth/2, 0.1, -tableHeight/2],
    [-tableWidth/2, 0.1, tableHeight/2], [0, 0.1, tableHeight/2 + cushionSize/2], [tableWidth/2, 0.1, tableHeight/2]
];
holePositions.forEach(p => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(holeRadius, holeRadius, 0.9, 8), holeMat);
    h.position.set(p[0], p[1], p[2]);
    scene.add(h);
});

// configuracion de bolas
const ballColors = ['#ddcc00', '#0000dd', '#dd0000', '#440088', '#ff6600', '#00aa00', '#882200', '#111111'];
const ballTextures = [];
const ballTexturesLegible = [];
for (let i = 1; i <= 15; i++) {
    ballTextures[i] = createPixelTexture(32, ballColors[(i-1)%8], i > 8, false, 0);
    ballTexturesLegible[i] = createPixelTexture(256, ballColors[(i-1)%8], i > 8, false, i);
}
const cueBallTex = createPixelTexture(32, '#ffffff', false, true, 0);
const ballGeo = new THREE.IcosahedronGeometry(ballRadius, 1); 
const balls = [];
const triangleOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]; 

// creacion de bolas en escena
function createBall(x, z, tex, isWhite = false, index = 0) {
    const m = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(x, ballRadius, z);
    m.rotation.set(Math.random()*Math.PI, 0, Math.random()*Math.PI);
    scene.add(m);
    balls.push({ mesh: m, pos: new THREE.Vector2(x, z), vel: new THREE.Vector2(0, 0), potted: false, isWhite, texIndex: index });
}

// reinicio de mesa
function setupBalls() {
    balls.forEach(b => scene.remove(b.mesh));
    balls.length = 0;
    createBall(-6, 0, cueBallTex, true, 0);
    const sX = 5, spX = ballRadius * 1.75, spZ = ballRadius * 2.05;
    let idx = 0;
    for (let c = 0; c < 5; c++) {
        for (let r = 0; r <= c; r++) {
            const ballNum = triangleOrder[idx++];
            createBall(sX + c * spX, -(c * spZ) / 2 + r * spZ, ballTextures[ballNum], false, ballNum);
        }
    }
}
setupBalls();

// generador de taco
function buildCueModel(buttColor) {
    const group = new THREE.Group();
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), new THREE.MeshLambertMaterial({color: 0xffffff}));
    tip.position.y = -4.9; 
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 4.8, 8), new THREE.MeshLambertMaterial({color: 0xddaa88}));
    shaft.position.y = -2.4;
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 5, 8), new THREE.MeshLambertMaterial({color: buttColor}));
    butt.position.y = 2.5;
    group.add(tip, shaft, butt);
    return group;
}

// gestor taco activo
const cuePivot = new THREE.Group();
let activeCueModel = buildCueModel(0x000000);
activeCueModel.rotation.x = Math.PI / 2;
activeCueModel.position.z = 5.5; 
cuePivot.add(activeCueModel);

// barra de carga
const powerUI = new THREE.Group();
const barBack = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.5), new THREE.MeshBasicMaterial({color: 0x000000}));
const barFront = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.4), new THREE.MeshBasicMaterial({color: 0x00ff00}));
barFront.position.z = 0.02;
powerUI.add(barBack, barFront);
powerUI.position.set(0, 2, 6);
powerUI.rotation.x = -Math.PI / 2;
cuePivot.add(powerUI);
powerUI.visible = false;
scene.add(cuePivot);
cuePivot.visible = false;

// guias visuales
const guideGeo = new THREE.BufferGeometry();
const guideMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.8, depthTest: false });
const guideLine = new THREE.Line(guideGeo, guideMat);
guideLine.renderOrder = 999;
scene.add(guideLine);
guideLine.visible = false;

const guideTargetGeo = new THREE.BufferGeometry();
const guideTargetMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 1.0, depthTest: false });
const guideTargetLine = new THREE.Line(guideTargetGeo, guideTargetMat);
guideTargetLine.renderOrder = 1000;
scene.add(guideTargetLine);
guideTargetLine.visible = false;

// rack lateral de tacos
const rackGroup = new THREE.Group();
rackGroup.position.set(-18, 0, 0);
scene.add(rackGroup);

const rBack = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 13), woodMat);
rBack.position.y = 0;
rackGroup.add(rBack);
const rFelt = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.25, 12), feltMat);
rFelt.position.y = 0.05;
rackGroup.add(rFelt);
const rTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 1), woodMat);
rTop.position.set(0, 0.2, -6);
rackGroup.add(rTop);
const rBot = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 1), woodMat);
rBot.position.set(0, 0.2, 6);
rackGroup.add(rBot);

const rackTacos = [];
const rackHitboxes = [];
const cueColors = [0x111111, 0x880000, 0x000088];

for(let i=0; i<3; i++) {
    const t = buildCueModel(cueColors[i]);
    t.rotation.x = Math.PI / 2; 
    t.position.set(-1.2 + (i * 1.2), 0.5, 0); 
    t.userData = { index: i, color: cueColors[i] };
    rackGroup.add(t); 
    rackTacos.push(t);
    
    const hb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 12), new THREE.MeshBasicMaterial({visible: false}));
    hb.position.copy(t.position);
    hb.userData = t.userData;
    rackGroup.add(hb); 
    rackHitboxes.push(hb);
}

// rack inferior de bolas caidas
const returnGroup = new THREE.Group();
returnGroup.position.set(0, -2.5, 12.5); 
scene.add(returnGroup);

const rrBack = new THREE.Mesh(new THREE.BoxGeometry(22, 2.8, 0.2), metalMat);
rrBack.position.set(0, 1.2, -0.5);
returnGroup.add(rrBack);

const rrBot = new THREE.Mesh(new THREE.BoxGeometry(22, 0.2, 2), metalMat);
rrBot.position.set(0, -0.1, 0);
returnGroup.add(rrBot);

const rrGlass = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 0.1), new THREE.MeshBasicMaterial({color: 0x88ccff, transparent: true, opacity: 0.1}));
rrGlass.position.set(0, 0.8, 0.9);
returnGroup.add(rrGlass);

// tubo de caida visible conectado al rack
const rrTube = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 2.5), metalMat);
rrTube.position.set(11.5, 0.4, 0);
returnGroup.add(rrTube);

// boton reset
const resetBtn = document.getElementById('retro-reset-button');
if(resetBtn) {
    resetBtn.style.bottom = 'auto';
    resetBtn.style.top = '10px';
    resetBtn.style.left = '50%';
    resetBtn.style.transform = 'translateX(-50%)';
    resetBtn.addEventListener('click', () => location.reload());
}

// listeners de raton
window.addEventListener('mousedown', (e) => {
    const moving = balls.some(b => b.vel.length() > 0.01 && !b.potted);
    if (moving) return;
    
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, intersectPoint);

    const whiteBall = balls.find(b=>b.isWhite);
    if (!whiteBall) return;
    
    const hits = raycaster.intersectObjects(rackHitboxes);
    if (hits.length > 0 && (!whiteBall.potted) && cueMode === 'NONE') {
        const data = hits[0].object.userData;
        if (activeCueIdx !== -1) rackTacos[activeCueIdx].visible = true;
        
        cuePivot.children.forEach(c => { if(c.type === 'Group' && c !== powerUI) cuePivot.remove(c); });
        activeCueModel = buildCueModel(data.color);
        activeCueModel.rotation.x = Math.PI / 2;
        activeCueModel.position.z = 5.5; 
        cuePivot.add(activeCueModel);

        activeCueIdx = data.index;
        rackTacos[data.index].visible = false;

        cuePivot.position.set(-18, 5, 0); 
        cueMode = 'FOLLOW';
        cuePivot.visible = true; 
        powerUI.visible = false;
        return;
    }

    if (cueMode === 'AIMING') {
        cueMode = 'CHARGING';
        powerUI.visible = true;
    } else if (cueMode === 'CHARGING') {
        if (power > 0.2) { 
            cueMode = 'HITTING'; 
        } else { 
            activeCueModel.position.z = 5.5; 
            cueMode = 'AIMING';
        }
        powerUI.visible = false;
        guideLine.visible = false;
        guideTargetLine.visible = false;
    }
});

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    const whiteBall = balls.find(b => b.isWhite);
    if (!whiteBall || whiteBall.potted) return;
    const distToWhite = intersectPoint.distanceTo(new THREE.Vector3(whiteBall.pos.x, 0, whiteBall.pos.y));

    if (cueMode === 'FOLLOW') {
        if (distToWhite < 4.0) {
            cueMode = 'LOCKING';
            equipT = 0;
            lockStartPos.copy(cuePivot.position);
            lockStartRot = cuePivot.rotation.y;
        }
    } else if (cueMode === 'AIMING') {
        targetRot = Math.atan2(intersectPoint.x - whiteBall.pos.x, intersectPoint.z - whiteBall.pos.y) + Math.PI;
        if (distToWhite > 12.0) cueMode = 'FOLLOW';
    } else if (cueMode === 'CHARGING') {
        power = Math.min(Math.max(distToWhite - 2, 0), 5);
        activeCueModel.position.z = 5.5 + power;
        barFront.scale.x = Math.max(0.001, power / 5);
        barFront.position.x = -1.5 + (power / 5) * 1.5;
    }
});

// manejador de linea guia predictiva
function updateGuide(moving) {
    const whiteBall = balls.find(b => b.isWhite);
    if (moving || (cueMode !== 'AIMING' && cueMode !== 'CHARGING') || !whiteBall || whiteBall.potted) {
        guideLine.visible = false;
        guideTargetLine.visible = false;
        return;
    }
    guideLine.visible = true;

    const start = whiteBall.pos.clone();
    const dir = new THREE.Vector2(-Math.sin(targetRot), -Math.cos(targetRot)).normalize();
    
    let closestT = Infinity, normal = null, hitType = 'none', targetBall = null;
    const leftW = -tableWidth/2 + ballRadius, rightW = tableWidth/2 - ballRadius;
    const topW = -tableHeight/2 + ballRadius, botW = tableHeight/2 - ballRadius;

    if (dir.x !== 0) {
        const tx1 = (leftW - start.x) / dir.x;
        if (tx1 > 0 && tx1 < closestT) { closestT = tx1; normal = new THREE.Vector2(1, 0); hitType = 'wall'; }
        const tx2 = (rightW - start.x) / dir.x;
        if (tx2 > 0 && tx2 < closestT) { closestT = tx2; normal = new THREE.Vector2(-1, 0); hitType = 'wall'; }
    }
    if (dir.y !== 0) {
        const ty1 = (topW - start.y) / dir.y;
        if (ty1 > 0 && ty1 < closestT) { closestT = ty1; normal = new THREE.Vector2(0, 1); hitType = 'wall'; }
        const ty2 = (botW - start.y) / dir.y;
        if (ty2 > 0 && ty2 < closestT) { closestT = ty2; normal = new THREE.Vector2(0, -1); hitType = 'wall'; }
    }

    for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (b.isWhite || b.potted) continue;
        const delta = start.clone().sub(b.pos);
        const a = dir.dot(dir), b_coef = 2 * dir.dot(delta), c = delta.dot(delta) - (ballRadius * 2) * (ballRadius * 2);
        const discriminant = b_coef * b_coef - 4 * a * c;
        if (discriminant >= 0) {
            const t1 = (-b_coef - Math.sqrt(discriminant)) / (2 * a);
            if (t1 > 0 && t1 < closestT) {
                closestT = t1;
                const hitPt = start.clone().add(dir.clone().multiplyScalar(t1));
                normal = hitPt.clone().sub(b.pos).normalize();
                hitType = 'ball';
                targetBall = b;
            }
        }
    }

    const pts = [new THREE.Vector3(start.x, ballRadius, start.y)];
    if (closestT !== Infinity) {
        const hitPt = start.clone().add(dir.clone().multiplyScalar(closestT));
        pts.push(new THREE.Vector3(hitPt.x, ballRadius, hitPt.y));
        let bounceDir;
        if (hitType === 'wall') {
            bounceDir = dir.clone().sub(normal.clone().multiplyScalar(2 * dir.dot(normal))).normalize();
            guideTargetLine.visible = false;
        } else if (hitType === 'ball') {
            bounceDir = dir.clone().sub(normal.clone().multiplyScalar(dir.dot(normal))).normalize();
            guideTargetLine.visible = true;
            const targetDir = normal.clone().negate();
            const targetPts = [
                new THREE.Vector3(targetBall.pos.x, ballRadius, targetBall.pos.y),
                new THREE.Vector3(targetBall.pos.x + targetDir.x * 3, ballRadius, targetBall.pos.y + targetDir.y * 3)
            ];
            guideTargetGeo.setFromPoints(targetPts);
        }

        if (bounceDir) {
            const bounceEnd = hitPt.clone().add(bounceDir.multiplyScalar(4));
            pts.push(new THREE.Vector3(bounceEnd.x, ballRadius, bounceEnd.y));
        }
    } else {
        pts.push(new THREE.Vector3(start.x + dir.x * 10, ballRadius, start.y + dir.y * 10));
        guideTargetLine.visible = false;
    }
    guideGeo.setFromPoints(pts);
}

// disparo de animacion de caida
function startHoleAnim(ball, hp) {
    scene.remove(ball.mesh);
    const m = ball.mesh.clone();
    m.material = m.material.clone();
    m.material.depthTest = false; 
    m.renderOrder = 10; 
    m.position.x = hp[0];
    m.position.z = hp[2];
    scene.add(m);
    holeAnims.push({ ball, mesh: m, t: 0, targetX: hp[0], targetZ: hp[2] });
}

// disparo animacion de riel
function startReturnAnim(ball) {
    const visualMat = new THREE.MeshBasicMaterial({ map: ballTexturesLegible[ball.texIndex] });
    const m = new THREE.Mesh(new THREE.SphereGeometry(ballRadius * 1.5, 32, 16), visualMat);
    m.position.set(11.5, 5, 0); 
    returnGroup.add(m);
    
    returnBalls.forEach(b => b.targetX -= 1.2);
    returnBalls.push({ mesh: m, targetX: 11.5, state: 'FALLING' });
}

// loop de fisica y render
function animate() {
    requestAnimationFrame(animate);
    const timeDelta = clock.getDelta();
    accTime += timeDelta * timeScale;
    
    const physicsSteps = Math.floor(accTime * targetFPS);
    
    if (physicsSteps > 0) {
        accTime -= physicsSteps / targetFPS;
        
        for (let step = 0; step < physicsSteps; step++) {
            const delta = 1 / targetFPS;
            const whiteBall = balls.find(b => b.isWhite);
            const moving = balls.some(b => b.vel.length() > 0.001 && !b.potted);

            if (cueMode !== 'NONE' && whiteBall && !whiteBall.potted) {
                cuePivot.visible = !moving;
                if (!moving) {
                    if (cueMode === 'FOLLOW') {
                        cuePivot.position.lerp(new THREE.Vector3(intersectPoint.x, ballRadius + 1.0, intersectPoint.z), 0.2);
                        const lookAngle = Math.atan2(intersectPoint.x - whiteBall.pos.x, intersectPoint.z - whiteBall.pos.y) + Math.PI;
                        cuePivot.rotation.y = THREE.MathUtils.lerp(cuePivot.rotation.y, lookAngle, 0.1);
                    } else if (cueMode === 'LOCKING') {
                        equipT += 0.1;
                        const targetPos = new THREE.Vector3(whiteBall.pos.x, ballRadius + 0.5, whiteBall.pos.y);
                        const lookAngle = Math.atan2(intersectPoint.x - whiteBall.pos.x, intersectPoint.z - whiteBall.pos.y) + Math.PI;
                        cuePivot.position.lerpVectors(lockStartPos, targetPos, equipT);
                        cuePivot.rotation.y = THREE.MathUtils.lerp(lockStartRot, lookAngle, equipT);
                        if (equipT >= 1) { cueMode = 'AIMING'; targetRot = lookAngle; }
                    } else if (cueMode === 'AIMING' || cueMode === 'CHARGING') {
                        cuePivot.position.set(whiteBall.pos.x, ballRadius + 0.5, whiteBall.pos.y);
                        cuePivot.rotation.y = THREE.MathUtils.lerp(cuePivot.rotation.y, targetRot, 0.3);
                    } else if (cueMode === 'HITTING') {
                        activeCueModel.position.z -= 1.5;
                        if (activeCueModel.position.z <= 5.5) {
                            const dir = new THREE.Vector2(-Math.sin(cuePivot.rotation.y), -Math.cos(cuePivot.rotation.y)).normalize();
                            whiteBall.vel.copy(dir.multiplyScalar(power * 0.5));
                            cueMode = 'AIMING'; power = 0; activeCueModel.position.z = 5.5; 
                        }
                    }
                }
            } else {
                cuePivot.visible = false;
            }

            updateGuide(moving);

            // caida en mesa
            for (let i = holeAnims.length - 1; i >= 0; i--) {
                const anim = holeAnims[i];
                anim.t += delta * 4; 
                
                anim.mesh.position.y = ballRadius - (anim.t * 2.0); 
                anim.mesh.scale.setScalar(Math.max(0.01, 1 - anim.t));
                
                if (anim.t >= 1) {
                    scene.remove(anim.mesh);
                    holeAnims.splice(i, 1);
                    if (anim.ball.isWhite) {
                        anim.ball.pos.set(-6, 0); anim.ball.vel.set(0,0);
                        anim.ball.mesh.position.set(-6, ballRadius, 0);
                        anim.ball.potted = false;
                        scene.add(anim.ball.mesh);
                        cueMode = 'NONE';
                    } else {
                        startReturnAnim(anim.ball);
                    }
                }
            }

            // caida en rack de retorno
            returnBalls.forEach(b => {
                if (b.state === 'FALLING') {
                    b.mesh.position.y -= 0.3; 
                    if (b.mesh.position.y <= 0.6) {
                        b.mesh.position.y = 0.6;
                        b.state = 'ROLLING';
                    }
                } else if (b.state === 'ROLLING') {
                    if (b.mesh.position.x > b.targetX) {
                        b.mesh.position.x -= 0.15;
                        b.mesh.rotation.z += 0.2; 
                        if (b.mesh.position.x <= b.targetX) {
                            b.mesh.position.x = b.targetX;
                            b.state = 'ALIGNING';
                        }
                    } else if (b.mesh.position.x < b.targetX) {
                        b.mesh.position.x = THREE.MathUtils.lerp(b.mesh.position.x, b.targetX, 0.2);
                        b.mesh.rotation.z += 0.1;
                    } else {
                        b.state = 'ALIGNING';
                    }
                }
                
                if (b.state === 'ALIGNING' || (b.state === 'ROLLING' && Math.abs(b.mesh.position.x - b.targetX) < 0.05)) {
                    b.mesh.rotation.x = THREE.MathUtils.lerp(b.mesh.rotation.x, -Math.PI / 2, 0.15);
                    b.mesh.rotation.y = THREE.MathUtils.lerp(b.mesh.rotation.y, 0, 0.15); 
                    b.mesh.rotation.z = THREE.MathUtils.lerp(b.mesh.rotation.z, 0, 0.15);
                }
                
                if (b.state === 'ALIGNING' && b.mesh.position.x > b.targetX) {
                    b.state = 'ROLLING';
                }
            });

            // motor de colisiones
            const subSteps = 20; 
            for (let s = 0; s < subSteps; s++) {
                
                // mover bolas
                balls.forEach(b => {
                    if (b.potted) return;
                    b.pos.x += b.vel.x / subSteps;
                    b.pos.y += b.vel.y / subSteps;
                });

                // detectar agujeros
                balls.forEach(b => {
                    if (b.potted) return;
                    for (let hp of holePositions) {
                        if (Math.sqrt((b.pos.x - hp[0])**2 + (b.pos.y - hp[2])**2) < holeRadius) {
                            b.potted = true; 
                            b.vel.set(0,0);
                            startHoleAnim(b, hp);
                            break;
                        }
                    }
                });

                // detectar bandas
                balls.forEach(b => {
                    if (b.potted) return;
                    if (b.pos.x < -tableWidth/2 + ballRadius) { b.vel.x = Math.abs(b.vel.x)*wallB; b.pos.x = -tableWidth/2 + ballRadius; }
                    if (b.pos.x > tableWidth/2 - ballRadius) { b.vel.x = -Math.abs(b.vel.x)*wallB; b.pos.x = tableWidth/2 - ballRadius; }
                    if (b.pos.y < -tableHeight/2 + ballRadius) { b.vel.y = Math.abs(b.vel.y)*wallB; b.pos.y = -tableHeight/2 + ballRadius; }
                    if (b.pos.y > tableHeight/2 - ballRadius) { b.vel.y = -Math.abs(b.vel.y)*wallB; b.pos.y = tableHeight/2 - ballRadius; }
                });

                // detectar colision entre bolas
                for (let i = 0; i < balls.length; i++) {
                    if (balls[i].potted) continue;
                    for (let j = i + 1; j < balls.length; j++) {
                        if (balls[j].potted) continue;
                        
                        const b = balls[i];
                        const bB = balls[j];
                        const dPos = b.pos.clone().sub(bB.pos);
                        const dist = dPos.length();
                        
                        if (dist < ballRadius * 2 && dist > 0) {
                            const n = dPos.normalize();
                            const overlap = ballRadius * 2 - dist;
                            const separation = n.clone().multiplyScalar(overlap * 0.501); 
                            
                            b.pos.add(separation);
                            bB.pos.sub(separation);
                            
                            const vRel = b.vel.clone().sub(bB.vel);
                            const velAlongNormal = vRel.dot(n);
                            
                            if (velAlongNormal < 0) {
                                const jImpulse = -(1 + ballB) * velAlongNormal / 2;
                                const impulse = n.clone().multiplyScalar(jImpulse);
                                
                                b.vel.add(impulse); 
                                bB.vel.sub(impulse);
                            }
                        }
                    }
                }
            }

            // friccion de movimiento
            balls.forEach(b => {
                if(b.vel.length() > 0.0001 && !b.potted) {
                    const speed = b.vel.length();
                    let newSpeed = speed * 0.993; 
                    newSpeed -= 0.002; 
                    if (newSpeed <= 0) {
                        b.vel.set(0, 0);
                    } else {
                        b.vel.setLength(newSpeed);
                    }
                    
                    b.mesh.position.set(b.pos.x, ballRadius, b.pos.y);
                    b.mesh.rotation.x += b.vel.y * 2; b.mesh.rotation.z -= b.vel.x * 2;
                } else if (!b.potted) {
                    b.vel.set(0,0);
                }
            });
        }
    }
    renderer.render(scene, camera);
}
animate();