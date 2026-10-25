import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/useAuth";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get("token");
    if (!token) {
      toast.error("Connexion Google impossible");
      navigate("/login");
      return;
    }
    loginWithToken(token)
      .then(() => navigate("/dashboard"))
      .catch(() => {
        toast.error("Connexion Google impossible");
        navigate("/login");
      });
  }, [params, loginWithToken, navigate]);

  return <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">Connexion en cours…</div>;
}
