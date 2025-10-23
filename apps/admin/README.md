# STV Election Admin

Admin interface for managing STV elections.

## Features

- **Election Management**: Create, edit, and manage elections
- **Position Management**: Add positions with seat counts
- **Candidate Management**: Add/edit candidates with manifesto links
- **Voter Import**: Bulk CSV import of voters with token generation
- **Results Viewing**: View STV results with round-by-round breakdown

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

3. Open http://localhost:3001 in your browser

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

