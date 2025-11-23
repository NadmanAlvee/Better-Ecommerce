import User from "../models/user.model.js";
import { redisClient } from "../lib/redis-client.lib.js";
import jwt from "jsonwebtoken";

const generateAccessRefreshToken = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const storeRefreshTokenToRedis = async (userId, refreshToken) => {
  await redisClient.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60
  ); // 7days
};

const setAccessRefreshTokenToCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // prevents XXS
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // prevents CSRF
    maxAge: 15 * 60 * 1000, // 15min
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // prevents XXS
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // prevents CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7days
  });
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All Fields Are Required!" });
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }
    const userExists = await User.findOne({ email: email });
    if (userExists)
      return res.status(400).json({ message: "Email already exists" });

    const newUser = new User({
      name,
      email,
      password,
    });
    await newUser.save();

    // authenticate user
    const { accessToken, refreshToken } = generateAccessRefreshToken(
      newUser._id
    );
    await storeRefreshTokenToRedis(newUser._id, refreshToken);

    setAccessRefreshTokenToCookies(res, accessToken, refreshToken);

    res.status(201).json({
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      message: "user created successfully",
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateAccessRefreshToken(
        user._id
      );
      await storeRefreshTokenToRedis(user._id, refreshToken);

      setAccessRefreshTokenToCookies(res, accessToken, refreshToken);

      res.json({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      return res.status(401).json({ message: "Invalid Credentials" });
    }
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );
      await redisClient.del(`refresh_token:${decoded.userId}`);
    }
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshAcessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const storedToken = await redisClient.get(
      `refresh_token:${decoded.userId}`
    );
    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = jwt.sign(
      { userId: decoded._id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      }
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true, // prevents XXS
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // prevents CSRF
      maxAge: 15 * 60 * 1000, // 15min
    });

    res.json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.log("Error in refreshAcessToken controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
