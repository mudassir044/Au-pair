import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../utils/supabase";

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const setupMessageHandlers = (io: Server) => {
  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Authenticate socket
    socket.on("authenticate", async (token: string) => {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_ACCESS_SECRET!,
        ) as any;

        // Check if user exists and is active
        const { data: user, error } = await supabase
          .from("users")
          .select("id, email, role, isActive")
          .eq("id", decoded.userId)
          .single();

        if (error || !user || !user.isActive) {
          socket.emit("auth_error", { message: "Authentication failed" });
          return;
        }

        // Store user data in socket
        socket.user = {
          id: user.id,
          email: user.email,
          role: user.role,
        };

        // Join user's room
        socket.join(`user:${user.id}`);
        socket.emit("authenticated", { userId: user.id });
        console.log(`🔐 Socket authenticated: ${socket.id} as user ${user.id}`);
      } catch (error) {
        console.error("❌ Socket authentication error:", error);
        socket.emit("auth_error", { message: "Authentication failed" });
      }
    });

    // Handle private messages
    socket.on(
      "private_message",
      async (data: { receiverId: string; content: string }) => {
        try {
          if (!socket.user) {
            socket.emit("error", { message: "Not authenticated" });
            return;
          }

          const { receiverId, content } = data;
          const senderId = socket.user.id;

          if (!receiverId || !content || content.trim() === "") {
            socket.emit("error", {
              message: "Receiver ID and content are required",
            });
            return;
          }

          // Verify receiver exists
          const { data: receiver, error: receiverError } = await supabase
            .from("users")
            .select("id, isActive")
            .eq("id", receiverId)
            .single();

          if (receiverError || !receiver || !receiver.isActive) {
            socket.emit("error", { message: "Receiver not found or inactive" });
            return;
          }

          // Save message to database
          const messageId = uuidv4();
          const messageData = {
            id: messageId,
            senderId,
            receiverId,
            content: content.trim(),
            isRead: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const { error: insertError } = await supabase
            .from("messages")
            .insert(messageData);

          if (insertError) {
            console.error("❌ Error saving message:", insertError);
            socket.emit("error", { message: "Failed to send message" });
            return;
          }

          // Emit to sender and receiver
          const responseData = {
            ...messageData,
            senderEmail: socket.user.email,
            senderRole: socket.user.role,
          };

          socket.emit("message_sent", responseData);
          io.to(`user:${receiverId}`).emit("new_message", responseData);

          console.log(`💬 Message sent from ${senderId} to ${receiverId}`);
        } catch (error) {
          console.error("❌ Private message error:", error);
          socket.emit("error", { message: "Failed to process message" });
        }
      },
    );

    // Handle typing indicators
    socket.on("typing_start", (data: { receiverId: string }) => {
      if (!socket.user) return;

      io.to(`user:${data.receiverId}`).emit("user_typing", {
        userId: socket.user.id,
        typing: true,
      });
    });

    socket.on("typing_stop", (data: { receiverId: string }) => {
      if (!socket.user) return;

      io.to(`user:${data.receiverId}`).emit("user_typing", {
        userId: socket.user.id,
        typing: false,
      });
    });

    // Handle message read receipts
    socket.on("mark_read", async (data: { senderId: string }) => {
      try {
        if (!socket.user) return;

        const { senderId } = data;
        const receiverId = socket.user.id;

        // Mark messages as read
        const { error } = await supabase
          .from("messages")
          .update({ isRead: true })
          .eq("senderId", senderId)
          .eq("receiverId", receiverId)
          .eq("isRead", false);

        if (error) {
          console.error("❌ Error marking messages as read:", error);
          return;
        }

        // Notify sender that messages were read
        io.to(`user:${senderId}`).emit("messages_read", {
          readBy: receiverId,
        });
      } catch (error) {
        console.error("❌ Mark read error:", error);
      }
    });

    // Handle match notifications
    socket.on(
      "match_update",
      async (data: { matchId: string; status: string }) => {
        try {
          if (!socket.user) return;

          const { matchId, status } = data;

          // Get match details
          const { data: match, error } = await supabase
            .from("matches")
            .select("hostId, auPairId, status")
            .eq("id", matchId)
            .single();

          if (error || !match) return;

          // Notify both parties of the match update
          const otherUserId =
            match.hostId === socket.user.id ? match.auPairId : match.hostId;

          io.to(`user:${otherUserId}`).emit("match_updated", {
            matchId,
            status,
            updatedBy: socket.user.id,
          });

          console.log(
            `🤝 Match ${matchId} updated to ${status} by ${socket.user.id}`,
          );
        } catch (error) {
          console.error("❌ Match update error:", error);
        }
      },
    );

    // Handle user online status
    socket.on("user_online", () => {
      if (!socket.user) return;

      // Broadcast to all users in conversations with this user
      socket.broadcast.emit("user_status", {
        userId: socket.user.id,
        online: true,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (socket.user) {
        // Broadcast offline status
        socket.broadcast.emit("user_status", {
          userId: socket.user.id,
          online: false,
        });
      }
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  });

  console.log("🔌 Socket.io message handlers initialized");
};
