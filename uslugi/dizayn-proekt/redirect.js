(() => {
  "use strict";
  const destination = new URL("/design/", location.origin);
  destination.search = location.search;
  if (!destination.searchParams.get("city") && !destination.searchParams.get("utm_city")) {
    destination.searchParams.set("city", "krasnodar");
  }
  destination.hash = location.hash;
  location.replace(destination.href);
})();
