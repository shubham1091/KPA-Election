# STV Election Voter

Voter interface for participating in STV elections.

## Features

- **Election Discovery**: Browse open elections
- **Token Authentication**: Secure token-based voting access
- **Drag-and-Drop Ranking**: Intuitive candidate ranking system
- **Real-time Validation**: Ensures complete rankings before submission
- **Results Viewing**: Public access to election results

## Getting Started

### Prerequisites

- Node.js 18+
- Backend server running on port 5000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── pages/         # Page components
├── components/    # Reusable components
├── App.tsx        # Main app component with routing
├── main.tsx       # App entry point
└── index.css      # Global styles
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

