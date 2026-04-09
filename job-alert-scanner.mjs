#!/usr/bin/env node
/**
 * Job Alert Scanner - Full Implementation with Exa API
 * Scansa portales de empleo y envía alertas por email
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

const CONFIG = {
  // Exa API - obtener free key en exa.ai
  exaApiKey: process.env.EXA_API_KEY || '',
  
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
    { name: 'El Empleo', query: 'Analista de Datos OR Data Analyst OR BI Analyst site:elempleo.com.co Bogota OR Remoto OR Teletrabajo', enabled: true },
    { name: 'Computrabajo', query: 'analista de datos OR data analyst site:co.computrabajo.com Bogota OR Remoto', enabled: true },
    { name: 'Magneto', query: 'Analista de Datos OR Data Analyst site:magneto365.com Bogota OR Remoto', enabled: true },
    { name: 'LinkedIn', query: 'Data Analyst junior Bogota Colombia OR Remoto OR "Trabajo Remoto" OR Hibrido', enabled: true },
    { name: 'Talent', query: 'Data Analyst OR Analista de Datos site:co.talent.com Bogota OR Remoto OR Remoto', enabled: true },
    { name: 'Bumeran', query: 'analista de datos site:bumeran.com.co Bogota OR Remoto', enabled: true },
    { name: 'We Work Remotely', query: 'Data Analyst OR Junior Data Analyst site:weworkremotely.com', enabled: true },
    { name: 'Remote.co', query: 'data analyst site:remote.co Latin America OR Colombia OR Bogota', enabled: true },
    { name: 'Remotive', query: 'data analyst site:remotive.com Latin America OR Colombia', enabled: true },
    { name: 'Get on Board', query: 'Data Analyst OR BI Analyst site:getonbrd.com Colombia Bogota OR Remoto', enabled: true },
    { name: 'Indeed Colombia', query: 'Data Analyst site:co.indeed.com Bogota OR Remoto', enabled: true }
  ],
  
  filters: {
    positive: [
      'Data Analyst', 'Analista de Datos', 'BI Analyst', 'Business Intelligence',
      'Power BI', 'Tableau', 'SQL', 'Junior', 'Jr', 'Entry Level',
      'Analista Jr', 'Teletrabajo', 'Remoto', 'Hybrid', 'Bogotá', 'Bogota', 'Remoto'
    ],
    negative: [
      'Senior', 'Manager', 'Director', 'Lead', 'Staff', 'Head of',
      '.NET', 'Java ', 'SAP', 'Salesforce', 'DevOps', 'SRE',
      'Desarrollador', 'Developer', 'Científico', 'Machine Learning',
      'Ingeniero', 'Ingeniera', '3+', '5+', '7+', '10+ años',
      'Arquitecto', 'Especialista', 'Coordinador'
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
  
  for (const neg of CONFIG.filters.negative) {
    if (lower.includes(neg.toLowerCase())) return false;
  }
  
  for (const pos of CONFIG.filters.positive) {
    if (lower.includes(pos.toLowerCase())) return true;
  }
  
  return false;
}

// Buscar con Exa API
async function searchWithExa(query) {
  if (!CONFIG.exaApiKey) {
    console.log('⚠️ EXA_API_KEY no configurado');
    return [];
  }
  
  try {
    console.log(`   🔍 Query: ${query.substring(0, 80)}...`);
    
    // Buscar solo último contenido (última semana)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const dateStr = oneWeekAgo.toISOString().split('T')[0];
    
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.exaApiKey
      },
      body: JSON.stringify({
        query: query,
        numResults: 15,
        type: 'keyword',
        startPublishedDate: dateStr  // Solo última semana
      })
    });
    
    const data = await response.json();
    
    console.log(`   📊 Response status: ${response.status}`);
    
    if (data.error) {
      console.log(`   ❌ Exa error: ${data.error}`);
      return [];
    }
    
    if (data.results) {
      console.log(`   ✅ Found ${data.results.length} results`);
      return data.results.map(r => ({
        title: r.title || '',
        url: r.url || '',
        snippet: r.snippet || ''
      }));
    }
    
    console.log(`   ⚠️ No results in response`);
    return [];
  } catch (e) {
    console.log('❌ Exa API error:', e.message);
    return [];
  }
}

// Alternativa: WebSearch simulado (para testing sin API)
async function searchMock(query) {
  console.log(`   [MOCK] Would search: ${query.substring(0, 60)}...`);
  return [];
}

// Enviar email
async function sendEmailAlert(jobs) {
  if (!CONFIG.email.auth.user || !CONFIG.email.auth.pass) {
    console.log('⚠️ SMTP no configurado. Revisa SMTP_USER y SMTP_PASS');
    return false;
  }
  
  if (!CONFIG.exaApiKey) {
    console.log('⚠️ EXA_API_KEY no configurado. Las búsquedas no funcionarán');
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
    `<li><a href="${j.url}">${j.title}</a><br><small>Empresa: ${j.company || 'N/A'}</small></li>`
  ).join('');
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #2ecc71;">🎯 Nuevas ofertas de empleo encontradas (${jobs.length})</h2>
      <p>Se encontraron ${jobs.length} ofertas relevantes para tu perfil de Data Analyst:</p>
      <ul style="line-height: 1.8;">${jobList}</ul>
      <hr>
      <p style="color: #666; font-size: 12px;">
        Generado el ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
      </p>
    </div>
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

// Main scan
async function runScan() {
  console.log('🔍 Job Alert Scanner starting...');
  console.log('   Time:', new Date().toISOString());
  console.log('   Exa API:', CONFIG.exaApiKey ? '✅ Configured' : '❌ Not configured');
  
  loadHistory();
  
  const allJobs = [];
  const searchFn = CONFIG.exaApiKey ? searchWithExa : searchMock;
  
  for (const portal of CONFIG.portals) {
    if (!portal.enabled) continue;
    
    console.log(`\n📊 Searching ${portal.name}...`);
    
    try {
      const results = await searchFn(portal.query);
      
      if (results && results.length > 0) {
        console.log(`   Found ${results.length} results`);
        
        for (const r of results) {
          const title = r.title || '';
          
          if (!seenJobs.has(r.url) && isRelevant(title)) {
            allJobs.push({
              title: title.replace(/@\s*.+$/, '').trim(),
              url: r.url,
              company: r.url.includes('linkedin') ? 'LinkedIn' : 
                      r.url.includes('elempleo') ? 'El Empleo' :
                      r.url.includes('computrabajo') ? 'Computrabajo' :
                      r.url.includes('magneto') ? 'Magneto' :
                      new URL(r.url).hostname.replace('www.', '')
            });
            seenJobs.add(r.url);
            console.log(`   ✅ ${title.substring(0, 50)}`);
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
    
    await sendEmailAlert(allJobs);
  } else {
    console.log('   No new relevant jobs found');
  }
  
  return allJobs;
}

import fs from 'fs';

runScan()
  .then(() => {
    console.log('\n✅ Scan complete');
    process.exit(0);
  })
  .catch(e => {
    console.error('❌ Scan failed:', e);
    process.exit(1);
  });