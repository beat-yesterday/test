import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * Cursor
 */

const cursor = {
  x: 0,
  y: 0,
};

window.addEventListener("mousemove", (evt) => {
  cursor.x = evt.clientX / sizes.width - 0.5;
  cursor.y = -(evt.clientY / sizes.height - 0.5);
});

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Sizes
const sizes = {
  width: 1920,
  height: 1080,
};

// Scene
const scene = new THREE.Scene();

// // Object
// const mesh = new THREE.Mesh(
//   new THREE.BoxGeometry(1, 1, 1, 5, 5, 5),
//   new THREE.MeshBasicMaterial({ color: 0xff0000 })
// );
// scene.add(mesh);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  1,
  1000
);
// const aspectRatio = sizes.width / sizes.height;
// const camera = new THREE.OrthographicCamera(
//   -1 * aspectRatio,
//   1 * aspectRatio,
//   1,
//   -1,
//   0.1,
//   100
// );

// camera.position.x = 2;
// camera.position.y = 2;
camera.position.z = 25;
camera.lookAt(new THREE.Vector3(1, 1, 1));
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);

const devices = [
  [new THREE.Vector3(-3, 4, 2), new THREE.Vector3(9, -5, -3)],
  [new THREE.Vector3(3, 8, -4), new THREE.Vector3(-4, -4, 3)],
  [new THREE.Vector3(-5, 4, 12), new THREE.Vector3(6, 2, -6)],
  [new THREE.Vector3(-3, -6, 5), new THREE.Vector3(2, 5, -4)],
];

const lineGroup = new THREE.Group();
devices.forEach(([posA, posB]) => {
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([posA, posB]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  lineGroup.add(line);
});
scene.add(lineGroup);

// // 定义点 A 和点 B 的坐标
// const pointA = new THREE.Vector3(-3, 4, 2);
// const pointB = new THREE.Vector3(6, -5, -3);

// // 绘制线段
// const lineGeometry = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
// const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
// const line = new THREE.Line(lineGeometry, lineMaterial);
// scene.add(line);

// 创建 3 个小圆点

const dotGroup = new THREE.Group();
const dotSet = [];
devices.forEach((pos, index)=> {
  const dotGeometry = new THREE.SphereGeometry(0.1, 32, 32);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const dots = [
    new THREE.Mesh(dotGeometry, dotMaterial),
    new THREE.Mesh(dotGeometry, dotMaterial),
    new THREE.Mesh(dotGeometry, dotMaterial),
    new THREE.Mesh(dotGeometry, dotMaterial),
  ];
  const subDotGroup = new THREE.Group();
  dots.forEach((dot, idx) => {
    dot.position.copy(devices[index][0]); // 初始位置为点 A
    dot.visible = false;
    subDotGroup.add(dot);
  });
  dotSet[index] = [...dots];
  dotGroup.add(subDotGroup)
})
scene.add(dotGroup);
// dots.forEach((dot, index) => {
//   dot.position.copy(pointA); // 初始位置为点 A
//   dot.visible = false;
//   scene.add(dot);
// });

// 动画参数
const speed = 0.001; // 控制移动速度
let progress = [-0.75, -0.5, -0.25, 0]; // 每个圆点的进度

const updatePoints = () => {
  // 更新每个圆点的位置
  dotSet.forEach((dots, idx) => {
    dots.forEach((dot, index) => {
      progress[index] += speed; // 增加进度
      if (progress[index] > 1) progress[index] = 0; // 重置进度
      // 根据进度计算当前位置
      if (progress[index] >= 0) {
        dot.visible = true;
        const position = devices[idx][0].clone().lerp(devices[idx][1], progress[index]);
        dot.position.copy(position);
      }
    });
  })
};
// Animate
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update objects
  //   mesh.rotation.y = elapsedTime;

  // Update camera
  //   camera.position.x = Math.sin(cursor.x * Math.PI * 2) * 3;
  //   camera.position.z = Math.cos(cursor.x * Math.PI * 2) * 3;
  //   console.log(camera.position.z)
  //   camera.position.y = cursor.y * 5;
  //   camera.lookAt(mesh.position);

  // Update controls
  controls.update();

  updatePoints();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
