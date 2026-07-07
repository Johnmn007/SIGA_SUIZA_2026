import re

dash_path = "D:/SIGA/siga_frontend/src/layouts/DashboardLayout.jsx"
with open(dash_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the missing quotes
content = re.sub(
    r"\{\[([a-zA-Z0-9_]+)',",
    r"{['\1',",
    content
)
content = re.sub(
    r", '([a-zA-Z0-9_]+)\]\.some",
    r", '\1'].some",
    content
)

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed quotes.")
