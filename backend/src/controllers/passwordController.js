const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { sendEmail } = require("../services/emailService");

// ==================== FORGOT PASSWORD ====================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Do not reveal whether an email exists
    if (!user) {
      return res.status(200).json({
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires after 15 minutes
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // Save token and expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Frontend reset password URL
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // Send reset email
    await sendEmail({
      to: user.email,
      subject: "Reset your Bolo India password 🇮🇳",
      text: `Reset your Bolo India password using this link: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Reset Your Bolo India Password 🇮🇳</h2>

          <p>Hello <strong>${user.name}</strong>,</p>

          <p>
            We received a request to reset your Bolo India password.
          </p>

          <p>
            Click the button below to create a new password:
          </p>

          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Reset Password
          </a>

          <p style="margin-top: 20px;">
            This link will expire in <strong>15 minutes</strong>.
          </p>

          <p>
            If you did not request a password reset, you can safely ignore
            this email.
          </p>

          <br />

          <p>
            Regards,<br />
            <strong>Bolo India Team</strong>
          </p>
        </div>
      `,
    });

    console.log(`Password reset email sent to ${user.email}`);

    res.status(200).json({
      message:
        "If an account with this email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== RESET PASSWORD ====================

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset link",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and remove reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

// ==================== EXPORTS ====================

module.exports = {
  forgotPassword,
  resetPassword,
};
