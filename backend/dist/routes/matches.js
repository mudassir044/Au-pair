"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const supabase_1 = require("../utils/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get recent matches
router.get("/recent", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const limit = parseInt(req.query.limit) || 5;
        // Determine which field to filter on based on user role
        const matchField = userRole === "AU_PAIR" ? "auPairId" : "hostId";
        const otherField = userRole === "AU_PAIR" ? "hostId" : "auPairId";
        // Get recent matches with user data
        const { data: matches, error } = await supabase_1.supabase
            .from("matches")
            .select(`
        id, 
        matchScore, 
        status, 
        createdAt,
        ${otherField}
      `)
            .eq(matchField, userId)
            .order("createdAt", { ascending: false })
            .limit(limit);
        if (error) {
            console.error(`❌ Error fetching matches for user ${userId}:`, error);
            return res.status(500).json({ message: "Error fetching matches" });
        }
        // Enhance matches with profile data
        const enhancedMatches = await Promise.all(matches.map(async (match) => {
            const otherUserId = match[otherField];
            const profileTable = userRole === "AU_PAIR" ? "host_family_profiles" : "au_pair_profiles";
            const { data: profile, error: profileError } = await supabase_1.supabase
                .from(profileTable)
                .select("*")
                .eq("userId", otherUserId)
                .single();
            if (profileError) {
                console.error(`❌ Error fetching profile for user ${otherUserId}:`, profileError);
                return match;
            }
            // Add profile data to match
            return {
                ...match,
                profile: {
                    id: profile.id,
                    name: userRole === "AU_PAIR"
                        ? profile.familyName
                        : `${profile.firstName} ${profile.lastName}`,
                    photo: profile.profilePhotoUrl,
                    location: userRole === "AU_PAIR" ? profile.location : null,
                    country: userRole === "AU_PAIR"
                        ? profile.country
                        : profile.preferredCountries?.split(",")[0],
                    hourlyRate: userRole === "AU_PAIR" ? null : profile.hourlyRate,
                    maxBudget: userRole === "AU_PAIR" ? profile.maxBudget : null,
                    currency: profile.currency,
                },
            };
        }));
        return res.status(200).json(enhancedMatches);
    }
    catch (error) {
        console.error("❌ Recent matches error:", error);
        return res
            .status(500)
            .json({ message: "An error occurred while fetching recent matches" });
    }
});
// Get all matches
router.get("/", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const matchField = userRole === "AU_PAIR" ? "auPairId" : "hostId";
        const otherField = userRole === "AU_PAIR" ? "hostId" : "auPairId";
        let query = supabase_1.supabase
            .from("matches")
            .select(`
        id, 
        matchScore, 
        status, 
        createdAt,
        ${otherField}
      `)
            .eq(matchField, userId)
            .order("createdAt", { ascending: false })
            .range(offset, offset + limit - 1);
        if (status) {
            query = query.eq("status", status);
        }
        const { data: matches, error } = await query;
        if (error) {
            console.error(`❌ Error fetching matches for user ${userId}:`, error);
            return res.status(500).json({ message: "Error fetching matches" });
        }
        // Enhance with profile data
        const enhancedMatches = await Promise.all(matches.map(async (match) => {
            const otherUserId = match[otherField];
            const profileTable = userRole === "AU_PAIR" ? "host_family_profiles" : "au_pair_profiles";
            const { data: profile, error: profileError } = await supabase_1.supabase
                .from(profileTable)
                .select("*")
                .eq("userId", otherUserId)
                .single();
            if (profileError) {
                console.error(`❌ Error fetching profile for user ${otherUserId}:`, profileError);
                return match;
            }
            return {
                ...match,
                profile: {
                    id: profile.id,
                    name: userRole === "AU_PAIR"
                        ? profile.familyName
                        : `${profile.firstName} ${profile.lastName}`,
                    photo: profile.profilePhotoUrl,
                    bio: profile.bio,
                    location: userRole === "AU_PAIR" ? profile.location : null,
                    country: userRole === "AU_PAIR"
                        ? profile.country
                        : profile.preferredCountries?.split(",")[0],
                    hourlyRate: userRole === "AU_PAIR" ? null : profile.hourlyRate,
                    maxBudget: userRole === "AU_PAIR" ? profile.maxBudget : null,
                    currency: profile.currency,
                },
            };
        }));
        return res.json({ matches: enhancedMatches, page, limit });
    }
    catch (error) {
        console.error("❌ Get matches error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Create a match (send match request)
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { targetUserId, notes } = req.body;
        if (!targetUserId) {
            return res.status(400).json({ message: "Target user ID is required" });
        }
        // Verify target user exists and has opposite role
        const { data: targetUser, error: targetError } = await supabase_1.supabase
            .from("users")
            .select("id, role, isActive")
            .eq("id", targetUserId)
            .single();
        if (targetError || !targetUser || !targetUser.isActive) {
            return res
                .status(400)
                .json({ message: "Target user not found or inactive" });
        }
        // Check roles are compatible
        const validRolePairs = {
            AU_PAIR: "HOST_FAMILY",
            HOST_FAMILY: "AU_PAIR",
        };
        if (validRolePairs[userRole] !==
            targetUser.role) {
            return res.status(400).json({ message: "Invalid user role combination" });
        }
        // Check if match already exists
        const hostId = userRole === "HOST_FAMILY" ? userId : targetUserId;
        const auPairId = userRole === "AU_PAIR" ? userId : targetUserId;
        const { data: existingMatch, error: existingError } = await supabase_1.supabase
            .from("matches")
            .select("id")
            .eq("hostId", hostId)
            .eq("auPairId", auPairId)
            .single();
        if (existingMatch) {
            return res
                .status(400)
                .json({ message: "Match already exists between these users" });
        }
        // Create the match
        const matchId = (0, uuid_1.v4)();
        const { data: newMatch, error: insertError } = await supabase_1.supabase
            .from("matches")
            .insert({
            id: matchId,
            hostId,
            auPairId,
            matchScore: 0, // You can implement a scoring algorithm later
            status: "PENDING",
            initiatedBy: userRole,
            notes: notes || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
            .select()
            .single();
        if (insertError) {
            console.error("❌ Error creating match:", insertError);
            return res.status(500).json({ message: "Error creating match" });
        }
        return res.status(201).json({
            message: "Match request sent successfully",
            match: newMatch,
        });
    }
    catch (error) {
        console.error("❌ Create match error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Update match status
router.put("/:matchId", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { matchId } = req.params;
        const { status, notes } = req.body;
        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res
                .status(400)
                .json({ message: "Invalid status. Must be APPROVED or REJECTED" });
        }
        // Get the match to verify permissions
        const { data: match, error: matchError } = await supabase_1.supabase
            .from("matches")
            .select("*")
            .eq("id", matchId)
            .single();
        if (matchError || !match) {
            return res.status(404).json({ message: "Match not found" });
        }
        // Check if user is involved in this match
        const matchField = userRole === "AU_PAIR" ? "auPairId" : "hostId";
        if (match[matchField] !== userId) {
            return res
                .status(403)
                .json({ message: "You are not authorized to update this match" });
        }
        // Update the match
        const { data: updatedMatch, error: updateError } = await supabase_1.supabase
            .from("matches")
            .update({
            status,
            notes: notes || match.notes,
            updatedAt: new Date().toISOString(),
        })
            .eq("id", matchId)
            .select()
            .single();
        if (updateError) {
            console.error("❌ Error updating match:", updateError);
            return res.status(500).json({ message: "Error updating match" });
        }
        return res.json({
            message: "Match updated successfully",
            match: updatedMatch,
        });
    }
    catch (error) {
        console.error("❌ Update match error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=matches.js.map