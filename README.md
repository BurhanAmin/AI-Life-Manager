# 🧠 AI Life Manager

### *A voice-first, context-aware personal advisor that actually remembers you.*

---

Most productivity apps are glorified to-do lists. 📋 They don't know you had a rough week, that your sleep has been off, or that you tend to drift when there's nothing on the calendar.

AI Life Manager is built around a single idea:

> **An advisor is only useful if it carries context forward.**
> Every conversation builds on the last. 🔁

---

##  What it does

You check in with it — 🎙️ by voice or ⌨️ text — in the morning and evening. It knows your goals, your habits, what's on your calendar, and the patterns it's noticed about you over time. It talks back like someone who's been paying attention: direct when you need a push, gentle when you're running on empty, and never with hollow *"you've got this!"* filler.

| | Feature | What it means |
|---|---|---|
| 🎙️ | **Voice or text** | Speak your check-in and hear the response back, or type instead — toggle mid-conversation |
| 🧩 | **Persistent memory** | Condenses every session into a rolling summary and references past chats naturally |
| 🌅 | **Morning & evening sessions** | Mornings open themselves and flag the day ahead; evenings reflect and set up tomorrow |
| 🎭 | **Adaptive tone** | Shifts between four modes based on your data *and* what you actually say |
| ✅ | **Habit tracking** | Daily habits feed directly into how the advisor reads your state |
| 📅 | **Built-in calendar** | Events, deadlines, and exams surface inside your sessions |
| 📊 | **Weekly review** | An honest recap — wins, what slipped, the pattern to notice, one focus for next week |

---

## 🧠 How the memory works

The system is **stateless by design** — no server-side memory holding things together. Instead, every message rebuilds full context from scratch:

```
profile  +  goals  +  habits  +  recent logs  +  calendar  +  rolling summary
                                  ⬇️
                    assembled into the advisor's instructions
                                  ⬇️
                            sent with your message
                                  ⬇️
              session ends → condensed back into the summary 🔁
```

The next session picks up right where the last left off. The result is an advisor that *feels* continuous without ever holding state in memory.

---

##  Tone sensing

Tone works in **two layers**:

```
📈 Layer 1 — Baseline
   Computed from your habit-completion rate + flagged patterns
                          ⬇️
🔍 Layer 2 — Live sensing
   A lightweight classifier reads what you JUST said
                          ⬇️
        🟢 Live signal overrides the stale baseline
```

So a strong week of habits won't stop the advisor from easing off the moment you say you're worn out. Tell it nothing — it still reads the room. 👀

---

## 🛠️ Tech stack

| Layer | Stack |
|---|---|
| 🎨 **Frontend** | React + Vite — custom *"paper"* design system (warm off-white, serif headings, zero colored accents) |
| ⚙️ **Backend** | Node.js + Express — fully stateless |
| 🗄️ **Data & Auth** | Supabase (Postgres + row-level security) |
| 🤖 **AI** | Claude → conversation, tone sensing, reviews · Whisper → speech-to-text · ElevenLabs → text-to-speech |



> A personal project — built and used by one person, refined around what actually makes a daily check-in *stick*.