/**
 * API Testing and Documentation Script
 *
 * This script analyzes all API routes and documents their:
 * - HTTP methods
 * - Request schemas
 * - Response formats
 * - Authentication requirements
 * - Potential issues
 */

import fs from 'fs';
import path from 'path';

interface APIEndpoint {
  path: string;
  methods: string[];
  hasAuth: boolean;
  hasValidation: boolean;
  file: string;
  issues: string[];
  requestSchema?: string;
  responseFormat?: string;
}

const API_DIR = path.join(process.cwd(), 'src/app/api');
const results: APIEndpoint[] = [];

function analyzeAPIFile(filePath: string): APIEndpoint | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = filePath.replace(process.cwd(), '');

  // Extract API path from file structure
  const apiPath = relativePath
    .replace('/src/app/api', '/api')
    .replace('/route.ts', '')
    .replace(/\[(\w+)\]/g, ':$1');

  const endpoint: APIEndpoint = {
    path: apiPath,
    methods: [],
    hasAuth: false,
    hasValidation: false,
    file: relativePath,
    issues: [],
  };

  // Detect HTTP methods
  if (content.includes('export async function GET')) endpoint.methods.push('GET');
  if (content.includes('export async function POST')) endpoint.methods.push('POST');
  if (content.includes('export async function PUT')) endpoint.methods.push('PUT');
  if (content.includes('export async function PATCH')) endpoint.methods.push('PATCH');
  if (content.includes('export async function DELETE')) endpoint.methods.push('DELETE');

  // Check for authentication
  if (content.includes('requireAuth') || content.includes('getSession') || content.includes('requirePermission') || content.includes('getServerSession')) {
    endpoint.hasAuth = true;
  }

  // Check for validation (Zod schemas or manual validation)
  if (content.includes('z.object') || content.includes('.parse(') ||
      (content.includes('POST') && content.includes('if (!') && content.includes('request.json()'))) {
    endpoint.hasValidation = true;
  }

  // Extract validation schema if present
  const schemaMatch = content.match(/const\s+\w+Schema\s*=\s*z\.object\({([^}]+)}/s);
  if (schemaMatch) {
    endpoint.requestSchema = schemaMatch[0].substring(0, 200) + '...';
  }

  // Check for common issues
  if (!endpoint.hasAuth && !apiPath.includes('/auth/') && !apiPath.includes('/health')) {
    endpoint.issues.push('No authentication check found');
  }

  if (endpoint.methods.includes('POST') && !endpoint.hasValidation) {
    endpoint.issues.push('POST endpoint without validation schema');
  }

  if (content.includes('prisma.') && !content.includes('try') && !content.includes('catch')) {
    endpoint.issues.push('Database operations without try-catch');
  }

  if (content.includes('await') && !content.includes('try')) {
    endpoint.issues.push('Async operations without error handling');
  }

  return endpoint;
}

function findAPIFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  }

  if (fs.existsSync(dir)) {
    walk(dir);
  }

  return files;
}

function generateReport() {
  console.log('🔍 Analyzing API endpoints...\n');

  const apiFiles = findAPIFiles(API_DIR);

  for (const file of apiFiles) {
    const endpoint = analyzeAPIFile(file);
    if (endpoint) {
      results.push(endpoint);
    }
  }

  // Group by module
  const modules: Record<string, APIEndpoint[]> = {
    'Authentication': [],
    'Procurement & RFP': [],
    'Bidding & Orders': [],
    'Logistics & Delivery': [],
    'Support & Help': [],
    'IoT & Sensors': [],
    'Analytics & Reports': [],
    'QR & Traceability': [],
    'Compliance & Training': [],
    'Quality Control': [],
    'Diagnostics': [],
    'Other': [],
  };

  for (const endpoint of results) {
    if (endpoint.path.includes('/auth')) {
      modules['Authentication'].push(endpoint);
    } else if (endpoint.path.includes('/rfp') || endpoint.path.includes('/buyer')) {
      modules['Procurement & RFP'].push(endpoint);
    } else if (endpoint.path.includes('/bid') || endpoint.path.includes('/order')) {
      modules['Bidding & Orders'].push(endpoint);
    } else if (endpoint.path.includes('/route') || endpoint.path.includes('/delivery') || endpoint.path.includes('/tracking') || endpoint.path.includes('/pod')) {
      modules['Logistics & Delivery'].push(endpoint);
    } else if (endpoint.path.includes('/support') || endpoint.path.includes('/help')) {
      modules['Support & Help'].push(endpoint);
    } else if (endpoint.path.includes('/iot') || endpoint.path.includes('/sensor')) {
      modules['IoT & Sensors'].push(endpoint);
    } else if (endpoint.path.includes('/analytics') || endpoint.path.includes('/report') || endpoint.path.includes('/dashboard')) {
      modules['Analytics & Reports'].push(endpoint);
    } else if (endpoint.path.includes('/qr')) {
      modules['QR & Traceability'].push(endpoint);
    } else if (endpoint.path.includes('/compliance') || endpoint.path.includes('/training')) {
      modules['Compliance & Training'].push(endpoint);
    } else if (endpoint.path.includes('/qc') || endpoint.path.includes('/batch')) {
      modules['Quality Control'].push(endpoint);
    } else if (endpoint.path.includes('/diagnostic')) {
      modules['Diagnostics'].push(endpoint);
    } else {
      modules['Other'].push(endpoint);
    }
  }

  // Generate markdown report
  let report = '# API Testing and Documentation Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Total Endpoints:** ${results.length}\n\n`;

  // Summary statistics
  const totalIssues = results.reduce((sum, e) => sum + e.issues.length, 0);
  const withAuth = results.filter(e => e.hasAuth).length;
  const withValidation = results.filter(e => e.hasValidation).length;

  report += '## Summary Statistics\n\n';
  report += `- 📊 Total API Endpoints: ${results.length}\n`;
  report += `- 🔐 Endpoints with Authentication: ${withAuth} (${((withAuth/results.length)*100).toFixed(1)}%)\n`;
  report += `- ✅ Endpoints with Validation: ${withValidation} (${((withValidation/results.length)*100).toFixed(1)}%)\n`;
  report += `- ⚠️  Total Issues Found: ${totalIssues}\n\n`;

  // HTTP Methods distribution
  const methodCounts: Record<string, number> = {};
  results.forEach(e => {
    e.methods.forEach(m => {
      methodCounts[m] = (methodCounts[m] || 0) + 1;
    });
  });

  report += '## HTTP Methods Distribution\n\n';
  Object.entries(methodCounts).sort((a, b) => b[1] - a[1]).forEach(([method, count]) => {
    report += `- **${method}**: ${count} endpoints\n`;
  });
  report += '\n';

  // Detailed endpoint documentation by module
  report += '## API Endpoints by Module\n\n';

  for (const [moduleName, endpoints] of Object.entries(modules)) {
    if (endpoints.length === 0) continue;

    report += `### ${moduleName} (${endpoints.length} endpoints)\n\n`;

    for (const endpoint of endpoints.sort((a, b) => a.path.localeCompare(b.path))) {
      report += `#### \`${endpoint.methods.join(', ')}\` ${endpoint.path}\n\n`;
      report += `- **File:** \`${endpoint.file}\`\n`;
      report += `- **Authentication:** ${endpoint.hasAuth ? '✅ Yes' : '❌ No'}\n`;
      report += `- **Validation:** ${endpoint.hasValidation ? '✅ Yes' : '❌ No'}\n`;

      if (endpoint.issues.length > 0) {
        report += `- **Issues:**\n`;
        endpoint.issues.forEach(issue => {
          report += `  - ⚠️ ${issue}\n`;
        });
      }

      if (endpoint.requestSchema) {
        report += `- **Request Schema:**\n\`\`\`typescript\n${endpoint.requestSchema}\n\`\`\`\n`;
      }

      report += '\n';
    }
  }

  // Critical Issues Section
  const criticalEndpoints = results.filter(e => e.issues.length > 0);
  if (criticalEndpoints.length > 0) {
    report += '## ⚠️ Endpoints with Issues\n\n';
    report += `Found ${criticalEndpoints.length} endpoints with potential issues:\n\n`;

    for (const endpoint of criticalEndpoints) {
      report += `### ${endpoint.path}\n`;
      endpoint.issues.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += '\n';
    }
  }

  // Best Practices Summary
  report += '## ✅ Best Practices Summary\n\n';
  report += '### Good Practices Observed:\n\n';
  report += `- ${withAuth} endpoints implement authentication checks\n`;
  report += `- ${withValidation} endpoints use Zod validation schemas\n`;
  report += '- Consistent use of Next.js 14 App Router patterns\n';
  report += '- RESTful endpoint structure\n\n';

  report += '### Recommendations:\n\n';
  if (totalIssues > 0) {
    report += `- Review ${criticalEndpoints.length} endpoints with identified issues\n`;
  }
  report += '- Add integration tests for all endpoints\n';
  report += '- Implement rate limiting for public endpoints\n';
  report += '- Add API documentation with OpenAPI/Swagger\n';
  report += '- Consider adding request logging middleware\n\n';

  // Testing Instructions
  report += '## 🧪 Testing Instructions\n\n';
  report += '### Prerequisites:\n\n';
  report += '1. Start the database:\n';
  report += '   ```bash\n';
  report += '   docker-compose up -d  # or start PostgreSQL manually\n';
  report += '   ```\n\n';
  report += '2. Run database migrations:\n';
  report += '   ```bash\n';
  report += '   npm run db:push\n';
  report += '   ```\n\n';
  report += '3. Start the development server:\n';
  report += '   ```bash\n';
  report += '   npm run dev\n';
  report += '   ```\n\n';
  report += '### Manual Testing:\n\n';
  report += '1. **Authentication Flow:**\n';
  report += '   - POST `/api/auth/register` - Register new user\n';
  report += '   - POST `/api/auth/login` - Login and get session\n';
  report += '   - GET `/api/auth/me` - Get current user\n\n';
  report += '2. **Procurement Flow:**\n';
  report += '   - POST `/api/buyers/register` - Register as buyer\n';
  report += '   - POST `/api/rfps` - Create RFP\n';
  report += '   - POST `/api/bids` - Submit bid\n';
  report += '   - POST `/api/orders` - Create order\n\n';
  report += '3. **Logistics Flow:**\n';
  report += '   - POST `/api/routes` - Create route\n';
  report += '   - POST `/api/delivery-trips` - Create trip\n';
  report += '   - POST `/api/delivery-trips/:id/start` - Start trip\n';
  report += '   - POST `/api/pod` - Create proof of delivery\n\n';

  report += '## 📊 Endpoint Coverage Matrix\n\n';
  report += '| Module | GET | POST | PUT | PATCH | DELETE | Total |\n';
  report += '|--------|-----|------|-----|-------|--------|-------|\n';

  for (const [moduleName, endpoints] of Object.entries(modules)) {
    if (endpoints.length === 0) continue;

    const methods = {
      GET: endpoints.filter(e => e.methods.includes('GET')).length,
      POST: endpoints.filter(e => e.methods.includes('POST')).length,
      PUT: endpoints.filter(e => e.methods.includes('PUT')).length,
      PATCH: endpoints.filter(e => e.methods.includes('PATCH')).length,
      DELETE: endpoints.filter(e => e.methods.includes('DELETE')).length,
    };

    report += `| ${moduleName} | ${methods.GET} | ${methods.POST} | ${methods.PUT} | ${methods.PATCH} | ${methods.DELETE} | ${endpoints.length} |\n`;
  }

  report += '\n---\n\n';
  report += '*This report was automatically generated by analyzing the API route files.*\n';

  // Write report to file
  const reportPath = path.join(process.cwd(), 'API_TESTING_REPORT.md');
  fs.writeFileSync(reportPath, report);

  console.log(`✅ Report generated: ${reportPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Total Endpoints: ${results.length}`);
  console.log(`   - With Authentication: ${withAuth}`);
  console.log(`   - With Validation: ${withValidation}`);
  console.log(`   - Issues Found: ${totalIssues}`);

  return report;
}

// Run the analysis
try {
  generateReport();
  process.exit(0);
} catch (error) {
  console.error('❌ Error generating report:', error);
  process.exit(1);
}
