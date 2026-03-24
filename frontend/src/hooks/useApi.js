import { useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_BASE = "/api";

export const useApi = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(
    async (method, url, data = null, options = {}) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios({
          method,
          url: url.startsWith("http") ? url : `${API_BASE}${url}`,
          data,
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            ...options.headers,
          },
          ...options,
        });
        return response.data;
      } catch (err) {
        const msg =
          err.response?.data?.error || err.message || "Something went wrong";
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  const get = (url, options) => request("GET", url, null, options);
  const post = (url, data, options) => request("POST", url, data, options);
  const put = (url, data, options) => request("PUT", url, data, options);
  const del = (url, options) => request("DELETE", url, null, options);

  return { loading, error, get, post, put, del };
};
