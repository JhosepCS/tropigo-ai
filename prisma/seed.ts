import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando datos para «Atiende» — Clínica Dental Lumen (Madrid)...");

  // 1. Usuario Administrador
  const adminEmail = process.env.ADMIN_EMAIL || "admin@atiende.es";
  const adminPassword = process.env.ADMIN_PASSWORD || "AdminAtiende2025!";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword },
    create: {
      email: adminEmail,
      name: "Administrador Lumen",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log(`✅ Administrador creado: ${admin.email}`);

  // 2. Perfil de la Agencia (Marca Blanca)
  const existingAgency = await prisma.agencyProfile.findFirst();
  if (!existingAgency) {
    await prisma.agencyProfile.create({
      data: {
        name: "Lumina Digital Agency",
        logoUrl: "/agency-logo.png",
      },
    });
  }

  // 3. Perfil del Negocio (Clínica Dental Lumen)
  const existingBusiness = await prisma.businessProfile.findFirst();
  if (!existingBusiness) {
    await prisma.businessProfile.create({
      data: {
        name: "Clínica Dental Lumen",
        activity: "Clínica odontológica integral, implantes y estética dental",
        address: "Calle Gran Vía 42, 2º Izquierda, 28013 Madrid",
        phone: "+34 912 345 678",
        website: "https://clinicalumen.es",
        timezone: "Europe/Madrid",
        assistantEnabled: true,
      },
    });
    console.log("✅ Perfil de Clínica Dental Lumen creado");
  }

  // 4. Configuración del Asistente (Comportamiento)
  const existingAssistant = await prisma.assistantConfig.findFirst();
  if (!existingAssistant) {
    await prisma.assistantConfig.create({
      data: {
        name: "LumenBot",
        avatarUrl: "/assistant-avatar.png",
        tone: "cercano",
        welcomeMessage:
          "¡Hola! 👋 Soy el asistente virtual de Clínica Dental Lumen en Madrid. ¿En qué puedo ayudarte hoy? Puedo informarte sobre nuestros tratamientos, resolver cualquier duda o agendar tu cita.",
        instructions:
          "Eres el asistente virtual oficial de Clínica Dental Lumen, ubicada en Calle Gran Vía 42 de Madrid. Atiende a los pacientes con tono cercano, empático y muy profesional (español de España). Responde a dudas sobre tratamientos, precios oficiales y horarios. Cuando un paciente solicite una cita, utiliza las herramientas disponibles para consultar huecos libres y confirma con él día, hora y servicio antes de reservarla.",
        prohibitedActions:
          "1. Nunca inventes precios o servicios que no estén en la lista oficial.\n2. Nunca des diagnósticos médicos, prescripciones de medicamentos ni consejos clínicos.\n3. Ante una urgencia o dolor agudo, deriva de inmediato a una persona facilitando el teléfono de la clínica (+34 912 345 678).\n4. Nunca confirmes una cita sin comprobar disponibilidad y sin la confirmación explícita del paciente.",
        operatingHours: JSON.stringify({
          lunes: { open: "09:00", close: "20:00", morning: "09:00 - 14:00", afternoon: "16:00 - 20:00" },
          martes: { open: "09:00", close: "20:00", morning: "09:00 - 14:00", afternoon: "16:00 - 20:00" },
          miercoles: { open: "09:00", close: "20:00", morning: "09:00 - 14:00", afternoon: "16:00 - 20:00" },
          jueves: { open: "09:00", close: "20:00", morning: "09:00 - 14:00", afternoon: "16:00 - 20:00" },
          viernes: { open: "09:00", close: "20:00", morning: "09:00 - 14:00", afternoon: "16:00 - 20:00" },
          sabado: { closed: true },
          domingo: { closed: true },
        }),
        offHoursPolicy: "TAKE_MESSAGE",
        handoffRules: JSON.stringify([
          "queja",
          "urgencia",
          "pide hablar con alguien",
          "no sabe la respuesta",
        ]),
        customHandoffRule: "Presupuestos especiales para tratamientos combinados",
        safeMode: true,
      },
    });
    console.log("✅ Comportamiento del asistente configurado");
  }

  // 5. Los 8 Servicios de Clínica Dental Lumen
  const servicesCount = await prisma.service.count();
  if (servicesCount === 0) {
    await prisma.service.createMany({
      data: [
        {
          name: "Primera visita y revisión con radiografía",
          description: "Revisión completa de salud bucodental, radiografía panorámica digital y plan de tratamiento personalizado.",
          durationMinutes: 30,
          price: 0.0,
          priceType: "free",
          requiresAssessment: false,
          order: 1,
        },
        {
          name: "Limpieza dental y profilaxis ultrasónica",
          description: "Eliminación profunda de sarro y placa bacteriana, pulido dental y aplicación de flúor remineralizante.",
          durationMinutes: 45,
          price: 45.0,
          priceType: "from",
          requiresAssessment: false,
          order: 2,
        },
        {
          name: "Empaste dental simple (obturación)",
          description: "Tratamiento de caries con composite estético biocompatible del color natural del diente.",
          durationMinutes: 40,
          price: 50.0,
          priceType: "from",
          requiresAssessment: false,
          order: 3,
        },
        {
          name: "Endodoncia rotatoria",
          description: "Tratamiento de conductos radiculares para salvar piezas dentales con pulpa afectada, evitando la extracción.",
          durationMinutes: 60,
          price: 150.0,
          priceType: "from",
          requiresAssessment: false,
          order: 4,
        },
        {
          name: "Blanqueamiento dental LED",
          description: "Tratamiento en clínica con lámpara de luz fría LED y férulas para casa, aclarando hasta 4 tonos.",
          durationMinutes: 50,
          price: 220.0,
          priceType: "from",
          requiresAssessment: false,
          order: 5,
        },
        {
          name: "Ortodoncia invisible (Invisalign)",
          description: "Alineadores transparentes extraíbles y cómodos. Planificación digital 3D ClinCheck.",
          durationMinutes: 30,
          price: 2500.0,
          priceType: "from",
          requiresAssessment: true,
          order: 6,
        },
        {
          name: "Implantes dentales de titanio",
          description: "Reposición fija de piezas ausentes con implantes de titanio grado médico y corona de zirconio.",
          durationMinutes: 60,
          price: 750.0,
          priceType: "from",
          requiresAssessment: true,
          order: 7,
        },
        {
          name: "Atención de urgencias odontológicas",
          description: "Alivio inmediato del dolor agudo, tratamiento de flemones, infecciones o traumatismos dentales.",
          durationMinutes: 40,
          price: 60.0,
          priceType: "from",
          requiresAssessment: false,
          order: 8,
        },
      ],
    });
    console.log("✅ Los 8 servicios de Clínica Dental Lumen creados");
  }

  // 6. Las 10 Preguntas Frecuentes (FAQs)
  const faqsCount = await prisma.faq.count();
  if (faqsCount === 0) {
    await prisma.faq.createMany({
      data: [
        {
          question: "¿Tenéis opciones de financiación?",
          answer: "Sí, disponemos de financiación a medida hasta en 24 meses sin intereses con tan solo tu DNI y última nómina.",
          category: "Pagos y Financiación",
          order: 1,
        },
        {
          question: "¿Aceptáis seguros dentales?",
          answer: "Trabajamos con las principales aseguradoras médicas como Sanitas, Adeslas, Asisa, Mapfre y DKV. Si tienes póliza dental, consúltanos tus coberturas.",
          category: "Seguros",
          order: 2,
        },
        {
          question: "¿Hay aparcamiento cerca de la clínica?",
          answer: "Sí, disponemos de 1 hora de aparcamiento gratuito concertado para nuestros pacientes en el Parking Central Gran Vía (a 50 metros).",
          category: "Ubicación",
          order: 3,
        },
        {
          question: "¿Cómo puedo llegar en transporte público?",
          answer: "Puedes llegar en metro en las estaciones Gran Vía (Líneas 1 y 5) o Callao (Línea 3 y 5), o en autobús con las líneas 1, 2, 46, 74 y 146.",
          category: "Ubicación",
          order: 4,
        },
        {
          question: "¿Atendéis a niños pequeños?",
          answer: "Por supuesto. Contamos con odontopediatras especialistas para que la visita de los más pequeños (a partir de 3 años) sea una experiencia tranquila y divertida.",
          category: "Tratamientos",
          order: 5,
        },
        {
          question: "¿La primera visita tiene algún coste?",
          answer: "No, la primera visita de revisión, diagnóstico y la radiografía panorámica digital son totalmente gratuitas y sin ningún compromiso.",
          category: "Citas",
          order: 6,
        },
        {
          question: "¿Atendéis urgencias dentales en el mismo día?",
          answer: "Sí, reservamos huecos diarios específicos para atender dolores agudos, fracturas dentales o inflamaciones en el mismo día.",
          category: "Urgencias",
          order: 7,
        },
        {
          question: "¿Qué tecnología utilizáis en la clínica?",
          answer: "Disponemos de escáner intraoral 3D iTero (sin pastas molestas), radiología digital de baja radiación y TAC 3D para cirugías guiadas.",
          category: "Tecnología",
          order: 8,
        },
        {
          question: "¿Tenéis opción de sedación para pacientes con miedo o fobia?",
          answer: "Sí, ofrecemos sedación consciente por vía inhalatoria o intravenosa con médico anestesista para que el tratamiento sea 100% libre de estrés.",
          category: "Tratamientos",
          order: 9,
        },
        {
          question: "¿Cuál es vuestra política para cambiar o cancelar una cita?",
          answer: "Puedes cambiar o cancelar tu cita sin ningún coste avisándonos con al menos 24 horas de antelación para reorganizar la agenda.",
          category: "Citas",
          order: 10,
        },
      ],
    });
    console.log("✅ Las 10 FAQs de Clínica Dental Lumen creadas");
  }

  // 7. Base de Conocimiento Libre
  const existingKb = await prisma.knowledgeBase.findFirst();
  if (!existingKb) {
    await prisma.knowledgeBase.create({
      data: {
        freeText:
          "Clínica Dental Lumen en Madrid cuenta con un equipo médico colegiado liderado por la Dra. Elena Gómez (Col. 28004512) y el Dr. Pablo Serrano (Col. 28006789). Todas nuestras salas cumplen con estrictos protocolos de bioseguridad y esterilización de grado hospitalario con autoclave clase B. Contamos con el sello de Calidad Dental Madrid y una valoración media de 4.9/5 estrellas en Google.",
      },
    });
  }

  // 8. Las 6 Integraciones (Empiezan desconectadas)
  const integrationsCount = await prisma.integration.count();
  if (integrationsCount === 0) {
    await prisma.integration.createMany({
      data: [
        {
          provider: "google_calendar",
          name: "Google Calendar",
          status: "disconnected",
          settingsJson: JSON.stringify({
            calendarId: "primary",
            slotDurationMinutes: 30,
            bufferMinutes: 10,
            minAdvanceHours: 2,
            maxAdvanceDays: 30,
          }),
          capabilitiesJson: JSON.stringify({
            checkFreeSlots: true,
            createAppointment: true,
            rescheduleAppointment: true,
            cancelAppointment: true,
            viewUpcoming: true,
          }),
        },
        {
          provider: "gmail",
          name: "Gmail",
          status: "disconnected",
          settingsJson: JSON.stringify({
            dailySummaryTime: "20:30",
            summaryEmail: "director@clinicalumen.es",
          }),
          capabilitiesJson: JSON.stringify({
            sendConfirmationEmail: true,
            sendDailySummary: true,
          }),
        },
        {
          provider: "google_sheets",
          name: "Google Sheets",
          status: "disconnected",
          settingsJson: JSON.stringify({
            spreadsheetTitle: "Contactos — Clínica Dental Lumen",
            spreadsheetUrl: null,
          }),
          capabilitiesJson: JSON.stringify({
            syncContacts: true,
          }),
        },
        {
          provider: "slack",
          name: "Slack",
          status: "disconnected",
          settingsJson: JSON.stringify({
            webhookUrl: "",
            channelName: "#alertas-clinica",
          }),
          capabilitiesJson: JSON.stringify({
            notifyHandoff: true,
            notifyAppointmentBooked: true,
          }),
        },
        {
          provider: "stripe",
          name: "Stripe",
          status: "disconnected",
          settingsJson: JSON.stringify({
            defaultDepositAmount: 20.0,
            currency: "EUR",
            depositByService: {
              "Ortodoncia invisible (Invisalign)": 50.0,
              "Implantes dentales de titanio": 50.0,
            },
          }),
          capabilitiesJson: JSON.stringify({
            createDepositPaymentLink: true,
          }),
        },
        {
          provider: "webhooks",
          name: "Webhooks Salientes",
          status: "disconnected",
          settingsJson: JSON.stringify({
            targetUrl: "",
            secretKey: "whsec_atiende_demo_2025",
            events: ["conversation_created", "appointment_created", "human_takeover", "contact_created"],
          }),
          capabilitiesJson: JSON.stringify({
            sendWebhookEvents: true,
          }),
        },
      ],
    });
    console.log("✅ Las 6 integraciones registradas (empiezan desconectadas)");
  }

  // 9. Canales (WhatsApp y Chat Web)
  const channelsCount = await prisma.channel.count();
  if (channelsCount === 0) {
    await prisma.channel.createMany({
      data: [
        {
          type: "whatsapp",
          status: "disconnected",
          settingsJson: JSON.stringify({ sessionDir: "./data/whatsapp_session" }),
        },
        {
          type: "webchat",
          status: "connected",
          settingsJson: JSON.stringify({
            enabled: true,
            primaryColor: "#0F766E", // Verde azulado elegante
            welcomeMessage: "¡Hola! ¿En qué puedo ayudarte en Clínica Dental Lumen?",
          }),
        },
      ],
    });
    console.log("✅ Canales configurados");
  }

  // 10. Contactos y Conversaciones de Ejemplo
  const contactsCount = await prisma.contact.count();
  if (contactsCount === 0) {
    const contact1 = await prisma.contact.create({
      data: {
        name: "Marta Gómez Sanz",
        phone: "+34 612 345 678",
        email: "marta.gomez@gmail.com",
        channel: "whatsapp",
        interest: "Ortodoncia invisible",
        bookedAppointment: true,
      },
    });

    const contact2 = await prisma.contact.create({
      data: {
        name: "Carlos Ruiz Martín",
        phone: "+34 699 887 766",
        channel: "whatsapp",
        interest: "Urgencia dolor dental",
        bookedAppointment: false,
      },
    });

    const contact3 = await prisma.contact.create({
      data: {
        name: "Laura Sánchez",
        email: "laura.sanchez@yahoo.es",
        channel: "webchat",
        interest: "Blanqueamiento dental",
        bookedAppointment: false,
      },
    });

    // Conversación 1 (WhatsApp, con cita acordada)
    await prisma.conversation.create({
      data: {
        contactId: contact1.id,
        channel: "whatsapp",
        status: "ai_active",
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 30),
        messages: {
          create: [
            {
              sender: "customer",
              content: "Buenas tardes, quería informarme sobre el tratamiento de ortodoncia invisible y si la primera consulta es gratuita.",
              createdAt: new Date(Date.now() - 1000 * 60 * 35),
            },
            {
              sender: "assistant",
              content: "¡Buenas tardes Marta! 👋 En Clínica Dental Lumen trabajamos con Invisalign. La primera visita de revisión, escáner 3D y estudio es 100% gratuita y sin compromiso. ¿Te gustaría agendar una cita esta semana para que te valore el especialista?",
              toolCallsJson: JSON.stringify([{ tool: "consultar_servicios", args: { servicio: "Invisalign" } }]),
              createdAt: new Date(Date.now() - 1000 * 60 * 33),
            },
            {
              sender: "customer",
              content: "Sí, por favor. ¿Tenéis hueco el jueves por la tarde a partir de las 17:00?",
              createdAt: new Date(Date.now() - 1000 * 60 * 31),
            },
            {
              sender: "assistant",
              content: "¡Perfecto! El jueves tenemos libre a las 17:30 h con la Dra. Gómez. ¿Te reservo ese hueco para tu primera visita de valoración de ortodoncia invisible?",
              toolCallsJson: JSON.stringify([{ tool: "consultar_huecos_libres", args: { dia: "jueves", desde: "17:00" } }]),
              createdAt: new Date(Date.now() - 1000 * 60 * 30),
            },
          ],
        },
      },
    });

    // Conversación 2 (WhatsApp, necesita atención / queja o urgencia)
    await prisma.conversation.create({
      data: {
        contactId: contact2.id,
        channel: "whatsapp",
        status: "human_takeover",
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 10),
        messages: {
          create: [
            {
              sender: "customer",
              content: "Hola, tengo un dolor insoportable en una muela desde anoche y no puedo esperar. Necesito que me vea un dentista ya.",
              createdAt: new Date(Date.now() - 1000 * 60 * 12),
            },
            {
              sender: "assistant",
              content: "Lamento mucho que estés con tanto dolor, Carlos. Al tratarse de una urgencia dental, he pasado el aviso a nuestro equipo médico para atenderte de inmediato. También puedes llamarnos directamente al 912 345 678. Un compañero te responde por aquí en un minuto.",
              toolCallsJson: JSON.stringify([{ tool: "pasar_a_humano", args: { motivo: "Urgencia dolor agudo" } }]),
              createdAt: new Date(Date.now() - 1000 * 60 * 11),
            },
          ],
        },
      },
    });

    // Conversación 3 (Web Chat)
    await prisma.conversation.create({
      data: {
        contactId: contact3.id,
        channel: "webchat",
        status: "ai_active",
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 5),
        messages: {
          create: [
            {
              sender: "customer",
              content: "¿Cuánto cuesta el blanqueamiento dental y cuánto dura la sesión?",
              createdAt: new Date(Date.now() - 1000 * 60 * 6),
            },
            {
              sender: "assistant",
              content: "¡Hola Laura! El blanqueamiento dental LED en clínica tiene un precio desde 220 €. La sesión dura aproximadamente 50 minutos y combina una sesión en clínica con férulas de refuerzo para casa. ¿Quieres agendar una revisión previa para comprobar el tono de tu esmalte?",
              toolCallsJson: JSON.stringify([{ tool: "consultar_servicios", args: { servicio: "Blanqueamiento" } }]),
              createdAt: new Date(Date.now() - 1000 * 60 * 5),
            },
          ],
        },
      },
    });

    // Cita agendada de ejemplo
    await prisma.appointment.create({
      data: {
        contactId: contact1.id,
        serviceName: "Primera visita y revisión con radiografía",
        startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // En 2 días
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 30),
        status: "confirmed",
        notes: "Creada por Atiende — Valoración Ortodoncia Invisible",
      },
    });

    // Registros en Actividad
    await prisma.activityLog.createMany({
      data: [
        {
          action: "Cita creada",
          provider: "google_calendar",
          channel: "whatsapp",
          status: "simulated",
          detailsJson: JSON.stringify({ paciente: "Marta Gómez", servicio: "Revisión e Invisalign", fecha: "Jueves 17:30" }),
        },
        {
          action: "Pase a humano",
          provider: "assistant",
          channel: "whatsapp",
          status: "success",
          detailsJson: JSON.stringify({ paciente: "Carlos Ruiz", motivo: "Urgencia dolor agudo" }),
        },
        {
          action: "Consulta de servicios y tarifas",
          provider: "assistant",
          channel: "webchat",
          status: "success",
          detailsJson: JSON.stringify({ servicio: "Blanqueamiento dental LED" }),
        },
      ],
    });

    console.log("✅ Contactos, conversaciones de ejemplo y actividad creados");
  }

  console.log("🚀 Base de datos inicializada al 100% para «Atiende» (Clínica Dental Lumen)!");
}

main()
  .catch((e) => {
    console.error("❌ Error en la siembra:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
