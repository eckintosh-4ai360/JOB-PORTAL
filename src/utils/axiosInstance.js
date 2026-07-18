import axios from "axios"
import { BASE_URL } from "./apiPath"

// Create Axios instance
const axiosInstance = axios.create({
    baseURL : BASE_URL,
    timeout : 80000,
    headers : {
        "Content-Type" : "application/json",
        "Accept" : "application/json"
    }
})

//! Request interceptor to add token
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

//! Response interceptor
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle token expiration — but NOT on the login endpoint itself,
        // otherwise wrong-password 401s cause a redirect before the UI
        // can show the error message. Also skip for the application endpoint
        // since guests submit without a token.
        const isLoginRequest = error.config?.url?.includes("/api/auth/login");
        const isGuestApply = error.config?.method === "post" && error.config?.url?.includes("/api/applications/");
        if (error.response && error.response.status === 401 && !isLoginRequest && !isGuestApply) {
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            window.location.href = "/login"
        }
        return Promise.reject(error)
    }
)

export default axiosInstance