import { NextResponse } from 'next/server';
import { readSamples, writeSamples, SampleEntry } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Resolve dynamic params (safe for both Next.js 14 and Next.js 15 async params)
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    if (!id) {
      return NextResponse.json({ message: 'Missing sample ID in request path' }, { status: 400 });
    }

    const body = await request.json();
    const { status, validatorNotes } = body;

    // Validate update fields
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid validation status. Must be "Approved" or "Rejected".' },
        { status: 400 }
      );
    }

    const samples = await readSamples();
    const index = samples.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ message: 'Sample entry not found' }, { status: 404 });
    }

    // Update status and details
    samples[index] = {
      ...samples[index],
      status,
      validatorNotes: validatorNotes || '',
      validatedAt: new Date().toISOString(),
    };

    const success = await writeSamples(samples);

    if (success) {
      return NextResponse.json(
        { message: `Sample status updated to ${status}`, sample: samples[index] },
        { status: 200 }
      );
    } else {
      return NextResponse.json({ message: 'Failed to write updates to database file' }, { status: 500 });
    }

  } catch (error) {
    console.error('API PUT sample status error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
