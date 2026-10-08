import React, { useEffect, useState } from "react";
import { api, downloadProject } from "./api.js";

const Badge = ({ p }) => <span className={"pill " + (p.status === "done" ? "g" : "")}>{p.status === "running" ? `Generating ${p.progress}%` : p.status === "done" ? "Ready" : p.paid ? "In progress" : "Preview"}</span>;

export function Dashboard({ open }) {
  const [d, setD] = useState(null);
  useEffect(() => { api("/dashboard").then(setD); }, []);
  if (!d) return <div className="wrap">Loading…</div>;
  return (
    <div className="wrap"><h2>Dashboard</h2>
      <div className="stats">
        {[["Projects", d.total], ["Completed", d.done], ["Generating", d.running], ["Saved topics", d.saved]].map(([k, v]) => <div className="card stat" key={k}><b>{v}</b>{k}</div>)}
      </div>
      <h3>Recent projects</h3>
      {d.recent.map((p) => <div className="card topic" key={p.id} onClick={() => open(p.id)}><b>{p.title}</b><div className="bar" style={{ marginTop: 8 }}><div style={{ width: (p.status === "done" ? 100 : p.progress) + "%" }} /></div></div>)}
      {!d.recent.length && <p>No projects yet — start from Find Topics.</p>}
    </div>
  );
}

export function Projects({ open }) {
  const [l, setL] = useState(null);
  useEffect(() => { api("/projects").then(setL); }, []);
  return (
    <div className="wrap"><h2>My Projects</h2>
      {l?.map((p) => <div className="card topic" key={p.id} onClick={() => open(p.id)}><b>{p.title}</b> <span className="pill">{p.level}</span><Badge p={p} /></div>)}
      {l && !l.length && <p>No projects yet.</p>}
    </div>
  );
}

export function Library({ start }) {
  const [l, setL] = useState(null);
  const load = () => api("/library").then(setL);
  useEffect(() => { load(); }, []);
  return (
    <div className="wrap"><h2>Library</h2><p style={{ color: "#6b7280" }}>Topics you saved.</p>
      {l?.map((s) => (
        <div className="card" key={s.id}><b>{s.topic.title}</b> <span className="pill">{s.level}</span><p>{s.topic.description}</p>
          <button className="btn" onClick={() => start(s)}>Start project</button>{" "}
          <button className="btn ghost" onClick={() => api(`/library/${s.id}`, null, "DELETE").then(load)}>Remove</button></div>
      ))}
      {l && !l.length && <p>Nothing saved yet — tap ☆ Save on any topic.</p>}
    </div>
  );
}

export function Workspace({ project, back }) {
  const [c, setC] = useState(null);
  const [cur, setCur] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const sec = project.sections[cur];
  const load = () => api(`/projects/${project.id}/content`).then(setC).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (c?.status !== "running") return; const t = setInterval(load, 3000); return () => clearInterval(t); }, [c?.status]);
  useEffect(() => { if (c) setText(c.sections[sec] || ""); }, [cur, c?.sections?.[sec]]);
  if (!c) return <div className="wrap">{msg || "Loading…"}</div>;

  const act = (name, fn) => async () => { setBusy(name); setMsg(""); try { await fn(); } catch (e) { setMsg(e.message); } setBusy(""); };
  const start = act("gen", async () => { await api(`/projects/${project.id}/generate`, {}); await load(); });
  const save = act("save", async () => { await api(`/projects/${project.id}/sections`, { section: sec, text }, "PUT"); setMsg("Saved"); await load(); });
  const tool = (a) => act(a, async () => setText((await api(`/projects/${project.id}/rewrite`, { section: sec, text, action: a })).text));

  return (
    <div className="wrap" style={{ maxWidth: 1200 }}>
      <button className="btn ghost" onClick={back}>← Back</button>
      <h2>{project.title}</h2>
      <div className="card">
        {c.status === "idle" && <><p>Generate every chapter, references and diagrams in the background. You can leave this page while it runs.</p><button className="btn" disabled={!!busy} onClick={start}>Build full project</button></>}
        {c.status === "running" && <><b>Generating… {c.progress}%</b><div className="bar" style={{ marginTop: 8 }}><div style={{ width: c.progress + "%" }} /></div></>}
        {c.status === "error" && <><div className="err">Failed: {c.error}</div><button className="btn" onClick={start}>Retry (keeps finished sections)</button></>}
        {c.status === "done" && <button className="btn" disabled={busy === "dl"} onClick={act("dl", () => downloadProject(project.id, project.title))}>Download full project (.docx)</button>}
      </div>
      <div className="work">
        <div className="card">{project.sections.map((s, i) => (
          <div key={s} className={"road " + (i === cur ? "cur" : "")} onClick={() => setCur(i)}>
            <div className="num">{c.sections[s] ? "✓" : i + 1}</div><span style={{ fontSize: 13 }}>{s}</span></div>))}</div>
        <div className="card"><h3>{sec}</h3>
          {c.sections[sec] !== undefined || c.status === "idle" ? (
            <textarea className="ed" data-nocopy="1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Not generated yet" />
          ) : <p>This section is being generated…</p>}
          {sec.startsWith("System Design") && c.diagrams && ["architecture", "er"].map((k) => <img key={k} className="fig" alt={k} src={"data:image/png;base64," + c.diagrams[k]} />)}
          {msg && <div className="err">{msg}</div>}
        </div>
        <div className="card"><b>Quick tools</b><div style={{ marginTop: 10 }}>
          <button className="btn ghost tool" disabled={!!busy || !text} onClick={tool("rewrite")}>{busy === "rewrite" ? "…" : "Rewrite"}</button>
          <button className="btn ghost tool" disabled={!!busy || !text} onClick={tool("grammar")}>{busy === "grammar" ? "…" : "Check grammar"}</button>
          <button className="btn ghost tool" disabled={!!busy || !text} onClick={tool("expand")}>{busy === "expand" ? "…" : "Expand"}</button>
          <button className="btn tool" disabled={!!busy} onClick={save}>{busy === "save" ? "…" : "Save section"}</button></div></div>
      </div>
    </div>
  );
}
