import express from "express";
import { prisma } from "../index";
import { AuthRequest } from "../middleware/auth";
import { authenticate } from "../middleware/auth";
import { checkPlanLimits } from "../middleware/planLimits";

const router = express.Router();

// Create or update Au Pair profile
router.post("/au-pair", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      firstName,
      lastName,
      dateOfBirth,
      bio,
      languages,
      skills,
      experience,
      education,
      videoUrl,
      preferredCountries,
      hourlyRate,
      currency,
      availableFrom,
      availableTo,
      profilePhotoUrl,
    } = req.body;

    // Validation
    if (!firstName || !lastName || !dateOfBirth) {
      return res
        .status(400)
        .json({
          message: "First name, last name, and date of birth are required",
        });
    }

    // Check if user is an au pair
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "AU_PAIR") {
      return res
        .status(403)
        .json({ message: "Only au pairs can create au pair profiles" });
    }

    // Create or update profile
    const profile = await prisma.auPairProfile.upsert({
      where: { userId },
      create: {
        userId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        bio,
        languages: JSON.stringify(languages || []),
        skills: JSON.stringify(skills || []),
        experience,
        education,
        videoUrl,
        preferredCountries: JSON.stringify(preferredCountries || []),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        currency: currency || "USD",
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        profilePhotoUrl,
      },
      update: {
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        bio,
        languages: JSON.stringify(languages || []),
        skills: JSON.stringify(skills || []),
        experience,
        education,
        videoUrl,
        preferredCountries: JSON.stringify(preferredCountries || []),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        currency: currency || "USD",
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableTo: availableTo ? new Date(availableTo) : null,
        profilePhotoUrl,
      },
    });

    res.json({ message: "Au pair profile saved successfully", profile });
  } catch (error) {
    console.error("Au pair profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Create or update Host Family profile
router.post("/host-family", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      familyName,
      contactPersonName,
      bio,
      location,
      country,
      numberOfChildren,
      childrenAges,
      requirements,
      preferredLanguages,
      maxBudget,
      currency,
      profilePhotoUrl,
    } = req.body;

    // Validation
    if (
      !familyName ||
      !contactPersonName ||
      !location ||
      !country ||
      !numberOfChildren
    ) {
      return res.status(400).json({
        message:
          "Family name, contact person, location, country, and number of children are required",
      });
    }

    // Check if user is a host family
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "HOST_FAMILY") {
      return res
        .status(403)
        .json({
          message: "Only host families can create host family profiles",
        });
    }

    // Create or update profile
    const profile = await prisma.hostFamilyProfile.upsert({
      where: { userId },
      create: {
        userId,
        familyName,
        contactPersonName,
        bio,
        location,
        country,
        numberOfChildren: parseInt(numberOfChildren),
        childrenAges: JSON.stringify(childrenAges || []),
        requirements,
        preferredLanguages: JSON.stringify(preferredLanguages || []),
        maxBudget: maxBudget ? parseFloat(maxBudget) : null,
        currency: currency || "USD",
        profilePhotoUrl,
      },
      update: {
        familyName,
        contactPersonName,
        bio,
        location,
        country,
        numberOfChildren: parseInt(numberOfChildren),
        childrenAges: JSON.stringify(childrenAges || []),
        requirements,
        preferredLanguages: JSON.stringify(preferredLanguages || []),
        maxBudget: maxBudget ? parseFloat(maxBudget) : null,
        currency: currency || "USD",
        profilePhotoUrl,
      },
    });

    res.json({ message: "Host family profile saved successfully", profile });
  } catch (error) {
    console.error("Host family profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get current user's profile
router.get("/me", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let profile = null;

    if (userRole === "AU_PAIR") {
      profile = await prisma.auPairProfile.findUnique({
        where: { userId },
      });
    } else if (userRole === "HOST_FAMILY") {
      profile = await prisma.hostFamilyProfile.findUnique({
        where: { userId },
      });
    }

    res.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get profile by user ID
router.get(
  "/:userId",
  authenticate,
  checkPlanLimits({ action: "profileView" }),
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return res.status(404).json({ message: "User not found or inactive" });
      }

      let profile = null;

      if (user.role === "AU_PAIR") {
        profile = await prisma.auPairProfile.findUnique({
          where: { userId },
        });
      } else if (user.role === "HOST_FAMILY") {
        profile = await prisma.hostFamilyProfile.findUnique({
          where: { userId },
        });
      }

      res.json({ profile, userRole: user.role });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

// Delete current user's profile
router.delete("/me", async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole === "AU_PAIR") {
      await prisma.auPairProfile.deleteMany({
        where: { userId },
      });
    } else if (userRole === "HOST_FAMILY") {
      await prisma.hostFamilyProfile.deleteMany({
        where: { userId },
      });
    }

    res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error("Delete profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get profile completion status
router.get("/completion", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        auPairProfile: true,
        hostFamilyProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    let profileType = "";
    let completionPercentage = 0;
    let missingFields: string[] = [];

    if (user.auPairProfile) {
      profileType = "au_pair";
      const profile = user.auPairProfile;
      const requiredFields = [
        { field: "firstName", value: profile.firstName },
        { field: "lastName", value: profile.lastName },
        { field: "bio", value: profile.bio },
        { field: "dateOfBirth", value: profile.dateOfBirth },
        { field: "profilePhotoUrl", value: profile.profilePhotoUrl },
        { field: "languages", value: profile.languages?.length > 0 },
        { field: "skills", value: profile.skills?.length > 0 },
        { field: "experience", value: profile.experience },
        { field: "education", value: profile.education },
      ];

      const completedFields = requiredFields.filter((f) => f.value).length;
      completionPercentage = Math.round(
        (completedFields / requiredFields.length) * 100,
      );
      missingFields = requiredFields
        .filter((f) => !f.value)
        .map((f) => f.field);
    } else if (user.hostFamilyProfile) {
      profileType = "host_family";
      const profile = user.hostFamilyProfile;
      const requiredFields = [
        { field: "familyName", value: profile.familyName },
        { field: "contactPersonName", value: profile.contactPersonName },
        { field: "bio", value: profile.bio },
        { field: "location", value: profile.location },
        { field: "profilePhotoUrl", value: profile.profilePhotoUrl },
        { field: "childrenAges", value: profile.childrenAges?.length > 0 },
        { field: "requirements", value: profile.requirements },
        {
          field: "preferredLanguages",
          value: profile.preferredLanguages?.length > 0,
        },
      ];

      const completedFields = requiredFields.filter((f) => f.value).length;
      completionPercentage = Math.round(
        (completedFields / requiredFields.length) * 100,
      );
      missingFields = requiredFields
        .filter((f) => !f.value)
        .map((f) => f.field);
    } else {
      // No profile created yet
      profileType = user.role === "AU_PAIR" ? "au_pair" : "host_family";
      completionPercentage = 0;
      missingFields =
        user.role === "AU_PAIR"
          ? [
              "firstName",
              "lastName",
              "bio",
              "dateOfBirth",
              "profilePhotoUrl",
              "languages",
              "skills",
              "experience",
              "education",
            ]
          : [
              "familyName",
              "contactPersonName",
              "bio",
              "location",
              "profilePhotoUrl",
              "childrenAges",
              "requirements",
              "preferredLanguages",
            ];
    }

    res.json({
      status: "success",
      data: {
        completion_percentage: completionPercentage,
        missing_fields: missingFields,
        profile_type: profileType,
      },
    });
  } catch (error) {
    console.error("Error fetching profile completion:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch profile completion",
    });
  }
});

export default router;
