# BRIEF DE DISEÑO Y ESPECIFICACIÓN TÉCNICA
## Proyecto: Jules App Nutrition Tracker

Este documento contiene la especificación completa del funcionamiento, base de datos, APIs y flujo de experiencia de usuario de **Jules App Nutrition Tracker**. Utiliza esta información en AI Studio para diseñar una nueva interfaz gráfica de usuario (UI/UX) premium, moderna, reactiva y optimizada para dispositivos móviles (PWA).

---

## 1. PROPÓSITO DEL PROYECTO
**Jules App Nutrition Tracker** es una plataforma personal y familiar de seguimiento nutricional, pesaje y entrenamiento físico. Su propuesta de valor principal reside en la **automatización por Inteligencia Artificial**: en lugar de registrar alimentos manualmente buscando en bases de datos infinitas, el usuario puede interactuar con un asistente conversacional multimodal por voz, fotos de platos de comida o texto libre para registrar dietas, entrenar o actualizar su peso en segundos.

---

## 2. ARQUITECTURA Y STACK TECNOLÓGICO
- **Framework:** Next.js 16 (React 19, TypeScript) con App Router.
- **Estilos:** Tailwind CSS v4 con variables HSL para tematización dinámica.
- **Base de Datos:** Supabase (PostgreSQL) con políticas de seguridad RLS públicas (diseño local multiperfil sin autenticación tradicional).
- **Animaciones:** Framer Motion (para transiciones fluidas de página y micro-interacciones).
- **Procesamiento de IA:** SDK de Google GenAI (`@google/genai`) utilizando **Gemini 3.5 Flash** para respuestas estructuradas (JSON Schema).
- **Escáner de Barra:** `html5-qrcode` para lectura óptica de códigos de barra alimenticios.
- **Gráficos:** Recharts para curvas de peso e historiales macro.
- **Móvil:** Configurado como Progressive Web App (PWA) mediante `@ducanh2912/next-pwa`.

---

## 3. ESQUEMA DE BASE DE DATOS (SUPABASE)

El sistema utiliza las siguientes tablas PostgreSQL para almacenar el progreso de los usuarios:

### A. Ajustes de Usuario (`user_settings`)
Almacena las metas de macros del día y configuraciones para perfiles predefinidos.
```sql
CREATE TABLE user_settings (
  profile text PRIMARY KEY, -- Ej: 'Lucas', 'Agustin', 'Mariano'
  goals jsonb NOT NULL DEFAULT '{"calories": 2000, "protein": 150, "carbs": 200, "fats": 65}'::jsonb,
  stats jsonb
);
```

### B. Registro Diario General (`daily_data`)
Consolida la información diaria agregada.
```sql
CREATE TABLE daily_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL, -- Formato: YYYY-MM-DD
  data jsonb NOT NULL, -- Estructura json con el peso y comidas agregadas
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile, date)
);
```

### C. Registro de Alimentos Detallado (`food_logs`)
Guarda cada porción de comida registrada por el usuario.
```sql
CREATE TABLE food_logs (
  id text PRIMARY KEY, -- ID corto generado por el frontend
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL, -- Formato: YYYY-MM-DD
  time text NOT NULL, -- Formato: HH:MM
  meal_type text NOT NULL, -- 'Desayuno', 'Almuerzo', 'Merienda', 'Cena'
  product_name text NOT NULL,
  amount numeric NOT NULL, -- Gramos o unidades
  protein numeric NOT NULL,
  carbs numeric NOT NULL,
  fats numeric NOT NULL,
  calories numeric NOT NULL,
  cholesterol numeric DEFAULT 0,
  sodium numeric DEFAULT 0,
  sugar numeric DEFAULT 0,
  calcium numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

### D. Historial de Alimentos / Diccionario (`food_history`)
Actúa como caché de alimentos previamente logueados para agilizar la búsqueda y entrenar el contexto de la IA.
```sql
CREATE TABLE food_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  name text NOT NULL,
  base_macros jsonb NOT NULL, -- Valores nutricionales base por cada 100g
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile, name)
);
```

### E. Registro de Entrenamientos (`fitness_progress`)
Registra las rutinas deportivas de cada perfil.
```sql
CREATE TABLE fitness_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL, -- Formato: YYYY-MM-DD
  category text NOT NULL, -- Ej: 'Pecho', 'Piernas', 'Espalda'
  exercise text NOT NULL,
  sets integer NOT NULL,
  reps integer NOT NULL,
  weight numeric NOT NULL, -- Peso levantado en kg
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
```

### F. Registro de Peso Corporal (`weight_logs`)
Guarda la evolución del peso del usuario.
```sql
CREATE TABLE weight_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL,
  weight numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile, date)
);
```

---

## 4. ENDPOINTS CLAVE DE LA API

### A. Chatbot Multimodal (`/api/ai/chat` - POST)
Recibe el mensaje de entrada (texto, nota de voz en base64, o imagen en base64), historial del chat, consumos del día actual y metas.
Retorna una de estas **4 acciones estructuradas** usando JSON Schema en Gemini 3.5 Flash:
1. `propose_meal`: Propone agregar comida. Devuelve `proposed_foods` con macros sugeridos y un desglose explicativo. **No guarda directo; requiere aprobación.**
2. `modify_meals`: Para editar comidas ya logueadas mediante comandos directos.
3. `log_weight`: Registra el peso detectado en el texto del usuario.
4. `chat`: Respuesta general, consejos o respuestas a dudas nutricionales.

### B. Análisis Rápido de Imagen (`/api/ai/lens` - POST)
Envía una foto directa y Gemini 3.5 Flash identifica de forma autónoma el plato, estima los gramos totales del plato, e identifica los macros por cada 100g.
- **Respuesta JSON:** `{ name, estimatedGrams, description, macros: { calories, protein, carbs, fats, ... } }`.

### C. Escaneo de Códigos de Barras (`/api/food/barcode` y `/api/food/barcode-fallback`)
Consulta bases de datos de alimentos externas (OpenFoodFacts u otras APIs) para obtener información nutricional exacta a partir de un código de barras leído por la cámara.

### D. Respaldos externos (`/api/sync-sheets` y `/api/sheets`)
Exporta e importa información hacia y desde Google Sheets.

---

## 5. ESTRUCTURA DE VISTAS / PANTALLAS (UX ACTUAL)
1. **Home / Dashboard (`/`):**
   - Selector de perfiles arriba (Lucas, Agustin, Mariano).
   - Anillo interactivo de progreso calórico central (Consumido vs Meta).
   - Desglose de macronutrientes principales (Proteínas, Carbos, Grasas) con barras de progreso.
   - Categorías de comidas (Desayuno, Almuerzo, Merienda, Cena) listando los alimentos logueados del día con opción de eliminarlos (CRUD rápido).
2. **Historial (`/historial`):** Calendario y lista cronológica de consumos pasados.
3. **Estadísticas (`/estadisticas`):** Gráficos de barras y líneas para el análisis del consumo calórico semanal/mensual.
4. **Calculadora (`/calculadora`):** Herramienta para ajustar porciones de forma manual.
5. **Peso (`/peso`):** Gráfico interactivo lineal (`recharts`) del peso a lo largo del tiempo, y formulario rápido de actualización.
6. **Fitness (`/fitness`):** Registro de rutinas de fuerza organizadas por grupo muscular y serie.
7. **Configuración (`/settings`):** Panel para editar metas calóricas diarias, exportar datos a Google Sheets y administrar el Diccionario de Alimentos (`food_history`).
8. **Chatbot Flotante / Global (`GlobalChatbot.tsx`):**
   - Una interfaz inferior expandible presente en toda la app.
   - Permite escribir, mandar fotos o audios.
   - Cuando la IA responde con `propose_meal`, muestra tarjetas editables especiales que permiten al usuario ajustar los gramos propuestos por el bot o cambiar los macros antes de hacer click en "Confirmar e Insertar en Diario".

---

## 6. LINEAMIENTOS PARA EL NUEVO DISEÑO UI/UX (BRIEF DE DISEÑO)

### A. Estilo Visual Requerido (Premium & Aesthetic)
- **Tema:** Dark mode por defecto de alta calidad. Usar una paleta de colores sofisticada en lugar de grises puros. Por ejemplo:
  - Fondo: HSL oscuro profundo (`hsl(224, 71%, 4%)`).
  - Acentos: Gradientes vibrantes de Violeta Neon a Azul eléctrico, o esmeralda para salud/nutrición.
- **Glassmorphism:** Uso sutil de bordes translúcidos (`backdrop-filter: blur()`), sombras suaves y efectos de relieve para separar componentes.
- **Tipografía:** Moderna y limpia (ej. Inter, Outfit o Sora) con jerarquías claras de títulos.

### B. Flujos de Interacción Mejorados (UX)
1. **La Experiencia "Lens" de Cámara:**
   - La captura y procesamiento de fotos de platos debe ser mágica: animación de escaneo por láser, previsualización en miniatura del plato y aparición fluida de las tarjetas de ingredientes identificados por la IA.
2. **Entrada por Voz Animada:**
   - Al pulsar el micrófono para notas de voz, debe mostrarse una onda de audio interactiva reactiva al volumen de la voz.
3. **Tarjetas de Confirmación de Comida Inteligentes:**
   - Las comidas propuestas por la IA deben mostrarse en tarjetas estilizadas tipo "receta" donde cada ingrediente tiene deslizadores (sliders) para ajustar rápidamente el gramaje estimado, recalculando al instante las calorías y macros visualmente antes de guardar.
4. **Dashboard Dinámico y Dashboard de Fitness:**
   - Gráficos minimalistas e interactivos para el progreso de la rutina física.
   - Interacciones de arrastrar y soltar (drag and drop) o gestos swipe en móviles para borrar comidas del diario.
5. **PWA Mobile-First:**
   - Bottom navigation bar fija con transiciones fluidas de página y respuesta táctil (haptic feedback simulado mediante micro-animaciones en botones).
