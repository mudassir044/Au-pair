"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDatabase = exports.mockSupabase = void 0;
// Mock Supabase client for demo/testing when real credentials aren't available
const uuid_1 = require("uuid");
// In-memory database for demo
const mockDatabase = {
    users: [],
    au_pair_profiles: [],
    host_family_profiles: [],
    matches: [],
    messages: [],
    documents: [],
    bookings: [],
    availability: [],
};
exports.mockDatabase = mockDatabase;
// Mock query builder
class MockQueryBuilder {
    constructor(tableName) {
        this.selectFields = "*";
        this.whereConditions = [];
        this.orderDirection = "asc";
        this.tableName = tableName;
    }
    select(fields) {
        this.selectFields = fields;
        return this;
    }
    eq(field, value) {
        this.whereConditions.push({ field, operator: "eq", value });
        return this;
    }
    neq(field, value) {
        this.whereConditions.push({ field, operator: "neq", value });
        return this;
    }
    gt(field, value) {
        this.whereConditions.push({ field, operator: "gt", value });
        return this;
    }
    gte(field, value) {
        this.whereConditions.push({ field, operator: "gte", value });
        return this;
    }
    lt(field, value) {
        this.whereConditions.push({ field, operator: "lt", value });
        return this;
    }
    lte(field, value) {
        this.whereConditions.push({ field, operator: "lte", value });
        return this;
    }
    ilike(field, value) {
        this.whereConditions.push({ field, operator: "ilike", value });
        return this;
    }
    or(condition) {
        // Simple OR handling for demo
        return this;
    }
    in(field, values) {
        this.whereConditions.push({ field, operator: "in", value: values });
        return this;
    }
    order(field, options) {
        this.orderField = field;
        this.orderDirection = options?.ascending ? "asc" : "desc";
        return this;
    }
    limit(count) {
        this.limitValue = count;
        return this;
    }
    range(start, end) {
        this.rangeStart = start;
        this.rangeEnd = end;
        return this;
    }
    single() {
        return this.execute(true);
    }
    matchesConditions(item) {
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
                    return (fieldValue &&
                        fieldValue
                            .toLowerCase()
                            .includes(condition.value.toLowerCase().replace("%", "")));
                case "in":
                    return condition.value.includes(fieldValue);
                default:
                    return true;
            }
        });
    }
    execute(single = false) {
        return new Promise((resolve) => {
            try {
                const table = mockDatabase[this.tableName] || [];
                let results = table.filter((item) => this.matchesConditions(item));
                // Apply ordering
                if (this.orderField) {
                    results.sort((a, b) => {
                        const aVal = a[this.orderField];
                        const bVal = b[this.orderField];
                        if (this.orderDirection === "asc") {
                            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                        }
                        else {
                            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                        }
                    });
                }
                // Apply range/limit
                if (this.rangeStart !== undefined && this.rangeEnd !== undefined) {
                    results = results.slice(this.rangeStart, this.rangeEnd + 1);
                }
                else if (this.limitValue) {
                    results = results.slice(0, this.limitValue);
                }
                if (single) {
                    resolve({
                        data: results.length > 0 ? results[0] : null,
                        error: results.length === 0
                            ? { code: "PGRST116", message: "No rows found" }
                            : null,
                    });
                }
                else {
                    resolve({
                        data: results,
                        error: null,
                        count: results.length,
                    });
                }
            }
            catch (error) {
                resolve({
                    data: null,
                    error: { message: error.message },
                });
            }
        });
    }
    // For insert/update/delete operations
    insert(data) {
        return {
            select: () => ({
                single: () => this.executeInsert(data),
            }),
        };
    }
    update(data) {
        return {
            eq: (field, value) => {
                this.whereConditions.push({ field, operator: "eq", value });
                return {
                    select: () => ({
                        single: () => this.executeUpdate(data),
                    }),
                };
            },
        };
    }
    executeInsert(data) {
        return new Promise((resolve) => {
            try {
                const table = mockDatabase[this.tableName] || [];
                const newItem = {
                    id: data.id || (0, uuid_1.v4)(),
                    ...data,
                    createdAt: data.createdAt || new Date().toISOString(),
                    updatedAt: data.updatedAt || new Date().toISOString(),
                };
                table.push(newItem);
                mockDatabase[this.tableName] = table;
                resolve({ data: newItem, error: null });
            }
            catch (error) {
                resolve({ data: null, error: { message: error.message } });
            }
        });
    }
    executeUpdate(data) {
        return new Promise((resolve) => {
            try {
                const table = mockDatabase[this.tableName] || [];
                const index = table.findIndex((item) => this.matchesConditions(item));
                if (index !== -1) {
                    table[index] = {
                        ...table[index],
                        ...data,
                        updatedAt: new Date().toISOString(),
                    };
                    resolve({ data: table[index], error: null });
                }
                else {
                    resolve({
                        data: null,
                        error: { message: "No matching record found" },
                    });
                }
            }
            catch (error) {
                resolve({ data: null, error: { message: error.message } });
            }
        });
    }
}
// Mock Supabase client
exports.mockSupabase = {
    from: (tableName) => new MockQueryBuilder(tableName),
};
// Seed some demo data
const seedDemoData = () => {
    // Create demo au pair
    const auPairId = (0, uuid_1.v4)();
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
        id: (0, uuid_1.v4)(),
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
        profilePhotoUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=300",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    // Create demo host family
    const hostFamilyId = (0, uuid_1.v4)();
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
        id: (0, uuid_1.v4)(),
        userId: hostFamilyId,
        familyName: "Mueller Family",
        contactPersonName: "Anna Mueller",
        bio: "We are a friendly family looking for an au pair to help with our two children.",
        location: "Berlin",
        country: "Germany",
        numberOfChildren: 2,
        childrenAges: "5, 8",
        requirements: "Experience with children, swimming supervision, homework help",
        preferredLanguages: "English, Spanish",
        maxBudget: 18.0,
        currency: "EUR",
        profilePhotoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    // Create a demo match
    mockDatabase.matches.push({
        id: (0, uuid_1.v4)(),
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
        id: (0, uuid_1.v4)(),
        senderId: hostFamilyId,
        receiverId: auPairId,
        content: "Hi Sarah! We saw your profile and think you would be a great fit for our family.",
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    console.log("📊 Demo data seeded successfully");
};
// Initialize demo data
seedDemoData();
//# sourceMappingURL=mockSupabase.js.map