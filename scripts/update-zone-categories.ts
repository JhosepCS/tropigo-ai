import { prisma } from "../src/lib/prisma";

const updates = [
  {
    name: "Casco Central",
    category: "GENERAL",
    lat: -17.033507,
    lng: -64.857436,
  },
  {
    name: "Av. Mortensen",
    category: "RESIDENCIAL",
    lat: -17.0348,
    lng: -64.859,
  },
  {
    name: "Mercado Central",
    category: "MERCADO",
    lat: -17.0346,
    lng: -64.8581,
  },
  {
    name: "Senda III",
    category: "RESIDENCIAL",
    lat: -17.026,
    lng: -64.85,
  },
  {
    name: "Villa 14",
    category: "RESIDENCIAL",
    lat: -17.04,
    lng: -64.865,
  },
];

async function run() {
  for (const u of updates) {
    const zone = await prisma.deliveryZone.findFirst({
      where: { name: u.name, cityId: "city_ivirgarzama" },
    });
    if (!zone) {
      console.log("No encontrada:", u.name);
      continue;
    }

    await prisma.deliveryZone.update({
      where: { id: zone.id },
      data: {
        polygonGeoJson: JSON.stringify({
          latitude: u.lat,
          longitude: u.lng,
          category: u.category,
          referenceName: u.name,
        }),
      },
    });
    console.log("Actualizada:", u.name, "→", u.category);
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
