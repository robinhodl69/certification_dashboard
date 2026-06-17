import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "./supabase";

const PALETTE = {
  cream: "#F5F1EB",
  ink: "#1A1A1A",
  red: "#E63946",
  line: "#D8D1C4",
  muted: "#6B6457",
  card: "#FBF9F5",
};

const DOMAINS = [
  { id: 1, name: "Arquitectura de agentes y orquestación", weight: 27, subs: [
    { id: "1.1", name: "Diseño de ciclos de agentes" },
    { id: "1.2", name: "Orquestación multiagente" },
    { id: "1.3", name: "Invocación y contexto de subagentes" },
    { id: "1.4", name: "Flujos de trabajo multisaltos" },
    { id: "1.5", name: "Hooks de Agent SDK" },
    { id: "1.6", name: "Estrategias de descomposición" },
    { id: "1.7", name: "Gestión de estado de sesión" },
  ] },
  { id: 2, name: "Diseño de herramientas e integración MCP", weight: 18, subs: [
    { id: "2.1", name: "Diseño de interfaces de herramientas" },
    { id: "2.2", name: "Errores estructurados en MCP" },
    { id: "2.3", name: "Distribución de herramientas y tool_choice" },
    { id: "2.4", name: "Integración de servidores MCP" },
    { id: "2.5", name: "Herramientas integradas" },
  ] },
  { id: 3, name: "Configuración y flujos de trabajo de Claude Code", weight: 20, subs: [
    { id: "3.1", name: "Configuración de CLAUDE.md" },
    { id: "3.2", name: "Comandos slash y Skills" },
    { id: "3.3", name: "Reglas específicas de ruta" },
  ] },
  { id: 4, name: "Ingeniería de prompts y salida estructurada", weight: 20, subs: [
    { id: "4.1", name: "Criterios explícitos" },
    { id: "4.2", name: "Few-shot prompting" },
    { id: "4.3", name: "JSON Schema y validación" },
    { id: "4.4", name: "Prompt Chaining" },
    { id: "4.5", name: "Validación y autocorrección" },
  ] },
  { id: 5, name: "Gestión de contexto y confiabilidad", weight: 15, subs: [
    { id: "5.1", name: "Gestión de contexto" },
    { id: "5.2", name: "Extracción de hechos" },
    { id: "5.3", name: "Escalada y Human-in-the-Loop" },
    { id: "5.4", name: "Manejo de errores en multiagente" },
    { id: "5.5", name: "Provenance y atribución" },
  ] },
];

const SCORES = [0, 25, 50, 75, 100];
const LOGO = "https://res.cloudinary.com/trazo/image/upload/v1780965439/trazo/trazo_logotipo.png";
const PASS_THRESHOLD = 70;

function domainScore(scores, domain) {
  const vals = domain.subs.map((s) => scores?.[s.id] ?? 0);
  return vals.reduce((a, b) => a + b, 0) / domain.subs.length;
}

function totalScore(scores) {
  return DOMAINS.reduce((acc, d) => acc + (domainScore(scores, d) * d.weight) / 100, 0);
}

function scoreColor(v) {
  if (v >= 85) return "#2E7D52";
  if (v >= 70) return "#5B8C3E";
  if (v >= 50) return "#C8941F";
  if (v >= 25) return "#D8762E";
  return PALETTE.red;
}

export default function CertDashboard({ profile, onSignOut }) {
  const [scores, setScores] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;

    async function loadScores() {
      const { data, error } = await supabase.from("subscores").select("sub_id,value").eq("user_id", profile.id);
      if (!active) return;
      if (error) setSaveState("No se pudieron cargar tus datos.");
      else setScores(scoresFromRows(data || []));
      setLoaded(true);
    }

    loadScores();
    return () => {
      active = false;
    };
  }, [profile?.id]);

  async function setScore(subId, val) {
    setScores((prev) => ({ ...prev, [subId]: val }));
    setSaveState("Guardando...");
    const { error } = await supabase.from("subscores").upsert(
      { user_id: profile.id, sub_id: subId, value: val, updated_at: new Date().toISOString() },
      { onConflict: "user_id,sub_id" }
    );
    setSaveState(error ? "No se pudo guardar. Intenta de nuevo." : "Guardado");
  }

  const canViewRanking = profile?.is_admin || profile?.can_view_ranking;

  return (
    <Shell>
      <Header groupAvg={totalScore(scores)} subtitle="Tu progreso" />
      <TopNav profile={profile} onSignOut={onSignOut} canViewRanking={canViewRanking} />
      {!loaded ? (
        <Panel>Cargando tus porcentajes...</Panel>
      ) : (
        <EvaluationMatrix selected={{ ...profile, scores }} onSetScore={setScore} editable />
      )}
      <FooterText>{saveState || "Datos guardados en Supabase."}</FooterText>
    </Shell>
  );
}

export function Login() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail) {
      setMessage("Usuario y correo son obligatorios.");
      return;
    }

    setLoading(true);
    localStorage.setItem("pendingUsername", cleanUsername);
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        data: { username: cleanUsername },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);
    setMessage(error ? error.message : "Te enviamos un enlace de acceso al correo.");
  }

  return (
    <div style={{ background: PALETTE.cream, color: PALETTE.ink, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', minHeight: "100vh", padding: 24, display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 620, textAlign: "center" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: PALETTE.red, fontWeight: 700 }}>
          Acceso sin contraseña
        </div>
        <h1 style={{ margin: "8px 0 8px", fontSize: 32, fontWeight: 800 }}>
          Preparación Certificación Claude
        </h1>
        <div style={{ fontSize: 13, color: PALETTE.muted, marginBottom: 18 }}>
          Escribe tu usuario y correo. Te enviaremos un enlace de acceso.
        </div>
        <div style={{ background: "#FFFFFF", border: `1px solid ${PALETTE.line}`, padding: 22 }}>
          <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario" style={{ ...inputStyle(), width: "100%" }} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email" style={{ ...inputStyle(), width: "100%" }} />
            <button disabled={loading} style={{ ...primaryBtn(), width: "100%" }}>{loading ? "Enviando..." : "Entrar"}</button>
          </form>
          {message && (
            <div style={{ color: message.includes("enlace") ? "#2E7D52" : PALETTE.red, fontSize: 13, fontWeight: 600, marginTop: 12 }}>
              {message}
            </div>
          )}
          <div style={{ color: PALETTE.muted, fontSize: 12, marginTop: 16 }}>
            Accede para registrar tu dominio por módulo y guardar tu progreso en Supabase.
          </div>
        </div>
      </div>
    </div>
  );
}

export function RankingPage({ profile, onSignOut }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const allowed = profile?.is_admin || profile?.can_view_ranking;

  useEffect(() => {
    if (!allowed) return;
    loadUsers().then((next) => {
      setUsers(next);
      setLoading(false);
    });
  }, [allowed]);

  if (!allowed) {
    return <Shell><Header groupAvg={null} subtitle="Ranking privado" /><TopNav profile={profile} onSignOut={onSignOut} /><Panel>No tienes permiso para ver este ranking.</Panel></Shell>;
  }

  return (
    <Shell>
      <Header groupAvg={groupAverage(users)} subtitle="Ranking privado" />
      <TopNav profile={profile} onSignOut={onSignOut} canViewRanking />
      {loading ? <Panel>Cargando ranking...</Panel> : <RankingTable users={users} />}
      <FooterText>Visible solo para administradores y usuarios habilitados.</FooterText>
    </Shell>
  );
}

export function AdminPanel({ profile, onSignOut }) {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadUsers().then(setUsers);
  }, [profile?.is_admin]);

  async function toggleRanking(user) {
    const nextValue = !user.can_view_ranking;
    const { error } = await supabase.from("profiles").update({ can_view_ranking: nextValue }).eq("id", user.id);
    if (error) {
      setMessage("No se pudo actualizar el permiso.");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, can_view_ranking: nextValue } : u)));
    setMessage("Permiso actualizado.");
  }

  if (!profile?.is_admin) {
    return <Shell><Header groupAvg={null} subtitle="Admin" /><TopNav profile={profile} onSignOut={onSignOut} /><Panel>Solo el administrador puede entrar a esta sección.</Panel></Shell>;
  }

  return (
    <Shell>
      <Header groupAvg={groupAverage(users)} subtitle="Administración" />
      <TopNav profile={profile} onSignOut={onSignOut} canViewRanking />
      <Panel>
        <h2 style={{ marginTop: 0 }}>Permisos de ranking</h2>
        {message && <p style={{ color: "#2E7D52", fontWeight: 700 }}>{message}</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `2px solid ${PALETTE.ink}` }}>
                <th style={thStyle()}>Usuario</th>
                <th style={thStyle()}>Total</th>
                <th style={thStyle()}>Admin</th>
                <th style={thStyle()}>Ve ranking</th>
                <th style={thStyle()}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${PALETTE.line}` }}>
                  <td style={tdStyle()}><b>{u.username}</b><div style={{ color: PALETTE.muted, fontSize: 11 }}>{u.email}</div></td>
                  <td style={tdStyle()}>{totalScore(u.scores).toFixed(1)}%</td>
                  <td style={tdStyle()}>{u.is_admin ? "Sí" : "No"}</td>
                  <td style={tdStyle()}>{u.can_view_ranking || u.is_admin ? "Sí" : "No"}</td>
                  <td style={{ ...tdStyle(), textAlign: "right" }}>
                    {!u.is_admin && <button onClick={() => toggleRanking(u)} style={ghostBtn()}>{u.can_view_ranking ? "Revocar" : "Habilitar"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Shell>
  );
}

export function Shell({ children }) {
  return (
    <div style={{ background: PALETTE.cream, color: PALETTE.ink, fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function Header({ groupAvg, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, background: "#FFFFFF", border: `1px solid ${PALETTE.line}`, padding: "18px 22px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img src={LOGO} alt="Trazo" style={{ height: 40, width: "auto", display: "block" }} />
        <div>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: PALETTE.red, fontWeight: 700 }}>{subtitle}</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800 }}>Preparación Certificación Claude</h1>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: PALETTE.muted, textTransform: "uppercase", letterSpacing: 1 }}>Promedio</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: groupAvg == null ? PALETTE.muted : scoreColor(groupAvg), lineHeight: 1 }}>{groupAvg == null ? "—" : `${groupAvg.toFixed(1)}%`}</div>
        <div style={{ fontSize: 11, color: PALETTE.muted }}>Umbral aprobación: {PASS_THRESHOLD}%</div>
      </div>
    </div>
  );
}

function TopNav({ profile, onSignOut, canViewRanking }) {
  const location = useLocation();

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
      <div style={{ fontSize: 13 }}><b>{profile?.username}</b> <span style={{ color: PALETTE.muted }}>{profile?.email}</span></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {location.pathname !== '/' && <Link to="/" style={linkBtn()}>Mi dashboard</Link>}
        {canViewRanking && location.pathname !== '/ranking' && <Link to="/ranking" style={linkBtn()}>Ranking</Link>}
        {profile?.is_admin && location.pathname !== '/admin' && <Link to="/admin" style={linkBtn()}>Admin</Link>}
        <button onClick={onSignOut} style={ghostBtn()}>Cerrar sesión</button>
      </div>
    </div>
  );
}

function RankingTable({ users }) {
  const ranked = [...users].map((u) => ({ ...u, total: totalScore(u.scores) })).sort((a, b) => b.total - a.total);

  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${PALETTE.line}`, overflowX: "auto", marginTop: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: `2px solid ${PALETTE.ink}` }}>
            <th style={thStyle()}>#</th>
            <th style={thStyle()}>Usuario</th>
            {DOMAINS.map((d) => <th key={d.id} style={{ ...thStyle(), textAlign: "center" }}>D{d.id}<div style={{ fontWeight: 400, color: PALETTE.muted, fontSize: 10 }}>{d.weight}%</div></th>)}
            <th style={{ ...thStyle(), textAlign: "center" }}>Total</th>
            <th style={{ ...thStyle(), textAlign: "center" }}>Estatus</th>
          </tr>
        </thead>
        <tbody>
          {ranked.length === 0 && <tr><td colSpan={DOMAINS.length + 4} style={{ padding: 24, textAlign: "center", color: PALETTE.muted }}>Aún no hay usuarios.</td></tr>}
          {ranked.map((u, i) => {
            const pass = u.total >= PASS_THRESHOLD;
            return (
              <tr key={u.id} style={{ borderBottom: `1px solid ${PALETTE.line}` }}>
                <td style={tdStyle()}>{i + 1}</td>
                <td style={tdStyle()}><div style={{ fontWeight: 700 }}>{u.username}</div><div style={{ fontSize: 11, color: PALETTE.muted }}>{u.email}</div></td>
                {DOMAINS.map((d) => {
                  const ds = domainScore(u.scores, d);
                  return <td key={d.id} style={{ ...tdStyle(), textAlign: "center", color: scoreColor(ds), fontWeight: 600 }}>{ds.toFixed(0)}</td>;
                })}
                <td style={{ ...tdStyle(), textAlign: "center" }}><span style={{ fontWeight: 800, fontSize: 15, color: scoreColor(u.total) }}>{u.total.toFixed(1)}%</span></td>
                <td style={{ ...tdStyle(), textAlign: "center" }}><Status pass={pass} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EvaluationMatrix({ selected, onSetScore, editable }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Evaluación · {selected.username}</h2>
        <span style={{ fontSize: 12, color: PALETTE.muted }}>Total ponderado: <b style={{ color: scoreColor(totalScore(selected.scores)) }}>{totalScore(selected.scores).toFixed(1)}%</b></span>
      </div>
      {DOMAINS.map((d) => {
        const ds = domainScore(selected.scores, d);
        return (
          <div key={d.id} style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}`, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: PALETTE.ink, color: PALETTE.cream, gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}><span style={{ color: PALETTE.red, marginRight: 6 }}>D{d.id}</span>{d.name}</div>
              <div style={{ fontSize: 12, display: "flex", gap: 14, alignItems: "center" }}><span style={{ opacity: 0.7 }}>Peso {d.weight}%</span><span style={{ fontWeight: 800, color: scoreColor(ds) }}>{ds.toFixed(0)}</span></div>
            </div>
            <div>
              {d.subs.map((s, idx) => {
                const cur = selected.scores?.[s.id] ?? 0;
                return (
                  <div className="score-row" key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 14px", borderTop: idx === 0 ? "none" : `1px solid ${PALETTE.line}` }}>
                    <div style={{ fontSize: 13 }}><span style={{ color: PALETTE.muted, fontWeight: 600, marginRight: 6 }}>{s.id}</span>{s.name}</div>
                    <div className="score-buttons" style={{ display: "flex", gap: 4 }}>
                      {SCORES.map((v) => {
                        const active = cur === v;
                        return <button disabled={!editable} key={v} onClick={() => onSetScore(s.id, v)} style={scoreBtn(active, v)}>{v}</button>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Status({ pass }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", color: pass ? "#2E7D52" : PALETTE.red, background: pass ? "rgba(46,125,82,0.12)" : "rgba(230,57,70,0.12)" }}>{pass ? "Listo" : "En curso"}</span>;
}

function Panel({ children }) {
  return <div style={{ background: "#FFFFFF", border: `1px solid ${PALETTE.line}`, padding: 22 }}>{children}</div>;
}

function FooterText({ children }) {
  return <div style={{ marginTop: 24, fontSize: 11, color: PALETTE.muted }}>Score por dominio = promedio de sus subtemas. Total = Σ (dominio × peso). {children}</div>;
}

async function loadUsers() {
  const [{ data: profiles }, { data: scores }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("subscores").select("user_id,sub_id,value"),
  ]);

  const scoresByUser = (scores || []).reduce((acc, row) => {
    acc[row.user_id] = acc[row.user_id] || {};
    acc[row.user_id][row.sub_id] = row.value;
    return acc;
  }, {});

  return (profiles || []).map((p) => ({ ...p, scores: scoresByUser[p.id] || {} }));
}

function scoresFromRows(rows) {
  return rows.reduce((acc, row) => ({ ...acc, [row.sub_id]: row.value }), {});
}

function groupAverage(users) {
  if (!users.length) return null;
  return users.reduce((acc, user) => acc + totalScore(user.scores), 0) / users.length;
}

function inputStyle() {
  return { padding: "9px 12px", fontSize: 14, border: `1px solid ${PALETTE.line}`, background: "#fff", color: PALETTE.ink, outline: "none", minWidth: 160 };
}

function primaryBtn() {
  return { padding: "9px 18px", fontSize: 14, fontWeight: 700, color: "#fff", background: PALETTE.red, border: "none", cursor: "pointer" };
}

function ghostBtn() {
  return { background: "transparent", border: `1px solid ${PALETTE.line}`, color: PALETTE.muted, cursor: "pointer", fontSize: 13, padding: "8px 10px", textDecoration: "none" };
}

function linkBtn() {
  return { ...ghostBtn(), display: "inline-block" };
}

function scoreBtn(active, v) {
  return { width: 42, padding: "5px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${active ? scoreColor(v) : PALETTE.line}`, background: active ? scoreColor(v) : "transparent", color: active ? "#fff" : PALETTE.muted, transition: "all .12s" };
}

function thStyle() {
  return { padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: PALETTE.muted, fontWeight: 700 };
}

function tdStyle() {
  return { padding: "10px 12px", verticalAlign: "middle" };
}
