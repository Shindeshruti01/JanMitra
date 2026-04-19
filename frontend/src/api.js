import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:5000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export function saveSession(payload) {
  localStorage.setItem("janmitra_session", JSON.stringify(payload));
}

export function getSession() {
  const raw = localStorage.getItem("janmitra_session");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem("janmitra_session");
}

export function maskAadhar(aadhar) {
  if (!aadhar) return "Not available";
  const digits = String(aadhar).replace(/\D/g, "");
  if (digits.length < 4) return aadhar;
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
