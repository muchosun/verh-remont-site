const galleries = [...document.querySelectorAll("[data-gallery]")];

galleries.forEach((gallery, galleryIndex) => {
  const images = [...gallery.querySelectorAll("img")];
  const button = gallery.querySelector("button");
  let activeIndex = 0;

  const showImage = (nextIndex) => {
    images[activeIndex].classList.remove("is-active");
    activeIndex = nextIndex % images.length;
    images[activeIndex].classList.add("is-active");
  };

  button?.addEventListener("click", () => showImage(activeIndex + 1));

  window.setInterval(() => {
    if (document.hidden) return;
    showImage(activeIndex + 1);
  }, 3600 + galleryIndex * 500);
});

document.querySelectorAll(".quiz-option").forEach((option) => {
  option.addEventListener("click", () => {
    const group = option.closest(".quiz-sheet");
    group?.querySelectorAll(".quiz-option").forEach((item) => item.classList.remove("is-selected"));
    option.classList.add("is-selected");
  });
});
