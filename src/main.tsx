import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import LoginPage from "./LoginPage";
import { AuthProvider, useAuth } from "./AuthContext";
import "./styles.css";

function Root() {
  const { user } = useAuth();
  return user ? <App /> : <LoginPage />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>,
);
