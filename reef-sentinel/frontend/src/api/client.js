import axios from "axios";

// En développement, Vite proxifie /api vers http://localhost:8000 (voir vite.config.js).
// En production, définissez VITE_API_BASE_URL pour pointer vers le backend déployé.
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL,
  timeout: 120000, // L'analyse d'image (Grad-CAM) peut prendre plusieurs secondes sur CPU
});

function unwrapError(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(" — ");
  }
  if (error?.message === "Network Error" || error?.code === "ERR_NETWORK") {
    return "Impossible de contacter le serveur d'inférence. Vérifiez que le backend FastAPI est démarré (uvicorn app.main:app).";
  }
  return error?.message || "Une erreur inattendue est survenue.";
}

export async function checkHealth() {
  const { data } = await api.get("/health");
  return data;
}

export async function predictModule1(file) {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const { data } = await api.post("/module1/predict", formData);
    return data;
  } catch (error) {
    throw new Error(unwrapError(error));
  }
}

export async function getModule2Features() {
  try {
    const { data } = await api.get("/module2/features");
    return data;
  } catch (error) {
    throw new Error(unwrapError(error));
  }
}

export async function predictModule2(values) {
  try {
    const { data } = await api.post("/module2/predict", { values });
    return data;
  } catch (error) {
    throw new Error(unwrapError(error));
  }
}

export async function predictModule3(file) {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const { data } = await api.post("/module3/predict", formData);
    return data;
  } catch (error) {
    throw new Error(unwrapError(error));
  }
}

export async function computeFusion(pMicro, pHab, pImage) {
  try {
    const { data } = await api.post("/fusion/compute", {
      p_micro: pMicro,
      p_hab: pHab,
      p_image: pImage,
    });
    return data;
  } catch (error) {
    throw new Error(unwrapError(error));
  }
}
