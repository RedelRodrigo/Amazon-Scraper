// Configuración de la API
const API_BASE_URL = "http://localhost:3001";

// Referencias a elementos del DOM
const keywordInput = document.getElementById("keywordInput");
const searchBtn = document.getElementById("searchBtn");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");
const errorSection = document.getElementById("errorSection");
const productsContainer = document.getElementById("productsContainer");
const resultsTitle = document.getElementById("resultsTitle");
const productCount = document.getElementById("productCount");
const errorMessage = document.getElementById("errorMessage");
const retryBtn = document.getElementById("retryBtn");

// Variable para almacenar la última búsqueda
let lastKeyword = "";

/**
 * Inicializar la aplicación
 */
function init() {
  // Event listeners
  searchBtn.addEventListener("click", handleSearch);
  retryBtn.addEventListener("click", handleRetry);

  // Permitir búsqueda con Enter
  keywordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });

  // Focus inicial en el input
  keywordInput.focus();
}

/**
 * Manejar la búsqueda de productos
 */
async function handleSearch() {
  const keyword = keywordInput.value.trim();

  // Validar entrada
  if (!keyword) {
    showError("Por favor, ingresa una palabra clave para buscar");
    keywordInput.focus();
    return;
  }

  // Guardar keyword para retry
  lastKeyword = keyword;

  // Mostrar estado de carga
  showLoading();

  try {
    // Realizar petición a la API
    const products = await fetchProducts(keyword);

    // Mostrar resultados
    showResults(keyword, products);
  } catch (error) {
    console.error("Error en la búsqueda:", error);
    showError(error.message || "Error al conectar con el servidor");
  }
}

/**
 * Manejar el botón de reintentar
 */
function handleRetry() {
  if (lastKeyword) {
    keywordInput.value = lastKeyword;
    handleSearch();
  }
}

/**
 * Realizar petición HTTP a la API de scraping
 * @param {string} keyword - Palabra clave para buscar
 * @returns {Promise<Array>} Array de productos
 */
async function fetchProducts(keyword) {
  try {
    const url = `${API_BASE_URL}/api/scrape?keyword=${encodeURIComponent(
      keyword
    )}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Servidor no encontrado. Asegúrate de que el backend esté ejecutándose."
        );
      }
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Error desconocido en el servidor");
    }

    return data.products || [];
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      throw new Error(
        "Tiempo de espera agotado. El servidor tardó demasiado en responder."
      );
    }

    if (error.message.includes("fetch")) {
      throw new Error(
        "Error de conexión. Verifica que el servidor esté ejecutándose en el puerto 3001."
      );
    }

    throw error;
  }
}

/**
 * Mostrar estado de carga
 */
function showLoading() {
  hideAllSections();
  loadingSection.classList.remove("hidden");
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
}

/**
 * Mostrar resultados de la búsqueda
 * @param {string} keyword - Palabra clave buscada
 * @param {Array} products - Array de productos
 */
function showResults(keyword, products) {
  hideAllSections();

  // Configurar título y contador
  resultsTitle.textContent = `Resultados para "${keyword}"`;
  productCount.textContent = `${products.length} productos encontrados`;

  // Limpiar contenedor de productos
  productsContainer.innerHTML = "";

  if (products.length === 0) {
    productsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                <h3 style="color: #666; margin-bottom: 10px;">No se encontraron productos</h3>
                <p style="color: #999;">Intenta con una palabra clave diferente</p>
            </div>
        `;
  } else {
    // Crear tarjetas de productos
    products.forEach((product) => {
      const productCard = createProductCard(product);
      productsContainer.appendChild(productCard);
    });
  }

  // Mostrar sección de resultados
  resultsSection.classList.remove("hidden");

  // Restaurar botón de búsqueda
  searchBtn.disabled = false;
  searchBtn.innerHTML = '<i class="fas fa-search"></i> Buscar';
}

/**
 * Crear tarjeta de producto
 * @param {Object} product - Datos del producto
 * @returns {HTMLElement} Elemento de tarjeta de producto
 */
function createProductCard(product) {
  const card = document.createElement("div");
  card.className = "product-card";

  // Formatear rating como estrellas
  const starsHTML = generateStarsHTML(product.rating);

  // Formatear precio
  const priceHTML =
    product.price !== "No disponible"
      ? `<div class="product-price">$${product.price}</div>`
      : "";

  // Formatear número de reseñas
  const reviewsHTML =
    product.reviewCount !== "No disponible"
      ? `<div class="product-reviews">${product.reviewCount} reseñas</div>`
      : "";

  card.innerHTML = `
        <div class="product-image">
            ${
              product.imageUrl !== "No disponible"
                ? `<img src="${product.imageUrl}" alt="${product.title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjhGOUZBIi8+CjxwYXRoIGQ9Ik02NyA3MEg5M1Y5Nkg2N1Y3MFoiIGZpbGw9IiNERUUyRTYiLz4KPHA+CjwvcGF0aD4KPC9zdmc+Cg=='">`
                : `<div style="color: #ccc; font-size: 2rem;"><i class="fas fa-image"></i></div>`
            }
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.title}</h3>
            <div class="product-rating">
                <span class="stars">${starsHTML}</span>
                <span class="rating-text">${
                  product.rating !== "No disponible"
                    ? product.rating
                    : "Sin calificación"
                }</span>
            </div>
            ${reviewsHTML}
            ${priceHTML}
            ${
              product.productUrl !== "No disponible"
                ? `<a href="${product.productUrl}" target="_blank" class="product-link">
                    Ver en Amazon <i class="fas fa-external-link-alt"></i>
                </a>`
                : ""
            }
        </div>
    `;

  return card;
}

/**
 * Generar HTML de estrellas basado en rating
 * @param {number|string} rating - Rating del producto
 * @returns {string} HTML de estrellas
 */
function generateStarsHTML(rating) {
  if (rating === "No disponible" || !rating) {
    return '<span style="color: #ccc;">Sin calificación</span>';
  }

  const numRating = parseFloat(rating);
  const fullStars = Math.floor(numRating);
  const hasHalfStar = numRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHTML = "";

  // Estrellas llenas
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }

  // Media estrella
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }

  // Estrellas vacías
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }

  return starsHTML;
}

/**
 * Mostrar mensaje de error
 * @param {string} message - Mensaje de error
 */
function showError(message) {
  hideAllSections();
  errorMessage.textContent = message;
  errorSection.classList.remove("hidden");

  // Restaurar botón de búsqueda
  searchBtn.disabled = false;
  searchBtn.innerHTML = '<i class="fas fa-search"></i> Buscar';
}

/**
 * Ocultar todas las secciones
 */
function hideAllSections() {
  loadingSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
  errorSection.classList.add("hidden");
}

/**
 * Función para verificar estado del servidor
 */
async function checkServerStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", init);

// Verificar estado del servidor al cargar la página
window.addEventListener("load", async () => {
  const isServerRunning = await checkServerStatus();
  if (!isServerRunning) {
    console.warn(
      "⚠️ El servidor backend no está ejecutándose en el puerto 3001"
    );
  } else {
    console.log("✅ Servidor backend conectado correctamente");
  }
});
