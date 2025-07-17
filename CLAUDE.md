# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
- `bin/rails server` - Start the Rails development server
- `bin/dev` - Start the development server with Procfile.dev (includes Tailwind CSS watching)

### Testing
- `bin/rails test` - Run all tests
- `bin/rails test:system` - Run system tests
- `bin/rails test test/controllers/tasks_controller_test.rb` - Run specific test file

### Database
- `bin/rails db:migrate` - Run database migrations
- `bin/rails db:seed` - Seed the database
- `bin/rails db:reset` - Reset database (drop, create, migrate, seed)

### Code Quality
- `bin/rails rubocop` - Run Ruby linter (Rubocop Rails Omakase)
- `bin/rails brakeman` - Run security scanner

### Assets
- `bin/rails assets:precompile` - Precompile assets for production
- `bin/rails tailwindcss:build` - Build Tailwind CSS

## Application Architecture

### Core Domain
This is a **task management application** focused on task prioritization and alignment. The core workflow is:
1. **Filter Tasks** - Users create and rate unfiltered tasks
2. **Prioritized Tasks** - Tasks with complete ratings (energy, simplicity, impact) are automatically scored
3. **Parked Tasks** - Tasks temporarily set aside
4. **Completed Tasks** - Finished tasks

### Key Models
- **User** - Devise authentication, has many tasks
- **Task** - Core entity with status flow: `unrated` → `rated` → `completed`/`parked`
  - Required fields: `title`, `status`, `cognitive_density`, `estimated_hours`
  - Rating fields: `energy`, `simplicity`, `impact` (0-10 scale)
  - Auto-calculates `score` when all ratings present: `(impact * 0.5) + (simplicity * 0.3) + (energy * 0.2)`
  - Status automatically changes to `rated` when score calculated

### Frontend Architecture
- **Rails 8** with **Hotwire** (Turbo + Stimulus)
- **Tailwind CSS** for styling
- **Heroicons** for SVG icons
- **Stimulus Controllers**:
  - `task_card_controller.js` - Handles individual task card interactions, auto-save, date formatting
  - `filter_tasks_controller.js` - Manages task creation in the Filter section
  - `brain_dump_controller.js` - Handles bulk task creation modal

### Task Management Features
- **Auto-save** - Task fields save automatically after 1 second of inactivity
- **Brain Dump** - Bulk create tasks by entering multiple lines of text
- **Duplication** - Clone existing tasks
- **Undo System** - Global undo (Ctrl+Z) for task deletions
- **Calendar Integration** - Custom date picker for due dates with MM/DD format
- **Progressive Disclosure** - Dashboard sections activate based on task states

### Key Controllers
- **TasksController** - Main CRUD operations with JSON API support
  - Special actions: `brain_dump`, `duplicate`, `undo_delete`
  - Handles inline task creation for the dashboard
- **HomeController** - Dashboard with task statistics and section management

### Database Schema
- Uses **SQLite** in development/test
- **Devise** tables for authentication
- **Solid** adapters for caching, queuing, and Action Cable

### Deployment
- **Kamal** deployment configuration
- **Thruster** for HTTP asset caching
- **Docker** containerization support

## Important Patterns

### Task Status Flow
- Tasks must have `cognitive_density` (0-3) and `estimated_hours` (0-8)
- Status changes automatically based on ratings:
  - `unrated` → `rated` (when all three ratings completed)
  - `rated` → `completed` (manual action)
  - Any status → `parked` (manual action)

### Frontend Patterns
- Use Stimulus controllers for JavaScript interactions
- Leverage Turbo for SPA-like experience
- Auto-save pattern with debouncing (1 second delay)
- JSON API responses for async operations

### Date Handling
- Due dates stored as Date objects in database
- Frontend displays as "due: MM/DD" format
- Custom date parsing in `TasksController#parse_due_date`

## File Structure Notes
- **app/javascript/controllers/** - Stimulus controllers
- **app/views/tasks/** - Task-related views including `_task_card.html.erb` partial
- **app/models/** - Task and User models with validations
- **config/routes.rb** - RESTful routes with custom task actions
- **db/migrate/** - Database migrations including Devise setup