(() => {
  "use strict";
  const image = document.querySelector("[data-story-image]");
  const caption = document.querySelector("[data-story-caption]");
  const steps = [...document.querySelectorAll("[data-story-step]")];
  if (!image || !steps.length) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let pending = false;
  const update = () => {
    pending = false;
    const center = innerHeight * .65;
    const active = steps.reduce((best, step) => {
      const rect = step.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - center);
      return !best || distance < best.distance ? { step, distance } : best;
    }, null).step;
    const next = `/design/assets/design/project-example/page-${active.dataset.sheet}.webp`;
    if (image.getAttribute("src") !== next) {
      image.src = next;
      image.alt = active.querySelector("h3").textContent;
      caption.textContent = active.dataset.caption;
      if (!reduced.matches) image.animate([{ opacity: .55, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 340, easing: "ease-out" });
    }
  };
  const onScroll = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();
