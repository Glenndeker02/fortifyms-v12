# FortifyMIS v12 - Implementation Rules & Roadmap

## Project Overview
**Project**: FortifyMIS Portal v12
**Purpose**: Comprehensive digital platform for food fortification operations
**Tech Stack**: Next.js 14+, TypeScript, Prisma, PostgreSQL, NextAuth, Tailwind CSS, shadcn/ui
**Target Users**: Mill Operators, Mill Managers, FWGA Inspectors, Program Managers, Institutional Buyers, Logistics Planners

---

## Core Implementation Principles

### 1. Development Philosophy
- **Quality over Speed**: Write clean, maintainable, well-tested code
- **Security First**: Every feature must be secure by design
- **User-Centric**: Always consider user experience and accessibility
- **Mobile-Responsive**: All interfaces must work on mobile devices
- **Offline-Capable**: Consider offline scenarios, especially for mobile users
- **Performance-Conscious**: Optimize for fast load times and smooth interactions

### 2. Code Standards
- **TypeScript Strict Mode**: All code must pass TypeScript strict checks
- **No `any` Types**: Use proper typing or `unknown` with type guards
- **Functional Components**: Use React functional components with hooks
- **Named Exports**: Prefer named exports over default exports (except for pages)
- **Error Handling**: Always handle errors gracefully with user-friendly messages
- **Comments**: Write clear comments for complex logic
- **Consistent Naming**:
  - Components: PascalCase (e.g., `BatchForm`)
  - Functions: camelCase (e.g., `calculatePremixVariance`)
  - Files: kebab-case (e.g., `batch-form.tsx`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)

### 3. Git Workflow
- **Branch Naming**:
  - Features: `feature/module-name-description`
  - Fixes: `fix/issue-description`
  - Hotfixes: `hotfix/critical-issue`
- **Commit Messages**:
  - Format: `type(scope): description`
  - Types: feat, fix, docs, style, refactor, test, chore
  - Example: `feat(compliance): add compliance audit submission`
- **Pull Requests**:
  - One feature per PR
  - Include description of changes
  - Reference related issues
  - Ensure all tests pass
  - Request code review

### 4. Testing Strategy
- **Test Coverage**: Aim for 80%+ coverage
- **Test Pyramid**:
  - Many unit tests (60%)
  - Some integration tests (30%)
  - Few E2E tests (10%)
- **Test-Driven Development**: Write tests before implementation when possible
- **Critical Paths**: Always test critical user flows

---

## Implementation Roadmap

### Phase 0: Foundation & Setup (Week 1)
**Goal**: Create a runnable application with authentication

#### Day 1-2: Project Configuration
- Create all configuration files (package.json, tsconfig.json, etc.)
- Install all dependencies
- Configure Tailwind CSS and shadcn/ui
- Set up ESLint and Prettier
- Verify project builds successfully

#### Day 3-4: Database & Core Libraries
- Migrate to PostgreSQL
- Create @/lib/db.ts, @/lib/auth.ts, @/lib/utils.ts
- Run database migrations and seed data

#### Day 5: Authentication & Layout
- Implement authentication system
- Create main layout with navigation
- Create login/register pages

**Deliverable**: Working application with login capability

### Phase 1-4: See TODO.md for detailed breakdown

---

## Module Development Rules

### Rule 1: Database First
Always ensure database models exist in Prisma schema before implementing features.

### Rule 2: Backend Before Frontend
For each feature:
1. Implement API route
2. Test API with Postman/Insomnia
3. Implement frontend
4. Test frontend integration

### Rule 3: One Module at a Time
- Focus on completing one module fully before moving to the next
- Complete both backend and frontend for a module before moving on

### Rule 4: No Mocks in Production Code
- Remove all mock data from API routes
- Connect to real database
- Use real authentication

### Rule 5: Mobile-First UI
- Design for mobile devices first
- Ensure all features work on small screens
- Test on actual mobile devices

### Rule 6: Security at Every Layer
- Validate all inputs (use Zod schemas)
- Sanitize all outputs
- Check authentication on all protected routes
- Implement RBAC correctly
- Use HTTPS in production

### Rule 7: User Feedback
- Always show loading states
- Provide clear error messages
- Show success confirmations
- Handle edge cases gracefully

### Rule 8: Performance Budget
- API responses: < 500ms (P95)
- Page load: < 3s
- Time to interactive: < 5s

### Rule 9: Accessibility
- All interactive elements must be keyboard accessible
- Proper ARIA labels
- Color contrast ratios e 4.5:1
- Screen reader friendly

### Rule 10: Documentation
- Document all API endpoints
- Write clear component prop descriptions
- Keep README updated

---

## Success Metrics

### Technical Metrics
- Build time: < 2 minutes
- Test coverage: > 80%
- Lighthouse score: > 90
- API response time: < 500ms (P95)
- Zero critical security vulnerabilities

### Product Metrics
- User registration flow completion: > 90%
- Task completion rate: > 85%
- Mobile usage: > 40% of traffic
- User satisfaction: > 4/5 stars

---

## Review Checklist

Before marking any feature as complete, verify:

- [ ] Feature works as specified in newprd.md
- [ ] All edge cases handled
- [ ] Error messages are user-friendly
- [ ] Loading states implemented
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] API authenticated and authorized
- [ ] Input validated on server-side
- [ ] Unit tests written and passing
- [ ] Code reviewed by peer
- [ ] Documentation updated

---

**Next Steps**: Begin with Phase 0 immediately. See TODO.md for complete task breakdown.