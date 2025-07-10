import express from "express";
import { v4 as uuidv4 } from "uuid";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";

const router = express.Router();

// Demo users data
const demoUsers = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    email: "sarah@demo.com",
    password: "$2b$12$hashedpassword", // This would be "password123" hashed
    role: "AU_PAIR",
    isActive: true,
    isEmailVerified: true,
    profilecompleted: true,
    profile: {
      firstName: "Sarah",
      lastName: "Johnson",
      bio: "Experienced au pair with 3 years of childcare experience.",
      profilePhotoUrl:
        "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=300",
    },
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    email: "mueller@demo.com",
    password: "$2b$12$hashedpassword",
    role: "HOST_FAMILY",
    isActive: true,
    isEmailVerified: true,
    profilecompleted: true,
    profile: {
      familyName: "Mueller Family",
      contactPersonName: "Anna Mueller",
      bio: "We are a friendly family looking for an au pair.",
      profilePhotoUrl:
        "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300",
    },
  },
];

// Demo login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Demo login attempt for: ${email}`);

    // Find demo user
    const user = demoUsers.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // For demo, accept "password123" or any password
    if (password !== "password123" && password !== "demo") {
      return res
        .status(401)
        .json({ message: 'Invalid credentials. Try "password123" or "demo"' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    console.log(`✅ Demo login successful for: ${email}`);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profilecompleted: user.profilecompleted,
        profile: user.profile,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("❌ Demo login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Demo registration
router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    console.log(`📝 Demo registration for: ${email} as ${role}`);

    // Check if demo user already exists
    const existingUser = demoUsers.find((u) => u.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists in demo" });
    }

    // Create new demo user
    const newUser: any = {
      id: uuidv4(),
      email,
      password: "$2b$12$hashedpassword",
      role: role.toUpperCase(),
      isActive: true,
      isEmailVerified: true,
      profilecompleted: false,
      profile:
        role.toUpperCase() === "AU_PAIR"
          ? {
              firstName: "",
              lastName: "",
              bio: "",
              profilePhotoUrl: null,
            }
          : {
              familyName: "",
              contactPersonName: "",
              bio: "",
              profilePhotoUrl: null,
            },
    };

    demoUsers.push(newUser);

    // Generate tokens
    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);

    console.log(`✅ Demo registration successful for: ${email}`);

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        isEmailVerified: newUser.isEmailVerified,
        profilecompleted: newUser.profilecompleted,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("❌ Demo registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Demo user search
router.get("/users/search", async (req, res) => {
  try {
    const { role } = req.query;

    let users = demoUsers.filter((u) => u.role !== role); // Opposite role

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: {
        ...user.profile,
        name:
          user.role === "AU_PAIR"
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user.profile.familyName,
      },
    }));

    res.json({
      users: formattedUsers,
      total: formattedUsers.length,
      message: "Demo users loaded",
    });
  } catch (error) {
    console.error("❌ Demo search error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Demo stats
router.get("/stats", async (req, res) => {
  try {
    res.json({
      totalUsers: demoUsers.length,
      auPairs: demoUsers.filter((u) => u.role === "AU_PAIR").length,
      hostFamilies: demoUsers.filter((u) => u.role === "HOST_FAMILY").length,
      matches: 1,
      messages: 3,
      mode: "demo",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
