import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { businessName, timezone, agencyName, agencyLogo, defaultModel } = await req.json();

    const biz = await prisma.businessProfile.findFirst();
    if (biz && businessName) {
      await prisma.businessProfile.update({
        where: { id: biz.id },
        data: { name: businessName },
      });
    }

    const ag = await prisma.agencyProfile.findFirst();
    if (ag) {
      await prisma.agencyProfile.update({
        where: { id: ag.id },
        data: {
          name: agencyName || ag.name,
          logoUrl: agencyLogo !== undefined ? agencyLogo : ag.logoUrl,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
