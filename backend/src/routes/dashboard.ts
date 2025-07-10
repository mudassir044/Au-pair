import express from "express";
import { supabase } from "../utils/supabase";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Get dashboard statistics
router.get("/stats", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

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

    // Initialize stats object
    const stats = {
      profileCompletion: user.profilecompleted ? 100 : 0,
      pendingMatches: 0,
      approvedMatches: 0,
      upcomingBookings: 0,
      totalMessages: 0,
      unreadMessages: 0,
    };

    // If profile is not complete, get completion percentage
    if (!user.profilecompleted) {
      let profileData: any, profileError: any, requiredFields: string[];
      let completedFields = 0;

      if (userRole === "AU_PAIR") {
        const { data, error } = await supabase
          .from("au_pair_profiles")
          .select("*")
          .eq("userId", userId)
          .single();
        profileData = data;
        profileError = error;
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
      } else if (userRole === "HOST_FAMILY") {
        const { data, error } = await supabase
          .from("host_family_profiles")
          .select("*")
          .eq("userId", userId)
          .single();
        profileData = data;
        profileError = error;
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
      }

      if (!profileError && profileData) {
        for (const field of requiredFields!) {
          if (
            profileData[field] &&
            (typeof profileData[field] !== "string" ||
              profileData[field].trim() !== "")
          ) {
            completedFields++;
          }
        }
        stats.profileCompletion = Math.round(
          (completedFields / requiredFields!.length) * 100,
        );
      }
    }

    // Get match statistics based on role
    const matchField = userRole === "AU_PAIR" ? "auPairId" : "hostId";

    // Pending matches
    const { count: pendingCount, error: pendingError } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq(matchField, userId)
      .eq("status", "PENDING");

    if (!pendingError) {
      stats.pendingMatches = pendingCount || 0;
    }

    // Approved matches
    const { count: approvedCount, error: approvedError } = await supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq(matchField, userId)
      .eq("status", "APPROVED");

    if (!approvedError) {
      stats.approvedMatches = approvedCount || 0;
    }

    // Upcoming bookings
    const now = new Date().toISOString();
    const { count: bookingsCount, error: bookingsError } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq(matchField, userId)
      .eq("status", "APPROVED")
      .gt("startDate", now);

    if (!bookingsError) {
      stats.upcomingBookings = bookingsCount || 0;
    }

    // Total messages
    const { count: totalMsgCount, error: totalMsgError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`);

    if (!totalMsgError) {
      stats.totalMessages = totalMsgCount || 0;
    }

    // Unread messages
    const { count: unreadCount, error: unreadError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiverId", userId)
      .eq("isRead", false);

    if (!unreadError) {
      stats.unreadMessages = unreadCount || 0;
    }

    return res.status(200).json(stats);
  } catch (error) {
    console.error("❌ Dashboard stats error:", error);
    return res
      .status(500)
      .json({
        message: "An error occurred while fetching dashboard statistics",
      });
  }
});

export default router;
