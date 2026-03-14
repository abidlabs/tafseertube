(function () {
  var input = document.getElementById("searchInput");
  var resultsEl = document.getElementById("searchResults");
  if (!input || !resultsEl || typeof SEARCH_DATA === "undefined") return;

  var data = SEARCH_DATA;
  var activeIndex = -1;

  function filter(query) {
    var q = query.toLowerCase().trim();
    if (!q) return [];
    return data.filter(function (s) {
      return (
        s.name.toLowerCase().indexOf(q) !== -1 ||
        s.id.toString() === q ||
        s.id.toString().indexOf(q) === 0
      );
    });
  }

  function render(results) {
    if (results.length === 0) {
      resultsEl.style.display = "none";
      return;
    }
    resultsEl.style.display = "";
    resultsEl.innerHTML = results
      .map(function (s, i) {
        return (
          '<a class="result-row' +
          (i === activeIndex ? " active" : "") +
          '" href="/surah/' +
          s.id +
          '/">' +
          '<div class="result-icon">' +
          s.id +
          "</div>" +
          '<div class="result-copy">' +
          '<p class="result-name">' +
          s.name +
          "</p>" +
          '<p class="result-meta">' +
          s.count +
          " ayah" +
          (s.count !== 1 ? "s" : "") +
          " with tafseer</p>" +
          "</div>" +
          '<span class="result-badge">Surah ' +
          s.id +
          "</span>" +
          "</a>"
        );
      })
      .join("");
  }

  var currentResults = [];

  input.addEventListener("input", function () {
    activeIndex = -1;
    currentResults = filter(input.value);
    render(currentResults);
  });

  input.addEventListener("focus", function () {
    if (currentResults.length > 0) {
      resultsEl.style.display = "";
    }
  });

  input.addEventListener("blur", function () {
    setTimeout(function () {
      resultsEl.style.display = "none";
    }, 200);
  });

  input.addEventListener("keydown", function (e) {
    if (currentResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
      render(currentResults);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      render(currentResults);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      window.location.href = "/surah/" + currentResults[activeIndex].id + "/";
    } else if (e.key === "Escape") {
      resultsEl.style.display = "none";
      activeIndex = -1;
    }
  });
})();
