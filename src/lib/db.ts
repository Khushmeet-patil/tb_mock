import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

export interface SampleEntry {
  id: string;
  nameOfSTP: string;
  patientName: string;
  nikshayId: string;
  tuberculosisUnit: string;
  sampleFrom: string;
  typology: string;
  testType: string;
  sampleType: string;
  collectionSite: string;
  collectionDate: string; // YYYY-MM-DD
  collectionTime: string; // HH:MM
  signOfChoNtep: string;
  submissionSite: string;
  submissionDate: string; // YYYY-MM-DD
  submissionTime: string; // HH:MM
  labNo: string;
  signOfLt: string;
  
  // Auto-calculated fields
  daysDifference: number;
  timeDifferenceHours: number;
  tatStatus: 'Within TAT' | 'TAT Exceeded';
  
  // Workflow fields
  status: 'Pending' | 'Approved' | 'Rejected';
  validatorNotes?: string;
  validatedAt?: string;
  createdAt: string;
}

const DATA_FILE_PATH = path.join(process.cwd(), 'src/data/samples.json');

// MongoDB cached client for serverless environment
let cachedMongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }
  
  if (cachedMongoClient) {
    return cachedMongoClient;
  }
  
  // Set connection timeout to 8 seconds for fast failure reporting in serverless functions
  const client = new MongoClient(uri, {
    connectTimeoutMS: 8000,
    serverSelectionTimeoutMS: 8000,
  });
  await client.connect();
  cachedMongoClient = client;
  return client;
}

// Read samples from JSON file or MongoDB
export async function readSamples(): Promise<SampleEntry[]> {
  const uri = process.env.MONGODB_URI;
  
  if (uri) {
    const client = await getMongoClient();
    const db = client.db('tb_sample_tracking');
    const collection = db.collection<SampleEntry>('samples');
    
    const samples = await collection.find({}).toArray();
    
    return samples.map((s: any) => {
      const { _id, ...rest } = s;
      return rest as SampleEntry;
    });
  } else {
    return readLocalSamples();
  }
}

// Helper to read local JSON file
function readLocalSamples(): SampleEntry[] {
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      return [];
    }
    const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent) as SampleEntry[];
  } catch (error) {
    console.error('Error reading local samples file:', error);
    return [];
  }
}

// Write samples to JSON file or MongoDB
export async function writeSamples(samples: SampleEntry[]): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  
  if (uri) {
    const client = await getMongoClient();
    const db = client.db('tb_sample_tracking');
    const collection = db.collection<SampleEntry>('samples');
    
    // Full collection synchronization
    await collection.deleteMany({});
    if (samples.length > 0) {
      await collection.insertMany(samples);
    }
    return true;
  } else {
    try {
      const dirPath = path.dirname(DATA_FILE_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(samples, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Error writing local samples file:', error);
      return false;
    }
  }
}

// Helper to calculate turnaround time differences
export function calculateTAT(
  collDate: string,
  collTime: string,
  subDate: string,
  subTime: string
): { daysDifference: number; timeDifferenceHours: number; tatStatus: 'Within TAT' | 'TAT Exceeded' } {
  const collectionDT = new Date(`${collDate}T${collTime}`);
  const submissionDT = new Date(`${subDate}T${subTime}`);

  if (isNaN(collectionDT.getTime()) || isNaN(submissionDT.getTime())) {
    return {
      daysDifference: 0,
      timeDifferenceHours: 0,
      tatStatus: 'Within TAT',
    };
  }

  // Days Difference (Simple Date-based difference)
  const cDate = new Date(collDate);
  const sDate = new Date(subDate);
  const timeDiff = sDate.getTime() - cDate.getTime();
  const daysDifference = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));

  // Total Hours Difference (Time-based difference)
  const msDifference = submissionDT.getTime() - collectionDT.getTime();
  const totalHours = Math.max(0, msDifference / (1000 * 60 * 60));
  
  // Format to 2 decimal places
  const timeDifferenceHours = Math.round(totalHours * 100) / 100;

  // Turnaround Time Threshold: 24 hours
  const tatStatus = timeDifferenceHours <= 24 ? 'Within TAT' : 'TAT Exceeded';

  return {
    daysDifference,
    timeDifferenceHours,
    tatStatus,
  };
}
