import express from "express";
import axios from "axios";
import { JSDOM } from "jsdom";
import cors from "cors";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Configuración de headers para simular un navegador real
 */
const getHeaders = () => ({
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
});

/**
 * Función para extraer información de productos de Amazon
 */
async function scrapeAmazonProducts(keyword) {
  try {
    // Construir URL de búsqueda de Amazon
    const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(
      keyword
    )}&ref=sr_pg_1`;

    console.log(`Scraping Amazon para: ${keyword}`);
    console.log(`URL: ${searchUrl}`);

    // Realizar solicitud HTTP
    const response = await axios.get(searchUrl, {
      headers: getHeaders(),
      timeout: 10000,
    });

    // Parsear HTML con JSDOM
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Selectores para productos de Amazon
    const productElements = document.querySelectorAll(
      '[data-component-type="s-search-result"]'
    );

    const products = [];

    productElements.forEach((element, index) => {
      try {
        // Extraer título del producto
        const titleElement =
          element.querySelector("h2 a span") ||
          element.querySelector(".s-title-instructions-style span");
        const title = titleElement
          ? titleElement.textContent.trim()
          : "Título no disponible";

        // Extraer calificación (estrellas)
        const ratingElement = element.querySelector(".a-icon-alt");
        let rating = "No disponible";
        if (ratingElement) {
          const ratingText = ratingElement.textContent;
          const ratingMatch = ratingText.match(
            /(\d+\.?\d*)\s*(?:de\s*5|out of 5)/i
          );
          rating = ratingMatch ? parseFloat(ratingMatch[1]) : "No disponible";
        }

        // Extraer número de reseñas
        const reviewsElement = element.querySelector(".a-size-base");
        let reviewCount = "No disponible";
        if (reviewsElement) {
          const reviewText = reviewsElement.textContent;
          const reviewMatch = reviewText.match(/(\d+(?:,\d+)*)/);
          reviewCount = reviewMatch ? reviewMatch[1] : "No disponible";
        }

        // Extraer URL de imagen
        const imageElement = element.querySelector(".s-image");
        const imageUrl = imageElement
          ? imageElement.src || imageElement.getAttribute("data-src")
          : "No disponible";

        // Extraer precio (opcional)
        const priceElement = element.querySelector(
          ".a-price-whole, .a-offscreen"
        );
        const price = priceElement
          ? priceElement.textContent.trim()
          : "No disponible";

        // Extraer URL del producto
        const linkElement = element.querySelector("h2 a");
        const productUrl = linkElement
          ? `https://www.amazon.com${linkElement.getAttribute("href")}`
          : "No disponible";

        // Solo agregar productos con información válida
        if (title !== "Título no disponible") {
          products.push({
            id: index + 1,
            title,
            rating,
            reviewCount,
            imageUrl,
            price,
            productUrl,
          });
        }
      } catch (error) {
        console.error(`Error procesando producto ${index}:`, error.message);
      }
    });

    console.log(`Productos extraídos: ${products.length}`);
    return products;
  } catch (error) {
    console.error("Error en scraping:", error.message);
    throw new Error(`Error al extraer datos de Amazon: ${error.message}`);
  }
}

/**
 * Endpoint principal para realizar scraping
 */
app.get("/api/scrape", async (req, res) => {
  try {
    const { keyword } = req.query;

    // Validar parámetro keyword
    if (!keyword) {
      return res.status(400).json({
        success: false,
        error: "El parámetro keyword es requerido",
      });
    }

    // Realizar scraping
    const products = await scrapeAmazonProducts(keyword);

    // Responder con datos extraídos
    res.json({
      success: true,
      keyword,
      totalProducts: products.length,
      products,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en endpoint /api/scrape:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error interno del servidor",
    });
  }
});

/**
 * Endpoint de estado del servidor
 */
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "Servidor Amazon Scraper funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Endpoint raíz
 */
app.get("/", (req, res) => {
  res.json({
    message: "Amazon Scraper API",
    endpoints: {
      status: "/api/status",
      scrape: "/api/scrape?keyword=tu_palabra_clave",
    },
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(
    `📡 Endpoint de scraping: http://localhost:${PORT}/api/scrape?keyword=tu_palabra_clave`
  );
});
