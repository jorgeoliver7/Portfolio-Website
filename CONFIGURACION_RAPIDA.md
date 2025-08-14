# ⚡ Configuración Rápida del Formulario de Contacto

## 🚀 Pasos Rápidos (5 minutos)

### 1. Crear cuenta EmailJS
- Ve a [emailjs.com](https://www.emailjs.com/)
- Regístrate gratis

### 2. Configurar Gmail (recomendado)
- En EmailJS: **Email Services** → **Add New Service** → **Gmail**
- Autoriza tu cuenta de Gmail
- Copia el **Service ID** (ej: `service_gmail_123`)

### 3. Crear template
- **Email Templates** → **Create New Template**
- **Subject**: `Nuevo mensaje desde tu portfolio: {{subject}}`
- **Content**:
```
Nuevo mensaje de contacto:

Nombre: {{from_name}}
Email: {{from_email}}
Asunto: {{subject}}

Mensaje:
{{message}}
```
- Copia el **Template ID** (ej: `template_contact_456`)

### 4. Obtener clave pública
- **Account** → **General** → Copia **Public Key** (ej: `user_abc123xyz`)

### 5. Actualizar script.js
Reemplaza en `script.js`:

```javascript
// Línea ~197
publicKey: "TU_CLAVE_PUBLICA_AQUI",

// Líneas ~226-227
'TU_SERVICE_ID_AQUI',
'TU_TEMPLATE_ID_AQUI',
```

## ✅ ¡Listo!
Tu formulario ya funciona. Pruébalo enviándote un mensaje.

---

**💡 Tip**: El plan gratuito incluye 200 emails/mes, perfecto para un portfolio.

**📖 Guía completa**: Ver `EMAILJS_SETUP.md`