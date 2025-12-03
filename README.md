# SkillBridge‑Connect

> A human‑centric marketplace connecting skilled workers directly with customers for trusted services.

SkillBridge‑Connect (this repository) is an active prototype of a platform that enables workers to create profiles, upload certificates, and receive bookings from customers while providing admin tools for verification and moderation.

## Quick Start

- Clone the repo and enter the project folder:
  ```bash
  git clone <your-repo-url>
  cd SKILLBRIDGE-CONNECT
  ```
- Install dependencies:
  ```bash
  npm install
  npm install socket
  ```
- (Optional) Import database schema into MySQL:
  ```bash
  mysql -u root -p < database/schema.sql
  ```
- Run in development:
  ```bash
  npm run dev
  ```
- Open the app at `http://localhost:3000`

## Features

- Worker profiles with skills, experience, and certificates
- Certificate upload and admin verification workflow with verified badges
- Booking requests and status management (accept / reject / reschedule)
- Keyword and semantic search with a chat assistant for natural queries
- Localization support with persisted language selection
- Admin verification queue and moderation scaffolding

## Architecture & Tech Stack

- Frontend: Vanilla HTML/CSS/JavaScript (`public/`)
- Backend: Node.js + Express (`server.js`)
- Database: MySQL (schema in `database.sql`)
- File uploads: stored in `uploads/` (certificates/images)
- Realtime (planned): Socket.IO
- Auth: JWT-based middleware in `server.js`

## Folder Structure

- `public/` — frontend assets (`index.html`, `app.js`, `style.css`)
- `uploads/` — uploaded files (certificates, images)
- `server.js` — Express server and API routes
- `database.sql` — database schema
- `package.json` — dependencies and scripts

## Environment Variables

Create a `.env` with the following (example):

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASS=yourpassword
DB_NAME=skillbridge
JWT_SECRET=your_jwt_secret
API_BASE_URL=http://localhost:3000/api
STRIPE_SECRET_KEY=your_stripe_key
SMTP_URL=smtp://...
# TWILIO or other notification provider keys as needed
```

## Important Scripts

- `npm run dev` — start development server
- `npm test` — run tests (add tests as project grows)
- `npm run build` — build frontend (if a bundler is added)

## API Endpoints (overview)

- `GET /api/workers` — list workers
- `GET /api/workers/:id` — get worker profile
- `POST /api/certificates` — upload certificates
- `GET /api/certificates/:workerId` — fetch profile certificates
- `POST /api/bookings` — create a booking
- `GET /api/semantic-search?q=...` — semantic search endpoint

> Adjust endpoints to match any refactors you make.

## Security & Best Practices

- Validate and sanitize all user inputs on the server
- Enforce HTTPS and use `helmet`, rate limiting, and CORS policies
- Store secrets in environment variables (do not commit them)
- Enforce RBAC (Admin / Worker / Customer) on sensitive routes

## Roadmap (short‑term)

- RBAC & admin dashboard (verification queue)
- Certificate verification UI + verified badges
- Fuse.js fuzzy search and geolocation (Mapbox / Google) enhancements
- Real‑time chat (Socket.IO) and booking calendar
- Payments (Stripe / Paytm) and notification services

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes with clear messages
4. Open a Pull Request and include screenshots for UI changes

## Testing & Local Development Notes

- Ensure MySQL is running and schema is imported if your local flow depends on it
- Start the server with `npm run dev`
- Use the browser console to debug assistant/semantic-search logs

## Troubleshooting

- If data isn't loading, confirm `API_BASE_URL` and that the backend is running
- Check `uploads/` write permissions for certificate uploads
- Inspect browser console and server logs for CORS or auth errors

## Credits

- Built by the SkillBridge team — contributions welcome.

## License

Add a `LICENSE` file with your chosen license (for example, `MIT`).

## Contact

- For issues, open an issue in this repository or contact the maintainers.
