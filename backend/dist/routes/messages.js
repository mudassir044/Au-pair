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
// Get conversations list
router.get("/conversations", auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get all conversations where user is sender or receiver
        const { data: messages, error } = await supabase_1.supabase
            .from("messages")
            .select(`
        id,
        senderId,
        receiverId,
        content,
        isRead,
        createdAt,
        senderData:users!senderId(id, email),
        receiverData:users!receiverId(id, email)
      `)
            .or(`senderId.eq.${userId},receiverId.eq.${userId}`)
            .order("createdAt", { ascending: false });
        if (error) {
            console.error("❌ Error fetching conversations:", error);
            return res.status(500).json({ message: "Error fetching conversations" });
        }
        // Group messages by conversation partner
        const conversationsMap = new Map();
        for (const message of messages) {
            const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
            const partnerData = message.senderId === userId ? message.receiverData : message.senderData;
            if (!conversationsMap.has(partnerId)) {
                conversationsMap.set(partnerId, {
                    partnerId,
                    partnerEmail: partnerData.email,
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
        const conversations = await Promise.all(Array.from(conversationsMap.values()).map(async (conversation) => {
            // Get partner profile information
            const { data: auPairProfile } = await supabase_1.supabase
                .from("au_pair_profiles")
                .select("firstName, lastName, profilePhotoUrl")
                .eq("userId", conversation.partnerId)
                .single();
            const { data: hostProfile } = await supabase_1.supabase
                .from("host_family_profiles")
                .select("familyName, contactPersonName, profilePhotoUrl")
                .eq("userId", conversation.partnerId)
                .single();
            const profile = auPairProfile || hostProfile;
            const partnerName = auPairProfile
                ? `${auPairProfile.firstName} ${auPairProfile.lastName}`
                : hostProfile?.familyName || conversation.partnerEmail;
            return {
                ...conversation,
                partnerName,
                partnerPhoto: profile?.profilePhotoUrl || null,
                messages: conversation.messages.slice(0, 1), // Only include last message for conversation list
            };
        }));
        return res.json(conversations);
    }
    catch (error) {
        console.error("❌ Get conversations error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Get messages with a specific user
router.get("/with/:userId", auth_1.authenticate, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const { userId: otherUserId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        // Get messages between current user and other user
        const { data: messages, error } = await supabase_1.supabase
            .from("messages")
            .select(`
        id,
        senderId,
        receiverId,
        content,
        isRead,
        createdAt
      `)
            .or(`and(senderId.eq.${currentUserId},receiverId.eq.${otherUserId}),and(senderId.eq.${otherUserId},receiverId.eq.${currentUserId})`)
            .order("createdAt", { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            console.error("❌ Error fetching messages:", error);
            return res.status(500).json({ message: "Error fetching messages" });
        }
        // Mark messages as read (messages sent to current user)
        const unreadMessageIds = messages
            .filter((msg) => msg.receiverId === currentUserId && !msg.isRead)
            .map((msg) => msg.id);
        if (unreadMessageIds.length > 0) {
            await supabase_1.supabase
                .from("messages")
                .update({ isRead: true })
                .in("id", unreadMessageIds);
        }
        return res.json({
            messages: messages.reverse(), // Return in ascending order for chat display
            page,
            limit,
        });
    }
    catch (error) {
        console.error("❌ Get messages error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Send a message
router.post("/", auth_1.authenticate, async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId, content } = req.body;
        if (!receiverId || !content) {
            return res
                .status(400)
                .json({ message: "Receiver ID and content are required" });
        }
        // Verify receiver exists and is active
        const { data: receiver, error: receiverError } = await supabase_1.supabase
            .from("users")
            .select("id, isActive")
            .eq("id", receiverId)
            .single();
        if (receiverError || !receiver || !receiver.isActive) {
            return res
                .status(400)
                .json({ message: "Receiver not found or inactive" });
        }
        // Create the message
        const messageId = (0, uuid_1.v4)();
        const { data: newMessage, error: insertError } = await supabase_1.supabase
            .from("messages")
            .insert({
            id: messageId,
            senderId,
            receiverId,
            content: content.trim(),
            isRead: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })
            .select()
            .single();
        if (insertError) {
            console.error("❌ Error creating message:", insertError);
            return res.status(500).json({ message: "Error sending message" });
        }
        return res.status(201).json({
            message: "Message sent successfully",
            data: newMessage,
        });
    }
    catch (error) {
        console.error("❌ Send message error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
// Mark messages as read
router.put("/read", auth_1.authenticate, async (req, res) => {
    try {
        const receiverId = req.user.id;
        const { senderId } = req.body;
        if (!senderId) {
            return res.status(400).json({ message: "Sender ID is required" });
        }
        // Mark all messages from sender to current user as read
        const { error } = await supabase_1.supabase
            .from("messages")
            .update({ isRead: true })
            .eq("senderId", senderId)
            .eq("receiverId", receiverId)
            .eq("isRead", false);
        if (error) {
            console.error("❌ Error marking messages as read:", error);
            return res
                .status(500)
                .json({ message: "Error marking messages as read" });
        }
        return res.json({ message: "Messages marked as read" });
    }
    catch (error) {
        console.error("❌ Mark messages read error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map