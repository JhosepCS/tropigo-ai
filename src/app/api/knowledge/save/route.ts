import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { business, freeText } = await req.json();

    const currentBiz = await prisma.businessProfile.findFirst();
    if (currentBiz && business) {
      await prisma.businessProfile.update({
        where: { id: currentBiz.id },
        data: {
          name: business.name,
          activity: business.activity,
          address: business.address,
          phone: business.phone,
          website: business.website,
        },
      });
    }

    const currentKb = await prisma.knowledgeBase.findFirst();
    if (currentKb && freeText !== undefined) {
      await prisma.knowledgeBase.update({
        where: { id: currentKb.id },
        data: { freeText },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
