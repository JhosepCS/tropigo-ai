export interface InteractiveButton {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface IncomingLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface IncomingWhatsAppMessage {
  id: string;
  from: string; // Número de teléfono en formato E.164 (ej: 59174389012)
  senderProfileName?: string; // Nombre del perfil de WhatsApp proporcionado por Meta
  timestamp: number;
  type: "text" | "audio" | "image" | "location" | "document" | "interactive" | "other";
  text?: string;
  location?: IncomingLocation;
  audioMediaId?: string; // ID de medio para descargar audio
  audioBuffer?: Buffer; // Buffer en caso de Baileys
  imageMediaId?: string;
  documentMediaId?: string;
  mediaCaption?: string;
  interactiveResponseId?: string; // ID de botón o ítem de lista pulsado
  raw?: any;
}

export interface IncomingWhatsAppStatus {
  id: string; // wamid original del mensaje
  status: "sent" | "delivered" | "read" | "failed";
  recipientId: string;
  timestamp: number;
  errors?: any[];
  conversation?: any;
  pricing?: any;
}

export interface IWhatsAppProvider {
  /**
   * Envía un mensaje de texto plano
   */
  sendMessage(to: string, text: string): Promise<string>;

  /**
   * Envía un mensaje con botones interactivos de respuesta rápida
   */
  sendInteractiveButtons(
    to: string,
    text: string,
    buttons: InteractiveButton[]
  ): Promise<string>;

  /**
   * Envía un mensaje con menú de lista seleccionable
   */
  sendInteractiveList(
    to: string,
    header: string,
    body: string,
    sections: ListSection[]
  ): Promise<string>;

  /**
   * Solicita al usuario el envío de su ubicación GPS
   */
  sendLocationRequest(to: string, text: string): Promise<string>;

  /**
   * Marca un mensaje entrante como leído (doble check azul)
   */
  markAsRead(messageId: string): Promise<void>;

  /**
   * Muestra el indicador de presencia «escribiendo...» al usuario
   */
  sendPresenceTyping(to: string): Promise<void>;

  /**
   * Envía una imagen al usuario (URL pública o data URL https)
   */
  sendImage(to: string, imageUrl: string, caption?: string): Promise<string>;
}
