export declare function verifyEmailConnection(): Promise<boolean>;
export declare const sendVerificationEmail: (email: string, token: string) => Promise<{
    messageId: any;
    previewUrl: string | false;
}>;
export declare const sendPasswordResetEmail: (email: string, token: string) => Promise<{
    messageId: any;
    previewUrl: string | false;
}>;
//# sourceMappingURL=email.d.ts.map