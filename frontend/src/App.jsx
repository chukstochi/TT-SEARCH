import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import { Dashboard, Projects, Library, Workspace } from "./Views.jsx";
import { searchUniversities } from "./universities.js";

// Text box that suggests universities while you type. You can still type any name that is not in the list.
function UniversityInput({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const matches = open ? searchUniversities(value) : [];
  const pick = (u) => { onChange(u); setOpen(false); };
  return (
    <div className="uni">
      <input
        className="uni-input"
        value={value}
        placeholder="Start typing your university e.g. unilag"
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((hi + 1) % matches.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((hi - 1 + matches.length) % matches.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(matches[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {matches.length > 0 && (
        <div className="uni-list">
          {matches.map((u, i) => (
            <div key={u} onMouseDown={() => pick(u)} onMouseEnter={() => setHi(i)}
              className={"uni-item" + (i === hi ? " on" : "")}>{u}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Courses grouped by faculty. Add or remove any course here and the dropdown updates.
const COURSES = {
  "Computing & ICT": ["Computer Science","Software Engineering","Information Technology","Information Systems","Cybersecurity","Data Science","Artificial Intelligence","Computer Engineering"],
  "Engineering": ["Civil Engineering","Mechanical Engineering","Electrical/Electronic Engineering","Chemical Engineering","Petroleum Engineering","Agricultural Engineering","Mechatronics Engineering","Metallurgical & Materials Engineering","Marine Engineering","Biomedical Engineering","Industrial & Production Engineering","Telecommunications Engineering"],
  "Business & Management": ["Accounting","Business Administration","Banking & Finance","Marketing","Entrepreneurship","Human Resource Management","Public Administration","Insurance","Actuarial Science","Procurement & Supply Chain Management","Hospitality & Tourism Management"],
  "Social Sciences": ["Economics","Political Science","Sociology","Psychology","Mass Communication","International Relations","Criminology & Security Studies","Geography","Social Work","Peace & Conflict Studies","Library & Information Science"],
  "Health & Medical Sciences": ["Medicine & Surgery","Nursing","Pharmacy","Medical Laboratory Science","Public Health","Physiotherapy","Dentistry","Radiography","Anatomy","Physiology","Biochemistry","Nutrition & Dietetics","Optometry","Environmental Health"],
  "Natural & Physical Sciences": ["Mathematics","Statistics","Physics","Chemistry","Biology","Microbiology","Biotechnology","Geology","Zoology","Botany","Industrial Chemistry","Marine Biology","Science Laboratory Technology"],
  "Agriculture & Environment": ["Agriculture","Agricultural Economics","Animal Science","Crop Science","Fisheries & Aquaculture","Food Science & Technology","Forestry","Soil Science","Environmental Science","Estate Management","Architecture","Urban & Regional Planning","Quantity Surveying","Surveying & Geoinformatics","Building Technology"],
  "Education": ["Educational Management","Guidance & Counselling","Science Education","Mathematics Education","Computer Education","Business Education","Early Childhood Education","Primary Education","Physical & Health Education","Special Education","Educational Technology","Adult Education"],
  "Arts & Humanities": ["English Language","Linguistics","History & International Studies","Philosophy","Religious Studies","Theatre Arts","Music","Fine & Applied Arts","Yoruba","Igbo","Hausa","French","Arabic","Christian Religious Studies","Islamic Studies"],
  "Law": ["Law"],
};
const ALL_COURSES = Object.values(COURSES).flat();
const OTHER = "Other (type your own)";
const VIEWS = ["home", "topics", "projects", "library", "dash", "project", "work"];
const NEEDS_PROJECT = ["project", "work"];

// The current page lives in the address bar (#/library, #/project/5), so a reload keeps you where you were.
const parseHash = () => {
  const [v, id] = location.hash.replace(/^#\/?/, "").split("/");
  return { v: VIEWS.includes(v) ? v : "home", id: id ? Number(id) : null };
};
const readSaved = (key, fallback) => {
  try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("tt_token"));
  const [name, setName] = useState(localStorage.getItem("tt_name") || "");
  const [view, setView] = useState(() => {
    const { v } = parseHash();
    if (v === "topics" && !readSaved("tt_topics", []).length) return "home";
    return v;
  }); // home | topics | projects | library | dash | project | work
  const [form, setForm] = useState(() => readSaved("tt_form", { level: "BSc", department: "Computer Science", university: "University of Lagos", interest: "" }));
  const [otherDept, setOtherDept] = useState(() => !ALL_COURSES.includes(readSaved("tt_form", { department: "Computer Science" }).department));
  const [topics, setTopics] = useState(() => readSaved("tt_topics", []));
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("find");
  const [check, setCheck] = useState({ topic: "", result: null });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // keep the form and topic list across reloads
  useEffect(() => { try { sessionStorage.setItem("tt_form", JSON.stringify(form)); } catch {} }, [form]);
  useEffect(() => { try { sessionStorage.setItem("tt_topics", JSON.stringify(topics)); } catch {} }, [topics]);

  // ---- anti-copy (deterrent only; real protection is server-side preview limits) ----
  useEffect(() => {
    const stop = (e) => { const ed = /INPUT|TEXTAREA/.test(e.target.tagName) && !e.target.dataset.nocopy; if (!ed && !(e.type === "selectstart" && /INPUT|TEXTAREA/.test(e.target.tagName))) e.preventDefault(); };
    const key = (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c","x","a","s","p","u"].includes(k) && (!/INPUT|TEXTAREA/.test(e.target.tagName) || (e.target.dataset.nocopy && ["c","x"].includes(k)))) e.preventDefault();
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i","j","c"].includes(k))) e.preventDefault();
    };
    ["copy","cut","contextmenu","dragstart","selectstart"].forEach((ev) => document.addEventListener(ev, stop));
    document.addEventListener("keydown", key);
    return () => { ["copy","cut","contextmenu","dragstart","selectstart"].forEach((ev) => document.removeEventListener(ev, stop)); document.removeEventListener("keydown", key); };
  }, []);

  // On load: restore the open project from the address (or from the Paystack return link ?project=ID)
  useEffect(() => {
    if (!authed) return;
    const q = new URLSearchParams(location.search).get("project");
    const { v, id } = parseHash();
    const pid = q || (NEEDS_PROJECT.includes(v) && id);
    if (q) history.replaceState(null, "", location.pathname + "#/project/" + q); // so a later reload doesn't force this project again
    if (pid) {
      api(`/projects/${pid}`)
        .then((p) => { setProject(p); setView(q ? "project" : v); })
        .catch(() => setView("home"));
    }
  }, [authed]);

  // Write the current page into the address bar whenever it changes
  useEffect(() => {
    if (NEEDS_PROJECT.includes(view) && !project) return; // still loading the project
    const h = `#/${view}` + (NEEDS_PROJECT.includes(view) && project ? "/" + project.id : "");
    if (location.hash !== h) history.pushState(null, "", h);
  }, [view, project]);

  // Browser Back / Forward buttons
  useEffect(() => {
    const onPop = () => {
      const { v, id } = parseHash();
      if (NEEDS_PROJECT.includes(v) && id) {
        if (project && project.id === id) setView(v);
        else api(`/projects/${id}`).then((p) => { setProject(p); setView(v); }).catch(() => setView("home"));
      } else if (v === "topics" && !topics.length) setView("home");
      else setView(v);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [project, topics]);

  const openProject = (id) => api(`/projects/${id}`).then((p) => { setProject(p); setView("project"); });
  const run = async (fn) => { setBusy(true); setErr(""); try { await fn(); } catch (e) { setErr(e.message); } setBusy(false); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!authed) return <Auth onDone={(n) => { setName(n); setAuthed(true); }} />;

  return (
    <>
      <div className="wm">{Array(60).fill(`TT • ${name} • `).join("")}</div>
      <div className="shell"><div className="side">
        <div className="logo" onClick={() => setView("home")}>T<b>T</b><small>Search Made Easy</small></div>
        {[["home","Find Topics"],["projects","My Projects"],["library","Library"],["dash","Dashboard"]].map(([k,l]) => <div key={k} className={"si " + (view===k?"on":"")} onClick={() => setView(k)}>{l}</div>)}
        <div className="si mt-24">{name}</div>
        <div className="si" onClick={() => { localStorage.clear(); sessionStorage.clear(); location.hash = ""; location.reload(); }}>Logout</div>
      </div><div className="main">
      {NEEDS_PROJECT.includes(view) && !project && <div className="wrap"><p>Loading…</p></div>}
      {view === "projects" && <Projects open={openProject} />}
      {view === "library" && <Library start={(s) => { setForm({ ...form, level: s.level, department: s.department, university: s.university }); setOtherDept(!ALL_COURSES.includes(s.department)); run(async () => { setProject(await api("/projects", { level: s.level, department: s.department, university: s.university, topic: s.topic })); setView("project"); }); }} />}
      {view === "dash" && <Dashboard open={openProject} />}
      {view === "work" && project && <Workspace project={project} back={() => openProject(project.id)} />}

      {view === "home" && (
        <>
          <div className="hero">
            <h1>Find & Build Your University <span>Project</span></h1>
            <p>Tailored topics, complete research roadmaps and a full project document — from BSc to PhD.</p>
          </div>
          <div className="wrap pull-up">
            <div className="card">
              <div className="tabs">
                <div className={"tab " + (tab === "find" ? "on" : "")} onClick={() => setTab("find")}>Find Topics</div>
                <div className={"tab " + (tab === "check" ? "on" : "")} onClick={() => setTab("check")}>Check My Topic</div>
              </div>
              <div className="row">
                <select value={form.level} onChange={set("level")}><option>BSc</option><option>MSc</option><option>PhD</option></select>
                <select
                  value={otherDept ? OTHER : form.department}
                  onChange={(e) => {
                    if (e.target.value === OTHER) { setOtherDept(true); setForm({ ...form, department: "" }); }
                    else { setOtherDept(false); setForm({ ...form, department: e.target.value }); }
                  }}
                >
                  {Object.entries(COURSES).map(([group, list]) => (
                    <optgroup key={group} label={group}>{list.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>
                  ))}
                  <option value={OTHER}>{OTHER}</option>
                </select>
                {otherDept && <input value={form.department} onChange={set("department")} placeholder="Type your course e.g. Biomedical Science" />}
                <UniversityInput value={form.university} onChange={(u) => setForm((f) => ({ ...f, university: u }))} />
              </div>
              {tab === "find" ? (
                <div className="row mt-10">
                  <input value={form.interest} onChange={set("interest")} placeholder="Interest e.g. Artificial Intelligence + Healthcare" className="flex-3" />
                  <button className="btn" disabled={busy} onClick={() => run(async () => { setTopics((await api("/topics", form)).topics); setView("topics"); })}>{busy ? "Generating…" : "Search"}</button>
                </div>
              ) : (
                <>
                  <textarea rows={3} className="mt-10" placeholder="Paste your proposed topic" value={check.topic} onChange={(e) => setCheck({ ...check, topic: e.target.value })} />
                  <button className="btn mt-10" disabled={busy} onClick={() => run(async () => setCheck({ ...check, result: await api("/check-topic", { ...form, topic: check.topic }) }))}>{busy ? "Checking…" : "Check Topic"}</button>
                  {check.result && (
                    <div className="card mt-12">
                      <h3>{{ Strong: "🟢", "Needs modification": "🟡" }[check.result.verdict] || "🔴"} {check.result.verdict}</h3>
                      <p>{check.result.strength}</p><p><b>Gap:</b> {check.result.research_gap}</p><p><b>Feasibility:</b> {check.result.feasibility}</p>
                      <b>Better titles</b><ol>{check.result.suggestions?.map((s) => <li key={s}>{s}</li>)}</ol>
                    </div>
                  )}
                </>
              )}
              {err && <div className="err">{err}</div>}
            </div>
          </div>
        </>
      )}

      {view === "topics" && (
        <div className="wrap">
          <button className="btn ghost" onClick={() => setView("home")}>← Back</button>
          <h2>Project Topics — {form.level}, {form.department}</h2>
          <p className="muted">{topics.length} topics found. Choose one to see the preview.</p>
          {err && <div className="err">{err}</div>}
          {topics.map((t, i) => (
            <div key={i} className="card topic" onClick={() => run(async () => { setProject(await api("/projects", { ...form, topic: t })); setView("project"); })}>
              <div className="topic-head">
                <b>{i + 1}. {t.title}</b><span><span className="pill g">{t.relevance} Relevance</span><span className={"pill " + t.difficulty}>{t.difficulty}</span></span>
              </div>
              <p>{t.description}</p>{t.tags?.map((x) => <span className="pill" key={x}>{x}</span>)}
              <div><button className="btn ghost mt-8" onClick={(e) => { e.stopPropagation(); api("/library", { ...form, topic: t }).then(() => setErr("Saved to Library ✓")); }}>☆ Save</button></div>
            </div>
          ))}
          {busy && <p>Building your project preview…</p>}
        </div>
      )}

      {view === "project" && project && (
        <div className="wrap">
          <button className="btn ghost" onClick={() => setView(topics.length ? "topics" : "projects")}>← {topics.length ? "Topics" : "My Projects"}</button>
          <h2>{project.title}</h2>
          <div className="card">
            <span className="pill g">{project.level}</span><span className="pill">{project.topic.est_time}</span><span className="pill">{project.topic.difficulty}</span>
            <p><b>Research gap:</b> {project.topic.research_gap}</p>
            <p><b>Technologies:</b> {project.topic.technologies?.join(", ")}</p>
          </div>
          <div className="card"><h3>Research Roadmap</h3>
            {project.sections.map((s, i) => <div className="road" key={s}><div className="num">{i + 1}</div>{s}<span className="road-status">{i === 0 ? "Preview" : project.paid ? "Ready" : "🔒 Locked"}</span></div>)}
          </div>
          <div className="card"><h3>Chapter 1 — Preview</h3>
            <div className="pre-wrap">{project.excerpt}</div>
            <div className="blur mt-8">Chapter 1 continues with the scope, definitions, significance and the remaining chapters of the complete project document…</div>
          </div>
          <div className="lock">
            {project.paid ? (
              <button className="btn" onClick={() => setView("work")}>Open project workspace</button>
            ) : (
              <>
                <p>Unlock the complete project document for <b>₦{project.price.toLocaleString()}</b></p>
                <button className="btn" disabled={busy} onClick={() => run(async () => { const r = await api(`/projects/${project.id}/pay`, {}); location.href = r.url; })}>Pay & Unlock Download</button>
              </>
            )}
          </div>
          {err && <div className="err">{err}</div>}
        </div>
      )}
    </div></div></>
  );
}

function Auth({ onDone }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const submit = async () => {
    try {
      const r = await api(`/auth/${mode}`, f);
      localStorage.setItem("tt_token", r.token); localStorage.setItem("tt_name", r.name); onDone(r.name);
    } catch (e) { setErr(e.message); }
  };
  return (
    <div className="hero auth-hero">
      <div className="logo auth-logo">T<b>T</b><small>Search Made Easy</small></div>
      <div className="card auth-card">
        <h3>{mode === "login" ? "Log in" : "Create account"}</h3>
        {mode === "register" && <input placeholder="Full name" onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input className="mt-8" placeholder="Email" onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className="my-8" type="password" placeholder="Password" onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <div className="err">{err}</div>}
        <button className="btn" onClick={submit}>{mode === "login" ? "Log in" : "Sign up"}</button>
        <p className="link-orange" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "New here? Sign up" : "Have an account? Log in"}</p>
      </div>
    </div>
  );
}
