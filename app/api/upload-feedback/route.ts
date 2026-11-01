import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs' // ✅ Forces Node.js environment for Buffer/Form handling

// Initialize Supabase Admin Client (Bypasses RLS for DB writes, but respects Storage Policies if configured)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify User is Logged In (via Clerk)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 });
    }

    // 2. Parse Form Data
    let formData;
    try {
      formData = await request.formData();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid form data format' }, { status: 400 });
    }

    const file = formData.get('file') as File;
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No valid file provided' }, { status: 400 });
    }

    // 3. Validate File Type & Size
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, PDF allowed.' }, { status: 400 });
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    // 4. Generate Unique Filename
    const ext = file.name.split('.').pop() || 'pdf';
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // 5. Upload to Supabase Storage
    // We use the ADMIN client here. Even though admin bypasses DB RLS, 
    // Storage operations might still respect storage policies depending on config.
    // However, since we added "Allow authenticated uploads", the server-side check 
    // combined with the policy should work.
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const { data, error } = await supabaseAdmin.storage
      .from('feedback-attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Storage Upload Error:', error);
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    // 6. Return Success
    return NextResponse.json({ 
      success: true, 
      path: data.path,
      message: 'File uploaded successfully'
    });

  } catch (error: any) {
    console.error('API Route Critical Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error during upload' 
    }, { status: 500 });
  }
}