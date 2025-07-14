#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for Au Pair Application
Tests all API endpoints including authentication, protected routes, and error handling
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8001"
DEMO_CREDENTIALS = {
    "au_pair": {"email": "sarah@demo.com", "password": "password123"},
    "host_family": {"email": "mueller@demo.com", "password": "password123"}
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.tokens = {}
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "status": status,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"    Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, auth_token: str = None) -> requests.Response:
        """Make HTTP request with optional authentication"""
        url = f"{BASE_URL}{endpoint}"
        request_headers = headers or {}
        
        if auth_token:
            request_headers["Authorization"] = f"Bearer {auth_token}"
        
        try:
            if method.upper() == "GET":
                return self.session.get(url, headers=request_headers)
            elif method.upper() == "POST":
                return self.session.post(url, json=data, headers=request_headers)
            elif method.upper() == "PUT":
                return self.session.put(url, json=data, headers=request_headers)
            elif method.upper() == "DELETE":
                return self.session.delete(url, headers=request_headers)
        except Exception as e:
            print(f"Request failed: {e}")
            return None
    
    def test_basic_endpoints(self):
        """Test basic endpoints that don't require authentication"""
        print("\n=== Testing Basic Endpoints ===")
        
        # Test root endpoint
        response = self.make_request("GET", "/")
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("GET /", True, f"Service: {data.get('service')}")
        else:
            self.log_test("GET /", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test health endpoint
        response = self.make_request("GET", "/health")
        if response and response.status_code == 200:
            data = response.json()
            self.log_test("GET /health", True, f"Status: {data.get('status')}")
        else:
            self.log_test("GET /health", False, f"Status: {response.status_code if response else 'No response'}")
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication ===")
        
        # Test registration for both user types
        for role, creds in DEMO_CREDENTIALS.items():
            # Test registration with new email
            new_email = f"test_{role}_{hash(role) % 10000}@test.com"
            reg_data = {
                "email": new_email,
                "password": "test_password_123",
                "role": role.upper()
            }
            
            response = self.make_request("POST", "/api/auth/register", reg_data)
            if response and response.status_code in [200, 201]:
                data = response.json()
                self.log_test(f"POST /api/auth/register ({role})", True, 
                            f"User created: {data.get('user', {}).get('email')}")
                if 'accessToken' in data:
                    self.tokens[f"new_{role}"] = data['accessToken']
            else:
                self.log_test(f"POST /api/auth/register ({role})", False, 
                            f"Status: {response.status_code if response else 'No response'}")
        
        # Test login with demo credentials
        for role, creds in DEMO_CREDENTIALS.items():
            response = self.make_request("POST", "/api/auth/login", creds)
            if response and response.status_code == 200:
                data = response.json()
                self.log_test(f"POST /api/auth/login ({role})", True, 
                            f"Token received for: {data.get('user', {}).get('email')}")
                if 'accessToken' in data:
                    self.tokens[role] = data['accessToken']
            else:
                self.log_test(f"POST /api/auth/login ({role})", False, 
                            f"Status: {response.status_code if response else 'No response'}")
        
        # Test invalid login
        invalid_creds = {"email": "invalid@test.com", "password": "wrong_password"}
        response = self.make_request("POST", "/api/auth/login", invalid_creds)
        if response and response.status_code in [401, 400]:
            self.log_test("POST /api/auth/login (invalid)", True, "Correctly rejected invalid credentials")
        else:
            self.log_test("POST /api/auth/login (invalid)", False, 
                        f"Should reject invalid creds, got: {response.status_code if response else 'No response'}")
    
    def test_protected_endpoints_without_auth(self):
        """Test that protected endpoints require authentication"""
        print("\n=== Testing Protected Endpoints (No Auth) ===")
        
        protected_endpoints = [
            ("GET", "/api/dashboard/stats"),
            ("GET", "/api/profile/completion"),
            ("GET", "/api/profiles/completion"),
            ("GET", "/api/matches/recent"),
            ("GET", "/api/matches"),
            ("GET", "/api/conversations"),
            ("GET", "/api/bookings")
        ]
        
        for method, endpoint in protected_endpoints:
            response = self.make_request(method, endpoint)
            if response and response.status_code in [401, 403]:
                self.log_test(f"{method} {endpoint} (no auth)", True, "Correctly requires authentication")
            else:
                self.log_test(f"{method} {endpoint} (no auth)", False, 
                            f"Should require auth, got: {response.status_code if response else 'No response'}")
    
    def test_protected_endpoints_with_auth(self):
        """Test protected endpoints with valid authentication"""
        print("\n=== Testing Protected Endpoints (With Auth) ===")
        
        if not self.tokens:
            print("No auth tokens available, skipping authenticated tests")
            return
        
        # Use the first available token
        token = list(self.tokens.values())[0]
        
        protected_endpoints = [
            ("GET", "/api/dashboard/stats"),
            ("GET", "/api/profile/completion"),
            ("GET", "/api/profiles/completion"),
            ("GET", "/api/matches/recent"),
            ("GET", "/api/matches"),
            ("GET", "/api/conversations"),
            ("GET", "/api/bookings")
        ]
        
        for method, endpoint in protected_endpoints:
            response = self.make_request(method, endpoint, auth_token=token)
            if response and response.status_code == 200:
                self.log_test(f"{method} {endpoint} (with auth)", True, "Successfully accessed with auth")
            else:
                self.log_test(f"{method} {endpoint} (with auth)", False, 
                            f"Failed with auth, status: {response.status_code if response else 'No response'}")
    
    def test_demo_endpoints(self):
        """Test demo-specific endpoints"""
        print("\n=== Testing Demo Endpoints ===")
        
        demo_endpoints = [
            ("GET", "/api/demo/endpoints"),
            ("POST", "/api/demo/login"),
            ("POST", "/api/demo/register"),
            ("GET", "/api/demo/users/search?role=AU_PAIR"),
            ("GET", "/api/demo/matches"),
            ("GET", "/api/demo/messages/conversations"),
            ("GET", "/api/demo/dashboard/stats"),
            ("GET", "/api/demo/profiles/completion")
        ]
        
        for method, endpoint in demo_endpoints:
            if method == "POST" and "login" in endpoint:
                response = self.make_request(method, endpoint, DEMO_CREDENTIALS["au_pair"])
            elif method == "POST" and "register" in endpoint:
                reg_data = {
                    "email": f"demo_test_{hash('demo') % 10000}@test.com",
                    "password": "demo_password",
                    "role": "AU_PAIR"
                }
                response = self.make_request(method, endpoint, reg_data)
            else:
                response = self.make_request(method, endpoint)
            
            if response and response.status_code in [200, 201]:
                self.log_test(f"{method} {endpoint}", True, "Demo endpoint working")
            else:
                self.log_test(f"{method} {endpoint}", False, 
                            f"Status: {response.status_code if response else 'No response'}")
    
    def test_cors_headers(self):
        """Test CORS headers"""
        print("\n=== Testing CORS Headers ===")
        
        headers = {"Origin": "https://au-pair.netlify.app"}
        response = self.make_request("GET", "/health", headers=headers)
        
        if response:
            cors_header = response.headers.get("Access-Control-Allow-Origin")
            if cors_header:
                self.log_test("CORS Headers", True, f"CORS header present: {cors_header}")
            else:
                self.log_test("CORS Headers", False, "No CORS headers found")
        else:
            self.log_test("CORS Headers", False, "No response received")
    
    def test_error_handling(self):
        """Test error handling for various scenarios"""
        print("\n=== Testing Error Handling ===")
        
        # Test 404 for non-existent endpoint
        response = self.make_request("GET", "/api/nonexistent")
        if response and response.status_code == 404:
            self.log_test("404 Error Handling", True, "Correctly returns 404 for non-existent endpoint")
        else:
            self.log_test("404 Error Handling", False, 
                        f"Expected 404, got: {response.status_code if response else 'No response'}")
        
        # Test malformed JSON
        try:
            url = f"{BASE_URL}/api/auth/login"
            response = requests.post(url, data="invalid json", 
                                   headers={"Content-Type": "application/json"})
            if response.status_code in [400, 422]:
                self.log_test("Malformed JSON Handling", True, "Correctly handles malformed JSON")
            else:
                self.log_test("Malformed JSON Handling", False, f"Expected 400/422, got: {response.status_code}")
        except Exception as e:
            self.log_test("Malformed JSON Handling", False, f"Exception: {e}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Au Pair Backend API Tests")
        print(f"Testing against: {BASE_URL}")
        
        self.test_basic_endpoints()
        self.test_authentication()
        self.test_protected_endpoints_without_auth()
        self.test_protected_endpoints_with_auth()
        self.test_demo_endpoints()
        self.test_cors_headers()
        self.test_error_handling()
        
        # Summary
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\n🎯 CRITICAL FINDINGS:")
        
        # Check for critical issues
        critical_issues = []
        
        # Check if basic endpoints work
        basic_working = any(r["success"] and "GET /" in r["test"] for r in self.test_results)
        if not basic_working:
            critical_issues.append("Basic API endpoints not responding")
        
        # Check if authentication works
        auth_working = any(r["success"] and "login" in r["test"] for r in self.test_results)
        if not auth_working:
            critical_issues.append("Authentication system not working")
        
        # Check if demo mode works
        demo_working = any(r["success"] and "demo" in r["test"] for r in self.test_results)
        if not demo_working:
            critical_issues.append("Demo mode not functioning")
        
        if critical_issues:
            print("❌ CRITICAL ISSUES FOUND:")
            for issue in critical_issues:
                print(f"  - {issue}")
        else:
            print("✅ No critical issues found - core functionality working")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)