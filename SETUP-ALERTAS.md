# Alertas de Emprego Automatizadas

Este documento explica cómo configurar el sistema de alertas automático para recibir ofertas de empleo por correo.

## Archivo Creado

`job-alert-scanner.mjs` - Script que escanea portales de empleo y envía alertas

## Cómo Funciona

1. **Ejecuta diariamente** (via cron en la nube)
2. **Escanea** LinkedIn, Indeed, Computrabajo, ElEmpleo
3. **Filtra** por tus keywords: Data Analyst, BI Analyst, Power BI, etc.
4. **Envia correo** con nuevas ofertas encontradas

## Paso 1: Configurar Email (SMTP)

Para recibir correos, necesitas configurar SMTP. La opción más fácil:

### Opción A: Gmail (gratis)
1. Activa "Contraseña de aplicación" en tu cuenta Google
   - Ve a: https://myaccount.google.com/apppasswords
   - Crea una nueva contraseña para "Correo"
2. Configura estas variables de entorno:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuemail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  (contraseña de app)
SMTP_FROM=tuemail@gmail.com
ALERT_EMAIL=sebastiansandoval12371@gmail.com
```

### Opción B: Resend (gratis para 100 emails/mes)
- Regístrate en resend.com
- Es más fácil configurar que Gmail

## Paso 2: Subir a la Nube (Render/Railway)

### Opción A: Render (recomendado)
1. Crea cuenta en render.com
2. "New" → "Web Service"
3. Conecta tu repositorio GitHub
4. Configura:
   - Build Command: `npm install`
   - Start Command: `node job-alert-scanner.mjs`
5. Añade las variables de entorno (Environment)
6. Schedule: Usa "Scheduled Jobs" para ejecutar diario

### Opción B: Railway
1. Crea cuenta en railway.app
2. "New Project" → "Empty Project"
3. Deploy desde GitHub
4. Configura variables de entorno
5. Añade cron job para ejecutar diario

## Paso 3: Probar Localmente

```bash
# Edita el archivo y configura tu email
# luego ejecuta:
node job-alert-scanner.mjs
```

## Personalización

Edita `CONFIG.scan.keywords.positive` en el script para ajustar:
- Roles que te interesan
- Tecnologías (Power BI, Tableau, SQL, etc.)

Edita `keywords.negative` para excluir:
- Seniority que no quieres
- Tecnologías que no dominas

## Desarrollo Futuro

El script actual es un **esqueleto**. Para que funcione completamente,还需要:

1. ✅ Integrar con WebSearch para LinkedIn/Indeed
2. ✅ Integrar WebFetch para Computrabajo/ElEmpleo
3. ✅ Enviar email real con nodemailer
4. ✅ Persistir historial en base de datos (no solo JSON)

¿Quieres que profundice en alguna parte o que implemente la integración real con algún portal específico?