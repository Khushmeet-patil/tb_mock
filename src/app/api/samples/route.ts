import { NextResponse } from 'next/server';
import { readSamples, writeSamples, calculateTAT, SampleEntry } from '@/lib/db';
import crypto from 'crypto';

// GET all samples
export async function GET() {
  try {
    const samples = await readSamples();
    // Sort by createdAt descending so newest additions show up first
    const sorted = [...samples].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return NextResponse.json({ samples: sorted }, { status: 200 });
  } catch (error) {
    console.error('API GET samples error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a sample
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Server-side validation
    const requiredFields = [
      'patientName', 'nikshayId', 'tuberculosisUnit', 'collectionSite',
      'collectionDate', 'collectionTime', 'signOfChoNtep', 'submissionSite',
      'submissionDate', 'submissionTime', 'labNo', 'signOfLt'
    ];
    
    for (const field of requiredFields) {
      if (!body[field] || String(body[field]).trim() === '') {
        return NextResponse.json(
          { message: `Required field missing or empty: ${field}` },
          { status: 400 }
        );
      }
    }

    // Read current samples
    const samples = await readSamples();

    // Auto-calculate TAT details on the server side
    const tatResult = calculateTAT(
      body.collectionDate,
      body.collectionTime,
      body.submissionDate,
      body.submissionTime
    );

    // Generate clean ID
    const shortId = `tb-${crypto.randomBytes(3).toString('hex')}`;

    // Construct new sample entry
    const newSample: SampleEntry = {
      id: shortId,
      nameOfSTP: body.nameOfSTP || 'Delhi STP',
      patientName: body.patientName.trim(),
      nikshayId: body.nikshayId.trim(),
      tuberculosisUnit: body.tuberculosisUnit.trim(),
      sampleFrom: body.sampleFrom || 'OPD',
      typology: body.typology || 'New case',
      testType: body.testType || 'CBNAAT',
      sampleType: body.sampleType || 'Sputum',
      collectionSite: body.collectionSite.trim(),
      collectionDate: body.collectionDate,
      collectionTime: body.collectionTime,
      signOfChoNtep: body.signOfChoNtep.trim(),
      submissionSite: body.submissionSite.trim(),
      submissionDate: body.submissionDate,
      submissionTime: body.submissionTime,
      labNo: body.labNo.trim(),
      signOfLt: body.signOfLt.trim(),
      
      // Calculations
      daysDifference: tatResult.daysDifference,
      timeDifferenceHours: tatResult.timeDifferenceHours,
      tatStatus: tatResult.tatStatus,
      
      // Default state
      status: 'Pending',
      validatorNotes: '',
      validatedAt: '',
      createdAt: new Date().toISOString(),
    };

    // Insert and save
    samples.push(newSample);
    const success = await writeSamples(samples);

    if (success) {
      return NextResponse.json({ message: 'Sample registered successfully', sample: newSample }, { status: 201 });
    } else {
      return NextResponse.json({ message: 'Failed to write sample to database file' }, { status: 500 });
    }

  } catch (error) {
    console.error('API POST samples error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
