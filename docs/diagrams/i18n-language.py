"""Regenerate i18n-language.excalidraw / i18n-language.png.

This script drives the repo's `excalidraw-diagrams` skill
(.claude/skills/excalidraw-diagrams). It is committed so the diagram
can be regenerated deterministically, but the portable source of truth
for anyone without the skill is `i18n-language.excalidraw` - open it at
excalidraw.com or with the VS Code Excalidraw extension.

    python3 docs/diagrams/i18n-language.py
    node .claude/skills/excalidraw-diagrams/scripts/export_playwright.js \
        docs/diagrams/i18n-language.excalidraw docs/diagrams/i18n-language.png
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", ".claude", "skills", "excalidraw-diagrams", "scripts"))
from excalidraw_generator import Diagram  # noqa: E402

d = Diagram()

d.text_box(60, 20, "Hypertube - UI language (HYP-56)", font_size=24)
d.text_box(60, 62, "At login the winner is: account language > manual choice > browser > English", font_size=16, color="gray")

# ================= 1. Page load =================
d.text_box(60, 120, "1. Page load, before the first render (no account known yet)", font_size=18, color="violet")

load = d.box(60, 190, "Page load\nlib/i18n.ts init", color="blue", width=200, height=70)
stored = d.box(330, 165, "Manual choice in\nlocalStorage?", color="yellow", shape="diamond", width=240, height=120)
browser = d.box(650, 165, "Browser language\nsupported?\n(fr-CA gives fr)", color="yellow", shape="diamond", width=260, height=120)
english = d.box(990, 190, "English\n(default)", color="gray", width=180, height=70)
first = d.box(480, 340, "UI language set\nbefore the first render", color="green", width=280, height=70)

d.arrow_between(load, stored, from_side="right", to_side="left")
d.arrow_between(stored, browser, "no", from_side="right", to_side="left")
d.arrow_between(browser, english, "no", from_side="right", to_side="left")
d.arrow_between(stored, first, "yes", from_side="bottom", to_side="top")
d.arrow_between(browser, first, "yes", from_side="bottom", to_side="right")
d.arrow_between(english, first, from_side="bottom", to_side="right")

# ================= 2. Account known =================
d.text_box(60, 460, "2. Once the account is known (login, or reload with a token)", font_size=18, color="violet")

me = d.box(60, 530, "AuthProvider\nGET /users/me", color="blue", width=200, height=70)
sync = d.box(340, 530, "useLanguageSync\n(mounted in App)", color="blue", width=220, height=70)
apply_ = d.box(700, 530, "i18n.changeLanguage(\nuser.preferredLanguage)", color="blue", width=260, height=70)
rerender = d.box(1060, 530, "UI re-renders\n<html lang> follows", color="green", width=220, height=70)

d.arrow_between(me, sync, from_side="right", to_side="left")
d.arrow_between(sync, apply_, "user set", from_side="right", to_side="left")
d.arrow_between(apply_, rerender, from_side="right", to_side="left")
d.text_box(340, 625, "Logged out: back to manual choice, then browser, then English", font_size=14, color="gray")

# ================= 3. The user picks a language =================
d.text_box(60, 690, "3. The user picks a language", font_size=18, color="violet")

pick = d.box(60, 760, "LanguageSwitcher\n<select>", color="blue", width=200, height=70)
change = d.box(340, 760, "i18n.changeLanguage\n(immediate)", color="blue", width=220, height=70)
local = d.box(760, 700, "localStorage\nhypertube_language", color="green", width=240, height=70)
patch = d.box(760, 830, "PATCH /users/:id\n{ preferredLanguage }", color="violet", width=240, height=70)
col = d.box(1100, 830, "users.preferredLanguage", color="green", shape="ellipse", width=260, height=80)

d.arrow_between(pick, change, from_side="right", to_side="left")
d.arrow_between(change, local, "always", from_side="right", to_side="left")
d.arrow_between(change, patch, "logged in", from_side="right", to_side="left")
d.arrow_between(patch, col, from_side="right", to_side="left")

# ================= 4. Registration =================
d.text_box(60, 960, "4. Registration", font_size=18, color="violet")

regpage = d.box(60, 1030, "Register page", color="blue", width=200, height=70)
post = d.box(340, 1020, "POST /users\n{ ..., preferredLanguage:\nthe UI language }", color="violet", width=280, height=90)
col2 = d.box(720, 1030, "users.preferredLanguage", color="green", shape="ellipse", width=260, height=80)

d.arrow_between(regpage, post, from_side="right", to_side="left")
d.arrow_between(post, col2, from_side="right", to_side="left")
d.text_box(
    60,
    1150,
    "Why: without it a new account is saved as 'en', and the first login flips a French visitor back to English.",
    font_size=14,
    color="gray",
)

d.save(os.path.join(HERE, "i18n-language.excalidraw"))
print("written")
