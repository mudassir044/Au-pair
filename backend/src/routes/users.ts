import express from "express";
import { supabase } from "../utils/supabase";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Search for potential matches
router.get("/search", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Search parameters
    const {
      country,
      minBudget,
      maxBudget,
      languages,
      availability,
      skills,
      experienceLevel,
    } = req.query;

    // Determine opposite role to search for
    const targetRole = userRole === "AU_PAIR" ? "HOST_FAMILY" : "AU_PAIR";
    const profileTable =
      targetRole === "AU_PAIR" ? "au_pair_profiles" : "host_family_profiles";

    // Get users with opposite role who are active and have completed profiles
    let query = supabase
      .from("users")
      .select(
        `
        id, email, role, createdAt,
        profile:${profileTable}!inner(*)
      `,
      )
      .eq("role", targetRole)
      .eq("isActive", true)
      .eq("profilecompleted", true)
      .neq("id", userId);

    // Add profile-specific filters
    if (country) {
      if (targetRole === "HOST_FAMILY") {
        query = query.ilike("profile.country", `%${country}%`);
      } else {
        query = query.ilike("profile.preferredCountries", `%${country}%`);
      }
    }

    if (minBudget && targetRole === "HOST_FAMILY") {
      query = query.gte("profile.maxBudget", parseFloat(minBudget as string));
    }

    if (maxBudget && targetRole === "AU_PAIR") {
      query = query.lte("profile.hourlyRate", parseFloat(maxBudget as string));
    }

    if (languages) {
      const langArray = (languages as string).split(",");
      for (const lang of langArray) {
        if (targetRole === "AU_PAIR") {
          query = query.ilike("profile.languages", `%${lang.trim()}%`);
        } else {
          query = query.ilike("profile.preferredLanguages", `%${lang.trim()}%`);
        }
      }
    }

    if (skills && targetRole === "AU_PAIR") {
      const skillArray = (skills as string).split(",");
      for (const skill of skillArray) {
        query = query.ilike("profile.skills", `%${skill.trim()}%`);
      }
    }

    // Execute query with pagination
    const {
      data: users,
      error,
      count,
    } = await query
      .range(offset, offset + limit - 1)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("❌ Error searching users:", error);
      return res.status(500).json({ message: "Error searching users" });
    }

    // Get existing matches to filter out already matched users
    const matchField = userRole === "AU_PAIR" ? "auPairId" : "hostId";
    const { data: existingMatches } = await supabase
      .from("matches")
      .select("hostId, auPairId")
      .eq(matchField, userId);

    const existingMatchIds = new Set(
      existingMatches?.map((match) =>
        userRole === "AU_PAIR" ? match.hostId : match.auPairId,
      ) || [],
    );

    // Filter out users we already have matches with
    const availableUsers =
      users?.filter((user) => !existingMatchIds.has(user.id)) || [];

    // Format response
    const formattedUsers = availableUsers.map((user) => {
      const profile = Array.isArray(user.profile)
        ? user.profile[0]
        : user.profile;
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        profile: {
          ...profile,
          name:
            targetRole === "AU_PAIR"
              ? `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim()
              : profile?.familyName || "Unknown",
          displayPhoto: profile?.profilePhotoUrl || null,
        },
      };
    });

    return res.json({
      users: formattedUsers,
      page,
      limit,
      total: count || 0,
      hasMore: formattedUsers.length === limit,
    });
  } catch (error) {
    console.error("❌ Search users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user profile by ID
router.get("/:userId", authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user!.id;

    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, role, isActive, createdAt")
      .eq("id", userId)
      .eq("isActive", true)
      .single();

    if (userError || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get profile based on role
    const profileTable =
      user.role === "AU_PAIR" ? "au_pair_profiles" : "host_family_profiles";
    const { data: profile, error: profileError } = await supabase
      .from(profileTable)
      .select("*")
      .eq("userId", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Check if there's an existing match between users
    const requestingUserRole = req.user!.role;
    const hostId =
      requestingUserRole === "HOST_FAMILY" ? requestingUserId : userId;
    const auPairId =
      requestingUserRole === "AU_PAIR" ? requestingUserId : userId;

    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id, status, createdAt")
      .eq("hostId", hostId)
      .eq("auPairId", auPairId)
      .single();

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        profile: {
          ...profile,
          name:
            user.role === "AU_PAIR"
              ? `${profile.firstName} ${profile.lastName}`
              : profile.familyName,
        },
      },
      match: existingMatch || null,
    });
  } catch (error) {
    console.error("❌ Get user profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get recommended users (basic matching algorithm)
router.get(
  "/recommendations/for-me",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const limit = parseInt(req.query.limit as string) || 10;

      // Get current user's profile to base recommendations on
      const currentUserProfileTable =
        userRole === "AU_PAIR" ? "au_pair_profiles" : "host_family_profiles";
      const { data: currentProfile, error: currentProfileError } =
        await supabase
          .from(currentUserProfileTable)
          .select("*")
          .eq("userId", userId)
          .single();

      if (currentProfileError || !currentProfile) {
        return res
          .status(404)
          .json({ message: "Current user profile not found" });
      }

      // Determine target role and profile table
      const targetRole = userRole === "AU_PAIR" ? "HOST_FAMILY" : "AU_PAIR";
      const targetProfileTable =
        targetRole === "AU_PAIR" ? "au_pair_profiles" : "host_family_profiles";

      // Get potential matches
      const { data: potentialMatches, error } = await supabase
        .from("users")
        .select(
          `
        id, email, role, createdAt,
        profile:${targetProfileTable}!inner(*)
      `,
        )
        .eq("role", targetRole)
        .eq("isActive", true)
        .eq("profilecompleted", true)
        .neq("id", userId)
        .limit(limit * 2); // Get more than needed for filtering

      if (error) {
        console.error("❌ Error fetching potential matches:", error);
        return res
          .status(500)
          .json({ message: "Error fetching recommendations" });
      }

      // Get existing matches to filter out
      const matchField = userRole === "AU_PAIR" ? "auPairId" : "hostId";
      const { data: existingMatches } = await supabase
        .from("matches")
        .select("hostId, auPairId")
        .eq(matchField, userId);

      const existingMatchIds = new Set(
        existingMatches?.map((match) =>
          userRole === "AU_PAIR" ? match.hostId : match.auPairId,
        ) || [],
      );

      // Filter and score matches
      const scoredMatches =
        potentialMatches
          ?.filter((user) => !existingMatchIds.has(user.id))
          .map((user) => {
            let score = 0;
            const profile = Array.isArray(user.profile)
              ? user.profile[0]
              : user.profile;

            // Score based on location/country match
            if (
              userRole === "AU_PAIR" &&
              currentProfile.preferredCountries &&
              profile.country
            ) {
              const preferredCountries = currentProfile.preferredCountries
                .toLowerCase()
                .split(",");
              if (
                preferredCountries.some((country) =>
                  profile.country.toLowerCase().includes(country.trim()),
                )
              ) {
                score += 30;
              }
            }

            // Score based on budget compatibility
            if (
              userRole === "AU_PAIR" &&
              currentProfile.hourlyRate &&
              profile.maxBudget
            ) {
              if (currentProfile.hourlyRate <= profile.maxBudget) {
                score += 25;
              }
            } else if (
              userRole === "HOST_FAMILY" &&
              currentProfile.maxBudget &&
              profile.hourlyRate
            ) {
              if (profile.hourlyRate <= currentProfile.maxBudget) {
                score += 25;
              }
            }

            // Score based on language compatibility
            if (currentProfile.languages && profile.preferredLanguages) {
              const userLanguages = currentProfile.languages
                .toLowerCase()
                .split(",");
              const preferredLanguages = profile.preferredLanguages
                .toLowerCase()
                .split(",");
              const commonLanguages = userLanguages.filter((lang) =>
                preferredLanguages.some((prefLang) =>
                  prefLang.trim().includes(lang.trim()),
                ),
              );
              score += commonLanguages.length * 10;
            }

            // Score based on availability overlap
            if (
              userRole === "AU_PAIR" &&
              currentProfile.availableFrom &&
              currentProfile.availableTo
            ) {
              score += 15; // Base score for having availability
            }

            return {
              ...user,
              matchScore: score,
              profile: {
                ...profile,
                name:
                  targetRole === "AU_PAIR"
                    ? `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim()
                    : profile?.familyName || "Unknown",
              },
            };
          })
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, limit) || [];

      return res.json({
        recommendations: scoredMatches,
        total: scoredMatches.length,
      });
    } catch (error) {
      console.error("❌ Get recommendations error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
);

export default router;
