"""Regenerate auth-logout.excalidraw / auth-logout.png.

This script drives the repo's `excalidraw-diagrams` skill
(.claude/skills/excalidraw-diagrams). It is committed so the diagram
can be regenerated deterministically, but the portable source of truth
for anyone without the skill is `auth-logout.excalidraw` - open it at
excalidraw.com or with the VS Code Excalidraw extension.

    python3 docs/diagrams/auth-logout.py
    node .claude/skills/excalidraw-diagrams/scripts/export_playwright.js \
        docs/diagrams/auth-logout.excalidraw docs/diagrams/auth-logout.png
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", ".claude", "skills", "excalidraw-diagrams", "scripts"))
from excalidraw_generator import Diagram  # noqa: E402

d = Diagram()

d.text_box(60, 20, "Hypertube - one-click logout (HYP-35, HYP-77, ADR-0011)", font_size=24)
d.text_box(60, 62, "Two things happen on the click: the server revokes the session (not awaited), and the browser forgets the access token right away", font_size=16, color="gray")

# ================= Row 1: the request =================
click = d.box(60, 155, "User clicks\nLog out", color="gray", width=200, height=70)
logout = d.box(300, 155, "AuthProvider\nlogout()", color="blue", width=200, height=70)
req = d.box(660, 155, "POST /auth/logout\n+ refresh cookie", color="violet", width=220, height=70)
cookie = d.box(960, 130, "refresh cookie\nsent?", color="yellow", shape="diamond", width=240, height=120)
ok = d.box(1280, 130, "revoke the whole session\nclear the cookie -> 204", color="green", width=280, height=70)
none = d.box(1280, 230, "nothing to revoke\nstill 204", color="gray", width=280, height=60)

d.arrow_between(click, logout, from_side="right", to_side="left")
d.arrow_between(logout, req, "async", from_side="right", to_side="left")
d.arrow_between(req, cookie, from_side="right", to_side="left")
d.arrow_between(cookie, ok, "yes", from_side="right", to_side="left")
d.arrow_between(cookie, none, "no", from_side="bottom", to_side="left")
d.text_box(560, 285, "Not awaited: failures are dropped", font_size=14, color="gray")

# ================= Row 2: the local sign-out =================
local = d.box(230, 420, "logoutLocal()\nremove token, clear query cache", color="blue", width=360, height=70)
dispatch = d.box(680, 420, "dispatch\n{ type: 'logout' }", color="blue", width=220, height=70)
anon = d.box(980, 420, "RequireAuth sees\n'anonymous'", color="blue", width=220, height=70)
login = d.box(1280, 420, "Redirect to /login", color="green", width=220, height=70)

d.arrow_between(logout, local, "runs right away", from_side="bottom", to_side="top")
d.arrow_between(local, dispatch, from_side="right", to_side="left")
d.arrow_between(dispatch, anon, from_side="right", to_side="left")
d.arrow_between(anon, login, from_side="right", to_side="left")

# ================= The limit =================
d.box(60, 570, "A copied access token still works until JWT_EXPIRES_IN (15 min by default),\nbut the refresh token is dead: nothing can renew it", color="yellow", width=800, height=80)
d.text_box(60, 680, "Why: access tokens are stateless (ADR-0002), no lookup per request. Public route: it must work with an expired access token.", font_size=14, color="gray")
d.text_box(60, 710, "Listed in docs/defense/known-limitations.md.", font_size=14, color="gray")

d.save(os.path.join(HERE, "auth-logout.excalidraw"))
print("written")
