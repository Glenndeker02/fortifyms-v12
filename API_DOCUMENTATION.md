# FortifyMIS API Documentation

Complete API reference for the FortifyMIS platform - Phases 1-4 implementation.

## Table of Contents

1. [Authentication](#authentication)
2. [Procurement & RFP APIs](#procurement--rfp-apis)
3. [Logistics & Delivery APIs](#logistics--delivery-apis)
4. [Support System APIs](#support-system-apis)
5. [IoT & Predictive Maintenance APIs](#iot--predictive-maintenance-apis)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints require authentication using session cookies. The authentication system uses:

- **Session-based authentication** with HTTP-only cookies
- **Role-Based Access Control (RBAC)** with 8 roles and 92 permissions
- **Automatic data isolation** by mill/tenant

### Roles

- `SYSTEM_ADMIN` - Full system access
- `FWGA_PROGRAM_MANAGER` - Program oversight
- `MILL_MANAGER` - Mill operations management
- `MILL_OPERATOR` - Production operations
- `QUALITY_CONTROL_OFFICER` - Quality assurance
- `INSTITUTIONAL_BUYER` - Procurement access
- `DRIVER_LOGISTICS` - Delivery operations
- `ACCOUNTANT_FINANCE` - Financial operations

---

## Procurement & RFP APIs

### Buyer Management

#### Register Institutional Buyer
```http
POST /api/buyers/register
```

**Request Body:**
```json
{
  "email": "buyer@school.edu",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+234801234567",
  "organizationName": "Lagos State School Board",
  "organizationType": "SCHOOL",
  "registrationNumber": "RC123456",
  "taxId": "TIN987654",
  "contactPerson": "Jane Smith",
  "contactEmail": "contact@school.edu",
  "contactPhone": "+234801234568",
  "address": {
    "street": "123 Education St",
    "city": "Lagos",
    "state": "Lagos State",
    "postalCode": "100001",
    "country": "Nigeria"
  },
  "annualPurchaseVolume": 5000,
  "preferredCommodities": ["MAIZE", "SORGHUM"],
  "bankDetails": {
    "bankName": "First Bank",
    "accountNumber": "1234567890",
    "bankBranch": "Ikeja"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Buyer registration submitted successfully",
  "data": {
    "user": { "id": "...", "email": "..." },
    "buyerProfile": { "id": "...", "verificationStatus": "PENDING" }
  }
}
```

#### List Buyers
```http
GET /api/buyers
```

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string): PENDING, APPROVED, REJECTED, SUSPENDED
- `organizationType` (string): SCHOOL, NGO, GOVERNMENT_AGENCY, etc.

**Permissions:** `BUYER_VIEW` or `BUYER_VERIFY`

#### Verify Buyer (FWGA Only)
```http
POST /api/buyers/{id}/verify
```

**Request Body:**
```json
{
  "approved": true,
  "verificationNotes": "All documents verified",
  "creditLimit": 50000000
}
```

**Permissions:** `BUYER_VERIFY` (FWGA Program Manager or Admin only)

---

### RFP Management

#### Create RFP
```http
POST /api/rfps
```

**Request Body:**
```json
{
  "title": "Procurement of Maize for School Feeding Program",
  "commodity": "MAIZE",
  "totalVolume": 1000,
  "unitPackaging": "50kg bags",
  "budgetRange": "50-60 million NGN",
  "bidDeadline": "2025-12-31T23:59:59Z",
  "deliveryDeadline": "2026-02-28T00:00:00Z",
  "description": "High-quality maize for school feeding...",
  "qualitySpecs": "{\"moistureContent\":\"Max 13.5%\",\"purity\":\"Min 98%\"}",
  "deliveryLocation": "Lagos State Warehouse, Ikeja",
  "deliverySchedule": "SINGLE",
  "preferredPaymentTerms": "NET_30",
  "evaluationCriteria": {
    "price": { "weight": 40 },
    "quality": { "weight": 30 },
    "delivery": { "weight": 15 },
    "capacity": { "weight": 10 },
    "trackRecord": { "weight": 5 }
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "RFP created successfully",
  "data": {
    "rfp": {
      "id": "cm3x...",
      "referenceNumber": "RFP-2025-LAG-0001",
      "status": "DRAFT",
      "...": "..."
    }
  }
}
```

**Permissions:** `RFP_CREATE` (Institutional Buyer)

**Auto-generated Reference Number:** `RFP-YYYY-ORG-####`
- `YYYY` = Current year
- `ORG` = First 3 letters of organization name
- `####` = Sequential number for the year

#### List RFPs
```http
GET /api/rfps
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `status` (string): DRAFT, OPEN, CLOSED, AWARDED
- `commodity` (string): MAIZE, SORGHUM, MILLET, etc.
- `sortBy` (string): createdAt, bidDeadline, totalVolume
- `sortOrder` (string): asc, desc

**Permissions:** `RFP_VIEW`

#### Get RFP Details
```http
GET /api/rfps/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rfp": {
      "id": "...",
      "referenceNumber": "RFP-2025-LAG-0001",
      "title": "...",
      "commodity": "MAIZE",
      "totalVolume": 1000,
      "status": "OPEN",
      "bidDeadline": "2025-12-31T23:59:59Z",
      "buyer": { "organizationName": "..." },
      "bids": [...]
    }
  }
}
```

#### Publish RFP
```http
POST /api/rfps/{id}/publish
```

**Effect:** Changes status from DRAFT → OPEN, makes RFP visible to mills

**Permissions:** `RFP_PUBLISH` (Buyer or FWGA)

#### Close RFP
```http
POST /api/rfps/{id}/close
```

**Effect:** Changes status to CLOSED, stops accepting new bids

**Permissions:** `RFP_EDIT` (Buyer)

#### Evaluate Bids
```http
POST /api/rfps/{id}/evaluate
```

**Request Body:**
```json
{
  "bidScores": [
    {
      "bidId": "cm3x...",
      "scores": {
        "price": 85,
        "quality": 90,
        "delivery": 80,
        "capacity": 85,
        "trackRecord": 75
      },
      "notes": "Strong technical proposal",
      "disqualified": false
    }
  ],
  "evaluationNotes": "Comprehensive evaluation completed"
}
```

**Algorithm:**
- Calculates weighted score: `totalScore = Σ(score × weight) / Σ(weight)`
- Auto-shortlists bids with score ≥ 70
- Updates bid status: SHORTLISTED or remains SUBMITTED

**Response:**
```json
{
  "success": true,
  "data": {
    "evaluatedCount": 5,
    "shortlistedCount": 3,
    "topBid": {
      "bidId": "...",
      "score": 85.5
    }
  }
}
```

**Permissions:** `BID_EVALUATE` (Buyer or FWGA)

#### Award RFP
```http
POST /api/rfps/{id}/award
```

**Request Body:**
```json
{
  "bidId": "cm3x...",
  "awardNotes": "Best value for money",
  "createPurchaseOrder": true
}
```

**Effect:**
- Updates winning bid status to AWARDED
- Updates RFP status to AWARDED
- Marks other bids as NOT_SELECTED
- Optionally creates purchase order with auto-generated PO number

**Auto-generated PO Number:** `PO-YYYY-######`

**Response:**
```json
{
  "success": true,
  "data": {
    "rfpId": "...",
    "bidId": "...",
    "millName": "Premium Grain Mills",
    "totalAmount": 55000000,
    "purchaseOrder": {
      "id": "...",
      "poNumber": "PO-2025-000001"
    }
  }
}
```

**Permissions:** `BID_AWARD` (Buyer, FWGA, or Admin)

---

### Bidding System

#### Create Bid
```http
POST /api/bids
```

**Request Body:**
```json
{
  "rfpId": "cm3x...",
  "unitPrice": 55000,
  "totalBidAmount": 55000000,
  "priceValidity": 30,
  "deliveryMethod": "BUYER_LOCATION",
  "leadTime": 14,
  "paymentTerms": "NET_30",
  "qualityCertificates": "ISO 9001, NAFDAC",
  "productionCapacity": 5000,
  "technicalProposal": "Comprehensive quality assurance...",
  "deliverySchedule": "Weekly deliveries starting Feb 1",
  "sampleAvailable": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Bid created successfully",
  "data": {
    "bid": {
      "id": "...",
      "status": "DRAFT",
      "unitPrice": 55000,
      "totalBidAmount": 55000000
    }
  }
}
```

**Permissions:** `BID_CREATE` (Mill Manager/Operator)

#### Submit Bid
```http
POST /api/bids/{id}/submit
```

**Validation:**
- All required fields must be complete
- Bid deadline must not have passed
- Bid must be in DRAFT status

**Effect:** Changes status from DRAFT → SUBMITTED

**Permissions:** `BID_CREATE` (Mill - must own bid)

#### Withdraw Bid
```http
POST /api/bids/{id}/withdraw
```

**Request Body:**
```json
{
  "reason": "Unable to meet delivery timeline due to equipment maintenance"
}
```

**Constraints:**
- Can only withdraw DRAFT, SUBMITTED, or SHORTLISTED bids
- Cannot withdraw AWARDED bids

**Permissions:** `BID_WITHDRAW` (Mill - must own bid)

---

### Purchase Orders

#### List Purchase Orders
```http
GET /api/purchase-orders
```

**Query Parameters:**
- `page`, `limit`
- `status`: DRAFT, CONFIRMED, IN_PRODUCTION, IN_TRANSIT, DELIVERED, CANCELLED
- `sortBy`: createdAt, expectedDeliveryDate, totalAmount

#### Get Purchase Order Details
```http
GET /api/purchase-orders/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "...",
      "poNumber": "PO-2025-000001",
      "status": "CONFIRMED",
      "quantity": 1000,
      "unitPrice": 55000,
      "totalAmount": 55000000,
      "deliverySchedule": "...",
      "buyer": {...},
      "mill": {...},
      "rfp": {...}
    }
  }
}
```

---

## Logistics & Delivery APIs

### Route Management

#### Create Route with Optimization
```http
POST /api/routes
```

**Request Body:**
```json
{
  "name": "Lagos Metro Route",
  "startLocation": {
    "address": "Premium Grain Mills, Ikeja",
    "latitude": 6.5944,
    "longitude": 3.3389
  },
  "stops": [
    {
      "address": "School A, Victoria Island",
      "latitude": 6.4281,
      "longitude": 3.4219,
      "sequence": 1
    },
    {
      "address": "School B, Lekki",
      "latitude": 6.4474,
      "longitude": 3.4778,
      "sequence": 2
    }
  ],
  "endLocation": {
    "address": "Warehouse, Apapa",
    "latitude": 6.4474,
    "longitude": 3.3594
  },
  "optimize": true
}
```

**Optimization Algorithm:**
- Uses **Haversine formula** for accurate GPS distance calculation
- Applies **Nearest Neighbor algorithm** for TSP optimization
- Typical distance savings: 10-40%

**Haversine Formula:**
```
R = 6371 km (Earth's radius)
Δlat = (lat2 - lat1) × π/180
Δlon = (lon2 - lon1) × π/180

a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1-a))
d = R × c
```

**Response:**
```json
{
  "success": true,
  "data": {
    "route": {
      "id": "...",
      "name": "Lagos Metro Route",
      "totalDistance": 45.7,
      "estimatedDuration": 135,
      "optimizationData": {
        "originalDistance": 52.3,
        "optimizedDistance": 45.7,
        "savings": 6.6,
        "savingsPercentage": 12.6
      }
    }
  }
}
```

**Permissions:** `ROUTE_CREATE` (Mill Manager)

#### Get Route Details
```http
GET /api/routes/{id}
```

---

### Delivery Trip Management

#### Create Delivery Trip
```http
POST /api/delivery-trips
```

**Request Body:**
```json
{
  "routeId": "cm3x...",
  "driverId": "cm3x...",
  "vehicleId": "cm3x...",
  "scheduledDate": "2025-12-15",
  "orders": [
    {
      "orderId": "cm3x...",
      "sequence": 1,
      "deliveryLocation": {...}
    }
  ]
}
```

**Auto-generated Trip Number:** `TRIP-YYYYMM-####`

**Response:**
```json
{
  "success": true,
  "data": {
    "trip": {
      "id": "...",
      "tripNumber": "TRIP-202512-0001",
      "status": "SCHEDULED",
      "stops": 3,
      "completedStops": 0
    }
  }
}
```

**Permissions:** `TRIP_CREATE` (Mill Manager)

#### Start Trip
```http
POST /api/delivery-trips/{id}/start
```

**Effect:**
- Changes status to IN_PROGRESS
- Records start time
- Validates driver assignment

**Permissions:** `TRIP_START` (Driver or Manager)

#### Complete Trip
```http
POST /api/delivery-trips/{id}/complete
```

**Validation:**
- All deliveries must have proof of delivery (POD)
- Trip must be in IN_PROGRESS status

**Calculations:**
- Total distance from GPS tracking points
- Average speed = distance / duration
- Trip efficiency metrics

**Permissions:** `TRIP_COMPLETE` (Driver or Manager)

---

### GPS Tracking

#### Update Driver Location
```http
POST /api/tracking/update
```

**Request Body:**
```json
{
  "tripId": "cm3x...",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "accuracy": 15,
  "speed": 45.5,
  "heading": 180,
  "altitude": 25,
  "batteryLevel": 85
}
```

**Frequency:** Called every 30-60 seconds during active trips

**Effect:**
- Creates tracking point record
- Updates trip current location
- Triggers alert if offline > threshold

**Permissions:** `TRACKING_UPDATE` (Driver - must own trip)

#### Get Trip Tracking Data
```http
GET /api/tracking/trip/{id}
```

**Query Parameters:**
- `since` (ISO datetime): Get updates since timestamp

**Response:**
```json
{
  "success": true,
  "data": {
    "trip": {...},
    "tracking": {
      "points": [...],
      "latest": {
        "latitude": 6.5244,
        "longitude": 3.3792,
        "speed": 45.5,
        "timestamp": "2025-12-15T10:30:00Z"
      },
      "eta": "2025-12-15T12:45:00Z"
    }
  }
}
```

**ETA Calculation:**
```
distance_to_next = Haversine(current_location, next_stop)
avg_speed = average(last_10_tracking_points.speed) || 40 km/h
hours_to_next = distance_to_next / avg_speed
eta = current_time + hours_to_next
```

**Permissions:** `TRACKING_VIEW` (Buyer, Mill, Admin)

---

### Proof of Delivery (POD)

#### Create POD
```http
POST /api/pod
```

**Request Body:**
```json
{
  "tripId": "cm3x...",
  "orderId": "cm3x...",
  "quantityOrdered": 1000,
  "quantityDelivered": 995,
  "signatureUrl": "https://...",
  "photoUrls": ["https://...", "https://..."],
  "batchNumbers": ["BATCH-2025-001", "BATCH-2025-002"],
  "deliveryNotes": "5MT short due to damaged packaging"
}
```

**Auto-calculated:**
- `discrepancy = quantityDelivered - quantityOrdered`

**Effect:**
- Creates POD record with SUBMITTED status
- Updates delivery sequence in trip
- Increments completedStops counter

**Permissions:** `POD_CREATE` (Driver)

#### Verify POD (Buyer)
```http
POST /api/pod/{id}/verify
```

**Request Body:**
```json
{
  "verified": true,
  "notes": "Delivery confirmed in good condition"
}
```

**Effect:**
- Updates POD status: VERIFIED or DISPUTED
- If all PODs verified → updates order status to DELIVERED
- Sets actualDeliveryDate

**Permissions:** `POD_VERIFY` (Institutional Buyer only)

---

## Support System APIs

### Help Center

#### List Categories
```http
GET /api/help/categories
```

**Query Parameters:**
- `parentId` (string, optional): Filter by parent category
- `includeArticles` (boolean): Include articles in response

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "...",
        "name": "Getting Started",
        "slug": "getting-started",
        "description": "...",
        "icon": "📚",
        "_count": { "articles": 12, "subcategories": 3 }
      }
    ]
  }
}
```

**Permissions:** Public access

#### Create Article
```http
POST /api/help/articles
```

**Request Body:**
```json
{
  "title": "How to Create an RFP",
  "slug": "how-to-create-rfp",
  "summary": "Step-by-step guide to creating procurement requests",
  "content": "# Creating an RFP\n\n1. Navigate to...",
  "categoryId": "cm3x...",
  "tags": ["rfp", "procurement", "tutorial"],
  "status": "PUBLISHED",
  "featuredImage": "https://...",
  "metaDescription": "Learn how to create RFPs...",
  "relatedArticles": ["cm3x...", "cm3x..."]
}
```

**Permissions:** `HELP_MANAGE` (Admin or FWGA only)

#### Search Articles
```http
GET /api/help/articles
```

**Query Parameters:**
- `q` (string): Full-text search query
- `categoryId` (string)
- `tag` (string)
- `status`: DRAFT, PUBLISHED, ARCHIVED
- `featured` (boolean)
- `sortBy`: views, helpful, updated

**Full-text Search:** Searches in title, summary, and content fields

**Permissions:** Public for published, `HELP_MANAGE` for drafts

#### Get Article
```http
GET /api/help/articles/{slug}
```

**Effect:**
- Increments view count (for published articles)
- Returns related articles

**Permissions:** Public for published

#### Submit Feedback
```http
POST /api/help/articles/{id}/feedback
```

**Request Body:**
```json
{
  "helpful": true,
  "comment": "Very clear instructions!",
  "email": "user@example.com"
}
```

**Duplicate Prevention:** IP-based rate limiting (24-hour cooldown)

**Permissions:** Public access

---

### Support Tickets

#### Create Ticket
```http
POST /api/support/tickets
```

**Request Body:**
```json
{
  "subject": "Unable to submit bid",
  "description": "Getting error when trying to submit bid for RFP-2025-LAG-0001",
  "priority": "HIGH",
  "category": "TECHNICAL",
  "relatedResourceType": "RFP",
  "relatedResourceId": "cm3x...",
  "attachmentUrls": ["https://..."]
}
```

**Auto-generated Ticket Number:** `TICKET-YYYYMM-####`

**SLA Deadlines (auto-calculated):**
| Priority | First Response | Resolution |
|----------|---------------|------------|
| URGENT   | 1 hour        | 4 hours    |
| HIGH     | 2 hours       | 8 hours    |
| MEDIUM   | 8 hours       | 24 hours   |
| LOW      | 24 hours      | 72 hours   |

**Response:**
```json
{
  "success": true,
  "data": {
    "ticket": {
      "id": "...",
      "ticketNumber": "TICKET-202512-0001",
      "status": "OPEN",
      "priority": "HIGH",
      "firstResponseDue": "2025-12-15T12:00:00Z",
      "resolutionDue": "2025-12-15T18:00:00Z"
    }
  }
}
```

**Permissions:** `TICKET_CREATE`

#### List Tickets
```http
GET /api/support/tickets
```

**Query Parameters:**
- `status`: OPEN, IN_PROGRESS, WAITING_ON_USER, WAITING_ON_SUPPORT, RESOLVED, CLOSED
- `priority`: URGENT, HIGH, MEDIUM, LOW
- `category`: TECHNICAL, BILLING, ACCOUNT, PROCUREMENT, LOGISTICS, etc.
- `assignedTo` (string): Filter by assigned agent

**Access Control:**
- Regular users: Only see their own tickets
- With `TICKET_VIEW_ALL`: See all tickets

**Permissions:** `TICKET_VIEW`

#### Add Comment
```http
POST /api/support/tickets/{id}/comments
```

**Request Body:**
```json
{
  "content": "We've identified the issue and are working on a fix",
  "isInternal": false,
  "attachmentUrls": ["https://..."]
}
```

**Auto-behaviors:**
- Sets `firstResponseAt` on first support comment
- Auto-updates status based on commenter:
  - Support comment on WAITING_ON_SUPPORT → WAITING_ON_USER
  - User comment on WAITING_ON_USER → WAITING_ON_SUPPORT

**Permissions:** `TICKET_VIEW` (must be creator, assignee, or have TICKET_VIEW_ALL)

#### Assign Ticket
```http
POST /api/support/tickets/{id}/assign
```

**Request Body:**
```json
{
  "assignedTo": "cm3x...",
  "notes": "Escalating to senior support engineer"
}
```

**Effect:**
- Creates internal comment about assignment
- Changes status to IN_PROGRESS if currently OPEN

**Permissions:** `TICKET_ASSIGN` (Support staff only)

#### Close Ticket
```http
POST /api/support/tickets/{id}/close
```

**Request Body:**
```json
{
  "resolution": "Issue resolved by clearing browser cache and re-logging in",
  "satisfactionRating": 5
}
```

**Constraints:**
- Regular users: Can only close RESOLVED tickets
- Support staff: Can force-close any ticket

**Permissions:** `TICKET_RESOLVE`

---

## IoT & Predictive Maintenance APIs

### Sensor Management

#### Register Sensor
```http
POST /api/iot/sensors
```

**Request Body:**
```json
{
  "equipmentId": "cm3x...",
  "sensorType": "TEMPERATURE",
  "sensorId": "TEMP-MILL1-001",
  "manufacturer": "Honeywell",
  "model": "HTM2500",
  "location": "Main grinding unit - bearing housing",
  "minThreshold": 60,
  "maxThreshold": 90,
  "criticalMin": 50,
  "criticalMax": 100,
  "samplingInterval": 60,
  "unit": "°C",
  "calibrationDate": "2025-01-01T00:00:00Z",
  "nextCalibrationDue": "2025-07-01T00:00:00Z",
  "metadata": {
    "installationDate": "2025-01-01",
    "warrantyExpiry": "2027-01-01"
  }
}
```

**Supported Sensor Types:**
- TEMPERATURE
- HUMIDITY
- VIBRATION
- PRESSURE
- FLOW_RATE
- MOTOR_CURRENT
- BEARING_TEMPERATURE
- OIL_LEVEL
- DUST_LEVEL
- NOISE_LEVEL

**Permissions:** `SENSOR_MANAGE` (Mill Manager)

#### List Sensors
```http
GET /api/iot/sensors
```

**Query Parameters:**
- `equipmentId` (string)
- `sensorType` (string)
- `status`: ACTIVE, INACTIVE, MAINTENANCE, FAULTY
- `hasAlerts` (boolean): Filter sensors with active alerts

---

### Sensor Data Ingestion

#### Ingest Readings (Bulk)
```http
POST /api/iot/readings
```

**Request Body (Bulk):**
```json
{
  "readings": [
    {
      "sensorId": "cm3x...",
      "value": 85.5,
      "timestamp": "2025-12-15T10:00:00Z",
      "quality": 95
    },
    {
      "sensorId": "cm3x...",
      "value": 87.2,
      "timestamp": "2025-12-15T10:01:00Z"
    }
  ]
}
```

**Request Body (Single):**
```json
{
  "sensorId": "cm3x...",
  "value": 85.5,
  "quality": 95
}
```

**Limits:** Max 1000 readings per request

**Auto-behaviors:**
- Updates sensor `lastReadingAt`
- Checks thresholds and creates alerts automatically:
  - **CRITICAL** alert if value exceeds criticalMax/criticalMin
  - **WARNING** alert if value exceeds maxThreshold/minThreshold
- Prevents duplicate alerts for same condition

**Permissions:** `SENSOR_MANAGE` (Mill)

#### Query Readings
```http
GET /api/iot/readings
```

**Query Parameters:**
- `sensorId` (string, required)
- `startDate` (ISO datetime)
- `endDate` (ISO datetime)
- `aggregation`: raw, hourly, daily

**Aggregation Modes:**
- `raw`: Individual data points (default)
- `hourly`: Grouped by hour with avg/min/max
- `daily`: Grouped by day with avg/min/max

**Response (Aggregated):**
```json
{
  "success": true,
  "data": {
    "readings": [
      {
        "timestamp": "2025-12-15 10:00",
        "average": 85.7,
        "min": 84.2,
        "max": 87.3,
        "count": 60
      }
    ],
    "aggregation": "hourly"
  }
}
```

**Permissions:** `SENSOR_DATA_VIEW`

---

### Alert Management

#### List Alerts
```http
GET /api/iot/alerts
```

**Query Parameters:**
- `sensorId` (string)
- `equipmentId` (string)
- `severity`: INFO, WARNING, CRITICAL
- `status`: ACTIVE, ACKNOWLEDGED, RESOLVED

**Response:**
```json
{
  "success": true,
  "data": {
    "alerts": [...],
    "stats": [
      { "severity": "CRITICAL", "status": "ACTIVE", "_count": 3 },
      { "severity": "WARNING", "status": "ACTIVE", "_count": 12 }
    ]
  }
}
```

**Permissions:** `SENSOR_ALERT_VIEW`

#### Acknowledge Alert
```http
POST /api/iot/alerts/{id}/acknowledge
```

**Request Body:**
```json
{
  "notes": "Maintenance team notified, scheduled for inspection"
}
```

**Effect:** Status changes from ACTIVE → ACKNOWLEDGED

**Permissions:** `SENSOR_ALERT_VIEW`

#### Resolve Alert
```http
POST /api/iot/alerts/{id}/resolve
```

**Request Body:**
```json
{
  "resolution": "Replaced bearing, temperature returned to normal range",
  "rootCause": "Bearing wear due to insufficient lubrication",
  "preventiveMeasures": "Added bearing to weekly lubrication checklist"
}
```

**Effect:**
- Status changes to RESOLVED
- Auto-acknowledges if not already acknowledged
- Records resolution time for SLA metrics

**Permissions:** `SENSOR_ALERT_VIEW`

---

### Predictive Maintenance

#### Get Maintenance Insights
```http
GET /api/iot/predictive-maintenance
```

**Query Parameters:**
- `equipmentId` (string, optional): Analyze specific equipment

**Analysis Algorithm:**

**1. Data Collection:**
- Retrieves last 7 days of sensor readings
- Requires minimum 10 readings per sensor

**2. Statistical Analysis:**
```
mean = Σ(values) / count
variance = Σ(value - mean)² / count
std_dev = √variance
CV (Coefficient of Variation) = (std_dev / mean) × 100
```

**3. Drift Detection:**
```
recent_values = last_third_of_readings
early_values = first_third_of_readings
recent_mean = average(recent_values)
early_mean = average(early_values)
drift = ((recent_mean - early_mean) / early_mean) × 100
```

**4. Risk Assessment:**
| Condition | Risk Level | Confidence |
|-----------|-----------|-----------|
| value > criticalMax × 0.85 | CRITICAL | 85% |
| value > maxThreshold × 0.9 | HIGH | 75% |
| value > maxThreshold × 0.8 | MEDIUM | 60% |
| CV > 30% | MEDIUM | 65% |
| |drift| > 15% | MEDIUM | 70% |

**5. Time-to-Failure Prediction:**
```
days_to_threshold = ((threshold - recent_mean) / (recent_mean - early_mean)) × 7
predicted_failure_date = today + days_to_threshold (if < 90 days)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "equipmentId": "...",
        "equipmentName": "Main Grinding Unit",
        "overallRiskLevel": "HIGH",
        "sensorAnalyses": [
          {
            "sensorId": "...",
            "sensorType": "BEARING_TEMPERATURE",
            "riskLevel": "HIGH",
            "confidence": 75,
            "reasons": [
              "Approaching max threshold (90°C)",
              "Upward drift detected (18.5%)"
            ],
            "metrics": {
              "mean": 82.5,
              "stdDev": 4.2,
              "cv": 5.1,
              "drift": 18.5,
              "recentMean": 85.2
            },
            "predictedFailureDate": "2026-01-15T00:00:00Z",
            "recommendedAction": "SCHEDULE_MAINTENANCE"
          }
        ]
      }
    ],
    "summary": {
      "total": 15,
      "atRisk": 4,
      "critical": 1,
      "high": 2,
      "medium": 1
    }
  }
}
```

**Recommended Actions:**
- `IMMEDIATE_INSPECTION` - Critical risk
- `SCHEDULE_MAINTENANCE` - High risk
- `MONITOR_CLOSELY` - Medium risk
- `ROUTINE_MONITORING` - Low risk

**Permissions:** `PREDICTIVE_MAINTENANCE_VIEW`

---

## Error Handling

All API endpoints return standardized error responses:

### Error Response Format
```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or state conflict |
| 422 | Unprocessable Entity | Validation error (Zod schema) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Validation Errors

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "unitPrice",
      "message": "Unit price must be a positive number"
    },
    {
      "field": "bidDeadline",
      "message": "Bid deadline must be in the future"
    }
  ]
}
```

---

## Rate Limiting

**Article Feedback:** 1 submission per IP per article per 24 hours

---

## Data Types Reference

### Commodity Types
- MAIZE
- SORGHUM
- MILLET
- RICE
- WHEAT

### RFP Status
- DRAFT - Not yet published
- OPEN - Accepting bids
- CLOSED - Bid deadline passed
- AWARDED - Winner selected

### Bid Status
- DRAFT - Being prepared
- SUBMITTED - Submitted for evaluation
- SHORTLISTED - Passed evaluation (score ≥ 70)
- AWARDED - Won the RFP
- NOT_SELECTED - Not chosen
- WITHDRAWN - Withdrawn by mill

### Order Status
- DRAFT - PO being prepared
- CONFIRMED - PO confirmed by both parties
- IN_PRODUCTION - Being produced
- IN_TRANSIT - Being delivered
- DELIVERED - Completed
- CANCELLED - Cancelled

### Trip Status
- SCHEDULED - Planned
- IN_PROGRESS - Currently delivering
- COMPLETED - Finished
- CANCELLED - Cancelled

### POD Status
- SUBMITTED - Submitted by driver
- VERIFIED - Verified by buyer
- DISPUTED - Buyer disputes delivery

### Ticket Status
- OPEN - New ticket
- IN_PROGRESS - Being worked on
- WAITING_ON_USER - Awaiting user response
- WAITING_ON_SUPPORT - Awaiting support response
- RESOLVED - Issue resolved
- CLOSED - Ticket closed

### Priority Levels
- URGENT - 1hr response, 4hr resolution
- HIGH - 2hr response, 8hr resolution
- MEDIUM - 8hr response, 24hr resolution
- LOW - 24hr response, 72hr resolution

---

## Audit Logging

All mutation operations (CREATE, UPDATE, DELETE, AWARD, VERIFY, etc.) are automatically logged with:

- User ID and action type
- Resource type and ID
- Old and new values (JSON)
- IP address and user agent
- Timestamp

Audit logs can be queried through the admin panel.

---

## WebSocket Support (TODO)

Real-time features planned:
- GPS tracking updates
- Bid notifications
- Support chat
- Alert notifications

---

## Changelog

### Version 1.0.0 (December 2025)
- Initial release with 46 endpoints
- Procurement & RFP marketplace
- Logistics & delivery tracking
- Support system
- IoT & predictive maintenance

---

**For questions or support:** Create a ticket at `/support/tickets/create`
