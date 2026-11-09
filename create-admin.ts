import { prisma } from "./src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@tropigo.bo";
  const password = "Admin12345";
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: "SUPERADMIN",
        status: "ACTIVE",
      },
      create: {
        email,
        password: hashedPassword,
        name: "Administrador TropiGO",
        role: "SUPERADMIN",
        status: "ACTIVE",
      },
    });

    console.log("\n✅ ¡Usuario Administrador creado con éxito!");
    console.log("-------------------------------------------");
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("-------------------------------------------");
    console.log("Ahora puedes ir a http://localhost:3000/login e ingresar.");
  } catch (error) {
    console.error("❌ Error creando el administrador:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
