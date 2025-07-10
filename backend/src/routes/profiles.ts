import express from "express";
import { supabase } from "../utils/supabase";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Get profile completion status
router.get("/completion", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get user data
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role, profilecompleted")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error(`❌ Error fetching user ${userId}:`, userError);
      return res.status(500).json({ message: "Error fetching user data" });
    }

    // If profile is already marked as complete, return that
    if (user.profilecompleted) {
      return res.status(200).json({
        completed: true,
        percentage: 100,
        missingFields: [],
      });
    }

    // Check profile completion based on role
    let profileData: any,
      profileError: any,
      requiredFields: string[],
      missingFields: string[] = [];
    let completedFields = 0;

    if (user.role === "AU_PAIR") {
      // Get au pair profile
      const { data, error } = await supabase
        .from("au_pair_profiles")
        .select("*")
        .eq("userId", userId)
        .single();

      profileData = data;
      profileError = error;

      // Define required fields for au pair
      requiredFields = [
        "firstName",
        "lastName",
        "dateOfBirth",
        "bio",
        "languages",
        "skills",
        "experience",
        "education",
        "preferredCountries",
        "hourlyRate",
        "availableFrom",
        "availableTo",
        "profilePhotoUrl",
      ];
    } else if (user.role === "HOST_FAMILY") {
      // Get host family profile
      const { data, error } = await supabase
        .from("host_family_profiles")
        .select("*")
        .eq("userId", userId)
        .single();

      profileData = data;
      profileError = error;

      // Define required fields for host family
      requiredFields = [
        "familyName",
        "contactPersonName",
        "bio",
        "location",
        "country",
        "numberOfChildren",
        "childrenAges",
        "requirements",
        "preferredLanguages",
        "maxBudget",
        "profilePhotoUrl",
      ];
    } else {
      return res.status(400).json({ message: "Invalid user role" });
    }

    if (profileError || !profileData) {
      console.error(
        `❌ Error fetching profile for user ${userId}:`,
        profileError,
      );
      return res.status(500).json({ message: "Error fetching profile data" });
    }

    // Check which fields are completed
    for (const field of requiredFields) {
      if (
        profileData[field] &&
        (typeof profileData[field] !== "string" ||
          profileData[field].trim() !== "")
      ) {
        completedFields++;
      } else {
        missingFields.push(field);
      }
    }

    // Calculate completion percentage
    const percentage = Math.round(
      (completedFields / requiredFields.length) * 100,
    );
    const completed = percentage === 100;

    // If profile is now complete, update the user record
    if (completed && !user.profilecompleted) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          profilecompleted: true,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error(
          `❌ Error updating profile completion status for user ${userId}:`,
          updateError,
        );
      }
    }

    return res.status(200).json({
      completed,
      percentage,
      missingFields,
    });
  } catch (error) {
    console.error("❌ Profile completion error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while checking profile completion" });
  }
});

// Get user profile
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole === "AU_PAIR") {
      const { data: profile, error } = await supabase
        .from("au_pair_profiles")
        .select("*")
        .eq("userId", userId)
        .single();

      if (error) {
        console.error("❌ Error fetching au pair profile:", error);
        return res.status(500).json({ message: "Error fetching profile" });
      }

      return res.json({ profile, role: userRole });
    } else if (userRole === "HOST_FAMILY") {
      const { data: profile, error } = await supabase
        .from("host_family_profiles")
        .select("*")
        .eq("userId", userId)
        .single();

      if (error) {
        console.error("❌ Error fetching host family profile:", error);
        return res.status(500).json({ message: "Error fetching profile" });
      }

      return res.json({ profile, role: userRole });
    }

    return res.status(400).json({ message: "Invalid user role" });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update user profile
router.put("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const profileData = req.body;

    // Add updated timestamp
    profileData.updatedAt = new Date().toISOString();

    if (userRole === "AU_PAIR") {
      const { data, error } = await supabase
        .from("au_pair_profiles")
        .update(profileData)
        .eq("userId", userId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating au pair profile:", error);
        return res.status(500).json({ message: "Error updating profile" });
      }

      return res.json({
        message: "Profile updated successfully",
        profile: data,
      });
    } else if (userRole === "HOST_FAMILY") {
      const { data, error } = await supabase
        .from("host_family_profiles")
        .update(profileData)
        .eq("userId", userId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating host family profile:", error);
        return res.status(500).json({ message: "Error updating profile" });
      }

      return res.json({
        message: "Profile updated successfully",
        profile: data,
      });
    }

    return res.status(400).json({ message: "Invalid user role" });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
