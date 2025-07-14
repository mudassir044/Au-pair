declare const mockDatabase: {
    users: any[];
    au_pair_profiles: any[];
    host_family_profiles: any[];
    matches: any[];
    messages: any[];
    documents: any[];
    bookings: any[];
    availability: any[];
};
declare class MockQueryBuilder {
    private tableName;
    private selectFields;
    private whereConditions;
    private orderField?;
    private orderDirection;
    private limitValue?;
    private rangeStart?;
    private rangeEnd?;
    constructor(tableName: string);
    select(fields: string): this;
    eq(field: string, value: any): this;
    neq(field: string, value: any): this;
    gt(field: string, value: any): this;
    gte(field: string, value: any): this;
    lt(field: string, value: any): this;
    lte(field: string, value: any): this;
    ilike(field: string, value: any): this;
    or(condition: string): this;
    in(field: string, values: any[]): this;
    order(field: string, options?: {
        ascending: boolean;
    }): this;
    limit(count: number): this;
    range(start: number, end: number): this;
    single(): Promise<{
        data: any;
        error: any;
        count?: number;
    }>;
    private matchesConditions;
    private execute;
    insert(data: any): {
        select: () => {
            single: () => Promise<{
                data: any;
                error: any;
            }>;
        };
    };
    update(data: any): {
        eq: (field: string, value: any) => {
            select: () => {
                single: () => Promise<{
                    data: any;
                    error: any;
                }>;
            };
        };
    };
    private executeInsert;
    private executeUpdate;
}
export declare const mockSupabase: {
    from: (tableName: string) => MockQueryBuilder;
};
export { mockDatabase };
//# sourceMappingURL=mockSupabase.d.ts.map