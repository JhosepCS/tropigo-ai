import { prisma } from "../src/lib/prisma";

const newZones = [
  {
    name: "Hospital Municipal de Ivirgarzama (2do Nivel)",
    cityId: "city_ivirgarzama",
    description: "Hospital Municipal de 2do Nivel, emergencias 24h, maternidad y consultorios",
    baseDeliveryCost: 6.0,
    baseRideCost: 10.0,
    estimatedMinutes: 15,
    category: "HOSPITAL",
    lat: -17.0358,
    lng: -64.8542,
  },
  {
    name: "Caja Nacional de Salud (CNS)",
    cityId: "city_ivirgarzama",
    description: "Puesto de salud y atención médica CNS Ivirgarzama",
    baseDeliveryCost: 6.0,
    baseRideCost: 10.0,
    estimatedMinutes: 15,
    category: "HOSPITAL",
    lat: -17.0341,
    lng: -64.8558,
  },
  {
    name: "Mercado Campesino 2 de Junio",
    cityId: "city_ivirgarzama",
    description: "Feria comercial, abarrotes, verduras y productos agrícolas del Trópico",
    baseDeliveryCost: 6.0,
    baseRideCost: 10.0,
    estimatedMinutes: 15,
    category: "MERCADO",
    lat: -17.0382,
    lng: -64.8595,
  },
  {
    name: "Zona Hotelera & Alojamientos (Av. Integración)",
    cityId: "city_ivirgarzama",
    description: "Hoteles, residenciales y alojamientos para turistas y viajeros",
    baseDeliveryCost: 6.0,
    baseRideCost: 10.0,
    estimatedMinutes: 12,
    category: "HOTEL",
    lat: -17.0318,
    lng: -64.8562,
  },
  {
    name: "Barrio Magisterio",
    cityId: "city_ivirgarzama",
    description: "Zona residencial, colegios y viviendas familiares",
    baseDeliveryCost: 7.0,
    baseRideCost: 10.0,
    estimatedMinutes: 18,
    category: "RESIDENCIAL",
    lat: -17.0289,
    lng: -64.8521,
  },
  {
    name: "Barrio San Miguel",
    cityId: "city_ivirgarzama",
    description: "Zona residencial este, canchas y plazas vecinales",
    baseDeliveryCost: 7.0,
    baseRideCost: 10.0,
    estimatedMinutes: 20,
    category: "RESIDENCIAL",
    lat: -17.0395,
    lng: -64.8512,
  },
  {
    name: "Barrio 1ro de Mayo",
    cityId: "city_ivirgarzama",
    description: "Zona residencial sur y talleres",
    baseDeliveryCost: 7.0,
    baseRideCost: 10.0,
    estimatedMinutes: 20,
    category: "RESIDENCIAL",
    lat: -17.0421,
    lng: -64.8601,
  },
  {
    name: "Terminal de Buses Ivirgarzama",
    cityId: "city_ivirgarzama",
    description: "Terminal terrestre interprovincial e interdepartamental",
    baseDeliveryCost: 7.0,
    baseRideCost: 10.0,
    estimatedMinutes: 18,
    category: "TERMINAL",
    lat: -17.0298,
    lng: -64.8631,
  },
];

async function run() {
  for (const z of newZones) {
    const geoJson = JSON.stringify({
      latitude: z.lat,
      longitude: z.lng,
      category: z.category,
      referenceName: z.name,
    });

    const res = await prisma.deliveryZone.upsert({
      where: {
        cityId_name: {
          cityId: z.cityId,
          name: z.name,
        },
      },
      update: {
        description: z.description,
        baseDeliveryCost: z.baseDeliveryCost,
        baseRideCost: z.baseRideCost,
        estimatedMinutes: z.estimatedMinutes,
        polygonGeoJson: geoJson,
        isActive: true,
      },
      create: {
        name: z.name,
        cityId: z.cityId,
        description: z.description,
        baseDeliveryCost: z.baseDeliveryCost,
        baseRideCost: z.baseRideCost,
        estimatedMinutes: z.estimatedMinutes,
        polygonGeoJson: geoJson,
        isActive: true,
      },
    });
    console.log("OK Zona:", res.name);
  }
}

run()
  .catch((e) => {
    console.error("Error cargando zonas:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
