import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE!
);

export interface BuildChemProduct {
  id: number;
  product_name: string | null;
  product_code: string | null;
  product_description: string | null;
  product_image: string | null;
  created_at: string;
  product_type: string | null;
}

// GET - Fetch all products
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const typeFilter = searchParams.get("type")?.trim() ?? "";

    let query = supabase.from("products").select("*").order("created_at", { ascending: false });

    if (typeFilter) {
      query = query.eq("product_type", typeFilter);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    let products = data as BuildChemProduct[];

    // Client-side search
    if (search) {
      products = products.filter(p =>
        p.product_name?.toLowerCase().includes(search) ||
        p.product_code?.toLowerCase().includes(search) ||
        p.product_description?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, data: products, total: products.length });
  } catch (err: any) {
    console.error("[BuildChem Products GET]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST - Create new product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_name, product_code, product_description, product_image, product_type } = body;

    const { data, error } = await supabase
      .from("products")
      .insert({
        product_name,
        product_code,
        product_description,
        product_image,
        product_type,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[BuildChem Products POST]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH - Update product
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, product_name, product_code, product_description, product_image, product_type } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("products")
      .update({
        product_name,
        product_code,
        product_description,
        product_image,
        product_type,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[BuildChem Products PATCH]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE - Delete product
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (err: any) {
    console.error("[BuildChem Products DELETE]", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
