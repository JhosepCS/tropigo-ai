import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CENTER_LAT = -17.035028123456595;
const CENTER_LNG = -64.86009805670489;

type Difficulty = "FACIL" | "MEDIA" | "ALTA";

interface IvirgarzamaLocationSeed {
  name: string;
  category: "GENERAL" | "MERCADO" | "HOSPITAL" | "TERMINAL" | "HOTEL" | "RESIDENCIAL";
  latitude: number;
  longitude: number;
  streets: string;
  description: string;
  terrainDifficulty: Difficulty;
  terrainNote: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computePricing(distKm: number, difficulty: Difficulty) {
  const roadKm = Math.round(distKm * 1.25 * 100) / 100;
  const diffRideBonus = difficulty === "ALTA" ? 5 : difficulty === "MEDIA" ? 2 : 0;
  const diffDeliveryBonus = difficulty === "ALTA" ? 4 : difficulty === "MEDIA" ? 2 : 0;

  // Carrera base 10 Bs. ("carrera a 10 simples") hasta ~1.4 km en terreno fácil
  const extraRideKm = Math.max(0, roadKm - 1.4);
  const rideCost = Math.max(10, Math.round(10 + extraRideKm * 2.5 + diffRideBonus));

  // Delivery base 5 Bs. en casco céntrico
  const extraDelKm = Math.max(0, roadKm - 0.8);
  const deliveryCost = Math.max(5, Math.round(5 + extraDelKm * 2.2 + diffDeliveryBonus));

  const estimatedMinutes = Math.max(
    10,
    Math.round(10 + roadKm * 4 + (difficulty === "ALTA" ? 10 : difficulty === "MEDIA" ? 5 : 0))
  );

  return { roadKm, rideCost, deliveryCost, estimatedMinutes };
}

const IVIRGARZAMA_LOCATIONS: IvirgarzamaLocationSeed[] = [
  // 1. Zonas y calles céntricas (Asfalto / Concreto - Terreno FÁCIL)
  {
    name: "Casco Central",
    category: "GENERAL",
    latitude: -17.035028,
    longitude: -64.860098,
    streets: "Plaza 2 de Agosto, Av. Mortensen, Calle La Paz, Farmacia Carrasco",
    description: "Centro neurálgico de Ivirgarzama, Plaza Principal, bancos (Fie, Prodem, Ecofuturo) y comercio central.",
    terrainDifficulty: "FACIL",
    terrainNote: "Asfalto / Pavimento céntrico",
  },
  {
    name: "Av. Mortensen",
    category: "RESIDENCIAL",
    latitude: -17.03433,
    longitude: -64.859303,
    streets: "Av. Mortensen, Calle Comercio, Zona Bancaria",
    description: "Eje comercial principal pavimentado con entidades financieras, farmacias y tiendas.",
    terrainDifficulty: "FACIL",
    terrainNote: "Asfalto de doble vía",
  },
  {
    name: "Calle La Paz y Calle Cochabamba",
    category: "RESIDENCIAL",
    latitude: -17.03189,
    longitude: -64.858178,
    streets: "Calle La Paz, Calle Cochabamba, Gobierno Municipal, U.E. Simón Bolívar",
    description: "Cuadrante urbano céntrico frente a la Alcaldía y colegios céntricos.",
    terrainDifficulty: "FACIL",
    terrainNote: "Pavimento urbano",
  },
  {
    name: "Calle Oruro y Calle Suecia",
    category: "RESIDENCIAL",
    latitude: -17.0321,
    longitude: -64.86235,
    streets: "Calle Oruro, Calle Suecia, entorno Hospital Central",
    description: "Calles residenciales detrás del Hospital Central, mezcla de ripio y empedrado.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Calle de tierra / ripio urbano",
  },
  {
    name: "Mercado Central",
    category: "MERCADO",
    latitude: -17.0346,
    longitude: -64.8581,
    streets: "Av. Mortensen esq. Mercado Central",
    description: "Abastecimiento diario, comidas populares, jugos y abarrotes.",
    terrainDifficulty: "FACIL",
    terrainNote: "Pavimento / Tráfico comercial denso",
  },
  {
    name: "Mercado Campesino 2 de Junio",
    category: "MERCADO",
    latitude: -17.0382,
    longitude: -64.8595,
    streets: "Av. Panamericana / Zona Mercado 2 de Junio",
    description: "Feria agrícola y comercio mayorista de frutas, verduras y carnes.",
    terrainDifficulty: "FACIL",
    terrainNote: "Pavimento / Tráfico de carga",
  },
  {
    name: "Mercado Abasto Ivirgarzama",
    category: "MERCADO",
    latitude: -17.038053,
    longitude: -64.873705,
    streets: "Doble Vía Puente Ichilo-Ivirgarzama, Distribuidor Oeste",
    description: "Mercado Abasto sobre ruta principal oeste, fácil acceso por carretera.",
    terrainDifficulty: "FACIL",
    terrainNote: "Carretera Doble Vía concreto",
  },
  {
    name: "Hospital Municipal de Ivirgarzama (2do Nivel)",
    category: "HOSPITAL",
    latitude: -17.033347,
    longitude: -64.862569,
    streets: "Hospital Central de Ivirgarzama, Ruta 15",
    description: "Hospital Central de Ivirgarzama, emergencias, farmacias y consultorios.",
    terrainDifficulty: "FACIL",
    terrainNote: "Asfalto / Acceso directo",
  },
  {
    name: "Caja Nacional de Salud (CNS)",
    category: "HOSPITAL",
    latitude: -17.0341,
    longitude: -64.8558,
    streets: "Calle Cochabamba / Zona Salud",
    description: "Policlínico CNS y farmacias cercanas.",
    terrainDifficulty: "FACIL",
    terrainNote: "Pavimento urbano",
  },
  {
    name: "Zona Hotelera & Alojamientos (Av. Integración)",
    category: "HOTEL",
    latitude: -17.0318,
    longitude: -64.8562,
    streets: "Av. Integración, Colegio Adventista",
    description: "Hoteles, alojamientos y residenciales del centro.",
    terrainDifficulty: "FACIL",
    terrainNote: "Pavimento urbano",
  },
  {
    name: "Hotel Torero II y Ruta RN4",
    category: "HOTEL",
    latitude: -17.0415,
    longitude: -64.8628,
    streets: "Carretera RN4, Restaurante Ivirgarzama, EE.SS. YPFB",
    description: "Corredor sobre Carretera RN4 con hoteles, surtidor YPFB y restaurantes.",
    terrainDifficulty: "FACIL",
    terrainNote: "Carretera asfaltada RN4",
  },
  {
    name: "Terminal de Buses Ivirgarzama",
    category: "TERMINAL",
    latitude: -17.046601,
    longitude: -64.859453,
    streets: "Viaducto Este Ivirgarzama, Estación Céspedes Aguilar",
    description: "Terminal de buses interdepartamental, encomiendas y paradas de flota.",
    terrainDifficulty: "FACIL",
    terrainNote: "Concreto / Viaducto Este",
  },
  {
    name: "Campo Ferial Carpa Azul",
    category: "GENERAL",
    latitude: -17.049732,
    longitude: -64.859615,
    streets: "Av. RN4 salida sur, Agencia Carpa Azul",
    description: "Recinto ferial, eventos y parada Carpa Azul.",
    terrainDifficulty: "FACIL",
    terrainNote: "Carretera RN4 asfalto",
  },
  {
    name: "Coliseo Anacleto Rodríguez y EE.SS. Alex",
    category: "GENERAL",
    latitude: -17.03551,
    longitude: -64.869136,
    streets: "Distribuidor Oeste, EE.SS. Alex, Coliseo Multifuncional",
    description: "Zona oeste pavimentada rumbo al puente Ichilo.",
    terrainDifficulty: "FACIL",
    terrainNote: "Pavimento / Concreto",
  },
  {
    name: "Instituto Tecnológico Ivirgarzama",
    category: "GENERAL",
    latitude: -17.031083,
    longitude: -64.874527,
    streets: "Zona Oeste, U.E. María Ayma Mamani",
    description: "Zona educativa y residencial oeste cerca de Doble Vía.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Accesos secundarios de ripio",
  },
  {
    name: "La Casa del Tambaqui y 4 Arroyos",
    category: "MERCADO",
    latitude: -17.032757,
    longitude: -64.873895,
    streets: "Doble Vía Puente Ichilo, Zona Gastronómica Oeste",
    description: "Restaurantes turísticos sobre la salida oeste hacia Villa Tunari.",
    terrainDifficulty: "FACIL",
    terrainNote: "Doble vía asfaltada",
  },
  {
    name: "Estadium Municipal Evo Morales",
    category: "GENERAL",
    latitude: -17.0455,
    longitude: -64.8725,
    streets: "Zona Sudoeste, acceso Estadium Municipal",
    description: "Complejo deportivo municipal y urbanizaciones colindantes.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Calles de tierra / ripio desde RN4",
  },
  {
    name: "Coliseo de Ivirgarzama y U.E. Eben-Ezer",
    category: "RESIDENCIAL",
    latitude: -17.024316,
    longitude: -64.856926,
    streets: "Zona Norte, U.E. Eben-Ezer A, Técnico Humanístico Ivirgarzama",
    description: "Sector norte hacia el río con unidades educativas y coliseo.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Calles mixtas ripio / pavimento",
  },
  {
    name: "Salón El Gran Faraón y Puente Magareño",
    category: "GENERAL",
    latitude: -17.032297,
    longitude: -64.847883,
    streets: "Ruta 15 salida Puerto Villarroel, Puente Magareño, Recta Ivirgarzama",
    description: "Corredor este sobre Ruta 15 rumbo a Puerto Villarroel.",
    terrainDifficulty: "FACIL",
    terrainNote: "Carretera asfaltada RN15",
  },
  {
    name: "Barrio Magisterio",
    category: "RESIDENCIAL",
    latitude: -17.0289,
    longitude: -64.8521,
    streets: "Barrio Magisterio, calles internas zona noreste",
    description: "Barrio residencial consolidado al noreste del centro.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Calles de tierra / ripio",
  },
  {
    name: "Barrio 1ro de Mayo",
    category: "RESIDENCIAL",
    latitude: -17.0421,
    longitude: -64.8601,
    streets: "Camino Santa Cruz, Barrio 1ro de Mayo",
    description: "Barrio residencial sur entre RN4 y Camino Santa Cruz.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Calles internas de tierra",
  },
  {
    name: "Barrio San Miguel",
    category: "RESIDENCIAL",
    latitude: -17.0395,
    longitude: -64.8512,
    streets: "Barrio San Miguel, sector sudeste",
    description: "Zona residencial sudeste, acceso por calles vecinales.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Calles de tierra / ripio",
  },
  {
    name: "Villa 14",
    category: "RESIDENCIAL",
    latitude: -17.04,
    longitude: -64.865,
    streets: "Camino Santa Cruz, Villa 14",
    description: "Zona residencial sudoeste con calles vecinales de tierra.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Terreno de tierra / baches en lluvia",
  },
  {
    name: "Senda III",
    category: "RESIDENCIAL",
    latitude: -17.026,
    longitude: -64.85,
    streets: "Senda III, acceso noreste",
    description: "Zona de expansión noreste y sendas vecinales.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Camino vecinal de ripio",
  },
  {
    name: "Urbanización Orquídea",
    category: "RESIDENCIAL",
    latitude: -17.02941,
    longitude: -64.872133,
    streets: "Urb. Orquídea, norte de Doble Vía Oeste",
    description: "Urbanización residencial al noroeste de Ivirgarzama.",
    terrainDifficulty: "MEDIA",
    terrainNote: "Ripio / Tierra compactada",
  },
  {
    name: "Bello Horizonte y Urb. Munachi",
    category: "RESIDENCIAL",
    latitude: -17.029337,
    longitude: -64.881339,
    streets: "RN4 Oeste, Bello Horizonte, Urbanización Munachi",
    description: "Zona oeste alejada pasando el distribuidor y puente.",
    terrainDifficulty: "ALTA",
    terrainNote: "Distancia larga + calles internas sin asfalto",
  },
  {
    name: "Valle Ivirgarzama",
    category: "RESIDENCIAL",
    latitude: -17.052097,
    longitude: -64.866516,
    streets: "Camino Ivirgarzama-La Florida-Vuelteadero",
    description: "Comunidad y zona residencial al sur por camino a La Florida.",
    terrainDifficulty: "ALTA",
    terrainNote: "Tramo largo + desvíos de tierra",
  },
  {
    name: "Urbanización Ecológica y 3 Pozos",
    category: "RESIDENCIAL",
    latitude: -17.010759,
    longitude: -64.856601,
    streets: "Salida Norte hacia 3 Pozos y CUPE Mundo Acuático",
    description: "Sector norte alejado rumbo a 3 Pozos y balnearios.",
    terrainDifficulty: "ALTA",
    terrainNote: "Camino rural / tierra en tramos",
  },
  {
    name: "Libertad y U.E. Libertad",
    category: "RESIDENCIAL",
    latitude: -17.056295,
    longitude: -64.862438,
    streets: "Camino sur hacia Libertad y Túpac Katari",
    description: "Comunidad Libertad al sur de Carpa Azul.",
    terrainDifficulty: "ALTA",
    terrainNote: "Ruta rural alejada / tierra",
  },
  {
    name: "Cuartel Umopar Naval (Ruta 15 Este)",
    category: "RESIDENCIAL",
    latitude: -17.018845,
    longitude: -64.836949,
    streets: "RN15 rumbo a Puerto Villarroel",
    description: "Sector alejado al este por carretera RN15.",
    terrainDifficulty: "ALTA",
    terrainNote: "Carretera interprovincial larga (>3 km)",
  },
];

async function main() {
  // 1. Actualizar centro oficial en BusinessProfile (manteniendo nombre "Plaza Principal de Ivirgarzama")
  const existingBiz = await prisma.businessProfile.findFirst();
  if (existingBiz) {
    await prisma.businessProfile.update({
      where: { id: existingBiz.id },
      data: {
        deliveryCenterName: "Plaza Principal de Ivirgarzama",
        deliveryCenterLatitude: CENTER_LAT,
        deliveryCenterLongitude: CENTER_LNG,
        rideMinFare: 10,
      },
    });
    console.log("BusinessProfile actualizado con centro oficial:", CENTER_LAT, CENTER_LNG);
  }

  // 2. Obtener ciudad activa (Ivirgarzama)
  let city = await prisma.city.findFirst({
    where: { name: { contains: "Ivirgarzama", mode: "insensitive" } },
  });
  if (!city) {
    city = await prisma.city.findFirst({ where: { isActive: true } });
  }
  if (!city) {
    city = await prisma.city.create({
      data: { name: "Ivirgarzama", department: "Cochabamba", isActive: true },
    });
  }

  let created = 0;
  let updated = 0;

  for (const loc of IVIRGARZAMA_LOCATIONS) {
    const distKm = haversineKm(CENTER_LAT, CENTER_LNG, loc.latitude, loc.longitude);
    const { roadKm, rideCost, deliveryCost, estimatedMinutes } = computePricing(
      distKm,
      loc.terrainDifficulty
    );

    const geoPayload = JSON.stringify({
      latitude: loc.latitude,
      longitude: loc.longitude,
      category: loc.category,
      referenceName: loc.name,
      streets: loc.streets,
      terrainDifficulty: loc.terrainDifficulty,
      terrainNote: loc.terrainNote,
      distanceKm: roadKm,
    });

    const existing = await prisma.deliveryZone.findFirst({
      where: {
        cityId: city.id,
        name: { equals: loc.name, mode: "insensitive" },
      },
    });

    if (existing) {
      await prisma.deliveryZone.update({
        where: { id: existing.id },
        data: {
          description: loc.description,
          baseDeliveryCost: deliveryCost,
          baseRideCost: rideCost,
          estimatedMinutes,
          polygonGeoJson: geoPayload,
          isActive: true,
        },
      });
      updated++;
    } else {
      await prisma.deliveryZone.create({
        data: {
          cityId: city.id,
          name: loc.name,
          description: loc.description,
          baseDeliveryCost: deliveryCost,
          baseRideCost: rideCost,
          estimatedMinutes,
          polygonGeoJson: geoPayload,
          isActive: true,
        },
      });
      created++;
    }
  }

  console.log(`Zonas de Ivirgarzama sincronizadas: ${created} nuevas, ${updated} actualizadas.`);
}

main()
  .catch((err) => {
    console.error("Error en seed-ivirgarzama-zones:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
