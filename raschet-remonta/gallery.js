import PhotoSwipeLightbox from "../assets/vendor/photoswipe/photoswipe-lightbox.esm.min.js";

const gallery = document.querySelector("[data-intro-track]");

if (gallery) {
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children: ".intro-carousel__slide",
    pswpModule: () => import("../assets/vendor/photoswipe/photoswipe.esm.min.js"),
    bgOpacity: 0.97,
    showHideAnimationType: "zoom",
    wheelToZoom: true,
    closeTitle: "Закрыть галерею",
    zoomTitle: "Увеличить фотографию",
    arrowPrevTitle: "Предыдущая фотография",
    arrowNextTitle: "Следующая фотография",
    errorMsg: "Не удалось загрузить фотографию",
  });

  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "custom-caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      html: "",
      onInit: (element, pswp) => {
        const updateCaption = () => {
          const slideElement = pswp.currSlide?.data?.element;
          element.textContent = slideElement?.dataset.caption || "Выполненный ремонт ВЕРХ";
        };

        pswp.on("change", updateCaption);
        updateCaption();
      },
    });
  });

  lightbox.on("afterInit", () => {
    const slideElement = lightbox.pswp?.currSlide?.data?.element;
    if (typeof window.ym === "function") {
      window.ym(110859289, "reachGoal", "calculator_gallery_open", {
        image: Number(slideElement?.dataset.galleryIndex || 0) + 1,
        caption: slideElement?.dataset.caption || "",
      });
    }
  });

  lightbox.init();
}
