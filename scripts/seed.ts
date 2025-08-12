/*
  Seed script to create:
  - 1 Admin, 1 Principal
  - 2 CTPOs per [Year x Branch] (4 years x 5 branches x 2 = 40)
  - 1 HTPO per Branch (5)
*/

const baseURL = process.env.API_URL || 'http://localhost:4000';

type Year = 'Y1' | 'Y2' | 'Y3' | 'Y4';
type Branch = 'CSM' | 'CAI' | 'CSD' | 'AID' | 'CSC';

const years: Year[] = ['Y1', 'Y2', 'Y3', 'Y4'];
const branches: Branch[] = ['CSM', 'CAI', 'CSD', 'AID', 'CSC'];

const admin = { email: 'admin@college.edu', name: 'Admin', role: 'ADMIN', password: 'Admin@123' };
const principal = { email: 'principal@college.edu', name: 'Principal', role: 'PRINCIPAL', password: 'Principal@123' };

async function post(path: string, body: unknown, headers?: Record<string, string>) {
  const res = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} -> ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}

async function patch(path: string, body: unknown, token: string) {
  const res = await fetch(`${baseURL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

async function login(email: string, password: string): Promise<string> {
  const res = await post('/api/auth/login', { email, password });
  return (res as any).token as string;
}

async function bootstrap(email: string, name: string, role: string, password: string) {
  try {
    await post('/api/auth/bootstrap-admin', { email, name, role, password });
    console.log('Created', role, email);
  } catch (e: any) {
    if (String(e.message).includes('409')) {
      console.log('Exists', role, email);
      return;
    }
    throw e;
  }
}

async function main() {
  // Create admin + principal
  await bootstrap(admin.email, admin.name, admin.role, admin.password);
  await bootstrap(principal.email, principal.name, principal.role, principal.password);

  // Admin token
  const adminToken = await login(admin.email, admin.password);

  // Create HTPO per branch
  for (const branch of branches) {
    const email = `htpo-${branch.toLowerCase()}@college.edu`;
    const name = `HTPO ${branch}`;
    await bootstrap(email, name, 'HTPO', 'Htpo@123');
  }

  // Create CTPOs: 2 per (year, branch)
  for (const year of years) {
    for (const branch of branches) {
      for (let i = 1; i <= 2; i++) {
        const email = `ctpo-${year.toLowerCase()}-${branch.toLowerCase()}-${i}@college.edu`;
        const name = `CTPO ${year} ${branch} #${i}`;
        await bootstrap(email, name, 'CTPO', 'Ctpo@123');
      }
    }
  }

  // Fetch all users to locate their IDs
  const usersRes = await fetch(`${baseURL}/api/admin/users`, { headers: { Authorization: `Bearer ${adminToken}` } });
  if (!usersRes.ok) throw new Error('Cannot list users');
  const users = (await usersRes.json()) as any[];

  // Assign HTPO branches
  for (const branch of branches) {
    const email = `htpo-${branch.toLowerCase()}@college.edu`;
    const u = users.find((x) => x.email === email);
    if (!u) continue;
    try {
      await patch(`/api/admin/users/${u.id}`, { role: 'HTPO', branch }, adminToken);
      console.log('Assigned HTPO', email, branch);
    } catch (e: any) {
      console.log('Assign HTPO failed', email, e.message);
    }
  }

  // Assign CTPO year/branch with constraint 2 per pair
  for (const year of years) {
    for (const branch of branches) {
      const matches = users.filter((x) => x.email.includes(`ctpo-${year.toLowerCase()}-${branch.toLowerCase()}-`));
      for (const u of matches) {
        try {
          await patch(`/api/admin/users/${u.id}`, { role: 'CTPO', year, branch }, adminToken);
          console.log('Assigned CTPO', u.email, year, branch);
        } catch (e: any) {
          console.log('Assign CTPO failed', u.email, e.message);
        }
      }
    }
  }

  console.log('Seeding complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


