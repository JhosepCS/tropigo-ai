import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { services, faqs } = await req.json();

    if (services && services.length > 0) {
      for (const s of services) {
        await prisma.service.create({
          data: {
            name: s.name,
            description: s.description || "",
            durationMinutes: s.durationMinutes || 30,
            price: s.price || 0,
            priceType: s.priceType || "from",
            requiresAssessment: Boolean(s.requiresAssessment),
          },
        });
      }
    }

    if (faqs && faqs.length > 0) {
      for (const f of faqs) {
        await prisma.faq.create({
          data: {
            question: f.question,
            answer: f.answer,
            category: f.category || "General",
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
