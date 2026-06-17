import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import CertDashboard, { AdminPanel, Login, RankingPage, Shell } from "./CertDashboard.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
      setLoading(false);
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        await loadProfile(nextSession.user);
        if (event === "SIGNED_IN") {
          navigate("/", { replace: true });
        }
      } else {
        setProfile(null);
      }
    });

    init();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  async function loadProfile(user) {
    const pendingUsername = localStorage.getItem("pendingUsername") || user.user_metadata?.username || "Usuario";
    const email = user.email || "";

    const { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (existing) {
      setProfile(existing);
      localStorage.removeItem("pendingUsername");
      return existing;
    }

    const { data: created, error } = await supabase
      .from("profiles")
      .insert({ id: user.id, username: pendingUsername, email })
      .select("*")
      .single();

    if (!error) {
      setProfile(created);
      localStorage.removeItem("pendingUsername");
      return created;
    }

    // Si falló el insert (probablemente por un error 409 de condición de carrera), intentar leer de nuevo
    const { data: existingAfter } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (existingAfter) {
      setProfile(existingAfter);
      localStorage.removeItem("pendingUsername");
      return existingAfter;
    }

    setProfile(null);
    return null;
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  if (loading) return <Shell>Preparando dashboard...</Shell>;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <RequireAuth session={session}>
            <CertDashboard profile={profile} onProfileChange={setProfile} onSignOut={signOut} />
          </RequireAuth>
        }
      />
      <Route
        path="/ranking"
        element={
          <RequireAuth session={session}>
            <RankingPage profile={profile} onSignOut={signOut} />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth session={session}>
            <AdminPanel profile={profile} onSignOut={signOut} />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Shell><p>Ruta no encontrada.</p><Link to="/">Volver</Link></Shell>} />
    </Routes>
  );
}

function RequireAuth({ children, session }) {
  if (!session) return <Navigate to="/login" replace />;
  return children;
}
