import axios from "axios";

const API = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// ─── Listings ───
export const getAllListings = () => API.get("/listings");
export const getListing = (id) => API.get(`/listings/${id}`);
export const createListing = (data) => API.post("/listings", data);
export const updateListing = (id, data) => API.put(`/listings/${id}`, data);
export const deleteListing = (id) => API.delete(`/listings/${id}`);

// ─── Reviews ───
export const getReviews = (listingId) => API.get(`/listings/${listingId}/reviews`);
export const createReview = (listingId, data) => API.post(`/listings/${listingId}/reviews`, data);
export const updateReview = (listingId, reviewId, data) => API.put(`/listings/${listingId}/reviews/${reviewId}`, data);
export const deleteReview = (listingId, reviewId) => API.delete(`/listings/${listingId}/reviews/${reviewId}`);

// ─── Auth ───
export const signup = (data) => API.post("/auth/signup", data);
export const login = (data) => API.post("/auth/login", data);
export const logout = () => API.get("/auth/logout");
export const getCurrentUser = () => API.get("/auth/current-user");

export default API;
