"use client";

import React, { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge, OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Spinner, Skeleton } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ShoppingBag,
  Bike,
  Search,
  Sparkles,
  Phone,
  QrCode,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function DesignSystemPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header Institucional de Marca */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-3">
            <Badge variant="emerald" dot>
              Sistema de Diseño v1.0
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/", "_blank")}
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Ver Portal Público
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Banner de Bienvenida */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-bold text-amber-400 tracking-wider uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Identidad de Marca Oficial
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              TropiGO — «movemos el trópico»
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Sistema de diseño visual unificado para la plataforma de delivery,
              comercio local y movilidad urbana del Trópico de Cochabamba
              (Ivirgarzama, Bolivia). Combina modernidad, accesibilidad y
              confianza operativa.
            </p>
          </div>
        </div>

        {/* 1. PALETA CROMÁTICA OFICIAL */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              1. Paleta Cromática y Tokens de Color
            </h2>
            <p className="text-xs text-slate-500">
              Colores seleccionados para contrastar eficazmente bajo luz diurna
              intensa en el Trópico de Cochabamba.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                Principal
              </span>
              <p className="text-sm font-black">TropiGreen</p>
              <p className="text-[11px] font-mono opacity-80">#059669</p>
              <p className="text-[10px] mt-2 opacity-90">Delivery & Confianza</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500 text-slate-950 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                Movilidad
              </span>
              <p className="text-sm font-black">TropiAmber</p>
              <p className="text-[11px] font-mono opacity-80">#F59E0B</p>
              <p className="text-[10px] mt-2 opacity-90">Mototaxis & Toritos</p>
            </div>

            <div className="p-4 rounded-2xl bg-sky-600 text-white shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                Canales
              </span>
              <p className="text-sm font-black">TropiBlue</p>
              <p className="text-[11px] font-mono opacity-80">#0284C7</p>
              <p className="text-[10px] mt-2 opacity-90">Tecnología & Chats</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                Texto Oscuro
              </span>
              <p className="text-sm font-black">Carbón Selva</p>
              <p className="text-[11px] font-mono opacity-80">#0F172A</p>
              <p className="text-[10px] mt-2 opacity-90">Tipografía de alto contraste</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-600 text-white shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                Alerta
              </span>
              <p className="text-sm font-black">TropiRed</p>
              <p className="text-[11px] font-mono opacity-80">#E11D48</p>
              <p className="text-[10px] mt-2 opacity-90">Cancelaciones & Errores</p>
            </div>

            <div className="p-4 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fondo Base
              </span>
              <p className="text-sm font-black">Bruma Suave</p>
              <p className="text-[11px] font-mono text-slate-500">#F8FAFC</p>
              <p className="text-[10px] mt-2 text-slate-500">Superficie limpia</p>
            </div>
          </div>
        </section>

        {/* 2. LOGOTIPO Y ESCALA TIPOGRÁFICA */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              2. Logotipo y Tamaños de Marca
            </h2>
            <p className="text-xs text-slate-500">
              Variaciones escalables del isotipo y logotipo oficial.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Tamaño Extra Grande (Hero / Portada)
                </span>
                <Logo size="xl" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Tamaño Grande (Encabezados)
                </span>
                <Logo size="lg" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Tamaño Medio (Barra de Navegación)
                </span>
                <Logo size="md" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Tamaño Pequeño (Pie de Página)
                </span>
                <Logo size="sm" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. BOTONES Y ACCIONES */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              3. Botones y Controles de Acción
            </h2>
            <p className="text-xs text-slate-500">
              Variantes semánticas con soporte para iconos, estados de carga y
              retroalimentación háptica visual.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Variantes */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Variantes por Función
                </h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">
                    Confirmar Pedido (Primary)
                  </Button>
                  <Button variant="solar">
                    Pedir Mototaxi (Solar)
                  </Button>
                  <Button variant="secondary">
                    Guardar Borrador (Secondary)
                  </Button>
                  <Button variant="outline">
                    Ver Menú (Outline)
                  </Button>
                  <Button variant="ghost">
                    Cancelar (Ghost)
                  </Button>
                  <Button variant="danger">
                    Anular Orden (Danger)
                  </Button>
                  <Button variant="subtle">
                    Cupón Aplicado (Subtle)
                  </Button>
                </div>
              </div>

              {/* Tamaños e Iconos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Escala de Tamaños y Estados
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg" leftIcon={<ShoppingBag className="w-5 h-5" />}>
                    Pedir Delivery (LG)
                  </Button>
                  <Button size="md" leftIcon={<Bike className="w-4 h-4" />}>
                    Asignar Conductor (MD)
                  </Button>
                  <Button size="sm">
                    Revisar (SM)
                  </Button>
                  <Button size="icon" variant="outline" aria-label="Buscar">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="primary"
                    isLoading={btnLoading}
                    onClick={() => {
                      setBtnLoading(true);
                      setTimeout(() => setBtnLoading(false), 2000);
                    }}
                  >
                    {btnLoading ? "Procesando..." : "Simular Carga (Click)"}
                  </Button>
                  <Button disabled variant="primary">
                    Deshabilitado
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 4. ETIQUETAS Y BADGES DE ESTADO */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              4. Etiquetas Semánticas y Badges de Despacho
            </h2>
            <p className="text-xs text-slate-500">
              Indicadores claros del ciclo de vida de pedidos, mototaxis y pagos en Bolivia.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Flujo de Estados de Pedidos (KDS)
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <OrderStatusBadge status="RECIBIDO" />
                  <OrderStatusBadge status="EN_PREPARACION" />
                  <OrderStatusBadge status="LISTO_RECOJO" />
                  <OrderStatusBadge status="ASIGNADO" />
                  <OrderStatusBadge status="EN_CAMINO" />
                  <OrderStatusBadge status="ENTREGADO" />
                  <OrderStatusBadge status="CANCELADO" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Verificación de Pagos QR Simple y Efectivo
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <PaymentStatusBadge status="PAGADO_VERIFICADO" />
                  <PaymentStatusBadge status="PENDIENTE" />
                  <PaymentStatusBadge status="RECHAZADO" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Disponibilidad de Repartidores y Canales
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <Badge variant="emerald" dot>
                    Rider Libre en Casco Central
                  </Badge>
                  <Badge variant="amber" dot>
                    Rider Ocupado en Viaje
                  </Badge>
                  <Badge variant="slate">
                    Fuera de Turno
                  </Badge>
                  <Badge variant="purple">
                    TropiBot Activo (Groq)
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. FORMULARIOS Y ENTRADAS DE DATOS */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              5. Formularios y Campos de Entrada
            </h2>
            <p className="text-xs text-slate-500">
              Campos optimizados para celulares con teclados táctiles grandes y mensajes de error claros.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
              <Input
                label="Nombre del Cliente"
                placeholder="Ej: Sandra Mamani"
                defaultValue="Sandra Mamani"
              />

              <Input
                label="Teléfono de WhatsApp"
                placeholder="+591 74389012"
                defaultValue="+591 78901234"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Select label="Zona de Ivirgarzama" defaultValue="zone_central">
                <option value="zone_central">Casco Central (5.00 Bs.)</option>
                <option value="zone_mortensen">Av. Mortensen (5.00 Bs.)</option>
                <option value="zone_villa14">Villa 14 (8.00 Bs.)</option>
                <option value="zone_senda3">Senda III (10.00 Bs.)</option>
              </Select>

              <div className="md:col-span-2">
                <Input
                  label="Dirección y Referencia"
                  placeholder="Ej: Av. Mortensen esq. Cochabamba, frente al surtidor"
                  helperText="Describe el color del portón o tienda cercana para el repartidor."
                />
              </div>

              <Input
                label="Monto de Pago"
                placeholder="0.00"
                error="El monto no cubre el subtotal del pedido (36.00 Bs.)"
                defaultValue="20.00"
              />

              <div className="md:col-span-3">
                <Textarea
                  label="Observaciones Especiales para Cocina"
                  placeholder="Ej: Sin cebolla, papas bien doradas y abundante llajwa."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 6. TABLAS DE DATOS RESPONSIVAS */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              6. Tablas de Despacho y Registros
            </h2>
            <p className="text-xs text-slate-500">
              Visualización organizada de pedidos y liquidaciones para pantallas de despacho.
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente / Teléfono</TableHead>
                <TableHead>Comercio</TableHead>
                <TableHead>Total (Bs.)</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-bold text-slate-900">TRP-1041</TableCell>
                <TableCell>
                  <p className="font-semibold">Sandra Mamani</p>
                  <p className="text-slate-400 text-[11px]">+591 78901234</p>
                </TableCell>
                <TableCell>[DEMO] Pollería El Pahuichi</TableCell>
                <TableCell className="font-bold text-emerald-600">41.00 Bs.</TableCell>
                <TableCell>
                  <PaymentStatusBadge status="PENDIENTE" />
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status="EN_PREPARACION" />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Despachar
                  </Button>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-bold text-slate-900">VIAJE-2001</TableCell>
                <TableCell>
                  <p className="font-semibold">Wilson Mamani (Torito)</p>
                  <p className="text-slate-400 text-[11px]">Mercado Central → Villa 14</p>
                </TableCell>
                <TableCell>Movilidad Pasajeros</TableCell>
                <TableCell className="font-bold text-amber-600">5.00 Bs.</TableCell>
                <TableCell>
                  <Badge variant="emerald">Efectivo</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="amber" dot>En Viaje</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Finalizar
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        {/* 7. ALERTAS Y NOTIFICACIONES */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              7. Notificaciones y Mensajes del Sistema
            </h2>
            <p className="text-xs text-slate-500">
              Mensajes contextuales para confirmar acciones o reportar incidentes en ruta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Alert variant="success" title="¡Pedido Despachado con Éxito!">
              El repartidor Juan Carlos ha retirado el pedido de Pollería El Pahuichi y se dirige a la Av. Mortensen.
            </Alert>

            <Alert variant="warning" title="Comprobante QR por Verificar">
              El cliente adjuntó captura de transferencia bancaria por 41.00 Bs. Requiere validación del operador.
            </Alert>

            <Alert variant="error" title="Comercio Temporalmente Cerrado">
              Pollería El Pahuichi se encuentra fuera de horario de cocina. Los nuevos pedidos se pausaron.
            </Alert>

            <Alert variant="info" title="Conexión de WhatsApp Operativa">
              TropiBot está atendiendo consultas entrantes con motor Groq Llama 3.3 70B (latencia: 280ms).
            </Alert>
          </div>
        </section>

        {/* 8. VENTANAS MODALES, CARGA Y ESTADOS VACÍOS */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              8. Modales, Estados de Carga y Estados Vacíos
            </h2>
            <p className="text-xs text-slate-500">
              Patrones visuales para momentos de espera, diálogos de confirmación y pantallas sin datos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Modal Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Diálogos y Modales</CardTitle>
                <CardDescription>
                  Ventanas emergentes accesibles con desenfoque de fondo y cierre en tecla ESC.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                  Abrir Modal de Ejemplo
                </Button>
              </CardContent>
            </Card>

            {/* Skeleton Loading Demo */}
            <Card>
              <CardHeader>
                <CardTitle>Esqueletos de Carga</CardTitle>
                <CardDescription>
                  Placeholders animados para cargas de contenido sin saltos de interfaz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
              </CardContent>
            </Card>

            {/* Estado Vacío */}
            <EmptyState
              title="Sin pedidos en ruta"
              description="No hay pedidos activos asignados a tu cuenta en este momento."
              actionLabel="Actualizar Despacho"
              onAction={() => alert("Actualizando lista...")}
            />
          </div>
        </section>
      </main>

      {/* Modal Interactivo de Demostración */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Confirmar Despacho de Pedido TRP-1041"
        description="Selecciona el repartidor en moto disponible para Ivirgarzama."
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert("Repartidor asignado exitosamente.");
                setIsModalOpen(false);
              }}
            >
              Asignar Conductor
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200">
            <p className="font-bold">Total a cobrar al cliente: 41.00 Bs.</p>
            <p className="text-[11px] text-emerald-700">Comercio: [DEMO] Pollería El Pahuichi</p>
          </div>

          <Select label="Repartidor Asignado" defaultValue="r1">
            <option value="r1">Juan Carlos Choque (Moto 1 - Placa 4321-XYZ)</option>
            <option value="r2">Wilson Mamani (Torito 1 - Placa TR-892)</option>
            <option value="r3">Mario Quispe (Moto 2 - Placa 1289-ABC)</option>
          </Select>

          <Input
            label="Instrucciones para el repartidor"
            placeholder="Llevar cambio de 100 Bs. si paga en efectivo."
            defaultValue="Cliente espera en puerta con reja negra."
          />
        </div>
      </Modal>
    </div>
  );
}
