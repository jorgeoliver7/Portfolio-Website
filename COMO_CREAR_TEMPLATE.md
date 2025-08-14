# 📧 Cómo Crear el Template de EmailJS - Guía Visual

## Paso 1: Acceder a Email Templates

1. Ve a tu dashboard de EmailJS
2. En el menú lateral izquierdo, haz clic en **"Email Templates"**
3. Haz clic en el botón **"Create New Template"** (botón azul)

## Paso 2: Configurar el Template

### Información Básica
- **Template Name**: `Portfolio Contact Form` (o el nombre que prefieras)
- **Template ID**: Se genera automáticamente (ej: `template_abc123`)

### Configuración del Email

#### 📤 **From Section (Remitente)**
```
From Name: {{from_name}}
From Email: {{from_email}}
```

#### 📥 **To Section (Destinatario)**
```
To Name: Jorge Acedo
To Email: tu-email@gmail.com
```

#### 📝 **Subject (Asunto)**
```
Nuevo mensaje desde tu portfolio: {{subject}}
```

#### 💬 **Content (Contenido del Email)**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #2c3e50; }
        .value { margin-top: 5px; padding: 10px; background: white; border-left: 4px solid #3498db; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>📧 Nuevo Mensaje de Contacto</h2>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">👤 Nombre:</div>
                <div class="value">{{from_name}}</div>
            </div>
            
            <div class="field">
                <div class="label">📧 Email:</div>
                <div class="value">{{from_email}}</div>
            </div>
            
            <div class="field">
                <div class="label">📋 Asunto:</div>
                <div class="value">{{subject}}</div>
            </div>
            
            <div class="field">
                <div class="label">💬 Mensaje:</div>
                <div class="value">{{message}}</div>
            </div>
        </div>
    </div>
</body>
</html>
```

## Paso 3: Variables del Template

Asegúrate de que estas variables estén configuradas:

- `{{from_name}}` - Nombre del remitente
- `{{from_email}}` - Email del remitente  
- `{{subject}}` - Asunto del mensaje
- `{{message}}` - Contenido del mensaje
- `{{to_name}}` - Tu nombre (destinatario)

## Paso 4: Probar el Template

1. Haz clic en **"Test it"** en la parte superior
2. Completa los campos de prueba:
   ```
   from_name: Juan Pérez
   from_email: juan@ejemplo.com
   subject: Prueba de contacto
   message: Este es un mensaje de prueba
   to_name: Jorge Acedo
   ```
3. Haz clic en **"Send Test"**
4. Revisa tu email para confirmar que llegó correctamente

## Paso 5: Guardar el Template

1. Haz clic en **"Save"** (botón verde)
2. **¡IMPORTANTE!** Copia el **Template ID** que aparece
3. Este ID lo necesitarás para el código JavaScript

## 🎯 Template ID para el Código

Una vez guardado, copia el Template ID (ejemplo: `template_abc123`) y úsalo en tu `script.js`:

```javascript
// Reemplaza esta línea en script.js
'demo_template', // ← Cambia por tu Template ID real
```

## ✅ Verificación Final

- [ ] Template creado y guardado
- [ ] Template ID copiado
- [ ] Email de prueba recibido
- [ ] Variables configuradas correctamente
- [ ] Template ID actualizado en script.js

¡Tu template está listo! 🎉