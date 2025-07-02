export declare const sendVerificationEmail: (email: string, token: string) => Promise<{
    messageId: string;
    previewUrl: string | false;
}>;
export declare const sendPasswordResetEmail: (email: string, token: string) => Promise<{
    messageId: string;
    previewUrl: string | false;
}>;
//# sourceMappingURL=email.d.ts.map