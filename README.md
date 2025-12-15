# FRMU Dashboard (Merchant Match Automator)

A secure, offline-first React application for managing Merchant data, "Held" merchants, and Relationship Manager details.

## Features
- **Excel Automation**: Parse, search, and update local Excel files directly.
- **Data Security**: Secure login and IndexedDB persistence.
- **Admin Tools**: Profile management and column mapping.
- **Analytics**: Visualization of flagged merchant data.

## Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Local Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:5173`.

### Deployment to Netlify
1. Connect this repository to your Netlify account.
2. Netlify will detect the settings from `netlify.toml` automatically:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
3. Click **Deploy**.

## Tech Stack
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (CDN)
- **Icons:** Lucide React
- **Data:** SheetJS (CDN) + IndexedDB
