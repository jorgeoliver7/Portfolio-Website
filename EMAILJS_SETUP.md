# Configuración de EmailJS para el Formulario de Contacto

Para hacer funcional el formulario de contacto, necesitas configurar EmailJS. Sigue estos pasos:

## 1. Crear cuenta en EmailJS

1. Ve a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Regístrate con tu email
3. Verifica tu cuenta

## 2. Configurar servicio de email

1. En el dashboard de EmailJS, ve a **Email Services**
2. Haz clic en **Add New Service**
3. Selecciona tu proveedor de email (Gmail, Outlook, etc.)
4. Sigue las instrucciones para conectar tu cuenta
5. Anota el **Service ID** que se genera

## 3. Crear template de email

1. Ve a **Email Templates**
2. Haz clic en **Create New Template**
3. Configura el template con estos parámetros:
   - **From Name**: {{from_name}}
   - **From Email**: {{from_email}}
   - **To Name**: {{to_name}}
   - **Subject**: Nuevo mensaje desde tu portfolio: {{subject}}
   - **Content**: 
     ```
     Has recibido un nuevo mensaje desde tu portfolio:
     
     Nombre: {{from_name}}
     Email: {{from_email}}
     Asunto: {{subject}}
     
     Mensaje:
     {{message}}
     ```
4. Guarda el template y anota el **Template ID**

## 4. Obtener clave pública

1. Ve a **Account** > **General**
2. Copia tu **Public Key**

## 5. Actualizar el código

En el archivo `script.js`, reemplaza estos valores:

```javascript
// Línea ~197
publicKey: "demo_public_key", // Reemplazar con tu clave pública real

// Líneas ~226-227
'demo_service', // Reemplazar con tu Service ID real
'demo_template', // Reemplazar con tu Template ID real
```

### Ejemplo de configuración final:
```javascript
// Configuración real (ejemplo)
publicKey: "user_abc123xyz",

// En el envío
emailjs.send(
    'service_gmail_123', // Tu Service ID real
    'template_contact_456', // Tu Template ID real
    templateParams
)
```

## 6. Probar el formulario

1. Guarda los cambios
2. Abre tu portfolio en el navegador
3. Llena el formulario de contacto
4. Envía un mensaje de prueba
5. Verifica que recibas el email

## Límites del plan gratuito

- 200 emails por mes
- Perfecto para un portfolio personal
- Sin costo adicional

## Notas importantes

- Las claves están en el código del frontend, esto es normal para EmailJS
- EmailJS tiene protección anti-spam integrada
- Puedes personalizar los templates desde el dashboard
- Los emails se envían desde los servidores de EmailJS, no desde tu dominio

¡Una vez configurado, tu formulario de contacto estará completamente funcional!