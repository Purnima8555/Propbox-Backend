const jwt = require("jsonwebtoken");

const SECRET_KEY = "21e6fb393716f568bf5ab155f62379812ac5b048efdea976aa1b1699f9e7e7dd";

function authenticateToken(req, res, next) {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    console.error("No token provided in Authorization header");
    return res.status(401).json({ message: "Access denied: No token provided" });
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    console.log("Decoded token:", verified);
    req.user = { userId: verified.userId, role: verified.role };
    if (!verified.userId) {
      console.error("No userId found in token payload");
      return res.status(401).json({ message: "User ID not found in token" });
    }
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(400).json({ message: "Invalid or expired token" });
  }
}

function authorizeRole(role) {
  return (req, res, next) => {
    if (req.user.role.toLowerCase() !== role.toLowerCase()) {
      console.error("Access denied: Insufficient permissions for role:", req.user.role);
      return res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRole };