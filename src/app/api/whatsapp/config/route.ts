import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let config = await prisma.whatsAppConfig.findFirst();

    const updateData: any = {};
    if (body.activeProvider) updateData.activeProvider = body.activeProvider;
    if (body.metaPhoneNumberId !== undefined) updateData.metaPhoneNumberId = body.metaPhoneNumberId;
    if (body.metaWabaId !== undefined) updateData.metaWabaId = body.metaWabaId;
    if (body.metaWebhookVerifyToken !== undefined)
      updateData.metaWebhookVerifyToken = body.metaWebhookVerifyToken;

    if (body.metaSystemToken) {
      updateData.metaSystemTokenEncrypted = encrypt(body.metaSystemToken);
    }
    if (body.metaAppSecret) {
      updateData.metaAppSecretEncrypted = encrypt(body.metaAppSecret);
    }

    if (!config) {
      config = await prisma.whatsAppConfig.create({
        data: {
          activeProvider: body.activeProvider || "BAILEYS_QR",
          ...updateData,
        },
      });
    } else {
      config = await prisma.whatsAppConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
