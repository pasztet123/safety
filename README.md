README - Safety Meetings PWA Application
=========================================

## Overview
This is a Progressive Web App (PWA) for managing safety meetings, incidents, and checklists in construction projects.

## Features

### 1. Projects
- List all projects
- Create new projects with name, client, address, description, and status
- Filter by active/completed/archived status

### 2. Meetings
- View historical safety meetings
- Create new meetings with:
  - Auto-filled date and time (editable)
  - GPS location (auto-filled or manual)
  - Leader selection (with option to add new)
  - Multiple attendees
  - Multiple photos
  - Optional signature
  - Topic and notes
- Generate PDF reports

### 3. Incidents
- List all incidents
- Report new incidents with:
  - Auto-filled date and time
  - GPS location
  - Employee information
  - Reporter information
  - Incident type (with option to add new)
  - Details and notes
  - Photo attachment
  - Optional signature
- Generate PDF reports

### 4. Checklists
- Create custom checklists with multiple items
- Complete checklists with checkbox interface
- View completion history
- Add notes to individual items and overall completion

### 5. Admin Panel
- View all meetings and incidents
- Manage user data
- Delete records
- Overview of system usage

## Technology Stack

- **Frontend**: React with Vite
- **Styling**: Custom CSS with Inter font
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for photos and signatures
- **PDF Generation**: jsPDF
- **Signature**: react-signature-canvas
- **PWA**: vite-plugin-pwa

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. The app is pre-configured with your Supabase project

3. Run development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview production build:
   ```bash
   npm run preview
   ```

## Database Schema

The app uses the following tables:
- `meetings` - Safety meeting records
- `meeting_attendees` - Meeting participants
- `meeting_photos` - Meeting photos
- `incidents` - Incident reports
- `incident_types` - Types of incidents
- `checklists` - Checklist templates
- `checklist_items` - Items in checklists
- `checklist_completions` - Completed checklist records
- `checklist_completion_items` - Individual item completions
- `leaders` - Meeting leaders
- `projects` - Project information (existing table)

## Design System

- **Primary Color**: #171717 (Dark Gray)
- **Accent Color**: #EE2E2F (Red)
- **Background**: #ffffff (White)
- **Font**: Inter

## Features

### PWA Capabilities
- Works offline (after first visit)
- Installable on mobile and desktop
- Responsive design for all screen sizes
- Native app-like experience

### Location Services
- Automatic GPS location capture
- Manual location entry option
- Geocoding for human-readable addresses

### Photo Management
- Multiple photo upload
- Storage in Supabase
- Display in PDF reports

### Signature Capture
- Canvas-based signature
- Optional for meetings and incidents
- Stored as images

### PDF Generation
- Professional PDF reports
- Includes all meeting/incident data
- Embedded photos and signatures
- Downloadable files

## Usage Tips

1. **First Time Setup**:
   - Log in with your Supabase credentials
   - Create projects first
   - Add leaders for meetings
   - Create incident types

2. **Meetings**:
   - Date/time auto-fills but can be edited
   - Location auto-fills from GPS
   - Add as many attendees as needed
   - Upload multiple photos

3. **Incidents**:
   - Report immediately after occurrence
   - Include all relevant details
   - Attach photo evidence
   - Generate PDF for records

4. **Checklists**:
   - Create reusable templates
   - Complete them as needed
   - Track completion history
   - Add notes for specific items

5. **Admin**:
   - Monitor all activities
   - Manage historical records
   - Export data as needed

## Support

For issues or questions, contact your system administrator.
