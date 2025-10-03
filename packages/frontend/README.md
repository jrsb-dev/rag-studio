# RAG Studio Frontend

React + TypeScript frontend for RAG Studio.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **TanStack Query** - Server state management
- **React Router** - Routing

## Development

### Install Dependencies

```bash
pnpm install
```

### Start Development Server

```bash
pnpm dev
```

Frontend will be available at http://localhost:5173

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Project Structure

```
src/
├── api/          # API client
├── components/   # Reusable components
├── pages/        # Page components
├── lib/          # Utilities
├── App.tsx       # Main app component
└── main.tsx      # Entry point
```

## Environment Variables

Create `.env.local`:

```bash
VITE_API_URL=http://localhost:8000
```
