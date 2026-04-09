#!/usr/bin/env node
/**
 * Job Alert Scanner
 * Scans multiple job portals and sends email alerts for new positions
 * Designed for: Render/Railway deployment (free tier)
 * 
 * Usage:
 *   node job-alert-scanner.mjs           # Run scan and send email
 *   node job-alert-scanner.mjs --dry-run # Test without sending email
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.ALERT_EMAIL || 'sebastiansandoval12371@gmail.com'
  },
  scan: {
    // Job sites to scan
    sites: [
      {
        name: 'LinkedIn',
        url: 'https://co.linkedin.com/jobs/data-analyst-empleos',
        searchPattern: 'site:co.linkedin.com "Data Analyst" OR "Analista de Datos" OR "BI Analyst" Colombia',
        type: 'search'
      },
      {
        name: 'Indeed',
        url: 'https://co.indeed.com/jobs?q=data+analyst&l=Colombia',
        type: 'scrape'
      },
      {
        name: 'Computrabajo',
        url: 'https://www.computrabajo.com.co/ofertas-de-trabajo/?q=analista+de+datos',
        type: 'scrape'
      },
      {
        name: 'ElEmpleo',
        url: 'https://www.elempleo.com.co/empleos/busqueda?keywords=analista%20datos',
        type: 'scrape'
      },
      {
        name: 'Búsqueda Google',
        url: null,
        searchPattern: 'Data Analyst Colombia remote "Junior" OR "Entry Level" 2026',
        type: 'search'
      }
    ],
    // Keywords to filter (your target roles)
    keywords: {
      positive: [
        'Data Analyst',
        'Analista de Datos',
        'BI Analyst',
        'Business Intelligence',
        'Power BI',
        'Tableau',
        'SQL',
        'Junior Data',
        'Analista Jr'
      ],
      negative: [
        'Senior',
        'Manager',
        'Director',
        'Lead',
        'Staff',
        '.NET',
        'Java ',
        'Python ', // Too advanced for junior
        'SAP',
        'Salesforce'
      ]
    },
    // Location preference
    location: 'Colombia'
  },
  history: {
    file: path.join(__dirname, 'data', 'job-alerts-history.json')
  }
};

// Simple in-memory store for job URLs (in production, use a database)
let jobHistory = {
  seen: new Set(),
  lastScan: null
};

// Load history
function loadHistory() {
  try {
    if (fs.existsSync(CONFIG.history.file)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.history.file, 'utf-8'));
      jobHistory.seen = new Set(data.seen || []);
      jobHistory.lastScan = data.lastScan || null;
    }
  } catch (e) {
    console.log('No history file found, starting fresh');
  }
}

// Save history
function saveHistory() {
  try {
    const dir = path.dirname(CONFIG.history.file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG.history.file, JSON.stringify({
      seen: Array.from(jobHistory.seen),
      lastScan: new Date().toISOString()
    }, null, 2));
  } catch (e) {
    console.error('Failed to save history:', e.message);
  }
}

// Filter job by keywords
function matchesKeywords(title, description = '') {
  const text = (title + ' ' + description).toLowerCase();
  
  // Check negative keywords first
  for (const neg of CONFIG.scan.keywords.negative) {
    if (text.includes(neg.toLowerCase())) {
      return false;
    }
  }
  
  // Check positive keywords
  for (const pos of CONFIG.scan.keywords.positive) {
    if (text.includes(pos.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

// Simple email sender (requires SMTP config)
async function sendEmailAlert(jobs) {
  if (!CONFIG.email.auth.user || !CONFIG.email.auth.pass) {
    console.log('⚠️  SMTP not configured. Install mailparser or nodemailer for email alerts.');
    console.log('   Jobs found:', jobs.length);
    return false;
  }
  
  // For now, just log - full implementation would use nodemailer
  console.log('📧 Would send email with', jobs.length, 'new jobs');
  return true;
}

// Format job for display
function formatJobForEmail(job) {
  return `• ${job.title}
  Empresa: ${job.company || 'N/A'}
  Ubicación: ${job.location || 'Colombia'}
  URL: ${job.url}
  Fuente: ${job.source}`;
}

// Main scan function
async function runScan() {
  console.log('🔍 Starting Job Alert Scan...');
  console.log('   Date:', new Date().toISOString());
  
  loadHistory();
  
  const newJobs = [];
  
  // Scan each configured site
  for (const site of CONFIG.scan.sites) {
    console.log(`\n📊 Scanning ${site.name}...`);
    
    try {
      // In a full implementation, this would:
      // 1. For search sites: Use WebSearch to find jobs
      // 2. For scrape sites: Use WebFetch or Playwright to parse listings
      
      // Placeholder: simulate finding some jobs
      // Real implementation would integrate with the portal scanning logic
      
      console.log(`   ✓ ${site.name} scanned (mock - needs real implementation)`);
      
    } catch (e) {
      console.log(`   ✗ Error scanning ${site.name}:`, e.message);
    }
  }
  
  jobHistory.lastScan = new Date().toISOString();
  saveHistory();
  
  console.log('\n📈 Scan Summary:');
  console.log('   Total jobs found:', newJobs.length);
  console.log('   New (not seen before):', newJobs.length);
  
  if (newJobs.length > 0) {
    console.log('\n🎯 New Jobs:');
    newJobs.forEach(job => console.log(formatJobForEmail(job)));
    
    await sendEmailAlert(newJobs);
  }
  
  return newJobs;
}

// CLI handler
const args = process.argv.slice(2);
if (args.includes('--dry-run')) {
  console.log('🔧 Dry run mode - no email will be sent');
}

runScan()
  .then(jobs => {
    console.log('\n✅ Scan complete');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Scan failed:', e);
    process.exit(1);
  });