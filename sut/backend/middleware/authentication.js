const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { jwtVerify } = require("../helper/jwt");
const { User } = require("../models");

const verifyToken = async (req, res, next) => {
  try {
    const { headers } = req;
    if (!headers.authorization) return next();

    const token = headers.authorization.split(" ")[1];
    // A missing or malformed/invalid token is an auth failure (401), not a server
    // error (500). Verify in its own try so only JWT failures map to 401 — real
    // DB errors below still surface as 500.
    if (!token) throw new UnauthorizedError("Token missing or malformed");

    let userVerified;
    try {
      userVerified = await jwtVerify(token);
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
    if (!userVerified) throw new UnauthorizedError("Invalid token");

    req.loggedUser = await User.findOne({
      attributes: { exclude: ["email"] },
      where: { email: userVerified.email },
    });

    if (!req.loggedUser) return next(new NotFoundError("User"));

    headers.email = userVerified.email;
    req.loggedUser.dataValues.token = token;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = verifyToken;
