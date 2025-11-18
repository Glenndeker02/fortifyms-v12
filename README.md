# FortifyMIS v12 - Food Fortification Management System

A comprehensive digital platform designed to transform food fortification operations across multiple mills and geographies. Built with Next.js 14, TypeScript, Prisma, and modern React libraries.

## 🚀 Features Implemented

### ✅ 1. PDF Certificate Generation
- **Component**: `src/components/certificates/TrainingCertificatePDF.tsx`
- Professional certificate templates using `@react-pdf/renderer`
- Includes verification codes, completion dates, scores, and course details
- Downloadable as PDF with unique verification codes

### ✅ 2. Certificate APIs
- **Download API**: `/api/certificates/download/[id]` - Generate and download certificates as PDF
- **Verification API**: `/api/certificates/verify` - Verify certificate authenticity via verification code
- Support for both GET and POST methods for verification

### ✅ 3. FWGA Diagnostic Analytics Dashboard
- **Dashboard**: `/diagnostics/analytics`
- **API**: `/api/diagnostics/analytics`
- Comprehensive analytics including:
  - Total diagnostics and completion rates
  - Issues identified and categorized
  - Top 10 most common problems
  - 30-day trend analysis
  - Mill-by-mill performance tracking
- Interactive charts using Recharts
- Date range filtering

### ✅ 4. Doser Calibration Simulator
- **Component**: `src/components/simulators/DoserCalibrationSimulator.tsx`
- Interactive calibration verification tool
- Real-time calculation of:
  - Flow rate deviation and tolerance check
  - Required premix quantities
  - Dosing time estimates
  - Adjustment factors
- Support for both volumetric and gravimetric dosers
- Visual status indicators and recommendations

### ✅ 5. Premix Dosing Calculator
- **Component**: `src/components/calculators/PremixDosingCalculator.tsx`
- Precise premix quantity calculations
- Support for multiple nutrients (Iron, Vitamin A, Folic Acid, Zinc, Custom)
- Safety margin calculations and QC target ranges

### ✅ 6. Interactive Process Flow Animations
Built with Framer Motion for smooth, educational animations

#### Rice Parboiling Animation
- 8-stage process visualization with interactive controls
- Temperature and timing parameters for each stage
- Step-by-step navigation and progress indicators

#### Maize Fortification Animation
- 8-stage milling and fortification process
- Animated visual elements showing grain processing

### ✅ 7. Training Module UI
- Course catalog with filtering by category and level
- Quick access to simulators and animations
- Responsive design with modern aesthetics

### ✅ 8. Digital Compliance & Standard Checklist Module
**Backend APIs (9 components):**
- Compliance scoring calculation with weighted points
- Automated suggestion engine with rule-based recommendations
- What-if analysis for scenario modeling
- Compliance report PDF generation
- Inspector review and approval system
- Annotation system for photo markup
- Red flag detection and alerting
- Template version control
- Evidence upload for photos and documents

**Frontend Components (15 components):**
- Template builder with section editor
- Drag-and-drop section reordering
- Checklist item definition forms (all field types)
- Scoring rules configuration interface
- Audit form with accordion sections and progress tracking
- Evidence capture with camera and file upload
- Real-time compliance scoring with color coding
- Red flag visual indicators and summary panel
- What-if analysis interactive tool
- Compliance report preview and export
- Inspector review dashboard with queue management
- Annotation tools for markup (highlight, arrow, callout)
- Two-way messaging within audit records
- Mill compliance dashboard with audit history
- Template management interface

## 📁 Key Files Created

```
src/
├── app/
│   ├── api/certificates/{download,verify}/
│   ├── api/diagnostics/analytics/
│   ├── diagnostics/analytics/page.tsx
│   ├── training/{page.tsx,animations,simulators}
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── animations/{RiceParboiling,MaizeFortification}Animation.tsx
│   ├── calculators/PremixDosingCalculator.tsx
│   ├── certificates/TrainingCertificatePDF.tsx
│   └── simulators/DoserCalibrationSimulator.tsx
└── lib/{db.ts,utils.ts}
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Prisma (SQLite)
- **UI**: Tailwind CSS, Framer Motion, Recharts
- **PDF**: @react-pdf/renderer
- **Icons**: Lucide React

## 🚦 Getting Started

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📚 Routes

### Training & Diagnostics
- `/training` - Training center with course catalog
- `/training/animations` - Interactive process animations
- `/training/simulators` - Calibration and dosing calculators
- `/diagnostics/analytics` - FWGA analytics dashboard

### Compliance
- `/compliance/dashboard` - Mill compliance dashboard
- `/compliance/inspector` - Inspector review dashboard
- `/compliance/templates/create` - Create compliance template
- `/compliance/audits/[id]` - Audit form with evidence capture

### APIs
- `/api/certificates/download/[id]` - Download certificates
- `/api/certificates/verify` - Verify certificates
- `/api/diagnostics/analytics` - Analytics API
- `/api/compliance/templates` - Template CRUD
- `/api/compliance/audits` - Audit CRUD
- `/api/compliance/audits/[id]/calculate-score` - Calculate compliance score
- `/api/compliance/audits/[id]/what-if` - What-if analysis
- `/api/compliance/audits/[id]/review` - Inspector review
- `/api/compliance/audits/[id]/report` - Download PDF report
- `/api/compliance/suggestions` - Get improvement suggestions
- `/api/compliance/annotations` - Annotation CRUD
- `/api/compliance/evidence/upload` - Upload evidence files

---

**Built with ❤️ for better nutrition worldwide**
