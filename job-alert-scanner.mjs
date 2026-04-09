#!/usr/bin/env node
/**
 * Job Alert Scanner - Full Implementation
 * Scansa portales de empleo y envía alertas por email
 */

import nodemailer from 'nodemailer';

const CONFIG = {
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    to: process.env.ALERT_EMAIL || 'sebastiansandoval12371@gmail.com'
  },
  // Portales a escanear
  portals: [
    { name: 'El Empleo', query: 'site:elempleo.com.co "Analista de Datos" OR "Data Analyst" OR "BI Analyst" Colombia 2026', enabled: true },
    { name: 'Computrabajo', query: 'site:co.computrabajo.com "analista de datos" OR "data analyst" 2026', enabled: true },
    { name: 'Magneto', query: 'site:magneto365.com "Analista de Datos" OR "Data Analyst" Colombia', enabled: true },
    { name: 'LinkedIn', query: 'Data Analyst Colombia "Junior" OR "Entry Level" OR "Sin experiencia" 2026', enabled: true },
    { name: 'Talent', query: 'site:co.talent.com "Data Analyst" OR "Analista de Datos" Colombia', enabled: true },
    { name: 'Jobomas', query: 'site:co.jobomas.com "analista de datos" OR "data analyst" Colombia', enabled: true },
    { name: 'Bumeran', query: 'site:bumeran.com.co "analista de datos" OR "data analyst" Colombia', enabled: true },
    { name: 'We Work Remotely', query: 'site:weworkremotely.com "Data Analyst" OR "Junior Data Analyst" remote', enabled: true },
    { name: 'Remote.co', query: 'site:remote.co "data analyst" OR "junior data analyst"', enabled: true },
    { name: 'Remotive', query: 'site:remotive.com "data analyst" junior', enabled: true },
    { name: 'Wellfound', query: 'site:wellfound.com "Data Analyst" junior', enabled: true },
    { name: 'Get on Board', query: 'site:getonbrd.com "Data Analyst" OR "BI Analyst" Colombia', enabled: true },
    { name: 'Torre', query: 'site:torre.co "data analyst" OR "analista de datos"', enabled: true },
    { name: 'Arc', query: 'site:arc.dev "data analyst" junior', enabled: true },
    { name: 'FlexJobs', query: 'site:flexjobs.com "Data Analyst" junior remote', enabled: true },
    { name: 'Indeed Colombia', query: 'site:co.indeed.com "Data Analyst" OR "Analista de Datos" junior', enabled: true },
    { name: 'Opcionempleo', query: 'site:opcionempleo.com.co "analista de datos" OR "data analyst"', enabled: true }
  ],
  // Filtros para relevancia
  filters: {
    positive: [
      'Data Analyst', 'Analista de Datos', 'BI Analyst', 'Business Intelligence',
      'Power BI', 'Tableau', 'SQL', 'Junior', 'Jr', 'Entry Level',
      'Analista Jr', 'Sin experiencia', 'Teletrabajo', 'Remote', 'Remoto'
    ],
    negative: [
      'Senior', 'Manager', 'Director', 'Lead', 'Staff', 'Head of',
      '.NET', 'Java ', 'SAP', 'Salesforce', 'DevOps', 'SRE',
      'Ingeniero', 'Ingeniera', 'Desarrollador', 'Developer',
      'Científico', 'Cientifica', 'Machine Learning', 'ML Engineer'
    ]
  }
};

let seenJobs = new Set();

// Cargar historial
function loadHistory() {
  try {
    if (fs.existsSync('./job-history.json')) {
      const data = JSON.parse(fs.readFileSync('./job-history.json', 'utf-8'));
      seenJobs = new Set(data.seen || []);
    }
  } catch (e) {
    console.log('Starting fresh history');
  }
}

// Guardar historial
function saveHistory() {
  fs.writeFileSync('./job-history.json', JSON.stringify({
    seen: Array.from(seenJobs),
    lastScan: new Date().toISOString()
  }, null, 2));
}

// Filtrar por título
function isRelevant(title) {
  const lower = title.toLowerCase();
  
  // Excluir primero
  for (const neg of CONFIG.filters.negative) {
    if (lower.includes(neg.toLowerCase())) return false;
  }
  
  // Incluir si tiene keywords positivas
  for (const pos of CONFIG.filters.positive) {
    if (lower.includes(pos.toLowerCase())) return true;
  }
  
  return false;
}

// Extraer información del resultado
function parseSearchResult(result) {
  const title = result.title || '';
  const url = result.url || '';
  
  // Extraer empresa del título
  let company = 'Empresa no especificada';
  const atMatch = title.match(/@\s*(.+)$/);
  const pipeMatch = title.match(/\|\s*(.+)$/);
  const dashMatch = title.match(/[-–—]\s*(.+)$/);
  
  if (atMatch) company = atMatch[1].trim();
  else if (pipeMatch) company = pipeMatch[1].trim();
  else if (dashMatch) company = dashMatch[1].trim();
  
  return { title, url, company };
}

// Enviar email con nodemailer
async function sendEmailAlert(jobs) {
  if (!CONFIG.email.auth.user || !CONFIG.email.auth.pass) {
    console.log('⚠️ SMTP no configurado. Set SMTP_USER y SMTP_PASS');
    return false;
  }
  
  const transporter = nodemailer.createTransport({
    host: CONFIG.email.host,
    port: CONFIG.email.port,
    secure: CONFIG.email.secure,
    auth: {
      user: CONFIG.email.auth.user,
      pass: CONFIG.email.auth.pass
    }
  });
  
  const jobList = jobs.map(j => 
    `<li><a href="${j.url}">${j.title}</a><br>Empresa: ${j.company}</li>`
  ).join('');
  
  const htmlBody = `
    <h2>🎯 Nuevas ofertas de empleo encontradas (${jobs.length})</h2>
    <ul>${jobList}</ul>
    <p><em>Generado el ${new Date().toLocaleString('es-CO')}</em></p>
  `;
  
  try {
    await transporter.sendMail({
      from: CONFIG.email.auth.user,
      to: CONFIG.email.to,
      subject: `🎉 ${jobs.length} nuevas ofertas de Data Analyst - ${new Date().toLocaleDateString('es-CO')}`,
      html: htmlBody
    });
    console.log('✅ Email enviado exitosamente');
    return true;
  } catch (e) {
    console.log('❌ Error enviando email:', e.message);
    return false;
  }
}

// Escaneo principal
async function runScan() {
  console.log('🔍 Job Alert Scanner starting...');
  console.log('   Time:', new Date().toISOString());
  
  loadHistory();
  
  const allJobs = [];
  
  // Buscar en cada portal
  for (const portal of CONFIG.portals) {
    if (!portal.enabled) continue;
    
    console.log(`\n📊 Searching ${portal.name}...`);
    
    try {
      // Usar WebSearch a través del entorno
      const results = await websearch({
        query: portal.query,
        numResults: 15
      });
      
      if (results && results.length > 0) {
        console.log(`   Found ${results.length} results`);
        
        for (const r of results) {
          const job = parseSearchResult(r);
          
          if (!seenJobs.has(job.url) && isRelevant(job.title)) {
            allJobs.push(job);
            seenJobs.add(job.url);
            console.log(`   ✅ ${job.title.substring(0, 50)}...`);
          }
        }
      } else {
        console.log(`   No results found`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }
  
  saveHistory();
  
  console.log('\n📈 Summary:');
  console.log(`   Total found: ${allJobs.length}`);
  
  if (allJobs.length > 0) {
    console.log('\n🎯 New Jobs:');
    allJobs.forEach(j => console.log(`   - ${j.title} (${j.company})`));
    
    // Enviar email
    await sendEmailAlert(allJobs);
  } else {
    console.log('   No new relevant jobs found');
  }
  
  return allJobs;
}

// Importar fs para historial
import fs from 'fs';

// Ejecutar
runScan()
  .then(() => {
    console.log('\n✅ Scan complete');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Scan failed:', e);
    process.exit(1);
  });