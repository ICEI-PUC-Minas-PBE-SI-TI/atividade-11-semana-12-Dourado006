


  
const API_KEY        = "x";
const BASE_URL       = "https://api.themoviedb.org/3";
const IMG_BASE       = "https://image.tmdb.org/t/p/w500";
const IMG_ORIGINAL   = "https://image.tmdb.org/t/p/original";
const LANGUAGE       = "pt-BR";


const FILTER_MAP = {
  popular:     { url: "/movie/popular",     label: "Filmes Populares"           },
  top_rated:   { url: "/movie/top_rated",   label: "Mais Bem Avaliados"         },
  now_playing: { url: "/movie/now_playing", label: "Em Cartaz"                  },
  upcoming:    { url: "/movie/upcoming",    label: "Em Breve"                   },
};


let currentFilter = "popular";


const movieListEl   = document.getElementById("movie-list");
const messageEl     = document.getElementById("message");
const searchInput   = document.getElementById("search");
const searchBtn     = document.getElementById("btnSearch");
const resultsLabel  = document.getElementById("results-label");
const resultsCount  = document.getElementById("results-count");
const filterBtns    = document.querySelectorAll(".filter-btn");
const modalOverlay  = document.getElementById("modal-overlay");
const modalContent  = document.getElementById("modal-content");
const modalClose    = document.getElementById("modal-close");


async function fetchMovies(query = "") {
  let url;

  if (query.trim()) {
    
    url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=${LANGUAGE}&query=${encodeURIComponent(query)}&include_adult=false`;
  } else {

    const endpoint = FILTER_MAP[currentFilter]?.url ?? FILTER_MAP.popular.url;
    url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&language=${LANGUAGE}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results ?? [];
}
function createMovieCard(movie) {
  const year = movie.release_date
    ? movie.release_date.substring(0, 4)
    : "—";

  const rating = movie.vote_average
    ? movie.vote_average.toFixed(1)
    : "N/A";

  const card = document.createElement("article");
  card.className = "movie-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `${movie.title}, ${year}`);

  const index = movieListEl.childElementCount;
  card.style.animationDelay = `${index * 40}ms`;

  const posterHTML = movie.poster_path
    ? `<img src="${IMG_BASE}${movie.poster_path}"
            alt="Poster de ${movie.title}"
            loading="lazy"
            onerror="this.parentElement.innerHTML = getPlaceholderHTML()" />`
    : `<div class="card-poster-placeholder">
         ${getPlaceholderHTML()}
         <span>Sem imagem</span>
       </div>`;

  card.innerHTML = `
    <div class="card-poster">
      ${posterHTML}
      <div class="card-rating">
        <span class="star-icon">★</span>
        <span>${rating}</span>
      </div>
    </div>
    <div class="card-info">
      <h2 class="card-title">${movie.title}</h2>
      <div class="card-meta">
        <span class="card-year">${year}</span>
        <span class="card-genre-dot"></span>
      </div>
    </div>
  `;

  card.addEventListener("click", () => openModal(movie));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(movie);
    }
  });

  return card;
}
function getPlaceholderHTML() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>`;
}
function renderMovies(movies) {  // API com dados imcompletos-_-...
  movieListEl.innerHTML = ""; // Poderia usar uma filtragem para nosso idioma.

  if (!movies || movies.length === 0) {
    showMessage("Nenhum filme encontrado. Tente outra busca.");
    resultsCount.textContent = "";
    return;
  }

  messageEl.textContent = "";
  messageEl.className = "message";

  resultsCount.textContent = `${movies.length} resultado${movies.length !== 1 ? "s" : ""}`;

  const fragment = document.createDocumentFragment();
  movies.forEach((movie) => {
    const card = createMovieCard(movie);
    fragment.appendChild(card);
  });
  movieListEl.appendChild(fragment);
}

function showMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
  movieListEl.innerHTML = "";
  resultsCount.textContent = "";
}

function openModal(movie) {
  const year = movie.release_date ? movie.release_date.substring(0, 4) : "—";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
  const overview = movie.overview || "Sinopse não disponível.";

  const posterSrc = movie.poster_path
    ? `${IMG_ORIGINAL}${movie.poster_path}`
    : null;

  const posterEl = posterSrc
    ? `<img src="${posterSrc}" alt="Poster de ${movie.title}" loading="lazy" />`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted)">
         Sem imagem
       </div>`;

  modalContent.innerHTML = `
    <div class="modal-poster">${posterEl}</div>
    <div class="modal-details">
      <h2 class="modal-title">${movie.title}</h2>
      ${movie.original_title && movie.original_title !== movie.title
        ? `<p class="modal-tagline">${movie.original_title}</p>`
        : ""}
      <div class="modal-rating-row">
        <div class="modal-score">
          <span>★</span>
          <span>${rating}</span>
          <span style="color:var(--muted);font-size:0.75rem">/ 10</span>
        </div>
        <span class="modal-year">${year}</span>
      </div>
      <p class="modal-overview">${overview}</p>
    </div>
  `;

  modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

async function handleSearch() {
  const query = searchInput.value.trim();

  if (!query) {

    await loadByFilter(currentFilter);
    return;
  }

  showMessage("Buscando filmes...", "loading");
  resultsLabel.textContent = `Resultados para "${query}"`;

  filterBtns.forEach((btn) => btn.classList.remove("active"));

  try {
    const movies = await fetchMovies(query);
    renderMovies(movies);
  } catch (err) {
    showMessage(`Erro ao buscar filmes: ${err.message}`, "error");
    console.error("Erro na busca:", err);
  }
}

async function loadByFilter(filter) {
  currentFilter = filter;
  searchInput.value = "";
  resultsLabel.textContent = FILTER_MAP[filter]?.label ?? "Filmes";

  filterBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });

  showMessage("Carregando filmes...", "loading");

  try {
    const movies = await fetchMovies();
    renderMovies(movies);
  } catch (err) {
    showMessage(`Erro ao carregar filmes: ${err.message}`, "error");
    console.error("Erro ao carregar filmes:", err);
  }
}

function init() {

  searchBtn.addEventListener("click", handleSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      loadByFilter(btn.dataset.filter);
    });
  });

  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  loadByFilter("popular");
}

document.addEventListener("DOMContentLoaded", init);
