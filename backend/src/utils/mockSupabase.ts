// Mock Supabase client for demo/testing when real credentials aren't available
import { v4 as uuidv4 } from "uuid";

// In-memory database for demo
const mockDatabase = {
  users: [] as any[],
  au_pair_profiles: [] as any[],
  host_family_profiles: [] as any[],
  matches: [] as any[],
  messages: [] as any[],
  documents: [] as any[],
  bookings: [] as any[],
  availability: [] as any[],
};

// Mock query builder
class MockQueryBuilder {
  private tableName: string;
  private selectFields = "*";
  private whereConditions: any[] = [];
  private orderField?: string;
  private orderDirection = "asc";
  private limitValue?: number;
  private rangeStart?: number;
  private rangeEnd?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string) {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any) {
    this.whereConditions.push({ field, operator: "eq", value });
    return this;
  }

  neq(field: string, value: any) {
    this.whereConditions.push({ field, operator: "neq", value });
    return this;
  }

  gt(field: string, value: any) {
    this.whereConditions.push({ field, operator: "gt", value });
    return this;
  }

  gte(field: string, value: any) {
    this.whereConditions.push({ field, operator: "gte", value });
    return this;
  }

  lt(field: string, value: any) {
    this.whereConditions.push({ field, operator: "lt", value });
    return this;
  }

  lte(field: string, value: any) {
    this.whereConditions.push({ field, operator: "lte", value });
    return this;
  }

  ilike(field: string, value: any) {
    this.whereConditions.push({ field, operator: "ilike", value });
    return this;
  }

  or(condition: string) {
    // Simple OR handling for demo
    return this;
  }

  in(field: string, values: any[]) {
    this.whereConditions.push({ field, operator: "in", value: values });
    return this;
  }

  order(field: string, options?: { ascending: boolean }) {
    this.orderField = field;
    this.orderDirection = options?.ascending ? "asc" : "desc";
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  range(start: number, end: number) {
    this.rangeStart = start;
    this.rangeEnd = end;
    return this;
  }

  single() {
    return this.execute(true);
  }

  private matchesConditions(item: any): boolean {
    return this.whereConditions.every((condition) => {
      const fieldValue = item[condition.field];

      switch (condition.operator) {
        case "eq":
          return fieldValue === condition.value;
        case "neq":
          return fieldValue !== condition.value;
        case "gt":
          return fieldValue > condition.value;
        case "gte":
          return fieldValue >= condition.value;
        case "lt":
          return fieldValue < condition.value;
        case "lte":
          return fieldValue <= condition.value;
        case "ilike":
          return (
            fieldValue &&
            fieldValue
              .toLowerCase()
              .includes(condition.value.toLowerCase().replace("%", ""))
          );
        case "in":
          return condition.value.includes(fieldValue);
        default:
          return true;
      }
    });
  }

  private execute(
    single = false,
  ): Promise<{ data: any; error: any; count?: number }> {
    return new Promise((resolve) => {
      try {
        const table = (mockDatabase as any)[this.tableName] || [];
        let results = table.filter((item: any) => this.matchesConditions(item));

        // Apply ordering
        if (this.orderField) {
          results.sort((a: any, b: any) => {
            const aVal = a[this.orderField!];
            const bVal = b[this.orderField!];

            if (this.orderDirection === "asc") {
              return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
              return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
          });
        }

        // Apply range/limit
        if (this.rangeStart !== undefined && this.rangeEnd !== undefined) {
          results = results.slice(this.rangeStart, this.rangeEnd + 1);
        } else if (this.limitValue) {
          results = results.slice(0, this.limitValue);
        }

        if (single) {
          resolve({
            data: results.length > 0 ? results[0] : null,
            error:
              results.length === 0
                ? { code: "PGRST116", message: "No rows found" }
                : null,
          });
        } else {
          resolve({
            data: results,
            error: null,
            count: results.length,
          });
        }
      } catch (error) {
        resolve({
          data: null,
          error: { message: (error as Error).message },
        });
      }
    });
  }

  // For insert/update/delete operations
  insert(data: any) {
    return {
      select: () => ({
        single: () => this.executeInsert(data),
      }),
    };
  }

  update(data: any) {
    return {
      eq: (field: string, value: any) => {
        this.whereConditions.push({ field, operator: "eq", value });
        return {
          select: () => ({
            single: () => this.executeUpdate(data),
          }),
        };
      },
    };
  }

  private executeInsert(data: any): Promise<{ data: any; error: any }> {
    return new Promise((resolve) => {
      try {
        const table = (mockDatabase as any)[this.tableName] || [];
        const newItem = {
          id: data.id || uuidv4(),
          ...data,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };

        table.push(newItem);
        (mockDatabase as any)[this.tableName] = table;

        resolve({ data: newItem, error: null });
      } catch (error) {
        resolve({ data: null, error: { message: (error as Error).message } });
      }
    });
  }

  private executeUpdate(data: any): Promise<{ data: any; error: any }> {
    return new Promise((resolve) => {
      try {
        const table = (mockDatabase as any)[this.tableName] || [];
        const index = table.findIndex((item: any) =>
          this.matchesConditions(item),
        );

        if (index !== -1) {
          table[index] = {
            ...table[index],
            ...data,
            updatedAt: new Date().toISOString(),
          };
          resolve({ data: table[index], error: null });
        } else {
          resolve({
            data: null,
            error: { message: "No matching record found" },
          });
        }
      } catch (error) {
        resolve({ data: null, error: { message: (error as Error).message } });
      }
    });
  }
}

// Mock Supabase client
export const mockSupabase = {
  from: (tableName: string) => new MockQueryBuilder(tableName),
};

// Seed some demo data
const seedDemoData = () => {
  // Create demo au pair
  const auPairId = uuidv4();
  mockDatabase.users.push({
    id: auPairId,
    email: "sarah@demo.com",
    password: "$2b$12$hashedpassword",
    role: "AU_PAIR",
    isActive: true,
    isEmailVerified: true,
    profilecompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockDatabase.au_pair_profiles.push({
    id: uuidv4(),
    userId: auPairId,
    firstName: "Sarah",
    lastName: "Johnson",
    dateOfBirth: "1998-05-15T00:00:00.000Z",
    bio: "Experienced au pair with 3 years of childcare experience. I love working with children and helping families.",
    languages: "English, Spanish, French",
    skills: "Childcare, Cooking, Homework Help, Swimming",
    experience: "3 years of professional childcare experience",
    education: "Bachelor in Early Childhood Education",
    preferredCountries: "Germany, Netherlands, France",
    hourlyRate: 15.5,
    currency: "EUR",
    profilePhotoUrl:
      "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=300",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create demo host family
  const hostFamilyId = uuidv4();
  mockDatabase.users.push({
    id: hostFamilyId,
    email: "mueller@demo.com",
    password: "$2b$12$hashedpassword",
    role: "HOST_FAMILY",
    isActive: true,
    isEmailVerified: true,
    profilecompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  mockDatabase.host_family_profiles.push({
    id: uuidv4(),
    userId: hostFamilyId,
    familyName: "Mueller Family",
    contactPersonName: "Anna Mueller",
    bio: "We are a friendly family looking for an au pair to help with our two children.",
    location: "Berlin",
    country: "Germany",
    numberOfChildren: 2,
    childrenAges: "5, 8",
    requirements:
      "Experience with children, swimming supervision, homework help",
    preferredLanguages: "English, Spanish",
    maxBudget: 18.0,
    currency: "EUR",
    profilePhotoUrl:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create a demo match
  mockDatabase.matches.push({
    id: uuidv4(),
    hostId: hostFamilyId,
    auPairId: auPairId,
    matchScore: 85,
    status: "PENDING",
    initiatedBy: "HOST_FAMILY",
    notes: "Great match based on location and language preferences",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Create demo messages
  mockDatabase.messages.push({
    id: uuidv4(),
    senderId: hostFamilyId,
    receiverId: auPairId,
    content:
      "Hi Sarah! We saw your profile and think you would be a great fit for our family.",
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log("📊 Demo data seeded successfully");
};

// Initialize demo data
seedDemoData();

export { mockDatabase };
