# Diagnostics & Training Module - Implementation TODO List

**Created:** 2025-11-18
**Status:** Ready for Implementation
**Estimated Total Effort:** 330-450 hours (8-11 weeks)
**Current Progress:** Phase 1 - 20% Complete (Category Selection Done)

---

## Implementation Phases Overview

| Phase | Focus Area | Priority | Status | Estimated Hours |
|-------|-----------|----------|--------|-----------------|
| **Phase 1** | Core Diagnostic Wizard | 🔴 HIGH | 20% Complete | 60-80h |
| **Phase 2** | Video Player & Quiz System | 🔴 HIGH | Not Started | 70-90h |
| **Phase 3** | Certification & Dashboards | 🟡 MEDIUM | Not Started | 50-70h |
| **Phase 4** | Notification System | 🟡 MEDIUM | Not Started | 40-60h |
| **Phase 5** | Interactive Simulations | 🟢 LOW | Not Started | 60-80h |
| **Phase 6** | Offline Support & Polish | 🟢 LOW | Not Started | 50-70h |

---

## 🔴 PHASE 1: Core Diagnostic Wizard (Week 1-2) - HIGH PRIORITY

**Goal:** Make diagnostic questionnaires fully functional and usable by technicians

**Current Status:** 20% Complete (Category selection done)

### ✅ Completed Tasks

- [x] **1.0** Create diagnostic category selection page (`/diagnostics/new`)
  - Grid layout of diagnostic categories
  - Subcategory selection flow
  - 3-step progress indicator
  - Integration with `/api/diagnostics/categories`
  - Integration with `/api/diagnostics/questionnaire`

### ⏳ Pending Tasks

#### **1.1 Interactive Questionnaire Wizard Page** ⭐ CRITICAL
**File:** `/src/app/(dashboard)/diagnostics/wizard/[id]/page.tsx`

**Requirements:**
- [ ] Create dynamic route for wizard with diagnostic ID parameter
- [ ] Fetch questionnaire data from `/api/diagnostics/questionnaire`
- [ ] Display questionnaire title and category
- [ ] Show progress indicator (current question / total questions)
- [ ] Implement question navigation (Next, Back, Skip buttons)
- [ ] Auto-save responses on every answer
- [ ] Handle resume functionality for incomplete diagnostics
- [ ] Submit completed diagnostic to `/api/diagnostics/submit`

**Technical Specifications:**
```typescript
// State management
const [currentStep, setCurrentStep] = useState(0);
const [responses, setResponses] = useState<Record<string, any>>({});
const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
const [diagnosticId, setDiagnosticId] = useState<string>('');

// Auto-save every answer
useEffect(() => {
  if (Object.keys(responses).length > 0) {
    autoSaveResponses();
  }
}, [responses]);

// Branching logic - show/hide questions based on conditions
const shouldShowQuestion = (question: Question) => {
  if (!question.conditional) return true;
  // Evaluate branching condition based on previous responses
  return evaluateBranchingCondition(question, responses);
};
```

**UI Components Needed:**
- Progress bar showing step X of Y
- Question title and help tooltip
- Dynamic question input (see 1.2)
- Navigation buttons
- Save indicator ("Last saved: 2 minutes ago")

**Estimated Effort:** 12-16 hours

---

#### **1.2 Dynamic Question Renderer Component** ⭐ CRITICAL
**File:** `/src/components/diagnostics/QuestionRenderer.tsx`

**Requirements:**
- [ ] Render different question types based on `question.type`
- [ ] Support numeric input with unit display
- [ ] Support yes/no toggle buttons
- [ ] Support dropdown select with options
- [ ] Display expected range/target value
- [ ] Show help icon with tooltip
- [ ] Validate input before allowing next step
- [ ] Highlight out-of-range values

**Question Types to Support:**
1. **Numeric Input**
   ```tsx
   <div>
     <Label>Enter soaking temperature (°C)</Label>
     <Input
       type="number"
       value={value}
       onChange={handleChange}
     />
     <p className="text-sm text-muted-foreground">
       Expected range: 65-75°C
     </p>
     {isOutOfRange && (
       <Alert variant="warning">
         Value is outside expected range
       </Alert>
     )}
   </div>
   ```

2. **Yes/No Toggle**
   ```tsx
   <div className="flex gap-4">
     <Button
       variant={value === 'yes' ? 'default' : 'outline'}
       onClick={() => handleChange('yes')}
     >
       Yes
     </Button>
     <Button
       variant={value === 'no' ? 'default' : 'outline'}
       onClick={() => handleChange('no')}
     >
       No
     </Button>
   </div>
   ```

3. **Dropdown Selection**
   ```tsx
   <Select value={value} onValueChange={handleChange}>
     <SelectTrigger>
       <SelectValue placeholder="Select option" />
     </SelectTrigger>
     <SelectContent>
       {options.map(opt => (
         <SelectItem key={opt} value={opt}>{opt}</SelectItem>
       ))}
     </SelectContent>
   </Select>
   ```

**Estimated Effort:** 8-10 hours

---

#### **1.3 Branching Logic Implementation** ⭐ CRITICAL
**File:** `/src/lib/diagnostic-logic.ts`

**Requirements:**
- [ ] Parse branching conditions from questionnaire
- [ ] Evaluate conditions based on current responses
- [ ] Determine next questions to show
- [ ] Handle nested branching (question A → B → C)
- [ ] Support multiple branching paths

**Logic Example:**
```typescript
interface BranchingRule {
  condition: string; // "value < 65 || value > 75"
  nextQuestions: string[]; // ["temp_alarm_check", "heating_system_check"]
}

export function evaluateBranchingCondition(
  question: Question,
  responses: Record<string, any>
): boolean {
  if (!question.branching) return true;

  // Evaluate condition string
  const condition = question.branching.condition;
  const value = responses[question.id];

  // Safe eval alternative using Function constructor
  try {
    const evaluator = new Function('value', `return ${condition}`);
    return evaluator(value);
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

export function getNextQuestions(
  currentQuestion: Question,
  responses: Record<string, any>,
  allQuestions: Question[]
): Question[] {
  const nextQuestions: Question[] = [];

  // Check if branching is triggered
  if (currentQuestion.branching) {
    const branchingRules = Object.values(currentQuestion.branching);

    for (const rule of branchingRules) {
      if (evaluateBranchingCondition(rule.condition, responses)) {
        // Add conditional questions
        const conditionalQuestions = allQuestions.filter(q =>
          rule.nextQuestions.includes(q.id)
        );
        nextQuestions.push(...conditionalQuestions);
      }
    }
  }

  return nextQuestions;
}
```

**Estimated Effort:** 10-12 hours

---

#### **1.4 Progress Bar and Navigation**
**File:** `/src/components/diagnostics/DiagnosticProgress.tsx`

**Requirements:**
- [ ] Visual progress bar showing completion percentage
- [ ] Step counter (Question 3 of 12)
- [ ] Next button (disabled if no answer)
- [ ] Back button (enabled if not first question)
- [ ] Skip button (if question is optional)
- [ ] Submit button (on last question)
- [ ] Confirmation dialog before submitting

**UI Design:**
```tsx
<div className="space-y-4">
  {/* Progress Bar */}
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>Question {currentStep + 1} of {totalQuestions}</span>
      <span>{Math.round(progress)}% Complete</span>
    </div>
    <Progress value={progress} />
  </div>

  {/* Navigation */}
  <div className="flex justify-between">
    <Button
      variant="outline"
      onClick={handleBack}
      disabled={currentStep === 0}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>

    <div className="flex gap-2">
      {isOptional && (
        <Button variant="ghost" onClick={handleSkip}>
          Skip
        </Button>
      )}

      {isLastQuestion ? (
        <Button onClick={handleSubmit}>
          Submit Diagnostic
        </Button>
      ) : (
        <Button
          onClick={handleNext}
          disabled={!hasAnswer}
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
</div>
```

**Estimated Effort:** 6-8 hours

---

#### **1.5 Save/Resume Functionality**
**Requirements:**
- [ ] Auto-save responses every 30 seconds
- [ ] Save to `/api/diagnostics/save` endpoint
- [ ] Show save indicator in UI
- [ ] Load saved progress on page load
- [ ] Handle offline save (localStorage backup)
- [ ] Sync local storage with server when online

**Implementation:**
```typescript
// Auto-save hook
const useAutoSave = (diagnosticId: string, responses: any) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saveTimer = setTimeout(async () => {
      if (Object.keys(responses).length > 0) {
        setIsSaving(true);
        try {
          await fetch('/api/diagnostics/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              diagnosticId,
              responses,
              currentStep,
            }),
          });
          setLastSaved(new Date());
          // Also save to localStorage as backup
          localStorage.setItem(`diagnostic_${diagnosticId}`, JSON.stringify({
            responses,
            currentStep,
            savedAt: new Date(),
          }));
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(saveTimer);
  }, [responses, diagnosticId, currentStep]);

  return { lastSaved, isSaving };
};
```

**Estimated Effort:** 8-10 hours

---

#### **1.6 Photo Upload Component**
**File:** `/src/components/diagnostics/PhotoUploader.tsx`

**Requirements:**
- [ ] Click to upload or drag-and-drop
- [ ] Support multiple photos per question
- [ ] Image preview before upload
- [ ] Compress images before upload (max 1MB each)
- [ ] Upload to cloud storage (S3 or similar)
- [ ] Store photo URLs in diagnostic result
- [ ] Show upload progress
- [ ] Allow delete uploaded photos

**Technical Stack:**
- Use `react-dropzone` for file handling
- Use `browser-image-compression` for client-side compression
- Use presigned S3 URLs for secure uploads

**UI Example:**
```tsx
<div className="space-y-4">
  <Label>Attach Photos (Optional)</Label>
  <div
    {...getRootProps()}
    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary"
  >
    <input {...getInputProps()} />
    <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground">
      Click to upload or drag and drop photos
    </p>
  </div>

  {/* Preview uploaded photos */}
  <div className="grid grid-cols-3 gap-4">
    {photos.map((photo, idx) => (
      <div key={idx} className="relative">
        <img src={photo.preview} alt="" className="rounded-lg" />
        <Button
          size="icon"
          variant="destructive"
          className="absolute top-2 right-2"
          onClick={() => removePhoto(idx)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    ))}
  </div>
</div>
```

**Estimated Effort:** 10-12 hours

---

#### **1.7 Diagnostic Results Detail Page** ⭐ CRITICAL
**File:** `/src/app/(dashboard)/diagnostics/results/[id]/page.tsx`

**Requirements:**
- [ ] Display diagnostic summary (category, date, user, status)
- [ ] Show all questions and answers
- [ ] List flagged issues with severity badges
- [ ] Display recommendations with priority
- [ ] Link recommendations to training modules
- [ ] Action buttons (Mark Resolved, Retry, Schedule Follow-Up, Request Support)
- [ ] Export results as PDF
- [ ] Show attached photos

**Page Sections:**
1. **Summary Card**
   - Category and subcategory
   - Completion date
   - Performed by (user name)
   - Overall status (Pass/Warning/Fail)
   - Severity level

2. **Flagged Issues Section**
   ```tsx
   {flaggedIssues.map(issue => (
     <Card key={issue.id}>
       <CardHeader>
         <div className="flex items-start justify-between">
           <div>
             <CardTitle>{issue.title}</CardTitle>
             <CardDescription>{issue.description}</CardDescription>
           </div>
           <Badge variant={getSeverityVariant(issue.severity)}>
             {issue.severity}
           </Badge>
         </div>
       </CardHeader>
       <CardContent>
         <p className="text-sm text-muted-foreground mb-4">
           <strong>Impact:</strong> {issue.impact}
         </p>
         {/* Show related recommendation */}
         <RecommendationCard recommendation={getRecommendation(issue.id)} />
       </CardContent>
     </Card>
   ))}
   ```

3. **Recommendations Section**
   ```tsx
   {recommendations.map(rec => (
     <Card key={rec.issue}>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Lightbulb className="h-5 w-5 text-primary" />
           Recommended Action
         </CardTitle>
       </CardHeader>
       <CardContent>
         <p className="font-medium mb-2">{rec.action}</p>
         <div className="flex items-center justify-between">
           <Badge variant={getPriorityVariant(rec.priority)}>
             {rec.priority} Priority
           </Badge>
           {rec.trainingModule && (
             <Button
               variant="outline"
               size="sm"
               onClick={() => navigateToTraining(rec.trainingModule)}
             >
               <BookOpen className="mr-2 h-4 w-4" />
               View Training
             </Button>
           )}
         </div>
       </CardContent>
     </Card>
   ))}
   ```

4. **Actions Section**
   ```tsx
   <div className="flex gap-3">
     <Button onClick={handleMarkResolved}>
       <CheckCircle className="mr-2 h-4 w-4" />
       Mark Resolved
     </Button>
     <Button variant="outline" onClick={handleRetry}>
       <RotateCw className="mr-2 h-4 w-4" />
       Retry Diagnostic
     </Button>
     <Button variant="outline" onClick={handleScheduleFollowUp}>
       <Calendar className="mr-2 h-4 w-4" />
       Schedule Follow-Up
     </Button>
     <Button variant="outline" onClick={handleRequestSupport}>
       <HelpCircle className="mr-2 h-4 w-4" />
       Request Support
     </Button>
     <Button variant="outline" onClick={handleExportPDF}>
       <Download className="mr-2 h-4 w-4" />
       Export PDF
     </Button>
   </div>
   ```

**Estimated Effort:** 14-16 hours

---

#### **1.8 Recommendations Display UI**
**File:** `/src/components/diagnostics/RecommendationCard.tsx`

**Requirements:**
- [ ] Display recommendation action text
- [ ] Show priority level (Critical/High/Medium/Low)
- [ ] Link to training module if available
- [ ] "Mark as Done" checkbox
- [ ] Expand/collapse detailed instructions
- [ ] Track completion status

**Estimated Effort:** 4-6 hours

---

### Phase 1 Total Estimate: 60-80 hours

---

## 🔴 PHASE 2: Video Player & Quiz System (Week 3-4) - HIGH PRIORITY

**Goal:** Enable interactive video training with embedded assessments

### **2.1 Integrate React Player**
**File:** Install and configure video player library

**Requirements:**
- [ ] Install `react-player` library
- [ ] Create video player wrapper component
- [ ] Configure for multiple video sources (YouTube, Vimeo, local files)
- [ ] Set up player event handlers (play, pause, progress)

**Installation:**
```bash
npm install react-player
```

**Estimated Effort:** 4-6 hours

---

### **2.2 Create Module Player Page** ⭐ CRITICAL
**File:** `/src/app/(dashboard)/training/courses/[courseId]/modules/[moduleId]/page.tsx`

**Requirements:**
- [ ] Fetch module details with video URL
- [ ] Render video player with custom controls
- [ ] Display module content below video
- [ ] Show module navigation (previous/next)
- [ ] Track video watch progress
- [ ] Prevent skipping ahead until watched
- [ ] Auto-load next module on completion
- [ ] Save progress to `/api/training/progress`

**Page Layout:**
```tsx
<div className="container mx-auto p-6">
  {/* Header */}
  <div className="mb-6">
    <Button variant="ghost" onClick={() => router.back()}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back to Course
    </Button>
    <h1 className="text-2xl font-bold mt-4">{module.title}</h1>
    <p className="text-muted-foreground">
      Module {module.order} of {totalModules}
    </p>
  </div>

  {/* Video Player */}
  <Card className="mb-6">
    <CardContent className="p-0">
      <VideoPlayer
        url={module.videoUrl}
        onProgress={handleProgress}
        onComplete={handleComplete}
        controls={true}
      />
    </CardContent>
  </Card>

  {/* Module Content */}
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>About This Module</CardTitle>
    </CardHeader>
    <CardContent>
      <div dangerouslySetInnerHTML={{ __html: module.content }} />
    </CardContent>
  </Card>

  {/* Embedded Quiz */}
  {module.quizzes.length > 0 && (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge Check</CardTitle>
        <CardDescription>
          Complete this quiz to proceed to the next module
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QuizRenderer quizzes={module.quizzes} onComplete={handleQuizComplete} />
      </CardContent>
    </Card>
  )}

  {/* Navigation */}
  <div className="flex justify-between mt-6">
    <Button
      variant="outline"
      onClick={handlePrevious}
      disabled={isFirstModule}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Previous Module
    </Button>
    <Button
      onClick={handleNext}
      disabled={!canProceed}
    >
      Next Module
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
</div>
```

**Estimated Effort:** 16-20 hours

---

### **2.3 Video Controls & Features**
**File:** `/src/components/training/VideoPlayer.tsx`

**Requirements:**
- [ ] Play/pause button
- [ ] Progress scrubber
- [ ] Volume control
- [ ] Playback speed (0.5x, 1x, 1.5x, 2x)
- [ ] Fullscreen toggle
- [ ] Closed captions (if available)
- [ ] Bookmark current timestamp
- [ ] Resume from last position
- [ ] Prevent seeking ahead (for first-time viewers)

**Custom Controls:**
```tsx
<div className="relative">
  <ReactPlayer
    url={url}
    playing={playing}
    volume={volume}
    playbackRate={playbackRate}
    onProgress={handleProgress}
    onEnded={handleEnded}
    ref={playerRef}
  />

  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-4">
    {/* Progress Bar */}
    <Slider
      value={[played * 100]}
      onValueChange={handleSeek}
      max={100}
      step={0.1}
      disabled={!allowSeeking}
    />

    {/* Controls Row */}
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center gap-4">
        <Button size="icon" variant="ghost" onClick={togglePlay}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <span className="text-white text-sm">
          {formatTime(playedSeconds)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Speed Control */}
        <Select value={playbackRate.toString()} onValueChange={handleSpeedChange}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5x</SelectItem>
            <SelectItem value="1">1x</SelectItem>
            <SelectItem value="1.5">1.5x</SelectItem>
            <SelectItem value="2">2x</SelectItem>
          </SelectContent>
        </Select>

        {/* Bookmark */}
        <Button size="icon" variant="ghost" onClick={handleBookmark}>
          <Bookmark className="text-white" />
        </Button>

        {/* Fullscreen */}
        <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
          <Maximize className="text-white" />
        </Button>
      </div>
    </div>
  </div>
</div>
```

**Estimated Effort:** 12-14 hours

---

### **2.4 Quiz Renderer Component** ⭐ CRITICAL
**File:** `/src/components/training/QuizRenderer.tsx`

**Requirements:**
- [ ] Display questions sequentially or all at once
- [ ] Support multiple choice questions
- [ ] Support true/false questions
- [ ] Support multiple select questions
- [ ] Randomize question order (optional)
- [ ] Randomize answer order
- [ ] Track selected answers
- [ ] Calculate score
- [ ] Provide immediate feedback
- [ ] Show correct answers after submission

**Question Types:**
```tsx
// Multiple Choice
const MultipleChoiceQuestion = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="font-medium">{question.question}</p>
      <RadioGroup value={selected} onValueChange={setSelected}>
        {question.options.map((option, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <RadioGroupItem value={option} id={`q${question.id}-${idx}`} />
            <Label htmlFor={`q${question.id}-${idx}`}>{option}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

// True/False
const TrueFalseQuestion = ({ question, onAnswer }) => {
  const [selected, setSelected] = useState<boolean | null>(null);

  return (
    <div className="space-y-4">
      <p className="font-medium">{question.question}</p>
      <div className="flex gap-4">
        <Button
          variant={selected === true ? 'default' : 'outline'}
          onClick={() => setSelected(true)}
          className="flex-1"
        >
          True
        </Button>
        <Button
          variant={selected === false ? 'default' : 'outline'}
          onClick={() => setSelected(false)}
          className="flex-1"
        >
          False
        </Button>
      </div>
    </div>
  );
};
```

**Estimated Effort:** 14-16 hours

---

### **2.5 Quiz Feedback System**
**File:** `/src/components/training/QuizFeedback.tsx`

**Requirements:**
- [ ] Show correct/incorrect immediately after answer
- [ ] Display explanation for each answer
- [ ] Highlight correct answer in green
- [ ] Highlight incorrect selection in red
- [ ] Show points earned
- [ ] Prevent changing answer after submission
- [ ] Allow retry with different randomized questions

**Feedback UI:**
```tsx
{showFeedback && (
  <Alert variant={isCorrect ? 'success' : 'destructive'} className="mt-4">
    <AlertTitle className="flex items-center gap-2">
      {isCorrect ? (
        <>
          <CheckCircle className="h-5 w-5" />
          Correct! (+{question.points} points)
        </>
      ) : (
        <>
          <XCircle className="h-5 w-5" />
          Incorrect
        </>
      )}
    </AlertTitle>
    <AlertDescription>
      {question.explanation}
      {!isCorrect && (
        <p className="mt-2 font-medium">
          Correct answer: {question.correctAnswer}
        </p>
      )}
    </AlertDescription>
  </Alert>
)}
```

**Estimated Effort:** 8-10 hours

---

### **2.6 End-of-Course Assessment**
**File:** `/src/app/(dashboard)/training/courses/[id]/assessment/page.tsx`

**Requirements:**
- [ ] Comprehensive quiz covering all modules
- [ ] Time limit display (optional)
- [ ] Question counter
- [ ] Review mode before submission
- [ ] Minimum passing score (80%)
- [ ] Retake option if failed
- [ ] Issue certificate if passed
- [ ] Save attempt to database

**Assessment Flow:**
```tsx
// Assessment states
const [questions, setQuestions] = useState<Quiz[]>([]);
const [answers, setAnswers] = useState<Record<string, any>>({});
const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
const [isReviewing, setIsReviewing] = useState(false);
const [result, setResult] = useState<AssessmentResult | null>(null);

// Timer
useEffect(() => {
  if (!isReviewing && timeRemaining > 0) {
    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }
}, [isReviewing, timeRemaining]);

// Auto-submit when time runs out
useEffect(() => {
  if (timeRemaining === 0) {
    handleSubmit();
  }
}, [timeRemaining]);

// Submit assessment
const handleSubmit = async () => {
  const score = calculateScore(answers, questions);
  const passed = score >= 80;

  const response = await fetch('/api/training/assessment/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      answers,
      score,
      passed,
    }),
  });

  const data = await response.json();
  setResult(data.result);

  if (passed) {
    // Generate certificate
    await generateCertificate(courseId);
  }
};
```

**Estimated Effort:** 16-18 hours

---

### Phase 2 Total Estimate: 70-90 hours

---

## 🟡 PHASE 3: Certification & Dashboards (Week 5-6) - MEDIUM PRIORITY

**Goal:** Provide completion credentials and comprehensive progress tracking

### **3.1 Certificate PDF Generation** ⭐ CRITICAL
**File:** `/src/lib/certificate-generator.tsx`

**Requirements:**
- [ ] Use @react-pdf/renderer to create PDF
- [ ] Design professional certificate template
- [ ] Include branding (logo, colors)
- [ ] Generate unique certificate ID
- [ ] Include QR code for verification
- [ ] Add user name, course title, completion date, score
- [ ] Sign with digital signature
- [ ] Store certificate record in database

**Certificate Template:**
```tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#fff',
  },
  border: {
    border: '4px solid #0066cc',
    padding: 40,
    height: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 20,
  },
  // ... more styles
});

export const CertificateTemplate = ({ user, course, score, certificateId }) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.border}>
        <View style={styles.header}>
          <Image src="/logo.png" style={styles.logo} />
          <Text style={styles.title}>Certificate of Completion</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>This is to certify that</Text>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.subtitle}>has successfully completed</Text>
          <Text style={styles.courseName}>{course.title}</Text>
          <Text style={styles.details}>
            with a score of {score}% on {format(new Date(), 'MMMM d, yyyy')}
          </Text>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.signature}>_______________________</Text>
            <Text style={styles.signatureName}>Program Manager</Text>
          </View>
          <View>
            <Image src={qrCodeUrl} style={styles.qrCode} />
            <Text style={styles.certificateId}>ID: {certificateId}</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);
```

**API Endpoint:**
```typescript
// POST /api/training/certificates/generate
export async function POST(request: NextRequest) {
  const { userId, courseId, score } = await request.json();

  // Generate unique certificate ID
  const certificateId = `CERT-${nanoid(12)}`.toUpperCase();

  // Create certificate record
  const certificate = await db.certificate.create({
    data: {
      certificateId,
      userId,
      courseId,
      score,
      issuedAt: new Date(),
      expiresAt: addYears(new Date(), 2), // 2-year validity
    },
  });

  // Generate QR code for verification
  const qrCodeUrl = await generateQRCode(`${APP_URL}/verify/${certificateId}`);

  // Generate PDF
  const pdfBlob = await pdf(
    <CertificateTemplate
      user={user}
      course={course}
      score={score}
      certificateId={certificateId}
      qrCodeUrl={qrCodeUrl}
    />
  ).toBlob();

  // Upload to S3
  const pdfUrl = await uploadToS3(pdfBlob, `certificates/${certificateId}.pdf`);

  // Update certificate with PDF URL
  await db.certificate.update({
    where: { id: certificate.id },
    data: { pdfUrl },
  });

  return NextResponse.json({ certificate, pdfUrl });
}
```

**Estimated Effort:** 16-20 hours

---

### **3.2 Certificate APIs**
**Files:** Certificate verification and download endpoints

**Requirements:**
- [ ] `GET /api/training/certificates/:id` - Get certificate details
- [ ] `GET /api/training/certificates/:id/pdf` - Download PDF
- [ ] `GET /api/training/certificates/:id/verify` - Verify authenticity
- [ ] `GET /api/training/certificates/user/:userId` - List user certificates
- [ ] Handle expired certificates
- [ ] Track certificate downloads

**Estimated Effort:** 8-10 hours

---

### **3.3 Personal Training Dashboard**
**File:** `/src/app/(dashboard)/training/dashboard/page.tsx`

**Requirements:**
- [ ] Display enrolled courses with progress
- [ ] Show completed courses with scores
- [ ] List earned certificates
- [ ] Recommended courses based on diagnostics
- [ ] Time spent learning (weekly/monthly)
- [ ] Upcoming deadlines for mandatory training
- [ ] Achievement badges (optional)
- [ ] Learning streak tracker

**Dashboard Layout:**
```tsx
<div className="space-y-6">
  {/* Stats Overview */}
  <div className="grid gap-4 md:grid-cols-4">
    <StatCard
      title="Courses Completed"
      value={completedCount}
      icon={<CheckCircle />}
      trend="+2 this month"
    />
    <StatCard
      title="Certificates Earned"
      value={certificateCount}
      icon={<Award />}
    />
    <StatCard
      title="Hours Learned"
      value={hoursSpent}
      icon={<Clock />}
      trend="+12h this week"
    />
    <StatCard
      title="Current Streak"
      value={`${streak} days`}
      icon={<Flame />}
    />
  </div>

  {/* In Progress Courses */}
  <Card>
    <CardHeader>
      <CardTitle>Continue Learning</CardTitle>
    </CardHeader>
    <CardContent>
      {inProgressCourses.map(course => (
        <CourseProgressCard key={course.id} course={course} />
      ))}
    </CardContent>
  </Card>

  {/* Recommended Courses */}
  <Card>
    <CardHeader>
      <CardTitle>Recommended For You</CardTitle>
      <CardDescription>
        Based on your diagnostic results and role
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3">
        {recommendedCourses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </CardContent>
  </Card>

  {/* Certificates */}
  <Card>
    <CardHeader>
      <CardTitle>My Certificates</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-2">
        {certificates.map(cert => (
          <CertificateCard key={cert.id} certificate={cert} />
        ))}
      </div>
    </CardContent>
  </Card>
</div>
```

**Estimated Effort:** 12-16 hours

---

### **3.4 Manager Team Dashboard**
**File:** `/src/app/(dashboard)/training/team/page.tsx`

**Requirements:**
- [ ] Team training completion rates
- [ ] Individual progress drilldown
- [ ] Training gaps by role
- [ ] Compliance status overview
- [ ] Export team training report
- [ ] Assign mandatory training
- [ ] Send reminder notifications

**Key Features:**
```tsx
<div className="space-y-6">
  {/* Team Overview */}
  <div className="grid gap-4 md:grid-cols-3">
    <StatCard
      title="Team Size"
      value={teamSize}
      icon={<Users />}
    />
    <StatCard
      title="Avg Completion Rate"
      value={`${avgCompletion}%`}
      icon={<TrendingUp />}
    />
    <StatCard
      title="Overdue Training"
      value={overdueCount}
      icon={<AlertCircle />}
      variant="destructive"
    />
  </div>

  {/* Team Members Table */}
  <Card>
    <CardHeader>
      <CardTitle>Team Training Status</CardTitle>
      <div className="flex gap-2">
        <Button onClick={handleAssignTraining}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Training
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Courses Completed</TableHead>
            <TableHead>Completion Rate</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMembers.map(member => (
            <TableRow key={member.id}>
              <TableCell>{member.name}</TableCell>
              <TableCell>{member.role}</TableCell>
              <TableCell>{member.completedCourses}/{member.totalCourses}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={member.completionRate} className="w-24" />
                  <span className="text-sm">{member.completionRate}%</span>
                </div>
              </TableCell>
              <TableCell>{formatDistanceToNow(member.lastActive)} ago</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" onClick={() => viewDetails(member.id)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>

  {/* Training Gaps Analysis */}
  <Card>
    <CardHeader>
      <CardTitle>Training Gaps by Role</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={gapsByRole}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="role" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="required" fill="#0088FE" name="Required" />
          <Bar dataKey="completed" fill="#00C49F" name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
</div>
```

**Estimated Effort:** 14-18 hours

---

### **3.5 Diagnostic Analytics Dashboard (FWGA)**
**File:** `/src/app/(dashboard)/diagnostics/analytics/page.tsx`

**Requirements:**
- [ ] Common problem areas across mills
- [ ] Diagnostic completion rates by mill/region
- [ ] Most frequently accessed training modules
- [ ] Correlation between diagnostics and QC performance
- [ ] Trend analysis over time
- [ ] Export analytics report

**Analytics Charts:**
```tsx
<div className="space-y-6">
  {/* Key Metrics */}
  <div className="grid gap-4 md:grid-cols-4">
    <StatCard
      title="Total Diagnostics"
      value={totalDiagnostics}
      icon={<Activity />}
      trend="+15% this month"
    />
    <StatCard
      title="Completion Rate"
      value={`${completionRate}%`}
      icon={<CheckCircle />}
    />
    <StatCard
      title="Avg Issues Per Diagnostic"
      value={avgIssues.toFixed(1)}
      icon={<AlertCircle />}
    />
    <StatCard
      title="Mills Participating"
      value={millCount}
      icon={<Building />}
    />
  </div>

  {/* Common Issues */}
  <Card>
    <CardHeader>
      <CardTitle>Most Common Issues</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={commonIssues}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="issue" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#FF8042" name="Occurrences" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>

  {/* Diagnostics by Category */}
  <Card>
    <CardHeader>
      <CardTitle>Diagnostics by Category</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={diagnosticsByCategory}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {diagnosticsByCategory.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>

  {/* Training Module Usage */}
  <Card>
    <CardHeader>
      <CardTitle>Top Training Modules (from Diagnostics)</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>Recommendations</TableHead>
            <TableHead>Completions</TableHead>
            <TableHead>Completion Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topModules.map(module => (
            <TableRow key={module.id}>
              <TableCell>{module.name}</TableCell>
              <TableCell>{module.recommendations}</TableCell>
              <TableCell>{module.completions}</TableCell>
              <TableCell>
                {((module.completions / module.recommendations) * 100).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</div>
```

**Estimated Effort:** 12-14 hours

---

### Phase 3 Total Estimate: 50-70 hours

---

## 🟡 PHASE 4: Notification & Alert System (Week 7-8) - MEDIUM PRIORITY

**Goal:** Proactive training guidance through intelligent alerts

### **4.1 Notification Database Schema**
**File:** `prisma/schema.prisma`

**Requirements:**
- [ ] Add Notification model
- [ ] Add TrainingRecommendation model
- [ ] Add NotificationPreference model
- [ ] Run database migration

**Schema:**
```prisma
model Notification {
  id           String   @id @default(cuid())
  userId       String
  type         NotificationType
  title        String
  message      String   @db.Text
  priority     Priority
  status       NotificationStatus @default(UNREAD)
  actionUrl    String?
  metadata     Json?
  snoozedUntil DateTime?
  createdAt    DateTime @default(now())
  readAt       DateTime?

  user         User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@index([createdAt])
}

enum NotificationType {
  DIAGNOSTIC_ALERT
  TRAINING_DUE
  TRAINING_RECOMMENDED
  CERTIFICATE_EXPIRING
  COMPLIANCE_ALERT
  QC_FAILURE
  SYSTEM_ANNOUNCEMENT
}

enum Priority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum NotificationStatus {
  UNREAD
  READ
  DISMISSED
  SNOOZED
  ACTIONED
}

model TrainingRecommendation {
  id         String   @id @default(cuid())
  userId     String
  courseId   String
  reason     RecommendationReason
  priority   Priority
  status     String   @default("PENDING")
  sourceId   String?  // ID of diagnostic, audit, etc.
  metadata   Json?
  createdAt  DateTime @default(now())

  user       User           @relation(fields: [userId], references: [id])
  course     TrainingCourse @relation(fields: [courseId], references: [id])

  @@index([userId, status])
  @@index([createdAt])
}

enum RecommendationReason {
  DIAGNOSTIC_RESULT
  COMPLIANCE_GAP
  ROLE_REQUIREMENT
  QC_FAILURE
  EQUIPMENT_CHANGE
  CERTIFICATION_EXPIRING
}

model NotificationPreference {
  id            String  @id @default(cuid())
  userId        String  @unique
  emailEnabled  Boolean @default(true)
  pushEnabled   Boolean @default(true)
  smsEnabled    Boolean @default(false)
  preferences   Json?   // Type-specific preferences

  user          User    @relation(fields: [userId], references: [id])
}
```

**Estimated Effort:** 4-6 hours

---

### **4.2 Notification APIs**
**Files:** Notification management endpoints

**Requirements:**
- [ ] `POST /api/notifications/create` - Create notification
- [ ] `GET /api/notifications` - List user notifications
- [ ] `GET /api/notifications/unread/count` - Get unread count
- [ ] `PATCH /api/notifications/:id/read` - Mark as read
- [ ] `PATCH /api/notifications/:id/dismiss` - Dismiss notification
- [ ] `PATCH /api/notifications/:id/snooze` - Snooze notification
- [ ] `DELETE /api/notifications/:id` - Delete notification

**Example API:**
```typescript
// GET /api/notifications
export async function GET(request: NextRequest) {
  const session = await requireAuth();
  const { searchParams } = new URL(request.url);

  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const { skip, take } = getPaginationParams(request);

  const where: any = { userId: session.user.id };
  if (status) where.status = status;
  if (type) where.type = type;

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    db.notification.count({ where }),
  ]);

  return successResponse({ notifications, total });
}

// PATCH /api/notifications/:id/read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAuth();

  const notification = await db.notification.update({
    where: {
      id: params.id,
      userId: session.user.id, // Ensure ownership
    },
    data: {
      status: 'READ',
      readAt: new Date(),
    },
  });

  return successResponse(notification);
}
```

**Estimated Effort:** 10-12 hours

---

### **4.3 Notification Center UI**
**File:** `/src/components/notifications/NotificationCenter.tsx`

**Requirements:**
- [ ] Dropdown panel in header
- [ ] Unread count badge
- [ ] List recent notifications
- [ ] Mark as read on click
- [ ] Dismiss notification
- [ ] Snooze notification
- [ ] Navigate to action URL
- [ ] Filter by type
- [ ] View all notifications page

**Notification Bell Component:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  </PopoverTrigger>

  <PopoverContent className="w-96 p-0" align="end">
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className="font-semibold">Notifications</h3>
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllRead}
        >
          Mark all read
        </Button>
      )}
    </div>

    <ScrollArea className="h-96">
      {notifications.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No notifications</p>
        </div>
      ) : (
        <div>
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={handleRead}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </ScrollArea>

    <div className="p-3 border-t">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => router.push('/notifications')}
      >
        View All
      </Button>
    </div>
  </PopoverContent>
</Popover>
```

**Notification Item:**
```tsx
<div
  className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
    notification.status === 'UNREAD' ? 'bg-primary/5' : ''
  }`}
  onClick={() => handleClick(notification)}
>
  <div className="flex items-start gap-3">
    <div className={`mt-1 ${getPriorityColor(notification.priority)}`}>
      {getNotificationIcon(notification.type)}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm">{notification.title}</p>
        {notification.status === 'UNREAD' && (
          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
        )}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
        {notification.message}
      </p>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </span>

        <div className="flex gap-2">
          {notification.status === 'UNREAD' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRead(notification.id);
              }}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(notification.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Estimated Effort:** 12-14 hours

---

### **4.4 Alert Triggering Logic**
**File:** `/src/lib/alert-triggers.ts`

**Requirements:**
- [ ] Diagnostic-based triggers (on completion)
- [ ] Compliance-based triggers (on audit finding)
- [ ] Performance-based triggers (on QC failure)
- [ ] Time-based triggers (certification expiring)
- [ ] Role-based triggers (new equipment)
- [ ] Batch processing for periodic checks

**Trigger Implementations:**

**1. Diagnostic-Based Alert:**
```typescript
// Triggered after diagnostic completion
export async function triggerDiagnosticAlert(diagnosticResult: DiagnosticResult) {
  const recommendations = JSON.parse(diagnosticResult.recommendations || '[]');

  for (const rec of recommendations) {
    if (rec.trainingModule) {
      // Find related training course
      const course = await db.trainingCourse.findFirst({
        where: {
          modules: {
            some: {
              // Match by module identifier
              content: { contains: rec.trainingModule },
            },
          },
        },
      });

      if (course) {
        // Create training recommendation
        await db.trainingRecommendation.create({
          data: {
            userId: diagnosticResult.userId,
            courseId: course.id,
            reason: 'DIAGNOSTIC_RESULT',
            priority: rec.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            sourceId: diagnosticResult.id,
            metadata: {
              issue: rec.issue,
              action: rec.action,
            },
          },
        });

        // Create notification
        await db.notification.create({
          data: {
            userId: diagnosticResult.userId,
            type: 'TRAINING_RECOMMENDED',
            title: 'Training Recommended',
            message: `Based on your recent diagnostic, we recommend completing: ${course.title}`,
            priority: rec.priority === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
            actionUrl: `/training/courses/${course.id}`,
            metadata: {
              diagnosticId: diagnosticResult.id,
              courseId: course.id,
            },
          },
        });
      }
    }
  }
}
```

**2. QC Failure Alert:**
```typescript
export async function triggerQCFailureAlert(qcTest: QualityTest) {
  if (qcTest.result === 'FAIL') {
    // Find relevant training course
    const course = await findCourseByCategory('Quality Control');

    if (course) {
      await db.notification.create({
        data: {
          userId: qcTest.performedById,
          type: 'QC_FAILURE',
          title: 'QC Test Failed - Training Available',
          message: `Recent QC test failed. Review ${course.title} to improve quality procedures.`,
          priority: 'HIGH',
          actionUrl: `/training/courses/${course.id}`,
          metadata: {
            qcTestId: qcTest.id,
            testType: qcTest.testType,
          },
        },
      });
    }
  }
}
```

**3. Certificate Expiring Alert (Cron Job):**
```typescript
// Run daily via cron
export async function checkExpiringCertificates() {
  const thirtyDaysFromNow = addDays(new Date(), 30);

  const expiringCertificates = await db.certificate.findMany({
    where: {
      expiresAt: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
      notified: false,
    },
    include: {
      user: true,
      course: true,
    },
  });

  for (const cert of expiringCertificates) {
    await db.notification.create({
      data: {
        userId: cert.userId,
        type: 'CERTIFICATE_EXPIRING',
        title: 'Certificate Expiring Soon',
        message: `Your ${cert.course.title} certificate expires in ${
          differenceInDays(cert.expiresAt, new Date())
        } days. Renew to maintain certification.`,
        priority: 'HIGH',
        actionUrl: `/training/courses/${cert.courseId}`,
        metadata: {
          certificateId: cert.certificateId,
          expiresAt: cert.expiresAt,
        },
      },
    });

    // Mark as notified
    await db.certificate.update({
      where: { id: cert.id },
      data: { notified: true },
    });
  }
}
```

**Estimated Effort:** 12-14 hours

---

### **4.5 Push Notification Integration**
**File:** `/src/lib/push-notifications.ts`

**Requirements:**
- [ ] Set up Firebase Cloud Messaging or OneSignal
- [ ] Request browser notification permission
- [ ] Subscribe user to push notifications
- [ ] Send push notifications from server
- [ ] Handle notification clicks
- [ ] Manage notification preferences

**Service Worker Setup:**
```typescript
// public/service-worker.js
self.addEventListener('push', (event) => {
  const data = event.data.json();

  const options = {
    body: data.message,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {
      url: data.actionUrl,
    },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view' && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
```

**Client Setup:**
```typescript
// Request permission and subscribe
export async function subscribeToPushNotifications() {
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });

  // Send subscription to server
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });

  return subscription;
}
```

**Server-Side Push:**
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:support@fortifyms.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function sendPushNotification(
  userId: string,
  notification: {
    title: string;
    message: string;
    actionUrl?: string;
  }
) {
  // Get user's push subscriptions
  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        JSON.parse(sub.subscription),
        JSON.stringify(notification)
      );
    } catch (error) {
      // Handle expired/invalid subscriptions
      if (error.statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}
```

**Estimated Effort:** 10-12 hours

---

### Phase 4 Total Estimate: 40-60 hours

---

## 🟢 PHASE 5: Interactive Simulations (Week 9-10) - LOW PRIORITY

### **5.1 Doser Calibration Simulator**
**File:** `/src/components/simulations/DoserSimulator.tsx`

**Requirements:**
- [ ] Virtual doser with adjustable parameters
- [ ] Input/output visualization
- [ ] Real-time feedback on accuracy
- [ ] Calibration drift simulation
- [ ] Compare to target values
- [ ] Generate calibration report

**Estimated Effort:** 20-24 hours

---

### **5.2 Premix Dosing Calculator**
**File:** `/src/components/simulations/PremixCalculator.tsx`

**Requirements:**
- [ ] Input batch size and target fortification level
- [ ] Calculate required premix quantity
- [ ] Validate against allowable ranges
- [ ] Show step-by-step calculations
- [ ] Save calculations for reference

**Estimated Effort:** 10-12 hours

---

### **5.3 Interactive Process Flows**
**File:** `/src/components/simulations/ProcessFlowSimulation.tsx`

**Requirements:**
- [ ] Animated process diagrams
- [ ] Interactive parameter controls
- [ ] Visual feedback on changes
- [ ] Before/after comparisons
- [ ] Integration with training modules

**Estimated Effort:** 30-34 hours

---

### Phase 5 Total Estimate: 60-80 hours

---

## 🟢 PHASE 6: Offline Support & Polish (Week 11-12) - LOW PRIORITY

### **6.1 Service Worker Implementation**
**Requirements:**
- [ ] Set up Workbox for offline caching
- [ ] Cache static assets
- [ ] Cache API responses
- [ ] Background sync for submissions
- [ ] Update notification

**Estimated Effort:** 16-20 hours

---

### **6.2 Content Downloads**
**Requirements:**
- [ ] Download course modules for offline viewing
- [ ] Download diagnostic questionnaires
- [ ] Manage storage quota
- [ ] Sync when back online

**Estimated Effort:** 14-16 hours

---

### **6.3 Offline Video Playback**
**Requirements:**
- [ ] Download videos to IndexedDB
- [ ] Play from local storage
- [ ] Progress tracking offline
- [ ] Sync progress when online

**Estimated Effort:** 12-14 hours

---

### **6.4 Performance & Accessibility**
**Requirements:**
- [ ] Code splitting for faster loads
- [ ] Image optimization
- [ ] ARIA labels for screen readers
- [ ] Keyboard navigation
- [ ] Focus management
- [ ] Color contrast compliance

**Estimated Effort:** 8-10 hours

---

### Phase 6 Total Estimate: 50-70 hours

---

## 📊 Implementation Summary

| Phase | Focus | Priority | Status | Hours | Dependencies |
|-------|-------|----------|--------|-------|--------------|
| **Phase 1** | Diagnostic Wizard | 🔴 HIGH | 20% | 60-80h | None |
| **Phase 2** | Video & Quizzes | 🔴 HIGH | 0% | 70-90h | Phase 1 |
| **Phase 3** | Certificates & Dashboards | 🟡 MEDIUM | 0% | 50-70h | Phase 2 |
| **Phase 4** | Notifications | 🟡 MEDIUM | 0% | 40-60h | Phase 3 |
| **Phase 5** | Simulations | 🟢 LOW | 0% | 60-80h | Phase 2 |
| **Phase 6** | Offline & Polish | 🟢 LOW | 0% | 50-70h | All phases |
| **TOTAL** | | | **8%** | **330-450h** | 8-11 weeks |

---

## 🎯 Recommended Execution Order

### **Sprint 1-2 (Weeks 1-2): Phase 1 - CRITICAL**
Focus on completing the diagnostic wizard to enable immediate user value.

**Deliverables:**
- Interactive questionnaire wizard
- Dynamic question rendering
- Branching logic
- Results detail page
- Recommendations display

**Success Criteria:**
- Technicians can complete full diagnostic flow
- Branching questions work correctly
- Recommendations link to training

---

### **Sprint 3-4 (Weeks 3-4): Phase 2 - HIGH VALUE**
Enable video training with assessments.

**Deliverables:**
- Video module player
- Quiz system
- End-of-course assessments
- Progress tracking

**Success Criteria:**
- Users can watch training videos
- Embedded quizzes work
- Progress is saved

---

### **Sprint 5-6 (Weeks 5-6): Phase 3 - CREDENTIALS**
Provide completion credentials and dashboards.

**Deliverables:**
- Certificate generation
- Personal dashboard
- Manager dashboard
- Analytics dashboard

**Success Criteria:**
- Certificates generated on completion
- Dashboards show accurate data
- Reports can be exported

---

### **Sprint 7-8 (Weeks 7-8): Phase 4 - ENGAGEMENT**
Drive engagement through notifications.

**Deliverables:**
- Notification system
- Alert triggers
- Push notifications

**Success Criteria:**
- Alerts generated based on diagnostics
- Users receive timely notifications
- Training completion rate improves

---

### **Sprint 9-12 (Weeks 9-12): Phases 5-6 - ENHANCEMENT**
Polish with simulations and offline support.

**Deliverables:**
- Interactive simulations
- Offline support
- Performance optimization

**Success Criteria:**
- Simulations functional
- Works offline
- Fast page loads

---

## 📝 Notes

- Each phase builds on the previous one
- Priorities can be adjusted based on user feedback
- Testing should be integrated throughout
- Content creation (videos, quizzes) should happen in parallel
- Pilot with 5-10 users after Phase 1 and Phase 2

---

**Created:** 2025-11-18
**Document Version:** 1.0
**Total Estimated Effort:** 330-450 hours (8-11 weeks with 2 developers)
