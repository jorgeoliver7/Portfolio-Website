# 🔧 Solución de Errores del Formulario de Contacto

## ❌ Error: "Error al enviar email"

### Causas más comunes:

#### 1. **Credenciales de demostración** (Más probable)
Si ves este error, probablemente aún tienes las credenciales de prueba en tu código:

```javascript
// En script.js - ESTAS SON CREDENCIALES DE DEMO
publicKey: "demo_public_key",
'demo_service',
'demo_template',
```

**✅ Solución:**
1. Ve a [emailjs.com](https://www.emailjs.com/) y configura tu cuenta
2. Reemplaza las credenciales en `script.js` con las reales
3. Guarda y recarga la página

#### 2. **Credenciales incorrectas**
Verifica que hayas copiado correctamente:
- Public Key
- Service ID  
- Template ID

**✅ Solución:**
1. Ve a tu dashboard de EmailJS
2. Verifica cada credencial:
   - **Account → General → Public Key**
   - **Email Services → Tu servicio → Service ID**
   - **Email Templates → Tu template → Template ID**
3. Actualiza `script.js` con los valores correctos

#### 3. **Servicio de email no configurado**
**✅ Solución:**
1. En EmailJS: **Email Services → Add New Service**
2. Conecta tu Gmail/Outlook
3. Autoriza el acceso
4. Usa el Service ID generado

#### 4. **Template no configurado**
**✅ Solución:**
1. En EmailJS: **Email Templates → Create New Template**
2. Configura las variables: `{{from_name}}`, `{{from_email}}`, etc.
3. Guarda y usa el Template ID

## 🔍 Cómo Diagnosticar el Error

### Paso 1: Abrir Consola del Navegador
1. Presiona `F12` o `Cmd+Option+I` (Mac)
2. Ve a la pestaña **Console**
3. Intenta enviar el formulario
4. Busca mensajes de error detallados

### Paso 2: Errores Comunes en Consola

**Error: "Invalid public key"**
```
❌ Problema: Public Key incorrecto
✅ Solución: Verifica y actualiza tu Public Key
```

**Error: "Service not found"**
```
❌ Problema: Service ID incorrecto o servicio no configurado
✅ Solución: Verifica tu Service ID y configuración del servicio
```

**Error: "Template not found"**
```
❌ Problema: Template ID incorrecto o template no existe
✅ Solución: Verifica tu Template ID y que el template esté guardado
```

**Error: "Unauthorized"**
```
❌ Problema: Servicio de email no autorizado
✅ Solución: Reautoriza tu cuenta de Gmail/Outlook en EmailJS
```

## 🚀 Configuración Paso a Paso (Si aún no lo has hecho)

### 1. Crear cuenta EmailJS
- Ve a [emailjs.com](https://www.emailjs.com/)
- Regístrate gratis

### 2. Configurar Gmail
- **Email Services → Add New Service → Gmail**
- Autoriza tu cuenta
- Copia el **Service ID**

### 3. Crear Template
- **Email Templates → Create New Template**
- Usa el template de `COMO_CREAR_TEMPLATE.md`
- Copia el **Template ID**

### 4. Obtener Public Key
- **Account → General**
- Copia tu **Public Key**

### 5. Actualizar script.js
```javascript
// Reemplaza estas líneas en script.js
publicKey: "TU_PUBLIC_KEY_REAL",

// Y estas
'TU_SERVICE_ID_REAL',
'TU_TEMPLATE_ID_REAL',
```

## 🧪 Probar la Configuración

1. Guarda todos los cambios
2. Recarga la página (`Cmd+R` o `Ctrl+R`)
3. Llena el formulario con datos de prueba
4. Envía el mensaje
5. Verifica tu email

## 📞 Si Sigues Teniendo Problemas

1. **Revisa la consola** del navegador para errores específicos
2. **Verifica las credenciales** una por una
3. **Prueba el template** directamente en EmailJS
4. **Asegúrate** de que el servicio de email esté activo

## ✅ Checklist de Verificación

- [ ] Cuenta EmailJS creada y verificada
- [ ] Servicio de Gmail/Outlook configurado y autorizado
- [ ] Template creado con variables correctas
- [ ] Public Key copiado correctamente
- [ ] Service ID copiado correctamente
- [ ] Template ID copiado correctamente
- [ ] Credenciales actualizadas en script.js
- [ ] Página recargada después de los cambios
- [ ] Sin errores en la consola del navegador

¡Una vez completado todo, tu formulario funcionará perfectamente! 🎉