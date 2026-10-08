const tk = () => localStorage.getItem("tt_token") || "";
export async function api(path, body, method) {
  const r = await fetch("/api" + path, {
    method: method || (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + tk() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Request failed");
  return r.json();
}
export async function downloadProject(id, title) {
  const r = await fetch(`/api/projects/${id}/download`, { headers: { Authorization: "Bearer " + tk() } });
  if (!r.ok) throw new Error("Download failed");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await r.blob()); a.download = title.slice(0, 50) + ".docx"; a.click();
}
