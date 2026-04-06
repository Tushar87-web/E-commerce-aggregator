import re

file_path = '../app.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# We want to replace everything from "// ─── MOCKED BACKEND DATA" 
# to the end of the `async function api(path, opts = {}) { ... }` block,
# which ends just before "// ─── Init ─────────────────────────────────────────────────────"

pattern = re.compile(r'// ─── MOCKED BACKEND DATA.+?// ─── Init', re.DOTALL)

new_api = """// ─── API Helper ───────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  opts.headers = { ...headers, ...opts.headers };
  const res = await fetch(`http://localhost:5000/api${path}`, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

// ─── Init"""

new_content = pattern.sub(new_api, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Patch applied to app.js successfully.")
