// Clear localStorage and session storage when page loads
localStorage.clear();
sessionStorage.clear();
// Clear all cookies
document.cookie.split(";").forEach(function(c) {
  document.cookie = c
    .replace(/^ +/, "")
    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
console.log("✅ Browser cache, localStorage, and cookies cleared!");
