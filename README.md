# 🎰 Royal Casino

<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/divyanshjha30/project?color=blueviolet&style=for-the-badge)
![GitHub stars](https://img.shields.io/github/stars/divyanshjha30/project?color=yellow&style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/divyanshjha30/project?color=orange&style=for-the-badge)

**A real-time multiplayer card game platform featuring Blackjack and Poker with live game state synchronization, player profiles, achievements, and a full chip economy.**

[Live Demo](https://royal-casino-dj.netlify.app) · [Report Bug](https://github.com/divyanshjha30/project/issues)

</div>

---

## ✨ Features

- **Multiplayer Rooms** — Create or join game rooms with real-time player synchronization
- **Blackjack Engine** — Full blackjack logic with hit, stand, double down, and dealer AI
- **Poker Support** — Texas Hold'em with betting rounds and hand evaluation
- **Real-time Sync** — Supabase Realtime subscriptions for instant game state updates
- **Player Profiles** — Customizable avatars, banner gradients, and display names
- **Level & XP System** — Earn experience and level up through gameplay
- **Achievements** — Unlock badges for milestones (first win, win streaks, high stakes)
- **Game History** — Track all past games with detailed results
- **Chip Economy** — Start with chips, bet strategically, grow your bankroll
- **Row-Level Security** — Supabase RLS policies ensure secure multiplayer state
- **Responsive UI** — Gorgeous dark-themed interface with Framer Motion animations

---

## 🛠️ Tech Stack

| Technology          | Purpose                           |
| ------------------- | --------------------------------- |
| **React 18**        | UI framework                      |
| **TypeScript**      | Type safety                       |
| **Vite 5**          | Build tool & dev server           |
| **Tailwind CSS 3**  | Utility-first styling             |
| **Framer Motion**   | Animations & transitions          |
| **Supabase**        | Auth, database, realtime, storage |
| **React Router v7** | Client-side routing               |
| **Lucide React**    | Icon library                      |
| **React Hot Toast** | Notifications                     |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project

### Installation

```bash
git clone https://github.com/divyanshjha30/project.git
cd project
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

---

## 📂 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── BlackjackGameView.tsx
│   ├── GameRoom.tsx
│   ├── GameTable.tsx
│   ├── PlayerAvatar.tsx
│   ├── PlayerTooltip.tsx
│   └── UsernameInput.tsx
├── constants/          # Static data (banners, achievements)
├── contexts/           # React Context (GameContext)
├── pages/              # Route pages (Home, Profile, GameHistory)
├── types/              # TypeScript interfaces
├── lib/                # Supabase client setup
└── App.tsx             # Router & layout
```

---

## 🎮 How It Works

1. **Sign up / Log in** with email & password (Supabase Auth)
2. **Create a room** or join an existing one from the lobby
3. **Ready up** — once all players are ready, the game starts
4. **Play** — make your moves in real-time; all players see updates instantly
5. **Win chips** — results update your profile stats and XP

---

## 🌐 Deployment

Deployed on **Netlify** with continuous deployment from the `master` branch.

---

## 📜 License

This project is open source under the [MIT License](LICENSE).

---

## 👤 Author

**Divyansh Jha**  
[Portfolio](https://divyanshjha.netlify.app) · [LinkedIn](https://linkedin.com/in/divyanshjha30) · [GitHub](https://github.com/divyanshjha30)
