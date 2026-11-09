import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function bootstrap() {
  console.log("🛡️ [TropiGO Auth] Iniciando procedimiento de arranque seguro de Superadministrador...");

  // 1. Verificar si ya existe algún Superadministrador en la base de datos
  const existingSuperadmin = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true, email: true, createdAt: true },
  });

  if (existingSuperadmin) {
    console.error(`❌ ACCESO DENEGADO: Ya existe un Superadministrador en el sistema (${existingSuperadmin.email}).`);
    console.error("   Por estrictas razones de seguridad de TropiGO, este script queda bloqueado.");
    console.error("   Para agregar administradores adicionales, inicia sesión con el Superadmin existente en /dashboard.");
    process.exit(1);
  }

  // 2. Obtener credenciales desde argumentos CLI o variables de entorno
  const args = process.argv.slice(2);
  const email = args[0] || process.env.BOOTSTRAP_SUPERADMIN_EMAIL;
  const name = args[1] || process.env.BOOTSTRAP_SUPERADMIN_NAME || "Superadministrador TropiGO";
  let password = args[2] || process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;

  if (!email) {
    console.error("❌ Falta el correo electrónico del Superadministrador.");
    console.log("\nUso correcto del comando:");
    console.log("  npx tsx scripts/bootstrap-superadmin.ts <correo> [nombre] [contraseña]");
    console.log("O definiendo variables de entorno:");
    console.log("  BOOTSTRAP_SUPERADMIN_EMAIL=admin@tudominio.com npx tsx scripts/bootstrap-superadmin.ts\n");
    process.exit(1);
  }

  const generatedPassword = !password;
  if (!password) {
    // Generar contraseña de alta entropía de 16 caracteres
    password = crypto.randomBytes(12).toString("base64").replace(/[+/=]/g, "X") + "!9T";
  }

  if (password.length < 8) {
    console.error("❌ La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  console.log(`👤 Creando cuenta para: ${email} (${name})...`);

  // 3. Hash bcrypt seguro con 12 rondas
  const passwordHash = await bcrypt.hash(password, 12);

  const superadmin = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password: passwordHash,
      role: "SUPERADMIN",
      status: "ACTIVE",
      profile: {
        create: {
          documentNumber: "SUPERADMIN-01",
          internalNotes: "Primer superadministrador inicializado mediante bootstrap seguro",
        },
      },
    },
  });

  // 4. Registrar en log de auditoría
  await prisma.activityLog.create({
    data: {
      action: "BOOTSTRAP_SUPERADMIN_CREATED",
      userId: superadmin.id,
      status: "success",
      detailsJson: JSON.stringify({
        email: superadmin.email,
        timestamp: new Date().toISOString(),
      }),
    },
  });

  console.log("\n=======================================================");
  console.log("✅ ¡SUPERADMINISTRADOR CREADO EXITOSAMENTE!");
  console.log("=======================================================");
  console.log(`📧 Correo:     ${superadmin.email}`);
  console.log(`👤 Nombre:     ${superadmin.name}`);
  console.log(`🔑 Rol:        ${superadmin.role}`);
  if (generatedPassword) {
    console.log(`🔐 Contraseña temporal generada: ${password}`);
    console.log("⚠️  IMPORTANTE: Guarda esta contraseña ahora. No volverá a mostrarse.");
    console.log("   Inicia sesión en /login y cámbiala de inmediato desde tu perfil.");
  } else {
    console.log("🔐 Contraseña: [Contraseña personalizada configurada]");
  }
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

bootstrap().catch(async (e) => {
  console.error("Error al inicializar superadministrador:", e);
  await prisma.$disconnect();
  process.exit(1);
});
