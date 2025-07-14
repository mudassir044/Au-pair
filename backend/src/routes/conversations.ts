import express from "express";
import { supabase } from "../utils/supabase";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Get conversations list (alias for /api/messages/conversations)
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, senderId, receiverId, content, isRead, createdAt")
      .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("❌ Error fetching conversations:", error);
      return res.status(500).json({ message: "Error fetching conversations" });
    }

    // Group messages by conversation partner
    const conversationsMap = new Map();

    for (const message of messages) {
      const partnerId =
        message.senderId === userId ? message.receiverId : message.senderId;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partnerId,
          lastMessage: message,
          unreadCount: 0,
          messages: [],
        });
      }

      const conversation = conversationsMap.get(partnerId);

      // Count unread messages (messages sent to current user that are unread)
      if (message.receiverId === userId && !message.isRead) {
        conversation.unreadCount++;
      }

      conversation.messages.push(message);
    }

    // Convert map to array and get partner profiles
    const conversations = await Promise.all(
      Array.from(conversationsMap.values()).map(async (conversation: any) => {
        // Get partner user info
        const { data: partnerUser, error: userError } = await supabase
          .from("users")
          .select("id, email, role")
          .eq("id", conversation.partnerId)
          .single();

        if (userError || !partnerUser) {
          return {
            ...conversation,
            partnerName: "Unknown User",
            partnerEmail: "unknown@email.com",
            partnerPhoto: null,
          };
        }

        // Get partner profile information
        const { data: auPairProfile } = await supabase
          .from("au_pair_profiles")
          .select("firstName, lastName, profilePhotoUrl")
          .eq("userId", conversation.partnerId)
          .single();

        const { data: hostProfile } = await supabase
          .from("host_family_profiles")
          .select("familyName, contactPersonName, profilePhotoUrl")
          .eq("userId", conversation.partnerId)
          .single();

        const profile = auPairProfile || hostProfile;
        const partnerName = auPairProfile
          ? `${auPairProfile.firstName} ${auPairProfile.lastName}`
          : hostProfile?.familyName || partnerUser.email;

        return {
          ...conversation,
          partnerName,
          partnerEmail: partnerUser.email,
          partnerPhoto: profile?.profilePhotoUrl || null,
          messages: conversation.messages.slice(0, 1), // Only include last message for conversation list
        };
      }),
    );

    return res.json(conversations);
  } catch (error) {
    console.error("❌ Get conversations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;