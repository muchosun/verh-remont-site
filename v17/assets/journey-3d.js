import * as THREE from "./three.module.min.js";

const stage = document.querySelector("[data-journey-3d]");

if (stage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const imageSources = [...stage.querySelectorAll("[data-journey-image]")]
    .map((image) => image.currentSrc || image.src)
    .filter(Boolean);
  const steps = [...document.querySelectorAll("[data-journey-step]")];
  const status = stage.querySelector("[data-journey-status]");

  if (imageSources.length && steps.length) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    stage.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 6.8);

    const cards = [];
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let activeIndex = 0;

    const loadTexture = (source) => new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        source,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        reject,
      );
    });

    const updateActiveStep = (index) => {
      activeIndex = Math.max(0, Math.min(cards.length - 1, index));
      steps.forEach((step, stepIndex) => {
        step.classList.toggle("is-active", stepIndex === activeIndex);
      });
      if (status) status.textContent = String(activeIndex + 1).padStart(2, "0");
    };

    const updateFromScroll = () => {
      const viewportMiddle = window.innerHeight * 0.54;
      const closest = steps.reduce((best, step, index) => {
        const rect = step.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - viewportMiddle);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Number.POSITIVE_INFINITY });
      updateActiveStep(closest.index);
    };

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width / height > 1 ? 6.7 : 7.45;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      pointer.x += (pointer.targetX - pointer.x) * 0.055;
      pointer.y += (pointer.targetY - pointer.y) * 0.055;

      cards.forEach((card, index) => {
        const distance = index - activeIndex;
        const targetOpacity = Math.max(0, 1 - Math.abs(distance) * 0.58);
        const targetScale = distance === 0 ? 1 : 0.8;
        const targetX = distance * 2.35 + pointer.x * 0.14;
        const targetY = distance * -0.16 + pointer.y * 0.08;
        const targetZ = -Math.abs(distance) * 0.82;
        const targetRotation = distance * -0.3 + pointer.x * 0.08;

        card.group.position.x += (targetX - card.group.position.x) * 0.075;
        card.group.position.y += (targetY - card.group.position.y) * 0.075;
        card.group.position.z += (targetZ - card.group.position.z) * 0.075;
        card.group.rotation.y += (targetRotation - card.group.rotation.y) * 0.075;
        card.group.rotation.x += (-0.08 + pointer.y * 0.05 - card.group.rotation.x) * 0.075;
        card.group.scale.x += (targetScale - card.group.scale.x) * 0.075;
        card.group.scale.y += (targetScale - card.group.scale.y) * 0.075;
        card.material.opacity += (targetOpacity - card.material.opacity) * 0.09;
        card.frameMaterial.opacity += (targetOpacity * 0.7 - card.frameMaterial.opacity) * 0.09;
      });

      renderer.render(scene, camera);
      window.requestAnimationFrame(animate);
    };

    Promise.all(imageSources.map(loadTexture))
      .then((textures) => {
        textures.forEach((texture) => {
          const group = new THREE.Group();
          const geometry = new THREE.PlaneGeometry(3.65, 3.65);
          const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 });
          const image = new THREE.Mesh(geometry, material);
          const frameGeometry = new THREE.EdgesGeometry(geometry);
          const frameMaterial = new THREE.LineBasicMaterial({
            color: 0xd6a34f,
            transparent: true,
            opacity: 0,
          });
          const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
          frame.position.z = 0.01;
          group.add(image, frame);
          scene.add(group);
          cards.push({ group, material, frameMaterial });
        });

        resize();
        updateFromScroll();
        stage.classList.add("is-3d");
        animate();
      })
      .catch(() => {
        renderer.domElement.remove();
      });

    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 1.2;
      pointer.targetY = -((event.clientY - rect.top) / rect.height - 0.5) * 1.2;
    });

    stage.addEventListener("pointerleave", () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    });

    window.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", resize);
  }
}
