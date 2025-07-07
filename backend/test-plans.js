// Simple test script to verify plan functionality
// Run with: node test-plans.js

const baseUrl = "https://au-pair.onrender.com";

async function testPlanEndpoints() {
  console.log("🧪 Testing Plan Endpoints...\n");

  try {
    // Test getting available plans (no auth required)
    console.log("1. Testing GET /api/plans/available");
    const plansResponse = await fetch(`${baseUrl}/api/plans/available`);
    const plansData = await plansResponse.json();

    if (plansResponse.ok) {
      console.log("✅ Available plans fetched successfully");
      console.log("📋 Available plans:", Object.keys(plansData.plans));
      console.log("🔧 Available add-ons:", Object.keys(plansData.addOns));
    } else {
      console.log("❌ Failed to fetch available plans:", plansData.message);
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Test authenticated endpoints (would need a valid token)
    console.log("2. Testing authenticated endpoints...");
    console.log("ℹ️  These would require authentication:");
    console.log("   - POST /api/plans/upgrade");
    console.log("   - GET /api/plans/current");
    console.log("   - GET /api/admin/plans (admin only)");
    console.log("   - PUT /api/admin/plans/:userId (admin only)");
    console.log("   - GET /api/admin/plans/analytics (admin only)");

    console.log("\n🔒 Plan limits middleware will be applied to:");
    console.log("   - Profile viewing: GET /api/profiles/:userId");
    console.log("   - Messaging: POST /api/messages/send");
    console.log("   - Contact requests: POST /api/matches/");

    console.log("\n📊 Plan configuration:");
    console.log(
      "   - FREE: Limited access (10-15 profile views, 5 messages/day)",
    );
    console.log(
      "   - STANDARD: Enhanced access (50-75 profile views, 25 messages/day)",
    );
    console.log("   - PREMIUM: Unlimited access + add-ons");
    console.log("   - VERIFIED: Annual unlimited + verification badge");

    console.log("\n⏰ Plan durations:");
    console.log("   - STANDARD: 7 days (family), 30 days (au_pair)");
    console.log("   - PREMIUM: 7 days (family), 30 days (au_pair)");
    console.log("   - VERIFIED: 365 days (both)");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testPlanEndpoints();
