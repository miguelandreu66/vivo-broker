# 💵 Modelo de Pricing — VIVO

> Plantilla para que Miguel defina sus tarifas reales en 1 hora con calculadora.
> Los números marcados `[LLENAR]` son los que TÚ debes calcular en base a TUS costos.
> Los marcados `(referencia)` son benchmarks típicos del mercado MX 2026.

---

## 🧮 Paso 1: tus costos reales por viaje

Toma una ruta tipo (ej. Cuernavaca → CDMX, ~90km) y desglosa **todo**.

### 1.1 Costos del transportista (lo que TE cobra a ti)

| Concepto | Monto | Notas |
|---|---|---|
| Tarifa base de transportista | `[LLENAR]` MXN | Lo que paga VIVO al transportista terco |
| Casetas (ida + vuelta) | ~$450 MXN (referencia para CVA→CDMX) | Mochila, La Pera, Tlalpan |
| Combustible que cobra (si aparte) | `[LLENAR]` | A veces incluido en tarifa |
| Comisión maniobras carga/descarga | `[LLENAR]` | Si aplica |
| **SUBTOTAL costo VIVO** | **`[LLENAR]` MXN** | |

### 1.2 Tu propio overhead

| Concepto | Monto/viaje | Notas |
|---|---|---|
| Costo Anthropic API (12 agentes) | ~$5-15 MXN/viaje | Pieza chica del pastel |
| Mapbox, SendGrid, Twilio | ~$3 MXN/viaje | |
| Railway hosting prorrateado | ~$10 MXN/viaje | Asumiendo 100 viajes/mes |
| Tiempo admin (15 min × $80/h MXN) | $20 MXN | Cotizar + monitorear |
| PAC Facturama (timbrado CFDI) | $1.50 MXN | Por timbre |
| Seguro RC prorrateado | $30 MXN/viaje | Asumiendo $30k/año ÷ 1000 viajes |
| **SUBTOTAL overhead** | **~$70 MXN** | Estimación inicial |

### 1.3 Tu costo total por viaje

```
Costo total VIVO = costo transportista + overhead
                 = [LLENAR] + ~70 MXN
                 = [LLENAR] MXN
```

---

## 📐 Paso 2: tu margen objetivo

### Regla del broker logístico mexicano

| Margen | Significado | Aplica cuando |
|---|---|---|
| **5-10%** | Sobrevives | Cliente recurrente alto volumen, pocas dudas |
| **15-25%** | Cómodo | Cliente B2B medio, viaje estándar |
| **30-50%** | Premium | Servicio especial, urgencia, ruta difícil |
| **50-100%+** | Tier CRITICAL | Cliente desesperado, asignación <15 min |

> **Recomendación VIVO**: margen base **25%** en standard. Tier multipliers ya cargan el premium.

### Tu fórmula base

```
Tarifa cliente STANDARD = (costo total / (1 - margen))

Ejemplo:
  costo total = $4,000 MXN
  margen objetivo = 25%
  → Tarifa = 4,000 / 0.75 = $5,333 MXN
  → VIVO se queda con $1,333 MXN (25% margen)
```

---

## 🎚️ Paso 3: tarifas por tier de urgencia

### Multiplicadores (sobre tarifa standard)

| Tier | Multiplicador | SLA asignación | SLA salida | Justificación |
|---|---|---|---|---|
| **STANDARD** | 1.0× | <2 horas | <24 horas | Tarifa base |
| **URGENT** | 1.5× | <60 min | <8 horas | Sobreprecio moderado |
| **EXPRESS** | 2.0× | <30 min | <4 horas | Premium por horario hábil prio |
| **CRITICAL** | 3.0× | <15 min | <2 horas | Premium total. 24/7. Sin opción de "no" |

### Tabla ejemplo para ruta Cuernavaca → CDMX (90km)

| Tier | Costo VIVO | Tarifa cliente | Comisión VIVO | Margen |
|---|---|---|---|---|
| STANDARD | `[LLENAR]` MXN | `[LLENAR] × 1.0` | `[LLENAR]` | 25% |
| URGENT | `[LLENAR]` MXN | `[LLENAR] × 1.5` | `[LLENAR]` | 50% |
| EXPRESS | `[LLENAR]` MXN | `[LLENAR] × 2.0` | `[LLENAR]` | 60% |
| CRITICAL | `[LLENAR]` MXN | `[LLENAR] × 3.0` | `[LLENAR]` | 70% |

> ⚠️ Las tarifas de transportista a veces SUBEN en urgencia porque tienen que dejar otro viaje.
> Negocia con tus transportistas un "premium urgencia" del +30% sobre su tarifa normal.

---

## 🏗️ Paso 4: tus 5 rutas prioritarias

Define costos para LAS 5 rutas que más vas a vender. Esto le ahorra a tu admin
20 minutos de cálculo cada vez que entra una cotización.

| # | Ruta | Km | Costo VIVO | STANDARD | URGENT | EXPRESS | CRITICAL |
|---|---|---|---|---|---|---|---|
| 1 | Cuernavaca → CDMX | 90 | `[LLENAR]` | | | | |
| 2 | Cuernavaca → Toluca | 130 | `[LLENAR]` | | | | |
| 3 | Cuernavaca → Puebla | 200 | `[LLENAR]` | | | | |
| 4 | Cuernavaca → Querétaro | 290 | `[LLENAR]` | | | | |
| 5 | CDMX → Puebla | 130 | `[LLENAR]` | | | | |

---

## 💼 Paso 5: tarifas adicionales (anexos)

Aparte del flete, qué cobras extra:

| Concepto | Cargo | Cuándo aplica |
|---|---|---|
| Maniobra de carga | `[LLENAR]` MXN | Mercancía no estándar (bultos pesados, frágil) |
| Maniobra de descarga | `[LLENAR]` MXN | Idem |
| Espera mayor a 1 hora | `[LLENAR]` MXN/hr | Cliente tarda en cargar/descargar |
| Maniobra refrigerada | +30% sobre flete | Cadena fría |
| Carta Porte adicional | $50 MXN | Por destino extra en ruta |
| Pago a contra entrega | +5% sobre flete | Riesgo financiero |
| Crédito 30 días | +3% sobre flete | Cliente nuevo |
| Cancelación tardía | 30% del flete | Cancelan tras asignación |

---

## 🎯 Paso 6: tu política de descuentos

Tu admin va a recibir presión de descontar. Define las reglas **antes** para que no improvise:

| Situación | Descuento máximo permitido |
|---|---|
| Cliente nuevo, primer viaje | 5% sobre standard |
| Compromiso 5+ viajes/mes | 8% sobre standard |
| Compromiso 20+ viajes/mes | 15% sobre standard, contrato anual |
| Cliente que pide igualar Flete.com / Freight99 | 0% — competimos por servicio, no por precio |
| Urgencia (CRITICAL/EXPRESS) | **0% — nunca descontar urgencias** |

> Regla de oro: **prefiere perder el lead que perder margen en CRITICAL/EXPRESS**.
> Si descuentas el premium, mañana todos esperarán precios STANDARD para servicio CRITICAL.

---

## 📊 Paso 7: cuándo y cómo subir precios

| Trigger | Acción |
|---|---|
| Diesel sube >10% | Recalcular costos, posiblemente subir 5-10% |
| Tasas SAT cambian | Solo afecta CFDI, no precios directo |
| Demanda alta (Q4, fin de año) | Activar pricing dinámico: +15% en CRITICAL |
| Nueva ruta agregada | Calcular con costo + margen estándar |
| Tu admin reporta "todos dicen sí" | Estás baja de precio — subir 10% |
| Tu admin reporta "rebotan precios" | Servicio mal posicionado o margen muy alto |

---

## 🧪 Paso 8: A/B test inicial

En tus primeros 30 viajes, varía intencionalmente para aprender:

| Mes 1 | Estrategia | Aprendizaje |
|---|---|---|
| Semana 1 | Tarifa standard +25% margen | ¿Cuántos aceptan? |
| Semana 2 | Tarifa standard +30% margen | ¿Cae conversión? |
| Semana 3 | CRITICAL 3x vs 2.5x | ¿Pagan el premium completo? |
| Semana 4 | Bundle (3 viajes/mes a -8%) | ¿Atrae recurrentes? |

Después de 4 semanas, **fija** los precios ganadores.

---

## ⚙️ Cómo se aplica esto en el sistema VIVO

Estos números van en **2 lugares** del sistema:

1. **`backend/src/lib/cotizadorAI.js`** — el cotizador automático lee tu tabla
2. **`/configuracion`** → tab "Empresa / Pricing" — tu admin lo edita sin código

Cuando termines de llenar este doc, dame los números y yo los **migro al cotizador**
automáticamente. Toma 5 minutos.

---

## 🎯 Acción HOY (1 hora)

1. Toma calculadora + tu última factura de viaje real
2. Llena las celdas `[LLENAR]` de las secciones **1.1, 1.3, 3, 4**
3. Si dudas en algún costo, llama a un transportista conocido y pregúntale
4. Manda este documento (lleno) por WhatsApp al [hermano/socio/admin] para 2da opinión

**Si en 1 hora no tienes los números base** → tu cotizador online está vendiendo
ficción, y cualquier cliente que llame te va a desnudar en 30 segundos.
