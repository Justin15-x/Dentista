# DentalPro — Sistema de Gestión Dental

Sistema completo para consultorios dentales con autenticación por roles, gestión de pacientes, citas y pagos.

---

## 📁 Estructura del proyecto

```
dental-clinic/
├── index.html                    # Página de login
├── css/
│   └── styles.css                # Estilos globales
├── js/
│   ├── supabase.js               # Cliente y Auth helpers
│   ├── app.js                    # Router + Utils
│   └── modules/
│       ├── patients.js           # CRUD pacientes
│       ├── appointments.js       # Gestión de citas
│       └── payments.js           # Sistema de pagos
├── pages/
│   ├── dentist-dashboard.html    # Dashboard del dentista
│   └── patient-dashboard.html   # Portal del paciente
└── supabase_schema.sql           # Schema completo de BD
```

---

## 🗄️ Por qué PostgreSQL (relacional)

Los datos de un consultorio dental son altamente relacionales:
- Un **paciente** tiene muchas **citas**
- Una **cita** tiene muchos **tratamientos** (ajustes de costo)
- Un **paciente** tiene muchos **pagos**
- Necesitamos **JOINs** para el resumen financiero
- Supabase ofrece **Row Level Security (RLS)** nativa en PostgreSQL

Un modelo no relacional (MongoDB) sería más complejo para las consultas de balance financiero y las relaciones entre entidades.

---

## 🚀 Instrucciones de configuración

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Crea un nuevo proyecto (tarda ~2 minutos)
3. Anota tu **Project URL** y **anon public key** (Settings > API)

### 2. Configurar la base de datos

1. En Supabase, ve al **SQL Editor**
2. Pega y ejecuta el contenido de `supabase_schema.sql`
3. Verifica que se crearon las tablas en **Table Editor**

### 3. Conectar el frontend con Supabase

Abre `js/supabase.js` y reemplaza:

```javascript
const SUPABASE_URL = 'https://TU_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
```

Con tus valores reales del paso 1.

### 4. Crear el primer usuario dentista

En Supabase > **Authentication > Users**, haz clic en **Add user**:
- Email: `dentista@clinica.com`
- Password: `tu_password_segura`
- En **User Metadata** (JSON):
```json
{
  "full_name": "Dr. Juan Pérez",
  "role": "dentist"
}
```

> El trigger `handle_new_user` creará automáticamente el perfil en la tabla `profiles`.

### 5. Correr el proyecto localmente

**Opción A — Live Server (recomendado para desarrollo):**
```bash
# Con VS Code, instala la extensión "Live Server"
# Click derecho en index.html > Open with Live Server
```

**Opción B — Python:**
```bash
cd dental-clinic
python3 -m http.server 8080
# Abre http://localhost:8080
```

**Opción C — Node.js:**
```bash
npx serve dental-clinic
```

### 6. Crear pacientes y sus cuentas

1. Inicia sesión como dentista
2. Ve a **Pacientes > Nuevo paciente**
3. Llena el formulario del paciente
4. Para darle acceso al portal, en Supabase > Authentication > Add user:
   - Email y contraseña del paciente
   - Metadata: `{ "full_name": "Nombre", "role": "patient" }`
5. Vincula manualmente el `user_id` del auth user al campo `user_id` en la tabla `patients`

> ⚙️ **Automatización completa**: Para automatizar la creación de cuentas de pacientes desde el panel del dentista, necesitas una **Supabase Edge Function** con la Admin API. Ver sección avanzada abajo.

---

## 🔐 Roles y accesos

| Función | Dentista | Paciente |
|---|---|---|
| Ver/crear/editar/eliminar pacientes | ✅ | ❌ |
| Gestionar citas | ✅ | ❌ |
| Registrar pagos | ✅ | ❌ |
| Ver calendario | ✅ | ❌ |
| Ver su propia cita | ❌ | ✅ |
| Ver su balance | ❌ | ✅ |
| Ver sus pagos | ❌ | ✅ |

---

## ⚙️ Configuración avanzada: Edge Function para crear pacientes

Para crear cuentas de pacientes directamente desde el dashboard sin ir a Supabase, crea esta Edge Function:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Crear función
supabase functions new create-patient-user
```

`supabase/functions/create-patient-user/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { email, password, full_name, patient_id } = await req.json()
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name, role: 'patient' }
  })

  if (error) return new Response(JSON.stringify({ error }), { status: 400 })

  // Vincular al registro de paciente
  await supabaseAdmin
    .from('patients')
    .update({ user_id: data.user.id })
    .eq('id', patient_id)

  return new Response(JSON.stringify({ user: data.user }), { status: 200 })
})
```

```bash
supabase functions deploy create-patient-user
```

---

## 🔒 Seguridad implementada

- **Row Level Security (RLS)**: Cada usuario solo accede a sus propios datos
- **Verificación de rol en frontend**: Redirección automática si el rol no coincide
- **Validación de inputs**: Campos requeridos validados antes de enviar a Supabase
- **Autenticación JWT**: Manejada por Supabase Auth automáticamente
- **No hay API keys expuestas**: Solo se usa la `anon key` pública

---

## 🚀 Deploy a producción

**Netlify (gratuito):**
1. Sube la carpeta `dental-clinic/` a GitHub
2. Conecta el repo en [netlify.com](https://netlify.com)
3. Build command: (vacío)
4. Publish directory: `/`

**Vercel:**
```bash
npx vercel dental-clinic
```

---

## 📊 Modelo de datos

```
profiles (auth.users)
  └── patients (dentist_id → profiles.id)
       ├── appointments (patient_id → patients.id)
       │    └── appointment_treatments (appointment_id → appointments.id)
       └── payments (patient_id → patients.id)

Vista: patient_financial_summary
  → total_cost, total_paid, balance_due por paciente
```
