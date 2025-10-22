# Meno Web

A modern React frontend application built with TypeScript, Vite, Tailwind CSS, and shadcn/ui components.

## 🚀 Technology Stack

- **React 18** - Modern React with hooks and TypeScript
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible UI components with slate theme
- **Fetch API** - Native HTTP client for API communication

## 📁 Project Structure

```
meno-web/
├── src/
│   ├── components/
│   │   └── ui/              # shadcn/ui components (Button, Card, etc.)
│   ├── features/            # Feature modules (future)
│   ├── lib/
│   │   ├── api.ts          # API client with fetch
│   │   └── utils.ts        # Utility functions (cn helper)
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   ├── styles/
│   │   └── globals.css     # Tailwind CSS + theme configuration
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
├── dist/                   # Production build output
├── .env.development        # Development environment variables
├── .env.production         # Production environment variables
└── .env.example            # Environment variables template
```

## 🛠️ Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.development
   # Edit .env.development and set VITE_API_URL to your backend URL
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

## 📜 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## 🌐 API Configuration

The application uses environment variables to configure the backend API:

### Development
- API calls to `/api/*` are proxied to `VITE_API_URL` (default: `http://localhost:8080`)
- This avoids CORS issues during development
- Configure in `.env.development`

### Production
- API calls use the full URL from `VITE_API_URL`
- Set this in `.env.production` or via your deployment platform
- Example: `VITE_API_URL=https://api.example.com`

### Using the API Client

```typescript
import api from '@/lib/api'

// GET request
const data = await api.get<ResponseType>('/endpoint')

// POST request
const result = await api.post<ResponseType>('/endpoint', { data: 'value' })

// PUT, PATCH, DELETE
await api.put('/endpoint', { data: 'value' })
await api.patch('/endpoint', { data: 'value' })
await api.delete('/endpoint')
```

## 🎨 UI Components (shadcn/ui)

The project includes shadcn/ui components with the **slate theme**:

- **Button** - Multiple variants (default, outline, ghost, etc.)
- **Card** - Content containers with header, content, and footer

### Adding More Components

To add additional shadcn/ui components:

```bash
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
```

## 🏗️ Building for Production

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Output:**
   - Static files are generated in the `dist/` directory
   - `dist/index.html` - Main HTML file
   - `dist/assets/` - JavaScript and CSS bundles with hashed names

3. **Deployment:**
   - Deploy the `dist/` directory to your static hosting service
   - Configure your web server to serve `index.html` for all routes (SPA mode)
   - Set `VITE_API_URL` environment variable for production API endpoint

### Server Configuration Examples

**Nginx:**
```nginx
server {
    listen 80;
    server_name example.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 🎯 Development Features

- ✅ TypeScript for type safety
- ✅ Hot Module Replacement (HMR) with Vite
- ✅ Path aliases (`@/` maps to `src/`)
- ✅ ESLint for code quality
- ✅ Tailwind CSS v4 with custom theme
- ✅ shadcn/ui components with slate theme
- ✅ API proxy for development (no CORS issues)
- ✅ Environment-based configuration
- ✅ Production-ready build output

## 🔧 Customization

### Theme Colors
Edit `src/styles/globals.css` to customize the slate theme colors:
```css
@theme {
  --color-primary: 215.4 16.3% 46.9%;
  --color-secondary: 210 40% 96.1%;
  /* ... other colors */
}
```

### TypeScript Configuration
- `tsconfig.app.json` - Application TypeScript config
- `tsconfig.node.json` - Node/Vite TypeScript config
- Path aliases configured in both tsconfig and vite.config.ts

## 📦 Dependencies

### Production
- `react` - UI library
- `react-dom` - React DOM rendering
- `clsx` - Conditional className utility
- `tailwind-merge` - Merge Tailwind classes
- `class-variance-authority` - Component variants

### Development
- `vite` - Build tool
- `typescript` - Type system
- `tailwindcss` - CSS framework
- `@tailwindcss/postcss` - Tailwind PostCSS plugin
- `eslint` - Code linting
- `@vitejs/plugin-react` - React support for Vite

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Please contact the team for contribution guidelines.
