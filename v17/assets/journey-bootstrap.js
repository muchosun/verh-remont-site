const stage = document.querySelector("[data-journey-3d]");

if (stage) {
  const loadJourney = () => import("./journey-3d.js");

  if (!("IntersectionObserver" in window)) {
    loadJourney();
  } else {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadJourney();
    }, { rootMargin: "600px 0px" });
    observer.observe(stage);
  }
}
