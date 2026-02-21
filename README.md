# Tote Sonar

An open-source, self-hosted application for tracking items stored in physical containers (totes). Provides an intuitive interface for managing totes and their contents, generating QR code labels for easy physical identification, and searching across all stored items.

## Features

- **Tote Management** - Create, edit, and organize totes with metadata (name, location, size, color, owner)
- **Item Tracking** - Add items to totes with descriptions, quantities, and dynamic metadata tags
- **QR Code Labels** - Generate and print QR code labels for physical tote identification
- **Photo Management** - Upload up to 3 photos per item with automatic thumbnail generation
- **Global Search** - Search items by name, description, and metadata across all totes
- **Import/Export** - Full data backup and restore via ZIP files
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Light/Dark Mode** - User-configurable theme preference

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with Park UI components
- **Backend**: Next.js API routes
- **Database**: SQLite (via better-sqlite3)
- **Image Processing**: sharp (for thumbnail generation)
- **QR Codes**: qrcode library (server-side generation)

## Quick Start

### Development

```bash
# Clone the repository
git clone <repository-url>
cd tote-sonar

# Run the setup script
chmod +x init.sh
./init.sh
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Docker

```bash
# Build the Docker image
docker build -t tote-sonar .

# Run the container
docker run -d \
  -p 3000:3000 \
  -v tote-sonar-data:/app/data \
  --name tote-sonar \
  tote-sonar
```

## Project Structure

```
tote-sonar/
├── src/
│   ├── app/                  # Next.js App Router pages and API routes
│   │   ├── api/              # REST API endpoints
│   │   │   ├── health/       # Health check endpoint
│   │   │   ├── dashboard/    # Dashboard data
│   │   │   ├── totes/        # Tote CRUD + QR codes
│   │   │   ├── items/        # Item CRUD + move/duplicate
│   │   │   ├── photos/       # Photo upload/retrieval
│   │   │   ├── search/       # Global search
│   │   │   ├── settings/     # App settings
│   │   │   ├── metadata-keys/# Metadata key autocomplete
│   │   │   ├── export/       # Data export
│   │   │   └── import/       # Data import
│   │   ├── totes/            # Tote list and detail pages
│   │   ├── items/            # Item detail pages
│   │   ├── search/           # Search page
│   │   ├── settings/         # Settings page
│   │   └── import-export/    # Import/Export page
│   ├── components/           # Reusable React components
│   ├── lib/                  # Database, utilities, helpers
│   └── types/                # TypeScript type definitions
├── data/                     # SQLite DB + uploaded files (gitignored)
│   ├── uploads/              # Original uploaded images
│   └── thumbnails/           # Generated thumbnails
├── init.sh                   # Development setup script
├── Dockerfile                # Docker container build
└── package.json              # Node.js dependencies
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server and database status |
| GET | `/api/dashboard` | Dashboard metrics and recent items |
| GET/POST | `/api/totes` | List all totes / Create new tote |
| GET/PUT/DELETE | `/api/totes/:id` | Tote CRUD operations |
| GET | `/api/totes/:id/qr` | Generate QR code for tote |
| POST | `/api/totes/qr/bulk` | Bulk QR code generation |
| GET/POST | `/api/totes/:toteId/items` | List/create items in a tote |
| GET/PUT/DELETE | `/api/items/:id` | Item CRUD operations |
| POST | `/api/items/:id/move` | Move item to different tote |
| POST | `/api/items/:id/duplicate` | Duplicate an item |
| GET/POST | `/api/items/:id/metadata` | Item metadata management |
| PUT/DELETE | `/api/items/:id/metadata/:metadataId` | Update/delete metadata |
| POST | `/api/items/:id/photos` | Upload photo to item |
| GET/DELETE | `/api/photos/:id` | Get/delete photo |
| GET | `/api/photos/:id/thumbnail` | Get photo thumbnail |
| GET | `/api/search` | Search items across all totes |
| GET/PUT | `/api/settings` | Application settings |
| GET | `/api/metadata-keys` | Metadata key autocomplete |
| GET | `/api/export` | Export all data as ZIP |
| POST | `/api/import` | Import data from ZIP |

## Configuration

Settings can be configured through the Settings page in the UI:

- **Server Hostname** - Base URL used for QR code generation
- **Max Upload Size** - Maximum file size for photo uploads (default: 5MB)
- **Default Tote Fields** - Pre-populated fields when creating new totes
- **Default Metadata Keys** - Suggested keys when adding item metadata
- **Theme** - Light or dark mode

## License

GNU GENERAL PUBLIC LICENSE Version 3
