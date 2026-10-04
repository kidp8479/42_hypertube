"""Regenerate auth-flow.excalidraw / auth-flow.png.

This script drives the personal `excalidraw-diagrams` skill
(~/.claude/skills/excalidraw-diagrams). It is committed so the diagram
can be regenerated deterministically, but the portable source of truth
for anyone without the skill is `auth-flow.excalidraw` - open it at
excalidraw.com or with the VS Code Excalidraw extension.

    python3 docs/diagrams/auth-flow.py
    node ~/.claude/skills/excalidraw-diagrams/scripts/export_playwright.js \
        docs/diagrams/auth-flow.excalidraw docs/diagrams/auth-flow.png
"""

import os
import sys

sys.path.insert(0, os.path.expanduser("~/.claude/skills/excalidraw-diagrams/scripts"))
from excalidraw_generator import Diagram  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

d = Diagram()

d.text_box(60, 20, "Hypertube - authentication flow (HYP-10 / HYP-44 / HYP-46 / HYP-11 / HYP-53)", font_size=24)

# ================= Column A: create an account =================
d.text_box(60, 90, "1. Create an account   POST /users", font_size=18, color="violet")

cli0 = d.box(120, 150, "Client", color="gray", width=110, height=54)
reg = d.box(70, 250, "UsersController.create", color="violet", width=210, height=56)
hash_ = d.box(70, 350, "argon2.hash(password)", color="blue", width=210, height=56)
dec0 = d.box(
    70,
    455,
    "email or username\nalready taken?",
    color="yellow",
    shape="diamond",
    width=210,
    height=110,
)
r409 = d.box(70, 640, "409 Conflict\n(generic message)", color="red", width=210, height=56)
save = d.box(360, 470, "users.save()\n(INSERT)", color="green", width=200, height=56)
created = d.box(370, 360, "201 Created\n(password excluded)", color="green", width=180, height=56)

d.arrow_between(
    cli0,
    reg,
    "email, username,\nfirstName, lastName,\npassword",
    from_side="bottom",
    to_side="top",
)
d.arrow_between(reg, hash_, from_side="bottom", to_side="top")
d.arrow_between(hash_, dec0, from_side="bottom", to_side="top")
d.arrow_between(dec0, r409, "yes", from_side="bottom", to_side="top")
d.arrow_between(dec0, save, "no", from_side="right", to_side="left")
d.arrow_between(save, created, from_side="top", to_side="bottom")
d.arrow_between(created, cli0, "201", from_side="top", to_side="right")

d.text_box(
    60,
    730,
    "409 message never says which field clashed - no\n"
    "account-enumeration by status or text (HYP-50 tracks\n"
    "the residual 201-vs-409 status-code oracle).\n"
    "Rate limit: 10 sign-ups / hour / IP.",
    font_size=13,
    color="gray",
)

# ================= Column B: get a token =================
d.text_box(830, 90, "2. Get a token   POST /auth/login", font_size=18, color="violet")

cli = d.box(890, 150, "Client", color="gray", width=110, height=54)
login = d.box(840, 250, "AuthController", color="violet", width=210, height=56)
valid = d.box(840, 350, "validateUser()", color="blue", width=210, height=56)
dec1 = d.box(840, 455, "credentials valid?", color="yellow", shape="diamond", width=210, height=110)
r401 = d.box(840, 640, "401 Unauthorized", color="red", width=210, height=56)
sign = d.box(1130, 470, "sign JWT (sub: id)", color="green", width=200, height=56)
tok = d.box(1140, 360, "access_token", color="green", width=180, height=56)

d.arrow_between(cli, login, "email + password", from_side="bottom", to_side="top")
d.arrow_between(login, valid, from_side="bottom", to_side="top")
d.arrow_between(valid, dec1, from_side="bottom", to_side="top")
d.arrow_between(dec1, r401, "no", from_side="bottom", to_side="top")
d.arrow_between(dec1, sign, "yes", from_side="right", to_side="left")
d.arrow_between(sign, tok, from_side="top", to_side="bottom")
d.arrow_between(tok, cli, "200", from_side="top", to_side="right")

d.text_box(
    830,
    730,
    "Wrong password and unknown email are indistinguishable:\n"
    "same body, same timing (argon2id + constant-time dummy hash).\n"
    "Rate limit: 5 attempts / min / IP.",
    font_size=13,
    color="gray",
)

# ================= Column C: use the token =================
d.text_box(1590, 90, "3. Use the token   any other route", font_size=18, color="violet")

cli2 = d.box(1640, 150, "Client + Bearer token", color="gray", width=270, height=54)
guard = d.box(1660, 250, "JwtAuthGuard (global)", color="violet", width=230, height=56)
decP = d.box(1660, 360, "route is @Public()?", color="yellow", shape="diamond", width=230, height=120)
skip = d.box(2020, 850, "handler runs\n(public route)", color="green", width=210, height=64)
strat = d.box(1660, 570, "JwtStrategy.validate", color="blue", width=230, height=56)
decO = d.box(1660, 690, "mutating own row?", color="yellow", shape="diamond", width=230, height=120)
r403 = d.box(1370, 722, "403 Forbidden", color="red", width=170, height=56)
hand = d.box(1660, 880, "route handler runs", color="green", width=230, height=56)

d.arrow_between(cli2, guard, from_side="bottom", to_side="top")
d.arrow_between(guard, decP, from_side="bottom", to_side="top")
d.arrow_between(decP, skip, "yes", from_side="right", to_side="top")
d.arrow_between(decP, strat, "no", from_side="bottom", to_side="top")
d.arrow_between(strat, decO, from_side="bottom", to_side="top")
d.arrow_between(decO, r403, "not owner", from_side="left", to_side="right")
d.arrow_between(decO, hand, "ok / read-only", from_side="bottom", to_side="top")
d.arrow_between(skip, hand, from_side="left", to_side="right")

d.text_box(
    1330,
    545,
    "Verify signature vs JWT_SECRET\nand not expired, then\nreq.user = { id: sub }",
    font_size=13,
    color="gray",
)

d.text_box(
    1590,
    960,
    "Reset password and logout: not built yet (HYP-10 follow-ups).",
    font_size=13,
    color="gray",
)

# ================= Row 4: sign in with 42 / GitHub =================
d.text_box(
    60,
    1040,
    "4. Sign in with 42 or GitHub   GET /auth/<provider>/login",
    font_size=18,
    color="violet",
)

W, H = 220, 60
XS = [60, 340, 620, 900, 1180, 1460, 1740, 2020]
YA = 1120

browser = d.box(XS[0], YA, "Browser", color="gray", width=W, height=H)
login_r = d.box(XS[1], YA, "login route\nsets nonce cookie", color="violet", width=W, height=H)
prov = d.box(XS[2], YA, "42 / GitHub\nuser consents", color="gray", width=W, height=H)
cb = d.box(XS[3], YA, "callback route\ncode + state", color="violet", width=W, height=H)
dec_state = d.box(XS[4], YA - 25, "state equals\ncookie?", color="yellow", shape="diamond", width=W, height=110)
resolve = d.box(XS[5], YA, "resolveOAuthUser\nfind / link / create", color="blue", width=W, height=H)
issue = d.box(XS[6], YA, "issue code\nsingle-use, 60 s", color="green", width=W, height=H)
spa = d.box(XS[7], YA, "302 to the SPA\n?code=...", color="green", width=W, height=H)
r401a = d.box(XS[4], 1310, "401\n(cookie cleared)", color="red", width=W, height=H)

d.arrow_between(browser, login_r, from_side="right", to_side="left")
d.arrow_between(login_r, prov, from_side="right", to_side="left")
d.arrow_between(prov, cb, from_side="right", to_side="left")
d.arrow_between(cb, dec_state, from_side="right", to_side="left")
d.arrow_between(dec_state, resolve, "yes", from_side="right", to_side="left")
d.arrow_between(dec_state, r401a, "no", from_side="bottom", to_side="top")
d.arrow_between(resolve, issue, from_side="right", to_side="left")
d.arrow_between(issue, spa, from_side="right", to_side="left")

YB = 1500
exch = d.box(XS[7], YB, "POST oauth/exchange\n{ code }", color="violet", width=W, height=H)
dec_code = d.box(XS[6], YB - 30, "code valid?\n(unused, < 60 s)", color="yellow", shape="diamond", width=W, height=120)
sign2 = d.box(XS[5], YB, "loginById\nsign JWT (sub: id)", color="green", width=W, height=H)
tok2 = d.box(XS[4], YB, "access_token\nto the SPA", color="green", width=W, height=H)
r401b = d.box(XS[6], 1690, "401 Unauthorized", color="red", width=W, height=H)

d.arrow_between(spa, exch, "SPA loads", from_side="bottom", to_side="top")
d.arrow_between(exch, dec_code, from_side="left", to_side="right")
d.arrow_between(dec_code, sign2, "yes", from_side="left", to_side="right")
d.arrow_between(sign2, tok2, from_side="left", to_side="right")
d.arrow_between(dec_code, r401b, "no", from_side="bottom", to_side="top")

d.text_box(
    60,
    1250,
    "login route sends the nonce as `state` and sets it in a cookie\n"
    "(HttpOnly, SameSite=Lax, Path=/auth, 10 min, cleared on every\n"
    "callback). It binds the callback to the browser that started\n"
    "the flow (login CSRF, ADR-0007).",
    font_size=13,
    color="gray",
)
d.text_box(
    60,
    1480,
    "Linking by email only when the provider vouches it is verified;\n"
    "linking revokes the local password (ADR-0007). The JWT never\n"
    "appears in a URL: the code does, single-use and 60 s.\n"
    "Unknown, used and expired codes all answer the same 401.",
    font_size=13,
    color="gray",
)

out = os.path.join(HERE, "auth-flow.excalidraw")
d.save(out)
print("written", out)
