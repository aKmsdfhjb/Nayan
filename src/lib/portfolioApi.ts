import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface PortfolioItem {
  _id?: string;
  title: string;
  description: string;
  image: string;
  link?: string;
}

export const getPortfolio = async (): Promise<PortfolioItem[]> => {
  const response = await axios.get(`${API_URL}/portfolio`);
  return response.data;
};

export const createPortfolio = async (data: PortfolioItem) => {
  const response = await axios.post(`${API_URL}/portfolio`, data);
  return response.data;
};

export const updatePortfolio = async (id: string, data: PortfolioItem) => {
  const response = await axios.put(`${API_URL}/portfolio/${id}`, data);
  return response.data;
};

export const deletePortfolio = async (id: string) => {
  const response = await axios.delete(`${API_URL}/portfolio/${id}`);
  return response.data;
};
