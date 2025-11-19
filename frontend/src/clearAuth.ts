// Run this in the browser console to clear all auth data
// This helps reset the login state

export function clearAllAuthData() {
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear cookies if any
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  console.log("✅ All auth data cleared! Reload the page to login again.");
  
  // Reload the page
  window.location.reload();
}

// Call it with: clearAllAuthData()
