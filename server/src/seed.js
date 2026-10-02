/**
 * Dev seed: npm run seed (from server/ or root).
 * Creates 2 doctors, 8 patients, ~40 appointments across ±10 days, and
 * invoices for completed visits so the dashboard charts have data.
 *
 * Database target: process.env.MONGO_URI (or MONGODB_URI legacy alias)
 * → local mongod, Docker, or MongoDB Atlas — whatever the .env points at.
 * The connection is ALWAYS torn down in `finally`, so the script exits
 * cleanly even when seeding fails halfway.
 */
import { connectDB, disconnectDB } from './db.js';
import { config } from './config.js';
import { Doctor, Patient, Appointment, Invoice, recalcTotals } from './models/index.js';

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const SERVICES = [
  { description: 'General Consultation', unitPrice: 1500 },
  { description: 'Specialist Consultation', unitPrice: 3000 },
  { description: 'CBC Blood Test', unitPrice: 900 },
  { description: 'X-Ray Chest', unitPrice: 2200 },
  { description: 'ECG', unitPrice: 1200 },
];

/** Never log credentials from the connection string. */
function redact(uri) {
  return uri.replace(/\/\/([^:]+):[^@]*@/, '//***:***@');
}

async function main() {
  try {
    await connectDB();
    console.log(`[seed] targeting: ${redact(config.mongoUri)}`);

    await Promise.all([
      Doctor.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      Invoice.deleteMany({}),
    ]);

    const doctors = await Doctor.create([
      { name: 'Dr. Ayesha Malik', specialty: 'Cardiology', shiftStart: '09:00', shiftEnd: '13:00' },
      { name: 'Dr. Bilal Ahmed', specialty: 'Orthopedics', shiftStart: '14:00', shiftEnd: '18:00' },
    ]);

    const names = [
      ['Hamza Tariq', 'male'], ['Sana Iqbal', 'female'], ['Usman Ghani', 'male'],
      ['Fatima Noor', 'female'], ['Ali Raza', 'male'], ['Zainab Sheikh', 'female'],
      ['Omar Farooq', 'male'], ['Maryam Javed', 'female'],
    ];

    const patients = await Patient.create(
      names.map(([name, gender], i) => ({
        name,
        phone: `030${i}-123456${i}`,
        cnic: `42301-${String(1234560 + i)}-${(i % 9) + 1}`,
        gender,
        bloodGroup: rand(['A+', 'B+', 'O+', 'AB+']),
        address: 'Karachi, Pakistan',
        vitals: [
          {
            recordedAt: new Date(),
            temperatureC: 36.5 + Math.random(),
            systolicBP: randInt(110, 140),
            diastolicBP: randInt(70, 90),
            pulseBpm: randInt(60, 100),
            spo2: randInt(95, 100),
          },
        ],
      }))
    );

    const appointments = [];
    const statuses = ['completed', 'completed', 'completed', 'confirmed', 'pending', 'cancelled'];

    for (let dayOffset = -10; dayOffset <= 10; dayOffset++) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + dayOffset);
      date.setUTCHours(0, 0, 0, 0);

      for (let i = 0; i < 2; i++) {
        const doctor = rand(doctors);
        const status = rand(statuses);
        const slot =
          doctor.shiftStart.slice(0, 2) + ':' + (randInt(0, 1) * 30).toString().padStart(2, '0');

        appointments.push({
          patientId: rand(patients)._id,
          doctorId: doctor._id,
          date,
          slot,
          status,
          reason: rand(['Fever', 'Follow-up', 'Chest pain', 'Back pain', 'Routine checkup']),
          completedAt: status === 'completed' ? date : undefined,
        });
      }
    }

    const created = await Appointment.create(appointments);

    // Invoice every completed visit.
    const invoices = created
      .filter((a) => a.status === 'completed')
      .map((a, i) => {
        const inv = new Invoice({
          invoiceNo: `INV-SEED-${String(i + 1).padStart(6, '0')}`,
          patientId: a.patientId,
          appointmentId: a._id,
          items: [{ ...rand(SERVICES), quantity: 1 }],
          taxRate: 0.05,
          paymentStatus: rand(['paid', 'paid', 'unpaid']),
          issuedAt: a.date,
        });
        if (inv.paymentStatus === 'paid') inv.paidAt = a.date;
        recalcTotals(inv);
        return inv.save();
      });

    await Promise.all(invoices);

    console.log(
      `[seed] ${doctors.length} doctors, ${patients.length} patients, ` +
        `${created.length} appointments, ${invoices.length} invoices ✓`
    );
  } catch (err) {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  } finally {
    // Always release the connection — success or failure.
    await disconnectDB();
    process.exit(process.exitCode ?? 0);
  }
}

main();
