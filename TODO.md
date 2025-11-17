# FortifyMIS v12 - Comprehensive Development TODO List

## Project Status Overview
**Current Completion**: ~35-40%
- ✅ Database Schema (Prisma): 100% Complete (1,629 lines, 60+ models)
- ✅ API Routes Structure: 30 routes created (skeletal/mock implementations)
- ⚠️ Configuration Files: 0% - CRITICAL BLOCKER
- ⚠️ Core Libraries: 0% - Missing @/lib/auth, @/lib/db, etc.
- ⚠️ Frontend Pages: ~2% - Only 1 page exists
- ⚠️ UI Components: 0% - All components missing
- ❌ Tests: 0%
- ❌ Production Config: 0%

---

## PHASE 0: CRITICAL FOUNDATION (BLOCKER - DO FIRST)
**Status**: NOT STARTED | **Priority**: CRITICAL | **Estimated Time**: 1-2 days

### Configuration Files Setup

- [ ] **Create package.json**
  - [ ] Add Next.js 14+ dependencies
  - [ ] Add React 18+ dependencies
  - [ ] Add Prisma Client and CLI
  - [ ] Add NextAuth.js for authentication
  - [ ] Add Zod for validation
  - [ ] Add UI libraries (shadcn/ui, Tailwind, Radix UI)
  - [ ] Add form handling (react-hook-form)
  - [ ] Add data fetching (swr or react-query)
  - [ ] Add charting libraries (recharts, chart.js)
  - [ ] Add file upload libraries (react-dropzone)
  - [ ] Add PDF generation (jsPDF, react-pdf)
  - [ ] Add QR code generation (qrcode, react-qr-code)
  - [ ] Add date handling (date-fns or dayjs)
  - [ ] Add WebSocket (socket.io-client)
  - [ ] Add maps (react-leaflet or Google Maps)
  - [ ] Add dev dependencies (TypeScript, ESLint, Prettier)
  - [ ] Add testing dependencies (Jest, React Testing Library)
  - [ ] Configure scripts (dev, build, start, test, lint, db:push, db:seed)

- [ ] **Create tsconfig.json**
  - [ ] Configure path aliases (@/lib, @/components, @/app, etc.)
  - [ ] Set strict mode true
  - [ ] Configure JSX for React
  - [ ] Set module resolution to bundler
  - [ ] Configure include/exclude paths

- [ ] **Create next.config.js**
  - [ ] Configure image domains for external images
  - [ ] Set up environment variables
  - [ ] Configure webpack for custom optimizations
  - [ ] Set up rewrites/redirects if needed
  - [ ] Configure experimental features (if any)

- [ ] **Create .env.local template**
  - [ ] DATABASE_URL (PostgreSQL connection string)
  - [ ] NEXTAUTH_URL
  - [ ] NEXTAUTH_SECRET
  - [ ] JWT_SECRET
  - [ ] Email service credentials (for notifications)
  - [ ] SMS service credentials (Twilio/similar)
  - [ ] Cloud storage credentials (AWS S3/similar for file uploads)
  - [ ] Google Maps API key (for logistics)
  - [ ] WebSocket server URL

- [ ] **Create .env.example**
  - [ ] Document all required environment variables
  - [ ] Provide example values (non-sensitive)

- [ ] **Create .gitignore**
  - [ ] Add node_modules
  - [ ] Add .env*.local
  - [ ] Add .next
  - [ ] Add build outputs
  - [ ] Add IDE files

- [ ] **Create tailwind.config.js**
  - [ ] Configure theme colors matching FortifyMIS brand
  - [ ] Set up custom breakpoints
  - [ ] Configure plugins (forms, typography, etc.)
  - [ ] Set up dark mode support

- [ ] **Create postcss.config.js**
  - [ ] Configure Tailwind CSS
  - [ ] Add autoprefixer

- [ ] **Create .eslintrc.json**
  - [ ] Configure Next.js linting rules
  - [ ] Add TypeScript rules
  - [ ] Configure import order
  - [ ] Set up accessibility rules

- [ ] **Create .prettierrc**
  - [ ] Configure code formatting
  - [ ] Set up consistent style

---

## PHASE 1: CORE INFRASTRUCTURE
**Status**: NOT STARTED | **Priority**: CRITICAL | **Estimated Time**: 3-5 days

### Database Setup

- [ ] **Migrate from SQLite to PostgreSQL**
  - [ ] Update prisma/schema.prisma datasource to postgresql
  - [ ] Set up PostgreSQL database (local development)
  - [ ] Update DATABASE_URL in .env.local
  - [ ] Test database connection
  - [ ] Run prisma generate
  - [ ] Run prisma db push
  - [ ] Verify all models created correctly

- [ ] **Database Seeding**
  - [ ] Review existing seed scripts (seed.ts, seed-training.ts, seed-compliance.ts)
  - [ ] Update seed scripts for PostgreSQL compatibility
  - [ ] Add comprehensive seed data:
    - [ ] Users (all roles: operators, managers, inspectors, program managers, buyers, logistics)
    - [ ] Mills (multiple mills across different regions)
    - [ ] Equipment (dosers, mixers, sensors per mill)
    - [ ] Training courses and modules
    - [ ] Diagnostic questionnaires
    - [ ] Compliance templates
    - [ ] Sample batch logs
    - [ ] Sample QC tests
    - [ ] Sample RFPs and bids
  - [ ] Run seed scripts and verify data

### Core Library Implementation

- [ ] **Create src/lib/db.ts**
  - [ ] Initialize Prisma Client
  - [ ] Export singleton instance
  - [ ] Add connection pooling configuration
  - [ ] Add error handling for connection failures
  - [ ] Add logging for database queries (development mode)

- [ ] **Create src/lib/auth.ts**
  - [ ] Implement NextAuth configuration
  - [ ] Set up credentials provider (email/password)
  - [ ] Implement password hashing (bcrypt)
  - [ ] Create JWT strategy
  - [ ] Implement session management
  - [ ] Create role-based access control (RBAC) helpers
  - [ ] Add permission checking functions
  - [ ] Create middleware for protected routes
  - [ ] Implement user session helpers

- [ ] **Create src/lib/utils.ts**
  - [ ] Add cn() utility for className merging
  - [ ] Add date formatting helpers
  - [ ] Add number formatting helpers
  - [ ] Add string manipulation helpers
  - [ ] Add validation helpers
  - [ ] Add file size formatting
  - [ ] Add error handling utilities

- [ ] **Create src/lib/validations.ts**
  - [ ] Create Zod schemas for all forms:
    - [ ] User registration/login
    - [ ] Mill registration
    - [ ] Batch logging
    - [ ] QC test entry
    - [ ] Compliance audit
    - [ ] RFP creation
    - [ ] Bid submission
    - [ ] Delivery tracking
  - [ ] Export validation functions

- [ ] **Create src/lib/constants.ts**
  - [ ] Define user roles enum
  - [ ] Define batch statuses
  - [ ] Define QC test types
  - [ ] Define compliance statuses
  - [ ] Define alert priorities
  - [ ] Define commodity types
  - [ ] Define all other application constants

- [ ] **Create src/lib/api-client.ts**
  - [ ] Create typed API client
  - [ ] Implement error handling
  - [ ] Add request/response interceptors
  - [ ] Add authentication header injection
  - [ ] Add loading state management

- [ ] **Create src/lib/file-upload.ts**
  - [ ] Implement file upload to cloud storage (S3/similar)
  - [ ] Add file validation (type, size)
  - [ ] Add image compression
  - [ ] Generate thumbnail previews
  - [ ] Return secure URLs

- [ ] **Create src/lib/notifications.ts**
  - [ ] Implement email notification service
  - [ ] Implement SMS notification service
  - [ ] Implement push notification service
  - [ ] Create notification templates
  - [ ] Add batch notification sending
  - [ ] Add notification preferences handling

- [ ] **Create src/lib/pdf-generator.ts**
  - [ ] Implement PDF generation for:
    - [ ] Compliance reports
    - [ ] Batch certificates
    - [ ] Training certificates
    - [ ] QC reports
    - [ ] Procurement contracts
  - [ ] Add QR code embedding
  - [ ] Add digital signature support

- [ ] **Create src/lib/qr-code.ts**
  - [ ] Implement QR code generation
  - [ ] Add batch information encoding
  - [ ] Implement QR code verification
  - [ ] Add anti-counterfeiting features
  - [ ] Track QR code scans

- [ ] **Create src/lib/websocket.ts**
  - [ ] Set up Socket.IO server
  - [ ] Implement real-time event broadcasting
  - [ ] Add room-based messaging (per mill, per user)
  - [ ] Implement delivery tracking updates
  - [ ] Add alert broadcasting

### Middleware & API Utilities

- [ ] **Create src/middleware.ts**
  - [ ] Implement authentication middleware
  - [ ] Add role-based route protection
  - [ ] Add request logging
  - [ ] Add rate limiting
  - [ ] Add CORS configuration

- [ ] **Create src/lib/api-helpers.ts**
  - [ ] Create error response helper
  - [ ] Create success response helper
  - [ ] Add pagination helper
  - [ ] Add sorting helper
  - [ ] Add filtering helper
  - [ ] Create API error classes

---

## PHASE 2: MODULE IMPLEMENTATION
**Status**: NOT STARTED | **Priority**: HIGH | **Estimated Time**: 4-6 weeks

### Module 3.1: Diagnostics & Training / Virtual Assistance

#### Backend (API Routes)

- [ ] **Diagnostic Wizard API**
  - [ ] Fix `/api/diagnostics/questionnaire/route.ts`
    - [ ] Replace mock data with database queries
    - [ ] Implement dynamic questionnaire loading
    - [ ] Add branching logic evaluation
  - [ ] Fix `/api/diagnostics/save/route.ts`
    - [ ] Implement progress saving
    - [ ] Add validation
    - [ ] Handle file uploads for evidence photos
  - [ ] Fix `/api/diagnostics/submit/route.ts`
    - [ ] Implement result analysis
    - [ ] Generate recommendations
    - [ ] Create follow-up action items
    - [ ] Send notifications
  - [ ] Create `/api/diagnostics/history/route.ts`
    - [ ] Get user's diagnostic history
    - [ ] Add filtering and pagination
  - [ ] Create `/api/diagnostics/analytics/route.ts`
    - [ ] Aggregate insights for FWGA view
    - [ ] Generate common problem reports

- [ ] **Training Content API**
  - [ ] Create `/api/training/courses/route.ts`
    - [ ] List all courses (with filtering)
    - [ ] Get course details
    - [ ] Enroll user in course
  - [ ] Create `/api/training/courses/[id]/modules/route.ts`
    - [ ] Get course modules
    - [ ] Track module completion
  - [ ] Create `/api/training/progress/route.ts`
    - [ ] Get user progress
    - [ ] Update progress
    - [ ] Mark module complete
  - [ ] Create `/api/training/quizzes/[id]/submit/route.ts`
    - [ ] Submit quiz answers
    - [ ] Calculate score
    - [ ] Provide feedback
  - [ ] Create `/api/training/certificates/route.ts`
    - [ ] Generate certificate
    - [ ] Download certificate
    - [ ] Verify certificate

- [ ] **Training Alerts API**
  - [ ] Create `/api/training/alerts/route.ts`
    - [ ] Get user alerts
    - [ ] Generate alerts based on triggers
    - [ ] Mark alert as completed/dismissed
    - [ ] Snooze alert

#### Frontend (Pages & Components)

- [ ] **Create UI Components (shadcn/ui)**
  - [ ] Install and configure shadcn/ui
  - [ ] Add required components:
    - [ ] Button, Card, Input, Form components
    - [ ] Dialog, Select, Tabs, Table
    - [ ] Toast, Alert, Badge
    - [ ] Progress, Skeleton
    - [ ] All other needed components

- [ ] **Diagnostics Pages**
  - [ ] Create `/diagnostics` page
    - [ ] Dashboard showing diagnostic categories
    - [ ] History of completed diagnostics
    - [ ] Pending diagnostics
  - [ ] Create `/diagnostics/new` page
    - [ ] Category selection
    - [ ] Crop/machine selection
  - [ ] Create `/diagnostics/[id]` page
    - [ ] Interactive questionnaire wizard
    - [ ] Progress tracker
    - [ ] Photo upload capability
    - [ ] Save and resume functionality
  - [ ] Create `/diagnostics/[id]/results` page
    - [ ] Display identified issues
    - [ ] Show recommendations
    - [ ] Interactive simulations
    - [ ] Action item creation

- [ ] **Training Pages**
  - [ ] Create `/training` page
    - [ ] Course library with filters
    - [ ] User's enrolled courses
    - [ ] Progress dashboard
    - [ ] Recommended courses
  - [ ] Create `/training/courses/[id]` page
    - [ ] Course overview
    - [ ] Module list
    - [ ] Enrollment button
  - [ ] Create `/training/courses/[id]/learn` page
    - [ ] Video player with controls
    - [ ] Module navigation
    - [ ] Embedded quizzes
    - [ ] Progress tracking
    - [ ] Bookmarking
  - [ ] Create `/training/certificates` page
    - [ ] List all earned certificates
    - [ ] Download/share functionality

- [ ] **Diagnostic & Training Components**
  - [ ] Create `DiagnosticWizard` component
  - [ ] Create `QuestionRenderer` component (handles all question types)
  - [ ] Create `BranchingLogic` handler
  - [ ] Create `RecommendationDisplay` component
  - [ ] Create `InteractiveSimulation` component
  - [ ] Create `VideoPlayer` component
  - [ ] Create `QuizQuestion` component
  - [ ] Create `ProgressTracker` component
  - [ ] Create `CertificateCard` component
  - [ ] Create `TrainingAlert` component

### Module 3.2: Digital Compliance & Standard Checklist

#### Backend (API Routes)

- [ ] **Compliance Templates API**
  - [ ] Fix `/api/compliance/templates/route.ts`
    - [ ] List all templates (with permissions)
    - [ ] Create new template (admin only)
    - [ ] Update template
    - [ ] Version control implementation
  - [ ] Create `/api/compliance/templates/[id]/route.ts`
    - [ ] Get template details
    - [ ] Update template items
    - [ ] Delete template
    - [ ] Duplicate template

- [ ] **Compliance Audits API**
  - [ ] Fix `/api/compliance/audits/route.ts`
    - [ ] List audits (filtered by role)
    - [ ] Start new audit
    - [ ] Get audit details
  - [ ] Fix `/api/compliance/audits/submit/route.ts`
    - [ ] Submit completed audit
    - [ ] Calculate compliance score
    - [ ] Generate report PDF
    - [ ] Send notifications
  - [ ] Create `/api/compliance/audits/[id]/route.ts`
    - [ ] Get audit progress
    - [ ] Update audit responses
    - [ ] Upload evidence files
    - [ ] Save and resume
  - [ ] Create `/api/compliance/audits/[id]/score/route.ts`
    - [ ] Calculate real-time score
    - [ ] Identify red flags
    - [ ] Generate suggestions
  - [ ] Create `/api/compliance/audits/[id]/export/route.ts`
    - [ ] Export as PDF
    - [ ] Export as Excel
    - [ ] Export as CSV

- [ ] **Inspector Review API**
  - [ ] Create `/api/compliance/review/queue/route.ts`
    - [ ] Get inspector's review queue
    - [ ] Filter and sort
  - [ ] Create `/api/compliance/review/[id]/route.ts`
    - [ ] Get audit for review
    - [ ] Add comments/annotations
    - [ ] Request revisions
    - [ ] Approve/reject audit
  - [ ] Create `/api/compliance/review/[id]/certificate/route.ts`
    - [ ] Generate compliance certificate
    - [ ] Digital signature

#### Frontend (Pages & Components)

- [ ] **Compliance Pages**
  - [ ] Create `/compliance` page
    - [ ] Dashboard for mills (pending/completed audits)
    - [ ] Dashboard for inspectors (review queue)
  - [ ] Create `/compliance/templates` page (admin only)
    - [ ] List all templates
    - [ ] Create/edit template interface
  - [ ] Create `/compliance/audit/[id]` page
    - [ ] Section-by-section checklist
    - [ ] Evidence upload
    - [ ] Real-time scoring
    - [ ] What-if analysis tool
  - [ ] Create `/compliance/review/[id]` page (inspector)
    - [ ] Side-by-side review interface
    - [ ] Evidence verification
    - [ ] Annotation tools
    - [ ] Decision actions

- [ ] **Compliance Components**
  - [ ] Create `ComplianceChecklist` component
  - [ ] Create `ChecklistItem` component (handles all item types)
  - [ ] Create `EvidenceUpload` component
  - [ ] Create `ComplianceScore` component
  - [ ] Create `RedFlagList` component
  - [ ] Create `WhatIfAnalysis` component
  - [ ] Create `InspectorAnnotations` component
  - [ ] Create `ComplianceReport` component

### Module 3.3: Maintenance / Calibration Scheduler & Alerts

#### Backend (API Routes)

- [ ] **Equipment & Schedules API**
  - [ ] Create `/api/maintenance/equipment/route.ts`
    - [ ] List all equipment for mill
    - [ ] Add new equipment
    - [ ] Update equipment
    - [ ] Delete equipment
  - [ ] Create `/api/maintenance/schedules/route.ts`
    - [ ] List schedules for equipment
    - [ ] Create new schedule
    - [ ] Update schedule
  - [ ] Create `/api/maintenance/calendar/route.ts`
    - [ ] Get calendar view of all maintenance
    - [ ] Filter by date range, equipment type

- [ ] **Maintenance Tasks API**
  - [ ] Create `/api/maintenance/tasks/route.ts`
    - [ ] List tasks (upcoming, overdue, completed)
    - [ ] Create task
  - [ ] Create `/api/maintenance/tasks/[id]/route.ts`
    - [ ] Get task details
    - [ ] Start task (log start time)
    - [ ] Update work log
    - [ ] Upload evidence
    - [ ] Complete task
  - [ ] Create `/api/maintenance/tasks/[id]/approve/route.ts`
    - [ ] Manager approval
    - [ ] Update next due date

- [ ] **Maintenance Alerts API**
  - [ ] Create `/api/maintenance/alerts/route.ts`
    - [ ] Generate alerts based on:
      - [ ] Upcoming maintenance due
      - [ ] Overdue maintenance
      - [ ] Sensor anomalies
      - [ ] Manual reports
    - [ ] List active alerts
  - [ ] Create `/api/maintenance/alerts/[id]/acknowledge/route.ts`
    - [ ] Acknowledge alert
    - [ ] Create task from alert
  - [ ] Create `/api/maintenance/alerts/[id]/resolve/route.ts`
    - [ ] Resolve alert
    - [ ] Link to completed task

- [ ] **Maintenance Analytics API**
  - [ ] Create `/api/maintenance/analytics/route.ts`
    - [ ] Equipment health overview
    - [ ] Maintenance metrics
    - [ ] Predictive insights
    - [ ] Cross-mill performance (FWGA)

#### Frontend (Pages & Components)

- [ ] **Maintenance Pages**
  - [ ] Create `/maintenance` page
    - [ ] Equipment registry list
    - [ ] Upcoming maintenance
    - [ ] Active alerts
  - [ ] Create `/maintenance/calendar` page
    - [ ] Calendar view
    - [ ] Schedule maintenance
  - [ ] Create `/maintenance/equipment/[id]` page
    - [ ] Equipment details
    - [ ] Maintenance history
    - [ ] Schedule configuration
  - [ ] Create `/maintenance/tasks/[id]` page
    - [ ] Task execution interface
    - [ ] Pre-checklist
    - [ ] Work log entry
    - [ ] Evidence upload
    - [ ] Calibration data entry
  - [ ] Create `/maintenance/analytics` page
    - [ ] Maintenance metrics dashboard
    - [ ] Equipment risk scores

- [ ] **Maintenance Components**
  - [ ] Create `EquipmentCard` component
  - [ ] Create `MaintenanceCalendar` component
  - [ ] Create `MaintenanceTask` component
  - [ ] Create `MaintenanceAlert` component
  - [ ] Create `CalibrationForm` component
  - [ ] Create `EquipmentHealthDashboard` component

### Module 3.4: Production Monitoring & Traceability / QC

#### Backend (API Routes)

- [ ] **Batch Logging API**
  - [ ] Create `/api/production/batches/route.ts`
    - [ ] List batches (with filtering, pagination)
    - [ ] Create new batch
  - [ ] Create `/api/production/batches/[id]/route.ts`
    - [ ] Get batch details
    - [ ] Update batch
    - [ ] Calculate premix variance
    - [ ] Link batch to order
  - [ ] Create `/api/production/batches/[id]/qr-code/route.ts`
    - [ ] Generate QR code
    - [ ] Generate batch certificate
  - [ ] Create `/api/production/batches/[id]/traceability/route.ts`
    - [ ] Get full traceability chain
    - [ ] Record traceability event

- [ ] **QC Testing API**
  - [ ] Create `/api/qc/tests/route.ts`
    - [ ] List QC tests
    - [ ] Create QC test
  - [ ] Create `/api/qc/tests/[id]/route.ts`
    - [ ] Get test details
    - [ ] Add test results
    - [ ] Upload lab certificate
    - [ ] Calculate pass/fail status
  - [ ] Create `/api/qc/tests/[id]/corrective-action/route.ts`
    - [ ] Create corrective action for failed test
    - [ ] Root cause analysis
    - [ ] Batch disposition

- [ ] **Anomaly Detection API**
  - [ ] Create `/api/production/analytics/anomalies/route.ts`
    - [ ] Detect premix usage anomalies
    - [ ] Detect QC result trends
    - [ ] Detect yield anomalies
    - [ ] Generate predictive alerts

- [ ] **Traceability API**
  - [ ] Create `/api/traceability/scan/route.ts`
    - [ ] Scan QR code
    - [ ] Verify authenticity
    - [ ] Record scan event
    - [ ] Return batch information
  - [ ] Create `/api/traceability/certificate/[batchId]/route.ts`
    - [ ] Get digital batch certificate
    - [ ] Consumer-facing view
    - [ ] Buyer/institutional view

#### Frontend (Pages & Components)

- [ ] **Production Pages**
  - [ ] Create `/production` page
    - [ ] Batch list
    - [ ] Create new batch button
    - [ ] Filters and search
  - [ ] Create `/production/batch/new` page
    - [ ] Comprehensive batch creation form
    - [ ] Real-time premix calculation
    - [ ] Variance warnings
  - [ ] Create `/production/batch/[id]` page
    - [ ] Batch details
    - [ ] QC test results
    - [ ] Traceability chain
    - [ ] QR code display
    - [ ] Download certificate

- [ ] **QC Pages**
  - [ ] Create `/qc` page
    - [ ] Pending QC tests
    - [ ] Failed tests requiring action
    - [ ] QC performance metrics
  - [ ] Create `/qc/test/[id]` page
    - [ ] QC test entry form
    - [ ] Lab certificate upload
    - [ ] Pass/fail calculation
  - [ ] Create `/qc/corrective-action/[id]` page
    - [ ] Root cause analysis form
    - [ ] Corrective actions
    - [ ] Batch disposition

- [ ] **Traceability Pages**
  - [ ] Create `/traceability/scan` page
    - [ ] QR code scanner (mobile)
    - [ ] Manual batch ID entry
  - [ ] Create `/traceability/certificate/[batchId]` page
    - [ ] Public-facing batch certificate
    - [ ] Consumer-friendly view
    - [ ] Verification status

- [ ] **Production Components**
  - [ ] Create `BatchForm` component
  - [ ] Create `BatchCard` component
  - [ ] Create `QCTestForm` component
  - [ ] Create `QCResultDisplay` component
  - [ ] Create `TraceabilityTimeline` component
  - [ ] Create `BatchQRCode` component
  - [ ] Create `BatchCertificate` component
  - [ ] Create `AnomalyAlert` component
  - [ ] Create `PremixVarianceCalculator` component

### Module 3.5: Institutional Procurement & Matchmaking

#### Backend (API Routes)

- [ ] **Buyer Profile API**
  - [ ] Create `/api/buyers/profile/route.ts`
    - [ ] Register as buyer
    - [ ] Update profile
    - [ ] Upload verification documents
  - [ ] Create `/api/buyers/verification/route.ts`
    - [ ] FWGA verification workflow

- [ ] **RFP Management API**
  - [ ] Create `/api/procurement/rfps/route.ts`
    - [ ] List RFPs (filtered by eligibility for mills)
    - [ ] Create new RFP
    - [ ] Get RFP details
  - [ ] Create `/api/procurement/rfps/[id]/route.ts`
    - [ ] Update RFP
    - [ ] Close RFP
    - [ ] Cancel RFP
  - [ ] Create `/api/procurement/rfps/[id]/bids/route.ts`
    - [ ] List all bids for RFP
    - [ ] Get bid statistics

- [ ] **Bidding API**
  - [ ] Create `/api/procurement/bids/route.ts`
    - [ ] List mill's submitted bids
    - [ ] Create new bid
  - [ ] Create `/api/procurement/bids/[id]/route.ts`
    - [ ] Get bid details
    - [ ] Update bid (before deadline)
    - [ ] Withdraw bid
  - [ ] Create `/api/procurement/bids/[id]/evaluate/route.ts`
    - [ ] Calculate evaluation score
    - [ ] Buyer comparison tools

- [ ] **Selection & Award API**
  - [ ] Create `/api/procurement/rfps/[id]/shortlist/route.ts`
    - [ ] Shortlist bids
    - [ ] Request clarifications
  - [ ] Create `/api/procurement/rfps/[id]/award/route.ts`
    - [ ] Award contract
    - [ ] Generate contract document
    - [ ] Send notifications

- [ ] **Order Management API**
  - [ ] Create `/api/procurement/orders/route.ts`
    - [ ] List purchase orders
    - [ ] Create PO from awarded bid
  - [ ] Create `/api/procurement/orders/[id]/route.ts`
    - [ ] Get PO details
    - [ ] Update production schedule
    - [ ] Link batches to order
    - [ ] Update delivery status
  - [ ] Create `/api/procurement/orders/[id]/issues/route.ts`
    - [ ] Report delivery issue
    - [ ] Resolve issue

- [ ] **Review & Rating API**
  - [ ] Create `/api/procurement/reviews/route.ts`
    - [ ] Create review (buyer for mill, mill for buyer)
    - [ ] Get reviews

#### Frontend (Pages & Components)

- [ ] **Buyer Pages**
  - [ ] Create `/buyers/register` page
    - [ ] Buyer registration form
    - [ ] Document upload
  - [ ] Create `/buyers/profile` page
    - [ ] Buyer profile management

- [ ] **Procurement Pages (Buyer)**
  - [ ] Create `/procurement/rfps` page
    - [ ] RFP list (buyer's RFPs)
    - [ ] Create new RFP button
  - [ ] Create `/procurement/rfps/new` page
    - [ ] Comprehensive RFP creation wizard
    - [ ] Multi-step form
  - [ ] Create `/procurement/rfps/[id]` page
    - [ ] RFP details
    - [ ] Received bids list
    - [ ] Bid comparison tools
  - [ ] Create `/procurement/rfps/[id]/evaluate` page
    - [ ] Side-by-side bid comparison
    - [ ] Evaluation scoring
    - [ ] Mill profiles
    - [ ] Award contract interface

- [ ] **Procurement Pages (Mill)**
  - [ ] Create `/opportunities` page
    - [ ] Available RFPs for mill
    - [ ] Match score display
    - [ ] Submitted bids
  - [ ] Create `/opportunities/[rfpId]` page
    - [ ] RFP details
    - [ ] Eligibility check
    - [ ] Submit bid form
  - [ ] Create `/opportunities/[rfpId]/bid` page
    - [ ] Bid creation form
    - [ ] Pricing calculator
    - [ ] Document upload

- [ ] **Order Management Pages**
  - [ ] Create `/orders` page
    - [ ] Active orders
    - [ ] Order history
  - [ ] Create `/orders/[id]` page
    - [ ] Order details
    - [ ] Production progress
    - [ ] Linked batches
    - [ ] Delivery schedule

- [ ] **Procurement Components**
  - [ ] Create `RFPCard` component
  - [ ] Create `RFPForm` component (wizard)
  - [ ] Create `BidForm` component
  - [ ] Create `BidCard` component
  - [ ] Create `BidComparison` component
  - [ ] Create `EligibilityCheck` component
  - [ ] Create `OrderTimeline` component
  - [ ] Create `ReviewForm` component

### Module 3.6: Logistics & Delivery Tracking

#### Backend (API Routes)

- [ ] **Route Planning API**
  - [ ] Create `/api/logistics/routes/optimize/route.ts`
    - [ ] Route optimization algorithm
    - [ ] Multiple vehicle support
    - [ ] Time window constraints
  - [ ] Create `/api/logistics/routes/assign/route.ts`
    - [ ] Assign route to driver/vehicle

- [ ] **Delivery Tracking API**
  - [ ] Create `/api/logistics/deliveries/route.ts`
    - [ ] List scheduled deliveries
    - [ ] Get delivery details
  - [ ] Create `/api/logistics/deliveries/[id]/start/route.ts`
    - [ ] Start delivery tracking
    - [ ] Pre-departure checklist
  - [ ] Create `/api/logistics/deliveries/[id]/location/route.ts`
    - [ ] Update GPS location (frequent calls)
    - [ ] Calculate ETA
  - [ ] Create `/api/logistics/deliveries/[id]/stops/[stopId]/arrive/route.ts`
    - [ ] Mark arrival at stop
  - [ ] Create `/api/logistics/deliveries/[id]/stops/[stopId]/complete/route.ts`
    - [ ] Upload proof of delivery
    - [ ] Digital signature
    - [ ] Photos
  - [ ] Create `/api/logistics/deliveries/[id]/complete/route.ts`
    - [ ] Complete entire route
    - [ ] Post-route checklist

- [ ] **Exception Management API**
  - [ ] Create `/api/logistics/exceptions/route.ts`
    - [ ] Report exception (delay, breakdown, etc.)
    - [ ] Get active exceptions
  - [ ] Create `/api/logistics/exceptions/[id]/resolve/route.ts`
    - [ ] Resolve exception

- [ ] **Real-Time Tracking API (WebSocket)**
  - [ ] Implement WebSocket events:
    - [ ] `delivery:location` - GPS updates
    - [ ] `delivery:status` - Status changes
    - [ ] `delivery:alert` - Exceptions

#### Frontend (Pages & Components)

- [ ] **Logistics Pages (Planner)**
  - [ ] Create `/logistics` page
    - [ ] Daily delivery dashboard
    - [ ] Route planning interface
  - [ ] Create `/logistics/routes/plan` page
    - [ ] Route optimization tool
    - [ ] Map interface
    - [ ] Vehicle assignment

- [ ] **Driver Mobile App Pages**
  - [ ] Create `/driver` page (mobile-optimized)
    - [ ] Assigned routes
    - [ ] Start delivery
  - [ ] Create `/driver/routes/[id]` page
    - [ ] Turn-by-turn navigation
    - [ ] Stop list
    - [ ] Pre-departure checklist
  - [ ] Create `/driver/routes/[id]/stops/[stopId]` page
    - [ ] Delivery execution interface
    - [ ] Photo capture
    - [ ] Signature capture
    - [ ] Quantity verification

- [ ] **Tracking Pages (Buyer/Mill)**
  - [ ] Create `/tracking/[deliveryId]` page
    - [ ] Live map with vehicle location
    - [ ] ETA display
    - [ ] Status timeline
    - [ ] Delivery notifications

- [ ] **Logistics Components**
  - [ ] Create `RouteMap` component (Google Maps/Leaflet)
  - [ ] Create `RouteOptimizer` component
  - [ ] Create `DeliveryTracker` component
  - [ ] Create `ProofOfDelivery` component
  - [ ] Create `SignatureCapture` component
  - [ ] Create `DeliveryTimeline` component
  - [ ] Create `ExceptionHandler` component

### Shared Modules & Cross-Cutting Concerns

#### Alerts & Notifications System

- [ ] **Alert Management API**
  - [ ] Fix `/api/alerts/route.tsx`
    - [ ] Create alerts based on various triggers
    - [ ] List alerts (filtered by user/role)
    - [ ] Get alert details
  - [ ] Fix `/api/alerts/[id]/acknowledge/route.tsx`
    - [ ] Acknowledge alert
  - [ ] Fix `/api/alerts/[id]/trigger/route.tsx`
    - [ ] Manually trigger alert
  - [ ] Create `/api/alerts/[id]/escalate/route.ts`
    - [ ] Auto-escalation logic

- [ ] **Notification Preferences API**
  - [ ] Create `/api/notifications/preferences/route.ts`
    - [ ] Get user preferences
    - [ ] Update preferences (email, SMS, push)

#### Action Items System

- [ ] **Action Items API**
  - [ ] Fix `/api/action-items/[id]/route.tsx`
    - [ ] Get action item details
    - [ ] Update action item
  - [ ] Fix `/api/action-items/[id]/complete/route.tsx`
    - [ ] Mark as complete
    - [ ] Upload evidence
  - [ ] Fix `/api/action-items/[id]/approve/route.tsx`
    - [ ] Manager approval
  - [ ] Fix `/api/action-items/[id]/notes/route.tsx`
    - [ ] Add notes/comments
  - [ ] Fix `/api/action-items/[id]/evidence/route.tsx`
    - [ ] Upload evidence files

#### Dashboard APIs

- [ ] **Role-Specific Dashboards**
  - [ ] Fix `/api/dashboards/mill-operator/route.ts`
    - [ ] Daily tasks
    - [ ] Recent batches
    - [ ] Pending diagnostics
    - [ ] Active alerts
  - [ ] Fix `/api/dashboards/mill-manager/route.ts`
    - [ ] Mill performance overview
    - [ ] Compliance status
    - [ ] Maintenance due
    - [ ] Procurement opportunities
    - [ ] Team performance
  - [ ] Fix `/api/dashboards/inspector/route.ts`
    - [ ] Review queue
    - [ ] Mill compliance scores
    - [ ] Flagged issues
  - [ ] Fix `/api/dashboards/program-manager/route.ts`
    - [ ] Cross-mill analytics
    - [ ] Program KPIs
    - [ ] Regional performance
    - [ ] Resource allocation

#### Analytics & Reporting

- [ ] **Analytics API**
  - [ ] Fix `/api/analytics/reports/route.tsx`
    - [ ] Generate various report types
    - [ ] Export as PDF/Excel
  - [ ] Fix `/api/analytics/predictive/route.tsx`
    - [ ] Predictive analytics for:
      - [ ] QC failures
      - [ ] Maintenance needs
      - [ ] Equipment failures
      - [ ] Market trends

- [ ] **Analytics Pages**
  - [ ] Enhance `/analytics/page.tsx`
    - [ ] Connect to real APIs (remove mock data)
    - [ ] Add more visualizations
    - [ ] Add filtering and date ranges

#### Frontend - Core Pages & Layouts

- [ ] **Root Layout & Navigation**
  - [ ] Create `src/app/layout.tsx`
    - [ ] Root HTML structure
    - [ ] Font loading
    - [ ] Theme provider
    - [ ] Session provider
  - [ ] Create `src/components/layout/MainLayout.tsx`
    - [ ] Main navigation
    - [ ] Sidebar
    - [ ] Role-based menu
    - [ ] User profile dropdown
    - [ ] Notifications bell
  - [ ] Create `src/components/layout/Sidebar.tsx`
    - [ ] Collapsible sidebar
    - [ ] Navigation items based on role
  - [ ] Create `src/components/layout/Header.tsx`
    - [ ] App header
    - [ ] Search
    - [ ] Notifications
    - [ ] User menu

- [ ] **Authentication Pages**
  - [ ] Create `/login/page.tsx`
    - [ ] Login form
    - [ ] Email/password
    - [ ] Remember me
    - [ ] Forgot password link
  - [ ] Create `/register/page.tsx`
    - [ ] User registration
    - [ ] Role selection
    - [ ] Mill assignment (if applicable)
  - [ ] Create `/forgot-password/page.tsx`
    - [ ] Password reset request
  - [ ] Create `/reset-password/[token]/page.tsx`
    - [ ] Password reset form

- [ ] **Dashboard Pages**
  - [ ] Create `/dashboard/page.tsx`
    - [ ] Role-based dashboard
    - [ ] Redirect to appropriate dashboard based on role
  - [ ] Create `/dashboard/operator/page.tsx`
    - [ ] Mill operator dashboard
  - [ ] Create `/dashboard/manager/page.tsx`
    - [ ] Mill manager dashboard
  - [ ] Create `/dashboard/inspector/page.tsx`
    - [ ] FWGA inspector dashboard
  - [ ] Create `/dashboard/program-manager/page.tsx`
    - [ ] FWGA program manager dashboard
  - [ ] Create `/dashboard/buyer/page.tsx`
    - [ ] Institutional buyer dashboard
  - [ ] Create `/dashboard/logistics/page.tsx`
    - [ ] Logistics planner dashboard

- [ ] **Profile & Settings Pages**
  - [ ] Create `/profile/page.tsx`
    - [ ] View/edit profile
    - [ ] Change password
  - [ ] Create `/settings/page.tsx`
    - [ ] Notification preferences
    - [ ] Language settings
    - [ ] Timezone settings

- [ ] **Notifications & Alerts Page**
  - [ ] Create `/notifications/page.tsx`
    - [ ] All notifications
    - [ ] Filter by type
    - [ ] Mark as read/unread

---

## PHASE 3: INTEGRATION & TESTING
**Status**: NOT STARTED | **Priority**: HIGH | **Estimated Time**: 2-3 weeks

### Testing Infrastructure

- [ ] **Setup Testing Framework**
  - [ ] Install Jest and React Testing Library
  - [ ] Configure Jest for Next.js
  - [ ] Setup test database
  - [ ] Create test utilities

- [ ] **Unit Tests**
  - [ ] Test all utility functions
  - [ ] Test validation schemas
  - [ ] Test API helpers
  - [ ] Test authentication helpers
  - [ ] Test business logic functions

- [ ] **Integration Tests**
  - [ ] Test API routes:
    - [ ] Authentication flows
    - [ ] Batch creation and QC
    - [ ] Compliance audit workflow
    - [ ] Procurement workflow
    - [ ] Delivery tracking
  - [ ] Test database operations
  - [ ] Test file uploads
  - [ ] Test notifications

- [ ] **E2E Tests**
  - [ ] Install Playwright or Cypress
  - [ ] Test critical user flows:
    - [ ] User registration and login
    - [ ] Complete diagnostic
    - [ ] Complete training course
    - [ ] Create and submit compliance audit
    - [ ] Create batch and QC test
    - [ ] Create RFP and receive bids
    - [ ] Complete delivery

- [ ] **Component Tests**
  - [ ] Test critical components
  - [ ] Test form validations
  - [ ] Test user interactions

### System Integration

- [ ] **WebSocket Integration**
  - [ ] Integrate real-time delivery tracking
  - [ ] Integrate real-time alerts
  - [ ] Integrate real-time notifications
  - [ ] Test WebSocket connections
  - [ ] Handle disconnections gracefully

- [ ] **File Upload Integration**
  - [ ] Integrate cloud storage (AWS S3 or similar)
  - [ ] Test file uploads for:
    - [ ] Evidence photos
    - [ ] Lab certificates
    - [ ] Compliance documents
    - [ ] Training videos
    - [ ] Profile avatars
  - [ ] Implement file size limits
  - [ ] Implement file type restrictions

- [ ] **PDF Generation Integration**
  - [ ] Test PDF generation for all document types
  - [ ] Ensure proper formatting
  - [ ] Test QR code embedding
  - [ ] Test digital signatures

- [ ] **Email & SMS Integration**
  - [ ] Set up email service (SendGrid, AWS SES, etc.)
  - [ ] Set up SMS service (Twilio, etc.)
  - [ ] Test all notification templates
  - [ ] Test batch sending
  - [ ] Handle failures gracefully

- [ ] **Maps Integration**
  - [ ] Integrate Google Maps or Leaflet
  - [ ] Test route visualization
  - [ ] Test live tracking
  - [ ] Test geocoding
  - [ ] Handle offline scenarios

### Performance Optimization

- [ ] **Backend Optimization**
  - [ ] Add database indexes
  - [ ] Optimize slow queries
  - [ ] Implement caching (Redis)
  - [ ] Add pagination to all list endpoints
  - [ ] Implement rate limiting
  - [ ] Add API response compression

- [ ] **Frontend Optimization**
  - [ ] Implement code splitting
  - [ ] Lazy load components
  - [ ] Optimize images (Next.js Image)
  - [ ] Implement skeleton loaders
  - [ ] Add debouncing for search/filters
  - [ ] Optimize bundle size
  - [ ] Implement service worker for offline support

### Security Hardening

- [ ] **Authentication & Authorization**
  - [ ] Test RBAC thoroughly
  - [ ] Implement CSRF protection
  - [ ] Add rate limiting on auth endpoints
  - [ ] Implement account lockout after failed attempts
  - [ ] Add 2FA (optional but recommended)

- [ ] **API Security**
  - [ ] Validate all inputs
  - [ ] Sanitize all outputs (prevent XSS)
  - [ ] Implement SQL injection prevention (Prisma handles this)
  - [ ] Add request size limits
  - [ ] Implement CORS properly
  - [ ] Add security headers

- [ ] **Data Security**
  - [ ] Encrypt sensitive data at rest
  - [ ] Use HTTPS everywhere
  - [ ] Implement secure file storage
  - [ ] Add audit logging for sensitive operations

---

## PHASE 4: PRODUCTION READINESS
**Status**: NOT STARTED | **Priority**: MEDIUM | **Estimated Time**: 1-2 weeks

### Production Configuration

- [ ] **Environment Setup**
  - [ ] Set up production database (PostgreSQL)
  - [ ] Configure production environment variables
  - [ ] Set up cloud storage for production
  - [ ] Configure email/SMS services for production
  - [ ] Set up error tracking (Sentry or similar)
  - [ ] Set up logging service (CloudWatch, LogRocket, etc.)
  - [ ] Set up monitoring (Datadog, New Relic, etc.)

- [ ] **Deployment**
  - [ ] Choose hosting platform (Vercel, AWS, etc.)
  - [ ] Set up CI/CD pipeline
  - [ ] Configure automatic deployments
  - [ ] Set up staging environment
  - [ ] Configure SSL certificates
  - [ ] Set up CDN for static assets
  - [ ] Configure database backups

- [ ] **Performance Monitoring**
  - [ ] Set up APM (Application Performance Monitoring)
  - [ ] Configure alerts for errors
  - [ ] Set up uptime monitoring
  - [ ] Configure performance budgets

### Documentation

- [ ] **Technical Documentation**
  - [ ] API documentation (OpenAPI/Swagger)
  - [ ] Database schema documentation
  - [ ] Architecture diagrams
  - [ ] Deployment guide
  - [ ] Environment setup guide

- [ ] **User Documentation**
  - [ ] User guides for each role
  - [ ] Video tutorials
  - [ ] FAQ section
  - [ ] Troubleshooting guide

- [ ] **Developer Documentation**
  - [ ] Contributing guide
  - [ ] Code style guide
  - [ ] Testing guide
  - [ ] Release process

### Launch Preparation

- [ ] **Data Migration**
  - [ ] Plan data migration strategy
  - [ ] Create migration scripts
  - [ ] Test migration on staging
  - [ ] Execute production migration

- [ ] **User Onboarding**
  - [ ] Create onboarding flow
  - [ ] Prepare training materials
  - [ ] Set up help center
  - [ ] Plan user training sessions

- [ ] **Quality Assurance**
  - [ ] Perform UAT (User Acceptance Testing)
  - [ ] Fix critical bugs
  - [ ] Perform security audit
  - [ ] Perform load testing
  - [ ] Fix performance issues

- [ ] **Launch**
  - [ ] Create launch checklist
  - [ ] Plan rollout strategy (phased vs. full)
  - [ ] Prepare rollback plan
  - [ ] Execute launch
  - [ ] Monitor closely post-launch

---

## ADDITIONAL FEATURES & ENHANCEMENTS

### Nice-to-Have Features (Post-MVP)

- [ ] **Mobile Apps**
  - [ ] Native iOS app (React Native)
  - [ ] Native Android app (React Native)
  - [ ] Offline-first capabilities

- [ ] **Advanced Analytics**
  - [ ] Machine learning models for predictive maintenance
  - [ ] Advanced anomaly detection
  - [ ] Automated insights and recommendations

- [ ] **Multilingual Support**
  - [ ] i18n setup
  - [ ] Translation management
  - [ ] Support for local languages (Swahili, French, etc.)

- [ ] **Advanced Reporting**
  - [ ] Custom report builder
  - [ ] Scheduled reports
  - [ ] Interactive dashboards

- [ ] **Integration APIs**
  - [ ] Public API for third-party integrations
  - [ ] Webhooks for events
  - [ ] SDK for developers

---

## CURRENT PRIORITIES SUMMARY

### Week 1: Foundation (CRITICAL)
1. Create all configuration files (package.json, tsconfig.json, next.config.js, etc.)
2. Set up PostgreSQL database
3. Implement core libraries (@/lib/db, @/lib/auth, @/lib/utils, etc.)
4. Install and configure UI component library (shadcn/ui)
5. Set up authentication (NextAuth)

### Week 2-3: Core Infrastructure
1. Fix all existing API routes (replace mocks with real implementations)
2. Create main layout and navigation
3. Create authentication pages
4. Create role-based dashboards
5. Implement file upload system

### Week 4-7: Module Implementation
1. **Week 4**: Diagnostics & Training module (backend + frontend)
2. **Week 5**: Compliance module (backend + frontend)
3. **Week 6**: Maintenance module (backend + frontend)
4. **Week 7**: Production/QC module (backend + frontend)

### Week 8-10: Procurement & Logistics
1. **Week 8**: Procurement module (backend + frontend)
2. **Week 9**: Logistics module (backend + frontend)
3. **Week 10**: Integration and testing

### Week 11-12: Production Readiness
1. Testing and bug fixes
2. Performance optimization
3. Security hardening
4. Documentation
5. Deployment

---

## Notes
- This TODO list is comprehensive and covers ~60-65% remaining work
- Estimated total time: 10-12 weeks with 2-3 developers
- Priority should be given to PHASE 0 and PHASE 1 first
- Each module can be developed independently after core infrastructure is complete
- Testing should be done continuously, not just at the end
- Regular code reviews and security audits recommended
