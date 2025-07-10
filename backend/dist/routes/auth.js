"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const supabase_1 = require("../utils/supabase");
const jwt_1 = require("../utils/jwt");
const email_1 = require("../utils/email");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Helper function to create initial au pair profile
async function createInitialAuPairProfile(userId) {
    const profileId = (0, uuid_1.v4)();
    const { error } = await supabase_1.supabase.from("au_pair_profiles").insert({
        id: profileId,
        userId,
        firstName: "",
        lastName: "",
        dateOfBirth: new Date("2000-01-01").toISOString(),
        currency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    if (error) {
        console.error("❌ Failed to create initial au pair profile:", error);
        throw error;
    }
}
// Helper function to create initial host family profile
async function createInitialHostFamilyProfile(userId) {
    const profileId = (0, uuid_1.v4)();
    const { error } = await supabase_1.supabase.from("host_family_profiles").insert({
        id: profileId,
        userId,
        familyName: "",
        contactPersonName: "",
        location: "",
        country: "",
        numberOfChildren: 0,
        currency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    if (error) {
        console.error("❌ Failed to create initial host family profile:", error);
        throw error;
    }
}
// Register
router.post("/register", async (req, res) => {
    try {
        const { email, password, role } = req.body;
        console.log(`📝 Registration attempt: { email: '${email}', role: '${role}', passwordLength: ${password?.length || 0} }`);
        // Validation
        if (!email || !password || !role) {
            console.log("❌ Missing required fields:", {
                email: !!email,
                password: !!password,
                role: !!role,
            });
            return res
                .status(400)
                .json({ message: "Email, password, and role are required" });
        }
        // Normalize role to uppercase
        const normalizedRole = role.toUpperCase();
        if (!["AU_PAIR", "HOST_FAMILY"].includes(normalizedRole)) {
            console.log("❌ Invalid role:", role);
            return res
                .status(400)
                .json({ message: "Invalid role. Must be AU_PAIR or HOST_FAMILY" });
        }
        if (password.length < 6) {
            console.log("❌ Password too short:", password.length);
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters long" });
        }
        // Check if user already exists
        const { data: existingUser, error: fetchError } = await supabase_1.supabase
            .from("users")
            .select("id, email")
            .eq("email", email.toLowerCase())
            .single();
        if (fetchError && fetchError.code !== "PGRST116") {
            console.error("❌ Database error checking for existing user:", fetchError);
            return res
                .status(500)
                .json({ message: "Error checking for existing user" });
        }
        if (existingUser) {
            console.log(`❌ User already exists with email: ${email}`);
            return res
                .status(400)
                .json({ message: "User with this email already exists" });
        }
        console.log(`✅ New user registration proceeding for: ${email}`);
        // Generate a unique ID
        const userId = (0, uuid_1.v4)();
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        // Generate email verification token
        const emailVerifyToken = crypto_1.default.randomBytes(32).toString("hex");
        // Prepare user data
        const userData = {
            id: userId,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: normalizedRole,
            isActive: true,
            isEmailVerified: false,
            emailVerifyToken,
            preferredlanguage: "en",
            profilecompleted: false,
            planType: "FREE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Insert user into database
        const { error: insertError } = await supabase_1.supabase
            .from("users")
            .insert(userData);
        if (insertError) {
            console.error("❌ Failed to insert user into database:", insertError);
            return res.status(500).json({ message: "Failed to create user account" });
        }
        // Verify the user was actually inserted
        const { data: verifyUser, error: verifyError } = await supabase_1.supabase
            .from("users")
            .select("id, email, role, isEmailVerified, createdAt")
            .eq("id", userId)
            .single();
        if (verifyError || !verifyUser) {
            console.error("❌ User verification failed after insert:", verifyError || "User not found");
            return res
                .status(500)
                .json({ message: "User creation verification failed" });
        }
        // Create initial profile based on role
        try {
            if (normalizedRole === "AU_PAIR") {
                await createInitialAuPairProfile(userId);
            }
            else if (normalizedRole === "HOST_FAMILY") {
                await createInitialHostFamilyProfile(userId);
            }
        }
        catch (profileError) {
            console.error("❌ Failed to create initial profile:", profileError);
            // Continue with registration even if profile creation fails
        }
        // Try to send verification email
        try {
            await (0, email_1.sendVerificationEmail)(verifyUser.email, emailVerifyToken);
            console.log(`✉️ Verification email sent to: ${email}`);
        }
        catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            // Continue with registration even if email fails
        }
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)(userId);
        const refreshToken = (0, jwt_1.generateRefreshToken)(userId);
        console.log(`✅ User registered successfully: ${userId} (${email})`);
        res.status(201).json({
            message: "User registered successfully. Please check your email for verification.",
            user: verifyUser,
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔐 Login attempt for email: ${email}`);
        if (!email || !password) {
            console.log("❌ Missing email or password");
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }
        // Find user in database
        const { data: user, error } = await supabase_1.supabase
            .from("users")
            .select(`
        *,
        auPairProfile:au_pair_profiles!inner(id, firstName, lastName, profilePhotoUrl),
        hostFamilyProfile:host_family_profiles!inner(id, familyName, contactPersonName, profilePhotoUrl)
      `)
            .eq("email", email.toLowerCase())
            .single();
        if (error || !user || !user.isActive) {
            console.log(`❌ User not found or inactive for email: ${email}`);
            return res
                .status(401)
                .json({ message: "Invalid credentials or account deactivated" });
        }
        console.log("✅ User found:", user.email);
        // Verify password
        const passwordMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!passwordMatch) {
            console.log(`❌ Password mismatch for email: ${email}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        console.log("✅ Password valid for user:", user.email);
        // Update last login time
        const { error: updateError } = await supabase_1.supabase
            .from("users")
            .update({
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
            .eq("id", user.id);
        if (updateError) {
            console.error(`❌ Failed to update last login for user ${user.id}:`, updateError);
            // Continue login process even if update fails
        }
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)(user.id);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        console.log(`✅ Successful login for user: ${user.id} (${email})`);
        // Return user data and token (excluding sensitive fields)
        const { password: _, emailVerifyToken, resetPasswordToken, resetPasswordExpires, ...userWithoutSensitiveData } = user;
        res.status(200).json({
            message: "Login successful",
            user: userWithoutSensitiveData,
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Refresh token
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token is required" });
        }
        const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
        const { data: user, error } = await supabase_1.supabase
            .from("users")
            .select("id, isActive")
            .eq("id", decoded.userId)
            .single();
        if (error || !user || !user.isActive) {
            return res
                .status(401)
                .json({ message: "Invalid refresh token or user deactivated" });
        }
        const newAccessToken = (0, jwt_1.generateAccessToken)(user.id);
        const newRefreshToken = (0, jwt_1.generateRefreshToken)(user.id);
        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    }
    catch (error) {
        res.status(401).json({ message: "Invalid refresh token" });
    }
});
// Verify email
router.post("/verify-email", async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res
                .status(400)
                .json({ message: "Verification token is required" });
        }
        // Find user with this verification token
        const { data: user, error } = await supabase_1.supabase
            .from("users")
            .select("id, email, isEmailVerified")
            .eq("emailVerifyToken", token)
            .single();
        if (error || !user) {
            console.log("❌ Invalid or expired verification token");
            return res
                .status(400)
                .json({ message: "Invalid or expired verification token" });
        }
        if (user.isEmailVerified) {
            return res.status(200).json({ message: "Email already verified" });
        }
        // Update user to verified status
        const { error: updateError } = await supabase_1.supabase
            .from("users")
            .update({
            isEmailVerified: true,
            emailVerifyToken: null,
            updatedAt: new Date().toISOString(),
        })
            .eq("id", user.id);
        if (updateError) {
            console.error("❌ Failed to verify email:", updateError);
            return res.status(500).json({ message: "Failed to verify email" });
        }
        console.log(`✅ Email verified for user: ${user.id} (${user.email})`);
        res.status(200).json({ message: "Email verified successfully" });
    }
    catch (error) {
        console.error("❌ Email verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Request password reset
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        const { data: user, error } = await supabase_1.supabase
            .from("users")
            .select("id, email")
            .eq("email", email.toLowerCase())
            .single();
        if (error || !user) {
            // Don't reveal if email exists or not
            return res.json({
                message: "If the email exists, a password reset link has been sent",
            });
        }
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        const { error: updateError } = await supabase_1.supabase
            .from("users")
            .update({
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetExpires,
            updatedAt: new Date().toISOString(),
        })
            .eq("id", user.id);
        if (updateError) {
            console.error("Failed to update password reset token:", updateError);
            return res.status(500).json({ message: "Internal server error" });
        }
        try {
            const emailResult = await (0, email_1.sendPasswordResetEmail)(user.email, resetToken);
            console.log("📧 Password reset email sent. Preview URL:", emailResult.previewUrl);
        }
        catch (emailError) {
            console.error("Failed to send password reset email:", emailError);
        }
        res.json({
            message: "If the email exists, a password reset link has been sent",
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Reset password
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res
                .status(400)
                .json({ message: "Token and password are required" });
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters long" });
        }
        const { data: user, error } = await supabase_1.supabase
            .from("users")
            .select("id, email, resetPasswordExpires")
            .eq("resetPasswordToken", token)
            .single();
        if (error || !user) {
            return res
                .status(400)
                .json({ message: "Invalid or expired reset token" });
        }
        // Check if token is expired
        if (new Date(user.resetPasswordExpires) <= new Date()) {
            return res
                .status(400)
                .json({ message: "Invalid or expired reset token" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const { error: updateError } = await supabase_1.supabase
            .from("users")
            .update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
            updatedAt: new Date().toISOString(),
        })
            .eq("id", user.id);
        if (updateError) {
            console.error("Failed to reset password:", updateError);
            return res.status(500).json({ message: "Failed to reset password" });
        }
        res.json({ message: "Password reset successfully" });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get current user
router.get("/me", auth_1.authenticate, async (req, res) => {
    try {
        const { data: user, error } = await supabase_1.supabase
            .from("users")
            .select(`
        id, email, role, isActive, isEmailVerified, lastLogin, createdAt,
        auPairProfile:au_pair_profiles!inner(id, firstName, lastName, profilePhotoUrl, bio),
        hostFamilyProfile:host_family_profiles!inner(id, familyName, contactPersonName, profilePhotoUrl, bio)
      `)
            .eq("id", req.user.id)
            .single();
        if (error || !user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user });
    }
    catch (error) {
        console.error("Get current user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map