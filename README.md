# RapidShare Local

Fast, minimal local network file sharing using Firebase Firestore for discovery and presence.

## 🚀 Features
- **Zero Configuration**: Discovery works automatically based on your public IP address (Network Node).
- **Real-time Presence**: Instantly see other devices on your network as they come online.
- **Live Transfer Stream**: Monitor active file transfers with progress bars, speed, and ETA.
- **Cross-Platform**: Fully responsive design that works on mobile, tablet, and desktop browsers.
- **Privacy-First**: No account creation required; device identity is stored locally.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: Firebase Firestore (for signaling and presence)
- **Styling**: Tailwind CSS + ShadCN UI
- **Icons**: Lucide React
- **Animations**: Tailwind Animate

## 💻 Getting Started

### 1. Prerequisities
- Node.js 18.x or later
- A Firebase project with Firestore enabled

### 2. Installation
1. Download or clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Configuration
Ensure your `src/firebase/config.ts` matches your Firebase project credentials.

### 4. Running the App
Start the development server:
```bash
npm run dev
```
Open [http://localhost:9002](http://localhost:9002) in multiple browsers or devices on the same network to see discovery in action.

## 📁 Project Structure
- `/src/app/page.tsx`: Main dashboard and logic.
- `/src/components/`: Reusable UI components and cards.
- `/src/firebase/`: Firebase initialization and custom hooks.
- `/src/lib/`: Types and utility functions.
