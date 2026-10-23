import { NextRequest, NextResponse } from "next/server";
import { scrapeWebsite } from "@/lib/crawler/scraper";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "Falta la URL" }, { status: 400 });

    const result = await scrapeWebsite(url);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
