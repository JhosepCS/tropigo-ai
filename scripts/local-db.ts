import { spawn } from "child_process";
import net from "net";

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.connect(port, "127.0.0.1");
  });
}

async function startDb() {
  const isOpen = await isPortOpen(5433);
  if (isOpen) {
    console.log("🐘 Base de datos PostgreSQL local ya está activa en el puerto 5433.");
    setInterval(() => {}, 60000);
    return;
  }

  console.log("🐘 Iniciando servidor PostgreSQL local (Prisma Dev) en puerto 5433...");
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const proc = spawn(npxCmd, ["prisma", "dev", "--db-port", "5433"], {
    stdio: "inherit",
    shell: true,
  });

  proc.on("exit", (code) => {
    console.log(`Servidor de base de datos detenido con código ${code}`);
  });
}

startDb();
