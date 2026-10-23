(function () {
  const currentScript = document.currentScript;
  const businessName = currentScript?.getAttribute("data-business") || "Clínica Dental Lumen";
  const primaryColor = currentScript?.getAttribute("data-color") || "#0F766E";
  const host = currentScript?.src ? new URL(currentScript.src).origin : "http://localhost:3000";

  // Crear contenedor
  const container = document.createElement("div");
  container.id = "atiende-widget-root";
  container.style.position = "fixed";
  container.style.bottom = "24px";
  container.style.right = "24px";
  container.style.zIndex = "999999";
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif";

  // Burbuja flotante
  const bubble = document.createElement("div");
  bubble.style.width = "56px";
  bubble.style.height = "56px";
  bubble.style.borderRadius = "28px";
  bubble.style.backgroundColor = primaryColor;
  bubble.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
  bubble.style.cursor = "pointer";
  bubble.style.display = "flex";
  bubble.style.alignItems = "center";
  bubble.style.justifyContent = "center";
  bubble.style.color = "#fff";
  bubble.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`;

  // Ventana Iframe / Chat
  const chatWindow = document.createElement("iframe");
  chatWindow.src = `${host}/demo-chat-iframe?color=${encodeURIComponent(primaryColor)}&business=${encodeURIComponent(businessName)}`;
  chatWindow.style.width = "360px";
  chatWindow.style.height = "480px";
  chatWindow.style.border = "none";
  chatWindow.style.borderRadius = "24px";
  chatWindow.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
  chatWindow.style.display = "none";
  chatWindow.style.marginBottom = "16px";

  let isOpen = false;
  bubble.onclick = function () {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? "block" : "none";
    bubble.innerHTML = isOpen
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`;
  };

  container.appendChild(chatWindow);
  container.appendChild(bubble);
  document.body.appendChild(container);
})();
